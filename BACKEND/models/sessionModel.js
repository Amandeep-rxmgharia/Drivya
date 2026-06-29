import { model, Schema } from "mongoose";

const sessionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    device: {
      type: String,
      default: "Unknown Device",
    },
    browser: {
      type: String,
      default: "Unknown Browser",
    },
    os: {
      type: String,
      default: "Unknown OS",
    },
    ip: {
      type: String,
      default: "Unknown IP",
    },
    location: {
      type: String,
      default: "Unknown Location",
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },

    // If user has 2FA enabled, this is required to access sensitive routes.
    twoFAVerifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

sessionSchema.index({ userId: 1 });
sessionSchema.index({ userId: 1, lastActive: -1 });

const Session = model("Session", sessionSchema);

export default Session;
