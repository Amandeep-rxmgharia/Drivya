import mongoose from "mongoose";
import File from "../models/fileModel.js";
import User from "../models/userModel.js";
import { PLANS, PLAN_KEYS } from "../constants/subscriptionConstants.js";

// ─── Get Storage Overview ────────────────────────────────────────
// Returns real storage usage, category breakdown, and trash stats.
export const getStorageOverview = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Parallel: user quota + file aggregation
    const [user, aggregation] = await Promise.all([
      User.findById(userId)
        .select("storageUsed storageLimit bandwidthUsed bandwidthLimit subscription")
        .lean(),

      File.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        {
          $facet: {
            // Category breakdown by mime type prefix
            byCategory: [
              {
                $group: {
                  _id: {
                    $switch: {
                      branches: [
                        {
                          case: { $regexMatch: { input: "$mimeType", regex: /^image\// } },
                          then: "Images",
                        },
                        {
                          case: { $regexMatch: { input: "$mimeType", regex: /^video\// } },
                          then: "Videos",
                        },
                        {
                          case: { $regexMatch: { input: "$mimeType", regex: /^audio\// } },
                          then: "Audio",
                        },
                        {
                          case: {
                            $regexMatch: {
                              input: "$mimeType",
                              regex: /^(text\/|application\/(pdf|msword|vnd\.))/,
                            },
                          },
                          then: "Documents",
                        },
                        {
                          case: {
                            $regexMatch: {
                              input: "$mimeType",
                              regex: /^application\/(zip|x-rar|x-7z|gzip|x-tar)/,
                            },
                          },
                          then: "Archives",
                        },
                      ],
                      default: "Other",
                    },
                  },
                  totalSize: { $sum: "$size" },
                  count: { $sum: 1 },
                },
              },
              { $sort: { totalSize: -1 } },
            ],
            // Trash-specific stats
            trashStats: [
              { $match: { isTrashed: true } },
              {
                $group: {
                  _id: null,
                  totalSize: { $sum: "$size" },
                  count: { $sum: 1 },
                },
              },
            ],
            // Total file count
            totals: [
              {
                $group: {
                  _id: null,
                  totalSize: { $sum: "$size" },
                  count: { $sum: 1 },
                },
              },
            ],
          },
        },
      ]),
    ]);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const result = aggregation[0] || {};
    const totals = result.totals?.[0] || { totalSize: 0, count: 0 };
    const trashData = result.trashStats?.[0] || { totalSize: 0, count: 0 };
    const categories = (result.byCategory || []).map((cat) => ({
      label: cat._id,
      value: cat.totalSize,
      count: cat.count,
    }));

    const planKey = user.subscription?.plan || PLAN_KEYS.FREE;
    const plan = PLANS[planKey] || PLANS[PLAN_KEYS.FREE];

    return res.json({
      storageUsed: user.storageUsed || 0,
      storageLimit: user.storageLimit || 1024 * 1024 * 1024,
      bandwidthUsed: user.bandwidthUsed || 0,
      bandwidthLimit: user.bandwidthLimit || 10 * 1024 * 1024 * 1024,
      maxUpload: plan.maxUpload,
      planKey,
      planName: plan.name,
      breakdown: categories,
      trash: {
        totalSize: trashData.totalSize,
        count: trashData.count,
      },
      totalFileCount: totals.count,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get Storage Preferences ─────────────────────────────────────
export const getStoragePreferences = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select("storagePreferences subscription")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Resolve the plan's max allowed trash days
    const planKey = user.subscription?.plan || PLAN_KEYS.FREE;
    const plan = PLANS[planKey] || PLANS[PLAN_KEYS.FREE];
    const maxTrashDays = plan.trashDays;

    // Clamp the default to the plan's max so lower-tier plans get a valid value
    const savedDays = user.storagePreferences?.trashAutoEmptyDays;
    const effectiveDays = savedDays != null
      ? Math.min(savedDays, maxTrashDays)
      : maxTrashDays;

    return res.json({
      preferences: {
        trashAutoEmptyDays: effectiveDays,
        alertAt80: user.storagePreferences?.alertAt80 !== false,
        alertAt95: user.storagePreferences?.alertAt95 !== false,
      },
      maxTrashDays,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Update Storage Preferences ──────────────────────────────────
export const updateStoragePreferences = async (req, res, next) => {
  const allowedFields = ["trashAutoEmptyDays", "alertAt80", "alertAt95"];
  const updates = {};

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[`storagePreferences.${field}`] = req.body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: "No valid fields to update." });
  }

  try {
    // Validate trashAutoEmptyDays against the user's plan limit
    if (req.body.trashAutoEmptyDays !== undefined) {
      if (req.body.trashAutoEmptyDays === null || req.body.trashAutoEmptyDays <= 0) {
        return res.status(400).json({ message: "Auto-empty trash days must be a valid number." });
      }
      const user = await User.findById(req.user.id).select("subscription").lean();
      const planKey = user?.subscription?.plan || PLAN_KEYS.FREE;
      const plan = PLANS[planKey] || PLANS[PLAN_KEYS.FREE];
      const maxTrashDays = plan.trashDays;

      if (req.body.trashAutoEmptyDays > maxTrashDays) {
        return res.status(400).json({
          message: `Your ${plan.name} plan allows up to ${maxTrashDays}-day trash recovery. Upgrade your plan for longer retention.`,
          maxTrashDays,
        });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true },
    )
      .select("storagePreferences subscription")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const planKey = user.subscription?.plan || PLAN_KEYS.FREE;
    const plan = PLANS[planKey] || PLANS[PLAN_KEYS.FREE];

    return res.json({
      message: "Storage preferences updated.",
      preferences: {
        trashAutoEmptyDays: user.storagePreferences?.trashAutoEmptyDays ?? 30,
        alertAt80: user.storagePreferences?.alertAt80 !== false,
        alertAt95: user.storagePreferences?.alertAt95 !== false,
      },
      maxTrashDays: plan.trashDays,
    });
  } catch (err) {
    next(err);
  }
};
