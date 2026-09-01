import type { Metadata } from "next";

import { NewCampaignForm } from "./form";

export const metadata: Metadata = {
  title: "Create a campaign",
  description: "Fund a clip campaign and set your rate per 1,000 views.",
};

export default function NewCampaignPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
      <header className="mb-8">
        <span className="eyebrow">Brand</span>
        <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">
          Create a campaign
        </h1>
        <p className="mt-3 max-w-2xl text-muted leading-relaxed">
          Point us at a long-form video, set what a thousand views is worth to
          you, and write the rules clippers have to follow. You&apos;re never
          charged past the budget you set here.
        </p>
      </header>

      <NewCampaignForm />
    </div>
  );
}
