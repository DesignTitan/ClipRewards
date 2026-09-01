import Link from "next/link";

import {
  formatDuration,
  formatMoneyWhole,
  formatRate,
  formatViews,
  timeUntil,
} from "@/lib/format";
import type { CampaignMetrics } from "@/lib/queries";
import type { Campaign, Profile } from "@/lib/types";

import { PlatformPills, ProgressBar, StatusBadge, Thumb } from "./ui";

export function CampaignCard({
  campaign,
  brand,
  metrics,
  href,
}: {
  campaign: Campaign;
  brand?: Profile;
  metrics: CampaignMetrics;
  href?: string;
}) {
  const target = href ?? `/campaigns/${campaign.id}`;

  return (
    <article className="card card-hover overflow-hidden flex flex-col">
      <Link href={target} className="block p-3 pb-0">
        <Thumb
          seed={campaign.id}
          durationSeconds={campaign.sourceDurationSeconds}
          overlay={
            <span className="absolute left-2 top-2">
              <StatusBadge status={campaign.status} kind="campaign" />
            </span>
          }
        />
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-2 text-xs text-muted">
          {brand && (
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden>{brand.avatarEmoji}</span>
              <span className="font-medium text-text">{brand.displayName}</span>
            </span>
          )}
          <span aria-hidden>·</span>
          <span>{formatDuration(campaign.sourceDurationSeconds)} source</span>
        </div>

        <h3 className="mt-2 text-[15px] font-semibold leading-snug">
          <Link href={target} className="hover:text-lime transition-colors">
            {campaign.title}
          </Link>
        </h3>

        <p className="mt-1.5 line-clamp-2 text-sm text-muted leading-relaxed">
          {campaign.description}
        </p>

        <div className="mt-3">
          <PlatformPills platforms={campaign.platforms} />
        </div>

        <div className="mt-4 flex items-baseline justify-between">
          <div>
            <div className="text-xl font-bold tracking-tight text-lime tabular">
              {formatRate(campaign.ratePerThousand)}
            </div>
            <div className="text-[11px] text-faint">per 1,000 views</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold tabular">
              {formatViews(metrics.views)}
            </div>
            <div className="text-[11px] text-faint">views delivered</div>
          </div>
        </div>

        <div className="mt-auto pt-4">
          <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted tabular">
            <span>
              {formatMoneyWhole(metrics.remainingBudget)} left of{" "}
              {formatMoneyWhole(campaign.budget)}
            </span>
            <span>
              {campaign.endsAt ? timeUntil(campaign.endsAt) : "No end date"}
            </span>
          </div>
          <ProgressBar
            value={metrics.budgetUsedPct}
            tone={metrics.budgetUsedPct > 85 ? "amber" : "lime"}
            label={`${campaign.title} budget used`}
          />
        </div>
      </div>
    </article>
  );
}
