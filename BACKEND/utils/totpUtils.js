import crypto from "node:crypto";

/**
 * Base32 (RFC4648) encode without padding.
 */
function base32Encode(buffer) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

    let bits = 0;
    let value = 0;
    let output = "";

    for (const byte of buffer) {
        value = (value & 0xff) | (byte & 0xff);
        bits += 8;

        while (bits >= 5) {
            output += alphabet[(value >> (bits - 5)) & 31];
            bits -= 5;
        }
    }

    if (bits > 0) {
        output += alphabet[(value << (5 - bits)) & 31];
    }

    return output;
}

/**
 * Decode Base32 into Buffer.
 */
function base32Decode(str) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const cleaned = String(str).replace(/=+$/g, "").toUpperCase().replace(/[^A-Z2-7]/g, "");

    let bits = 0;
    let value = 0;
    const out = [];

    for (const ch of cleaned) {
        const idx = alphabet.indexOf(ch);
        if (idx === -1) continue;

        value = (value << 5) | idx;
        bits += 5;

        if (bits >= 8) {
            out.push((value >> (bits - 8)) & 0xff);
            bits -= 8;
        }
    }

    return Buffer.from(out);
}

function leftPad(str, targetLength, padChar) {
    str = String(str);
    if (str.length >= targetLength) return str;
    return padChar.repeat(targetLength - str.length) + str;
}

/**
 * Generate a random Base32 secret suitable for TOTP.
 */
export function generateTotpSecretBase32(byteLength = 32) {
    const secret = crypto.randomBytes(byteLength);
    return base32Encode(secret);
}

function hotp(secretBytes, counter, digits = 6) {
    const counterBuf = Buffer.alloc(8);
    // Write counter as big-endian uint64
    counterBuf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
    counterBuf.writeUInt32BE(counter >>> 0, 4);

    const hmac = crypto.createHmac("sha1", secretBytes).update(counterBuf).digest();

    // Dynamic truncation
    const offset = hmac[hmac.length - 1] & 0x0f;
    const code =
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);

    const mod = 10 ** digits;
    return String(code % mod);
}

/**
 * Generate TOTP code for given time slice.
 */
export function generateTotpCode(secretBase32, timestampMs = Date.now(), {
    stepSeconds = 30,
    digits = 6,
} = {}) {
    const secretBytes = base32Decode(secretBase32);
    const counter = Math.floor(timestampMs / 1000 / stepSeconds);
    const code = hotp(secretBytes, counter, digits);
    return leftPad(code, digits, "0");
}

/**
 * Verify TOTP code with window to handle clock skew.
 */
export function verifyTotpCode(secretBase32, code, {
    stepSeconds = 30,
    digits = 6,
    window = 1, // +/- 1 time step
    timestampMs = Date.now(),
} = {}) {
    const normalizedCode = String(code).replace(/\s+/g, "");
    if (!/^\d+$/.test(normalizedCode)) return false;

    const secretBytes = base32Decode(secretBase32);
    const counter = Math.floor(timestampMs / 1000 / stepSeconds);

    for (let w = -window; w <= window; w++) {
        const c = counter + w;
        const expected = hotp(secretBytes, c, digits);
        if (leftPad(expected, digits, "0") === leftPad(normalizedCode, digits, "0")) {
            return true;
        }
    }
    return false;
}

/**
 * Build the otpauth:// URI for authenticator apps.
 */
export function buildOtpauthUrl({
    secretBase32,
    accountName,
    issuer = "Drivya",
    digits = 6,
    algorithm = "SHA1",
    period = 30,
} = {}) {
    const label = encodeURIComponent(`${issuer}:${accountName}`);
    const params = new URLSearchParams({
        secret: secretBase32,
        issuer,
        digits: String(digits),
        algorithm,
        period: String(period),
    });

    return `otpauth://totp/${label}?${params.toString()}`;
}
