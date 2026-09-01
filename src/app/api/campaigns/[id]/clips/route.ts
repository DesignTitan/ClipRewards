import { NextResponse } from "next/server";

import { getClipperProvider } from "@/lib/ai/clipper";
import { db } from "@/lib/db";
import { getCampaign, getCampaignMetrics, listClips } from "@/lib/queries";
import { getCurrentClipper } from "@/lib/session";
import type { Clip } from "@/lib/types";

const MAX_PER_REQUEST = 8;

/**
 * Kicks off AI clip generation for the signed-in clipper on this campaign.
 *
 * The provider is resolved from `CLIPPER_PROVIDER` — see src/lib/ai/clipper.ts.
 * Synchronous providers land clips straight in `ready`; an async provider
 * should insert them as `generating` and let the webhook at
 * /api/webhooks/clipper complete them.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const clipper = await getCurrentClipper();
  if (!clipper) {
    return NextResponse.json(
      { error: "Not signed in as a clipper." },
      { status: 401 },
    );
  }

  const campaign = await getCampaign(id);
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }
  if (campaign.status !== "active") {
    return NextResponse.json(
      { error: `This campaign is ${campaign.status} and isn't accepting clips.` },
      { status: 409 },
    );
  }

  const metrics = await getCampaignMetrics(campaign.id);
  if (metrics.remainingBudget <= 0) {
    return NextResponse.json(
      { error: "This campaign has spent its full budget." },
      { status: 409 },
    );
  }

  if (campaign.endsAt && Date.parse(campaign.endsAt) < Date.now()) {
    return NextResponse.json({ error: "This campaign has ended." }, { status: 409 });
  }

  const mine = await listClips({ campaignId: campaign.id, clipperId: clipper.id });
  if (campaign.maxPayoutPerClipper !== null) {
    const earned = mine.reduce((total, clip) => total + clip.earnings, 0);
    if (earned >= campaign.maxPayoutPerClipper) {
      return NextResponse.json(
        { error: "You've hit this campaign's per-clipper payout cap." },
        { status: 409 },
      );
    }
  }

  const body = (await request.json().catch(() => ({}))) as { count?: unknown };
  const requested = Number(body.count);
  const count = Math.min(
    MAX_PER_REQUEST,
    Math.max(1, Number.isFinite(requested) ? Math.trunc(requested) : 4),
  );

  const provider = getClipperProvider();

  let suggestions;
  try {
    suggestions = await provider.generate({
      campaign: {
        id: campaign.id,
        title: campaign.title,
        sourceUrl: campaign.sourceUrl,
        sourceDurationSeconds: campaign.sourceDurationSeconds,
        guidelines: campaign.guidelines,
        platforms: campaign.platforms,
      },
      count,
      verticalCrop: true,
      captions: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: `Clip generation failed: ${
          error instanceof Error ? error.message : "unknown provider error"
        }`,
      },
      { status: 502 },
    );
  }

  const now = new Date().toISOString();
  // A provider is external input: drop anything with an inverted or empty
  // window rather than writing a row the `clip_window` constraint would reject.
  const clips: Clip[] = suggestions
    .filter((s) => Math.round(s.endSeconds) > Math.round(s.startSeconds))
    .map((s) => ({
      id: crypto.randomUUID(),
      campaignId: campaign.id,
      clipperId: clipper.id,
      title: s.title,
      startSeconds: Math.round(s.startSeconds),
      endSeconds: Math.round(s.endSeconds),
      thumbnail: null,
      captionText: s.caption,
      hookScore: Math.max(0, Math.min(100, Math.round(s.hookScore))),
      status: "ready" as const,
      platform: null,
      postUrl: null,
      scheduledFor: null,
      postedAt: null,
      views: 0,
      likes: 0,
      earnings: 0,
      createdAt: now,
    }));

  if (clips.length === 0) {
    return NextResponse.json(
      { error: "The clipping provider returned no usable clips. Try again." },
      { status: 502 },
    );
  }

  const created = await db.insertClips(clips);
  return NextResponse.json(
    { clips: created, provider: provider.name },
    { status: 201 },
  );
}
