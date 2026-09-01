import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { AUTH_COOKIE, hasValidAccessCookie } from "@/lib/site-password";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
} from "@/lib/supabase/config";

/**
 * Paths that must stay reachable without the site password: the gate itself,
 * and the machine callback, which authenticates with its own HMAC signature.
 */
const PUBLIC_PATHS = ["/login", "/api/login", "/api/webhooks"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/**
 * Gates the whole app behind a shared site password, then refreshes the
 * Supabase auth session so Server Components always read a valid token
 * (a no-op in demo mode).
 *
 * (Next 16 renamed the `middleware` file convention to `proxy`.)
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (
    !isPublic(pathname) &&
    !(await hasValidAccessCookie(request.cookies.get(AUTH_COOKIE)?.value))
  ) {
    const login = new URL("/login", request.url);
    // Send them back where they were headed once they're through the gate.
    login.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  const response = NextResponse.next({ request });

  if (!isSupabaseConfigured) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Touching getUser() is what triggers the refresh — don't remove it.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and image optimisation.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
