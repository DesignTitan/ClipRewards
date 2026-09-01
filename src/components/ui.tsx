import type { ReactNode } from "react";

import { formatDuration, gradientFor, pct } from "@/lib/format";
import { PLATFORM_LABEL, type CampaignStatus, type ClipStatus, type PayoutStatus, type Platform } from "@/lib/types";

export function StatCard({
  label,
  value,
  sub,
  accent = "default",
}: {
  label: string;
  value: string;
  sub?: ReactNode;
  accent?: "default" | "lime" | "violet" | "amber";
}) {
  const accentClass = {
    default: "text-text",
    lime: "text-lime",
    violet: "text-violet",
    amber: "text-amber",
  }[accent];

  return (
    <div className="card p-4 sm:p-5">
      <div className="eyebrow">{label}</div>
      <div className={`stat-value mt-2 ${accentClass}`}>{value}</div>
      {sub && <div className="mt-1.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}

export function SectionHeading({
  title,
  description,
  action,
  id,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  id?: string;
}) {
  return (
    <div
      id={id}
      className="flex flex-wrap items-end justify-between gap-3 mb-4 scroll-mt-20"
    >
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-muted max-w-2xl">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

const CAMPAIGN_STATUS_STYLE: Record<CampaignStatus, string> = {
  draft: "border-line text-faint",
  active: "border-lime/35 text-lime bg-lime/8",
  paused: "border-amber/35 text-amber bg-amber/8",
  completed: "border-line text-muted",
};

const CLIP_STATUS_STYLE: Record<ClipStatus, string> = {
  generating: "border-violet/35 text-violet bg-violet/8",
  ready: "border-cyan/35 text-cyan bg-cyan/8",
  scheduled: "border-amber/35 text-amber bg-amber/8",
  posted: "border-lime/35 text-lime bg-lime/8",
  rejected: "border-line text-faint",
};

const PAYOUT_STATUS_STYLE: Record<PayoutStatus, string> = {
  requested: "border-cyan/35 text-cyan bg-cyan/8",
  processing: "border-amber/35 text-amber bg-amber/8",
  paid: "border-lime/35 text-lime bg-lime/8",
  failed: "border-danger/40 text-danger bg-danger/8",
};

const CLIP_STATUS_LABEL: Record<ClipStatus, string> = {
  generating: "Generating",
  ready: "Ready to review",
  scheduled: "Scheduled",
  posted: "Posted",
  rejected: "Rejected",
};

export function StatusBadge({
  status,
  kind,
}: {
  status: string;
  kind: "campaign" | "clip" | "payout";
}) {
  const style =
    kind === "campaign"
      ? CAMPAIGN_STATUS_STYLE[status as CampaignStatus]
      : kind === "clip"
        ? CLIP_STATUS_STYLE[status as ClipStatus]
        : PAYOUT_STATUS_STYLE[status as PayoutStatus];

  const label =
    kind === "clip"
      ? CLIP_STATUS_LABEL[status as ClipStatus]
      : status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${style ?? "border-line text-muted"}`}
    >
      {label}
    </span>
  );
}

export function ProgressBar({
  value,
  tone = "lime",
  label,
}: {
  value: number;
  tone?: "lime" | "violet" | "amber";
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const bg = { lime: "bg-lime", violet: "bg-violet", amber: "bg-amber" }[tone];

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "Progress"}
      className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3"
    >
      <div className={`h-full rounded-full ${bg}`} style={{ width: pct(clamped) }} />
    </div>
  );
}

export function PlatformPills({ platforms }: { platforms: Platform[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {platforms.map((p) => (
        <span key={p} className="chip">
          {PLATFORM_LABEL[p]}
        </span>
      ))}
    </div>
  );
}

/**
 * Thumbnail placeholder. Real deployments swap this for the provider's
 * rendered still; the gradient is derived from the id so a given clip always
 * looks the same wherever it appears.
 */
export function Thumb({
  seed,
  durationSeconds,
  ratio = "16/9",
  overlay,
  className = "",
}: {
  seed: string;
  durationSeconds?: number;
  ratio?: "16/9" | "9/16";
  overlay?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-line-soft ${className}`}
      style={{ aspectRatio: ratio, background: gradientFor(seed) }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #000 0 2px, transparent 2px 6px)",
        }}
        aria-hidden
      />
      <div className="absolute inset-0 grid place-items-center">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-black/45 backdrop-blur-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white" aria-hidden>
            <path d="M8 5.5v13l11-6.5-11-6.5z" />
          </svg>
        </span>
      </div>
      {durationSeconds !== undefined && (
        <span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold tabular text-white">
          {formatDuration(durationSeconds)}
        </span>
      )}
      {overlay}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="card p-10 text-center">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function HookScore({ score }: { score: number }) {
  const tone =
    score >= 85 ? "text-lime" : score >= 70 ? "text-cyan" : "text-muted";
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${tone}`}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M13 2L4.5 13.5H11L10 22l8.5-11.5H12L13 2z" />
      </svg>
      {score} hook
    </span>
  );
}
