import { model, Schema } from "mongoose";

/**
 * Immutable audit trail for admin/moderator actions.
 *
 * Every sensitive operation (role change, suspend, delete) writes a
 * record here. Documents should never be updated or deleted — they
 * serve as a tamper-evident log.
 */
const auditLogSchema = new Schema(
  {
    /** Admin/moderator who performed the action. */
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    /** Canonical action type (see AUDIT_ACTIONS in rbacConstants). */
    action: {
      type: String,
      required: true,
      trim: true,
    },
    /** The user who was acted upon (if applicable). */
    targetUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    /** Free-form detail object, e.g. { oldRole, newRole }. */
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    /** IP address of the admin at the time of the action. */
    ip: {
      type: String,
      default: "",
    },
  },
  {
    strict: "throw",
    timestamps: true,
  },
);

// ─── Indexes ────────────────────────────────────────────────────────
// Admin activity feed (most recent first)
auditLogSchema.index({ performedBy: 1, createdAt: -1 });

// Lookup actions affecting a specific user
auditLogSchema.index({ targetUserId: 1, createdAt: -1 });

// Filter by action type
auditLogSchema.index({ action: 1, createdAt: -1 });

const AuditLog = model("AuditLog", auditLogSchema);

export default AuditLog;
