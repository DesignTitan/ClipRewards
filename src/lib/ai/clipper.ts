import type { Campaign } from "../types";

/**
 * AI clipping seam.
 *
 * The platform never talks to a video model directly — it talks to a
 * `ClipperProvider`. Two ship here:
 *
 *   stub  (default) — deterministic heuristic segmentation, no network. Good
 *                     enough to exercise the whole review → schedule → post
 *                     flow without a video pipeline behind it.
 *   http            — POSTs the job to your own splitting service and expects
 *                     the normalized shape below back.
 *
 * To plug in a real provider (Ssemble, Opus, Vizard, a self-hosted
 * ffmpeg + Whisper + LLM pipeline), either point `CLIPPER_API_URL` at an
 * adapter that returns this shape, or add a third implementation here. Nothing
 * above this file changes.
 */

export interface ClipSuggestion {
  title: string;
  startSeconds: number;
  endSeconds: number;
  /** 0–100. How strongly the model rates this as a standalone hook. */
  hookScore: number;
  /** Suggested post caption. */
  caption: string;
  /** Why the model picked this moment — surfaced to the clipper in review. */
  reason: string;
  /** Burned-in caption cues, if the provider returns them. */
  transcript?: string;
}

export interface ClipRequest {
  campaign: Pick<
    Campaign,
    "id" | "title" | "sourceUrl" | "sourceDurationSeconds" | "guidelines" | "platforms"
  >;
  /** How many clips to return. */
  count: number;
  /** Target length window in seconds. */
  minLength?: number;
  maxLength?: number;
  /** Reframe to 9:16 with subject tracking. */
  verticalCrop?: boolean;
  /** Burn word-level captions into the render. */
  captions?: boolean;
}

export interface ClipperProvider {
  readonly name: string;
  generate(request: ClipRequest): Promise<ClipSuggestion[]>;
}

// ---------------------------------------------------------------------------
// Stub provider
// ---------------------------------------------------------------------------

const HOOK_TEMPLATES = [
  "The part everyone rewinds",
  "This is the bit that lands",
  "Nobody says this out loud",
  "The answer that stopped the room",
  "Why the obvious advice fails",
  "The three-sentence version",
  "This reframes the whole thing",
  "What actually changed",
  "The mistake almost everyone makes",
  "Read this before you start",
];

const CAPTION_TEMPLATES = [
  "watch this all the way through 👀",
  "this reframed it for me",
  "had to clip this one",
  "the honesty here is rare",
  "saving this",
  "he's right and it's annoying",
];

const REASONS = [
  "Sharp sentiment shift with a complete thought inside 40 seconds.",
  "Speaker raises pace and volume — strong retention signal in the source.",
  "Self-contained answer to a question; no setup needed.",
  "Concrete number stated on camera, which historically over-indexes.",
  "Contrarian claim followed immediately by a supporting example.",
  "Clean topic boundary on both sides — cuts without clipping a sentence.",
];

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export class StubClipperProvider implements ClipperProvider {
  readonly name = "stub";

  async generate(request: ClipRequest): Promise<ClipSuggestion[]> {
    const {
      campaign,
      count,
      minLength = 22,
      maxLength = 58,
    } = request;

    const duration = Math.max(120, campaign.sourceDurationSeconds);
    const suggestions: ClipSuggestion[] = [];

    // Spread candidate windows across the source, jittered per campaign so two
    // campaigns on the same video don't produce identical cut points.
    const seed = hash(campaign.id);
    const stride = duration / (count + 1);

    for (let i = 0; i < count; i += 1) {
      // Unsigned shifts throughout: `>>` is signed in JS, so a seed with the
      // high bit set yields a negative jitter and an inverted clip window.
      const jitter = ((seed >>> (i % 12)) % 100) / 100;
      const rawStart = Math.floor(
        stride * (i + 1) - stride * 0.35 + jitter * stride * 0.5,
      );
      const start = Math.max(0, Math.min(rawStart, duration - minLength));
      const length = Math.floor(minLength + jitter * (maxLength - minLength));
      const end = Math.min(duration, start + Math.max(minLength, length));

      suggestions.push({
        title: HOOK_TEMPLATES[(seed + i * 7) % HOOK_TEMPLATES.length],
        startSeconds: start,
        endSeconds: end,
        hookScore: 55 + ((seed >>> i) % 44),
        caption: CAPTION_TEMPLATES[(seed + i * 3) % CAPTION_TEMPLATES.length],
        reason: REASONS[(seed + i * 5) % REASONS.length],
      });
    }

    return suggestions.sort((a, b) => b.hookScore - a.hookScore);
  }
}

// ---------------------------------------------------------------------------
// HTTP provider
// ---------------------------------------------------------------------------

export class HttpClipperProvider implements ClipperProvider {
  readonly name = "http";

  constructor(
    private readonly endpoint: string,
    private readonly apiKey: string,
  ) {}

  async generate(request: ClipRequest): Promise<ClipSuggestion[]> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify({
        source_url: request.campaign.sourceUrl,
        duration_seconds: request.campaign.sourceDurationSeconds,
        clip_count: request.count,
        min_length: request.minLength ?? 22,
        max_length: request.maxLength ?? 58,
        vertical_crop: request.verticalCrop ?? true,
        captions: request.captions ?? true,
        // Guidelines are passed through so a model-backed provider can bias
        // its selection — e.g. "don't cut mid-sentence".
        guidelines: request.campaign.guidelines,
        platforms: request.campaign.platforms,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `Clipping provider returned ${response.status}: ${await response.text()}`,
      );
    }

    const payload = (await response.json()) as { clips?: unknown };
    if (!Array.isArray(payload.clips)) {
      throw new Error("Clipping provider response missing a `clips` array.");
    }

    return payload.clips.map((raw) => {
      const clip = raw as Record<string, unknown>;
      return {
        title: String(clip.title ?? "Untitled clip"),
        startSeconds: Number(clip.start_seconds ?? 0),
        endSeconds: Number(clip.end_seconds ?? 0),
        hookScore: Math.round(Number(clip.hook_score ?? 50)),
        caption: String(clip.caption ?? ""),
        reason: String(clip.reason ?? ""),
        transcript: clip.transcript ? String(clip.transcript) : undefined,
      } satisfies ClipSuggestion;
    });
  }
}

export function getClipperProvider(): ClipperProvider {
  const configured = process.env.CLIPPER_PROVIDER ?? "stub";
  const url = process.env.CLIPPER_API_URL ?? "";

  if (configured === "http" && url) {
    return new HttpClipperProvider(url, process.env.CLIPPER_API_KEY ?? "");
  }

  return new StubClipperProvider();
}
