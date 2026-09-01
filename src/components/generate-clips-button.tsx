"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function GenerateClipsButton({
  campaignId,
  disabled,
  disabledReason,
  label = "Generate my clips",
}: {
  campaignId: string;
  disabled?: boolean;
  disabledReason?: string;
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(4);

  async function generate() {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/clips`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ count }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error ?? "Clip generation failed. Try again.");
        return;
      }

      startTransition(() => router.refresh());
    } catch {
      setError("Couldn't reach the clipping service.");
    } finally {
      setBusy(false);
    }
  }

  const working = busy || pending;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="clip-count" className="sr-only">
          Number of clips to generate
        </label>
        <select
          id="clip-count"
          className="input w-auto py-2"
          value={count}
          disabled={disabled || working}
          onChange={(e) => setCount(Number(e.target.value))}
        >
          {[2, 4, 6, 8].map((n) => (
            <option key={n} value={n}>
              {n} clips
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-primary"
          onClick={generate}
          disabled={disabled || working}
        >
          {working ? "Cutting…" : label}
        </button>
      </div>

      {disabled && disabledReason && (
        <p className="mt-2 text-xs text-muted">{disabledReason}</p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
