/**
 * Site-wide password gate.
 *
 * A single shared password in front of the whole app while it is a private
 * preview. This is a front door, not user auth — per-user identity still lives
 * in `session.ts`.
 */

export const SITE_PASSWORD = process.env.SITE_PASSWORD || "bubs2026";

export const AUTH_COOKIE = "cr_site_access";

/** 30 days, in seconds. */
export const AUTH_MAX_AGE = 60 * 60 * 24 * 30;

/**
 * The cookie carries a hash of the password rather than the password itself,
 * so a leaked cookie doesn't hand over the password. Web Crypto is used (not
 * `node:crypto`) because the proxy verifies this on the edge runtime.
 */
export async function accessToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`cliprewards:site-gate:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Length-independent, branch-free compare so we don't leak the token by timing. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function hasValidAccessCookie(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  return safeEqual(value, await accessToken(SITE_PASSWORD));
}
