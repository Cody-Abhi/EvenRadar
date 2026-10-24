"use client";

import { useState } from "react";
import type { SearchQuery } from "@/lib/types";

export const TOPIC_PRESETS = [
  { label: "⚡ AI Hackathon", value: "AI hackathon" },
  { label: "🤖 AI & Machine Learning", value: "AI machine learning" },
  { label: "⛓️ Web3 & Blockchain", value: "Web3 blockchain" },
  { label: "💻 Fullstack & Frontend", value: "Fullstack web development" },
  { label: "🌐 Open Source & Git", value: "Open Source" },
  { label: "☁️ Cloud & DevOps", value: "Cloud DevOps Kubernetes" },
  { label: "🛡️ Cybersecurity & CTF", value: "Cybersecurity hackathon" },
  { label: "📱 Mobile App Dev", value: "Mobile app development" },
  { label: "🎨 UI/UX & Product Design", value: "Product design" },
  { label: "🛠️ Custom Topic...", value: "custom" },
];

export const CITY_PRESETS = [
  { label: "📍 Bangalore (Bengaluru)", value: "Bangalore" },
  { label: "📍 Delhi NCR (Gurgaon/Noida)", value: "Delhi" },
  { label: "📍 Mumbai", value: "Mumbai" },
  { label: "📍 Hyderabad", value: "Hyderabad" },
  { label: "📍 Pune", value: "Pune" },
  { label: "📍 Chennai", value: "Chennai" },
  { label: "📍 Kolkata", value: "Kolkata" },
  { label: "📍 Ahmedabad", value: "Ahmedabad" },
  { label: "📍 Jaipur", value: "Jaipur" },
  { label: "📍 Goa", value: "Goa" },
  { label: "🇮🇳 All India (Nationwide)", value: "India" },
  { label: "✏️ Custom Location...", value: "custom" },
];

export const SECTION_PRESETS = [
  { label: "All Formats", value: "all" },
  { label: "⚡ Hackathons", value: "hackathon" },
  { label: "🤝 Meetups & Talks", value: "meetup" },
  { label: "🎤 Conferences", value: "conference" },
  { label: "🛠 Workshops & Labs", value: "workshop" },
];

export const POPULAR_CHIPS = [
  { topic: "AI hackathon", location: "Bangalore", label: "🔥 AI Hackathons (Bangalore)" },
  { topic: "Web3", location: "Delhi", label: "⛓️ Web3 (Delhi NCR)" },
  { topic: "Open Source", location: "Hyderabad", label: "🌐 Open Source (Hyd)" },
  { topic: "DevOps", location: "Pune", label: "☁️ DevOps (Pune)" },
  { topic: "Frontend", location: "Mumbai", label: "💻 Frontend (Mumbai)" },
];

interface SearchFormProps {
  initial: SearchQuery;
  loading: boolean;
  onSearch: (q: SearchQuery & { section?: string }) => void;
  selectedSection?: string;
  onSectionChange?: (sec: string) => void;
}

