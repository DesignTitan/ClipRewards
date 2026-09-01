import type { Metadata } from "next";
import Link from "next/link";

import { PayoutRequestForm } from "@/components/payout-request";
import { EmptyState, SectionHeading, StatCard, StatusBadge } from "@/components/ui";
import { formatDate, formatMoney, formatViews } from "@/lib/format";
import {
  getClipperStats,
  listCampaigns,
  listClips,
  listPayouts,
} from "@/lib/queries";
import { getCurrentClipper } from "@/lib/session";

export const metadata: Metadata = {
  title: "Payouts",
  description: "Your balance, payout history, and earnings by campaign.",
};

export default async function PayoutsPage() {
  const clipper = await getCurrentClipper();
  if (!clipper) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <EmptyState
          title="No clipper account"
          description="Sign in with a clipper profile to manage payouts."
        />
      </div>
    );
  }

  const [stats, payouts, clips, campaigns] = await Promise.all([
    getClipperStats(clipper.id),
    listPayouts(clipper.id),
    listClips({ clipperId: clipper.id }),
    listCampaigns(),
  ]);

  const campaignById = new Map(campaigns.map((c) => [c.id, c]));

  // Earnings rolled up per campaign, biggest first.
  const byCampaign = [...
    clips.reduce((acc, clip) => {
      const entry = acc.get(clip.campaignId) ?? { earnings: 0, views: 0, clips: 0 };
      entry.earnings += clip.earnings;
      entry.views += clip.views;
      entry.clips += 1;
      acc.set(clip.campaignId, entry);
      return acc;
    }, new Map<string, { earnings: number; views: number; clips: number }>())
  ]
    .map(([campaignId, totals]) => ({ campaignId, ...totals }))
    .sort((a, b) => b.earnings - a.earnings);

  const paidOut = payouts
    .filter((p) => p.status === "paid")
    .reduce((t, p) => t + p.amount, 0);
  const inFlight = payouts
    .filter((p) => p.status === "requested" || p.status === "processing")
    .reduce((t, p) => t + p.amount, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
      <header className="mb-8">
        <nav className="mb-4 text-sm text-faint" aria-label="Breadcrumb">
          <Link href="/clipper" className="hover:text-muted">
            Clipper dashboard
          </Link>
          <span className="mx-2" aria-hidden>
            /
          </span>
          <span className="text-muted">Payouts</span>
        </nav>
        <h1 className="text-3xl font-bold tracking-tight">Payouts</h1>
        <p className="mt-3 max-w-2xl text-muted leading-relaxed">
          Earnings settle 14 days after a clip goes live — that window is when
          platforms finalise view counts and strip out invalid traffic. Once
          settled, the balance is yours to withdraw.
        </p>
      </header>

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Available"
          value={formatMoney(stats.availableBalance)}
          accent="lime"
        />
        <StatCard
          label="Settling"
          value={formatMoney(stats.pendingEarnings)}
          accent="amber"
          sub="clears 14 days after posting"
        />
        <StatCard
          label="In flight"
          value={formatMoney(inFlight)}
          sub="requested or processing"
        />
        <StatCard label="Paid out to date" value={formatMoney(paidOut)} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px] lg:items-start">
        <div className="space-y-10">
          <section>
            <SectionHeading
              title="Payout history"
              description="Every withdrawal you've requested."
            />
            {payouts.length === 0 ? (
              <EmptyState
                title="No payouts yet"
                description="Once you clear the $50 minimum you can request your first withdrawal."
              />
            ) : (
              <div className="card overflow-hidden">
                <div className="hidden sm:grid grid-cols-[1fr_8rem_8rem_7rem] gap-4 border-b border-line-soft px-5 py-3 text-[11px] uppercase tracking-wider text-faint">
                  <span>Requested</span>
                  <span>Method</span>
                  <span className="text-right">Amount</span>
                  <span className="text-right">Status</span>
                </div>
                <ul className="divide-y divide-[var(--color-line-soft)]">
                  {payouts.map((payout) => (
                    <li
                      key={payout.id}
                      className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_8rem_8rem_7rem] items-center gap-4 px-4 sm:px-5 py-3.5"
                    >
                      <div>
                        <div className="text-sm font-medium">
                          {formatDate(payout.requestedAt)}
                        </div>
                        <div className="text-xs text-faint">
                          {payout.paidAt
                            ? `Paid ${formatDate(payout.paidAt)}`
                            : payout.status === "failed"
                              ? "Payment method declined"
                              : "Awaiting settlement"}
                          {payout.reference ? ` · ${payout.reference}` : ""}
                        </div>
                        <div className="mt-1.5 text-xs text-muted sm:hidden">
                          {payout.method} · {formatMoney(payout.amount)}
                        </div>
                      </div>

                      <span className="hidden sm:block text-sm text-muted">
                        {payout.method}
                      </span>
                      <span className="hidden sm:block text-right text-sm font-semibold tabular">
                        {formatMoney(payout.amount)}
                      </span>
                      <span className="sm:text-right">
                        <StatusBadge status={payout.status} kind="payout" />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section>
            <SectionHeading
              title="Earnings by campaign"
              description="Where the money actually came from."
            />
            {byCampaign.length === 0 ? (
              <EmptyState
                title="Nothing earned yet"
                description="Claim a campaign and post your first clip to start accruing."
              />
            ) : (
              <div className="card divide-y divide-[var(--color-line-soft)] overflow-hidden">
                {byCampaign.map((row) => {
                  const campaign = campaignById.get(row.campaignId);
                  return (
                    <Link
                      key={row.campaignId}
                      href={`/campaigns/${row.campaignId}`}
                      className="flex items-center gap-4 px-4 sm:px-5 py-3.5 hover:bg-surface-2 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {campaign?.title ?? "Campaign"}
                        </div>
                        <div className="text-xs text-faint">
                          {row.clips} clips · {formatViews(row.views)} views
                        </div>
                      </div>
                      <div className="text-right text-sm font-semibold text-lime tabular">
                        {formatMoney(row.earnings)}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-20">
          <PayoutRequestForm available={stats.availableBalance} />
        </aside>
      </div>
    </div>
  );
}

// Reads live marketplace data — never prerender this at build time.
export const dynamic = "force-dynamic";
