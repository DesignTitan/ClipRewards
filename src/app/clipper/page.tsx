import type { Metadata } from "next";
import Link from "next/link";

import { ClipCard } from "@/components/clip-card";
import {
  EmptyState,
  ProgressBar,
  SectionHeading,
  StatCard,
  Thumb,
} from "@/components/ui";
import {
  formatMoney,
  formatRate,
  formatViews,
  timeUntil,
} from "@/lib/format";
import {
  getClipperStats,
  getMetricsForCampaigns,
  listCampaigns,
  listClips,
  listPayouts,
} from "@/lib/queries";
import { getCurrentClipper } from "@/lib/session";

export const metadata: Metadata = {
  title: "Clipper dashboard",
  description: "Your clips, earnings, and active campaigns.",
};

export default async function ClipperDashboardPage() {
  const clipper = await getCurrentClipper();
  if (!clipper) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <EmptyState
          title="No clipper account"
          description="Sign in with a clipper profile to see this dashboard."
        />
      </div>
    );
  }

  const [stats, myClips, campaigns, payouts] = await Promise.all([
    getClipperStats(clipper.id),
    listClips({ clipperId: clipper.id }),
    listCampaigns({ status: "active" }),
    listPayouts(clipper.id),
  ]);

  const metrics = await getMetricsForCampaigns(campaigns.map((c) => c.id));
  const campaignById = new Map(campaigns.map((c) => [c.id, c]));

  const reviewQueue = myClips.filter((c) => c.status === "ready");
  const scheduled = myClips.filter((c) => c.status === "scheduled");
  const posted = myClips
    .filter((c) => c.status === "posted")
    .sort((a, b) => b.views - a.views);

  const myCampaignIds = new Set(
    myClips.filter((c) => c.status !== "rejected").map((c) => c.campaignId),
  );
  const recommended = campaigns
    .filter((c) => !myCampaignIds.has(c.id))
    .sort((a, b) => b.ratePerThousand - a.ratePerThousand)
    .slice(0, 4);

  const inFlight = payouts.filter(
    (p) => p.status === "requested" || p.status === "processing",
  );

  return (
    <div>
      <header className="relative overflow-hidden border-b border-line-soft">
        <div className="absolute inset-0 aurora opacity-70" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="eyebrow">Clipper dashboard</span>
              <h1 className="mt-2 flex items-center gap-3 text-3xl font-bold tracking-tight">
                <span aria-hidden>{clipper.avatarEmoji}</span>
                {clipper.displayName}
              </h1>
              <p className="mt-2 text-sm text-muted">
                @{clipper.handle} · {stats.postedClips} clips live across{" "}
                {stats.activeCampaigns} campaigns
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/campaigns" className="btn btn-secondary">
                Find campaigns
              </Link>
              <Link href="/clipper/payouts" className="btn btn-primary">
                Request payout
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-12">
        {/* Stats --------------------------------------------------------- */}
        <section>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Available to withdraw"
              value={formatMoney(stats.availableBalance)}
              accent="lime"
              sub={
                inFlight.length
                  ? `${formatMoney(
                      inFlight.reduce((t, p) => t + p.amount, 0),
                    )} already requested`
                  : "$50 minimum payout"
              }
            />
            <StatCard
              label="Still settling"
              value={formatMoney(stats.pendingEarnings)}
              accent="amber"
              sub="clips posted in the last 14 days"
            />
            <StatCard
              label="Lifetime earnings"
              value={formatMoney(stats.lifetimeEarnings)}
              sub={`${stats.postedClips} clips posted`}
            />
            <StatCard
              label="Total views"
              value={formatViews(stats.totalViews)}
              accent="violet"
              sub={
                stats.postedClips
                  ? `${formatViews(
                      Math.round(stats.totalViews / stats.postedClips),
                    )} average per clip`
                  : "no clips posted yet"
              }
            />
          </div>
        </section>

        {/* Review queue -------------------------------------------------- */}
        <section>
          <SectionHeading
            title="Ready to review"
            description="AI-cut clips waiting on your call. Approve and schedule, or discard."
            action={
              reviewQueue.length > 0 ? (
                <span className="chip border-cyan/40 text-cyan">
                  {reviewQueue.length} waiting
                </span>
              ) : undefined
            }
          />

          {reviewQueue.length === 0 ? (
            <EmptyState
              title="Queue's empty"
              description="Pick a campaign and generate a fresh batch — it takes a few seconds."
              action={
                <Link href="/campaigns" className="btn btn-primary">
                  Browse campaigns
                </Link>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {reviewQueue.slice(0, 8).map((clip) => (
                <ClipCard
                  key={clip.id}
                  clip={clip}
                  actionable
                  campaignTitle={campaignById.get(clip.campaignId)?.title}
                  campaignHref={`/campaigns/${clip.campaignId}`}
                  platforms={campaignById.get(clip.campaignId)?.platforms ?? []}
                />
              ))}
            </div>
          )}
        </section>

        {/* Scheduled ----------------------------------------------------- */}
        {scheduled.length > 0 && (
          <section>
            <SectionHeading
              title="Scheduled to post"
              description="Queued and waiting on their post time."
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {scheduled.map((clip) => (
                <ClipCard
                  key={clip.id}
                  clip={clip}
                  actionable
                  campaignTitle={campaignById.get(clip.campaignId)?.title}
                  campaignHref={`/campaigns/${clip.campaignId}`}
                  platforms={campaignById.get(clip.campaignId)?.platforms ?? []}
                />
              ))}
            </div>
          </section>
        )}

        {/* Live clips ---------------------------------------------------- */}
        <section>
          <SectionHeading
            title="Live clips"
            description="Posted and accruing views."
            action={
              <Link href="/clipper/clips" className="btn btn-secondary">
                See all {myClips.length}
              </Link>
            }
          />
          {posted.length === 0 ? (
            <EmptyState
              title="Nothing live yet"
              description="Approve a clip from your review queue and schedule it to get started."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {posted.slice(0, 8).map((clip) => (
                <ClipCard
                  key={clip.id}
                  clip={clip}
                  campaignTitle={campaignById.get(clip.campaignId)?.title}
                  campaignHref={`/campaigns/${clip.campaignId}`}
                />
              ))}
            </div>
          )}
        </section>

        {/* Recommended --------------------------------------------------- */}
        <section>
          <SectionHeading
            title="Campaigns you haven't claimed"
            description="Highest rates first."
            action={
              <Link href="/campaigns" className="btn btn-secondary">
                Browse all
              </Link>
            }
          />
          {recommended.length === 0 ? (
            <EmptyState
              title="You're on every open campaign"
              description="Nice. Check back as brands fund new ones."
            />
          ) : (
            <div className="card divide-y divide-[var(--color-line-soft)] overflow-hidden">
              {recommended.map((campaign) => {
                const m = metrics.get(campaign.id);
                return (
                  <Link
                    key={campaign.id}
                    href={`/campaigns/${campaign.id}`}
                    className="flex flex-wrap items-center gap-4 px-4 sm:px-5 py-4 hover:bg-surface-2 transition-colors"
                  >
                    <Thumb
                      seed={campaign.id}
                      className="w-20 shrink-0"
                      durationSeconds={campaign.sourceDurationSeconds}
                    />
                    <div className="min-w-[12rem] flex-1">
                      <h3 className="text-sm font-semibold">{campaign.title}</h3>
                      <div className="mt-1 text-xs text-faint">
                        {campaign.endsAt ? timeUntil(campaign.endsAt) : "Open-ended"}{" "}
                        · {m?.clipperCount ?? 0} clippers working it
                      </div>
                      <div className="mt-2.5 max-w-xs">
                        <ProgressBar
                          value={m?.budgetUsedPct ?? 0}
                          tone={(m?.budgetUsedPct ?? 0) > 85 ? "amber" : "lime"}
                          label={`${campaign.title} budget`}
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold text-lime tabular">
                        {formatRate(campaign.ratePerThousand)}
                      </div>
                      <div className="text-[11px] text-faint">
                        {formatMoney(m?.remainingBudget ?? campaign.budget)} left
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// Reads live marketplace data — never prerender this at build time.
export const dynamic = "force-dynamic";
