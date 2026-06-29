import crypto from "node:crypto";

function getEncryptionKey() {
    const raw = process.env.TWOFA_ENCRYPTION_KEY;
    if (!raw) {
        throw new Error("Missing env var: TWOFA_ENCRYPTION_KEY");
    }

    // Allow base64 or raw string. Expect 32 bytes for AES-256-GCM.
    const keyBuf =
        raw.length === 44 && /^[A-Za-z0-9+/]+={0,2}$/.test(raw)
            ? Buffer.from(raw, "base64")
            : Buffer.from(raw, "utf8");

    if (keyBuf.length !== 32) {
        throw new Error(
            "TWOFA_ENCRYPTION_KEY must resolve to 32 bytes (AES-256-GCM). Provide base64-encoded 32-byte key.",
        );
    }

    return keyBuf;
}

export function encryptStringAesGcm(plaintext) {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(12); // recommended for GCM

    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const ciphertext = Buffer.concat([
        cipher.update(String(plaintext), "utf8"),
        cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return {
        ciphertextB64: ciphertext.toString("base64"),
        ivB64: iv.toString("base64"),
        authTagB64: authTag.toString("base64"),
    };
}

export function decryptStringAesGcm({ ciphertextB64, ivB64, authTagB64 }) {
    const key = getEncryptionKey();

    const ciphertext = Buffer.from(ciphertextB64, "base64");
    const iv = Buffer.from(ivB64, "base64");
    const authTag = Buffer.from(authTagB64, "base64");

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    const plaintext = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
    ]);

    return plaintext.toString("utf8");
}
