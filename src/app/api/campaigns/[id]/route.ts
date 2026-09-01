import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getCampaign } from "@/lib/queries";
import { getCurrentBrand } from "@/lib/session";
import type { Campaign } from "@/lib/types";

const STATUSES: Campaign["status"][] = ["draft", "active", "paused", "completed"];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }
  return NextResponse.json({ campaign });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const brand = await getCurrentBrand();
  const campaign = await getCampaign(id);

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }
  if (!brand || campaign.brandId !== brand.id) {
    return NextResponse.json(
      { error: "You can only edit your own campaigns." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: Partial<Campaign> = {};

  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status as Campaign["status"])) {
      return NextResponse.json({ error: "Unknown campaign status." }, { status: 422 });
    }
    patch.status = body.status as Campaign["status"];
  }

  if (body.budget !== undefined) {
    const budget = Number(body.budget);
    if (!Number.isFinite(budget) || budget < campaign.spent) {
      return NextResponse.json(
        { error: "Budget cannot be set below what the campaign has already spent." },
        { status: 422 },
      );
    }
    patch.budget = Math.round(budget * 100) / 100;
  }

  if (body.ratePerThousand !== undefined) {
    const rate = Number(body.ratePerThousand);
    if (!Number.isFinite(rate) || rate <= 0) {
      return NextResponse.json({ error: "Rate must be above zero." }, { status: 422 });
    }
    patch.ratePerThousand = Math.round(rate * 100) / 100;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 422 });
  }

  const updated = await db.updateCampaign(id, patch);
  return NextResponse.json({ campaign: updated });
}
