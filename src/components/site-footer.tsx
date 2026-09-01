import Link from "next/link";

import { isDemoMode } from "@/lib/db";

import { Logo } from "./logo";

const COLUMNS = [
  {
    title: "Marketplace",
    links: [
      { href: "/campaigns", label: "Browse campaigns" },
      { href: "/leaderboard", label: "Leaderboard" },
      { href: "/clipper", label: "Clipper dashboard" },
      { href: "/clipper/payouts", label: "Payouts" },
    ],
  },
  {
    title: "For brands",
    links: [
      { href: "/brand", label: "Brand dashboard" },
      { href: "/brand/campaigns/new", label: "Create a campaign" },
      { href: "/brand#budget", label: "Budget & spend" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line-soft mt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-muted leading-relaxed">
              Brands fund the campaign. AI cuts the clips. Clippers post them and
              get paid per thousand views.
            </p>
            {isDemoMode && (
              <p className="mt-4 inline-flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-xs text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-amber" aria-hidden />
                Demo mode — seeded data, no Supabase connected
              </p>
            )}
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="eyebrow mb-3">{column.title}</h3>
              <ul className="space-y-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted hover:text-text transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-line-soft pt-6 text-xs text-faint">
          ClipRewards — a reference implementation of a clip-rewards marketplace.
        </div>
      </div>
    </footer>
  );
}
