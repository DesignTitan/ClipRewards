# NOW — ClipRewards

## Just done (2026-09-01)

- Scaffolded the full app: Next.js 16.3.4 (App Router, Turbopack) + React 19.2.8 +
  Tailwind v4 + Supabase. Production build passes; all 13 routes return 200.
- Built both sides end-to-end — landing, campaign browse/detail, brand dashboard +
  campaign creation and management, clipper dashboard + clip review/scheduling,
  payouts, leaderboard.
- Data layer sits behind one `DataSource` interface (`src/lib/db.ts`): seeded
  in-memory demo store by default, Supabase/Postgres as soon as the two public
  env vars are set. Aggregations in `src/lib/queries.ts` are shared by both.
- AI clipping is a swappable `ClipperProvider` (`src/lib/ai/clipper.ts`) — `stub`
  (deterministic, offline) and `http`. HMAC-verified async callback at
  `/api/webhooks/clipper`.
- `supabase/schema.sql` carries the tables, enums, RLS policies, two read-model
  views, and the earnings/spend triggers that clamp payouts to the per-clipper cap
  and the campaign budget.

## Verified

- All page routes 200, unknown route 404s.
- Campaign create/update validation (short title, bad URL, zero rate, cap > budget,
  budget below spend) all rejected with useful messages.
- Clip generate → schedule works; illegal state transitions and off-campaign
  platforms rejected.
- Payout request validated against real available balance and the $50 minimum.
- Webhook accepts a correct HMAC and rejects tampered bodies and malformed
  signatures.
- Fixed a real bug found in testing: the stub provider used signed `>>`, which for
  high-bit seeds produced negative jitter and clips with `endSeconds <
  startSeconds`. Now unsigned, with a filter in the route as a second guard.

## Deployed (2026-09-01)

- Live at **https://clip-rewards.vercel.app** (Vercel project
  `bubs-1063s-projects/clip-rewards`, linked to the `DesignTitan/ClipRewards`
  GitHub repo, so pushes to `main` now auto-deploy).
- Deployed with no env vars set, so production is running the seeded in-memory
  demo store. Setting `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  in the Vercel project switches it to the real database with no code change.
- Verified after deploy: root returns 200 on both the alias and the deployment
  URL, no deployment-protection auth wall, page renders, no console errors.
- Project dir is `ClipRewards`, which Vercel rejects as a project name
  (uppercase), so the project was linked explicitly as `clip-rewards`.

## In progress

- Nothing outstanding. The build is clean and the demo runs with no configuration.

## Next

- Wire Supabase Auth: replace the two functions in `src/lib/session.ts`. The RLS
  policies are already written against `auth.uid()`.
- Add the view-ingestion job (TikTok / Instagram / YouTube APIs → `clips.views`);
  the earnings trigger recalculates from there on its own.
- Once tables grow, swap the whole-table reads in `queries.ts` for the
  `v_campaign_stats` and `v_clipper_leaderboard` views already in the schema.
- Set the Supabase env vars in the Vercel project to move production off the
  in-memory demo store.
