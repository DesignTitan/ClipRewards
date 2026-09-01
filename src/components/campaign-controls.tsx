"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { formatMoneyWhole } from "@/lib/format";
import type { Campaign } from "@/lib/types";

/**
 * Brand-side controls: pause/resume a campaign and top up its budget.
 * Both hit PATCH /api/campaigns/[id].
 */
export function CampaignControls({ campaign }: { campaign: Campaign }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toppingUp, setToppingUp] = useState(false);
  const [topUp, setTopUp] = useState("");

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error ?? "Update failed.");
        return;
      }
      setToppingUp(false);
      setTopUp("");
      startTransition(() => router.refresh());
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  const working = busy || pending;
  const nextStatus = campaign.status === "active" ? "paused" : "active";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {campaign.status !== "completed" && (
          <button
            type="button"
            className="btn btn-secondary"
            disabled={working}
            onClick={() => patch({ status: nextStatus })}
          >
            {campaign.status === "active" ? "Pause campaign" : "Resume campaign"}
          </button>
        )}
        <button
          type="button"
          className="btn btn-secondary"
          disabled={working}
          onClick={() => setToppingUp((v) => !v)}
        >
          Top up budget
        </button>
        {campaign.status !== "completed" && (
          <button
            type="button"
            className="btn btn-ghost"
            disabled={working}
            onClick={() => patch({ status: "completed" })}
          >
            Mark complete
          </button>
        )}
      </div>

      {toppingUp && (
        <div className="card p-4">
          <label htmlFor="topup" className="label">
            New total budget
          </label>
          <div className="flex gap-2">
            <input
              id="topup"
              type="number"
              min={campaign.spent}
              step={100}
              className="input"
              placeholder={String(campaign.budget)}
              value={topUp}
              onChange={(e) => setTopUp(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-primary"
              disabled={working || !topUp}
              onClick={() => patch({ budget: Number(topUp) })}
            >
              {working ? "Saving…" : "Save"}
            </button>
          </div>
          <p className="mt-2 text-xs text-faint">
            Currently {formatMoneyWhole(campaign.budget)}, with{" "}
            {formatMoneyWhole(campaign.spent)} already spent. The new total
            can&apos;t go below what&apos;s been spent.
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
