import { google } from "googleapis";

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
} = process.env;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
  console.warn(
    "[Google OAuth] Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REDIRECT_URI — Google Drive import will be disabled.",
  );
}

// ─── Scopes ──────────────────────────────────────────────────
// drive.readonly  — list + download files (no write access)
// userinfo.email  — display which Google account is connected
const SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

/**
 * Create a fresh OAuth2 client (not bound to any user tokens).
 */
export function createOAuth2Client() {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
  );
}

/**
 * Generate the Google OAuth2 consent URL.
 * @param {string} state - CSRF / user-binding state token
 * @returns {string} consent URL
 */
export function getAuthUrl(state) {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",   // get refresh_token
    prompt: "consent",        // always show consent (ensures refresh_token)
    scope: SCOPES,
    state,
  });
}

/**
 * Exchange an authorization code for tokens.
 * @param {string} code
 * @returns {Promise<import("googleapis").Auth.Credentials>}
 */
export async function getTokensFromCode(code) {
  const client = createOAuth2Client();
  const { tokens } = await client.getToken(code);
  return tokens;
}

/**
 * Create a Drive v3 client authenticated with user tokens.
 * @param {import("googleapis").Auth.Credentials} tokens
 * @returns {{ drive: import("googleapis").drive_v3.Drive, oauth2Client: import("googleapis").Auth.OAuth2Client }}
 */
export function createDriveClient(tokens) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials(tokens);
  const drive = google.drive({ version: "v3", auth: oauth2Client });
  return { drive, oauth2Client };
}

/**
 * Revoke a Google OAuth2 token.
 * @param {string} token - access or refresh token
 */
export async function revokeToken(token) {
  const client = createOAuth2Client();
  await client.revokeToken(token);
}
