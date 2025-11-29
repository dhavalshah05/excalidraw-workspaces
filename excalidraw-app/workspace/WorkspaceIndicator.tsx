/**
 * Workspace Indicator - Shows current workspace name in the toolbar
 */

import React from "react";
import { useAtomValue, useSetAtom } from "excalidraw-app/app-jotai";

import {
  currentWorkspaceNameAtom,
  currentWorkspaceIdAtom,
  workspaceManagerOpenAtom,
} from "./workspaceState";

import "./WorkspaceIndicator.scss";

export const WorkspaceIndicator: React.FC = () => {
  const currentName = useAtomValue(currentWorkspaceNameAtom);
  const currentId = useAtomValue(currentWorkspaceIdAtom);
  const setManagerOpen = useSetAtom(workspaceManagerOpenAtom);

  const displayName = currentName || "Untitled Workspace";
  const isUnsaved = !currentId;

  return (
    <button
      type="button"
      className="WorkspaceIndicator"
      onClick={() => setManagerOpen(true)}
      title={
        isUnsaved
          ? "Click to open workspace manager"
          : `Current workspace: ${displayName}`
      }
    >
      <span className="WorkspaceIndicator__icon">📁</span>
      <span className="WorkspaceIndicator__name">{displayName}</span>
      {isUnsaved && (
        <span className="WorkspaceIndicator__unsaved" title="Unsaved changes">
          •
        </span>
      )}
    </button>
  );
};