export default function SearchForm({
  initial,
  loading,
  onSearch,
  selectedSection = "all",
  onSectionChange,
}: SearchFormProps) {
  const [topic, setTopic] = useState(initial.topic);
  const [location, setLocation] = useState(initial.location);
  const [online, setOnline] = useState(initial.online);
  const [section, setSection] = useState(selectedSection);
  const [showMoreSections, setShowMoreSections] = useState(false);

  // Check if current topic matches any preset
  const matchedTopicPreset =
    TOPIC_PRESETS.find((p) => p.value.toLowerCase() === topic.toLowerCase())?.value ??
    "custom";

  // Check if current location matches any preset
  const matchedCityPreset =
    CITY_PRESETS.find((p) => p.value.toLowerCase() === location.toLowerCase())?.value ??
    "custom";

  function handleTopicDropdown(val: string) {
    if (val !== "custom") {
      setTopic(val);
    }
  }

  function handleCityDropdown(val: string) {
    if (val !== "custom") {
      setLocation(val);
    }
  }

  function handleSectionChange(newSection: string) {
    setSection(newSection);
    if (onSectionChange) onSectionChange(newSection);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = topic.trim();
    if (!t) return;
    onSearch({
      topic: t,
      location: location.trim() || "India",
      online,
      section,
    });
  }

  function selectChip(chipTopic: string, chipLocation: string) {
    setTopic(chipTopic);
    setLocation(chipLocation);
    onSearch({
      topic: chipTopic,
      location: chipLocation,
      online: false,
      section,
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        onSubmit={submit}
        className="brutal flex flex-col gap-4 bg-brut-blue p-5 text-black"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 sm:items-end">
          {/* Topic Section (Dropdown + Freeform Input) */}
          <div className="sm:col-span-5">
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wide">
                Topic & Category <span className="text-brut-red">*</span>
              </label>
              {/* Dropdown Selector for Topic */}
              <select
                aria-label="Select topic preset"
                value={matchedTopicPreset}
                onChange={(e) => handleTopicDropdown(e.target.value)}
                className="cursor-pointer border-2 border-black bg-brut-yellow px-1.5 py-0.5 text-[11px] font-bold uppercase outline-none"
              >
                <option value="" disabled>
                  — Select Topic —
                </option>
                {TOPIC_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
              placeholder="e.g. AI hackathon, Web3, Python"
              className="brutal-sm w-full bg-white px-3 py-2 text-sm font-semibold placeholder:text-black/40 focus:outline-none focus:shadow-[6px_6px_0_0_#000]"
            />
          </div>

          {/* City / Location Section (Dropdown + Freeform Input) */}
          <div className="sm:col-span-4">
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wide">
                City / Region
              </label>
              {/* Dropdown Selector for City */}
              <select
                aria-label="Select city preset"
                value={matchedCityPreset}
                onChange={(e) => handleCityDropdown(e.target.value)}
                className="cursor-pointer border-2 border-black bg-brut-lime px-1.5 py-0.5 text-[11px] font-bold uppercase outline-none"
              >
                <option value="" disabled>
                  — Select City —
                </option>
                {CITY_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Bangalore, Delhi, Pune"
              className="brutal-sm w-full bg-white px-3 py-2 text-sm font-semibold placeholder:text-black/40 focus:outline-none focus:shadow-[6px_6px_0_0_#000]"
            />
          </div>

          {/* Online Toggle & Search Button */}
          <div className="flex items-center gap-3 sm:col-span-3 sm:justify-end">
            <label className="brutal-sm flex cursor-pointer select-none items-center gap-2 bg-white px-2.5 py-2 text-xs font-bold uppercase">
              <input
                type="checkbox"
                checked={online}
                onChange={(e) => setOnline(e.target.checked)}
                className="h-4 w-4 appearance-none border-2 border-black bg-white checked:bg-brut-pink checked:after:ml-[2px] checked:after:block checked:after:h-[8px] checked:after:w-[4px] checked:after:rotate-45 checked:after:border-b-2 checked:after:border-r-2 checked:after:border-black"
              />
              Online
            </label>

            <button
              type="submit"
              disabled={loading || !topic.trim()}
              className="brutal-press flex-1 bg-brut-yellow px-5 py-2 text-sm font-bold uppercase disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Searching…" : "Search"}
            </button>
          </div>
        </div>

        {/* Toggle More Section / Filters Bar */}
        <div className="flex flex-wrap items-center justify-between border-t-2 border-black/20 pt-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowMoreSections(!showMoreSections)}
              className="flex items-center gap-1.5 font-bold uppercase underline hover:text-white"
            >
              <span>{showMoreSections ? "▼ Hide" : "▶ More Sections & Formats"}</span>
            </button>
            <span className="text-[11px] font-bold uppercase bg-white/70 px-2 py-0.5 border border-black">
              Section: {SECTION_PRESETS.find((s) => s.value === section)?.label ?? section}
            </span>
          </div>

          {/* Quick presets for Sections right on the bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {SECTION_PRESETS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => handleSectionChange(s.value)}
                className={`border-2 border-black px-2 py-0.5 text-[10px] font-bold uppercase transition-all ${
                  section === s.value
                    ? "bg-black text-white shadow-[2px_2px_0_0_#fff]"
                    : "bg-white text-black hover:bg-white/80"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Expandable More Sections Drawer */}
        {showMoreSections && (
          <div className="brutal-sm mt-1 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wide">
                🎯 Filter by Event Format / Section Dropdown:
              </h4>
              <span className="text-[10px] font-bold uppercase text-black/50">
                Filters active search & future queries
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase">
                  Event Format Dropdown
                </label>
                <select
                  value={section}
                  onChange={(e) => handleSectionChange(e.target.value)}
                  className="brutal-sm w-full cursor-pointer bg-brut-purple px-2 py-1.5 text-xs font-bold uppercase outline-none"
                >
                  {SECTION_PRESETS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase">
                  Fast City Switcher Dropdown
                </label>
                <select
                  value={matchedCityPreset}
                  onChange={(e) => handleCityDropdown(e.target.value)}
                  className="brutal-sm w-full cursor-pointer bg-brut-cyan px-2 py-1.5 text-xs font-bold uppercase outline-none"
                >
                  {CITY_PRESETS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase">
                  Fast Topic Switcher Dropdown
                </label>
                <select
                  value={matchedTopicPreset}
                  onChange={(e) => handleTopicDropdown(e.target.value)}
                  className="brutal-sm w-full cursor-pointer bg-brut-yellow px-2 py-1.5 text-xs font-bold uppercase outline-none"
                >
                  {TOPIC_PRESETS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </form>

      {/* Popular 1-Click Search Chips */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-[11px] font-bold uppercase text-black/60 mr-1">
          Popular:
        </span>
        {POPULAR_CHIPS.map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => selectChip(chip.topic, chip.location)}
            className="border-2 border-black bg-white px-2 py-0.5 text-[11px] font-bold uppercase shadow-[2px_2px_0_0_#000] transition-transform hover:-translate-y-0.5 active:translate-y-0.5"
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}
