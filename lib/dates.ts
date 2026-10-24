/**
 * Date helpers. The LLM returns ISO (YYYY-MM-DD) or null and is told never to
 * guess. Post-process uses these to normalize what it returns and to recover
 * Devfolio's DD/MM/YY format, which the model is explicitly warned about.
 */

const ISO_RE = /^\d{4}-\d{2}-\d{2}(T.*)?$/;

/** Today at local midnight, for "is this event in the past" comparisons. */
export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Parse an ISO-ish string to a Date, or null. */
export function parseIso(value: string | null | undefined): Date | null {
  if (!value) return null;
  if (!ISO_RE.test(value.trim())) return null;
  const d = new Date(value.trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Devfolio prints dates as DD/MM/YY (e.g. "05/12/26"). Parse that into an ISO
 * date string. Returns null if the text isn't a clean DD/MM/YY token.
 */
export function parseDevfolioDate(text: string): string | null {
  const m = text.trim().match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})\b/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  let year = Number(m[3]);
  if (m[3].length === 2) year += 2000;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const iso = `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
  return parseIso(iso) ? iso : null;
}

/**
 * Normalize a start/end date for an event. Prefers the LLM's ISO value; for
 * Devfolio it falls back to parsing date_text as DD/MM/YY.
 */
export function normalizeDate(
  isoFromLlm: string | null,
  dateText: string,
  sourceName: string
): string | null {
  const parsed = parseIso(isoFromLlm);
  if (parsed) return isoFromLlm!.slice(0, 10);
  if (sourceName.toLowerCase() === "devfolio" && dateText) {
    return parseDevfolioDate(dateText);
  }
  return null;
}

/** "checked N min ago" from an ISO timestamp. */
export function minutesAgo(iso: string): number {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.round((Date.now() - then) / 60000));
}

/** Human date for a card, e.g. "5 Dec 2026". Falls back to raw text. */
export function formatDate(iso: string | null, fallback: string): string {
  const d = parseIso(iso);
  if (!d) return fallback || "Date not listed";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
