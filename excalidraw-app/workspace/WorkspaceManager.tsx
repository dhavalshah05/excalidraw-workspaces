/**
 * Workspace Manager - Shows saved workspaces and allows loading/deleting them
 */

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useAtom, useSetAtom } from "excalidraw-app/app-jotai";

import { Dialog } from "@excalidraw/excalidraw/components/Dialog";

import type { SavedWorkspace } from "../data/WorkspaceStorage";

import {
  getAllWorkspacesMetadata,
  loadWorkspace,
  deleteWorkspace,
  exportAllWorkspaces,
  importWorkspaces,
} from "../data/WorkspaceStorage";
import {
  workspaceManagerOpenAtom,
  workspacesListAtom,
  workspacesLoadingAtom,
  currentWorkspaceIdAtom,
  currentWorkspaceNameAtom,
} from "./workspaceState";

import "./WorkspaceManager.scss";

interface WorkspaceManagerProps {
  onLoadWorkspace: (workspace: SavedWorkspace) => void;
  onNewWorkspace: () => void;
}

export const WorkspaceManager: React.FC<WorkspaceManagerProps> = ({
  onLoadWorkspace,
  onNewWorkspace,
}) => {
  const [isOpen, setIsOpen] = useAtom(workspaceManagerOpenAtom);
  const [workspaces, setWorkspaces] = useAtom(workspacesListAtom);
  const [isLoading, setIsLoading] = useAtom(workspacesLoadingAtom);
  const [currentId, setCurrentId] = useAtom(currentWorkspaceIdAtom);
  const setCurrentName = useSetAtom(currentWorkspaceNameAtom);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshWorkspaces = useCallback(async () => {
    setIsLoading(true);
    try {
      const allWorkspaces = await getAllWorkspacesMetadata();
      setWorkspaces(allWorkspaces);
    } catch (err) {
      console.error("Failed to load workspaces:", err);
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, setWorkspaces]);

  // Load workspaces when dialog opens
  useEffect(() => {
    if (isOpen) {
      refreshWorkspaces();
    }
  }, [isOpen, refreshWorkspaces]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, [setIsOpen]);

  const handleLoad = useCallback(
    async (id: string) => {
      try {
        const workspace = await loadWorkspace(id);
        if (workspace) {
          setCurrentId(workspace.id);
          setCurrentName(workspace.name);
          onLoadWorkspace(workspace);
          setIsOpen(false);
        }
      } catch (err) {
        console.error("Failed to load workspace:", err);
      }
    },
    [setCurrentId, setCurrentName, onLoadWorkspace, setIsOpen],
  );

  const handleDelete = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();

      if (
        !confirm(
          "Are you sure you want to delete this workspace? This cannot be undone.",
        )
      ) {
        return;
      }

      setDeletingId(id);
      try {
        await deleteWorkspace(id);

        // If we deleted the current workspace, clear the current workspace state
        if (id === currentId) {
          setCurrentId(null);
          setCurrentName("");
        }

        await refreshWorkspaces();
      } catch (err) {
        console.error("Failed to delete workspace:", err);
      } finally {
        setDeletingId(null);
      }
    },
    [currentId, setCurrentId, setCurrentName, refreshWorkspaces],
  );

  const handleNewWorkspace = useCallback(() => {
    onNewWorkspace();
    setIsOpen(false);
  }, [onNewWorkspace, setIsOpen]);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setImportMessage(null);
    try {
      await exportAllWorkspaces();
    } catch (err) {
      console.error("Failed to export workspaces:", err);
      alert(
        err instanceof Error ? err.message : "Failed to export workspaces",
      );
    } finally {
      setIsExporting(false);
    }
  }, []);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImportFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) {
        return;
      }

      setIsImporting(true);
      setImportMessage(null);

      try {
        const result = await importWorkspaces(file, false);

        let message = `Imported ${result.imported} workspace(s).`;
        if (result.skipped > 0) {
          message += ` Skipped ${result.skipped} (already exist).`;
        }
        if (result.errors > 0) {
          message += ` ${result.errors} error(s).`;
        }

        setImportMessage(message);
        await refreshWorkspaces();
      } catch (err) {
        console.error("Failed to import workspaces:", err);
        setImportMessage(
          err instanceof Error ? err.message : "Failed to import workspaces",
        );
      } finally {
        setIsImporting(false);
        // Reset file input so same file can be selected again
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [refreshWorkspaces],
  );

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog size="wide" onCloseRequest={handleClose} title="My Workspaces">
      <div className="WorkspaceManager">
        <div className="WorkspaceManager__header">
          <p className="WorkspaceManager__subtitle">
            Select a workspace to continue working, or create a new one.
          </p>
          <div className="WorkspaceManager__headerActions">
            <button
              type="button"
              className="WorkspaceManager__actionButton"
              onClick={handleImportClick}
              disabled={isImporting}
              title="Import workspaces from file"
            >
              {isImporting ? "Importing..." : "Import"}
            </button>
            <button
              type="button"
              className="WorkspaceManager__actionButton"
              onClick={handleExport}
              disabled={isExporting || workspaces.length === 0}
              title="Export all workspaces to file"
            >
              {isExporting ? "Exporting..." : "Export"}
            </button>
            <button
              type="button"
              className="WorkspaceManager__newButton"
              onClick={handleNewWorkspace}
            >
              <span className="WorkspaceManager__newIcon">+</span>
              New Workspace
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            style={{ display: "none" }}
          />
        </div>
        {importMessage && (
          <div className="WorkspaceManager__importMessage">{importMessage}</div>
        )}

        {isLoading ? (
          <div className="WorkspaceManager__loading">Loading workspaces...</div>
        ) : workspaces.length === 0 ? (
          <div className="WorkspaceManager__empty">
            <div className="WorkspaceManager__emptyIcon">📝</div>
            <h3>No saved workspaces yet</h3>
            <p>Create your first workspace to start drawing!</p>
            <button
              type="button"
              className="WorkspaceManager__newButton WorkspaceManager__newButton--large"
              onClick={handleNewWorkspace}
            >
              <span className="WorkspaceManager__newIcon">+</span>
              Create Your First Workspace
            </button>
          </div>
        ) : (
          <div className="WorkspaceManager__grid">
            {workspaces.map((workspace) => (
              <div
                key={workspace.id}
                className={`WorkspaceManager__card ${
                  workspace.id === currentId
                    ? "WorkspaceManager__card--active"
                    : ""
                }`}
                onClick={() => handleLoad(workspace.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    handleLoad(workspace.id);
                  }
                }}
              >
                <div className="WorkspaceManager__cardPreview">
                  {workspace.thumbnail ? (
                    <img
                      src={workspace.thumbnail}
                      alt={`Preview of ${workspace.name}`}
                      className="WorkspaceManager__cardThumbnail"
                    />
                  ) : (
                    <span className="WorkspaceManager__cardIcon">🎨</span>
                  )}
                </div>
                <div className="WorkspaceManager__cardContent">
                  <h4 className="WorkspaceManager__cardTitle">
                    {workspace.name}
                    {workspace.id === currentId && (
                      <span className="WorkspaceManager__activeBadge">
                        Current
                      </span>
                    )}
                  </h4>
                  <div className="WorkspaceManager__cardMeta">
                    <span>{workspace.elementCount} elements</span>
                    <span>•</span>
                    <span>{formatDate(workspace.updatedAt)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="WorkspaceManager__deleteButton"
                  onClick={(e) => handleDelete(workspace.id, e)}
                  disabled={deletingId === workspace.id}
                  title="Delete workspace"
                >
                  {deletingId === workspace.id ? "..." : "×"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  );
};
