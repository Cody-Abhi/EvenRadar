import { TinyFish } from "@tiny-fish/sdk";
import type { FetchResult } from "@tiny-fish/sdk";

/**
 * Single server-side TinyFish client. Key comes from TINYFISH_API_KEY (never
 * shipped to the browser). Timeout is generous (150s) because Fetch across ~10
 * live pages can be slow; per-URL failures still come back inside errors[].
 */
let _client: TinyFish | null = null;

export function getTinyFish(): TinyFish {
  if (!process.env.TINYFISH_API_KEY) {
    throw new Error("TINYFISH_API_KEY is not set — add it to .env.local");
  }
  if (!_client) {
    _client = new TinyFish({
      apiKey: process.env.TINYFISH_API_KEY,
      timeout: 150_000,
    });
  }
  return _client;
}

export interface MarkdownPage {
  url: string;
  title: string | null;
  text: string;
  links: string[];
}

/**
 * Fetch a batch of URLs as markdown. The SDK caps a call at 10 URLs, so we
 * chunk. Per-URL failures are returned (not thrown) as `errors` with the
 * provider's message, so one bad source never fails the whole request.
 */
export async function fetchPages(urls: string[]): Promise<{
  pages: MarkdownPage[];
  errors: { url: string; error: string }[];
}> {
  const client = getTinyFish();
  const unique = Array.from(new Set(urls)).filter(Boolean);
  const batches: string[][] = [];
  for (let i = 0; i < unique.length; i += 10) {
    batches.push(unique.slice(i, i + 10));
  }

  const pages: MarkdownPage[] = [];
  const errors: { url: string; error: string }[] = [];

  const results = await Promise.all(
    batches.map(async (batch) => {
      try {
        return await client.fetch.getContents({
          urls: batch,
          format: "markdown",
          links: true,
          ttl: 3600,
          per_url_timeout_ms: 45_000,
        });
      } catch (err) {
        // A whole-batch failure (network/timeout) becomes per-URL errors so a
        // single slow batch cannot sink the request.
        const message = err instanceof Error ? err.message : String(err);
        return {
          results: [],
          errors: batch.map((url) => ({ url, error: message })),
        };
      }
    })
  );

  for (const res of results) {
    for (const r of res.results as FetchResult[]) {
      if (r.format === "markdown") {
        pages.push({
          url: r.url,
          title: r.title,
          text: r.text ?? "",
          links: r.links ?? [],
        });
      }
    }
    for (const e of res.errors) {
      errors.push({ url: e.url, error: e.error });
    }
  }

  return { pages, errors };
}
