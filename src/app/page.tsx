import Link from "next/link";

import { CampaignCard } from "@/components/campaign-card";
import { EarningsCalculator } from "@/components/earnings-calculator";
import { SectionHeading } from "@/components/ui";
import { formatMoneyWhole, formatViews } from "@/lib/format";
import {
  getLeaderboard,
  getMetricsForCampaigns,
  getProfileMap,
  listCampaigns,
} from "@/lib/queries";

export default async function LandingPage() {
  const [campaigns, profiles, allClippers] = await Promise.all([
    listCampaigns({ status: "active" }),
    getProfileMap(),
    getLeaderboard(),
  ]);

  const featured = campaigns.slice(0, 3);
  const metrics = await getMetricsForCampaigns(featured.map((c) => c.id));

  // Headline stats span the whole marketplace; the strip below shows the top 5.
  const marketplaceViews = allClippers.reduce((t, e) => t + e.totalViews, 0);
  const marketplacePaid = allClippers.reduce((t, e) => t + e.totalEarnings, 0);
  const leaderboard = allClippers.slice(0, 5);
  const openBudget = campaigns.reduce(
    (t, c) => t + Math.max(0, c.budget - c.spent),
    0,
  );

  return (
    <>
      {/* ----------------------------------------------------------------- */}
      {/* Hero                                                              */}
      {/* ----------------------------------------------------------------- */}
      <section className="relative overflow-hidden border-b border-line-soft">
        <div className="absolute inset-0 aurora" aria-hidden />
        <div className="absolute inset-0 grid-lines opacity-60" aria-hidden />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <div className="grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:items-center">
            <div>
              <span className="chip border-lime/30 text-lime bg-lime/8">
                <span className="h-1.5 w-1.5 rounded-full bg-lime" aria-hidden />
                {campaigns.length} campaigns funded and open right now
              </span>

              <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.02] tracking-[-0.035em]">
                Brands pay per view.
                <br />
                <span className="text-lime">You just post the clips.</span>
              </h1>

              <p className="mt-5 max-w-xl text-base sm:text-lg text-muted leading-relaxed">
                ClipRewards is the marketplace between the two. Brands fund a
                campaign and set a rate per 1,000 views. AI cuts their long-form
                video into shorts. Clippers pick what to post, schedule it, and
                get paid on verified views.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/campaigns" className="btn btn-primary">
                  Browse campaigns
                </Link>
                <Link href="/brand/campaigns/new" className="btn btn-secondary">
                  Fund a campaign
                </Link>
              </div>

              <dl className="mt-12 grid grid-cols-3 gap-6 border-t border-line-soft pt-6 max-w-lg">
                <HeroStat
                  label="Views delivered"
                  value={formatViews(marketplaceViews)}
                />
                <HeroStat
                  label="Paid to clippers"
                  value={formatMoneyWhole(marketplacePaid)}
                />
                <HeroStat
                  label="Budget still open"
                  value={formatMoneyWhole(openBudget)}
                />
              </dl>
            </div>

            <EarningsCalculator />
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* How it works                                                      */}
      {/* ----------------------------------------------------------------- */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-20">
        <div className="max-w-2xl">
          <span className="eyebrow">How it works</span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">
            One marketplace, two jobs to be done.
          </h2>
          <p className="mt-4 text-muted leading-relaxed">
            Brands have more good footage than they have distribution. Clippers
            have distribution and no reliable way to get paid for it. The
            platform sits in the middle and settles both sides on the same
            number: views.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <SideCard
            eyebrow="For brands"
            title="Turn one long video into a hundred placements"
            accent="violet"
            steps={[
              {
                title: "Link your long-form video",
                body: "A podcast, keynote, coaching session, or interview. Paste a URL or upload the file.",
              },
              {
                title: "Set the rate and the budget",
                body: "You choose the dollars per 1,000 views, the total budget, and an optional per-clipper cap. The budget is the ceiling — you never spend past it.",
              },
              {
                title: "Write the guidelines",
                body: "Watermark placement, caption rules, claims you can't make. Every clipper sees them before they cut.",
              },
              {
                title: "Watch it compound",
                body: "Track views, spend, effective CPM, and which clippers actually move numbers.",
              },
            ]}
            cta={{ href: "/brand", label: "Open the brand dashboard" }}
          />

          <SideCard
            eyebrow="For clippers"
            title="Skip the sourcing, keep the upside"
            accent="lime"
            steps={[
              {
                title: "Pick a campaign",
                body: "Filter by rate, platform, and remaining budget. Everything listed is already funded.",
              },
              {
                title: "Let the AI cut first",
                body: "Highlight detection, vertical reframe, and burned-in captions produce a batch of candidates in seconds.",
              },
              {
                title: "Review, edit, schedule",
                body: "Keep the ones you'd actually post. Set the platform and the time; discard the rest.",
              },
              {
                title: "Get paid on views",
                body: "Earnings accrue per verified 1,000 views. Withdraw once you clear the $50 minimum.",
              },
            ]}
            cta={{ href: "/clipper", label: "Open the clipper dashboard" }}
          />
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* AI pipeline                                                       */}
      {/* ----------------------------------------------------------------- */}
      <section className="border-y border-line-soft bg-surface/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20">
          <div className="max-w-2xl">
            <span className="eyebrow">The clipping engine</span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">
              Four passes between a two-hour video and a postable short.
            </h2>
          </div>

          <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                n: "01",
                title: "Transcribe",
                body: "Word-level timestamps across the full source, with speaker turns kept intact.",
              },
              {
                n: "02",
                title: "Find the hooks",
                body: "Score every candidate window on self-containment, sentiment shift, and pacing. Only complete thoughts survive.",
              },
              {
                n: "03",
                title: "Reframe to 9:16",
                body: "Subject tracking keeps the speaker centred; on-screen text and terminals stay inside the crop.",
              },
              {
                n: "04",
                title: "Burn captions",
                body: "Styled, readable-on-mobile captions rendered into the clip, ready to post as-is.",
              },
            ].map((step) => (
              <li key={step.n} className="card p-5">
                <div className="font-mono text-xs text-lime">{step.n}</div>
                <h3 className="mt-3 text-base font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted leading-relaxed">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>

          <p className="mt-8 max-w-2xl text-sm text-faint leading-relaxed">
            The engine is a swappable provider, not a hard dependency. Point{" "}
            <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-muted">
              CLIPPER_API_URL
            </code>{" "}
            at your own splitting service — or any hosted one — and the review,
            scheduling, and payout flow around it stays exactly the same.
          </p>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Open campaigns                                                    */}
      {/* ----------------------------------------------------------------- */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-20">
        <SectionHeading
          title="Open campaigns"
          description="Funded, live, and accepting clips today."
          action={
            <Link href="/campaigns" className="btn btn-secondary">
              See all {campaigns.length}
            </Link>
          }
        />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((campaign) => (
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
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Leaderboard preview                                               */}
      {/* ----------------------------------------------------------------- */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-20">
        <SectionHeading
          title="This month's top clippers"
          description="Ranked by verified views across every campaign."
          action={
            <Link href="/leaderboard" className="btn btn-secondary">
              Full leaderboard
            </Link>
          }
        />

        <div className="card divide-y divide-[var(--color-line-soft)] overflow-hidden">
          {leaderboard.map((entry, index) => (
            <div
              key={entry.clipper.id}
              className="flex items-center gap-4 px-4 sm:px-5 py-3.5"
            >
              <span
                className={`w-6 text-sm font-bold tabular ${
                  index === 0 ? "text-lime" : "text-faint"
                }`}
              >
                {index + 1}
              </span>
              <span className="text-lg" aria-hidden>
                {entry.clipper.avatarEmoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">
                  {entry.clipper.displayName}
                </div>
                <div className="truncate text-xs text-faint">
                  @{entry.clipper.handle} · {entry.clipCount} clips live
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold tabular">
                  {formatViews(entry.totalViews)}
                </div>
                <div className="text-[11px] text-faint">views</div>
              </div>
              <div className="hidden sm:block w-24 text-right">
                <div className="text-sm font-semibold text-lime tabular">
                  {formatMoneyWhole(entry.totalEarnings)}
                </div>
                <div className="text-[11px] text-faint">earned</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Closing CTA                                                       */}
      {/* ----------------------------------------------------------------- */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-4">
        <div className="relative overflow-hidden rounded-3xl border border-line-soft p-10 sm:p-16 text-center">
          <div className="absolute inset-0 aurora" aria-hidden />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Pick a side and start.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-muted leading-relaxed">
              Fund a campaign in about two minutes, or claim your first batch of
              AI-cut clips and have something scheduled tonight.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/brand/campaigns/new" className="btn btn-primary">
                Fund a campaign
              </Link>
              <Link href="/campaigns" className="btn btn-secondary">
                Start clipping
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-faint">{label}</dt>
      <dd className="mt-1 text-xl font-bold tracking-tight tabular">{value}</dd>
    </div>
  );
}

function SideCard({
  eyebrow,
  title,
  steps,
  cta,
  accent,
}: {
  eyebrow: string;
  title: string;
  steps: { title: string; body: string }[];
  cta: { href: string; label: string };
  accent: "lime" | "violet";
}) {
  const accentText = accent === "lime" ? "text-lime" : "text-violet";
  const accentBorder = accent === "lime" ? "border-lime/25" : "border-violet/25";

  return (
    <div className={`card p-6 sm:p-8 ${accentBorder}`}>
      <span className={`eyebrow ${accentText}`}>{eyebrow}</span>
      <h3 className="mt-3 text-xl sm:text-2xl font-bold tracking-tight">{title}</h3>

      <ol className="mt-7 space-y-5">
        {steps.map((step, i) => (
          <li key={step.title} className="flex gap-4">
            <span
              className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[11px] font-bold ${accentBorder} ${accentText}`}
            >
              {i + 1}
            </span>
            <div>
              <div className="text-sm font-semibold">{step.title}</div>
              <p className="mt-1 text-sm text-muted leading-relaxed">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <Link href={cta.href} className="btn btn-secondary mt-8">
        {cta.label}
      </Link>
    </div>
  );
}

// Reads live marketplace data — never prerender this at build time.
export const dynamic = "force-dynamic";
