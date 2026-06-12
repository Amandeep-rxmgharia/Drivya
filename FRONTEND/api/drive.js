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
 * Download a file (returns blob URL).
 * @param {string} fileId
 * @param {string} fileName
 */
export const downloadFile = async (fileId, fileName) => {
  const response = await api.get(`/api/files/${fileId}/download`, {
    responseType: "blob",
  });
  // Create and trigger a download link
  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
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
