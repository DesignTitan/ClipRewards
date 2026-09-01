"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { formatMoney } from "@/lib/format";

const METHODS = ["Stripe Connect", "PayPal", "Wise"];
const MINIMUM = 50;

export function PayoutRequestForm({ available }: { available: number }) {
  const router = useRouter();
  const [amount, setAmount] = useState(available >= MINIMUM ? available.toFixed(2) : "");
  const [method, setMethod] = useState(METHODS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const belowMinimum = available < MINIMUM;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/payouts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amount: Number(amount), method }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload.error ?? "Couldn't submit the request.");
        return;
      }

      setDone(true);
      setAmount("");
      startTransition(() => router.refresh());
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  const working = submitting || pending;

  return (
    <form onSubmit={submit} className="card p-5 sm:p-6">
      <div className="eyebrow">Request a payout</div>
      <div className="mt-2 text-3xl font-bold tracking-tight text-lime tabular">
        {formatMoney(available)}
      </div>
      <p className="mt-1 text-xs text-muted">available right now</p>

      <div className="mt-5 space-y-4 border-t border-line-soft pt-5">
        <div>
          <label htmlFor="payout-amount" className="label">
            Amount
          </label>
          <input
            id="payout-amount"
            type="number"
            min={MINIMUM}
            max={available}
            step={0.01}
            className="input"
            placeholder={`${MINIMUM}.00`}
            value={amount}
            disabled={belowMinimum || working}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="payout-method" className="label">
            Method
          </label>
          <select
            id="payout-method"
            className="input"
            value={method}
            disabled={belowMinimum || working}
            onChange={(e) => setMethod(e.target.value)}
          >
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={belowMinimum || working || !amount}
        >
          {working ? "Submitting…" : "Request payout"}
        </button>

        {belowMinimum && (
          <p className="text-xs text-muted">
            You need at least {formatMoney(MINIMUM)} available to withdraw. Keep
            posting — earnings settle 14 days after a clip goes live.
          </p>
        )}

        {done && !error && (
          <p role="status" className="text-xs text-lime">
            Requested. Payouts are batched and usually land within two business
            days.
          </p>
        )}

        {error && (
          <p role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
