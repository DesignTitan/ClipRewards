import { createHmac, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import type { Clip } from "@/lib/types";

/**
 * Callback for asynchronous clipping providers.
 *
 * A provider that renders in the background POSTs here when a job finishes:
 *
 *   POST /api/webhooks/clipper
 *   x-clipper-signature: sha256=<hex hmac of the raw body>
 *   { "clips": [ { "id": "...", "status": "ready", "thumbnail": "https://…" } ] }
 *
 * Set CLIPPER_WEBHOOK_SECRET to enable signature verification. Without it the
 * endpoint refuses every request rather than trusting an unsigned caller.
 */

function verify(rawBody: string, header: string | null): boolean {
  const secret = process.env.CLIPPER_WEBHOOK_SECRET ?? "";
  if (!secret || !header) return false;

  const provided = header.startsWith("sha256=") ? header.slice(7) : header;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");

  const a = Buffer.from(provided, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

interface WebhookClip {
  id?: string;
  status?: Clip["status"];
  thumbnail?: string | null;
  title?: string;
  caption?: string;
  hook_score?: number;
  start_seconds?: number;
  end_seconds?: number;
}

export async function POST(request: Request) {
  const raw = await request.text();

  if (!verify(raw, request.headers.get("x-clipper-signature"))) {
    return NextResponse.json(
      { error: "Invalid or missing webhook signature." },
      { status: 401 },
    );
  }

  let payload: { clips?: WebhookClip[] };
  try {
    payload = JSON.parse(raw) as { clips?: WebhookClip[] };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!Array.isArray(payload.clips)) {
    return NextResponse.json(
      { error: "Body must contain a `clips` array." },
      { status: 422 },
    );
  }

  let updated = 0;
  for (const incoming of payload.clips) {
    if (!incoming.id) continue;

    const patch: Partial<Clip> = {};
    if (incoming.status) patch.status = incoming.status;
    if (incoming.thumbnail !== undefined) patch.thumbnail = incoming.thumbnail;
    if (incoming.title) patch.title = incoming.title;
    if (incoming.caption !== undefined) patch.captionText = incoming.caption;
    if (typeof incoming.hook_score === "number") {
      patch.hookScore = Math.max(0, Math.min(100, Math.round(incoming.hook_score)));
    }
    if (typeof incoming.start_seconds === "number") {
      patch.startSeconds = Math.round(incoming.start_seconds);
    }
    if (typeof incoming.end_seconds === "number") {
      patch.endSeconds = Math.round(incoming.end_seconds);
    }

    if (Object.keys(patch).length && (await db.updateClip(incoming.id, patch))) {
      updated += 1;
    }
  }

  return NextResponse.json({ updated });
}
