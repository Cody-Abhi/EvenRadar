import type { EventItem, ExtractedEvent, SearchQuery } from "./types";
import { normalizeDate, parseIso, startOfToday } from "./dates";
import { cityAliases } from "./sources";

const OPTIONAL_FIELDS: (keyof EventItem)[] = [
  "start_date",
  "end_date",
  "mode",
  "venue_or_city",
  "eligibility",
  "registration_url",
];

function computeMissing(e: EventItem): string[] {
  const missing: string[] = [];
  for (const f of OPTIONAL_FIELDS) {
    if (e[f] === null || e[f] === "") missing.push(f);
  }
  if (e.themes.length === 0) missing.push("themes");
  return missing;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function filledScore(e: EventItem): number {
  let score = 0;
  for (const f of OPTIONAL_FIELDS) if (e[f]) score++;
  if (e.themes.length) score++;
  return score;
}

/** Word-boundary or substring match for topic */
function matchesTopic(e: EventItem, topic: string): boolean {
  const cleanTopic = topic.trim().toLowerCase();
  if (!cleanTopic) return true;

  const tokens = cleanTopic
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9]/g, ""))
    .filter((t) => t.length >= 2);

  if (tokens.length === 0) return true;

  const hay = [
    e.name,
    e.themes.join(" "),
    e.event_type,
    e.venue_or_city ?? "",
    e.date_text,
  ]
    .join(" ")
    .toLowerCase();

  return (
    hay.includes(cleanTopic) ||
    tokens.some((t) => new RegExp(`\\b${t}\\b`).test(hay))
  );
}

const ONLINE_HINT = /\b(online|virtual|remote|anywhere|webinar)\b/i;

function isOnlineEvent(e: EventItem): boolean {
  if (e.mode === "online" || e.mode === "hybrid") return true;
  return ONLINE_HINT.test(`${e.venue_or_city ?? ""} ${e.name} ${e.date_text}`);
}

function matchesLocation(e: EventItem, location: string): boolean {
  if (isOnlineEvent(e)) return true;
  if (!e.venue_or_city) return true;

  const loc = location.toLowerCase().trim();
  if (!loc || loc === "india" || loc === "in") return true;

  const hay = `${e.venue_or_city} ${e.name}`.toLowerCase();
  const tokens = cityAliases(loc).filter((t) => t.length >= 3);
  return tokens.some((t) => hay.includes(t)) || hay.includes("india");
}

/**
 * Pipeline step E. Turns raw per-page extractions into the final, honest list:
 * normalize dates, keep upcoming/ongoing events, filter by topic + location,
 * dedupe (keeping richer record), and sort by start date ascending.
 */
export function postProcess(
  raw: { event: ExtractedEvent; sourceName: string }[],
  query: SearchQuery,
  fetchedAt: string
): EventItem[] {
  const today = startOfToday();
  // Allow a 14-day window for ongoing hackathons / recent weekend events
  const cutoff = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);

  // 1. Normalize into EventItem
  const normalized: EventItem[] = [];
  for (const { event, sourceName } of raw) {
    const name = event.name?.trim();
    const sourceUrl = event.source_url?.trim();
    if (!name || !sourceUrl) continue;

    const start = normalizeDate(event.start_date, event.date_text, sourceName);
    const end = normalizeDate(event.end_date, event.date_text, sourceName);

    const item: EventItem = {
      name,
      start_date: start,
      end_date: end,
      date_text: event.date_text?.trim() ?? "",
      mode: event.mode,
      venue_or_city: event.venue_or_city?.trim() || null,
      event_type: event.event_type,
      themes: Array.from(
        new Set(event.themes.map((t) => t.trim()).filter(Boolean))
      ).slice(0, 8),
      eligibility: event.eligibility?.trim() || null,
      registration_url: event.registration_url?.trim() || null,
      source_url: sourceUrl,
      source_name: sourceName,
      fields_missing: [],
      fetched_at: fetchedAt,
    };
    item.fields_missing = computeMissing(item);
    normalized.push(item);
  }

  // 2. Drop clearly-past events
  const upcoming = normalized.filter((e) => {
    const latest = parseIso(e.end_date) ?? parseIso(e.start_date);
    if (!latest) return true;
    return latest >= cutoff;
  });

  // 3. Topic (+ location unless online-only) filter
  const matched = upcoming.filter((e) => {
    if (!matchesTopic(e, query.topic)) return false;
    if (query.online) return isOnlineEvent(e);
    if (query.location.trim()) return matchesLocation(e, query.location);
    return true;
  });

  // 4. Dedupe by normalized name + start_date
  const byKey = new Map<string, EventItem>();
  for (const e of matched) {
    const key = `${normalizeName(e.name)}|${e.start_date ?? ""}`;
    const existing = byKey.get(key);
    if (!existing || filledScore(e) > filledScore(existing)) {
      byKey.set(key, e);
    }
  }

  // 5. Sort by start_date ascending; undated events sink to the bottom
  const out = Array.from(byKey.values());
  out.sort((a, b) => {
    const da = parseIso(a.start_date)?.getTime();
    const db = parseIso(b.start_date)?.getTime();
    if (da == null && db == null) return a.name.localeCompare(b.name);
    if (da == null) return 1;
    if (db == null) return -1;
    return da - db;
  });

  return out;
}
