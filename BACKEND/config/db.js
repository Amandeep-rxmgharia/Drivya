import mongoose from "mongoose";

const { MONGO_URI, DB_NAME = "Drivya" } = process.env;

export async function connectDb() {
  console.log(MONGO_URI);
  try {
    await mongoose.connect(MONGO_URI, {
      dbName: DB_NAME,
      maxPoolSize: 10, // connection pool for concurrent requests
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log("Database connected");
  } catch (err) {
    console.error("Could Not Connect to the Database:", err.message);
    process.exit(1);
  }

  // Log connection errors after initial connect
  mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err.message);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected. Attempting reconnect...");
  });
}

process.on("SIGINT", async () => {
  await mongoose.disconnect();
  console.log("Database Disconnected!");
  process.exit(0);
});
