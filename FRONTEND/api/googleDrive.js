import api from "./auth.js";

const API_BASE = "http://localhost:3000";

/**
 * Get the Google OAuth consent URL.
 * @returns {Promise<{ url: string }>}
 */
export const getGoogleAuthUrl = async () => {
  const response = await api.get("/api/google/auth-url");
  return response.data;
};

/**
 * Check if the user has connected Google Drive.
 * @returns {Promise<{ connected: boolean, email: string }>}
 */
export const getGoogleStatus = async () => {
  const response = await api.get("/api/google/status");
  return response.data;
};

/**
 * Disconnect Google Drive.
 * @returns {Promise<{ message: string }>}
 */
export const disconnectGoogle = async () => {
  const response = await api.post("/api/google/disconnect");
  return response.data;
};

/**
 * List files in the user's Google Drive.
 * @param {{ pageToken?: string, query?: string, folderId?: string }} params
 * @returns {Promise<{ files: object[], nextPageToken?: string }>}
 */
export const listGoogleFiles = async ({ pageToken, query, folderId } = {}) => {
  const params = {};
  if (pageToken) params.pageToken = pageToken;
  if (query) params.query = query;
  if (folderId) params.folderId = folderId;

  const response = await api.get("/api/google/files", { params });
  return response.data;
};

/**
 * Import files from Google Drive with real-time SSE progress.
 *
 * @param {string[]} fileIds - Google Drive file IDs to import
 * @param {string} directoryId - Target Drivya directory
 * @param {{ onStart?: Function, onProgress?: Function, onDone?: Function, onError?: Function }} callbacks
 * @returns {Promise<void>}
 */
export const importGoogleFiles = (fileIds, directoryId, callbacks = {}) => {
  return new Promise((resolve, reject) => {
    // Use fetch for SSE since we need POST with a body
    fetch(`${API_BASE}/api/google/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ fileIds, directoryId }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          throw new Error(errBody.message || `Import failed (${response.status})`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events from buffer
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          let currentEvent = null;

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith("data: ") && currentEvent) {
              try {
                const data = JSON.parse(line.slice(6));

                switch (currentEvent) {
                  case "start":
                    callbacks.onStart?.(data);
                    break;
                  case "progress":
                    callbacks.onProgress?.(data);
                    break;
                  case "done":
                    callbacks.onDone?.(data);
                    break;
                  case "error":
                    callbacks.onError?.(data);
                    break;
                }
              } catch (parseErr) {
                console.warn("[SSE] Parse error:", parseErr);
              }
              currentEvent = null;
            } else if (line === "") {
              currentEvent = null;
            }
          }
        }

        resolve();
      })
      .catch((err) => {
        callbacks.onError?.({ error: err.message });
        reject(err);
      });
  });
};
