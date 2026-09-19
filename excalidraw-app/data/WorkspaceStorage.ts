/**
 * This file manages workspace storage in Supabase.
 * It allows users to save, load, and manage multiple Excalidraw scenes/workspaces.
 * The user must be logged in; every row belongs to one user (enforced by RLS).
 */

import { getNonDeletedElements } from "@excalidraw/element";
import { clearAppStateForLocalStorage } from "@excalidraw/excalidraw/appState";
import { exportToCanvas } from "@excalidraw/utils";

import type { ExcalidrawElement } from "@excalidraw/element/types";

import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";

import { STORAGE_KEYS } from "../app_constants";

import { getCurrentUser } from "./auth";
import { getSupabase } from "./supabase";

const THUMBNAIL_MAX_SIZE = 200; // Max width/height for thumbnail
const TABLE = "workspaces";

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

// ============================================================================
// Database row shape and mappers
// ============================================================================

interface WorkspaceData {
  elements: readonly ExcalidrawElement[];
  appState: Partial<AppState>;
  files: BinaryFiles;
}

interface WorkspaceRow {
  id: string;
  user_id: string;
  name: string;
  data: WorkspaceData;
  thumbnail: string | null;
  element_count: number;
  created_at: number;
  updated_at: number;
}

type WorkspaceMetadataRow = Omit<WorkspaceRow, "data" | "user_id">;

const rowToWorkspace = (row: WorkspaceRow): SavedWorkspace => ({
  id: row.id,
  name: row.name,
  elements: row.data.elements,
  appState: row.data.appState,
  files: row.data.files,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  thumbnail: row.thumbnail ?? undefined,
});

const rowToMetadata = (row: WorkspaceMetadataRow): WorkspaceMetadata => ({
  id: row.id,
  name: row.name,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  elementCount: row.element_count,
  thumbnail: row.thumbnail ?? undefined,
});

const workspaceToRow = (
  workspace: SavedWorkspace,
  userId: string,
): WorkspaceRow => ({
  id: workspace.id,
  user_id: userId,
  name: workspace.name,
  data: {
    elements: workspace.elements,
    appState: workspace.appState,
    files: workspace.files,
  },
  thumbnail: workspace.thumbnail ?? null,
  element_count: workspace.elements.length,
  created_at: workspace.createdAt,
  updated_at: workspace.updatedAt,
});

const METADATA_COLUMNS =
  "id, name, thumbnail, element_count, created_at, updated_at";

/**
 * Generate a unique ID for a workspace
 */
const generateId = (): string => {
  return `ws_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

const requireUserId = async (): Promise<string> => {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("You must be logged in to use workspaces");
  }
  return user.id;
};

/**
 * Write a full workspace row (insert or update).
 */
const upsertWorkspace = async (workspace: SavedWorkspace): Promise<void> => {
  const userId = await requireUserId();
  const { error } = await getSupabase()
    .from(TABLE)
    .upsert(workspaceToRow(workspace, userId));
  if (error) {
    throw error;
  }
};

// ============================================================================
// Public API
// ============================================================================

/**
 * Save a workspace to Supabase
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
    const existing = await loadWorkspace(existingId);
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

  await upsertWorkspace(workspace);

  return workspace;
};

/**
 * Load a workspace from Supabase
 */
export const loadWorkspace = async (
  id: string,
): Promise<SavedWorkspace | null> => {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle<WorkspaceRow>();
  if (error) {
    throw error;
  }
  return data ? rowToWorkspace(data) : null;
};

/**
 * Delete a workspace from Supabase
 * Also clears the current workspace ID if we're deleting the current workspace
 */
export const deleteWorkspace = async (id: string): Promise<void> => {
  // If we're deleting the currently loaded workspace, clear the stored ID
  const currentId = getCurrentWorkspaceId();
  if (currentId === id) {
    clearCurrentWorkspaceId();
  }

  const { error } = await getSupabase().from(TABLE).delete().eq("id", id);
  if (error) {
    throw error;
  }
};

/**
 * Get all workspaces metadata (for listing in the UI).
 * Does not download the drawing data, so the list stays fast.
 */
export const getAllWorkspacesMetadata = async (): Promise<
  WorkspaceMetadata[]
> => {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select(METADATA_COLUMNS)
    .order("updated_at", { ascending: false })
    .returns<WorkspaceMetadataRow[]>();
  if (error) {
    throw error;
  }
  return (data ?? []).map(rowToMetadata);
};

/**
 * Get all workspaces (full data)
 */
export const getAllWorkspaces = async (): Promise<SavedWorkspace[]> => {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select("*")
    .order("updated_at", { ascending: false })
    .returns<WorkspaceRow[]>();
  if (error) {
    throw error;
  }
  return (data ?? []).map(rowToWorkspace);
};

/**
 * Check if a workspace with the given name already exists
 */
export const workspaceNameExists = async (
  name: string,
  excludeId?: string,
): Promise<boolean> => {
  let query = getSupabase().from(TABLE).select("id").eq("name", name);
  if (excludeId) {
    query = query.neq("id", excludeId);
  }
  const { data, error } = await query.limit(1);
  if (error) {
    throw error;
  }
  return (data ?? []).length > 0;
};

/**
 * Rename a workspace
 */
export const renameWorkspace = async (
  id: string,
  newName: string,
): Promise<void> => {
  const { error } = await getSupabase()
    .from(TABLE)
    .update({ name: newName, updated_at: Date.now() })
    .eq("id", id);
  if (error) {
    throw error;
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
// Which workspace was open last is a per-device preference, so it stays local.
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
 * @param filename - Optional custom filename (without extension)
 */
export const exportAllWorkspaces = async (filename?: string): Promise<void> => {
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

  // Use provided filename or default
  const defaultFilename = `excalidraw-workspaces-${
    new Date().toISOString().split("T")[0]
  }`;
  const finalFilename = filename?.trim() || defaultFilename;

  const a = document.createElement("a");
  a.href = url;
  a.download = `${finalFilename}.json`;
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
        const newId =
          existingId && overwriteExisting ? existingId : generateId();

        const importedWorkspace: SavedWorkspace = {
          ...workspace,
          id: newId,
          // Preserve original timestamps but update if overwriting
          updatedAt:
            overwriteExisting && existingId ? Date.now() : workspace.updatedAt,
        };

        await upsertWorkspace(importedWorkspace);
        result.imported++;
      } catch (error) {
        console.error(`Failed to import workspace "${workspace.name}":`, error);
        result.errors++;
      }
    }

    return result;
  } catch (error) {
    console.error("Failed to parse import file:", error);
    throw new Error(
      "Failed to parse import file. Please ensure it's a valid workspace export.",
    );
  }
};
