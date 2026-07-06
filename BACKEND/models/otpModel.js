import { model, Schema } from "mongoose";

const otpSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    otp: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 600, // 10 minutes (600 seconds) TTL index
    },
  },
  {
    strict: "throw",
    timestamps: true,
  }
);

const OTP = model("OTP", otpSchema);

export default OTP;
