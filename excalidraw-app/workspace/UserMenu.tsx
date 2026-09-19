/**
 * User Menu - Shows who is logged in, with a sign-out button.
 * Shows a "Sign in" button when logged out.
 */

import React, { useCallback } from "react";
import { useAtomValue, useSetAtom } from "excalidraw-app/app-jotai";

import { getUserAvatarUrl, getUserDisplayName, signOut } from "../data/auth";

import {
  authLoadingAtom,
  currentUserAtom,
  currentWorkspaceIdAtom,
  currentWorkspaceNameAtom,
  loginDialogOpenAtom,
} from "./workspaceState";

import "./UserMenu.scss";

export const UserMenu: React.FC = () => {
  const user = useAtomValue(currentUserAtom);
  const isAuthLoading = useAtomValue(authLoadingAtom);
  const setLoginDialogOpen = useSetAtom(loginDialogOpenAtom);
  const setCurrentWorkspaceId = useSetAtom(currentWorkspaceIdAtom);
  const setCurrentWorkspaceName = useSetAtom(currentWorkspaceNameAtom);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      // The open workspace belongs to the old user; forget it in the UI.
      setCurrentWorkspaceId(null);
      setCurrentWorkspaceName("");
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  }, [setCurrentWorkspaceId, setCurrentWorkspaceName]);

  if (isAuthLoading) {
    return null;
  }

  if (!user) {
    return (
      <button
        type="button"
        className="UserMenu UserMenu--signin"
        onClick={() => setLoginDialogOpen(true)}
        title="Sign in to save workspaces"
      >
        Sign in
      </button>
    );
  }

  const name = getUserDisplayName(user);
  const avatarUrl = getUserAvatarUrl(user);

  return (
    <div className="UserMenu" title={`Signed in as ${name}`}>
      {avatarUrl ? (
        <img className="UserMenu__avatar" src={avatarUrl} alt="" />
      ) : (
        <span className="UserMenu__icon">👤</span>
      )}
      <span className="UserMenu__name">{name}</span>
      <button
        type="button"
        className="UserMenu__signout"
        onClick={handleSignOut}
        title="Sign out"
      >
        Sign out
      </button>
    </div>
  );
};
