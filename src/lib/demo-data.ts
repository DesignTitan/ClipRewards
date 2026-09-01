import type {
  Campaign,
  Clip,
  ClipStatus,
  Payout,
  Platform,
  Profile,
} from "./types";

/**
 * Deterministic seed data used when Supabase credentials are absent.
 *
 * Everything is generated from a fixed epoch and a seeded PRNG so that the
 * numbers are identical on every server instance — no hydration drift, no
 * "the leaderboard changed when I refreshed" weirdness in demo mode.
 */

/** Fixed "now" for the demo dataset. */
export const DEMO_EPOCH = Date.parse("2026-09-01T12:00:00.000Z");

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const daysAgo = (n: number) => new Date(DEMO_EPOCH - n * 86_400_000).toISOString();
const daysAhead = (n: number) => new Date(DEMO_EPOCH + n * 86_400_000).toISOString();

export const DEMO_BRANDS: Profile[] = [
  {
    id: "brand-lumen",
    role: "brand",
    handle: "lumenlabs",
    displayName: "Lumen Labs",
    avatarEmoji: "🔦",
    bio: "AI research studio shipping developer tools. We publish a weekly deep-dive podcast.",
    website: "https://lumenlabs.example",
    createdAt: daysAgo(210),
  },
  {
    id: "brand-mach",
    role: "brand",
    handle: "machfitness",
    displayName: "Mach Fitness",
    avatarEmoji: "🏋️",
    bio: "Strength training app. 40-minute coaching sessions, three a week.",
    website: "https://machfitness.example",
    createdAt: daysAgo(160),
  },
  {
    id: "brand-orbit",
    role: "brand",
    handle: "orbitmoney",
    displayName: "Orbit Money",
    avatarEmoji: "🪐",
    bio: "Personal finance for people who hate personal finance content.",
    website: "https://orbitmoney.example",
    createdAt: daysAgo(95),
  },
];

export const DEMO_CLIPPERS: Profile[] = [
  {
    id: "clipper-nova",
    role: "clipper",
    handle: "novacuts",
    displayName: "Nova",
    avatarEmoji: "⚡",
    bio: "Full-time clipper. Tech + business. 4 accounts, ~30 posts a week.",
    website: null,
    createdAt: daysAgo(180),
  },
  {
    id: "clipper-rico",
    role: "clipper",
    handle: "ricoedits",
    displayName: "Rico",
    avatarEmoji: "🎬",
    bio: "Editing since 2021. Fitness and sports niche.",
    website: null,
    createdAt: daysAgo(150),
  },
  {
    id: "clipper-may",
    role: "clipper",
    handle: "maybeclips",
    displayName: "May",
    avatarEmoji: "🌸",
    bio: "Finance clips. Captions in 6 languages.",
    website: null,
    createdAt: daysAgo(120),
  },
  {
    id: "clipper-dex",
    role: "clipper",
    handle: "dexdaily",
    displayName: "Dex",
    avatarEmoji: "🛰️",
    bio: "One clip a day, every day, no exceptions.",
    website: null,
    createdAt: daysAgo(88),
  },
  {
    id: "clipper-juno",
    role: "clipper",
    handle: "junoshorts",
    displayName: "Juno",
    avatarEmoji: "🔮",
    bio: "Hook-first editing. I test 3 openers per clip.",
    website: null,
    createdAt: daysAgo(64),
  },
  {
    id: "clipper-tavo",
    role: "clipper",
    handle: "tavoclips",
    displayName: "Tavo",
    avatarEmoji: "🌵",
    bio: "New here. Learning fast.",
    website: null,
    createdAt: daysAgo(31),
  },
  {
    id: "clipper-wren",
    role: "clipper",
    handle: "wrenmade",
    displayName: "Wren",
    avatarEmoji: "🪶",
    bio: "Motion design + clipping. I make the captions move.",
    website: null,
    createdAt: daysAgo(22),
  },
  {
    id: "clipper-sol",
    role: "clipper",
    handle: "solstudio",
    displayName: "Sol",
    avatarEmoji: "☀️",
    bio: "Two-person studio. We clip at volume.",
    website: null,
    createdAt: daysAgo(12),
  },
];

/** The signed-in clipper in demo mode. */
export const DEMO_CURRENT_CLIPPER_ID = "clipper-nova";
/** The signed-in brand in demo mode. */
export const DEMO_CURRENT_BRAND_ID = "brand-lumen";

