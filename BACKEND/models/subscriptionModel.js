import { model, Schema } from "mongoose";
import { PLAN_KEYS, SUBSCRIPTION_STATUS, PERIODS } from "../constants/subscriptionConstants.js";

const subscriptionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    razorpaySubscriptionId: {
      type: String,
      unique: true,
      required: true,
    },
    razorpayPlanId: {
      type: String,
      required: true,
    },
    razorpayCustomerId: {
      type: String,
      default: "",
    },
    planKey: {
      type: String,
      enum: Object.values(PLAN_KEYS).filter((k) => k !== PLAN_KEYS.FREE),
      required: true,
    },
    period: {
      type: String,
      enum: Object.values(PERIODS),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(SUBSCRIPTION_STATUS),
      default: SUBSCRIPTION_STATUS.CREATED,
    },
    currentPeriodStart: {
      type: Date,
      default: null,
    },
    currentPeriodEnd: {
      type: Date,
      default: null,
    },
    paymentMethod: {
      last4: { type: String, default: "" },
      type: { type: String, default: "" }, // card, upi, wallet, etc.
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelReason: {
      type: String,
      default: "",
    },
  },
  {
    strict: "throw",
    timestamps: true,
  },
);

// Compound index: quickly find a user's active subscription
subscriptionSchema.index({ userId: 1, status: 1 });

const Subscription = model("Subscription", subscriptionSchema);

export default Subscription;
