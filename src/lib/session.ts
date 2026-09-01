import { DEMO_CURRENT_BRAND_ID, DEMO_CURRENT_CLIPPER_ID } from "./demo-data";
import { isDemoMode } from "./db";
import { getProfile } from "./queries";
import type { Profile } from "./types";

/**
 * Who is acting.
 *
 * Auth is intentionally not wired up — this is the one place that decides it,
 * so swapping in Supabase Auth means changing these two functions and nothing
 * else. In demo mode both sides resolve to a fixed seeded profile.
 *
 * With Supabase configured, replace the bodies with:
 *
 *   const db = await createSupabaseServerClient();
 *   const { data: { user } } = await db.auth.getUser();
 *   return user ? getProfile(user.id) : null;
 */

export async function getCurrentBrand(): Promise<Profile | null> {
  return getProfile(DEMO_CURRENT_BRAND_ID);
}

export async function getCurrentClipper(): Promise<Profile | null> {
  return getProfile(DEMO_CURRENT_CLIPPER_ID);
}

/** True when the app is running without real authentication behind it. */
export const isUnauthenticatedDemo = isDemoMode;
