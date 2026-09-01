import {
  DEMO_CAMPAIGNS,
  DEMO_CLIPS,
  DEMO_PAYOUTS,
  DEMO_PROFILES,
} from "./demo-data";
import { isSupabaseConfigured } from "./supabase/config";
import { createSupabaseServerClient } from "./supabase/server";
import type { Campaign, Clip, Payout, Profile } from "./types";

/**
 * The single seam between the app and its storage.
 *
 * Two implementations satisfy it: an in-memory demo store (default) and
 * Supabase/Postgres (used as soon as the public env vars are set). Every
 * aggregation in `src/lib/queries.ts` is written against this interface, so
 * flipping between them changes nothing above this file.
 *
 * Reads pull whole tables. That is deliberate at this size — it keeps the two
 * implementations tiny and the aggregation logic shared. `supabase/schema.sql`
 * ships the equivalent SQL views for when the tables outgrow it.
 */
export interface DataSource {
  profiles(): Promise<Profile[]>;
  campaigns(): Promise<Campaign[]>;
  clips(): Promise<Clip[]>;
  payouts(): Promise<Payout[]>;
  insertCampaign(campaign: Campaign): Promise<Campaign>;
  updateCampaign(id: string, patch: Partial<Campaign>): Promise<Campaign | null>;
  insertClips(clips: Clip[]): Promise<Clip[]>;
  updateClip(id: string, patch: Partial<Clip>): Promise<Clip | null>;
  insertPayout(payout: Payout): Promise<Payout>;
}

// ---------------------------------------------------------------------------
// Demo store
// ---------------------------------------------------------------------------

interface DemoStore {
  profiles: Profile[];
  campaigns: Campaign[];
  clips: Clip[];
  payouts: Payout[];
}

// Survives HMR in dev so a campaign you just created doesn't vanish on save.
const globalForDemo = globalThis as unknown as { __clipRewardsDemo?: DemoStore };

function demoStore(): DemoStore {
  globalForDemo.__clipRewardsDemo ??= {
    profiles: DEMO_PROFILES.map((p) => ({ ...p })),
    campaigns: DEMO_CAMPAIGNS.map((c) => ({ ...c })),
    clips: DEMO_CLIPS.map((c) => ({ ...c })),
    payouts: DEMO_PAYOUTS.map((p) => ({ ...p })),
  };
  return globalForDemo.__clipRewardsDemo;
}

const demoSource: DataSource = {
  async profiles() {
    return demoStore().profiles;
  },
  async campaigns() {
    return demoStore().campaigns;
  },
  async clips() {
    return demoStore().clips;
  },
  async payouts() {
    return demoStore().payouts;
  },
  async insertCampaign(campaign) {
    demoStore().campaigns.unshift(campaign);
    return campaign;
  },
  async updateCampaign(id, patch) {
    const store = demoStore();
    const index = store.campaigns.findIndex((c) => c.id === id);
    if (index === -1) return null;
    store.campaigns[index] = { ...store.campaigns[index], ...patch };
    return store.campaigns[index];
  },
  async insertClips(clips) {
    demoStore().clips.unshift(...clips);
    return clips;
  },
  async updateClip(id, patch) {
    const store = demoStore();
    const index = store.clips.findIndex((c) => c.id === id);
    if (index === -1) return null;
    store.clips[index] = { ...store.clips[index], ...patch };
    return store.clips[index];
  },
  async insertPayout(payout) {
    demoStore().payouts.unshift(payout);
    return payout;
  },
};

// ---------------------------------------------------------------------------
// Supabase row mapping
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */

const toProfile = (r: any): Profile => ({
  id: r.id,
  role: r.role,
  handle: r.handle,
  displayName: r.display_name,
  avatarEmoji: r.avatar_emoji ?? "🎬",
  bio: r.bio,
  website: r.website,
  createdAt: r.created_at,
});

const toCampaign = (r: any): Campaign => ({
  id: r.id,
  brandId: r.brand_id,
  title: r.title,
  description: r.description ?? "",
  sourceUrl: r.source_url,
  sourceThumbnail: r.source_thumbnail,
  sourceDurationSeconds: r.source_duration_seconds ?? 0,
  ratePerThousand: Number(r.rate_per_thousand),
  budget: Number(r.budget),
  spent: Number(r.spent ?? 0),
  maxPayoutPerClipper:
    r.max_payout_per_clipper === null ? null : Number(r.max_payout_per_clipper),
  minViewsToQualify: r.min_views_to_qualify ?? 0,
  platforms: r.platforms ?? [],
  guidelines: r.guidelines ?? [],
  status: r.status,
  endsAt: r.ends_at,
  createdAt: r.created_at,
});

