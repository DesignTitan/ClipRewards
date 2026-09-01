import type { Metadata } from "next";

import { StatCard } from "@/components/ui";
import { formatMoney, formatMoneyWhole, formatViews } from "@/lib/format";
import { getLeaderboard } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "Top clippers by verified views across every ClipRewards campaign.",
};

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function LeaderboardPage() {
  const entries = await getLeaderboard(25);

  const totalViews = entries.reduce((t, e) => t + e.totalViews, 0);
  const totalPaid = entries.reduce((t, e) => t + e.totalEarnings, 0);
  const totalClips = entries.reduce((t, e) => t + e.clipCount, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
      <header className="mb-8">
        <span className="eyebrow">Standings</span>
        <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">
          Clipper leaderboard
        </h1>
        <p className="mt-3 max-w-2xl text-muted leading-relaxed">
          Ranked by verified views across every campaign. Earnings include clips
          still settling — a clip only counts once it clears its campaign&apos;s
          qualifying view threshold.
        </p>
      </header>

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <StatCard label="Views ranked" value={formatViews(totalViews)} />
        <StatCard
          label="Paid to clippers"
          value={formatMoneyWhole(totalPaid)}
          accent="lime"
        />
        <StatCard label="Clips live" value={String(totalClips)} />
      </div>

      <div className="card overflow-hidden">
        <div className="hidden sm:grid grid-cols-[3rem_1fr_7rem_7rem_6rem] gap-4 border-b border-line-soft px-5 py-3 text-[11px] uppercase tracking-wider text-faint">
          <span>Rank</span>
          <span>Clipper</span>
          <span className="text-right">Views</span>
          <span className="text-right">Earned</span>
          <span className="text-right">Avg / clip</span>
        </div>

        <ol className="divide-y divide-[var(--color-line-soft)]">
          {entries.map((entry, index) => (
            <li
              key={entry.clipper.id}
              className={`grid grid-cols-[2.5rem_1fr_auto] sm:grid-cols-[3rem_1fr_7rem_7rem_6rem] items-center gap-4 px-4 sm:px-5 py-4 ${
                index < 3 ? "bg-surface-2/40" : ""
              }`}
            >
              <span className="text-sm font-bold tabular">
                {index < 3 ? (
                  <span className="text-lg" aria-label={`Rank ${index + 1}`}>
                    {MEDALS[index]}
                  </span>
                ) : (
                  <span className="text-faint">{index + 1}</span>
                )}
              </span>

              <div className="flex min-w-0 items-center gap-3">
                <span className="text-xl" aria-hidden>
                  {entry.clipper.avatarEmoji}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">
                    {entry.clipper.displayName}
                  </div>
                  <div className="truncate text-xs text-faint">
                    @{entry.clipper.handle} · {entry.clipCount} clips ·{" "}
                    {entry.campaignCount} campaigns
                  </div>
                </div>
              </div>

              <div className="text-right sm:hidden">
                <div className="text-sm font-semibold tabular">
                  {formatViews(entry.totalViews)}
                </div>
                <div className="text-xs text-lime tabular">
                  {formatMoney(entry.totalEarnings)}
                </div>
              </div>

              <span className="hidden sm:block text-right text-sm font-semibold tabular">
                {formatViews(entry.totalViews)}
              </span>
              <span className="hidden sm:block text-right text-sm font-semibold text-lime tabular">
                {formatMoney(entry.totalEarnings)}
              </span>
              <span className="hidden sm:block text-right text-sm text-muted tabular">
                {formatViews(entry.avgViewsPerClip)}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

// Reads live marketplace data — never prerender this at build time.
export const dynamic = "force-dynamic";
