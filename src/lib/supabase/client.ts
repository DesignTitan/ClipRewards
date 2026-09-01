"use client";

import { createBrowserClient } from "@supabase/ssr";

import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./config";

let cached: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Browser client for realtime subscriptions and client-side auth.
 * Returns null in demo mode so callers can degrade gracefully.
 */
export function getSupabaseBrowserClient() {
  if (!isSupabaseConfigured) return null;
  cached ??= createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return cached;
}
