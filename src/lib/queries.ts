import { db } from "./db";
import type {
  BrandStats,
  Campaign,
  Clip,
  ClipperStats,
  LeaderboardEntry,
  Payout,
  Profile,
} from "./types";

/**
 * Read models for the pages. Everything here is derived from whole-table reads
 * so the demo store and Postgres return identical numbers.
 *
 * One rule worth knowing: a campaign's `spent` is always recomputed from the
 * earnings of its clips rather than trusted from the row. Spend and clip
 * earnings can never disagree on a dashboard that way.
 */

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const round2 = (n: number) => Math.round(n * 100) / 100;

function withComputedSpend(campaign: Campaign, clips: Clip[]): Campaign {
  const spent = sum(
    clips.filter((c) => c.campaignId === campaign.id).map((c) => c.earnings),
  );
  return { ...campaign, spent: round2(spent) };
}

export async function getProfile(id: string): Promise<Profile | null> {
  const profiles = await db.profiles();
  return profiles.find((p) => p.id === id) ?? null;
}

export async function getProfileMap(): Promise<Map<string, Profile>> {
  const profiles = await db.profiles();
  return new Map(profiles.map((p) => [p.id, p]));
}

export interface CampaignFilter {
  brandId?: string;
  status?: Campaign["status"] | Campaign["status"][];
  platform?: string;
  search?: string;
}

export async function listCampaigns(
  filter: CampaignFilter = {},
): Promise<Campaign[]> {
  const [campaigns, clips] = await Promise.all([db.campaigns(), db.clips()]);
  const statuses = filter.status
    ? Array.isArray(filter.status)
      ? filter.status
      : [filter.status]
    : null;
  const needle = filter.search?.trim().toLowerCase();

  return campaigns
    .filter((c) => (filter.brandId ? c.brandId === filter.brandId : true))
    .filter((c) => (statuses ? statuses.includes(c.status) : true))
    .filter((c) =>
      filter.platform
        ? c.platforms.includes(filter.platform as Campaign["platforms"][number])
        : true,
    )
    .filter((c) =>
      needle
        ? c.title.toLowerCase().includes(needle) ||
          c.description.toLowerCase().includes(needle)
        : true,
    )
    .map((c) => withComputedSpend(c, clips))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  const [campaigns, clips] = await Promise.all([db.campaigns(), db.clips()]);
  const campaign = campaigns.find((c) => c.id === id);
  return campaign ? withComputedSpend(campaign, clips) : null;
}

