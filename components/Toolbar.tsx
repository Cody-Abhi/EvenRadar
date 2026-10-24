"use client";

export type SortKey = "date" | "source" | "match";
export type FilterKey =
  | "online"
  | "offline"
  | "hackathon"
  | "meetup"
  | "conference"
  | "workshop"
  | "cv_match";
export type ViewMode = "split" | "grid" | "map";

const BASE_FILTERS: { key: FilterKey; label: string; color: string }[] = [
  { key: "online", label: "Online", color: "bg-brut-cyan" },
  { key: "offline", label: "Offline", color: "bg-brut-lime" },
  { key: "hackathon", label: "Hackathon", color: "bg-brut-purple" },
  { key: "meetup", label: "Meetup", color: "bg-brut-orange" },
  { key: "conference", label: "Conference", color: "bg-brut-pink" },
  { key: "workshop", label: "Workshop", color: "bg-brut-yellow" },
];

export default function Toolbar({
  count,
  sort,
  onSortChange,
  activeFilters,
  onToggleFilter,
  viewMode = "split",
  onViewModeChange,
  hasCvProfile = false,
}: {
  count: number;
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
  activeFilters: Set<FilterKey>;
  onToggleFilter: (f: FilterKey) => void;
  viewMode?: ViewMode;
  onViewModeChange?: (m: ViewMode) => void;
  hasCvProfile?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {/* Count & View Toggle */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="brutal-sm bg-brut-yellow px-3 py-1.5 text-xs font-bold uppercase sm:text-sm">
          {count} {count === 1 ? "event" : "events"}
        </div>

        {onViewModeChange && (
          <div className="flex items-center border-[2px] border-black bg-white shadow-[2px_2px_0_0_#000]">
            <button
              type="button"
              onClick={() => onViewModeChange("split")}
              className={`px-2.5 py-1 text-xs font-bold uppercase transition-colors ${
                viewMode === "split" ? "bg-black text-white" : "hover:bg-black/10"
              }`}
              title="Split View: Map & Cards"
            >
              ⚡ Split View
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("grid")}
              className={`border-l-2 border-black px-2.5 py-1 text-xs font-bold uppercase transition-colors ${
                viewMode === "grid" ? "bg-black text-white" : "hover:bg-black/10"
              }`}
              title="Grid View: Event Cards"
            >
              🗂 Cards
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("map")}
              className={`border-l-2 border-black px-2.5 py-1 text-xs font-bold uppercase transition-colors ${
                viewMode === "map" ? "bg-black text-white" : "hover:bg-black/10"
              }`}
              title="Map View: Area Explorer"
            >
              🗺 Map Only
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* CV Match Filter chip (only when CV profile is loaded) */}
        {hasCvProfile && (
          <button
            type="button"
            onClick={() => onToggleFilter("cv_match")}
            aria-pressed={activeFilters.has("cv_match")}
            className={`brutal-press px-2.5 py-1 text-xs font-bold uppercase ${
              activeFilters.has("cv_match")
                ? "bg-brut-lime text-black ring-2 ring-black"
                : "bg-yellow-50 text-black hover:bg-yellow-100"
            }`}
          >
            🎯 High CV Match (≥40%)
          </button>
        )}

        {/* Standard filter chips */}
        {BASE_FILTERS.map((f) => {
          const active = activeFilters.has(f.key);
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => onToggleFilter(f.key)}
              aria-pressed={active}
              className={`brutal-press px-2.5 py-1 text-xs font-bold uppercase ${
                active ? f.color : "bg-white"
              }`}
            >
              {f.label}
            </button>
          );
        })}

        {/* Sort */}
        <label className="ml-1 flex items-center gap-1.5 text-xs font-bold uppercase">
          Sort
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortKey)}
            className="brutal-sm cursor-pointer bg-white px-2 py-1 text-xs font-bold uppercase outline-none"
          >
            {hasCvProfile && <option value="match">🎯 CV Match %</option>}
            <option value="date">Date</option>
            <option value="source">Source</option>
          </select>
        </label>
      </div>
    </div>
  );
}