export const DEMO_CAMPAIGNS: Campaign[] = [
  {
    id: "cmp-lumen-agents",
    brandId: "brand-lumen",
    title: "The Agent Economy — 2hr founder interview",
    description:
      "Our most-watched episode of the year. We want the sharpest 30–60 second moments cut out and posted anywhere short-form lives. Strong opinions travel; find them.",
    sourceUrl: "https://youtube.com/watch?v=lumen-agent-economy",
    sourceThumbnail: null,
    sourceDurationSeconds: 7420,
    ratePerThousand: 1.4,
    budget: 12000,
    spent: 6842.19,
    maxPayoutPerClipper: 2500,
    minViewsToQualify: 1000,
    platforms: ["tiktok", "instagram", "youtube"],
    guidelines: [
      "Keep the Lumen Labs watermark in the bottom-right corner.",
      "Hook must land in the first 2 seconds — no slow intros.",
      "Burned-in captions required. Any style, but readable on mobile.",
      "No political commentary in the caption or on-screen text.",
      "Link the full episode in your bio or the first comment.",
    ],
    status: "active",
    endsAt: daysAhead(24),
    createdAt: daysAgo(38),
  },
  {
    id: "cmp-lumen-devtools",
    brandId: "brand-lumen",
    title: "Why your dev tools are broken — conference talk",
    description:
      "45-minute keynote with a lot of quotable lines. Looking for developer-audience clips. Technical accuracy matters more than reach here.",
    sourceUrl: "https://youtube.com/watch?v=lumen-devtools-keynote",
    sourceThumbnail: null,
    sourceDurationSeconds: 2760,
    ratePerThousand: 2.1,
    budget: 5000,
    spent: 1204.5,
    maxPayoutPerClipper: 1000,
    minViewsToQualify: 500,
    platforms: ["tiktok", "youtube", "x"],
    guidelines: [
      "Do not cut mid-sentence — full thoughts only.",
      "Code on screen must stay legible; don't crop the terminal out.",
      "Captions required.",
    ],
    status: "active",
    endsAt: daysAhead(41),
    createdAt: daysAgo(19),
  },
  {
    id: "cmp-mach-transform",
    brandId: "brand-mach",
    title: "12-week transformation series — full coaching sessions",
    description:
      "Six long sessions with our head coach. Before/after moments and the mid-session mindset talks perform best. Vertical only.",
    sourceUrl: "https://youtube.com/watch?v=mach-transformation-s1",
    sourceThumbnail: null,
    sourceDurationSeconds: 5100,
    ratePerThousand: 1.75,
    budget: 20000,
    spent: 14118.6,
    maxPayoutPerClipper: 4000,
    minViewsToQualify: 2000,
    platforms: ["tiktok", "instagram"],
    guidelines: [
      "Vertical 9:16 only. No letterboxing.",
      "Never imply a guaranteed result — no 'lose 20lbs in 2 weeks' framing.",
      "Include the Mach logo sting in the last second.",
      "Tag @machfitness in the caption.",
    ],
    status: "active",
    endsAt: daysAhead(9),
    createdAt: daysAgo(72),
  },
  {
    id: "cmp-mach-nutrition",
    brandId: "brand-mach",
    title: "Nutrition myths, debunked",
    description:
      "Quick-hit myth-busting format. Each myth is already self-contained in the source — one myth per clip.",
    sourceUrl: "https://youtube.com/watch?v=mach-nutrition-myths",
    sourceThumbnail: null,
    sourceDurationSeconds: 3240,
    ratePerThousand: 1.2,
    budget: 6000,
    spent: 0,
    maxPayoutPerClipper: 1500,
    minViewsToQualify: 1000,
    platforms: ["tiktok", "instagram", "youtube"],
    guidelines: [
      "One myth per clip. Don't stitch two together.",
      "Keep the on-screen myth/fact labels from the source.",
    ],
    status: "draft",
    endsAt: null,
    createdAt: daysAgo(4),
  },
  {
    id: "cmp-orbit-debt",
    brandId: "brand-orbit",
    title: "Getting out of $60k of debt — 3-part story",
    description:
      "Emotional, story-driven long-form. The turning-point moments are what people share. High rate because the audience converts.",
    sourceUrl: "https://youtube.com/watch?v=orbit-debt-story",
    sourceThumbnail: null,
    sourceDurationSeconds: 4380,
    ratePerThousand: 2.6,
    budget: 15000,
    spent: 9331.05,
    maxPayoutPerClipper: 3000,
    minViewsToQualify: 1500,
    platforms: ["tiktok", "instagram", "youtube", "x"],
    guidelines: [
      "No financial advice framing — this is one person's story.",
      "Do not add dollar figures that aren't said out loud in the clip.",
      "Captions required, high contrast.",
      "Disclosure line 'Not financial advice' in the caption.",
    ],
    status: "active",
    endsAt: daysAhead(31),
    createdAt: daysAgo(52),
  },
  {
    id: "cmp-orbit-budget",
    brandId: "brand-orbit",
    title: "The 15-minute budget teardown",
    description:
      "Screen-recorded teardowns of real budgets. Paused while we rework the source — will reopen.",
    sourceUrl: "https://youtube.com/watch?v=orbit-budget-teardown",
    sourceThumbnail: null,
    sourceDurationSeconds: 1980,
    ratePerThousand: 1.1,
    budget: 4000,
    spent: 812.4,
    maxPayoutPerClipper: 800,
    minViewsToQualify: 1000,
    platforms: ["tiktok", "instagram"],
    guidelines: [
      "Blur any real names or account numbers visible on screen.",
      "Captions required.",
    ],
    status: "paused",
    endsAt: daysAhead(60),
    createdAt: daysAgo(28),
  },
];

