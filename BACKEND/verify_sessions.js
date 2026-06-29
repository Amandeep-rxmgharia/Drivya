import "dotenv/config";
import mongoose from "mongoose";
import { parseUserAgent } from "./utils/uaParser.js";
import Session from "./models/sessionModel.js";
import { connectDb } from "./config/db.js";

// Test parsing
const uaList = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0"
];

console.log("--- UA Parser Tests ---");
for (const ua of uaList) {
  console.log(`UA: ${ua.slice(0, 50)}...`);
  console.log("Parsed:", parseUserAgent(ua));
}

// Test Mongo models if MONGO_URI is accessible
if (process.env.MONGO_URI) {
  try {
    await connectDb();
    console.log("Database connected successfully for verification.");
    
    // Create a mock user ID
    const mockUserId = new mongoose.Types.ObjectId();
    const mockSession = await Session.create({
      userId: mockUserId,
      device: "MacBook Pro",
      browser: "Chrome 126",
      os: "macOS 10.15.7",
      ip: "127.0.0.1",
      location: "Localhost",
    });

    console.log("Created Mock Session:", mockSession.toObject());
    
    const foundSessions = await Session.find({ userId: mockUserId });
    console.log(`Found ${foundSessions.length} sessions for mock user.`);
    
    await Session.findByIdAndDelete(mockSession._id);
    console.log("Cleaned up mock session.");
  } catch (err) {
    console.error("Mongo Verification Error:", err.message);
  } finally {
    await mongoose.disconnect();
  }
}
process.exit(0);
