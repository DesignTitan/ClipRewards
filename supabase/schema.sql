-- ---------------------------------------------------------------------------
-- ClipRewards — Supabase schema
--
-- Run in the Supabase SQL editor, or with:
--   psql "$SUPABASE_DB_URL" -f supabase/schema.sql
--
-- Then set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY and the
-- app switches off demo mode automatically.
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type user_role as enum ('brand', 'clipper');
exception when duplicate_object then null; end $$;

do $$ begin
  create type campaign_status as enum ('draft', 'active', 'paused', 'completed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type clip_status as enum (
    'generating', 'ready', 'scheduled', 'posted', 'rejected'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type payout_status as enum ('requested', 'processing', 'paid', 'failed');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- profiles — one row per auth user, brand or clipper
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  role         user_role   not null,
  handle       text        not null unique,
  display_name text        not null,
  avatar_emoji text        not null default '🎬',
  bio          text,
  website      text,
  created_at   timestamptz not null default now(),

  constraint handle_format check (handle ~ '^[a-z0-9_]{3,30}$')
);

-- ---------------------------------------------------------------------------
-- campaigns — a brand's funded ask
-- ---------------------------------------------------------------------------

create table if not exists public.campaigns (
  id                      uuid primary key default gen_random_uuid(),
  brand_id                uuid not null references public.profiles (id) on delete cascade,
  title                   text not null,
  description             text not null default '',
  source_url              text not null,
  source_thumbnail        text,
  source_duration_seconds integer not null default 0,

  -- Dollars per 1,000 verified views.
  rate_per_thousand       numeric(10, 2) not null check (rate_per_thousand > 0),
  budget                  numeric(12, 2) not null check (budget >= 0),
  -- Denormalised roll-up, maintained by the trigger below. `v_campaign_stats`
  -- is the source of truth if the two ever disagree.
  spent                   numeric(12, 2) not null default 0,

  max_payout_per_clipper  numeric(12, 2) check (max_payout_per_clipper > 0),
  min_views_to_qualify    integer not null default 0 check (min_views_to_qualify >= 0),

  platforms               text[] not null default '{}',
  guidelines              text[] not null default '{}',

  status                  campaign_status not null default 'draft',
  ends_at                 timestamptz,
  created_at              timestamptz not null default now(),

  constraint cap_within_budget check (
    max_payout_per_clipper is null or max_payout_per_clipper <= budget
  )
);

create index if not exists campaigns_brand_idx  on public.campaigns (brand_id);
create index if not exists campaigns_status_idx on public.campaigns (status)
  where status = 'active';

-- ---------------------------------------------------------------------------
-- clips — one AI-generated cut, owned by the clipper who claimed it
-- ---------------------------------------------------------------------------

create table if not exists public.clips (
  id            uuid primary key default gen_random_uuid(),
  campaign_id   uuid not null references public.campaigns (id) on delete cascade,
  clipper_id    uuid not null references public.profiles (id) on delete cascade,

  title         text not null,
  start_seconds integer not null default 0 check (start_seconds >= 0),
  end_seconds   integer not null default 0,
  thumbnail     text,
  caption_text  text,
  -- 0-100 confidence from the clipping engine that this is a standalone hook.
  hook_score    integer not null default 0 check (hook_score between 0 and 100),

  status        clip_status not null default 'generating',
  platform      text,
  post_url      text,
  scheduled_for timestamptz,
  posted_at     timestamptz,

  views         bigint not null default 0 check (views >= 0),
  likes         bigint not null default 0 check (likes >= 0),
  earnings      numeric(12, 2) not null default 0 check (earnings >= 0),

  created_at    timestamptz not null default now(),

  constraint clip_window check (end_seconds > start_seconds),
  constraint posted_has_url check (status <> 'posted' or post_url is not null)
);

create index if not exists clips_campaign_idx on public.clips (campaign_id);
create index if not exists clips_clipper_idx  on public.clips (clipper_id);
create index if not exists clips_status_idx   on public.clips (status);
-- Leaderboard and dashboard reads are almost always "posted, by views".
create index if not exists clips_posted_views_idx on public.clips (views desc)
  where status = 'posted';

-- ---------------------------------------------------------------------------
-- payouts — withdrawal requests
-- ---------------------------------------------------------------------------

create table if not exists public.payouts (
  id           uuid primary key default gen_random_uuid(),
  clipper_id   uuid not null references public.profiles (id) on delete cascade,
  amount       numeric(12, 2) not null check (amount >= 50),
  status       payout_status not null default 'requested',
  method       text not null default 'Stripe Connect',
  requested_at timestamptz not null default now(),
  paid_at      timestamptz,
  reference    text,

  constraint paid_has_timestamp check (status <> 'paid' or paid_at is not null)
);

create index if not exists payouts_clipper_idx on public.payouts (clipper_id);

-- ---------------------------------------------------------------------------
-- Earnings + spend maintenance
--
-- A clip's earnings are always views/1000 * rate, zero until it clears the
-- campaign's qualifying threshold, and capped so a campaign can never pay out
-- past its budget. Computed in the database so a bad client can't inflate it.
-- ---------------------------------------------------------------------------

