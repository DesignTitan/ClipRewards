import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CampaignControls } from "@/components/campaign-controls";
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
  formatMoney,
  formatMoneyWhole,
  formatNumber,
  formatRate,
  formatShortDate,
  formatTimecode,
  formatViews,
  timeUntil,
} from "@/lib/format";
import {
  getCampaign,
  getCampaignMetrics,
  getProfileMap,
  getTopContributors,
  listClips,
} from "@/lib/queries";
import { getCurrentBrand } from "@/lib/session";
import { PLATFORM_LABEL } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const campaign = await getCampaign(id);
  return { title: campaign ? `${campaign.title} — manage` : "Campaign not found" };
}

export default async function BrandCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [campaign, brand] = await Promise.all([getCampaign(id), getCurrentBrand()]);
  if (!campaign) notFound();

  if (!brand || campaign.brandId !== brand.id) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <EmptyState
          title="Not your campaign"
          description="This campaign belongs to another brand. You can still view it from the public marketplace."
          action={
            <Link href={`/campaigns/${campaign.id}`} className="btn btn-secondary">
              View public page
            </Link>
          }
        />
      </div>
    );
  }

  const [metrics, clips, contributors, profiles] = await Promise.all([
    getCampaignMetrics(campaign.id),
    listClips({ campaignId: campaign.id }),
    getTopContributors({ campaignId: campaign.id, limit: 10 }),
    getProfileMap(),
  ]);

  const posted = clips.filter((c) => c.status === "posted");
  const awaiting = clips.filter(
    (c) => c.status === "ready" || c.status === "scheduled" || c.status === "generating",
  );
  const avgViews = posted.length
    ? Math.round(posted.reduce((t, c) => t + c.views, 0) / posted.length)
    : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <nav className="mb-6 text-sm text-faint" aria-label="Breadcrumb">
        <Link href="/brand" className="hover:text-muted">
          Brand dashboard
        </Link>
        <span className="mx-2" aria-hidden>
          /
        </span>
        <span className="text-muted">{campaign.title}</span>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={campaign.status} kind="campaign" />
            <span className="text-sm text-muted">
              {campaign.endsAt ? timeUntil(campaign.endsAt) : "Open-ended"} ·
              created {formatShortDate(campaign.createdAt)}
            </span>
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">
            {campaign.title}
          </h1>
          <p className="mt-3 max-w-2xl text-muted leading-relaxed">
            {campaign.description}
          </p>
          <div className="mt-4">
            <PlatformPills platforms={campaign.platforms} />
          </div>
        </div>

        <Link href={`/campaigns/${campaign.id}`} className="btn btn-secondary">
          View public page
        </Link>
      </header>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Views delivered"
          value={formatViews(metrics.views)}
          sub={`${formatViews(avgViews)} average per clip`}
        />
        <StatCard
          label="Spent"
          value={formatMoneyWhole(campaign.spent)}
          accent="lime"
          sub={`${formatMoneyWhole(metrics.remainingBudget)} remaining`}
        />
        <StatCard
          label="Rate"
          value={formatRate(campaign.ratePerThousand)}
          sub={`${formatNumber(campaign.minViewsToQualify)} views to qualify`}
        />
        <StatCard
          label="Clips"
          value={String(metrics.clipCount)}
          accent="violet"
          sub={`${posted.length} posted · ${awaiting.length} in progress`}
        />
      </div>

      <div className="mt-6 card p-5">
        <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm">
          <span className="text-muted">Budget consumed</span>
          <span className="tabular font-medium">
            {formatMoneyWhole(campaign.spent)} of{" "}
            {formatMoneyWhole(campaign.budget)}
          </span>
        </div>
        <ProgressBar
          value={metrics.budgetUsedPct}
          tone={metrics.budgetUsedPct > 85 ? "amber" : "lime"}
          label="Budget consumed"
        />
        <div className="mt-5 border-t border-line-soft pt-5">
          <CampaignControls campaign={campaign} />
        </div>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_320px] lg:items-start">
        <section>
          <SectionHeading
            title="All clips"
            description="Every clip generated against this campaign, whoever made it."
          />

          {clips.length === 0 ? (
            <EmptyState
              title="No clips yet"
              description="Clippers will start generating as soon as the campaign is live and discoverable."
            />
          ) : (
            <div className="card overflow-hidden">
              <div className="hidden md:grid grid-cols-[4rem_1fr_7rem_6rem_6rem_6rem] gap-3 border-b border-line-soft px-4 py-3 text-[11px] uppercase tracking-wider text-faint">
                <span>Clip</span>
                <span>Title / clipper</span>
                <span>Status</span>
                <span className="text-right">Views</span>
                <span className="text-right">Cost</span>
                <span className="text-right">Posted</span>
              </div>

              <ul className="divide-y divide-[var(--color-line-soft)]">
                {clips.map((clip) => (
                  <li
                    key={clip.id}
                    className="grid grid-cols-[3rem_1fr_auto] md:grid-cols-[4rem_1fr_7rem_6rem_6rem_6rem] items-center gap-3 px-4 py-3"
                  >
                    <Thumb
                      seed={clip.id}
                      ratio="9/16"
                      className="w-10 md:w-12"
                      durationSeconds={clip.endSeconds - clip.startSeconds}
                    />

                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{clip.title}</div>
                      <div className="truncate text-xs text-faint">
                        {profiles.get(clip.clipperId)?.displayName ?? "Clipper"} ·{" "}
                        {formatTimecode(clip.startSeconds)}–
                        {formatTimecode(clip.endSeconds)}
                        {clip.platform ? ` · ${PLATFORM_LABEL[clip.platform]}` : ""}
                      </div>
                      <div className="mt-1.5 md:hidden">
                        <StatusBadge status={clip.status} kind="clip" />
                      </div>
                    </div>

                    <div className="hidden md:block">
                      <StatusBadge status={clip.status} kind="clip" />
                    </div>

                    <div className="text-right text-sm tabular">
                      <span className="md:hidden text-xs text-faint">views </span>
                      {formatViews(clip.views)}
                    </div>

                    <div className="hidden md:block text-right text-sm font-medium text-lime tabular">
                      {formatMoney(clip.earnings)}
                    </div>

                    <div className="hidden md:block text-right text-xs text-faint">
                      {clip.postedAt ? formatShortDate(clip.postedAt) : "—"}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <aside className="space-y-4 lg:sticky lg:top-20">
          <div className="card p-5">
            <div className="eyebrow">Top clippers</div>
            {contributors.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No clippers yet.</p>
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
                        {entry.clipCount} clips · {formatMoney(entry.earnings)}
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

          <div className="card p-5">
            <div className="eyebrow">Guidelines</div>
            <ul className="mt-3 space-y-2">
              {campaign.guidelines.map((rule) => (
                <li key={rule} className="text-xs text-muted leading-relaxed">
                  · {rule}
                </li>
              ))}
            </ul>
          </div>

          <div className="card p-5">
            <div className="eyebrow">Source</div>
            <div className="mt-3">
              <Thumb
                seed={campaign.id}
                durationSeconds={campaign.sourceDurationSeconds}
              />
            </div>
            <p className="mt-2 break-all text-xs text-faint">{campaign.sourceUrl}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

// Reads live marketplace data — never prerender this at build time.
export const dynamic = "force-dynamic";
