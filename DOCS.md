# EventRadar — Project Documentation

Complete technical documentation for **EventRadar**, a one-page tech-event
finder built as a 1-hour hackathon MVP. For a quick start, see
[`README.md`](./README.md); this document covers the architecture, every
module, the data contract, the design system, and operational notes.

---

## 1. Overview

EventRadar answers one question — *"what tech events (hackathons, meetups,
conferences, workshops) match my topic and location?"* — by aggregating several
event sites **live** on each search.

A single request fans out to a fixed set of source URLs plus a handful of
search-discovered ones, fetches them all through TinyFish, extracts structured
events with Gemini, and returns a clean, de-duplicated, honestly-labelled list
along with a per-source status so the user always knows what succeeded.

**Design goals**

| Goal | How it's met |
|------|--------------|
| One working end-to-end flow | Search → pipeline → cards, nothing else |
| Never fail the whole request | Per-URL + per-source errors captured, results still render |
| Honest data | Missing fields are `null` → shown as "Not listed", never back-filled |
| Keys stay server-side | Read from env only inside server modules / the route |
| Fast enough to demo | Capped page count + parallel fetch & extraction |

---

## 2. Tech stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS 3** — neobrutalist design system (section 7)
- **`@tiny-fish/sdk`** — Search, Fetch, and (optional) Agent
- **`@google/genai`** — extraction with model `gemini-2.5-flash`
- **`zod`** — schema validation of every extracted event

---

## 3. Architecture & request flow

```
 Browser (app/page.tsx, client component)
   │  GET /api/events?topic=&location=&online=
   ▼
 Route handler (app/api/events/route.ts, Node runtime)
   │  validates params → runPipeline(query)
   ▼
 Pipeline (lib/pipeline.ts)
   ├── A. buildFixedSources()        lib/sources.ts
   ├── B. client.search.query()      @tiny-fish/sdk  → +5 URLs
   ├── C. fetchPages()               lib/tinyfish.ts  (Fetch, markdown+links)
   ├── D. extractFromPage() × N      lib/extract.ts   (Gemini, zod, retry)
   │     [+ optional] fetchUnstopViaAgent()  lib/unstop.ts (Agent API)
   └── E. postProcess()              lib/postprocess.ts (filter/dedupe/sort)
   ▼
 JSON { query, events[], sources[], errors[], tookMs }
   ▼
 Browser renders status strip + cards (+ client-side filter/sort)
```

Everything from the route handler inward runs **server-side only**, so API keys
never reach the browser.

---

## 4. The pipeline, step by step (`lib/pipeline.ts`)

### A. Fixed source URLs — `buildFixedSources(query)`
Deterministically builds the base source list from the query:

| Source | URL pattern | Notes |
|--------|-------------|-------|
| Devfolio | `https://devfolio.co/hackathons` | dates are **DD/MM/YY** |
| MLH | `https://mlh.io/seasons/2027/events` | current season |
| Luma | `https://lu.ma/<city-slug>` | skipped if no mappable city |
| Meetup | `https://www.meetup.com/find/?keywords=<topic>&location=in--<City>&source=EVENTS` | falls back to `in` when no location |
| Devpost | `https://devpost.com/api/hackathons?search=<topic>&status[]=upcoming` | unofficial JSON, best-effort |

City slugs and aliases live in `lib/sources.ts` (`citySlug`, `cityAliases`).

### B. TinyFish Search — `client.search.query(...)`
Query: `` `${topic} hackathon OR meetup ${location} 2026` `` with `location: "IN"`.
The top **5** result URLs not already in the fixed list are taken. A search
failure is captured (`searchError`) and surfaced in the banner — it never aborts
the run.

### C. TinyFish Fetch — `fetchPages(urls)` (`lib/tinyfish.ts`)
All URLs are fetched as **markdown with `links: true`, `ttl: 3600`**. The SDK
caps a call at 10 URLs, so `fetchPages` chunks input into batches of 10 and runs
them in parallel. The client `timeout` is **150 s**; `per_url_timeout_ms` is
45 s so a slow URL fails on its own without blocking siblings.

Fetch returns **per-URL failures inside `errors[]`** on a 200 response — those
are recorded per source. A whole-batch throw (network/timeout) is converted into
per-URL errors so one bad batch can't sink the request.

### D. LLM extraction — `extractFromPage(page)` (`lib/extract.ts`)
For each fetched page, Gemini (`gemini-2.5-flash`, overridable via `GEMINI_MODEL`)
is given the page's markdown (capped at ~14k chars) and its `links` list, and
asked to return `{"events": Event[]}` using JSON mode
(`responseMimeType: "application/json"`). The prompt's hard rules:

