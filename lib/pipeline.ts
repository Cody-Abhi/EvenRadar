import { getTinyFish, fetchPages, type MarkdownPage } from "./tinyfish";
import { crawlWithCrawl4AI } from "./crawl4ai";
import { buildFixedSources, sourceNameFromUrl } from "./sources";
import { extractFromPage } from "./extract";
import { postProcess } from "./postprocess";
import {
  fetchUnstopViaAgent,
  unstopEnabled,
  UNSTOP_SOURCE,
} from "./unstop";
import type {
  EventItem,
  EventsApiResponse,
  ExtractedEvent,
  SearchQuery,
  SourceStatus,
} from "./types";

const MAX_SEARCH_URLS = 6;

const JUNK_HOSTS = [
  "instagram.com",
  "facebook.com",
  "reddit.com",
  "tiktok.com",
  "youtube.com",
  "twitter.com",
  "x.com",
  "pinterest.com",
];

function isJunkUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return JUNK_HOSTS.some((j) => host.includes(j));
  } catch {
    return false;
  }
}

/**
 * The full EventRadar pipeline:
 *   A. fixed source URLs from the query
 *   B. Discovery search for new event hubs
 *   C. Web Scraping with Crawl4AI (LLM-ready markdown extraction)
 *   D. LLM extraction per page (Gemini 3.5 Flash)
 *   E. post-process: normalize, dedupe, and sort
 */
export async function runPipeline(query: SearchQuery): Promise<EventsApiResponse> {
  const started = Date.now();
  const fetchedAt = new Date().toISOString();
  const client = getTinyFish();

  // A. Fixed sources.
  const fixed = buildFixedSources(query);
  const urlToName = new Map<string, string>();
  for (const s of fixed) urlToName.set(s.url, s.name);

  // B. Search for additional relevant event URLs.
  let searchError: string | null = null;
  const searchUrls: string[] = [];
  try {
    const locTerm =
      query.location && query.location.toLowerCase() !== "india"
        ? query.location
        : "";
    const res = await client.search.query({
      query: `${query.topic} tech events hackathons ${locTerm} India`.trim(),
      location: "IN",
    });
    for (const r of res.results ?? []) {
      if (searchUrls.length >= MAX_SEARCH_URLS) break;
      if (!r.url || urlToName.has(r.url) || isJunkUrl(r.url)) continue;
      if (searchUrls.includes(r.url)) continue;
      searchUrls.push(r.url);
      urlToName.set(r.url, sourceNameFromUrl(r.url));
    }
  } catch (err) {
    searchError = err instanceof Error ? err.message : String(err);
  }

  const allUrls = [...fixed.map((s) => s.url), ...searchUrls];

  // C. Web Scraping using Crawl4AI (with fallback to TinyFish Fetch if needed)
  let pages: MarkdownPage[] = [];
  let fetchErrors: { url: string; error: string }[] = [];

  try {
    console.log(`[Pipeline] Scraping ${allUrls.length} pages via Crawl4AI...`);
    const c4aiResult = await crawlWithCrawl4AI(allUrls);
    pages = c4aiResult.pages;
    fetchErrors = c4aiResult.errors;

    // Fallback if Crawl4AI returns empty
    const missingUrls = allUrls.filter((u) => !pages.some((p) => p.url === u));
    if (pages.length === 0 && missingUrls.length > 0) {
      console.log(`[Pipeline] Crawl4AI returned 0 pages, falling back to TinyFish Fetch...`);
      const fallback = await fetchPages(missingUrls);
      pages = fallback.pages;
      fetchErrors = fallback.errors;
    }
  } catch (crawlErr: any) {
    console.warn(`[Pipeline] Crawl4AI scraper error:`, crawlErr.message || crawlErr);
    const fallback = await fetchPages(allUrls);
    pages = fallback.pages;
    fetchErrors = fallback.errors;
  }

  const fetchedByUrl = new Map<string, MarkdownPage>();
  for (const p of pages) fetchedByUrl.set(p.url, p);
  const errorByUrl = new Map<string, string>();
  for (const e of fetchErrors) errorByUrl.set(e.url, e.error);

  // D. Extract from each fetched page in parallel.
  const extractions = await Promise.all(
    pages.map(async (page) => {
      const events = await extractFromPage(page);
      return { url: page.url, events };
    })
  );
  const eventsByUrl = new Map<string, ExtractedEvent[]>();
  for (const x of extractions) eventsByUrl.set(x.url, x.events);

  // Optional: Unstop via the Agent API (only when explicitly enabled).
  let unstop: { events: ExtractedEvent[]; error: string | null } | null = null;
  if (unstopEnabled()) {
    unstop = await fetchUnstopViaAgent(query.topic);
  }

  // Assemble raw list
  const raw: { event: ExtractedEvent; sourceName: string }[] = [];
  for (const [url, events] of eventsByUrl) {
    const name = urlToName.get(url) ?? sourceNameFromUrl(url);
    for (const event of events) raw.push({ event, sourceName: name });
  }
  if (unstop) {
    for (const event of unstop.events) {
      raw.push({ event, sourceName: UNSTOP_SOURCE.name });
    }
  }

  // E. Post-process into final list.
  const events: EventItem[] = postProcess(raw, query, fetchedAt);

  // Per-source status
  const keptBySource = new Map<string, number>();
  for (const e of events) {
    keptBySource.set(e.source_name, (keptBySource.get(e.source_name) ?? 0) + 1);
  }

  const sources: SourceStatus[] = [];
  const sourceEntries = [
    ...fixed.map((s) => ({ name: s.name, url: s.url })),
    ...searchUrls.map((u) => ({ name: urlToName.get(u) ?? sourceNameFromUrl(u), url: u })),
  ];
  for (const s of sourceEntries) {
    const fetchErr = errorByUrl.get(s.url);
    const got = fetchedByUrl.has(s.url);
    const extractedCount = eventsByUrl.get(s.url)?.length ?? 0;
    const kept = keptBySource.get(s.name) ?? 0;
    sources.push({
      name: s.name,
      url: s.url,
      ok: got && !fetchErr,
      count: kept || extractedCount,
      error: fetchErr ?? (got ? null : "no response"),
    });
  }
  if (unstop) {
    sources.push({
      name: UNSTOP_SOURCE.name,
      url: UNSTOP_SOURCE.url,
      ok: unstop.error === null,
      count: keptBySource.get(UNSTOP_SOURCE.name) ?? unstop.events.length,
      error: unstop.error,
    });
  }

  const errors: string[] = [];
  if (searchError) errors.push(`Discovery search notice: ${searchError}`);
  for (const s of sources) {
    if (!s.ok && s.error) errors.push(`${s.name}: ${s.error}`);
  }

  return {
    query,
    events,
    sources,
    errors,
    tookMs: Date.now() - started,
  };
}
