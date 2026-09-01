import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-32 text-center">
      <div className="font-mono text-sm text-lime">404</div>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">
        That page got cut.
      </h1>
      <p className="mt-3 text-muted leading-relaxed">
        The campaign or clip you&apos;re after doesn&apos;t exist — or it was
        taken down.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/campaigns" className="btn btn-primary">
          Browse campaigns
        </Link>
        <Link href="/" className="btn btn-secondary">
          Back home
        </Link>
      </div>
    </div>
  );
}
