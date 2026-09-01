"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Logo } from "./logo";

const NAV = [
  { href: "/campaigns", label: "Browse campaigns" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/brand", label: "Brand dashboard" },
  { href: "/clipper", label: "Clipper dashboard" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-50 border-b border-line-soft bg-ink/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="shrink-0" aria-label="ClipRewards home">
          <Logo />
        </Link>

        <nav className="hidden md:flex items-center gap-1" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                isActive(item.href)
                  ? "bg-surface-2 text-text"
                  : "text-muted hover:text-text hover:bg-surface"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/brand/campaigns/new"
            className="btn btn-primary hidden sm:inline-flex"
          >
            Start a campaign
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="Toggle navigation"
            className="btn btn-secondary md:hidden px-2.5"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d={open ? "M6 6l12 12M18 6L6 18" : "M4 7h16M4 12h16M4 17h16"}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav
          className="md:hidden border-t border-line-soft bg-ink px-4 py-3"
          aria-label="Mobile"
        >
          <div className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-3 py-2 text-sm ${
                  isActive(item.href) ? "bg-surface-2 text-text" : "text-muted"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/brand/campaigns/new"
              onClick={() => setOpen(false)}
              className="btn btn-primary mt-2"
            >
              Start a campaign
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
