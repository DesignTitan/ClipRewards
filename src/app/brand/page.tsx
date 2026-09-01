import type { Metadata } from "next";
import Link from "next/link";

import {
  EmptyState,
  ProgressBar,
  SectionHeading,
  StatCard,
  StatusBadge,
  Thumb,
} from "@/components/ui";
import {
  formatMoney,
  formatMoneyWhole,
  formatRate,
  formatViews,
  timeAgo,
  timeUntil,
} from "@/lib/format";
import {
  getBrandStats,
  getMetricsForCampaigns,
  getProfileMap,
  getTopContributors,
  listCampaigns,
  listClips,
} from "@/lib/queries";
import { getCurrentBrand } from "@/lib/session";

export const metadata: Metadata = {
  title: "Brand dashboard",
  description: "Track views, spend, and top clippers across your campaigns.",
};

export default async function BrandDashboardPage() {
  const brand = await getCurrentBrand();
  if (!brand) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <EmptyState
          title="No brand account"
          description="Sign in with a brand profile to see this dashboard."
        />
      </div>
    );
  }

  const [stats, campaigns, contributors, profiles] = await Promise.all([
    getBrandStats(brand.id),
    listCampaigns({ brandId: brand.id }),
    getTopContributors({ brandId: brand.id, limit: 6 }),
    getProfileMap(),
  ]);

  const metrics = await getMetricsForCampaigns(campaigns.map((c) => c.id));
  const campaignIds = new Set(campaigns.map((c) => c.id));
  const allClips = await listClips();
  const recentClips = allClips
    .filter((c) => campaignIds.has(c.campaignId) && c.status === "posted")
    .sort((a, b) => b.views - a.views)
    .slice(0, 6);

  const campaignTitle = (id: string) =>
    campaigns.find((c) => c.id === id)?.title ?? "Campaign";

  return (
    <div>
      <header className="relative overflow-hidden border-b border-line-soft">
        <div className="absolute inset-0 aurora opacity-70" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="eyebrow">Brand dashboard</span>
              <h1 className="mt-2 flex items-center gap-3 text-3xl font-bold tracking-tight">
                <span aria-hidden>{brand.avatarEmoji}</span>
                {brand.displayName}
              </h1>
              <p className="mt-2 max-w-xl text-sm text-muted">{brand.bio}</p>
            </div>
            <Link href="/brand/campaigns/new" className="btn btn-primary">
              New campaign
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-12">
        {/* Stats --------------------------------------------------------- */}
        <section>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total views"
              value={formatViews(stats.totalViews)}
              sub={`across ${stats.clipCount} clips`}
            />
            <StatCard
              label="Total spend"
              value={formatMoneyWhole(stats.totalSpent)}
              accent="lime"
              sub={`of ${formatMoneyWhole(stats.totalBudget)} committed`}
            />
            <StatCard
              label="Effective CPM"
              value={formatMoney(stats.costPerThousandViews)}
              accent="violet"
              sub="cost per 1,000 views delivered"
            />
            <StatCard
              label="Clippers working"
              value={String(stats.clipperCount)}
              sub={`${stats.activeCampaigns} active campaigns`}
            />
          </div>
        </section>

        {/* Budget -------------------------------------------------------- */}
        <section id="budget">
          <SectionHeading
            title="Budget & spend"
            description="Spend is settled from verified views. Nothing is charged past a campaign's budget."
            id="budget"
          />
          <div className="card p-5 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="eyebrow">Committed</div>
                <div className="mt-1 text-2xl font-bold tabular">
                  {formatMoneyWhole(stats.totalBudget)}
                </div>
              </div>
              <div>
                <div className="eyebrow">Spent</div>
                <div className="mt-1 text-2xl font-bold text-lime tabular">
                  {formatMoneyWhole(stats.totalSpent)}
                </div>
              </div>
              <div>
                <div className="eyebrow">Remaining</div>
                <div className="mt-1 text-2xl font-bold tabular">
                  {formatMoneyWhole(
                    Math.max(0, stats.totalBudget - stats.totalSpent),
                  )}
                </div>
              </div>
            </div>
            <div className="mt-5">
              <ProgressBar
                value={
                  stats.totalBudget > 0
                    ? (stats.totalSpent / stats.totalBudget) * 100
                    : 0
                }
                label="Total budget used"
              />
            </div>
          </div>
        </section>

        {/* Campaigns ----------------------------------------------------- */}
        <section>
          <SectionHeading
            title="Your campaigns"
            description={`${campaigns.length} total`}
            action={
              <Link href="/brand/campaigns/new" className="btn btn-secondary">
                Create campaign
              </Link>
            }
          />

          {campaigns.length === 0 ? (
            <EmptyState
              title="No campaigns yet"
              description="Fund your first campaign and clippers can start cutting within minutes."
              action={
                <Link href="/brand/campaigns/new" className="btn btn-primary">
                  Create a campaign
                </Link>
              }
            />
          ) : (
            <div className="card divide-y divide-[var(--color-line-soft)] overflow-hidden">
              {campaigns.map((campaign) => {
                const m = metrics.get(campaign.id);
                return (
                  <Link
                    key={campaign.id}
                    href={`/brand/campaigns/${campaign.id}`}
                    className="flex flex-wrap items-center gap-4 px-4 sm:px-5 py-4 hover:bg-surface-2 transition-colors"
                  >
                    <Thumb
                      seed={campaign.id}
                      className="w-24 shrink-0"
                      durationSeconds={campaign.sourceDurationSeconds}
                    />

                    <div className="min-w-[12rem] flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold">{campaign.title}</h3>
                        <StatusBadge status={campaign.status} kind="campaign" />
                      </div>
                      <div className="mt-1 text-xs text-faint">
                        {formatRate(campaign.ratePerThousand)} ·{" "}
                        {m?.clipCount ?? 0} clips · {m?.clipperCount ?? 0} clippers ·{" "}
                        {campaign.endsAt ? timeUntil(campaign.endsAt) : "open-ended"}
                      </div>
                      <div className="mt-2.5 max-w-sm">
                        <ProgressBar
                          value={m?.budgetUsedPct ?? 0}
                          tone={(m?.budgetUsedPct ?? 0) > 85 ? "amber" : "lime"}
                          label={`${campaign.title} budget`}
                        />
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-semibold tabular">
                        {formatViews(m?.views ?? 0)}
                      </div>
                      <div className="text-[11px] text-faint">views</div>
                    </div>

                    <div className="w-28 text-right">
                      <div className="text-sm font-semibold text-lime tabular">
                        {formatMoneyWhole(campaign.spent)}
                      </div>
                      <div className="text-[11px] text-faint">
                        of {formatMoneyWhole(campaign.budget)}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Top clippers -------------------------------------------------- */}
        <section>
          <SectionHeading
            title="Top clippers"
            description="Who is actually moving your numbers."
          />
          {contributors.length === 0 ? (
            <EmptyState
              title="No clippers yet"
              description="Once a campaign goes live, clippers who claim it will show up here."
            />
          ) : (
            <div className="card divide-y divide-[var(--color-line-soft)] overflow-hidden">
              {contributors.map((entry, i) => (
                <div
                  key={entry.clipper.id}
                  className="flex items-center gap-4 px-4 sm:px-5 py-3.5"
                >
                  <span className="w-5 text-sm font-bold text-faint tabular">
                    {i + 1}
                  </span>
                  <span className="text-lg" aria-hidden>
                    {entry.clipper.avatarEmoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">
                      {entry.clipper.displayName}
                    </div>
                    <div className="truncate text-xs text-faint">
                      @{entry.clipper.handle} · {entry.clipCount} clips
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold tabular">
                      {formatViews(entry.views)}
                    </div>
                    <div className="text-[11px] text-faint">views</div>
                  </div>
                  <div className="w-24 text-right">
                    <div className="text-sm font-semibold text-lime tabular">
                      {formatMoney(entry.earnings)}
                    </div>
                    <div className="text-[11px] text-faint">paid</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent clips -------------------------------------------------- */}
        <section>
          <SectionHeading
            title="Best performing clips"
            description="Live posts across all of your campaigns."
          />
          {recentClips.length === 0 ? (
            <EmptyState
              title="Nothing posted yet"
              description="Clips appear here as soon as clippers publish them."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recentClips.map((clip) => (
                <div key={clip.id} className="card p-4">
                  <div className="flex gap-3">
                    <Thumb
                      seed={clip.id}
                      ratio="9/16"
                      className="w-16 shrink-0"
                      durationSeconds={clip.endSeconds - clip.startSeconds}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11px] text-faint">
                        {campaignTitle(clip.campaignId)}
                      </div>
                      <h3 className="mt-0.5 text-sm font-semibold leading-snug line-clamp-2">
                        {clip.title}
                      </h3>
                      <div className="mt-1.5 text-xs text-muted">
                        {profiles.get(clip.clipperId)?.displayName ?? "Clipper"}
                        {clip.postedAt ? ` · ${timeAgo(clip.postedAt)}` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line-soft pt-3 text-center">
                    <Mini label="views" value={formatViews(clip.views)} />
                    <Mini label="likes" value={formatViews(clip.likes)} />
                    <Mini label="cost" value={formatMoney(clip.earnings)} accent />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Mini({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <div
        className={`text-sm font-semibold tabular ${accent ? "text-lime" : "text-text"}`}
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-faint">{label}</div>
    </div>
  );
}

// Reads live marketplace data — never prerender this at build time.
export const dynamic = "force-dynamic";
