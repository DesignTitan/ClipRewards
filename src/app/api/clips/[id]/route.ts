import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getCampaign, listClips } from "@/lib/queries";
import { getCurrentClipper } from "@/lib/session";
import { PLATFORMS, type Clip, type Platform } from "@/lib/types";

/** Transitions a clipper is allowed to drive from the review queue. */
const ALLOWED: Record<Clip["status"], Clip["status"][]> = {
  generating: ["ready", "rejected"],
  ready: ["scheduled", "rejected"],
  scheduled: ["ready", "posted", "rejected"],
  posted: [],
  rejected: ["ready"],
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const clipper = await getCurrentClipper();
  if (!clipper) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const clips = await listClips({ clipperId: clipper.id });
  const clip = clips.find((c) => c.id === id);
  if (!clip) {
    return NextResponse.json(
      { error: "Clip not found, or it isn't yours." },
      { status: 404 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: Partial<Clip> = {};

  if (body.status !== undefined) {
    const next = body.status as Clip["status"];
    if (!ALLOWED[clip.status]?.includes(next)) {
      return NextResponse.json(
        { error: `Can't move a clip from ${clip.status} to ${next}.` },
        { status: 409 },
      );
    }
    patch.status = next;
  }

  if (body.platform !== undefined && body.platform !== null) {
    if (!PLATFORMS.includes(body.platform as Platform)) {
      return NextResponse.json({ error: "Unknown platform." }, { status: 422 });
    }
    const campaign = await getCampaign(clip.campaignId);
    if (campaign && !campaign.platforms.includes(body.platform as Platform)) {
      return NextResponse.json(
        { error: "This campaign doesn't accept that platform." },
        { status: 422 },
      );
    }
    patch.platform = body.platform as Platform;
  }

  if (body.scheduledFor !== undefined) {
    if (body.scheduledFor === null) {
      patch.scheduledFor = null;
    } else {
      const when = Date.parse(String(body.scheduledFor));
      if (Number.isNaN(when)) {
        return NextResponse.json({ error: "Invalid schedule date." }, { status: 422 });
      }
      if (when < Date.now() - 60_000) {
        return NextResponse.json(
          { error: "Pick a time in the future." },
          { status: 422 },
        );
      }
      patch.scheduledFor = new Date(when).toISOString();
    }
  }

  if (patch.status === "scheduled" && !patch.platform && !clip.platform) {
    return NextResponse.json(
      { error: "Choose a platform before scheduling." },
      { status: 422 },
    );
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 422 });
  }

  const updated = await db.updateClip(id, patch);
  return NextResponse.json({ clip: updated });
}
