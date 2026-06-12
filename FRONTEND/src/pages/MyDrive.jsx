import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  listDirectory,
  getBreadcrumb,
  downloadFile,
  trashFile,
  deleteDirectory as deleteDirApi,
  renameDirectory as renameDirApi,
  renameFile as renameFileApi,
} from "../../api/drive.js";
import { FilesLayout } from "../components/dashboard/FilesLayout.jsx";

export default function MyDrive() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentDirId = searchParams.get("dir") || null; // null = root

  const [directories, setDirectories] = useState([]);
  const [files, setFiles] = useState([]);
  const [currentDir, setCurrentDir] = useState(null);
  const [breadcrumb, setBreadcrumb] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch directory contents
  const fetchContents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listDirectory(currentDirId);
      setCurrentDir(data.currentDir);
      setDirectories(data.directories || []);
      setFiles(data.files || []);

      // Fetch breadcrumb if we're inside a directory
      if (data.currentDir?._id) {
        const bcData = await getBreadcrumb(data.currentDir._id);
        setBreadcrumb(bcData.breadcrumb || []);
      }
    } catch (err) {
      console.error("Failed to load directory:", err);
      setError(
        err.response?.data?.message || "Failed to load directory contents.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentDirId]);

  useEffect(() => {
    fetchContents();
  }, [fetchContents]);

  // Listen for refresh events (from FAB after upload/create folder)
  useEffect(() => {
    const handleRefresh = () => fetchContents();
    window.addEventListener("refresh-drive", handleRefresh);
    return () => window.removeEventListener("refresh-drive", handleRefresh);
  }, [fetchContents]);

  // Navigate into a folder
  const handleNavigate = useCallback(
    (dirId) => {
      setSearchParams({ dir: dirId });
    },
    [setSearchParams],
  );

  // Navigate via breadcrumb
  const handleBreadcrumbNav = useCallback(
    (dirId, isRoot) => {
      if (isRoot) {
        setSearchParams({});
      } else {
        setSearchParams({ dir: dirId });
      }
    },
    [setSearchParams],
  );

  // Download a file
  const handleDownload = useCallback(async (fileId, fileName) => {
    try {
      await downloadFile(fileId, fileName);
    } catch (err) {
      console.error("Download failed:", err);
    }
  }, []);

  // Trash a file
  const handleTrashFile = useCallback(
    async (fileId) => {
      try {
        await trashFile(fileId);
        await fetchContents(); // refresh
      } catch (err) {
        console.error("Trash failed:", err);
      }
    },
    [fetchContents],
  );

  // Delete a directory
  const handleDeleteDir = useCallback(
    async (dirId) => {
      try {
        await deleteDirApi(dirId);
        await fetchContents();
      } catch (err) {
        console.error("Delete directory failed:", err);
      }
    },
    [fetchContents],
  );

  // Rename a directory
  const handleRenameDir = useCallback(
    async (dirId, newName) => {
      try {
        await renameDirApi(dirId, newName);
        await fetchContents();
      } catch (err) {
        console.error("Rename failed:", err);
      }
    },
    [fetchContents],
  );

  // Rename a file
  const handleRenameFile = useCallback(
    async (fileId, newName) => {
      try {
        await renameFileApi(fileId, newName);
        await fetchContents();
      } catch (err) {
        console.error("Rename file failed:", err);
        throw err; // re-throw so the UI can show the error
      }
    },
    [fetchContents],
  );

  return (
    <FilesLayout
      layoutHeader={
        !currentDir || currentDir.parentDirId === null
          ? "My Drive"
          : currentDir.name
      }
      directories={directories}
      files={files}
      breadcrumb={breadcrumb}
      currentDir={currentDir}
      isLoading={isLoading}
      error={error}
      currentDirId={currentDirId || currentDir?._id}
      onNavigate={handleNavigate}
      onBreadcrumbNav={handleBreadcrumbNav}
      onRefresh={fetchContents}
      onDownload={handleDownload}
      onTrashFile={handleTrashFile}
      onDeleteDir={handleDeleteDir}
      onRenameDir={handleRenameDir}
      onRenameFile={handleRenameFile}
    />
  );
}
