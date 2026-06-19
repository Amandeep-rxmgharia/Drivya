import { model, Schema } from "mongoose";
import { ACTIVITY_ACTIONS, ACTIVITY_TTL_DAYS } from "../constants/activityConstants.js";
import { RESOURCE_TYPES } from "../constants/shareConstants.js";

const resourceSnapshotSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    mimeType: { type: String, default: null },
    size: { type: Number, default: null, min: 0 },
    kind: { type: String, default: null },
  },
  { _id: false },
);

const activitySchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      enum: Object.values(ACTIVITY_ACTIONS),
      required: true,
    },
    resourceType: {
      type: String,
      enum: Object.values(RESOURCE_TYPES),
      required: true,
    },
    resourceId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    /** Denormalized snapshot — avoids $lookup on every list call. */
    resourceSnapshot: {
      type: resourceSnapshotSchema,
      required: true,
    },
    /** Directory the resource lives in (file.directoryId or dir.parentDirId). */
    parentDirId: {
      type: Schema.Types.ObjectId,
      ref: "Directory",
      default: null,
    },
    /** Extensible metadata: { oldName, newName } for renames, etc. */
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    strict: "throw",
    timestamps: true,
  },
);

// ─── Indexes ────────────────────────────────────────────────────

// Primary listing: recent activities for a user (covers GET /api/activities)
activitySchema.index({ userId: 1, createdAt: -1 });

// Filtered listing by action type (covers ?action=opened / ?action=uploaded)
activitySchema.index({ userId: 1, action: 1, createdAt: -1 });

// Dedup lookup: find latest activity for a specific resource + action
activitySchema.index(
  { userId: 1, resourceType: 1, resourceId: 1, action: 1, createdAt: -1 },
);

// TTL auto-cleanup: purge activities older than the configured retention period
activitySchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: ACTIVITY_TTL_DAYS * 24 * 60 * 60 },
);

const Activity = model("Activity", activitySchema);

export default Activity;
