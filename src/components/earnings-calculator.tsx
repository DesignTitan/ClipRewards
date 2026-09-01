"use client";

import { useState } from "react";

import { formatMoney, formatViews } from "@/lib/format";

/**
 * The pitch in one widget: views × rate ÷ 1,000. Defaults are the median
 * campaign rate and a realistic weekly posting cadence.
 */
export function EarningsCalculator() {
  const [clipsPerWeek, setClipsPerWeek] = useState(12);
  const [avgViews, setAvgViews] = useState(24_000);
  const [rate, setRate] = useState(1.6);

  const weeklyViews = clipsPerWeek * avgViews;
  const weekly = (weeklyViews / 1000) * rate;

  return (
    <div className="card p-5 sm:p-6">
      <div className="eyebrow">Earnings estimator</div>
      <h3 className="mt-2 text-lg font-semibold">What a week could look like</h3>

      <div className="mt-5 space-y-5">
        <Slider
          label="Clips posted per week"
          value={clipsPerWeek}
          min={1}
          max={60}
          step={1}
          display={String(clipsPerWeek)}
          onChange={setClipsPerWeek}
        />
        <Slider
          label="Average views per clip"
          value={avgViews}
          min={1000}
          max={250_000}
          step={1000}
          display={formatViews(avgViews)}
          onChange={setAvgViews}
        />
        <Slider
          label="Campaign rate per 1K views"
          value={rate}
          min={0.5}
          max={4}
          step={0.1}
          display={formatMoney(rate)}
          onChange={setRate}
        />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 border-t border-line-soft pt-5">
        <div>
          <div className="eyebrow">Weekly views</div>
          <div className="mt-1 text-2xl font-bold tracking-tight tabular">
            {formatViews(weeklyViews)}
          </div>
        </div>
        <div>
          <div className="eyebrow">Weekly earnings</div>
          <div className="mt-1 text-2xl font-bold tracking-tight text-lime tabular">
            {formatMoney(weekly)}
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-faint leading-relaxed">
        Illustrative only. Real payouts depend on verified views, each campaign&apos;s
        qualifying threshold, and its per-clipper cap.
      </p>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
}) {
  const id = `slider-${label.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-medium text-muted">
          {label}
        </label>
        <span className="text-sm font-semibold tabular">{display}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-[var(--color-lime)]"
      />
    </div>
  );
}