const CLIP_TITLES = [
  "The part everyone screenshots",
  "He did not expect this question",
  "This is why nobody talks about it",
  "3 minutes that changed my mind",
  "The mistake almost everyone makes",
  "Nobody warns you about this part",
  "I was completely wrong about this",
  "The honest answer, finally",
  "This one line reframed everything",
  "What actually happened next",
  "The number that stopped the room",
  "Say this instead",
  "Why the obvious advice fails",
  "The turning point",
  "It took 6 years to learn this",
  "The uncomfortable truth",
  "This changed how I work",
  "What they don't put in the pitch",
  "Read this before you start",
  "The 30-second version",
];

const CAPTIONS = [
  "the part nobody wants to say out loud 😭",
  "watch until the end, seriously",
  "this reframed the whole thing for me",
  "i had to rewind this three times",
  "he's absolutely right and it's annoying",
  "wish someone told me this two years ago",
  "the honesty here is rare",
  "saving this one",
];

/**
 * Builds the clip table. Distribution is intentionally lopsided — a handful of
 * clips carry most of the views, which is what the real thing looks like.
 */
function buildClips(): Clip[] {
  const rand = mulberry32(20260901);
  const clips: Clip[] = [];
  let n = 0;

  const activeCampaigns = DEMO_CAMPAIGNS.filter((c) => c.status !== "draft");

  for (const campaign of activeCampaigns) {
    // Who's working this campaign. Earlier clippers take on more.
    const participantCount = campaign.status === "paused" ? 2 : 4 + Math.floor(rand() * 4);
    const participants = DEMO_CLIPPERS.slice(0, participantCount);

    // Mirrors the ceilings the `recalculate_clip_earnings` trigger enforces in
    // Postgres, so demo numbers can't show a campaign overspending its budget.
    let campaignSpend = 0;
    const clipperSpend = new Map<string, number>();

    for (const clipper of participants) {
      const clipCount = 2 + Math.floor(rand() * 5);

      for (let i = 0; i < clipCount; i += 1) {
        n += 1;
        const roll = rand();
        let status: ClipStatus;
        if (roll > 0.86) status = "ready";
        else if (roll > 0.78) status = "scheduled";
        else if (roll > 0.74) status = "generating";
        else if (roll > 0.70) status = "rejected";
        else status = "posted";

        const start = Math.floor(rand() * (campaign.sourceDurationSeconds - 90));
        const length = 22 + Math.floor(rand() * 45);
        const platform =
          campaign.platforms[Math.floor(rand() * campaign.platforms.length)];
        const postedDaysAgo = 1 + Math.floor(rand() * 26);

        // Long tail: most clips do modest numbers, a few break out hard.
        const viral = rand();
        const views =
          status === "posted"
            ? Math.floor(
                viral > 0.94
                  ? 800_000 + rand() * 2_200_000
                  : viral > 0.78
                    ? 150_000 + rand() * 450_000
                    : 5_000 + rand() * 85_000,
              )
            : 0;

        const qualified = views >= campaign.minViewsToQualify;
        let earnings = qualified
          ? Math.round((views / 1000) * campaign.ratePerThousand * 100) / 100
          : 0;

        // Per-clipper cap, then the campaign budget ceiling.
        const alreadyEarned = clipperSpend.get(clipper.id) ?? 0;
        if (campaign.maxPayoutPerClipper !== null) {
          earnings = Math.min(
            earnings,
            Math.max(0, campaign.maxPayoutPerClipper - alreadyEarned),
          );
        }
        earnings = Math.round(
          Math.min(earnings, Math.max(0, campaign.budget - campaignSpend)) * 100,
        ) / 100;

        campaignSpend += earnings;
        clipperSpend.set(clipper.id, alreadyEarned + earnings);

        clips.push({
          id: `clip-${String(n).padStart(3, "0")}`,
          campaignId: campaign.id,
          clipperId: clipper.id,
          title: CLIP_TITLES[n % CLIP_TITLES.length],
          startSeconds: start,
          endSeconds: start + length,
          thumbnail: null,
          captionText: CAPTIONS[n % CAPTIONS.length],
          hookScore: 48 + Math.floor(rand() * 51),
          status,
          platform: status === "generating" || status === "ready" ? null : platform,
          postUrl:
            status === "posted"
              ? `https://${platform === "x" ? "x.com" : `${platform}.com`}/${clipper.handle}/p/${n}`
              : null,
          scheduledFor: status === "scheduled" ? daysAhead(1 + Math.floor(rand() * 6)) : null,
          postedAt: status === "posted" ? daysAgo(postedDaysAgo) : null,
          views,
          likes: Math.floor(views * (0.03 + rand() * 0.07)),
          earnings,
          createdAt: daysAgo(postedDaysAgo + 1 + Math.floor(rand() * 4)),
        });
      }
    }
  }

  return clips;
}

