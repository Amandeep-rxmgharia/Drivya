import mongoose, { Types } from "mongoose";
import Directory from "../models/directoryModel.js";
import User from "../models/userModel.js";
import {
  generateAccessToken,
  generateRefreshToken,
  setTokenCookies,
  clearTokenCookies,
  verifyRefreshToken,
} from "../config/tokenUtils.js";

// ─── Register ────────────────────────────────────────────────
export const register = async (req, res, next) => {
  const { name, email, contact, password } = req.body;
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      // Create user (password is hashed automatically by pre-save hook)
      const [user] = await User.create(
        [
          {
            name,
            email,
            password,
            contact,
          },
        ],
        { session },
      );

      // Create root directory linked to user
      const rootDirId = new Types.ObjectId();
      await Directory.create(
        [
          {
            _id: rootDirId,
            name: `root@${email}`,
            userId: user._id,
            path: [],
            depth: 0,
          },
        ],
        { session },
      );

      // Update user with root directory reference
      user.rootDirId = rootDirId;
      await user.save({ session });

      // Generate tokens
      const accessToken = generateAccessToken(user._id.toString());
      const refreshToken = generateRefreshToken(user._id.toString());
      setTokenCookies(res, accessToken, refreshToken);

      return res.status(201).json({
        message: "Registration successful!",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          rootDirId: rootDirId,
        },
      });
    });
  } catch (err) {
    // Handle duplicate key error (email or contact already exists)
    if (err?.code === 11000 || err?.errorResponse?.code === 11000) {
      const field = err.keyPattern
        ? Object.keys(err.keyPattern)[0]
        : "email";
      return res.status(409).json({
        message:
          field === "contact"
            ? "Phone number already registered."
            : "Email already registered.",
      });
    }
    next(err);
  } finally {
    await session.endSession();
  }
};

// ─── Login ───────────────────────────────────────────────────
export const login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // Find user by email only, explicitly include password field
    const user = await User.findOne({ email }).select("+password").lean(false);

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." });
    }
    // Securely compare passwords using bcrypt
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());
    setTokenCookies(res, accessToken, refreshToken);

    return res.json({
      message: "Login successful!",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        rootDirId: user.rootDirId,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Refresh Token ───────────────────────────────────────────
export const refresh = async (req, res, next) => {
  const token = req.cookies?.refreshToken;

  if (!token) {
    return res.status(401).json({ message: "Refresh token required." });
  }

  try {
    const decoded = verifyRefreshToken(token);
    // Verify user still exists
    const user = await User.findById(decoded.id).lean().select("_id");
    if (!user) {
      return res.status(401).json({ message: "User no longer exists." });
    }

    // Issue new access token (token rotation)
    const newAccessToken = generateAccessToken(decoded.id);
    const newRefreshToken = generateRefreshToken(decoded.id);
    setTokenCookies(res, newAccessToken, newRefreshToken);

    return res.json({ message: "Token refreshed." });
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid refresh token." });
    }
    next(err);
  }
};

// ─── Logout ──────────────────────────────────────────────────
export const logout = (_req, res) => {
  clearTokenCookies(res);
  return res.json({ message: "Logged out successfully." });
};

// ─── Get Current User ────────────────────────────────────────
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).lean().select("-__v");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json({ user });
  } catch (err) {
    next(err);
  }
};