> *Use ONLY text present in the page. If a field is absent, return null. Never
> guess dates or eligibility. Prefer a URL from the links list for
> registration_url / source_url.*

The reply is JSON-coerced (fences stripped, outermost object extracted),
validated with **zod**, and on invalid JSON **retried once** with a stricter
system note, then the page is skipped. `source_url` defaults to the page URL
when the model doesn't supply one.

### E. Post-process — `postProcess(raw, query, fetchedAt)` (`lib/postprocess.ts`)
1. **Normalize** into `EventItem`; drop records missing `name` or `source_url`.
   Dates are normalized via `lib/dates.ts` (Devfolio DD/MM/YY handled here).
2. **Drop past events** — when a date is known and `end||start < today`.
   Unknown dates are *kept* (we don't guess).
3. **Filter** by topic (word-boundary token match) and, unless *Online only*,
   by location (**alias-aware** — Bangalore ≡ Bengaluru, Bombay ≡ Mumbai …).
   Online/hybrid events pass the location filter from anywhere.
4. **Dedupe** by `normalizedName + start_date`, keeping the record with more
   filled fields.
5. **Sort** by `start_date` ascending; undated events sink to the bottom.

Finally the pipeline assembles the **per-source status strip** (ok/failed +
count) and a list of human-readable **error strings** for the banner.

---

## 5. API contract

### `GET /api/events`

| Param | Required | Default | Meaning |
|-------|----------|---------|---------|
| `topic` | ✅ | — | search topic; 400 if missing |
| `location` | ❌ | `India` | city or country |
| `online` | ❌ | `false` | `true` restricts to online/hybrid events |

**200 response**

```jsonc
{
  "query":   { "topic": "AI hackathon", "location": "Bangalore", "online": false },
  "events":  [ /* EventItem[] (section 6) */ ],
  "sources": [
    { "name": "Devfolio", "url": "...", "ok": true,  "count": 7, "error": null },
    { "name": "Devpost",  "url": "...", "ok": false, "count": 0, "error": "blocked" }
  ],
  "errors":  [ "Devpost: blocked" ],
  "tookMs":  8421
}
```

**Error responses** — `400` (missing topic) and `500` (fatal, e.g. a missing API
key) both return `{ "error": string, "query"?: {...} }`. The UI shows these in a
banner rather than crashing.

---

## 6. Data model (`lib/types.ts`)

```ts
interface EventItem {
  name: string;
  start_date: string | null;   // ISO YYYY-MM-DD
  end_date:   string | null;   // ISO YYYY-MM-DD
  date_text:  string;          // raw text exactly as printed on the page
  mode: "online" | "offline" | "hybrid" | null;
  venue_or_city: string | null;
  event_type: "hackathon" | "meetup" | "conference" | "workshop" | "other";
  themes: string[];
  eligibility: string | null;
  registration_url: string | null;
  source_url: string;
  source_name: string;
  fields_missing: string[];    // which optional fields came back absent
  fetched_at: string;          // ISO timestamp — powers "checked N min ago"
}
```

- `extractedEventSchema` is the **looser** shape the LLM returns (no
  `source_name`/`fields_missing`/`fetched_at`, tolerant defaults); the pipeline
  fills the rest.
- **`null` is load-bearing**: it means "not on the page" and is rendered as
  *"Not listed"* — never substituted from another source.

---

## 7. Design system — Neobrutalism

The UI is intentionally **neobrutalist**: high contrast, honesty, and zero
ambiguity about state.

| Token | Value | Where |
|-------|-------|-------|
| Paper background | `#fdf0d5` + dotted grid | `body` (globals.css) |
| Ink | `#111111` | all borders & text |
| Accents | yellow `#ffd23f`, pink `#ff6ec7`, cyan `#4deeea`, lime `#aeffb0`, purple `#b08cff`, orange `#ff8c42`, red `#ff5a5f`, blue `#6ea8ff` | `tailwind.config.ts` → `brut.*` |
| Display font | **Archivo Black** | masthead, empty states |
| Body font | **Space Grotesk** | everything else |

**Core utilities** (`app/globals.css`):

- `.brutal` — `border-[3px] border-black shadow-[6px_6px_0_0_#000]`
- `.brutal-sm` — same with a 4px shadow
- `.brutal-press` — buttons/chips that nudge toward the cursor on hover and
  "press into" the page on `:active` (shadow collapses, element translates)

**Component styling map**

| Component | Look |
|-----------|------|
| Masthead | pink block, white "Radar", Archivo Black |
| Search form | blue panel, white inputs, custom brutalist checkbox, yellow Search |
| Status strip | lime chips for ok (`✓ N` in a black pill), red chips for failed (`✗ reason`) |
| Event card | white card, colour-coded type chip, yellow date pill (raw text in tooltip), mode chip, cyan `#theme` tags, pink Register + white View source, black source tag + "checked N min ago" |
| Toolbar | yellow count badge, colour-coded filter chips, brutalist sort `<select>` |
| Error banner | red (fatal) / orange (partial) block |
| Skeletons | shimmering brutalist blocks while loading |

Screenshots: [`docs/screenshot-search.png`](./docs/screenshot-search.png),
[`docs/screenshot-results.png`](./docs/screenshot-results.png).

---

## 8. Project structure

```
eventradar/
├── app/
│   ├── api/events/route.ts   # GET /api/events — validates + runs pipeline
│   ├── globals.css           # neobrutalist tokens + .brutal utilities
│   ├── layout.tsx            # root layout + metadata
│   └── page.tsx              # the single page (client): form, state, render
├── components/
│   ├── SearchForm.tsx        # topic / location / online-only
│   ├── StatusStrip.tsx       # per-source ok/failed chips
│   ├── EventCard.tsx         # one event
│   ├── Toolbar.tsx           # count, sort, filter chips
│   └── SkeletonCard.tsx      # loading placeholder
├── lib/
│   ├── types.ts              # EventItem + zod schemas + API types
│   ├── tinyfish.ts           # TinyFish client + fetchPages (chunk, errors)
│   ├── sources.ts            # fixed URLs, city slugs, aliases
│   ├── extract.ts            # Gemini extraction (zod-validated, retry once)
│   ├── postprocess.ts        # step E: filter / dedupe / sort
│   ├── dates.ts              # ISO + Devfolio DD/MM/YY parsing, formatting
│   ├── unstop.ts             # optional Agent-API source (gated)
│   └── pipeline.ts           # orchestrates A–E
├── docs/                     # screenshots
├── .env.example              # both API keys
├── README.md                 # quick start
└── DOCS.md                   # this file
```

---

## 9. Configuration

| Env var | Required | Purpose |
|---------|----------|---------|
| `TINYFISH_API_KEY` | ✅ | TinyFish Search / Fetch / Agent |
| `GEMINI_API_KEY` | ✅ | Gemini extraction (`gemini-2.5-flash`); `GOOGLE_API_KEY` also accepted |
| `GEMINI_MODEL` | ❌ | override the Gemini model (default `gemini-2.5-flash`) |
| `EVENTRADAR_ENABLE_UNSTOP` | ❌ | set to `1` to enable the Unstop Agent source |

Copy `.env.example` → `.env.local` and fill both keys. Without them the app
builds and runs, but a search returns a graceful error banner.

---

## 10. Optional: Unstop via the Agent API (`lib/unstop.ts`)

`unstop.com/hackathons` blocks plain fetching, so it's read with the TinyFish
**Agent API** using `browser_profile: "stealth"` and a JSON `output_schema`. It
is **off by default** (it spends agent credits and adds latency) and enabled
with `EVENTRADAR_ENABLE_UNSTOP=1`.

Per the brief, a result whose JSON contains `"captcha"` or `"blocked"` is treated
as a **failure even when the run `status` is `COMPLETED`**.

---

## 11. Running & verifying

```bash
npm install
cp .env.example .env.local      # add both keys
npm run dev                     # http://localhost:3000

npm run typecheck               # tsc --noEmit
npm run build                   # production build
npm run start                   # serve the build
```

**What was verified during development**

- `tsc --noEmit` clean; `next build` passes.
- API error paths: `400` (missing topic), graceful `500` (missing key).
- Pure data-shaping logic (dates, source URLs, post-process incl.
  Bangalore↔Bengaluru, dedupe, filters, sort) covered by a standalone
  assertion test — 23/23 passing.
- Live Devfolio fetch confirmed the markdown + links shape and real DD/MM/YY
  dates the pipeline relies on.

---

## 12. Notes, trade-offs & extension ideas

**Trade-offs (1-hour MVP)**
- Page text sent to the model is capped (~14k chars) to bound latency/cost.
- Devpost's unofficial JSON endpoint is read as text by the LLM (best-effort).
- Topic/location filters are deliberately lenient to favour recall.

**Natural next steps**
- Cache responses per `(topic, location, online)` for a few minutes.
- Stream results as each source resolves (Server-Sent Events) instead of
  awaiting the whole pipeline.
- Add more fixed sources (Eventbrite, Commudle, Townscript).
- Persist a short search history (localStorage) and shareable query URLs.
```
