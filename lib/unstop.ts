import { getTinyFish } from "./tinyfish";
import { extractedEventSchema, type ExtractedEvent } from "./types";

/**
 * Optional source (PRD "only if time remains"): use the TinyFish Agent API with
 * a stealth browser profile to read Unstop's hackathon listing, which blocks
 * plain fetching. Gated behind EVENTRADAR_ENABLE_UNSTOP so it never slows the
 * default flow or spends agent credits unless explicitly turned on.
 *
 * Per the PRD, "captcha"/"blocked" anywhere in the result is treated as a
 * failure even when the run status is COMPLETED.
 */
const UNSTOP_URL = "https://unstop.com/hackathons";

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    events: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          start_date: { type: ["string", "null"] },
          end_date: { type: ["string", "null"] },
          date_text: { type: "string" },
          mode: { type: ["string", "null"] },
          venue_or_city: { type: ["string", "null"] },
          event_type: { type: "string" },
          themes: { type: "array", items: { type: "string" } },
          eligibility: { type: ["string", "null"] },
          registration_url: { type: ["string", "null"] },
          source_url: { type: ["string", "null"] },
        },
        required: ["name"],
      },
    },
  },
  required: ["events"],
} as const;

export function unstopEnabled(): boolean {
  return process.env.EVENTRADAR_ENABLE_UNSTOP === "1";
}

export async function fetchUnstopViaAgent(topic: string): Promise<{
  events: ExtractedEvent[];
  error: string | null;
}> {
  const client = getTinyFish();
  try {
    const run = await client.agent.run({
      goal: `List upcoming hackathons on this page related to "${topic}". For each, capture name, dates (raw text and ISO if shown), mode, venue/city, themes, eligibility, and the registration URL. Use only what is on the page.`,
      url: UNSTOP_URL,
      browser_profile: "stealth",
      output_schema: OUTPUT_SCHEMA,
    });

    const blob = JSON.stringify(run.result ?? {}).toLowerCase();
    if (blob.includes("captcha") || blob.includes("blocked")) {
      return { events: [], error: "blocked (captcha)" };
    }
    if (run.status !== "COMPLETED") {
      return { events: [], error: run.error?.message ?? run.status };
    }

    const rawEvents = Array.isArray((run.result as { events?: unknown })?.events)
      ? ((run.result as { events: unknown[] }).events)
      : [];
    const events: ExtractedEvent[] = [];
    for (const r of rawEvents) {
      const parsed = extractedEventSchema.safeParse(r);
      if (parsed.success) {
        events.push({ ...parsed.data, source_url: parsed.data.source_url ?? UNSTOP_URL });
      }
    }
    return { events, error: null };
  } catch (err) {
    return { events: [], error: err instanceof Error ? err.message : String(err) };
  }
}

export const UNSTOP_SOURCE = { name: "Unstop", url: UNSTOP_URL };
