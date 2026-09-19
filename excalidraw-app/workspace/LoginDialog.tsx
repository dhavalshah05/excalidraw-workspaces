/**
 * Dialog asking the user to log in with GitHub.
 * Shown when a workspace action is attempted while logged out.
 */

import React, { useState, useCallback } from "react";
import { useAtom } from "excalidraw-app/app-jotai";

import { Dialog } from "@excalidraw/excalidraw/components/Dialog";

import { signInWithGithub } from "../data/auth";

import { loginDialogOpenAtom } from "./workspaceState";

import "./LoginDialog.scss";

export const LoginDialog: React.FC = () => {
  const [isOpen, setIsOpen] = useAtom(loginDialogOpenAtom);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState("");

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setError("");
  }, [setIsOpen]);

  const handleLogin = useCallback(async () => {
    setIsRedirecting(true);
    setError("");
    try {
      await signInWithGithub();
      // Browser is now navigating to GitHub; nothing more to do here.
    } catch (err) {
      console.error("Login failed:", err);
      setError("Could not start login. Please try again.");
      setIsRedirecting(false);
    }
  }, []);

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog size="small" onCloseRequest={handleClose} title="Sign in">
      <div className="LoginDialog">
        <p className="LoginDialog__text">
          Sign in to save and open your workspaces from any browser.
        </p>
        <button
          type="button"
          className="LoginDialog__button"
          onClick={handleLogin}
          disabled={isRedirecting}
        >
          {isRedirecting ? "Redirecting..." : "Continue with GitHub"}
        </button>
        {error && <div className="LoginDialog__error">{error}</div>}
      </div>
    </Dialog>
  );
};
