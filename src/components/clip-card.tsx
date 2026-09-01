"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  formatMoney,
  formatShortDate,
  formatTimecode,
  formatViews,
} from "@/lib/format";
import { PLATFORM_LABEL, type Clip, type Platform } from "@/lib/types";

import { HookScore, StatusBadge, Thumb } from "./ui";

export interface ClipCardProps {
  clip: Clip;
  /** Shown above the title when the card appears outside a campaign page. */
  campaignTitle?: string;
  campaignHref?: string;
  /** Platforms the clip may be scheduled to, from the parent campaign. */
  platforms?: Platform[];
  /** Render approve / reject / schedule controls. Clipper-side only. */
  actionable?: boolean;
}

export function ClipCard({
  clip,
  campaignTitle,
  campaignHref,
  platforms = [],
  actionable = false,
}: ClipCardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState(false);

  async function mutate(body: Record<string, unknown>) {
    setError(null);
    const response = await fetch(`/api/clips/${clip.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error ?? "Something went wrong. Try again.");
      return;
    }

    setScheduling(false);
    startTransition(() => router.refresh());
  }

  const length = clip.endSeconds - clip.startSeconds;

  return (
    <article className="card overflow-hidden">
      <div className="p-3 pb-0">
        <Thumb
          seed={clip.id}
          ratio="9/16"
          durationSeconds={length}
          className="mx-auto max-w-[220px]"
          overlay={
            <span className="absolute left-2 top-2">
              <StatusBadge status={clip.status} kind="clip" />
            </span>
          }
        />
      </div>

      <div className="p-4">
        {campaignTitle && (
          <div className="mb-1.5 truncate text-[11px] text-faint">
            {campaignHref ? (
              <Link href={campaignHref} className="hover:text-muted">
                {campaignTitle}
              </Link>
            ) : (
              campaignTitle
            )}
          </div>
        )}

        <h3 className="text-sm font-semibold leading-snug">{clip.title}</h3>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted tabular">
          <HookScore score={clip.hookScore} />
          <span>
            {formatTimecode(clip.startSeconds)}–{formatTimecode(clip.endSeconds)}
          </span>
          {clip.platform && <span>{PLATFORM_LABEL[clip.platform]}</span>}
        </div>

        {clip.captionText && (
          <p className="mt-2.5 rounded-lg border border-line-soft bg-surface-2 px-2.5 py-2 text-xs text-muted leading-relaxed">
            {clip.captionText}
          </p>
        )}

        {clip.status === "posted" && (
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line-soft pt-3 text-center">
            <Metric label="views" value={formatViews(clip.views)} />
            <Metric label="likes" value={formatViews(clip.likes)} />
            <Metric label="earned" value={formatMoney(clip.earnings)} accent />
          </div>
        )}

        {clip.status === "scheduled" && clip.scheduledFor && (
          <p className="mt-3 border-t border-line-soft pt-3 text-xs text-amber">
            Posts {formatShortDate(clip.scheduledFor)}
            {clip.platform ? ` on ${PLATFORM_LABEL[clip.platform]}` : ""}
          </p>
        )}

        {clip.status === "generating" && (
          <p className="mt-3 border-t border-line-soft pt-3 text-xs text-violet">
            AI is cutting this one — captions and vertical crop in progress.
          </p>
        )}

        {actionable && clip.status === "ready" && (
          <div className="mt-3 border-t border-line-soft pt-3">
            {scheduling ? (
              <SchedulePicker
                platforms={platforms}
                pending={pending}
                onCancel={() => setScheduling(false)}
                onConfirm={(platform, date) =>
                  mutate({ status: "scheduled", platform, scheduledFor: date })
                }
              />
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-primary flex-1 py-1.5 text-xs"
                  disabled={pending}
                  onClick={() => setScheduling(true)}
                >
                  Approve &amp; schedule
                </button>
                <button
                  type="button"
                  className="btn btn-secondary py-1.5 text-xs"
                  disabled={pending}
                  onClick={() => mutate({ status: "rejected" })}
                >
                  Discard
                </button>
              </div>
            )}
          </div>
        )}

        {actionable && clip.status === "scheduled" && (
          <div className="mt-3 flex gap-2 border-t border-line-soft pt-3">
            <button
              type="button"
              className="btn btn-secondary flex-1 py-1.5 text-xs"
              disabled={pending}
              onClick={() => mutate({ status: "ready", scheduledFor: null })}
            >
              Unschedule
            </button>
          </div>
        )}

        {clip.postUrl && (
          <a
            href={clip.postUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-xs text-muted hover:text-lime transition-colors"
          >
            View post
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M7 17L17 7M17 7H8M17 7v9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        )}

        {error && (
          <p role="alert" className="mt-2 text-xs text-danger">
            {error}
          </p>
        )}
      </div>
    </article>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <div
        className={`text-sm font-semibold tabular ${accent ? "text-lime" : "text-text"}`}
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-faint">{label}</div>
    </div>
  );
}

function SchedulePicker({
  platforms,
  pending,
  onCancel,
  onConfirm,
}: {
  platforms: Platform[];
  pending: boolean;
  onCancel: () => void;
  onConfirm: (platform: Platform, isoDate: string) => void;
}) {
  const options = platforms.length ? platforms : (["tiktok"] as Platform[]);
  const [platform, setPlatform] = useState<Platform>(options[0]);
  const [date, setDate] = useState("");

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {options.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPlatform(p)}
            aria-pressed={platform === p}
            className={`chip cursor-pointer ${
              platform === p ? "border-lime/50 text-lime" : ""
            }`}
          >
            {PLATFORM_LABEL[p]}
          </button>
        ))}
      </div>
      <input
        type="datetime-local"
        className="input py-1.5 text-xs"
        value={date}
        aria-label="Post date and time"
        onChange={(e) => setDate(e.target.value)}
      />
      <div className="flex gap-2">
        <button
          type="button"
          className="btn btn-primary flex-1 py-1.5 text-xs"
          disabled={pending || !date}
          onClick={() => onConfirm(platform, new Date(date).toISOString())}
        >
          {pending ? "Scheduling…" : "Confirm"}
        </button>
        <button
          type="button"
          className="btn btn-ghost py-1.5 text-xs"
          onClick={onCancel}
          disabled={pending}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
