import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import directoryRoutes from "./routes/directoryRoutes.js";
import fileRoutes from "./routes/fileRoutes.js";
import shareRoutes from "./routes/shareRoutes.js";
import publicShareRoutes from "./routes/publicShareRoutes.js";
import activityRoutes from "./routes/activityRoutes.js";
import starRoutes from "./routes/starRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import accountRoutes from "./routes/accountRoutes.js";
import googleDriveRoutes, { googleCallbackHandler } from "./routes/googleDriveRoutes.js";
import { connectDb } from "./config/db.js";
import { ensureStorageRoot } from "./services/storageService.js";

const { PORT = 3000, CORS_ORIGIN = "http://localhost:5173", NODE_ENV } = process.env;

// ─── Connect to Database ─────────────────────────────────────
await connectDb();

// ─── Ensure Storage Directory Exists ─────────────────────────
await ensureStorageRoot();

const app = express();

// ─── CORS Origins ────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  CORS_ORIGIN
];

// ─── Security Headers ────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "frame-ancestors": ["'self'", ...allowedOrigins],
        "connect-src": ["'self'", "http://localhost:3000", "http://localhost:5173", "http://localhost:5174"],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    frameguard: false,
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      const msg = `The CORS policy does not allow access from origin ${origin}.`;
      return callback(new Error(msg), false);
    },
    credentials: true,
  
  }),
);

// ─── Global Rate Limiter ─────────────────────────────────────
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 100 requests per window per IP
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// ─── Body Parsers ────────────────────────────────────────────
app.use(express.json({ limit: "10kb" })); // prevent large payload attacks
app.use(cookieParser());

// ─── Routes ──────────────────────────────────────────────────
app.use("/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/directories", directoryRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/shares", shareRoutes);
app.use("/public/shares", publicShareRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/starred", starRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/account", accountRoutes);
app.use("/api/google", googleDriveRoutes);
app.get("/auth/google/callback", googleCallbackHandler);

// ─── Global Error Handler ────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Error:`, err.message);

  // Don't leak stack traces or internal details in production
  const status = err.status || err.statusCode || 500;
  const message =
    NODE_ENV === "production"
      ? "Something went wrong!"
      : err.message || "Something went wrong!";

  res.status(status).json({ message });
});

// ─── Start Server ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
});
