/**
 * Dialog for saving a workspace with a name
 */

import React, { useState, useEffect, useCallback } from "react";
import { useAtom } from "excalidraw-app/app-jotai";

import { Dialog } from "@excalidraw/excalidraw/components/Dialog";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import { saveWorkspace, workspaceNameExists } from "../data/WorkspaceStorage";
import {
  saveWorkspaceDialogOpenAtom,
  currentWorkspaceIdAtom,
  currentWorkspaceNameAtom,
} from "./workspaceState";

import "./SaveWorkspaceDialog.scss";

interface SaveWorkspaceDialogProps {
  excalidrawAPI: ExcalidrawImperativeAPI;
  onSaveSuccess?: (workspaceId: string, name: string) => void;
}

export const SaveWorkspaceDialog: React.FC<SaveWorkspaceDialogProps> = ({
  excalidrawAPI,
  onSaveSuccess,
}) => {
  const [isOpen, setIsOpen] = useAtom(saveWorkspaceDialogOpenAtom);
  const [currentId, setCurrentId] = useAtom(currentWorkspaceIdAtom);
  const [currentName, setCurrentName] = useAtom(currentWorkspaceNameAtom);

  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(currentName || "");
      setError("");
    }
  }, [isOpen, currentName]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setError("");
  }, [setIsOpen]);

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Please enter a workspace name");
      return;
    }

    // Check for duplicate names (excluding current workspace if updating)
    const exists = await workspaceNameExists(
      trimmedName,
      currentId || undefined,
    );
    if (exists) {
      setError("A workspace with this name already exists");
      return;
    }

    setIsSaving(true);
    try {
      // Get fresh data from the API at save time
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();
      const files = excalidrawAPI.getFiles();

      const workspace = await saveWorkspace(
        trimmedName,
        elements,
        appState,
        files,
        currentId || undefined,
      );

      setCurrentId(workspace.id);
      setCurrentName(workspace.name);
      setIsOpen(false);

      if (onSaveSuccess) {
        onSaveSuccess(workspace.id, workspace.name);
      }
    } catch (err) {
      console.error("Failed to save workspace:", err);
      setError("Failed to save workspace. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [
    name,
    currentId,
    excalidrawAPI,
    setCurrentId,
    setCurrentName,
    setIsOpen,
    onSaveSuccess,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !isSaving) {
        handleSave();
      }
    },
    [isSaving, handleSave],
  );

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog size="small" onCloseRequest={handleClose} title="Save Workspace">
      <div className="SaveWorkspaceDialog">
        <div className="SaveWorkspaceDialog__field">
          <label htmlFor="workspace-name">Workspace Name</label>
          <input
            id="workspace-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            onKeyDown={handleKeyDown}
            placeholder="My Workspace"
            autoFocus
            disabled={isSaving}
          />
          {error && <div className="SaveWorkspaceDialog__error">{error}</div>}
        </div>
        <div className="SaveWorkspaceDialog__actions">
          <button
            type="button"
            className="SaveWorkspaceDialog__button SaveWorkspaceDialog__button--cancel"
            onClick={handleClose}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="SaveWorkspaceDialog__button SaveWorkspaceDialog__button--save"
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
          >
            {isSaving ? "Saving..." : currentId ? "Update" : "Save"}
          </button>
        </div>
      </div>
    </Dialog>
  );
};
