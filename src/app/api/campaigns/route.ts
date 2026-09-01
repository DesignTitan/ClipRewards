import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { listCampaigns } from "@/lib/queries";
import { getCurrentBrand } from "@/lib/session";
import { PLATFORMS, type Campaign, type Platform } from "@/lib/types";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const campaigns = await listCampaigns({
    brandId: url.searchParams.get("brandId") ?? undefined,
    status: (url.searchParams.get("status") as Campaign["status"]) ?? undefined,
    platform: url.searchParams.get("platform") ?? undefined,
    search: url.searchParams.get("q") ?? undefined,
  });

  return NextResponse.json({ campaigns });
}

interface CampaignPayload {
  title?: unknown;
  description?: unknown;
  sourceUrl?: unknown;
  sourceDurationSeconds?: unknown;
  ratePerThousand?: unknown;
  budget?: unknown;
  maxPayoutPerClipper?: unknown;
  minViewsToQualify?: unknown;
  platforms?: unknown;
  guidelines?: unknown;
  status?: unknown;
  endsAt?: unknown;
}

export async function POST(request: Request) {
  const brand = await getCurrentBrand();
  if (!brand) {
    return NextResponse.json({ error: "Not signed in as a brand." }, { status: 401 });
  }

  let body: CampaignPayload;
  try {
    body = (await request.json()) as CampaignPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const errors: string[] = [];

  const title = String(body.title ?? "").trim();
  if (title.length < 4) errors.push("Title must be at least 4 characters.");

  const sourceUrl = String(body.sourceUrl ?? "").trim();
  if (!/^https?:\/\/\S+$/.test(sourceUrl)) {
    errors.push("Source URL must be a valid http(s) link.");
  }

  const ratePerThousand = Number(body.ratePerThousand);
  if (!Number.isFinite(ratePerThousand) || ratePerThousand <= 0) {
    errors.push("Rate per 1,000 views must be greater than zero.");
  }

  const budget = Number(body.budget);
  if (!Number.isFinite(budget) || budget < 100) {
    errors.push("Budget must be at least $100.");
  }

  const platforms = Array.isArray(body.platforms)
    ? (body.platforms.filter((p): p is Platform =>
        PLATFORMS.includes(p as Platform),
      ) as Platform[])
    : [];
  if (platforms.length === 0) errors.push("Pick at least one platform.");

  const maxPayoutPerClipper =
    body.maxPayoutPerClipper === null ||
    body.maxPayoutPerClipper === undefined ||
    body.maxPayoutPerClipper === ""
      ? null
      : Number(body.maxPayoutPerClipper);
  if (maxPayoutPerClipper !== null && !Number.isFinite(maxPayoutPerClipper)) {
    errors.push("Per-clipper cap must be a number.");
  }
  if (
    maxPayoutPerClipper !== null &&
    Number.isFinite(budget) &&
    maxPayoutPerClipper > budget
  ) {
    errors.push("Per-clipper cap cannot exceed the campaign budget.");
  }

  const status: Campaign["status"] = body.status === "draft" ? "draft" : "active";

  if (errors.length) {
    return NextResponse.json({ error: errors[0], errors }, { status: 422 });
  }

  const guidelines = Array.isArray(body.guidelines)
    ? body.guidelines.map((g) => String(g).trim()).filter(Boolean)
    : String(body.guidelines ?? "")
        .split("\n")
        .map((g) => g.trim())
        .filter(Boolean);

  const campaign: Campaign = {
    id: crypto.randomUUID(),
    brandId: brand.id,
    title,
    description: String(body.description ?? "").trim(),
    sourceUrl,
    sourceThumbnail: null,
    sourceDurationSeconds: Math.max(0, Number(body.sourceDurationSeconds) || 0),
    ratePerThousand: Math.round(ratePerThousand * 100) / 100,
    budget: Math.round(budget * 100) / 100,
    spent: 0,
    maxPayoutPerClipper,
    minViewsToQualify: Math.max(0, Number(body.minViewsToQualify) || 0),
    platforms,
    guidelines,
    status,
    endsAt: body.endsAt ? new Date(String(body.endsAt)).toISOString() : null,
    createdAt: new Date().toISOString(),
  };

  const created = await db.insertCampaign(campaign);
  return NextResponse.json({ campaign: created }, { status: 201 });
}
