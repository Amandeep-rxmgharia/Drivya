import { model, Schema } from "mongoose";
import {
  RESOURCE_TYPES,
  VISIBILITY,
  DEFAULT_PERMISSIONS,
} from "../constants/shareConstants.js";

const permissionsSchema = new Schema(
  {
    allowView: { type: Boolean, default: DEFAULT_PERMISSIONS.allowView },
    allowDownload: {
      type: Boolean,
      default: DEFAULT_PERMISSIONS.allowDownload,
    },
  },
  { _id: false },
);

const resourceSnapshotSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    mimeType: { type: String, default: "application/octet-stream" },
    size: { type: Number, default: 0, min: 0 },
    kind: { type: String, default: null },
  },
  { _id: false },
);

const shareSchema = new Schema(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
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
    /** Short public slug — e.g. drivya.link/a8f3kd */
    token: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minLength: 8,
      maxLength: 32,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    visibility: {
      type: String,
      enum: Object.values(VISIBILITY),
      default: VISIBILITY.PUBLIC,
    },
    passwordHash: {
      type: String,
      default: null,
      select: false,
    },
    /** Queryable flag — updated when password is set or cleared. */
    isPasswordProtected: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    permissions: {
      type: permissionsSchema,
      default: () => ({ ...DEFAULT_PERMISSIONS }),
    },
    isStarred: {
      type: Boolean,
      default: false,
    },
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    downloadCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastAccessedAt: {
      type: Date,
      default: null,
    },
    /** Denormalized file metadata for fast list/search without joins. */
    resourceSnapshot: {
      type: resourceSnapshotSchema,
      required: true,
    },
    revokedAt: {
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
// Owner dashboard: list shares sorted by creation date
shareSchema.index({ ownerId: 1, createdAt: -1 });

// Filter active / expired / starred shares for a user
shareSchema.index({ ownerId: 1, isActive: 1, expiresAt: 1 });
shareSchema.index({ ownerId: 1, isStarred: 1, createdAt: -1 });

// One share record per resource per owner (upsert on create)
shareSchema.index(
  { ownerId: 1, resourceType: 1, resourceId: 1 },
  { unique: true },
);

// Protected shares filter
shareSchema.index({ ownerId: 1, isPasswordProtected: 1 });

// Search shares by file name (case-insensitive prefix/contains at scale)
shareSchema.index({ ownerId: 1, "resourceSnapshot.name": 1 });

// Text search for share list (MongoDB Atlas Search alternative at 100k+ shares)
shareSchema.index({ "resourceSnapshot.name": "text" });

// ─── Instance Methods ───────────────────────────────────────────
shareSchema.methods.isExpired = function isExpired() {
  if (!this.expiresAt) return false;
  return this.expiresAt <= new Date();
};

shareSchema.methods.isAccessible = function isAccessible() {
  return this.isActive && !this.revokedAt && !this.isExpired();
};

shareSchema.methods.requiresPassword = function requiresPassword() {
  return this.visibility === VISIBILITY.RESTRICTED && Boolean(this.passwordHash);
};

/** Virtual public URL for API responses. */
shareSchema.virtual("linkUrl").get(function linkUrl() {
  const base =
    process.env.PUBLIC_SHARE_BASE_URL || "https://drivya.link";
  return `${base.replace(/\/$/, "")}/${this.token}`;
});

shareSchema.set("toJSON", { virtuals: true });
shareSchema.set("toObject", { virtuals: true });

const Share = model("Share", shareSchema);

export default Share;
