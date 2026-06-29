import Session from "../models/sessionModel.js";

/**
 * List all active sessions for the current authenticated user.
 */
export const listSessions = async (req, res, next) => {
  try {
    const sessions = await Session.find({ userId: req.user.id })
      .sort({ lastActive: -1 })
      .lean();

    const formattedSessions = sessions.map((s) => ({
      id: s._id.toString(),
      device: s.device,
      browser: s.browser,
      os: s.os,
      ip: s.ip,
      location: s.location,
      lastActive: s._id.toString() === req.user.sessionId?.toString() ? "Active now" : s.lastActive,
      current: s._id.toString() === req.user.sessionId?.toString(),
    }));

    return res.json({ sessions: formattedSessions });
  } catch (err) {
    next(err);
  }
};

/**
 * Revoke a specific active session.
 */
export const revokeSession = async (req, res, next) => {
  const { id } = req.params;
  try {
    if (id === req.user.sessionId?.toString()) {
      return res
        .status(400)
        .json({ message: "Cannot revoke your current session. Please log out instead." });
    }

    const result = await Session.findOneAndDelete({ _id: id, userId: req.user.id });
    if (!result) {
      return res.status(404).json({ message: "Session not found." });
    }

    return res.json({ message: "Session revoked successfully." });
  } catch (err) {
    next(err);
  }
};

/**
 * Revoke all other active sessions for the current user.
 */
export const revokeOtherSessions = async (req, res, next) => {
  try {
    const currentSessionId = req.user.sessionId;
    if (!currentSessionId) {
      return res.status(400).json({ message: "Current session not identified." });
    }

    const result = await Session.deleteMany({
      userId: req.user.id,
      _id: { $ne: currentSessionId },
    });

    return res.json({
      message: "All other sessions revoked successfully.",
      count: result.deletedCount,
    });
  } catch (err) {
    next(err);
  }
};