create or replace function public.recalculate_clip_earnings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  c              public.campaigns%rowtype;
  raw_earnings   numeric(12, 2);
  clipper_earned numeric(12, 2);
  budget_left    numeric(12, 2);
begin
  select * into c from public.campaigns where id = new.campaign_id for update;
  if not found then
    return new;
  end if;

  if new.status = 'posted' and new.views >= c.min_views_to_qualify then
    raw_earnings := round((new.views::numeric / 1000) * c.rate_per_thousand, 2);
  else
    raw_earnings := 0;
  end if;

  -- Per-clipper cap, excluding this clip's own prior contribution.
  if c.max_payout_per_clipper is not null then
    select coalesce(sum(earnings), 0) into clipper_earned
      from public.clips
     where campaign_id = new.campaign_id
       and clipper_id = new.clipper_id
       and id <> new.id;

    raw_earnings := least(
      raw_earnings,
      greatest(c.max_payout_per_clipper - clipper_earned, 0)
    );
  end if;

  -- Campaign budget ceiling, same exclusion.
  select greatest(c.budget - coalesce(sum(earnings), 0), 0) into budget_left
    from public.clips
   where campaign_id = new.campaign_id
     and id <> new.id;

  new.earnings := least(raw_earnings, budget_left);
  return new;
end;
$$;

drop trigger if exists clips_earnings_trigger on public.clips;
create trigger clips_earnings_trigger
  before insert or update of views, status on public.clips
  for each row execute function public.recalculate_clip_earnings();

create or replace function public.sync_campaign_spend()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid := coalesce(new.campaign_id, old.campaign_id);
begin
  update public.campaigns
     set spent = (
       select coalesce(sum(earnings), 0) from public.clips where campaign_id = target
     )
   where id = target;
  return null;
end;
$$;

drop trigger if exists clips_spend_trigger on public.clips;
create trigger clips_spend_trigger
  after insert or update or delete on public.clips
  for each row execute function public.sync_campaign_spend();

-- ---------------------------------------------------------------------------
-- Read models
--
-- The app aggregates in TypeScript at demo scale. These views are the drop-in
-- replacement once the tables are large enough that whole-table reads stop
-- being reasonable.
-- ---------------------------------------------------------------------------

create or replace view public.v_campaign_stats as
select
  c.id                                                as campaign_id,
  c.brand_id,
  coalesce(sum(cl.views) filter (where cl.status = 'posted'), 0) as total_views,
  coalesce(sum(cl.earnings), 0)                       as total_spent,
  greatest(c.budget - coalesce(sum(cl.earnings), 0), 0) as remaining_budget,
  count(cl.id)                                        as clip_count,
  count(distinct cl.clipper_id)                       as clipper_count
from public.campaigns c
left join public.clips cl on cl.campaign_id = c.id
group by c.id;

create or replace view public.v_clipper_leaderboard as
select
  p.id                                                as clipper_id,
  p.handle,
  p.display_name,
  p.avatar_emoji,
  coalesce(sum(cl.views) filter (where cl.status = 'posted'), 0) as total_views,
  coalesce(sum(cl.earnings), 0)                       as total_earnings,
  count(cl.id) filter (where cl.status = 'posted')    as clip_count,
  count(distinct cl.campaign_id)                      as campaign_count
from public.profiles p
left join public.clips cl on cl.clipper_id = p.id
where p.role = 'clipper'
group by p.id
order by total_views desc;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles  enable row level security;
alter table public.campaigns enable row level security;
alter table public.clips     enable row level security;
alter table public.payouts   enable row level security;

-- Profiles are public; you may only write your own.
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select using (true);

drop policy if exists profiles_write_own on public.profiles;
create policy profiles_write_own on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Anyone can see live campaigns; a brand additionally sees its own drafts.
drop policy if exists campaigns_read on public.campaigns;
create policy campaigns_read on public.campaigns
  for select using (status <> 'draft' or brand_id = auth.uid());

drop policy if exists campaigns_write_own on public.campaigns;
create policy campaigns_write_own on public.campaigns
  for all using (brand_id = auth.uid()) with check (brand_id = auth.uid());

-- Clips are public once posted. Otherwise they're visible to the clipper who
-- owns them and to the brand funding the campaign.
drop policy if exists clips_read on public.clips;
create policy clips_read on public.clips
  for select using (
    status = 'posted'
    or clipper_id = auth.uid()
    or exists (
      select 1 from public.campaigns c
       where c.id = clips.campaign_id and c.brand_id = auth.uid()
    )
  );

drop policy if exists clips_write_own on public.clips;
create policy clips_write_own on public.clips
  for all using (clipper_id = auth.uid()) with check (clipper_id = auth.uid());

-- Payouts are private to the clipper. Only the service role settles them.
drop policy if exists payouts_read_own on public.payouts;
create policy payouts_read_own on public.payouts
  for select using (clipper_id = auth.uid());

drop policy if exists payouts_insert_own on public.payouts;
create policy payouts_insert_own on public.payouts
  for insert with check (clipper_id = auth.uid() and status = 'requested');
