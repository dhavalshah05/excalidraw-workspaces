import React from "react";
import { useSetAtom } from "../app-jotai";

import {
  loginIcon,
  ExcalLogo,
  eyeIcon,
  PlusIcon,
  save,
  LoadIcon,
} from "@excalidraw/excalidraw/components/icons";
import DropdownMenuItem from "@excalidraw/excalidraw/components/dropdownMenu/DropdownMenuItem";
import { MainMenu } from "@excalidraw/excalidraw/index";
import { isDevEnv } from "@excalidraw/common";

import type { Theme } from "@excalidraw/element/types";

import { LanguageList } from "../app-language/LanguageList";
import { isExcalidrawPlusSignedUser } from "../app_constants";
import {
  workspaceManagerOpenAtom,
  saveWorkspaceDialogOpenAtom,
} from "../workspace";

import { saveDebugState } from "./DebugCanvas";

export const AppMainMenu: React.FC<{
  onCollabDialogOpen: () => any;
  isCollaborating: boolean;
  isCollabEnabled: boolean;
  theme: Theme | "system";
  setTheme: (theme: Theme | "system") => void;
  refresh: () => void;
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
      <MainMenu.ItemLink
        icon={ExcalLogo}
        href={`${
          import.meta.env.VITE_APP_PLUS_LP
        }/plus?utm_source=excalidraw&utm_medium=app&utm_content=hamburger`}
        className=""
      >
        Excalidraw+
      </MainMenu.ItemLink>
      <MainMenu.DefaultItems.Socials />
      <MainMenu.ItemLink
        icon={loginIcon}
        href={`${import.meta.env.VITE_APP_PLUS_APP}${
          isExcalidrawPlusSignedUser ? "" : "/sign-up"
        }?utm_source=signin&utm_medium=app&utm_content=hamburger`}
        className="highlighted"
      >
        {isExcalidrawPlusSignedUser ? "Sign in" : "Sign up"}
      </MainMenu.ItemLink>
      {isDevEnv() && (
        <MainMenu.Item
          icon={eyeIcon}
          onClick={() => {
            if (window.visualDebug) {
              delete window.visualDebug;
              saveDebugState({ enabled: false });
            } else {
              window.visualDebug = { data: [] };
              saveDebugState({ enabled: true });
            }
            props?.refresh();
          }}
        >
          Visual Debug
        </MainMenu.Item>
      )}
      <MainMenu.Separator />
      <MainMenu.DefaultItems.ToggleTheme
        allowSystemTheme
        theme={props.theme}
        onSelect={props.setTheme}
      />
      <MainMenu.ItemCustom>
        <LanguageList style={{ width: "100%" }} />
      </MainMenu.ItemCustom>
      <MainMenu.DefaultItems.ChangeCanvasBackground />
    </MainMenu>
  );
});
