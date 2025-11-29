/**
 * This file manages workspace storage using IndexedDB.
 * It allows users to save, load, and manage multiple Excalidraw scenes/workspaces.
 */

import { createStore, del, entries, get, set } from "idb-keyval";

import { getNonDeletedElements } from "@excalidraw/element";
import { clearAppStateForLocalStorage } from "@excalidraw/excalidraw/appState";
import { exportToCanvas } from "@excalidraw/utils";

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
 */
export const deleteWorkspace = async (id: string): Promise<void> => {
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