export async function listClips(
  filter: { campaignId?: string; clipperId?: string; status?: Clip["status"] } = {},
): Promise<Clip[]> {
  const clips = await db.clips();
  return clips
    .filter((c) => (filter.campaignId ? c.campaignId === filter.campaignId : true))
    .filter((c) => (filter.clipperId ? c.clipperId === filter.clipperId : true))
    .filter((c) => (filter.status ? c.status === filter.status : true))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export async function listPayouts(clipperId?: string): Promise<Payout[]> {
  const payouts = await db.payouts();
  return payouts
    .filter((p) => (clipperId ? p.clipperId === clipperId : true))
    .sort((a, b) => Date.parse(b.requestedAt) - Date.parse(a.requestedAt));
}

// ---------------------------------------------------------------------------
// Brand side
// ---------------------------------------------------------------------------

export async function getBrandStats(brandId: string): Promise<BrandStats> {
  const [campaigns, clips] = await Promise.all([db.campaigns(), db.clips()]);
  const mine = campaigns.filter((c) => c.brandId === brandId);
  const ids = new Set(mine.map((c) => c.id));
  const myClips = clips.filter((c) => ids.has(c.campaignId));
  const posted = myClips.filter((c) => c.status === "posted");

  const totalViews = sum(posted.map((c) => c.views));
  const totalSpent = round2(sum(myClips.map((c) => c.earnings)));

  return {
    totalViews,
    totalSpent,
    totalBudget: round2(sum(mine.map((c) => c.budget))),
    activeCampaigns: mine.filter((c) => c.status === "active").length,
    clipCount: myClips.length,
    clipperCount: new Set(myClips.map((c) => c.clipperId)).size,
    costPerThousandViews:
      totalViews > 0 ? round2(totalSpent / (totalViews / 1000)) : 0,
  };
}

export interface ClipperContribution {
  clipper: Profile;
  views: number;
  earnings: number;
  clipCount: number;
}

/** Top clippers on a brand's campaigns — or on one campaign if scoped. */
export async function getTopContributors(
  opts: { brandId?: string; campaignId?: string; limit?: number },
): Promise<ClipperContribution[]> {
  const [campaigns, clips, profiles] = await Promise.all([
    db.campaigns(),
    db.clips(),
    db.profiles(),
  ]);
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  const scopedCampaignIds = new Set(
    campaigns
      .filter((c) => (opts.brandId ? c.brandId === opts.brandId : true))
      .filter((c) => (opts.campaignId ? c.id === opts.campaignId : true))
      .map((c) => c.id),
  );

  const buckets = new Map<string, ClipperContribution>();
  for (const clip of clips) {
    if (!scopedCampaignIds.has(clip.campaignId)) continue;
    const clipper = profileMap.get(clip.clipperId);
    if (!clipper) continue;
    const entry = buckets.get(clip.clipperId) ?? {
      clipper,
      views: 0,
      earnings: 0,
      clipCount: 0,
    };
    entry.views += clip.views;
    entry.earnings += clip.earnings;
    entry.clipCount += 1;
    buckets.set(clip.clipperId, entry);
  }

  return [...buckets.values()]
    .map((e) => ({ ...e, earnings: round2(e.earnings) }))
    .sort((a, b) => b.views - a.views)
    .slice(0, opts.limit ?? 5);
}

// ---------------------------------------------------------------------------
// Clipper side
// ---------------------------------------------------------------------------

export async function getClipperStats(clipperId: string): Promise<ClipperStats> {
  const [clips, payouts] = await Promise.all([db.clips(), db.payouts()]);
  const mine = clips.filter((c) => c.clipperId === clipperId);
  const posted = mine.filter((c) => c.status === "posted");
  const myPayouts = payouts.filter((p) => p.clipperId === clipperId);

  const lifetimeEarnings = round2(sum(mine.map((c) => c.earnings)));
  // Anything requested, processing, or already paid is off the table.
  const claimed = round2(
    sum(myPayouts.filter((p) => p.status !== "failed").map((p) => p.amount)),
  );
  // Clips posted in the last 14 days are still settling with the platforms.
  const cutoff = Date.now() - 14 * 86_400_000;
  const pendingEarnings = round2(
    sum(
      posted
        .filter((c) => c.postedAt && Date.parse(c.postedAt) > cutoff)
        .map((c) => c.earnings),
    ),
  );

  return {
    totalViews: sum(posted.map((c) => c.views)),
    lifetimeEarnings,
    pendingEarnings,
    availableBalance: Math.max(0, round2(lifetimeEarnings - claimed - pendingEarnings)),
    activeCampaigns: new Set(
      mine.filter((c) => c.status !== "rejected").map((c) => c.campaignId),
    ).size,
    postedClips: posted.length,
  };
}

export async function getLeaderboard(limit = 25): Promise<LeaderboardEntry[]> {
  const [clips, profiles] = await Promise.all([db.clips(), db.profiles()]);
  const clippers = profiles.filter((p) => p.role === "clipper");

  return clippers
    .map((clipper) => {
      const mine = clips.filter((c) => c.clipperId === clipper.id);
      const posted = mine.filter((c) => c.status === "posted");
      const totalViews = sum(posted.map((c) => c.views));
      return {
        clipper,
        totalViews,
        totalEarnings: round2(sum(mine.map((c) => c.earnings))),
        clipCount: posted.length,
        campaignCount: new Set(mine.map((c) => c.campaignId)).size,
        avgViewsPerClip: posted.length ? Math.round(totalViews / posted.length) : 0,
      };
    })
    .filter((e) => e.clipCount > 0)
    .sort((a, b) => b.totalViews - a.totalViews)
    .slice(0, limit);
}

/** Per-campaign roll-up used on cards and detail headers. */
export interface CampaignMetrics {
  views: number;
  clipCount: number;
  clipperCount: number;
  budgetUsedPct: number;
  remainingBudget: number;
}

export async function getCampaignMetrics(
  campaignId: string,
): Promise<CampaignMetrics> {
  const [campaigns, clips] = await Promise.all([db.campaigns(), db.clips()]);
  const campaign = campaigns.find((c) => c.id === campaignId);
  const mine = clips.filter((c) => c.campaignId === campaignId);
  const spent = sum(mine.map((c) => c.earnings));
  const budget = campaign?.budget ?? 0;

  return {
    views: sum(mine.map((c) => c.views)),
    clipCount: mine.length,
    clipperCount: new Set(mine.map((c) => c.clipperId)).size,
    budgetUsedPct: budget > 0 ? Math.min(100, (spent / budget) * 100) : 0,
    remainingBudget: round2(Math.max(0, budget - spent)),
  };
}

/** Batched variant so campaign lists don't re-read the tables per card. */
export async function getMetricsForCampaigns(
  campaignIds: string[],
): Promise<Map<string, CampaignMetrics>> {
  const [campaigns, clips] = await Promise.all([db.campaigns(), db.clips()]);
  const byId = new Map(campaigns.map((c) => [c.id, c]));
  const out = new Map<string, CampaignMetrics>();

  for (const id of campaignIds) {
    const mine = clips.filter((c) => c.campaignId === id);
    const spent = sum(mine.map((c) => c.earnings));
    const budget = byId.get(id)?.budget ?? 0;
    out.set(id, {
      views: sum(mine.map((c) => c.views)),
      clipCount: mine.length,
      clipperCount: new Set(mine.map((c) => c.clipperId)).size,
      budgetUsedPct: budget > 0 ? Math.min(100, (spent / budget) * 100) : 0,
      remainingBudget: round2(Math.max(0, budget - spent)),
    });
  }

  return out;
}
