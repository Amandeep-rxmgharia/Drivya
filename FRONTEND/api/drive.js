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
 * Upload files to a directory via presigned URLs (two-step flow).
 * Step 1: POST /presign-upload → get presigned PUT URLs
 * Step 2: PUT each file directly to R2
 * Step 3: POST /confirm-upload → create DB records
 *
 * @param {string} directoryId
 * @param {File[]} files - browser File objects
 * @param {(progress: number) => void} [onProgress] - 0-100
 */
export const uploadFiles = async (directoryId, files, onProgress) => {
  // Step 1: Get presigned upload URLs from backend
  const fileMeta = files.map((f) => ({
    name: f.name,
    size: f.size,
    mimeType: f.type || "application/octet-stream",
  }));

  const { data: presignData } = await api.post("/api/files/presign-upload", {
    files: fileMeta,
    directoryId: directoryId || undefined,
  });

  const { uploads } = presignData;
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  let uploadedBytes = 0;

  // Step 2: Upload each file directly to R2 via presigned PUT URL
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const upload = uploads[i];

    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", upload.presignedUrl, true);
      xhr.setRequestHeader("Content-Type", upload.mimeType);

      xhr.upload.onprogress = (e) => {
        if (onProgress && e.lengthComputable) {
          const fileDone = uploadedBytes + e.loaded;
          onProgress(Math.round((fileDone * 100) / totalSize));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          uploadedBytes += file.size;
          resolve();
        } else {
          reject(new Error(`Upload failed for "${file.name}" (HTTP ${xhr.status})`));
        }
      };

      xhr.onerror = () => reject(new Error(`Network error uploading "${file.name}"`));
      xhr.send(file);
    });
  }

  // Step 3: Confirm uploads with backend (creates DB records)
  const confirmPayload = uploads.map((u, i) => ({
    storageName: u.storageName,
    originalName: u.originalName,
    size: files[i].size,
    mimeType: u.mimeType,
  }));

  const { data: confirmData } = await api.post("/api/files/confirm-upload", {
    files: confirmPayload,
    directoryId: presignData.directoryId,
  });

  return confirmData;
};

/**
 * Download a file via presigned URL.
 * Backend returns a presigned R2 download URL — we trigger
 * the browser's native download via a hidden anchor element.
 *
 * @param {string} fileId
 * @param {string} fileName
 */
export const downloadFile = async (fileId, fileName) => {
  const { data } = await api.get(`/api/files/${fileId}/download`);

  // Trigger native browser download via hidden anchor
  const a = document.createElement("a");
  a.href = data.downloadUrl;
  a.download = data.fileName || fileName;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

/**
 * Get a presigned preview URL for a file.
 * Returns a temporary R2 URL that can be used as img/video/audio/iframe src.
 * NOTE: This is now async — callers must await.
 * @param {string} fileId
 * @returns {Promise<string>}
 */
export const getFilePreviewUrl = async (fileId) => {
  const { data } = await api.get(`/api/files/${fileId}/preview`);
  return data.previewUrl;
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
