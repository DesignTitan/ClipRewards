"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Hides the site chrome on the password gate — every nav link behind it just
 * bounces back to /login until the visitor is through.
 */
export function HideOnGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/login") return null;
  return <>{children}</>;
}
