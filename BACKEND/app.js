import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/authRoutes.js";
import { connectDb } from "./config/db.js";

const { PORT = 3000, CORS_ORIGIN = "http://localhost:5173", NODE_ENV } = process.env;

// ─── Connect to Database ─────────────────────────────────────
await connectDb();

const app = express();

// ─── Security Headers ────────────────────────────────────────
app.use(helmet());

// ─── CORS — explicit origin, credentials allowed ─────────────
app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: true,
  }),
);

// ─── Global Rate Limiter ─────────────────────────────────────
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window per IP
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// ─── Body Parsers ────────────────────────────────────────────
app.use(express.json({ limit: "10kb" })); // prevent large payload attacks
app.use(cookieParser());

// ─── Routes ──────────────────────────────────────────────────
app.use("/auth", authRoutes);

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
