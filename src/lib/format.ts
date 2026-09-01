const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const usdWhole = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export const formatViews = (n: number) => compact.format(n);
export const formatNumber = (n: number) => n.toLocaleString("en-US");
export const formatMoney = (n: number) => usd.format(n);
export const formatMoneyWhole = (n: number) => usdWhole.format(n);

/** Rate cards read better as "$1.40 / 1K views" than as a bare number. */
export const formatRate = (n: number) => `${usd.format(n)}/1K`;

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function formatTimecode(seconds: number): string {
  return formatDuration(seconds);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Relative time. Server-rendered only — don't call this from a client
 * component without suppressing hydration, since the two clocks differ.
 */
export function timeAgo(iso: string): string {
  const diff = Date.now() - Date.parse(iso);
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  return `${months}mo ago`;
}

export function timeUntil(iso: string): string {
  const diff = Date.parse(iso) - Date.now();
  if (diff <= 0) return "ended";
  const days = Math.ceil(diff / 86_400_000);
  if (days === 1) return "1 day left";
  if (days < 45) return `${days} days left`;
  return `${Math.round(days / 30)} months left`;
}

/**
 * Deterministic gradient for a thumbnail placeholder. Same id always gets the
 * same colours, so a clip looks like itself across every page it appears on.
 */
const GRADIENTS = [
  ["#7c3aed", "#db2777"],
  ["#0ea5e9", "#22d3ee"],
  ["#f59e0b", "#ef4444"],
  ["#84cc16", "#14b8a6"],
  ["#8b5cf6", "#3b82f6"],
  ["#ec4899", "#f97316"],
  ["#06b6d4", "#6366f1"],
  ["#eab308", "#84cc16"],
];

export function gradientFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const [from, to] = GRADIENTS[hash % GRADIENTS.length];
  const angle = 20 + (hash % 7) * 25;
  return `linear-gradient(${angle}deg, ${from}, ${to})`;
}

export const pct = (n: number) => `${Math.round(n)}%`;
