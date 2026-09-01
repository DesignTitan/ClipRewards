import { NextResponse } from "next/server";

import {
  AUTH_COOKIE,
  AUTH_MAX_AGE,
  SITE_PASSWORD,
  accessToken,
  safeEqual,
} from "@/lib/site-password";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const password = typeof body.password === "string" ? body.password : "";

  if (!password) {
    return NextResponse.json({ error: "Enter the password." }, { status: 422 });
  }

  if (!safeEqual(password, SITE_PASSWORD)) {
    return NextResponse.json({ error: "That password isn't right." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: AUTH_COOKIE,
    value: await accessToken(SITE_PASSWORD),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: AUTH_MAX_AGE,
  });
  return response;
}
