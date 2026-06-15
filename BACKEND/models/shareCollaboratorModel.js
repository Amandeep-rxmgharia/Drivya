import { model, Schema } from "mongoose";
import {
  COLLABORATOR_ROLES,
  COLLABORATOR_STATUS,
} from "../constants/shareConstants.js";

const shareCollaboratorSchema = new Schema(
  {
    shareId: {
      type: Schema.Types.ObjectId,
      ref: "Share",
      required: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    /** Set when invitee is a registered DRIVYA user. */
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    displayName: {
      type: String,
      trim: true,
      default: null,
    },
    role: {
      type: String,
      enum: Object.values(COLLABORATOR_ROLES),
      default: COLLABORATOR_ROLES.VIEWER,
    },
    status: {
      type: String,
      enum: Object.values(COLLABORATOR_STATUS),
      default: COLLABORATOR_STATUS.PENDING,
    },
    invitedAt: {
      type: Date,
      default: Date.now,
    },
    acceptedAt: {
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
// List collaborators for a share
shareCollaboratorSchema.index({ shareId: 1, status: 1 });

// Prevent duplicate invites per share
shareCollaboratorSchema.index({ shareId: 1, email: 1 }, { unique: true });

// "Shared with me" queries for registered users
shareCollaboratorSchema.index({ userId: 1, status: 1, createdAt: -1 });

// Lookup by email for pending invitations
shareCollaboratorSchema.index({ email: 1, status: 1 });

const ShareCollaborator = model("ShareCollaborator", shareCollaboratorSchema);

export default ShareCollaborator;
