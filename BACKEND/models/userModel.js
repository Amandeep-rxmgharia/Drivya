import { model, Schema } from "mongoose";
import bcrypt from "bcrypt";

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minLength: [
        3,
        "name field should a string with at least three characters",
      ],
      maxLength: [50, "name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        "please enter a valid email",
      ],
    },
    contact: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    language: {
      type: String,
      trim: true,
      default: "en",
    },
    timezone: {
      type: String,
      trim: true,
      default: "auto",
    },
    avatarUrl: {
      type: String,
      trim: true,
      default: "",
    },
    password: {
      type: String,
      required: true,
      minLength: [8, "password must be at least 8 characters"],
      select: false, // never include password in queries by default
    },
    rootDirId: {
      type: Schema.Types.ObjectId,
      ref: "Directory",
    },
    storageUsed: {
      type: Number,
      default: 0,
      min: [0, "Storage used cannot be negative"],
    },
    storageLimit: {
      type: Number,
      default: 1 * 1024 * 1024 * 1024, // 1 GB default
      min: [0, "Storage limit cannot be negative"],
    },

    // ─── Sharing defaults (used when creating new share links) ───
    defaultShareAccess: {
      type: String,
      enum: ["view", "view-download"],
      default: "view",
    },
    defaultShareExpiryDays: {
      type: Number,
      default: null, // null = never
      validate: {
        validator: function (v) {
          // allow null or one of supported values
          if (v === null || v === undefined) return true;
          return [1, 7, 30, 90, 365].includes(v);
        },
        message: "defaultShareExpiryDays must be one of: null, 1, 7, 30, 90, 365",
      },
    },
    defaultSharePassword: {
      type: String,
      enum: ["always", "suggest", "never"],
      default: "suggest",
    },
    defaultShareDownloadPermission: {
      type: Boolean,
      default: true,
    },
    defaultShareNotify: {
      // Persisted for future use (UI currently includes it)
      type: String,
      default: "first-view",
    },
    defaultSharePublicProfile: {
      type: String,
      enum: ["full", "name", "anonymous"],
      default: "name",
    },
  },
  {
    strict: "throw",
    timestamps: true,
  },
);

// ─── Pre-save hook: hash password before storing ─────────────
userSchema.pre("save", async function (next) {
  // Only hash if the password field was modified (or is new)
  if (!this.isModified("password")) return next();

  try {
    this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
    next();
  } catch (err) {
    next(err);
  }
});

// ─── Instance method: compare candidate password ─────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = model("User", userSchema);

export default User;
