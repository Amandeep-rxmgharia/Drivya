import { model, Schema } from "mongoose";
import { NOTIFICATION_TYPES, NOTIFICATION_TTL_DAYS } from "../constants/notificationConstants.js";

const notificationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    read: {
      type: Boolean,
      default: false,
    },
    actionLabel: {
      type: String,
      trim: true,
      default: null,
    },
    actionPath: {
      type: String,
      trim: true,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },

    // Per-notification expiry (used for 1-time secrets like share passwords).
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

// Default long TTL for regular notifications
notificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: NOTIFICATION_TTL_DAYS * 24 * 60 * 60 },
);

// Short TTL for sensitive notifications when `expiresAt` is set
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Notification = model("Notification", notificationSchema);

export default Notification;
