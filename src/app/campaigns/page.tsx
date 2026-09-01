import type { Metadata } from "next";
import Link from "next/link";

import { CampaignCard } from "@/components/campaign-card";
import { EmptyState } from "@/components/ui";
import { formatMoneyWhole } from "@/lib/format";
import {
  getMetricsForCampaigns,
  getProfileMap,
  listCampaigns,
} from "@/lib/queries";
import { PLATFORMS, PLATFORM_LABEL, type Platform } from "@/lib/types";

export const metadata: Metadata = {
  title: "Browse campaigns",
  description: "Funded clip campaigns accepting clippers right now.",
};

type SortKey = "rate" | "budget" | "views" | "newest";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "rate", label: "Highest rate" },
  { key: "budget", label: "Most budget left" },
  { key: "views", label: "Most views" },
  { key: "newest", label: "Newest" },
];

export default async function BrowseCampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string; sort?: string; q?: string }>;
}) {
  const params = await searchParams;
  const platform = PLATFORMS.includes(params.platform as Platform)
    ? (params.platform as Platform)
    : undefined;
  const sort = (SORTS.find((s) => s.key === params.sort)?.key ?? "rate") as SortKey;
  const search = params.q?.trim() || undefined;

  const [campaigns, profiles] = await Promise.all([
    listCampaigns({ status: ["active", "paused"], platform, search }),
    getProfileMap(),
  ]);

  const metrics = await getMetricsForCampaigns(campaigns.map((c) => c.id));

  const sorted = [...campaigns].sort((a, b) => {
    const ma = metrics.get(a.id);
    const mb = metrics.get(b.id);
    switch (sort) {
      case "budget":
        return (mb?.remainingBudget ?? 0) - (ma?.remainingBudget ?? 0);
      case "views":
        return (mb?.views ?? 0) - (ma?.views ?? 0);
      case "newest":
        return Date.parse(b.createdAt) - Date.parse(a.createdAt);
      default:
        return b.ratePerThousand - a.ratePerThousand;
    }
  });

  const totalOpen = campaigns.reduce(
    (t, c) => t + (metrics.get(c.id)?.remainingBudget ?? 0),
    0,
  );

  const buildHref = (next: Partial<{ platform: string; sort: string; q: string }>) => {
    const sp = new URLSearchParams();
    const merged = { platform, sort, q: search, ...next };
    if (merged.platform) sp.set("platform", merged.platform);
    if (merged.sort && merged.sort !== "rate") sp.set("sort", merged.sort);
    if (merged.q) sp.set("q", merged.q);
    const qs = sp.toString();
    return qs ? `/campaigns?${qs}` : "/campaigns";
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
      <header className="mb-8">
        <span className="eyebrow">Marketplace</span>
        <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">
          Campaigns accepting clips
        </h1>
        <p className="mt-3 text-muted">
          {campaigns.length} campaigns ·{" "}
          <span className="text-lime font-medium">
            {formatMoneyWhole(totalOpen)}
          </span>{" "}
          of unspent budget on the table
        </p>
      </header>

      {/* Filters */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={buildHref({ platform: "" })}
            className={`chip ${!platform ? "border-lime/50 text-lime" : ""}`}
          >
            All platforms
          </Link>
          {PLATFORMS.map((p) => (
            <Link
              key={p}
              href={buildHref({ platform: p })}
              className={`chip ${platform === p ? "border-lime/50 text-lime" : ""}`}
            >
              {PLATFORM_LABEL[p]}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-faint">Sort</span>
          {SORTS.map((s) => (
            <Link
              key={s.key}
              href={buildHref({ sort: s.key })}
              className={`chip ${sort === s.key ? "border-lime/50 text-lime" : ""}`}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          title="Nothing matches that filter"
          description="Try a different platform, or clear the filters to see every funded campaign."
          action={
            <Link href="/campaigns" className="btn btn-secondary">
              Clear filters
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              brand={profiles.get(campaign.brandId)}
              metrics={
                metrics.get(campaign.id) ?? {
                  views: 0,
                  clipCount: 0,
                  clipperCount: 0,
                  budgetUsedPct: 0,
                  remainingBudget: campaign.budget,
                }
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Reads live marketplace data — never prerender this at build time.
export const dynamic = "force-dynamic";
