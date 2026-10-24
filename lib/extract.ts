import { GoogleGenAI } from "@google/genai";
import { extractionResultSchema, type ExtractedEvent } from "./types";
import type { MarkdownPage } from "./tinyfish";

// Candidate models with fallback in case one model hits free-tier rate/quota limits
const CANDIDATE_MODELS = [
  process.env.GEMINI_MODEL,
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3.5-flash",
  "gemini-3.7-flash",
].filter(Boolean) as string[];

let activeModelIndex = 0;
const MAX_TEXT_CHARS = 14_000;
const MAX_LINKS = 60;

let _client: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set — add it to .env.local (get one at https://aistudio.google.com/apikey)"
    );
  }
  if (!_client) {
    _client = new GoogleGenAI({ apiKey });
  }
  return _client;
}

const SYSTEM = `You extract structured tech-event listings from a single web page.
Return ONLY a JSON object: {"events": Event[]}. No prose, no markdown fences.

Each Event:
{
  "name": string,
  "start_date": string|null,   // ISO YYYY-MM-DD
  "end_date": string|null,     // ISO YYYY-MM-DD
  "date_text": string,         // the raw date text exactly as printed
  "mode": "online"|"offline"|"hybrid"|null,
  "venue_or_city": string|null,
  "event_type": "hackathon"|"meetup"|"conference"|"workshop"|"other",
  "themes": string[],          // short tags/topics, [] if none
  "eligibility": string|null,
  "registration_url": string|null,
  "source_url": string|null    // canonical link to THIS event's own page
}

RULES:
- Use ONLY text present in the page. If a field is absent, return null.
- Never guess dates or eligibility. If a date is ambiguous, set start_date/end_date to null but still copy the raw text into date_text.
- Prefer a URL from the provided links list for registration_url / source_url; pick the link that points at the specific event.
- Return every distinct upcoming event you can find (aim for the listed ones), not a summary.
- If the page is an error page, a login wall, a captcha, or has no events, return {"events": []}.`;

function buildUserContent(page: MarkdownPage): string {
  const text = page.text.slice(0, MAX_TEXT_CHARS);
  const links = page.links.slice(0, MAX_LINKS);
  return [
    `PAGE URL: ${page.url}`,
    page.title ? `PAGE TITLE: ${page.title}` : "",
    "",
    "PAGE CONTENT (markdown):",
    text,
    "",
    "LINKS ON PAGE:",
    links.join("\n"),
  ]
    .filter(Boolean)
    .join("\n");
}

function coerceJson(raw: string): string {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) s = s.slice(start, end + 1);
  return s;
}

async function callModel(content: string, strictRepair = false): Promise<string> {
  const ai = getGemini();
  let lastError: any = null;

  for (let i = 0; i < CANDIDATE_MODELS.length; i++) {
    const idx = (activeModelIndex + i) % CANDIDATE_MODELS.length;
    const modelName = CANDIDATE_MODELS[idx];

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: content,
        config: {
          systemInstruction: strictRepair
            ? SYSTEM +
              "\n\nYour previous reply was not valid JSON. Return ONLY the JSON object."
            : SYSTEM,
          responseMimeType: "application/json",
          temperature: 0,
          maxOutputTokens: 4096,
        },
      });

      const text = (response.text ?? "").trim();
      if (text) {
        activeModelIndex = idx;
        return text;
      }
    } catch (err: any) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Extract] Model ${modelName} failed (${msg.slice(0, 120)}...), trying next fallback model...`);
    }
  }

  throw lastError ?? new Error("All Gemini candidate models failed.");
}

/**
 * Fast direct extractor for Devpost API JSON if present, avoiding redundant LLM calls.
 */
function tryExtractDevpostJson(page: MarkdownPage): ExtractedEvent[] | null {
  try {
    const text = page.text.trim();
    if (!text.startsWith("{") || !text.includes('"hackathons"')) return null;
    const data = JSON.parse(text);
    if (!Array.isArray(data.hackathons)) return null;

    const events: ExtractedEvent[] = [];
    for (const h of data.hackathons) {
      if (!h.title) continue;
      events.push({
        name: String(h.title).trim(),
        start_date: null,
        end_date: null,
        date_text: h.submission_period_dates ?? "",
        mode: h.displayed_location?.location?.toLowerCase().includes("online")
          ? "online"
          : "offline",
        venue_or_city: h.displayed_location?.location ?? null,
        event_type: "hackathon",
        themes: Array.isArray(h.themes) ? h.themes.map((t: any) => t.name ?? String(t)) : [],
        eligibility: null,
        registration_url: h.url ?? null,
        source_url: h.url ?? page.url,
      });
    }
    return events;
  } catch {
    return null;
  }
}

/**
 * Pipeline step D: extract events from one page. Validates with zod and retries
 * once on invalid JSON.
 */
export async function extractFromPage(
  page: MarkdownPage
): Promise<ExtractedEvent[]> {
  if (!page.text || page.text.trim().length < 20) return [];

  // Check if page is direct structured Devpost API JSON
  const devpostJson = tryExtractDevpostJson(page);
  if (devpostJson && devpostJson.length > 0) {
    console.log(`[Extract] Fast-extracted ${devpostJson.length} events from Devpost API JSON.`);
    return devpostJson;
  }

  const content = buildUserContent(page);

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await callModel(content, attempt > 0);
      const jsonStr = coerceJson(raw);
      let jsonObj: any;
      try {
        jsonObj = JSON.parse(jsonStr);
      } catch {
        continue;
      }
      const parsed = extractionResultSchema.safeParse(jsonObj);
      if (parsed.success) {
        return parsed.data.events.map((e) => ({
          ...e,
          source_url: e.source_url ?? page.url,
        }));
      }
    } catch (err) {
      console.error(`[Extract] Error on ${page.url}:`, err instanceof Error ? err.message : err);
    }
  }
  return [];
}
