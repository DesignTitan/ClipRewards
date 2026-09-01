import type { Metadata } from "next";

import { Logo } from "@/components/logo";

import { LoginForm } from "./form";

export const metadata: Metadata = {
  title: "Enter password",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;

  // Only ever bounce back to a path on this site — never to an absolute URL a
  // link could have smuggled into `?next=`.
  const next =
    params.next && params.next.startsWith("/") && !params.next.startsWith("//")
      ? params.next
      : "/";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-16">
      <div className="card p-6 sm:p-8">
        <Logo />
        <h1 className="mt-6 text-xl font-semibold tracking-tight">
          This preview is private
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          Enter the password to see ClipRewards.
        </p>
        <LoginForm next={next} />
      </div>
    </div>
  );
}
