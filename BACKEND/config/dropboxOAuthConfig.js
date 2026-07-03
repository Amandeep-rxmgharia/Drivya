const {
  DROPBOX_CLIENT_ID,
  DROPBOX_CLIENT_SECRET,
  DROPBOX_REDIRECT_URI,
} = process.env;

if (!DROPBOX_CLIENT_ID || !DROPBOX_CLIENT_SECRET || !DROPBOX_REDIRECT_URI) {
  console.warn(
    "[Dropbox OAuth] Missing DROPBOX_CLIENT_ID, DROPBOX_CLIENT_SECRET, or DROPBOX_REDIRECT_URI — Dropbox import will be disabled.",
  );
}

// ─── Scopes ──────────────────────────────────────────────────
// files.metadata.read — list files + folders
// files.content.read  — download file content
// account_info.read   — display which Dropbox account is connected
const SCOPES = [
  "files.metadata.read",
  "files.content.read",
  "account_info.read",
];

/**
 * Generate the Dropbox OAuth2 authorization URL.
 * Uses short-lived tokens with offline access (refresh_token).
 *
 * @param {string} state - CSRF / user-binding state token
 * @returns {string} Dropbox consent URL
 */
export function getDropboxAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: DROPBOX_CLIENT_ID,
    response_type: "code",
    redirect_uri: DROPBOX_REDIRECT_URI,
    state,
    token_access_type: "offline", // gives us a refresh_token
    scope: SCOPES.join(" "),
  });

  return `https://www.dropbox.com/oauth2/authorize?${params.toString()}`;
}

/**
 * Exchange an authorization code for Dropbox tokens.
 * Returns { access_token, refresh_token, expires_in, ... }
 *
 * @param {string} code
 * @returns {Promise<object>}
 */
export async function getTokensFromCode(code) {
  const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      client_id: DROPBOX_CLIENT_ID,
      client_secret: DROPBOX_CLIENT_SECRET,
      redirect_uri: DROPBOX_REDIRECT_URI,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Dropbox token exchange failed: ${res.status} ${errBody}`);
  }

  return res.json();
}

/**
 * Refresh a short-lived Dropbox access token using the refresh token.
 *
 * @param {string} refreshToken
 * @returns {Promise<{ access_token: string, expires_in: number }>}
 */
export async function refreshAccessToken(refreshToken) {
  const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: DROPBOX_CLIENT_ID,
      client_secret: DROPBOX_CLIENT_SECRET,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Dropbox token refresh failed: ${res.status} ${errBody}`);
  }

  return res.json();
}

/**
 * Revoke a Dropbox access token.
 *
 * @param {string} accessToken
 */
export async function revokeToken(accessToken) {
  await fetch("https://api.dropboxapi.com/2/auth/token/revoke", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

/**
 * Get the current Dropbox user account info (email, name).
 *
 * @param {string} accessToken
 * @returns {Promise<{ email: string, name: string }>}
 */
export async function getAccountInfo(accessToken) {
  const res = await fetch(
    "https://api.dropboxapi.com/2/users/get_current_account",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: "null",
    },
  );

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Dropbox account info failed: ${res.status} ${errBody}`);
  }

  const data = await res.json();
  return {
    email: data.email || "",
    name: data.name?.display_name || "",
  };
}
