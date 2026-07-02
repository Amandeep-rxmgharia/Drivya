import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Reuse the same encryption key as 2FA secrets
const KEY = Buffer.from(process.env.TWOFA_ENCRYPTION_KEY, "base64");
const ALGORITHM = "aes-256-gcm";

/**
 * Encrypt a Google tokens object to stored ciphertext fields.
 * @param {object} tokens - Google OAuth tokens (access_token, refresh_token, etc.)
 * @returns {{ enc: string, iv: string, authTag: string }}
 */
export function encryptTokens(tokens) {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);

  const plaintext = JSON.stringify(tokens);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  return {
    enc: encrypted,
    iv: iv.toString("hex"),
    authTag: cipher.getAuthTag().toString("hex"),
  };
}

/**
 * Decrypt stored ciphertext fields back to a Google tokens object.
 * @param {{ enc: string, iv: string, authTag: string }} fields
 * @returns {object} Google OAuth tokens
 */
export function decryptTokens({ enc, iv, authTag }) {
  if (!enc || !iv || !authTag) {
    throw new Error("Missing encrypted token fields.");
  }

  const decipher = createDecipheriv(ALGORITHM, KEY, Buffer.from(iv, "hex"));
  decipher.setAuthTag(Buffer.from(authTag, "hex"));

  let decrypted = decipher.update(enc, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return JSON.parse(decrypted);
}
