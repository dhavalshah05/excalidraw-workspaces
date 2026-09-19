/**
 * Jotai atoms for workspace management
 */

import { atom } from "excalidraw-app/app-jotai";

import type { AuthUser } from "../data/auth";
import type { WorkspaceMetadata } from "../data/WorkspaceStorage";

// Logged-in user (null means logged out)
export const currentUserAtom = atom<AuthUser | null>(null);

// True until the first login check finishes on app start
export const authLoadingAtom = atom<boolean>(true);

// Whether the login dialog is open
export const loginDialogOpenAtom = atom<boolean>(false);

// Current active workspace ID (null means unsaved/new workspace)
export const currentWorkspaceIdAtom = atom<string | null>(null);

// Current workspace name
export const currentWorkspaceNameAtom = atom<string>("");

// Whether the workspace manager dialog is open
export const workspaceManagerOpenAtom = atom<boolean>(false);

// Whether the save workspace dialog is open
export const saveWorkspaceDialogOpenAtom = atom<boolean>(false);

// List of all workspaces (cached)
export const workspacesListAtom = atom<WorkspaceMetadata[]>([]);

// Whether workspaces are being loaded
export const workspacesLoadingAtom = atom<boolean>(false);
