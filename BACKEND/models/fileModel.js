import { model, Schema } from "mongoose";

const fileSchema = new Schema(
  {
    originalName: {
      type: String,
      required: [true, "File name is required"],
      trim: true,
      maxLength: [255, "File name cannot exceed 255 characters"],
    },
    // UUID-based name stored on disk to avoid collisions
    storageName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      default: "application/octet-stream",
    },
    size: {
      type: Number,
      required: true,
      min: [0, "File size cannot be negative"],
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    directoryId: {
      type: Schema.Types.ObjectId,
      ref: "Directory",
      required: true,
    },
    // Relative path on disk: "{userId}/{storageName}"
    storagePath: {
      type: String,
      required: true,
    },
    isTrashed: {
      type: Boolean,
      default: false,
    },
    trashedAt: {
      type: Date,
      default: null,
    },
  },
  {
    strict: "throw",
    timestamps: true,
  },
);

// ─── Indexes ────────────────────────────────────────────────────
// List files in a directory for a user (primary listing query)
fileSchema.index({ userId: 1, directoryId: 1, isTrashed: 1 });

// Prevent duplicate file names within the same directory for a user
fileSchema.index(
  { userId: 1, directoryId: 1, originalName: 1 },
  { unique: true },
);

// Trash page query — list all trashed files for a user
fileSchema.index({ userId: 1, isTrashed: 1, trashedAt: -1 });

const File = model("File", fileSchema);

export default File;
