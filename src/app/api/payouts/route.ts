import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getClipperStats, listPayouts } from "@/lib/queries";
import { getCurrentClipper } from "@/lib/session";
import type { Payout } from "@/lib/types";

export const MINIMUM_PAYOUT = 50;

const METHODS = ["Stripe Connect", "PayPal", "Wise"];

export async function GET() {
  const clipper = await getCurrentClipper();
  if (!clipper) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  return NextResponse.json({ payouts: await listPayouts(clipper.id) });
}

export async function POST(request: Request) {
  const clipper = await getCurrentClipper();
  if (!clipper) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const stats = await getClipperStats(clipper.id);

  const amount = Number(body.amount ?? stats.availableBalance);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Enter an amount to withdraw." }, { status: 422 });
  }
  if (amount < MINIMUM_PAYOUT) {
    return NextResponse.json(
      { error: `Minimum payout is $${MINIMUM_PAYOUT}.` },
      { status: 422 },
    );
  }
  // Rounding both sides to cents keeps a $0.004 float artifact from blocking a
  // clipper who is trying to withdraw their exact balance.
  if (Math.round(amount * 100) > Math.round(stats.availableBalance * 100)) {
    return NextResponse.json(
      {
        error: `You have $${stats.availableBalance.toFixed(2)} available right now.`,
      },
      { status: 422 },
    );
  }

  const method = METHODS.includes(String(body.method))
    ? String(body.method)
    : METHODS[0];

  const payout: Payout = {
    id: crypto.randomUUID(),
    clipperId: clipper.id,
    amount: Math.round(amount * 100) / 100,
    status: "requested",
    method,
    requestedAt: new Date().toISOString(),
    paidAt: null,
    reference: null,
  };

  const created = await db.insertPayout(payout);
  return NextResponse.json({ payout: created }, { status: 201 });
}
