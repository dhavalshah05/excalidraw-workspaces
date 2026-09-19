/**
 * Single Supabase client for the whole app.
 * Used for login (GitHub) and for storing workspaces.
 * Created on first use so that importing this file has no side effects.
 */

import { createClient } from "@supabase/supabase-js";

import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    import.meta.env.VITE_APP_SUPABASE_URL &&
      import.meta.env.VITE_APP_SUPABASE_PUBLISHABLE_KEY,
  );
};

export const getSupabase = (): SupabaseClient => {
  if (client) {
    return client;
  }

  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Set VITE_APP_SUPABASE_URL and VITE_APP_SUPABASE_PUBLISHABLE_KEY in your .env file.",
    );
  }

  client = createClient(
    import.meta.env.VITE_APP_SUPABASE_URL,
    import.meta.env.VITE_APP_SUPABASE_PUBLISHABLE_KEY,
  );
  return client;
};