export const DEMO_CLIPS: Clip[] = buildClips();

const METHODS = ["Stripe Connect", "PayPal", "Wise"];

/**
 * Payouts are derived from what the clips actually earned rather than
 * hardcoded — otherwise a clipper's history can claim more than they ever
 * made, and the available balance goes nonsense.
 *
 * Roughly half of each clipper's lifetime earnings has been withdrawn, split
 * across one to three requests, leaving a plausible balance on the table.
 */
function buildPayouts(clips: Clip[]): Payout[] {
  const rand = mulberry32(4711);
  const payouts: Payout[] = [];
  let n = 1000;

  for (const clipper of DEMO_CLIPPERS) {
    const lifetime = clips
      .filter((c) => c.clipperId === clipper.id)
      .reduce((total, c) => total + c.earnings, 0);

    // Below the $50 minimum there's nothing to withdraw yet.
    if (lifetime < 150) continue;

    // Kept well under half: roughly another half of lifetime earnings is still
    // inside the 14-day settling window, and the two together must leave a
    // withdrawable balance rather than clamping it to zero.
    let claimable = lifetime * (0.15 + rand() * 0.15);
    const requestCount = 1 + Math.floor(rand() * 3);

    for (let i = 0; i < requestCount && claimable >= 50; i += 1) {
      n += 1;
      const last = i === requestCount - 1;
      const amount = last
        ? Math.round(claimable * 100) / 100
        : Math.round(claimable * (0.35 + rand() * 0.3) * 100) / 100;

      if (amount < 50) break;
      claimable -= amount;

      const requestedDaysAgo = 3 + Math.floor(rand() * 40);
      const roll = rand();
      // The most recent request is usually still moving; older ones settled.
      const status: Payout["status"] =
        requestedDaysAgo < 5
          ? roll > 0.5
            ? "processing"
            : "requested"
          : roll > 0.94
            ? "failed"
            : "paid";

      payouts.push({
        id: `po-${n}`,
        clipperId: clipper.id,
        amount,
        status,
        method: METHODS[Math.floor(rand() * METHODS.length)],
        requestedAt: daysAgo(requestedDaysAgo),
        paidAt: status === "paid" ? daysAgo(requestedDaysAgo - 2) : null,
        reference:
          status === "paid"
            ? `tr_${(n * 7919).toString(16)}`
            : status === "failed"
              ? "err_account_unverified"
              : null,
      });
    }
  }

  return payouts;
}

export const DEMO_PAYOUTS: Payout[] = buildPayouts(DEMO_CLIPS);

export const DEMO_PROFILES: Profile[] = [...DEMO_BRANDS, ...DEMO_CLIPPERS];

export type { Platform };
