"use client";

import { useMemo, useState, useRef } from "react";
import SearchForm from "@/components/SearchForm";
import StatusStrip from "@/components/StatusStrip";
import EventCard from "@/components/EventCard";
import SkeletonCard from "@/components/SkeletonCard";
import CvUploadCard from "@/components/CvUploadCard";
import Toolbar, {
  type SortKey,
  type FilterKey,
  type ViewMode,
} from "@/components/Toolbar";
import EventMap from "@/components/EventMap";
import type { EventsApiResponse, EventItem, SearchQuery } from "@/lib/types";
import { scoreEventForCv, type CvProfile, type EventMatchResult } from "@/lib/cv_match";

const INITIAL_QUERY: SearchQuery = {
  topic: "AI hackathon",
  location: "Bangalore",
  online: false,
};

function isOnline(e: EventItem): boolean {
  return e.mode === "online" || e.mode === "hybrid";
}

interface ScoredEventItem {
  event: EventItem;
  match?: EventMatchResult;
}

export default function Home() {
  const [data, setData] = useState<EventsApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState<SearchQuery>(INITIAL_QUERY);

  const [sort, setSort] = useState<SortKey>("date");
  const [filters, setFilters] = useState<Set<FilterKey>>(new Set());
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  // Candidate CV Profile State
  const [cvProfile, setCvProfile] = useState<CvProfile | null>(null);

  const mapSectionRef = useRef<HTMLDivElement>(null);

  async function search(query: SearchQuery & { section?: string }) {
    setLoading(true);
    setFatalError(null);
    setData(null);
    setLastQuery(query);
    setFilters(new Set());
    setSelectedEvent(null);
    if (query.section) setSelectedSection(query.section);

    try {
      const params = new URLSearchParams({
        topic: query.topic,
        location: query.location,
        online: String(query.online),
      });
      const res = await fetch(`/api/events?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        setFatalError(json.error ?? `Request failed (${res.status})`);
        return;
      }
      setData(json as EventsApiResponse);
    } catch (err) {
      setFatalError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function handleCvProfileLoaded(profile: CvProfile) {
    setCvProfile(profile);
    setSort("match"); // Automatically sort by match relevance
  }

  function handleSearchFromCv(query: SearchQuery) {
    setSort("match");
    search(query);
  }

  function toggleFilter(f: FilterKey) {
    setFilters((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  }

  // Score each event against active CV profile
  const scoredList = useMemo<ScoredEventItem[]>(() => {
    if (!data) return [];
    return data.events.map((event) => ({
      event,
      match: cvProfile ? scoreEventForCv(event, cvProfile) : undefined,
    }));
  }, [data, cvProfile]);

  const visible = useMemo<ScoredEventItem[]>(() => {
    if (!data) return [];
    let list = scoredList;

    // Filter by Section if selected
    if (selectedSection !== "all") {
      list = list.filter(({ event }) => event.event_type === selectedSection);
    }

    const hasMode = filters.has("online") || filters.has("offline");
    const typeFilters: FilterKey[] = [];
    if (filters.has("hackathon")) typeFilters.push("hackathon");
    if (filters.has("meetup")) typeFilters.push("meetup");
    if (filters.has("conference")) typeFilters.push("conference");
    if (filters.has("workshop")) typeFilters.push("workshop");

    if (hasMode) {
      list = list.filter(
        ({ event }) =>
          (filters.has("online") && isOnline(event)) ||
          (filters.has("offline") && event.mode === "offline")
      );
    }
    if (typeFilters.length) {
      list = list.filter(({ event }) =>
        typeFilters.includes(event.event_type as FilterKey)
      );
    }

    // High CV Match Filter
    if (filters.has("cv_match")) {
      list = list.filter(({ match }) => match && match.score >= 40);
    }

    const sorted = [...list];
    if (sort === "match") {
      sorted.sort((a, b) => (b.match?.score || 0) - (a.match?.score || 0));
    } else if (sort === "source") {
      sorted.sort((a, b) => a.event.source_name.localeCompare(b.event.source_name));
    }
    return sorted;
  }, [data, scoredList, filters, sort, selectedSection]);

  const visibleEventsOnly = useMemo(() => visible.map((v) => v.event), [visible]);
  const hasResults = data && data.events.length > 0;

  function handleLocateOnMap(event: EventItem) {
    setSelectedEvent(event);
    if (viewMode === "grid") {
      setViewMode("split");
    }
    mapSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      {/* Masthead */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="brutal inline-block bg-brut-pink px-5 py-2.5">
            <h1 className="display text-3xl uppercase leading-none sm:text-5xl">
              Event<span className="text-white">Radar</span>
            </h1>
          </div>
          <p className="mt-3 max-w-xl text-sm font-semibold sm:text-base">
            Live tech-event radar — hackathons, meetups &amp; conferences, scraped &amp;
            structured with <span className="bg-brut-yellow px-1">Interactive Mapbox Area Locator</span> &amp;{" "}
            <span className="bg-brut-lime px-1">AI CV Matchmaker</span>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/docs"
            className="brutal-sm brutal-press bg-brut-yellow px-3 py-1.5 text-xs font-bold font-mono uppercase tracking-wider hover:bg-black hover:text-white transition"
          >
            📖 API Docs
          </a>
          <span className="brutal-sm bg-brut-lime px-3 py-1.5 text-xs font-bold uppercase">
            ⚡ Powered by Crawl4AI + Gemini + Mapbox
          </span>
        </div>
      </header>

      {/* CV Upload & Matchmaker Card */}
      <CvUploadCard
        onCvProfileLoaded={handleCvProfileLoaded}
        onSearchWithCv={handleSearchFromCv}
        activeProfile={cvProfile}
        onClearProfile={() => {
          setCvProfile(null);
          if (sort === "match") setSort("date");
        }}
        isSearchingEvents={loading}
      />

      {/* Search Form with Dropdown Selectors */}
      <SearchForm
        initial={INITIAL_QUERY}
        loading={loading}
        onSearch={search}
        selectedSection={selectedSection}
        onSectionChange={setSelectedSection}
      />

      {/* Status strip */}
      {(loading || data) && (
        <div className="mt-6">
          {data && <StatusStrip sources={data.sources} />}
          {loading && (
            <div className="brutal-sm inline-block bg-white px-3 py-1.5 text-xs font-bold uppercase">
              Scanning sources for “{lastQuery.topic}”
              {lastQuery.location ? ` in ${lastQuery.location}` : ""}…
            </div>
          )}
        </div>
      )}

      {/* Fatal error */}
      {fatalError && (
        <div className="brutal mt-6 bg-brut-red p-4 text-sm font-semibold text-white">
          <p className="text-base font-bold uppercase">⚠ Something went wrong</p>
          <p className="mt-1">{fatalError}</p>
        </div>
      )}

      {/* Partial-failure banner */}
      {data && data.errors.length > 0 && (
        <div className="brutal mt-6 bg-brut-orange p-4 text-sm font-semibold">
          <p className="text-base font-bold uppercase">
            ⚠ Some sources didn&apos;t respond
          </p>
          <p className="text-xs">(results below are from the rest)</p>
          <ul className="mt-2 space-y-1">
            {data.errors.map((e, i) => (
              <li key={i} className="border-l-[3px] border-black pl-2">
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Toolbar & View Mode switcher */}
      {hasResults && (
        <div className="mt-8">
          <Toolbar
            count={visible.length}
            sort={sort}
            onSortChange={setSort}
            activeFilters={filters}
            onToggleFilter={toggleFilter}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            hasCvProfile={Boolean(cvProfile)}
          />
        </div>
      )}

      {/* Interactive Map Section (Shown in Split or Map mode when results exist) */}
      {hasResults && (viewMode === "split" || viewMode === "map") && (
        <div ref={mapSectionRef} className="mt-6">
          <EventMap
            events={visibleEventsOnly}
            activeLocation={lastQuery.location}
            selectedEvent={selectedEvent}
            onSelectEvent={setSelectedEvent}
          />
        </div>
      )}

      {/* Results Cards (Shown in Split or Grid mode) */}
      {(viewMode === "split" || viewMode === "grid") && (
        <section className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {loading &&
            Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          {!loading &&
            visible.map(({ event, match }) => (
              <EventCard
                key={`${event.source_url}-${event.name}`}
                event={event}
                onLocate={handleLocateOnMap}
                isSelected={selectedEvent?.name === event.name}
                cvMatch={match}
              />
            ))}
        </section>
      )}

      {/* Map-Only Side Drawer with Quick Event List */}
      {viewMode === "map" && !loading && visible.length > 0 && (
        <div className="mt-6 brutal bg-white p-4">
          <h3 className="mb-3 text-sm font-bold uppercase">
            Quick Event Directory ({visible.length} events on map)
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map(({ event, match }) => (
              <div
                key={`${event.source_url}-${event.name}`}
                onClick={() => setSelectedEvent(event)}
                className={`cursor-pointer border-2 border-black p-3 transition-colors ${
                  selectedEvent?.name === event.name
                    ? "bg-brut-yellow"
                    : "bg-paper hover:bg-yellow-100"
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-bold uppercase">
                  <span>{event.event_type}</span>
                  {match && match.score > 0 ? (
                    <span className="bg-brut-lime px-1 text-black font-extrabold">
                      🎯 {match.score}% MATCH
                    </span>
                  ) : (
                    <span>{event.venue_or_city ?? event.mode ?? "India"}</span>
                  )}
                </div>
                <h4 className="mt-1 line-clamp-1 font-bold">{event.name}</h4>
                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <span>{event.start_date || event.date_text}</span>
                  <span className="font-bold underline">Focus on Map →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty states */}
      {!loading && data && data.events.length === 0 && !fatalError && (
        <div className="brutal mt-10 bg-white p-8 text-center">
          <p className="display text-2xl uppercase">No events found</p>
          <p className="mx-auto mt-3 max-w-md text-sm font-semibold">
            Try broadening the topic (e.g. choose “AI &amp; Machine Learning”) or
            selecting “All India” from the city dropdown.
          </p>
        </div>
      )}

      {/* Filtered-to-empty */}
      {!loading && hasResults && visible.length === 0 && (
        <div className="brutal mt-8 bg-white p-6 text-center">
          <p className="font-bold uppercase text-base">
            No events match the active &ldquo;{selectedSection}&rdquo; section or filters
          </p>
          <p className="mt-2 text-sm text-black/70">
            {data.events.length} {data.events.length === 1 ? "event is" : "events are"} available in other formats &amp; categories!
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedSection("all");
              setFilters(new Set());
            }}
            className="brutal-press mt-4 bg-brut-yellow px-5 py-2 text-xs font-bold uppercase"
          >
            Reset Filters &amp; Show All {data.events.length} Events →
          </button>
        </div>
      )}

      {data && (
        <footer className="mt-12 border-t-[3px] border-black pt-4 text-center text-xs font-semibold">
          Fetched {data.events.length} events in {(data.tookMs / 1000).toFixed(1)}s ·
          Missing data always shown as{" "}
          <span className="bg-brut-yellow px-1">“Not listed”</span>, never filled
          from another source · Map powered by Mapbox GL.
        </footer>
      )}
    </main>
  );
}
