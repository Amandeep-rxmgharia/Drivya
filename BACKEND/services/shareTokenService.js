import crypto from "node:crypto";
import Share from "../models/shareModel.js";

const TOKEN_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const DEFAULT_TOKEN_LENGTH = 12;
const MAX_COLLISION_RETRIES = 5;

/**
 * Generate a URL-safe share token (e.g. a8f3kd9x2mn).
 * @param {number} [length=12]
 */
export function generateShareToken(length = DEFAULT_TOKEN_LENGTH) {
  const bytes = crypto.randomBytes(length);
  let token = "";

  for (let i = 0; i < length; i += 1) {
    token += TOKEN_ALPHABET[bytes[i] % TOKEN_ALPHABET.length];
  }

  return token;
}

/**
 * Create a unique share token, retrying on collision.
 */
export async function createUniqueShareToken() {
  for (let attempt = 0; attempt < MAX_COLLISION_RETRIES; attempt += 1) {
    const token = generateShareToken();
    const exists = await Share.exists({ token }).lean();
    if (!exists) return token;
  }

  throw new Error("Unable to generate unique share token.");
}

/**
 * Compute expiration date from preset days.
 * @param {number|null} days
 */
export function computeExpirationDate(days) {
  if (!days) return null;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);
  return expiresAt;
}

/**
 * Map frontend expiration labels to days.
 * @param {string|null} preset
 */
export function parseExpirationPreset(preset) {
  const map = {
    Never: null,
    "1 Day": 1,
    "7 Days": 7,
    "30 Days": 30,
  };

  if (preset == null || preset === "") return null;
  if (typeof preset === "number") return preset;
  if (map[preset] !== undefined) return map[preset];

  return null;
}

/**
 * Build the public share URL for a token.
 * @param {string} token
 */
export function buildShareUrl(token) {
  const base = process.env.PUBLIC_SHARE_BASE_URL || "https://drivya.link";
  return `${base.replace(/\/$/, "")}/${token}`;
}
