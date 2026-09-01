/**
 * Domain model for the ClipRewards marketplace.
 *
 * These mirror the tables in `supabase/schema.sql` one-to-one. Keys are
 * camelCase here and snake_case in Postgres; the mapping lives in
 * `src/lib/db/mappers.ts`.
 */

export type UserRole = "brand" | "clipper";

export type Platform = "tiktok" | "instagram" | "youtube" | "x";

export const PLATFORMS: Platform[] = ["tiktok", "instagram", "youtube", "x"];

export const PLATFORM_LABEL: Record<Platform, string> = {
  tiktok: "TikTok",
  instagram: "Reels",
  youtube: "Shorts",
  x: "X",
};

export type CampaignStatus = "draft" | "active" | "paused" | "completed";

export type ClipStatus =
  | "generating" // AI job queued or running
  | "ready" // generated, awaiting clipper review
  | "scheduled" // clipper approved + queued to post
  | "posted" // live on a platform, accruing views
  | "rejected"; // clipper or brand discarded it

export type PayoutStatus = "requested" | "processing" | "paid" | "failed";

export interface Profile {
  id: string;
  role: UserRole;
  handle: string;
  displayName: string;
  avatarEmoji: string;
  bio: string | null;
  /** Brand-only. */
  website: string | null;
  createdAt: string;
}

export interface Campaign {
  id: string;
  brandId: string;
  title: string;
  description: string;
  /** Long-form source the clippers cut from. */
  sourceUrl: string;
  sourceThumbnail: string | null;
  sourceDurationSeconds: number;
  /** Dollars paid per 1,000 verified views. */
  ratePerThousand: number;
  budget: number;
  spent: number;
  /** Hard ceiling on what any single clipper can earn from this campaign. */
  maxPayoutPerClipper: number | null;
  minViewsToQualify: number;
  platforms: Platform[];
  guidelines: string[];
  status: CampaignStatus;
  endsAt: string | null;
  createdAt: string;
}

export interface Clip {
  id: string;
  campaignId: string;
  clipperId: string;
  title: string;
  /** Offsets into the campaign's source video. */
  startSeconds: number;
  endSeconds: number;
  thumbnail: string | null;
  captionText: string | null;
  /** 0–100, how strongly the AI rated this moment as a hook. */
  hookScore: number;
  status: ClipStatus;
  platform: Platform | null;
  postUrl: string | null;
  scheduledFor: string | null;
  postedAt: string | null;
  views: number;
  likes: number;
  earnings: number;
  createdAt: string;
}

export interface Payout {
  id: string;
  clipperId: string;
  amount: number;
  status: PayoutStatus;
  method: string;
  requestedAt: string;
  paidAt: string | null;
  reference: string | null;
}

/** A clipper's aggregate standing, computed from their posted clips. */
export interface LeaderboardEntry {
  clipper: Profile;
  totalViews: number;
  totalEarnings: number;
  clipCount: number;
  campaignCount: number;
  avgViewsPerClip: number;
}

export interface BrandStats {
  totalViews: number;
  totalSpent: number;
  totalBudget: number;
  activeCampaigns: number;
  clipCount: number;
  clipperCount: number;
  costPerThousandViews: number;
}

export interface ClipperStats {
  totalViews: number;
  lifetimeEarnings: number;
  pendingEarnings: number;
  availableBalance: number;
  activeCampaigns: number;
  postedClips: number;
}

export interface NewCampaignInput {
  brandId: string;
  title: string;
  description: string;
  sourceUrl: string;
  sourceDurationSeconds: number;
  ratePerThousand: number;
  budget: number;
  maxPayoutPerClipper: number | null;
  minViewsToQualify: number;
  platforms: Platform[];
  guidelines: string[];
  status: CampaignStatus;
  endsAt: string | null;
}
