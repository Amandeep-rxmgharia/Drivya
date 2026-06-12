import { model, Schema } from "mongoose";

const directorySchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Directory name is required"],
      trim: true,
      minLength: [1, "Directory name cannot be empty"],
      maxLength: [255, "Directory name cannot exceed 255 characters"],
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    parentDirId: {
      type: Schema.Types.ObjectId,
      ref: "Directory",
      default: null,
    },
    // Array of Ancestor IDs: [rootId, parentId] for efficient subtree queries
    path: {
      type: [Schema.Types.ObjectId],
      ref: "Directory",
      default: [],
    },
    depth: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    strict: "throw",
    timestamps: true,
  },
);

// ─── Indexes ────────────────────────────────────────────────────
// List children of a directory for a user
directorySchema.index({ userId: 1, parentDirId: 1 });

// Subtree queries using regex prefix on materialized path
directorySchema.index({ userId: 1, path: 1 });

// Prevent duplicate folder names within the same parent for a user
directorySchema.index(
  { userId: 1, name: 1, parentDirId: 1 },
  { unique: true },
);

const Directory = model("Directory", directorySchema);

export default Directory;
