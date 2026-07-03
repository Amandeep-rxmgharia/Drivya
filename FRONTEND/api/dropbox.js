import api from "./auth.js";

const API_BASE = "http://localhost:3000";

/**
 * Get the Dropbox OAuth consent URL.
 * @returns {Promise<{ url: string }>}
 */
export const getDropboxAuthUrl = async () => {
  const response = await api.get("/api/dropbox/auth-url");
  return response.data;
};

/**
 * Check if the user has connected Dropbox.
 * @returns {Promise<{ connected: boolean, email: string }>}
 */
export const getDropboxStatus = async () => {
  const response = await api.get("/api/dropbox/status");
  return response.data;
};

/**
 * Disconnect Dropbox.
 * @returns {Promise<{ message: string }>}
 */
export const disconnectDropbox = async () => {
  const response = await api.post("/api/dropbox/disconnect");
  return response.data;
};

/**
 * List files in the user's Dropbox.
 * @param {{ path?: string, cursor?: string, query?: string }} params
 * @returns {Promise<{ files: object[], cursor?: string, hasMore: boolean }>}
 */
export const listDropboxFiles = async ({ path: folderPath, cursor, query } = {}) => {
  const params = {};
  if (folderPath) params.path = folderPath;
  if (cursor) params.cursor = cursor;
  if (query) params.query = query;

  const response = await api.get("/api/dropbox/files", { params });
  return response.data;
};

/**
 * Explicitly cancel active Dropbox import.
 * @returns {Promise<{ message: string }>}
 */
export const cancelDropboxImport = async () => {
  const response = await api.post("/api/dropbox/import/cancel");
  return response.data;
};

/**
 * Import files from Dropbox with real-time SSE progress.
 * Supports cancellation via signal.
 *
 * @param {string[]} filePaths - Dropbox file paths to import
 * @param {string} directoryId - Target Drivya directory
 * @param {{ onStart?: Function, onProgress?: Function, onDone?: Function, onCancelled?: Function, onError?: Function }} callbacks
 * @param {AbortSignal} [signal] - AbortSignal to cancel the SSE request
 * @returns {Promise<void>}
 */
export const importDropboxFiles = (filePaths, directoryId, callbacks = {}, signal = null) => {
  return new Promise((resolve, reject) => {
    fetch(`${API_BASE}/api/dropbox/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ filePaths, directoryId }),
      signal: signal || undefined,
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
                  case "cancelled":
                    callbacks.onCancelled?.(data);
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
        if (err.name === "AbortError") {
          // Handled via onCancelled callback or general UI state reset
          callbacks.onCancelled?.({ message: "Import cancelled by user" });
          resolve();
        } else {
          callbacks.onError?.({ error: err.message });
          reject(err);
        }
      });
  });
};