const fromCampaign = (c: Campaign) => ({
  id: c.id,
  brand_id: c.brandId,
  title: c.title,
  description: c.description,
  source_url: c.sourceUrl,
  source_thumbnail: c.sourceThumbnail,
  source_duration_seconds: c.sourceDurationSeconds,
  rate_per_thousand: c.ratePerThousand,
  budget: c.budget,
  spent: c.spent,
  max_payout_per_clipper: c.maxPayoutPerClipper,
  min_views_to_qualify: c.minViewsToQualify,
  platforms: c.platforms,
  guidelines: c.guidelines,
  status: c.status,
  ends_at: c.endsAt,
  created_at: c.createdAt,
});

const toClip = (r: any): Clip => ({
  id: r.id,
  campaignId: r.campaign_id,
  clipperId: r.clipper_id,
  title: r.title,
  startSeconds: r.start_seconds ?? 0,
  endSeconds: r.end_seconds ?? 0,
  thumbnail: r.thumbnail,
  captionText: r.caption_text,
  hookScore: r.hook_score ?? 0,
  status: r.status,
  platform: r.platform,
  postUrl: r.post_url,
  scheduledFor: r.scheduled_for,
  postedAt: r.posted_at,
  views: r.views ?? 0,
  likes: r.likes ?? 0,
  earnings: Number(r.earnings ?? 0),
  createdAt: r.created_at,
});

const fromClip = (c: Clip) => ({
  id: c.id,
  campaign_id: c.campaignId,
  clipper_id: c.clipperId,
  title: c.title,
  start_seconds: c.startSeconds,
  end_seconds: c.endSeconds,
  thumbnail: c.thumbnail,
  caption_text: c.captionText,
  hook_score: c.hookScore,
  status: c.status,
  platform: c.platform,
  post_url: c.postUrl,
  scheduled_for: c.scheduledFor,
  posted_at: c.postedAt,
  views: c.views,
  likes: c.likes,
  earnings: c.earnings,
  created_at: c.createdAt,
});

const toPayout = (r: any): Payout => ({
  id: r.id,
  clipperId: r.clipper_id,
  amount: Number(r.amount),
  status: r.status,
  method: r.method,
  requestedAt: r.requested_at,
  paidAt: r.paid_at,
  reference: r.reference,
});

const fromPayout = (p: Payout) => ({
  id: p.id,
  clipper_id: p.clipperId,
  amount: p.amount,
  status: p.status,
  method: p.method,
  requested_at: p.requestedAt,
  paid_at: p.paidAt,
  reference: p.reference,
});

/** Turns a camelCase domain patch into a snake_case column patch. */
function patchColumns<T extends object>(
  patch: Partial<T>,
  full: (value: T) => Record<string, unknown>,
): Record<string, unknown> {
  const encoded = full(patch as T);
  const out: Record<string, unknown> = {};
  const touched = new Set(Object.keys(patch));
  // `full` produces every column; keep only the ones the caller actually set.
  const probe = full({} as T);
  for (const column of Object.keys(probe)) {
    const domainKey = column.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
    if (touched.has(domainKey)) out[column] = encoded[column];
  }
  return out;
}

/* eslint-enable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// Supabase source
// ---------------------------------------------------------------------------

const supabaseSource: DataSource = {
  async profiles() {
    const db = await createSupabaseServerClient();
    const { data, error } = await db.from("profiles").select("*");
    if (error) throw error;
    return (data ?? []).map(toProfile);
  },
  async campaigns() {
    const db = await createSupabaseServerClient();
    const { data, error } = await db
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toCampaign);
  },
  async clips() {
    const db = await createSupabaseServerClient();
    const { data, error } = await db
      .from("clips")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toClip);
  },
  async payouts() {
    const db = await createSupabaseServerClient();
    const { data, error } = await db
      .from("payouts")
      .select("*")
      .order("requested_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toPayout);
  },
  async insertCampaign(campaign) {
    const db = await createSupabaseServerClient();
    const { data, error } = await db
      .from("campaigns")
      .insert(fromCampaign(campaign))
      .select()
      .single();
    if (error) throw error;
    return toCampaign(data);
  },
  async updateCampaign(id, patch) {
    const db = await createSupabaseServerClient();
    const { data, error } = await db
      .from("campaigns")
      .update(patchColumns(patch, fromCampaign))
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data ? toCampaign(data) : null;
  },
  async insertClips(clips) {
    const db = await createSupabaseServerClient();
    const { data, error } = await db
      .from("clips")
      .insert(clips.map(fromClip))
      .select();
    if (error) throw error;
    return (data ?? []).map(toClip);
  },
  async updateClip(id, patch) {
    const db = await createSupabaseServerClient();
    const { data, error } = await db
      .from("clips")
      .update(patchColumns(patch, fromClip))
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data ? toClip(data) : null;
  },
  async insertPayout(payout) {
    const db = await createSupabaseServerClient();
    const { data, error } = await db
      .from("payouts")
      .insert(fromPayout(payout))
      .select()
      .single();
    if (error) throw error;
    return toPayout(data);
  },
};

export const db: DataSource = isSupabaseConfigured ? supabaseSource : demoSource;

export const isDemoMode = !isSupabaseConfigured;
