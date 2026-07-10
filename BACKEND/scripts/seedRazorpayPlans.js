/**
 * One-time script to create Razorpay Plans.
 *
 * Run:  node scripts/seedRazorpayPlans.js
 *
 * This creates 8 plans on Razorpay (4 paid tiers × 2 periods)
 * and prints the plan IDs to paste into your .env file.
 */

import "dotenv/config";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const PLANS_TO_SEED = [
  {
    envKey: "RZP_PLAN_SPARK_GO_MONTHLY",
    name: "Spark Go — Monthly",
    amount: 3900, // ₹39 in paise
    period: "monthly",
    interval: 1,
    description: "50 GB storage, 25 GB bandwidth, 15-day trash recovery",
  },
  {
    envKey: "RZP_PLAN_SPARK_GO_YEARLY",
    name: "Spark Go — Yearly",
    amount: 39900, // ₹399 in paise
    period: "yearly",
    interval: 1,
    description: "50 GB storage, 25 GB bandwidth, 15-day trash recovery",
  },
  {
    envKey: "RZP_PLAN_BOOST_MONTHLY",
    name: "Boost — Monthly",
    amount: 14900, // ₹149 in paise
    period: "monthly",
    interval: 1,
    description: "100 GB storage, 70 GB bandwidth, 30-day trash recovery",
  },
  {
    envKey: "RZP_PLAN_BOOST_YEARLY",
    name: "Boost — Yearly",
    amount: 149900, // ₹1499 in paise
    period: "yearly",
    interval: 1,
    description: "100 GB storage, 70 GB bandwidth, 30-day trash recovery",
  },
  {
    envKey: "RZP_PLAN_PRO_MONTHLY",
    name: "Pro — Monthly",
    amount: 39900, // ₹399 in paise
    period: "monthly",
    interval: 1,
    description: "500 GB storage, 300 GB bandwidth, 45-day trash recovery",
  },
  {
    envKey: "RZP_PLAN_PRO_YEARLY",
    name: "Pro — Yearly",
    amount: 399900, // ₹3999 in paise
    period: "yearly",
    interval: 1,
    description: "500 GB storage, 300 GB bandwidth, 45-day trash recovery",
  },
  {
    envKey: "RZP_PLAN_APEX_MONTHLY",
    name: "Apex — Monthly",
    amount: 69900, // ₹699 in paise
    period: "monthly",
    interval: 1,
    description: "1 TB storage, 700 GB bandwidth, 60-day trash recovery",
  },
  {
    envKey: "RZP_PLAN_APEX_YEARLY",
    name: "Apex — Yearly",
    amount: 699900, // ₹6999 in paise
    period: "yearly",
    interval: 1,
    description: "1 TB storage, 700 GB bandwidth, 60-day trash recovery",
  },
];

async function seed() {
  console.log("🚀 Creating Razorpay plans...\n");

  const results = [];

  for (const plan of PLANS_TO_SEED) {
    try {
      const created = await razorpay.plans.create({
        period: plan.period,
        interval: plan.interval,
        item: {
          name: plan.name,
          amount: plan.amount,
          currency: "INR",
          description: plan.description,
        },
      });

      results.push({ envKey: plan.envKey, id: created.id, name: plan.name });
      console.log(`  ✅ ${plan.name} → ${created.id}`);
    } catch (err) {
      console.error(`  ❌ ${plan.name} — ${err.error?.description || err.message}`);
    }
  }

  console.log("\n─── Copy these into your .env ───\n");
  for (const r of results) {
    console.log(`${r.envKey}=${r.id}`);
  }
  console.log("\n✅ Done! Paste the above into your BACKEND/.env file.");
}

seed().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
