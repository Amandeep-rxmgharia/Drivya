import File from "../models/fileModel.js";
import Directory from "../models/directoryModel.js";
import Share from "../models/shareModel.js";
import ShareCollaborator from "../models/shareCollaboratorModel.js";
import User from "../models/userModel.js";

/**
 * Search user's files, folders, collaborators, and active users on the platform.
 */
export const searchAll = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { q = "" } = req.query;

    if (!q.trim()) {
      return res.json({ files: [], directories: [], collaborators: [], users: [] });
    }

    const regex = new RegExp(q, "i");

    // Query in parallel
    const [files, directories, collaborators, users] = await Promise.all([
      File.find({
        userId,
        originalName: regex,
        isTrashed: false,
      })
        .limit(10)
        .lean(),

      Directory.find({
        userId,
        name: regex,
      })
        .limit(10)
        .lean(),

      ShareCollaborator.find({
        ownerId: userId,
        $or: [
          { displayName: regex },
          { email: regex },
        ],
      })
        .limit(10)
        .lean(),

      User.find({
        _id: { $ne: userId },
        isDeactivated: false,
        $or: [
          { name: regex },
          { email: regex },
        ],
      })
        .select("name email avatarUrl")
        .limit(10)
        .lean(),
    ]);

    // Enrich collaborator profiles with the share information they belong to
    const shareIds = collaborators.map((c) => c.shareId);
    const shares = await Share.find({ _id: { $in: shareIds } }).lean();
    const shareMap = Object.fromEntries(shares.map((s) => [s._id.toString(), s]));

    const enrichedCollaborators = collaborators.map((c) => {
      const share = shareMap[c.shareId.toString()];
      return {
        id: c._id,
        name: c.displayName || c.email.split("@")[0],
        email: c.email,
        role: c.role,
        status: c.status,
        shareId: c.shareId,
        shareName: share?.resourceSnapshot?.name || "Shared Resource",
      };
    });

    return res.json({
      files,
      directories,
      collaborators: enrichedCollaborators,
      users,
    });
  } catch (err) {
    next(err);
  }
};
