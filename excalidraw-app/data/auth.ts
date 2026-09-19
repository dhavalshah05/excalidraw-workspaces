/**
 * Login helpers. Only GitHub login is supported.
 */

import { getSupabase, isSupabaseConfigured } from "./supabase";

import type { User } from "@supabase/supabase-js";

export type AuthUser = User;

/**
 * Starts GitHub login. The browser is redirected to GitHub and then back
 * to this app. Supabase picks up the session from the URL on return.
 */
export const signInWithGithub = async (): Promise<void> => {
  const { error } = await getSupabase().auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (error) {
    throw error;
  }
};

export const signOut = async (): Promise<void> => {
  const { error } = await getSupabase().auth.signOut();
  if (error) {
    throw error;
  }
};

/**
 * Returns the logged-in user, or null when nobody is logged in.
 */
export const getCurrentUser = async (): Promise<AuthUser | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }
  const { data } = await getSupabase().auth.getSession();
  return data.session?.user ?? null;
};

/**
 * Calls `callback` every time login state changes (login, logout, token refresh).
 * Returns a function that stops listening.
 */
export const onAuthChange = (
  callback: (user: AuthUser | null) => void,
): (() => void) => {
  if (!isSupabaseConfigured()) {
    return () => {};
  }
  const { data } = getSupabase().auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  return () => data.subscription.unsubscribe();
};

/**
 * Display name for the UI. Falls back to email, then "User".
 */
export const getUserDisplayName = (user: AuthUser): string => {
  const metadata = user.user_metadata ?? {};
  return (
    metadata.user_name ||
    metadata.full_name ||
    metadata.name ||
    user.email ||
    "User"
  );
};

export const getUserAvatarUrl = (user: AuthUser): string | undefined => {
  return user.user_metadata?.avatar_url;
};
