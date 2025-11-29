import React from "react";
import { useSetAtom } from "../app-jotai";

import {
  PlusIcon,
  save,
  LoadIcon,
} from "@excalidraw/excalidraw/components/icons";
import DropdownMenuItem from "@excalidraw/excalidraw/components/dropdownMenu/DropdownMenuItem";
import { MainMenu } from "@excalidraw/excalidraw/index";

import type { Theme } from "@excalidraw/element/types";

import {
  workspaceManagerOpenAtom,
  saveWorkspaceDialogOpenAtom,
} from "../workspace";

export const AppMainMenu: React.FC<{
  onCollabDialogOpen: () => any;
  isCollaborating: boolean;
  isCollabEnabled: boolean;
  theme: Theme | "system";
  setTheme: (theme: Theme | "system") => void;
  onNewWorkspace: () => void;
}> = React.memo((props) => {
  const setWorkspaceManagerOpen = useSetAtom(workspaceManagerOpenAtom);
  const setSaveDialogOpen = useSetAtom(saveWorkspaceDialogOpenAtom);

  return (
    <MainMenu>
      {/* Workspace Management */}
      <DropdownMenuItem
        icon={PlusIcon}
        onSelect={props.onNewWorkspace}
        data-testid="new-workspace-button"
        aria-label="New Workspace"
      >
        New Workspace
      </DropdownMenuItem>
      <DropdownMenuItem
        icon={save}
        onSelect={() => setSaveDialogOpen(true)}
        data-testid="save-workspace-button"
        aria-label="Save Workspace"
      >
        Save Workspace
      </DropdownMenuItem>
      <DropdownMenuItem
        icon={LoadIcon}
        onSelect={() => setWorkspaceManagerOpen(true)}
        data-testid="open-workspaces-button"
        aria-label="My Workspaces"
      >
        My Workspaces
      </DropdownMenuItem>
      <MainMenu.Separator />
      {/* File Operations */}
      <MainMenu.DefaultItems.LoadScene />
      <MainMenu.DefaultItems.Export />
      <MainMenu.DefaultItems.SaveAsImage />
      {props.isCollabEnabled && (
        <MainMenu.DefaultItems.LiveCollaborationTrigger
          isCollaborating={props.isCollaborating}
          onSelect={() => props.onCollabDialogOpen()}
        />
      )}
      <MainMenu.DefaultItems.CommandPalette className="highlighted" />
      <MainMenu.DefaultItems.SearchMenu />
      <MainMenu.DefaultItems.Help />
      <MainMenu.DefaultItems.ClearCanvas />
      <MainMenu.Separator />
      <MainMenu.DefaultItems.ToggleTheme
        allowSystemTheme
        theme={props.theme}
        onSelect={props.setTheme}
      />
      <MainMenu.DefaultItems.ChangeCanvasBackground />
    </MainMenu>
  );
});
