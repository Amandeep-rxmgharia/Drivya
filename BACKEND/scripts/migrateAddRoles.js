import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/userModel.js";
import { ROLES } from "../constants/rbacConstants.js";
import { connectDb } from "../config/db.js";

async function runMigration() {
  try {
    console.log("Connecting to database...");
    await connectDb();
    console.log("Database connected successfully.");

    // Update all users missing role or isActive
    const query = {
      $or: [
        { role: { $exists: false } },
        { isActive: { $exists: false } }
      ]
    };

    const usersToUpdate = await User.find(query);
    console.log(`Found ${usersToUpdate.length} users needing schema migration.`);

    let updatedCount = 0;
    for (const user of usersToUpdate) {
      if (user.role === undefined) {
        user.role = ROLES.USER;
      }
      if (user.isActive === undefined) {
        user.isActive = true;
      }
      await user.save();
      updatedCount++;
    }
    console.log(`Successfully migrated ${updatedCount} users.`);

    // Check if ADMIN_EMAIL is configured to seed/promote the first admin user
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      console.log(`Checking admin promotion target: ${adminEmail}`);
      const normalizedEmail = adminEmail.trim().toLowerCase();
      const user = await User.findOne({ email: normalizedEmail });
      
      if (user) {
        if (user.role !== ROLES.ADMIN) {
          user.role = ROLES.ADMIN;
          user.isActive = true;
          await user.save();
          console.log(`Successfully promoted ${normalizedEmail} to ADMIN.`);
        } else {
          console.log(`${normalizedEmail} is already an ADMIN.`);
        }
      } else {
        console.warn(`User with email ${normalizedEmail} not found. Ensure the user exists before running promotion.`);
      }
    } else {
      console.log("No ADMIN_EMAIL env variable specified. Skipping admin promotion.");
    }

    console.log("Migration completed successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await mongoose.connection.close();
    console.log("Database connection closed.");
    process.exit(0);
  }
}

runMigration();
