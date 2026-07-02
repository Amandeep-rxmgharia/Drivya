import api from "./auth.js";

// ─── Directory API ───────────────────────────────────────────────

/**
 * List contents of a directory (subdirs + files).
 * @param {string} [parentId] - directory ID, omit for root
 */
export const listDirectory = async (parentId) => {
  const url = parentId
    ? `/api/directories/${parentId}`
    : "/api/directories/root";
  const response = await api.get(url);
  return response.data;
};

/**
 * List all directories (for choosing targets recursively).
 */
export const listAllDirectories = async () => {
  const response = await api.get("/api/directories/all");
  return response.data;
};

/**
 * Get breadcrumb trail from root to a directory.
 * @param {string} dirId
 */
export const getBreadcrumb = async (dirId) => {
  const response = await api.get(`/api/directories/${dirId}/breadcrumb`);
  return response.data;
};

/**
 * Create a new directory.
 * @param {{ name: string, parentDirId?: string }} data
 */
export const createDirectory = async ({ name, parentDirId }) => {
  const response = await api.post("/api/directories", { name, parentDirId });
  return response.data;
};

/**
 * Rename a directory.
 * @param {string} id
 * @param {string} name
 */
export const renameDirectory = async (id, name) => {
  const response = await api.patch(`/api/directories/${id}`, { name });
  return response.data;
};

/**
 * Delete a directory and all its contents.
 * @param {string} id
 */
export const deleteDirectory = async (id) => {
  const response = await api.delete(`/api/directories/${id}`);
  return response.data;
};

// ─── File API ────────────────────────────────────────────────────

/**
 * Upload files to a directory.
 * @param {string} directoryId
 * @param {File[]} files - browser File objects
 * @param {(progress: number) => void} [onProgress] - 0-100
 */
export const uploadFiles = async (directoryId, files, onProgress) => {
  const formData = new FormData();
  formData.append("directoryId", directoryId);
  files.forEach((file) => formData.append("files", file));

  const response = await api.post("/api/files/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (event) => {
      if (onProgress && event.total) {
        onProgress(Math.round((event.loaded * 100) / event.total));
      }
    },
  });
  return response.data;
};

/**
 * Download a file via browser-native download (no memory buffering).
 *
 * The old approach used `axios.get(…, { responseType: "blob" })` which
 * buffers the entire file in JavaScript memory — this causes
 * `net::ERR_FAILED` for large video files.
 *
 * New approach (two-step, token-based):
 *  1. POST to /api/files/:id/download-token (authenticated via cookies).
 *     Returns a short-lived JWT (60s) embedding the file ID and user ID.
 *  2. Navigate a hidden iframe to /api/files/download/:token (public).
 *     The browser's download manager streams the file directly to disk.
 *
 * @param {string} fileId
 * @param {string} fileName
 */
export const downloadFile = async (fileId, fileName) => {
  // Step 1: Obtain a short-lived download token (authenticated request)
  const { data } = await api.post(`/api/files/${fileId}/download-token`);

  // Step 2: Navigate hidden iframe to the public download URL
  const downloadUrl = `${api.defaults.baseURL}/api/files/download/${data.token}`;
  let iframe = document.getElementById("__drivya_download_frame");
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "__drivya_download_frame";
    iframe.style.display = "none";
    document.body.appendChild(iframe);
  }
  iframe.src = downloadUrl;
};

/**
 * Get the preview URL for a file (for use in img/video/audio/iframe src).
 * Returns the full URL string — no fetch needed.
 * @param {string} fileId
 * @returns {string}
 */
export const getFilePreviewUrl = (fileId) => {
  return `${api.defaults.baseURL}/api/files/${fileId}/preview`;
};

/**
 * Rename a file.
 * @param {string} fileId
 * @param {string} name
 */
export const renameFile = async (fileId, name) => {
  const response = await api.patch(`/api/files/${fileId}/rename`, { name });
  return response.data;
};

/**
 * Move a file to trash (soft delete).
 * @param {string} fileId
 */
export const trashFile = async (fileId) => {
  const response = await api.patch(`/api/files/${fileId}/trash`);
  return response.data;
};

/**
 * Restore a file from trash.
 * @param {string} fileId
 */
export const restoreFile = async (fileId) => {
  const response = await api.patch(`/api/files/${fileId}/restore`);
  return response.data;
};

/**
 * Restore all files from trash.
 */
export const restoreAllFiles = async () => {
  const response = await api.patch("/api/files/trash/restore");
  return response.data;
};

/**
 * List all trashed files.
 */
export const listTrash = async () => {
  const response = await api.get("/api/files/trash");
  return response.data;
};

/**
 * Empty the trash (permanent delete all).
 */
export const emptyTrash = async () => {
  const response = await api.delete("/api/files/trash/empty");
  return response.data;
};

/**
 * Permanently delete a single trashed file.
 * @param {string} fileId
 */
export const permanentDeleteFile = async (fileId) => {
  const response = await api.delete(`/api/files/${fileId}`);
  return response.data;
};
