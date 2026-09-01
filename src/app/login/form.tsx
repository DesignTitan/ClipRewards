"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Something went wrong. Try again.");
        setSubmitting(false);
        return;
      }

      // The cookie is set now, so the proxy will let this through. `refresh()`
      // drops the cached, pre-auth render of the destination.
      router.replace(next);
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6">
      <label className="label" htmlFor="site-password">
        Password
      </label>
      <input
        id="site-password"
        className="input mt-1.5"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="••••••••"
        autoComplete="current-password"
        autoFocus
        required
      />

      {error && (
        <p className="mt-3 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="btn btn-primary mt-4 w-full"
        disabled={submitting || password.length === 0}
      >
        {submitting ? "Checking…" : "Enter"}
      </button>
    </form>
  );
}
