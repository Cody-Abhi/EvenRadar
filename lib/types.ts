import { z } from "zod";

/**
 * Canonical Event shape. `null` always means "not listed on the page" — it is
 * never backfilled from another source. `fields_missing` records which fields
 * came back absent so the UI can show an honest "Not listed".
 */
export const eventSchema = z.object({
  name: z.string(),
  start_date: z.string().nullable(), // ISO (YYYY-MM-DD) or null
  end_date: z.string().nullable(), // ISO (YYYY-MM-DD) or null
  date_text: z.string(), // raw text exactly as printed on the page
  mode: z.enum(["online", "offline", "hybrid"]).nullable(),
  venue_or_city: z.string().nullable(),
  event_type: z.enum(["hackathon", "meetup", "conference", "workshop", "other"]),
  themes: z.array(z.string()),
  eligibility: z.string().nullable(),
  registration_url: z.string().nullable(),
  source_url: z.string(),
  source_name: z.string(),
  fields_missing: z.array(z.string()),
  fetched_at: z.string(),
});

export type EventItem = z.infer<typeof eventSchema>;

/**
 * Shape the LLM is asked to return per page. We keep it looser than
 * `eventSchema` (no source_name/fetched_at/fields_missing — the pipeline fills
 * those) and tolerate a few value hiccups, then normalize in post-process.
 */
export const extractedEventSchema = z.object({
  name: z.string().min(1),
  start_date: z.string().nullable().default(null),
  end_date: z.string().nullable().default(null),
  date_text: z.string().default(""),
  mode: z.enum(["online", "offline", "hybrid"]).nullable().default(null),
  venue_or_city: z.string().nullable().default(null),
  event_type: z
    .enum(["hackathon", "meetup", "conference", "workshop", "other"])
    .default("other"),
  themes: z.array(z.string()).default([]),
  eligibility: z.string().nullable().default(null),
  registration_url: z.string().nullable().default(null),
  source_url: z.string().nullable().default(null),
});

export type ExtractedEvent = z.infer<typeof extractedEventSchema>;

export const extractionResultSchema = z.object({
  events: z.array(extractedEventSchema),
});

/** Per-source outcome shown in the status strip. */
export interface SourceStatus {
  name: string;
  url: string;
  ok: boolean;
  count: number; // number of events kept from this source
  error: string | null;
}

export interface SearchQuery {
  topic: string;
  location: string;
  online: boolean;
}

export interface EventsApiResponse {
  query: SearchQuery;
  events: EventItem[];
  sources: SourceStatus[];
  errors: string[]; // human-readable failed-source summaries for the banner
  tookMs: number;
}
