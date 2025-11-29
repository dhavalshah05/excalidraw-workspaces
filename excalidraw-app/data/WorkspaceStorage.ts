/**
 * This file manages workspace storage using IndexedDB.
 * It allows users to save, load, and manage multiple Excalidraw scenes/workspaces.
 */

import { createStore, del, entries, get, set } from "idb-keyval";

import { getNonDeletedElements } from "@excalidraw/element";
import { clearAppStateForLocalStorage } from "@excalidraw/excalidraw/appState";
import { exportToCanvas } from "@excalidraw/utils";

import { STORAGE_KEYS } from "../app_constants";

import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";

const THUMBNAIL_MAX_SIZE = 200; // Max width/height for thumbnail

export interface SavedWorkspace {
  id: string;
  name: string;
  elements: readonly ExcalidrawElement[];
  appState: Partial<AppState>;
  files: BinaryFiles;
  createdAt: number;
  updatedAt: number;
  thumbnail?: string; // Base64 encoded thumbnail for preview
}

export interface WorkspaceMetadata {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  elementCount: number;
  thumbnail?: string; // Base64 encoded thumbnail
}

const workspacesStore = createStore(
  "excalidraw-workspaces-db",
  "workspaces-store",
);

/**
 * Generate a unique ID for a workspace
 */
