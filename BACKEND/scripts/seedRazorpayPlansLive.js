/**
 * One-time script to create LIVE Razorpay Plans for Drivya.
 *
 * ⚠️  BEFORE RUNNING:
 *   1. Paste your LIVE Razorpay key_id and key_secret below.
 *   2. Double-check all plan names and prices.
 *
 * Run:  node scripts/seedRazorpayPlansLive.js
 *
 * This creates 8 plans on Razorpay (4 paid tiers × 2 periods)
 * and prints the plan IDs to paste into your .env file.
 *
 * Plan names now match Drivya's customer-facing names:
 *   spark_go → "Lite"
 *   boost    → "Plus"
 *   pro      → "Pro"
 *   apex     → "Max"
 */

import Razorpay from "razorpay";

// ─── 🔑 PASTE YOUR LIVE RAZORPAY KEYS HERE ─────────────────────
const razorpay = new Razorpay({
  key_id: "rzp_live_XXXXXXXXXXXXXXX",       // ← Replace with your live key_id
  key_secret: "XXXXXXXXXXXXXXXXXXXXXXXX",    // ← Replace with your live key_secret
});
// ────────────────────────────────────────────────────────────────

const PLANS_TO_SEED = [
  // ─── Lite (spark_go) ──────────────────────────────
  {
    envKey: "RZP_PLAN_SPARK_GO_MONTHLY",
    name: "Lite — Monthly",
    amount: 3900, // ₹39 in paise
    period: "monthly",
    interval: 1,
    description: "50 GB storage, 25 GB bandwidth, 15-day trash recovery",
  },
  {
    envKey: "RZP_PLAN_SPARK_GO_YEARLY",
    name: "Lite — Yearly",
    amount: 39900, // ₹399 in paise
    period: "yearly",
    interval: 1,
    description: "50 GB storage, 25 GB bandwidth, 15-day trash recovery",
  },

  // ─── Plus (boost) ─────────────────────────────────
  {
    envKey: "RZP_PLAN_BOOST_MONTHLY",
    name: "Plus — Monthly",
    amount: 14900, // ₹149 in paise
    period: "monthly",
    interval: 1,
    description: "100 GB storage, 70 GB bandwidth, 30-day trash recovery",
  },
  {
    envKey: "RZP_PLAN_BOOST_YEARLY",
    name: "Plus — Yearly",
    amount: 149900, // ₹1499 in paise
    period: "yearly",
    interval: 1,
    description: "100 GB storage, 70 GB bandwidth, 30-day trash recovery",
  },

  // ─── Pro ──────────────────────────────────────────
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

  // ─── Max (apex) ───────────────────────────────────
  {
    envKey: "RZP_PLAN_APEX_MONTHLY",
    name: "Max — Monthly",
    amount: 69900, // ₹699 in paise
    period: "monthly",
    interval: 1,
    description: "1 TB storage, 700 GB bandwidth, 60-day trash recovery",
  },
  {
    envKey: "RZP_PLAN_APEX_YEARLY",
    name: "Max — Yearly",
    amount: 699900, // ₹6999 in paise
    period: "yearly",
    interval: 1,
    description: "1 TB storage, 700 GB bandwidth, 60-day trash recovery",
  },
];

async function seed() {
  // Safety check — don't run with placeholder keys
  if (razorpay.key_id?.includes("XXXXX")) {
    console.error(
      "❌ You haven't replaced the placeholder keys!\n" +
      "   Open this file and paste your LIVE Razorpay key_id & key_secret.\n"
    );
    process.exit(1);
  }

  console.log("🚀 Creating LIVE Razorpay plans for Drivya...\n");
  console.log("   Key ID:", razorpay.key_id, "\n");

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
      console.error(
        `  ❌ ${plan.name} — ${err.error?.description || err.message}`
      );
    }
  }

  if (results.length === 0) {
    console.error("\n❌ No plans were created. Check your keys and try again.");
    process.exit(1);
  }

  console.log("\n─── Copy these into your .env (replace the old test plan IDs) ───\n");
  for (const r of results) {
    console.log(`${r.envKey}=${r.id}`);
  }
  console.log("\n─── Also update your live Razorpay keys in .env ───\n");
  console.log(`RAZORPAY_KEY_ID=${razorpay.key_id}`);
  console.log(`RAZORPAY_KEY_SECRET=<your_live_secret>`);
  console.log("\n✅ Done! Paste all the above into your BACKEND/.env file.");
}

seed().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
