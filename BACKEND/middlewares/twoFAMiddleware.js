import User from "../models/userModel.js";
import Session from "../models/sessionModel.js";

/**
 * Require 2FA (TOTP) verification for sensitive routes.
 *
 * Strategy:
 * - If user does not have 2FA enabled -> allow.
 * - If 2FA enabled -> require Session.twoFAVerifiedAt to be set.
 */
export async function requireTwoFA(req, res, next) {
    try {
        const userId = req.user?.id;
        const sessionId = req.user?.sessionId;

        if (!userId) {
            return res.status(401).json({ message: "Authentication required." });
        }

        const user = await User.findById(userId).select("twoFAEnabled").lean();
        if (!user) {
            return res.status(401).json({ message: "User not found." });
        }

        if (!user.twoFAEnabled) return next();

        if (!sessionId) {
            return res.status(403).json({
                message: "Two-factor authentication required.",
                code: "TWOFA_REQUIRED",
            });
        }

        const session = await Session.findById(sessionId).select("twoFAVerifiedAt").lean();
        if (!session || !session.twoFAVerifiedAt) {
            return res.status(403).json({
                message: "Two-factor authentication required.",
                code: "TWOFA_REQUIRED",
            });
        }

        next();
    } catch (err) {
        return res.status(500).json({ message: "Something went wrong!" });
    }
}