const generateId = (): string => {
  return `ws_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

/**
 * Save a workspace to IndexedDB
 */
export const saveWorkspace = async (
  name: string,
  elements: readonly ExcalidrawElement[],
  appState: AppState,
  files: BinaryFiles,
  existingId?: string,
  thumbnail?: string,
): Promise<SavedWorkspace> => {
  const id = existingId || generateId();
  const now = Date.now();

  // Get existing workspace to preserve createdAt if updating
  let createdAt = now;
  let existingThumbnail: string | undefined;
  if (existingId) {
    const existing = await get<SavedWorkspace>(existingId, workspacesStore);
    if (existing) {
      createdAt = existing.createdAt;
      existingThumbnail = existing.thumbnail;
    }
  }

  const nonDeletedElements = getNonDeletedElements(elements);
  const cleanedAppState = clearAppStateForLocalStorage(appState);

  const workspace: SavedWorkspace = {
    id,
    name,
    elements: nonDeletedElements,
    appState: cleanedAppState,
    files,
    createdAt,
    updatedAt: now,
    thumbnail: thumbnail || existingThumbnail,
  };

  await set(id, workspace, workspacesStore);

  return workspace;
};

/**
 * Load a workspace from IndexedDB
 */
export const loadWorkspace = async (
  id: string,
): Promise<SavedWorkspace | null> => {
  const workspace = await get<SavedWorkspace>(id, workspacesStore);
  return workspace || null;
};

/**
 * Delete a workspace from IndexedDB
 * Also clears the current workspace ID if we're deleting the current workspace
 */
export const deleteWorkspace = async (id: string): Promise<void> => {
  // If we're deleting the currently loaded workspace, clear the stored ID
  const currentId = getCurrentWorkspaceId();
  if (currentId === id) {
    clearCurrentWorkspaceId();
  }

  await del(id, workspacesStore);
};

/**
 * Get all workspaces metadata (for listing in the UI)
 */
export const getAllWorkspacesMetadata = async (): Promise<
  WorkspaceMetadata[]
> => {
  const allEntries = await entries<string, SavedWorkspace>(workspacesStore);

  return allEntries
    .map(([_, workspace]) => ({
      id: workspace.id,
      name: workspace.name,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
      elementCount: workspace.elements.length,
      thumbnail: workspace.thumbnail,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt); // Most recently updated first
};

/**
 * Get all workspaces (full data)
 */
export const getAllWorkspaces = async (): Promise<SavedWorkspace[]> => {
  const allEntries = await entries<string, SavedWorkspace>(workspacesStore);

  return allEntries
    .map(([_, workspace]) => workspace)
    .sort((a, b) => b.updatedAt - a.updatedAt);
};

/**
 * Check if a workspace with the given name already exists
 */
export const workspaceNameExists = async (
  name: string,
  excludeId?: string,
): Promise<boolean> => {
  const allWorkspaces = await getAllWorkspacesMetadata();
  return allWorkspaces.some(
    (ws) => ws.name === name && ws.id !== excludeId,
  );
};

/**
 * Rename a workspace
 */
export const renameWorkspace = async (
  id: string,
  newName: string,
): Promise<void> => {
  const workspace = await get<SavedWorkspace>(id, workspacesStore);
  if (workspace) {
    workspace.name = newName;
    workspace.updatedAt = Date.now();
    await set(id, workspace, workspacesStore);
  }
};

/**
 * Generate a thumbnail from canvas elements
 */
export const generateThumbnail = async (
  elements: readonly ExcalidrawElement[],
  appState: Partial<AppState>,
  files: BinaryFiles,
): Promise<string | undefined> => {
  const nonDeletedElements = getNonDeletedElements(elements);

  if (nonDeletedElements.length === 0) {
    return undefined;
  }

  try {
    const canvas = await exportToCanvas({
      elements: nonDeletedElements,
      appState: {
        ...appState,
        exportBackground: true,
        viewBackgroundColor: appState.viewBackgroundColor || "#ffffff",
      },
      files,
      maxWidthOrHeight: THUMBNAIL_MAX_SIZE,
      exportPadding: 10,
    });

    // Convert canvas to base64 data URL
    return canvas.toDataURL("image/png", 0.7);
  } catch (error) {
    console.error("Failed to generate thumbnail:", error);
    return undefined;
  }
};

// ============================================================================
// Current Workspace Persistence (localStorage)
// ============================================================================

/**
 * Save the current workspace ID to localStorage
 */
export const setCurrentWorkspaceId = (workspaceId: string | null): void => {
  if (workspaceId) {
    localStorage.setItem(
      STORAGE_KEYS.LOCAL_STORAGE_CURRENT_WORKSPACE_ID,
      workspaceId,
    );
  } else {
    localStorage.removeItem(STORAGE_KEYS.LOCAL_STORAGE_CURRENT_WORKSPACE_ID);
  }
};

/**
 * Get the current workspace ID from localStorage
 */
export const getCurrentWorkspaceId = (): string | null => {
  return localStorage.getItem(STORAGE_KEYS.LOCAL_STORAGE_CURRENT_WORKSPACE_ID);
};

/**
 * Clear the current workspace ID from localStorage
 */
export const clearCurrentWorkspaceId = (): void => {
  localStorage.removeItem(STORAGE_KEYS.LOCAL_STORAGE_CURRENT_WORKSPACE_ID);
};

/**
 * Restore the current workspace from localStorage.
 * Returns the workspace if found, null if not found or if storage is empty.
 * Also clears the stored ID if the workspace no longer exists (edge case handling).
 */
export const restoreCurrentWorkspace =
  async (): Promise<SavedWorkspace | null> => {
    const storedId = getCurrentWorkspaceId();

    if (!storedId) {
      return null;
    }

    // Try to load the workspace
    const workspace = await loadWorkspace(storedId);

    if (!workspace) {
      // Workspace was deleted or doesn't exist anymore - clear the stored ID
      clearCurrentWorkspaceId();
      return null;
    }

    return workspace;
  };

// ============================================================================
// Persistent Storage (Prevents Browser Auto-Eviction)
// ============================================================================

/**
 * Request persistent storage to prevent browser from auto-deleting IndexedDB data.
 * Returns true if granted, false if denied or not supported.
 */
export const requestPersistentStorage = async (): Promise<boolean> => {
  if (navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persist();
      if (isPersisted) {
        console.log("Persistent storage granted - data will not be auto-evicted");
      } else {
        console.log("Persistent storage denied - data may be evicted under storage pressure");
      }
      return isPersisted;
    } catch (error) {
      console.error("Failed to request persistent storage:", error);
      return false;
    }
  }
  console.log("Persistent storage API not supported");
  return false;
};

/**
 * Check if persistent storage is already granted
 */
export const isPersistentStorageGranted = async (): Promise<boolean> => {
  if (navigator.storage && navigator.storage.persisted) {
    try {
      return await navigator.storage.persisted();
    } catch (error) {
      return false;
    }
  }
  return false;
};

// ============================================================================
// Export/Import Workspaces
// ============================================================================

export interface WorkspaceExportData {
  version: number;
  exportedAt: number;
  workspaces: SavedWorkspace[];
}

const EXPORT_VERSION = 1;

/**
 * Export all workspaces to a JSON file
 */
export const exportAllWorkspaces = async (): Promise<void> => {
  const workspaces = await getAllWorkspaces();

  if (workspaces.length === 0) {
    throw new Error("No workspaces to export");
  }

  const exportData: WorkspaceExportData = {
    version: EXPORT_VERSION,
    exportedAt: Date.now(),
    workspaces,
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `excalidraw-workspaces-${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: number;
  skippedNames: string[];
}

/**
 * Import workspaces from a JSON file
 * @param file - The file to import
 * @param overwriteExisting - If true, overwrite workspaces with same name. If false, skip them.
 */
export const importWorkspaces = async (
  file: File,
  overwriteExisting: boolean = false,
): Promise<ImportResult> => {
  const result: ImportResult = {
    imported: 0,
    skipped: 0,
    errors: 0,
    skippedNames: [],
  };

  try {
    const text = await file.text();
    const data = JSON.parse(text) as WorkspaceExportData;

    // Validate export format
    if (!data.version || !data.workspaces || !Array.isArray(data.workspaces)) {
      throw new Error("Invalid workspace export file format");
    }

    // Get existing workspaces to check for duplicates
    const existingWorkspaces = await getAllWorkspacesMetadata();
    const existingNames = new Map(
      existingWorkspaces.map((ws) => [ws.name.toLowerCase(), ws.id]),
    );

    for (const workspace of data.workspaces) {
      try {
        const existingId = existingNames.get(workspace.name.toLowerCase());

        if (existingId && !overwriteExisting) {
          // Skip duplicate
          result.skipped++;
          result.skippedNames.push(workspace.name);
          continue;
        }

        // Generate new ID for imported workspace (unless overwriting)
        const newId = existingId && overwriteExisting ? existingId : generateId();

        const importedWorkspace: SavedWorkspace = {
          ...workspace,
          id: newId,
          // Preserve original timestamps but update if overwriting
          updatedAt: overwriteExisting && existingId ? Date.now() : workspace.updatedAt,
        };

        await set(newId, importedWorkspace, workspacesStore);
        result.imported++;
      } catch (error) {
        console.error(`Failed to import workspace "${workspace.name}":`, error);
        result.errors++;
      }
    }

    return result;
  } catch (error) {
    console.error("Failed to parse import file:", error);
    throw new Error("Failed to parse import file. Please ensure it's a valid workspace export.");
  }
};

/**
 * Get storage usage information
 */
export const getStorageInfo = async (): Promise<{
  used: number;
  quota: number;
  percentage: number;
} | null> => {
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const percentage = quota > 0 ? (used / quota) * 100 : 0;
      return { used, quota, percentage };
    } catch (error) {
      return null;
    }
  }
  return null;
};
