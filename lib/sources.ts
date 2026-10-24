import type { SearchQuery } from "./types";
import { KNOWN_CITIES } from "./geo";

export interface FixedSource {
  name: string;
  url: string;
}

/** Luma uses city slugs; map common Indian cities (and aliases) to them. */
const LUMA_CITY_SLUGS: Record<string, string> = {
  bangalore: "bengaluru",
  bengaluru: "bengaluru",
  delhi: "delhi",
  "new delhi": "delhi",
  ncr: "delhi",
  gurgaon: "delhi",
  gurugram: "delhi",
  noida: "delhi",
  mumbai: "mumbai",
  bombay: "mumbai",
  pune: "pune",
  hyderabad: "hyderabad",
  chennai: "chennai",
  kolkata: "kolkata",
  ahmedabad: "ahmedabad",
  jaipur: "jaipur",
  goa: "goa",
};

/**
 * All equivalent name tokens for a city, including neighborhoods and tech corridors.
 */
export function cityAliases(location: string): string[] {
  const key = location.trim().toLowerCase();
  if (!key) return [];
  const tokens = new Set<string>([key]);

  const slug = LUMA_CITY_SLUGS[key];
  if (slug) {
    tokens.add(slug);
    for (const [alias, s] of Object.entries(LUMA_CITY_SLUGS)) {
      if (s === slug) tokens.add(alias);
    }
  }

  // Include known neighborhood aliases from geo config
  for (const city of Object.values(KNOWN_CITIES)) {
    if (city.aliases.some((a) => a === key || a === slug)) {
      city.aliases.forEach((a) => tokens.add(a));
    }
  }

  return Array.from(tokens);
}

export function citySlug(location: string): string | null {
  const key = location.trim().toLowerCase();
  if (!key) return null;
  if (LUMA_CITY_SLUGS[key]) return LUMA_CITY_SLUGS[key];
  if (key === "india" || key === "in") return null;
  return key.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || null;
}

function titleCity(location: string): string {
  return location
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Build the fixed source list from the query (pipeline step A).
 */
export function buildFixedSources(q: SearchQuery): FixedSource[] {
  const topic = q.topic.trim();
  const location = q.location.trim();

  const sources: FixedSource[] = [
    { name: "Devfolio", url: "https://devfolio.co/hackathons" },
    { name: "MLH", url: "https://mlh.io/events" },
  ];

  const slug = citySlug(location);
  if (slug) {
    sources.push({ name: "Luma", url: `https://lu.ma/${slug}` });
  }

  const meetupLocation = location
    ? `in--${encodeURIComponent(titleCity(location))}`
    : "in";
  sources.push({
    name: "Meetup",
    url: `https://www.meetup.com/find/?keywords=${encodeURIComponent(
      topic
    )}&location=${meetupLocation}&source=EVENTS`,
  });

  sources.push({
    name: "Devpost",
    url: `https://devpost.com/api/hackathons?search=${encodeURIComponent(
      topic
    )}&status[]=upcoming`,
  });

  return sources;
}

export function sourceNameFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const known: Record<string, string> = {
      "devfolio.co": "Devfolio",
      "mlh.io": "MLH",
      "lu.ma": "Luma",
      "luma.com": "Luma",
      "meetup.com": "Meetup",
      "devpost.com": "Devpost",
      "unstop.com": "Unstop",
      "eventbrite.com": "Eventbrite",
    };
    return known[host] ?? host;
  } catch {
    return url;
  }
}
