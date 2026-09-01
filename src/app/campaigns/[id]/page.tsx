import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ClipCard } from "@/components/clip-card";
import { GenerateClipsButton } from "@/components/generate-clips-button";
import {
  EmptyState,
  PlatformPills,
  ProgressBar,
  SectionHeading,
  StatCard,
  StatusBadge,
  Thumb,
} from "@/components/ui";
import {
  formatDuration,
  formatMoney,
  formatMoneyWhole,
  formatNumber,
  formatRate,
  formatViews,
  timeUntil,
} from "@/lib/format";
import {
  getCampaign,
  getCampaignMetrics,
  getProfile,
  getTopContributors,
  listClips,
} from "@/lib/queries";
import { getCurrentClipper } from "@/lib/session";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) return { title: "Campaign not found" };
  return {
    title: campaign.title,
    description: campaign.description.slice(0, 160),
  };
}

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) notFound();

  const [brand, metrics, clips, contributors, clipper] = await Promise.all([
    getProfile(campaign.brandId),
    getCampaignMetrics(campaign.id),
    listClips({ campaignId: campaign.id }),
    getTopContributors({ campaignId: campaign.id, limit: 5 }),
    getCurrentClipper(),
  ]);

  const myClips = clipper ? clips.filter((c) => c.clipperId === clipper.id) : [];
  const showcase = clips
    .filter((c) => c.status === "posted")
    .sort((a, b) => b.views - a.views)
    .slice(0, 4);

  const myEarnings = myClips.reduce((t, c) => t + c.earnings, 0);
  const capReached =
    campaign.maxPayoutPerClipper !== null &&
    myEarnings >= campaign.maxPayoutPerClipper;

  const closed =
    campaign.status !== "active" ||
    metrics.remainingBudget <= 0 ||
    (campaign.endsAt ? Date.parse(campaign.endsAt) < Date.now() : false);

  const disabledReason = capReached
    ? "You've reached this campaign's per-clipper payout cap."
    : campaign.status !== "active"
      ? `This campaign is ${campaign.status}.`
      : metrics.remainingBudget <= 0
        ? "The budget for this campaign is fully spent."
        : "This campaign has ended.";

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <nav className="mb-6 text-sm text-faint" aria-label="Breadcrumb">
        <Link href="/campaigns" className="hover:text-muted">
          Campaigns
        </Link>
        <span className="mx-2" aria-hidden>
          /
        </span>
        <span className="text-muted">{campaign.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px] lg:items-start">
        {/* ------------------------------------------------------------- */}
        {/* Main column                                                   */}
        {/* ------------------------------------------------------------- */}
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={campaign.status} kind="campaign" />
            {brand && (
              <span className="text-sm text-muted">
                <span aria-hidden>{brand.avatarEmoji}</span>{" "}
                <span className="font-medium text-text">{brand.displayName}</span>
                <span className="text-faint"> @{brand.handle}</span>
              </span>
            )}
          </div>

          <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">
            {campaign.title}
          </h1>

          <p className="mt-4 max-w-2xl text-muted leading-relaxed">
            {campaign.description}
          </p>

          <div className="mt-6">
            <Thumb
              seed={campaign.id}
              durationSeconds={campaign.sourceDurationSeconds}
              className="max-w-2xl"
            />
            <p className="mt-2 max-w-2xl truncate text-xs text-faint">
              Source · {formatDuration(campaign.sourceDurationSeconds)} ·{" "}
              {campaign.sourceUrl}
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <StatCard
              label="Views delivered"
              value={formatViews(metrics.views)}
              sub={`${metrics.clipCount} clips from ${metrics.clipperCount} clippers`}
            />
            <StatCard
              label="Rate"
              value={formatRate(campaign.ratePerThousand)}
              accent="lime"
              sub={`${formatNumber(campaign.minViewsToQualify)} views to qualify`}
            />
            <StatCard
              label="Budget remaining"
              value={formatMoneyWhole(metrics.remainingBudget)}
              sub={`of ${formatMoneyWhole(campaign.budget)} total`}
            />
          </div>

          <section className="mt-10">
            <SectionHeading
              title="Guidelines"
              description="Clips that break these get rejected before payout. Read them before you cut."
            />
            <ul className="card divide-y divide-[var(--color-line-soft)]">
              {campaign.guidelines.map((rule) => (
                <li key={rule} className="flex gap-3 px-5 py-3.5">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="mt-0.5 shrink-0 text-lime"
                    aria-hidden
                  >
                    <path
                      d="M5 12.5l4.5 4.5L19 7.5"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="text-sm text-muted leading-relaxed">{rule}</span>
                </li>
              ))}
            </ul>
          </section>

          {myClips.length > 0 && (
            <section className="mt-10">
              <SectionHeading
                title="Your clips on this campaign"
                description={`${myClips.length} generated · ${formatMoney(myEarnings)} earned so far`}
              />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {myClips.map((clip) => (
                  <ClipCard
                    key={clip.id}
                    clip={clip}
                    platforms={campaign.platforms}
                    actionable
                  />
                ))}
              </div>
            </section>
          )}

          <section className="mt-10">
            <SectionHeading
              title="Top performing clips"
              description="What's already working on this source video."
            />
            {showcase.length === 0 ? (
              <EmptyState
                title="No clips posted yet"
                description="Be the first to cut this one — early clips tend to take the best moments."
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {showcase.map((clip) => (
                  <ClipCard key={clip.id} clip={clip} />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* Sidebar                                                       */}
        {/* ------------------------------------------------------------- */}
        <aside className="space-y-4 lg:sticky lg:top-20">
          <div className="card p-5">
            <div className="eyebrow">Payout</div>
            <div className="mt-2 text-3xl font-bold tracking-tight text-lime tabular">
              {formatRate(campaign.ratePerThousand)}
            </div>
            <p className="mt-1 text-xs text-muted">
              per 1,000 verified views, across every clip you post
            </p>

            <dl className="mt-5 space-y-2.5 border-t border-line-soft pt-4 text-sm">
              <Row
                label="Minimum views"
                value={formatNumber(campaign.minViewsToQualify)}
              />
              <Row
                label="Per-clipper cap"
                value={
                  campaign.maxPayoutPerClipper === null
                    ? "None"
                    : formatMoneyWhole(campaign.maxPayoutPerClipper)
                }
              />
              <Row
                label="Ends"
                value={campaign.endsAt ? timeUntil(campaign.endsAt) : "Open-ended"}
              />
            </dl>

            <div className="mt-5 border-t border-line-soft pt-4">
              <div className="mb-1.5 flex justify-between text-xs text-muted tabular">
                <span>Budget used</span>
                <span>
                  {formatMoneyWhole(campaign.spent)} /{" "}
                  {formatMoneyWhole(campaign.budget)}
                </span>
              </div>
              <ProgressBar
                value={metrics.budgetUsedPct}
                tone={metrics.budgetUsedPct > 85 ? "amber" : "lime"}
                label="Budget used"
              />
            </div>

            <div className="mt-5">
              <GenerateClipsButton
                campaignId={campaign.id}
                disabled={closed || capReached}
                disabledReason={disabledReason}
                label={myClips.length ? "Generate more clips" : "Generate my clips"}
              />
            </div>
          </div>

          <div className="card p-5">
            <div className="eyebrow">Accepted platforms</div>
            <div className="mt-3">
              <PlatformPills platforms={campaign.platforms} />
            </div>
          </div>

          <div className="card p-5">
            <div className="eyebrow">Top clippers here</div>
            {contributors.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Nobody has claimed this yet.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {contributors.map((entry, i) => (
                  <li key={entry.clipper.id} className="flex items-center gap-3">
                    <span className="w-4 text-xs font-bold text-faint tabular">
                      {i + 1}
                    </span>
                    <span aria-hidden>{entry.clipper.avatarEmoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {entry.clipper.displayName}
                      </div>
                      <div className="text-[11px] text-faint">
                        {entry.clipCount} clips
                      </div>
                    </div>
                    <span className="text-sm font-semibold tabular">
                      {formatViews(entry.views)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium tabular">{value}</dd>
    </div>
  );
}

// Reads live marketplace data — never prerender this at build time.
export const dynamic = "force-dynamic";
