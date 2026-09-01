"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { formatMoneyWhole, formatViews } from "@/lib/format";
import { PLATFORMS, PLATFORM_LABEL, type Platform } from "@/lib/types";

const DEFAULT_GUIDELINES = `Hook must land in the first 2 seconds.
Burned-in captions required, readable on mobile.
Keep our watermark in the bottom-right corner.
Link the full video in your bio or the first comment.`;

export function NewCampaignForm() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("45");
  const [rate, setRate] = useState("1.50");
  const [budget, setBudget] = useState("5000");
  const [cap, setCap] = useState("1000");
  const [minViews, setMinViews] = useState("1000");
  const [platforms, setPlatforms] = useState<Platform[]>(["tiktok", "instagram"]);
  const [guidelines, setGuidelines] = useState(DEFAULT_GUIDELINES);
  const [endsAt, setEndsAt] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const projectedViews = useMemo(() => {
    const b = Number(budget);
    const r = Number(rate);
    if (!Number.isFinite(b) || !Number.isFinite(r) || r <= 0) return 0;
    return (b / r) * 1000;
  }, [budget, rate]);

  const projectedClippers = useMemo(() => {
    const b = Number(budget);
    const c = Number(cap);
    if (!Number.isFinite(b) || !Number.isFinite(c) || c <= 0) return null;
    return Math.max(1, Math.ceil(b / c));
  }, [budget, cap]);

  function togglePlatform(platform: Platform) {
    setPlatforms((current) =>
      current.includes(platform)
        ? current.filter((p) => p !== platform)
        : [...current, platform],
    );
  }

  async function submit(status: "active" | "draft") {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          sourceUrl,
          sourceDurationSeconds: Math.round(Number(durationMinutes) * 60) || 0,
          ratePerThousand: Number(rate),
          budget: Number(budget),
          maxPayoutPerClipper: cap === "" ? null : Number(cap),
          minViewsToQualify: Number(minViews),
          platforms,
          guidelines: guidelines.split("\n"),
          status,
          endsAt: endsAt || null,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error ?? "Couldn't create the campaign.");
        return;
      }

      router.push(`/brand/campaigns/${payload.campaign.id}`);
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit("active");
      }}
      className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start"
    >
      <div className="space-y-6">
        {/* Source ------------------------------------------------------- */}
        <fieldset className="card p-5 sm:p-6">
          <legend className="px-1 text-sm font-semibold">The content</legend>

          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="title" className="label">
                Campaign title
              </label>
              <input
                id="title"
                className="input"
                required
                minLength={4}
                placeholder="The Agent Economy — 2hr founder interview"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="description" className="label">
                What you want clipped
              </label>
              <textarea
                id="description"
                className="input min-h-24 resize-y"
                placeholder="Tell clippers what kind of moments perform for you and what the video is about."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
              <div>
                <label htmlFor="sourceUrl" className="label">
                  Source video URL
                </label>
                <input
                  id="sourceUrl"
                  type="url"
                  className="input"
                  required
                  placeholder="https://youtube.com/watch?v=…"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="duration" className="label">
                  Length (min)
                </label>
                <input
                  id="duration"
                  type="number"
                  min={1}
                  className="input"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-faint">
              YouTube, Vimeo, or any direct video URL. The clipping engine pulls
              the source itself — you don&apos;t need to upload anything.
            </p>
          </div>
        </fieldset>

        {/* Economics ---------------------------------------------------- */}
        <fieldset className="card p-5 sm:p-6">
          <legend className="px-1 text-sm font-semibold">Rate & budget</legend>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="rate" className="label">
                Reward per 1,000 views ($)
              </label>
              <input
                id="rate"
                type="number"
                min={0.1}
                step={0.05}
                className="input"
                required
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="budget" className="label">
                Total budget ($)
              </label>
              <input
                id="budget"
                type="number"
                min={100}
                step={100}
                className="input"
                required
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="cap" className="label">
                Max per clipper ($)
              </label>
              <input
                id="cap"
                type="number"
                min={0}
                step={50}
                className="input"
                placeholder="No cap"
                value={cap}
                onChange={(e) => setCap(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="minViews" className="label">
                Views to qualify
              </label>
              <input
                id="minViews"
                type="number"
                min={0}
                step={100}
                className="input"
                value={minViews}
                onChange={(e) => setMinViews(e.target.value)}
              />
            </div>
          </div>

          <p className="mt-3 text-xs text-faint leading-relaxed">
            A per-clipper cap stops one account taking the whole budget. The
            qualifying threshold filters out clips that never got traction — a
            clip below it earns nothing.
          </p>
        </fieldset>

        {/* Distribution ------------------------------------------------- */}
        <fieldset className="card p-5 sm:p-6">
          <legend className="px-1 text-sm font-semibold">
            Distribution & rules
          </legend>

          <div className="mt-4 space-y-4">
            <div>
              <span className="label">Platforms clips may be posted to</span>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((platform) => {
                  const active = platforms.includes(platform);
                  return (
                    <button
                      key={platform}
                      type="button"
                      aria-pressed={active}
                      onClick={() => togglePlatform(platform)}
                      className={`chip cursor-pointer ${
                        active ? "border-lime/50 text-lime bg-lime/8" : ""
                      }`}
                    >
                      {PLATFORM_LABEL[platform]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label htmlFor="guidelines" className="label">
                Guidelines — one per line
              </label>
              <textarea
                id="guidelines"
                className="input min-h-36 resize-y font-mono text-xs leading-relaxed"
                value={guidelines}
                onChange={(e) => setGuidelines(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="endsAt" className="label">
                End date (optional)
              </label>
              <input
                id="endsAt"
                type="date"
                className="input sm:w-56"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Publishing…" : "Publish campaign"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={submitting}
            onClick={() => void submit("draft")}
          >
            Save as draft
          </button>
        </div>
      </div>

      {/* Live projection --------------------------------------------- */}
      <aside className="card p-5 lg:sticky lg:top-20">
        <div className="eyebrow">What this buys</div>

        <div className="mt-4">
          <div className="text-3xl font-bold tracking-tight text-lime tabular">
            {formatViews(projectedViews)}
          </div>
          <div className="mt-1 text-xs text-muted">
            views at {formatMoneyWhole(Number(budget) || 0)} /{" "}
            {Number(rate) ? `$${Number(rate).toFixed(2)}` : "$0"} per 1K
          </div>
        </div>

        <dl className="mt-5 space-y-2.5 border-t border-line-soft pt-4 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Effective CPM</dt>
            <dd className="font-medium tabular">
              ${(Number(rate) || 0).toFixed(2)}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Clippers to exhaust</dt>
            <dd className="font-medium tabular">
              {projectedClippers === null ? "Unlimited" : `${projectedClippers}+`}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Platforms</dt>
            <dd className="font-medium">
              {platforms.length
                ? platforms.map((p) => PLATFORM_LABEL[p]).join(", ")
                : "None selected"}
            </dd>
          </div>
        </dl>

        <p className="mt-5 border-t border-line-soft pt-4 text-xs text-faint leading-relaxed">
          The budget is a hard ceiling. Once verified views have consumed it, the
          campaign stops accepting new clips and nothing further is charged.
        </p>
      </aside>
    </form>
  );
}
