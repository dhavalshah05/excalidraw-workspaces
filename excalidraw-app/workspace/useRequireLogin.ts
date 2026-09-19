/**
 * One place that decides: "is the user allowed to do workspace things?"
 * Returns a function. Call it with the action you want to run.
 * If logged in, the action runs. If not, the login dialog opens instead.
 */

import { useCallback } from "react";
import { useAtomValue, useSetAtom } from "excalidraw-app/app-jotai";

import { currentUserAtom, loginDialogOpenAtom } from "./workspaceState";

export const useRequireLogin = () => {
  const user = useAtomValue(currentUserAtom);
  const setLoginDialogOpen = useSetAtom(loginDialogOpenAtom);

  return useCallback(
    (action: () => void) => {
      if (user) {
        action();
      } else {
        setLoginDialogOpen(true);
      }
    },
    [user, setLoginDialogOpen],
  );
};
