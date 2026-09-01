# NOW — ClipRewards

## Just done (2026-09-01)

- Put the whole app behind a shared site password. `src/proxy.ts` (Next 16's
  renamed `middleware`) redirects any un-cookied request to `/login?next=…` and
  then runs the existing Supabase session refresh.
- Password comes from `SITE_PASSWORD`, falling back to `bubs2026`. The cookie
  stores a SHA-256 of the password, not the password, and is httpOnly +
  sameSite=lax + secure in production, 30-day expiry.
- `/login` renders bare (site header and footer are hidden there via
  `HideOnGate`) — every nav link behind the gate would just bounce back anyway.
- `/api/webhooks/*` is exempt: the clipper callback authenticates with its own
  HMAC and has no browser to redirect.

## Verified

- `/leaderboard` while logged out → redirected to `/login?next=%2Fleaderboard`;
  correct password lands back on `/leaderboard`, and the session carries across
  pages and API routes (`/api/payouts` → 200).
- Wrong password → 401, empty password → 422, and neither sets a cookie.
- API routes are gated too — an un-cookied `fetch('/api/payouts')` redirects.
- `?next=` is path-only: `https://evil.com/x`, `//evil.com/x` and
  `javascript:alert(1)` all collapse to `/`; `/campaigns?q=a` is preserved.

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
