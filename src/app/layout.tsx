import type { Metadata, Viewport } from "next";

import { HideOnGate } from "@/components/hide-on-gate";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ClipRewards — get paid per view for clipping",
    template: "%s · ClipRewards",
  },
  description:
    "A two-sided marketplace where brands fund clip campaigns and clippers earn per 1,000 views. AI cuts the shorts, you review, schedule, and get paid.",
  openGraph: {
    title: "ClipRewards",
    description:
      "Brands fund the campaign. AI cuts the clips. Clippers post and earn per view.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#07080a",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <HideOnGate>
          <SiteHeader />
        </HideOnGate>
        <main className="flex-1">{children}</main>
        <HideOnGate>
          <SiteFooter />
        </HideOnGate>
      </body>
    </html>
  );
}
