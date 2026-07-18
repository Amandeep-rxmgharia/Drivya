import { model, Schema } from "mongoose";
import bcrypt from "bcrypt";
import { ROLES } from "../constants/rbacConstants.js";

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
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.USER,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeactivated: {
      type: Boolean,
      default: false,
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

    // ─── Google OAuth Login ─────────────────────────────────
    googleId: {
      type: String,
      unique: true,
      sparse: true, // allows null (non-Google users)
    },
    // ─── GitHub OAuth Login ─────────────────────────────────
    githubId: {
      type: String,
      unique: true,
      sparse: true, // allows null (non-GitHub users)
    },
    authProvider: {
      type: String,
      enum: ["local", "google", "github"],
      default: "local",
    },

    password: {
      type: String,
      required: function () {
        return this.authProvider === "local";
      },
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
      default: 2 * 1024 * 1024 * 1024, // 2 GB default (Spark Free)
      min: [0, "Storage limit cannot be negative"],
    },
    bandwidthUsed: {
      type: Number,
      default: 0,
      min: [0, "Bandwidth used cannot be negative"],
    },
    bandwidthLimit: {
      type: Number,
      default: 10 * 1024 * 1024 * 1024, // 10 GB default (Spark Free)
      min: [0, "Bandwidth limit cannot be negative"],
    },

    // ─── Subscription ────────────────────────────────────────
    subscription: {
      plan: {
        type: String,
        enum: ["free", "spark_go", "boost", "pro", "apex"],
        default: "free",
      },
      status: {
        type: String,
        enum: ["active", "past_due", "cancelled", "cancel_scheduled", "downgrade_scheduled", "billing_cycle_change_scheduled", "none"],
        default: "none",
      },
      subscriptionId: {
        type: Schema.Types.ObjectId,
        ref: "Subscription",
        default: null,
      },
      razorpayCustomerId: {
        type: String,
        default: "",
      },
    },

    // ─── Storage Preferences ─────────────────────────────────
    storagePreferences: {
      trashAutoEmptyDays: {
        type: Number,
        default: 30,
        validate: {
          validator: function (v) {
            return v === null || [7, 30, 60, 90].includes(v);
          },
          message: "trashAutoEmptyDays must be one of: null, 7, 30, 60, 90",
        },
      },
      alertAt80: {
        type: Boolean,
        default: true,
      },
      alertAt95: {
        type: Boolean,
        default: true,
      },
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
      enum: ["always", "never"],
      default: "never",
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
    loginAlerts: {
      type: Boolean,
      default: true,
    },

    // ─── Two-Factor Authentication (2FA / TOTP) ─────────────────────
    twoFAEnabled: {
      type: Boolean,
      default: false,
    },
    // Encrypted TOTP secret at rest (AES-256-GCM)
    // Stored as two separate fields to avoid accidental exposure in logs.
    twoFASecretEnc: {
      type: String,
      default: "",
    },
    twoFASecretIv: {
      type: String,
      default: "",
    },
    twoFASecretAuthTag: {
      type: String,
      default: "",
    },

    // Backup codes: store only bcrypt hashes.
    // Each code can be used once.
    twoFABackupCodes: [
      {
        hash: { type: String, required: true },
        used: { type: Boolean, default: false },
        usedAt: { type: Date, default: null },
      },
    ],

    // ─── Google Drive Integration ─────────────────────────────
    googleDriveConnected: {
      type: Boolean,
      default: false,
    },
    googleDriveEmail: {
      type: String,
      default: "",
    },
    // Encrypted Google OAuth tokens at rest (AES-256-GCM)
    googleTokensEnc: {
      type: String,
      default: "",
    },
    googleTokensIv: {
      type: String,
      default: "",
    },
    googleTokensAuthTag: {
      type: String,
      default: "",
    },

    // ─── Dropbox Integration ──────────────────────────────────
    dropboxConnected: {
      type: Boolean,
      default: false,
    },
    dropboxEmail: {
      type: String,
      default: "",
    },
    // Encrypted Dropbox OAuth tokens at rest (AES-256-GCM)
    dropboxTokensEnc: {
      type: String,
      default: "",
    },
    dropboxTokensIv: {
      type: String,
      default: "",
    },
    dropboxTokensAuthTag: {
      type: String,
      default: "",
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
  if (!this.isModified("password") || !this.password) return next();

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
