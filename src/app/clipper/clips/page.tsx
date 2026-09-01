import type { Metadata } from "next";
import Link from "next/link";

import { ClipCard } from "@/components/clip-card";
import { EmptyState, StatCard } from "@/components/ui";
import { formatMoney, formatViews } from "@/lib/format";
import { listCampaigns, listClips } from "@/lib/queries";
import { getCurrentClipper } from "@/lib/session";
import type { ClipStatus } from "@/lib/types";

export const metadata: Metadata = {
  title: "My clips",
  description: "Every clip you've generated, scheduled, and posted.",
};

const FILTERS: { key: ClipStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "ready", label: "Ready to review" },
  { key: "scheduled", label: "Scheduled" },
  { key: "posted", label: "Posted" },
  { key: "generating", label: "Generating" },
  { key: "rejected", label: "Discarded" },
];

export default async function MyClipsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const clipper = await getCurrentClipper();
  if (!clipper) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <EmptyState
          title="No clipper account"
          description="Sign in with a clipper profile to see your clips."
        />
      </div>
    );
  }

  const params = await searchParams;
  const active =
    FILTERS.find((f) => f.key === params.status)?.key ?? ("all" as const);

  const [clips, campaigns] = await Promise.all([
    listClips({ clipperId: clipper.id }),
    listCampaigns(),
  ]);
  const campaignById = new Map(campaigns.map((c) => [c.id, c]));

  const visible = active === "all" ? clips : clips.filter((c) => c.status === active);
  const counts = FILTERS.reduce<Record<string, number>>((acc, filter) => {
    acc[filter.key] =
      filter.key === "all"
        ? clips.length
        : clips.filter((c) => c.status === filter.key).length;
    return acc;
  }, {});

  const posted = clips.filter((c) => c.status === "posted");

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
      <header className="mb-8">
        <nav className="mb-4 text-sm text-faint" aria-label="Breadcrumb">
          <Link href="/clipper" className="hover:text-muted">
            Clipper dashboard
          </Link>
          <span className="mx-2" aria-hidden>
            /
          </span>
          <span className="text-muted">My clips</span>
        </nav>
        <h1 className="text-3xl font-bold tracking-tight">My clips</h1>
      </header>

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <StatCard label="Clips generated" value={String(clips.length)} />
        <StatCard
          label="Total views"
          value={formatViews(posted.reduce((t, c) => t + c.views, 0))}
          accent="violet"
        />
        <StatCard
          label="Total earned"
          value={formatMoney(clips.reduce((t, c) => t + c.earnings, 0))}
          accent="lime"
        />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Link
            key={filter.key}
            href={
              filter.key === "all"
                ? "/clipper/clips"
                : `/clipper/clips?status=${filter.key}`
            }
            className={`chip ${active === filter.key ? "border-lime/50 text-lime" : ""}`}
          >
            {filter.label}
            <span className="text-faint">{counts[filter.key] ?? 0}</span>
          </Link>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="Nothing here"
          description="No clips match that filter yet."
          action={
            <Link href="/campaigns" className="btn btn-primary">
              Find a campaign
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {visible.map((clip) => (
            <ClipCard
              key={clip.id}
              clip={clip}
              actionable
              campaignTitle={campaignById.get(clip.campaignId)?.title}
              campaignHref={`/campaigns/${clip.campaignId}`}
              platforms={campaignById.get(clip.campaignId)?.platforms ?? []}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Reads live marketplace data — never prerender this at build time.
export const dynamic = "force-dynamic";
