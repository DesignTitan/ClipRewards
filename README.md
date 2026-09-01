# ClipRewards

A two-sided clip-rewards marketplace. Brands fund a campaign against a
long-form video and set a rate per 1,000 views. AI cuts the video into vertical
shorts. Clippers review the cuts, schedule them, post them, and earn on
verified views.

Built with Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS v4, and
Supabase.

---

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000. **It works immediately with no configuration** —
without Supabase credentials the app runs in demo mode against a seeded
in-memory dataset (3 brands, 8 clippers, 6 campaigns, ~70 clips, payout
history). Every flow is live in demo mode: creating campaigns, generating
clips, scheduling, and requesting payouts all mutate the store.

## What's in it

| Route | What it does |
| --- | --- |
| `/` | Landing page — the pitch, the AI pipeline, live stats, earnings estimator |
| `/campaigns` | Browse funded campaigns, filter by platform, sort by rate / budget / views |
| `/campaigns/[id]` | Campaign detail — guidelines, top clips, contributors, "generate my clips" |
| `/brand` | Brand dashboard — views, spend, effective CPM, budget, top clippers |
| `/brand/campaigns/new` | Create a campaign, with a live projection of what the budget buys |
| `/brand/campaigns/[id]` | Manage one campaign — pause/resume, top up budget, per-clip breakdown |
| `/clipper` | Clipper dashboard — balance, review queue, scheduled and live clips |
| `/clipper/clips` | Every clip you've generated, filtered by status |
| `/clipper/payouts` | Balance, withdrawal requests, payout history, earnings by campaign |
| `/leaderboard` | Top clippers by verified views |

### API

| Endpoint | Purpose |
| --- | --- |
| `GET/POST /api/campaigns` | List and create campaigns |
| `GET/PATCH /api/campaigns/[id]` | Read one; pause, resume, or top up its budget |
| `POST /api/campaigns/[id]/clips` | Run AI clip generation for the signed-in clipper |
| `PATCH /api/clips/[id]` | Approve, schedule, unschedule, or discard a clip |
| `GET/POST /api/payouts` | Payout history and withdrawal requests |
| `POST /api/webhooks/clipper` | HMAC-signed callback for async clipping providers |

## Connecting Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run `supabase/schema.sql` in the SQL editor. It creates the four tables
   (`profiles`, `campaigns`, `clips`, `payouts`), the enums, the earnings and
   spend triggers, two read-model views, and RLS policies.
3. Copy `.env.example` to `.env.local` and fill in:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```

Setting the two public vars is all it takes — `src/lib/db.ts` swaps its
`DataSource` implementation and every page reads Postgres instead. Nothing
above that file changes.

### Where the money math lives

Earnings are computed in Postgres, not in the client, by the
`recalculate_clip_earnings` trigger:

```
earnings = views / 1000 × rate_per_thousand
```

…zeroed if the clip is below the campaign's qualifying view threshold, then
clamped by the per-clipper cap and again by the campaign's remaining budget. A
campaign can never pay out more than its budget, whatever a client sends.

`sync_campaign_spend` keeps `campaigns.spent` in step. In the app layer,
`src/lib/queries.ts` recomputes a campaign's spend from its clips on every read
rather than trusting the stored column, so spend and clip earnings can never
disagree on screen.

## AI clipping

The platform never calls a video model directly — it calls a `ClipperProvider`
(`src/lib/ai/clipper.ts`). Two ship:

- **`stub`** (default) — deterministic heuristic segmentation, no network. It
  exercises the whole generate → review → schedule → post → earn flow without a
  video pipeline behind it.
- **`http`** — POSTs the job to your own splitting service and normalizes the
  response.

To use a real engine (Ssemble, Opus, Vizard, or self-hosted
ffmpeg + Whisper + an LLM), either point `CLIPPER_API_URL` at an adapter
returning the documented shape:

```env
CLIPPER_PROVIDER=http
CLIPPER_API_URL=https://your-service.example/clips
CLIPPER_API_KEY=...
CLIPPER_WEBHOOK_SECRET=...
```

…or add a third implementation of the interface. Everything downstream —
review, scheduling, payouts — is unchanged either way.

Providers that render asynchronously should insert clips as `generating` and
call back to `POST /api/webhooks/clipper` with an
`x-clipper-signature: sha256=<hex hmac>` header over the raw body. Without
`CLIPPER_WEBHOOK_SECRET` set, that endpoint rejects every request rather than
trusting an unsigned caller.

## Deploying to Vercel

```bash
npx vercel
```

Add the same environment variables in the Vercel project settings. No other
configuration is needed — there's no custom server, no edge-incompatible
dependency, and all data pages are marked `force-dynamic` so nothing is baked
in at build time.

Note that demo mode's store is per-instance and in-memory, so on serverless it
resets between cold starts. That's fine for a demo and exactly why connecting
Supabase is step one for anything real.

## Known scope

This is a complete reference implementation of the marketplace, with two
deliberate seams left open:

- **Auth is stubbed.** `src/lib/session.ts` resolves a fixed demo brand and
  clipper. Swapping in Supabase Auth means changing those two functions and
  nothing else — the RLS policies in `schema.sql` are already written against
  `auth.uid()`.
- **View counts are seeded, not ingested.** A production build needs a job that
  polls the TikTok / Instagram / YouTube APIs and writes `clips.views`; the
  earnings trigger recalculates from there automatically.

## Scripts

```bash
npm run dev        # dev server (Turbopack)
npm run build      # production build
npm run start      # serve the production build
npm run typecheck  # tsc --noEmit
```
