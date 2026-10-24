"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import type { EventItem } from "@/lib/types";
import {
  resolveEventCoordinates,
  KNOWN_CITIES,
  INDIA_CENTER,
  INDIA_DEFAULT_ZOOM,
} from "@/lib/geo";
import { formatDate } from "@/lib/dates";

const MAPBOX_TOKEN =
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
  process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ||
  "";

const TYPE_COLORS: Record<string, string> = {
  hackathon: "#b08cff", // brut-purple
  meetup: "#4deeea", // brut-cyan
  conference: "#ff8c42", // brut-orange
  workshop: "#aeffb0", // brut-lime
  other: "#ffd23f", // brut-yellow
};

const TYPE_EMOJI: Record<string, string> = {
  hackathon: "⚡",
  meetup: "🤝",
  conference: "🎤",
  workshop: "🛠",
  other: "📍",
};

interface EventMapProps {
  events: EventItem[];
  activeLocation: string;
  selectedEvent?: EventItem | null;
  onSelectEvent?: (e: EventItem) => void;
}

export default function EventMap({
  events,
  activeLocation,
  selectedEvent,
  onSelectEvent,
}: EventMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const popupsRef = useRef<Map<string, mapboxgl.Popup>>(new Map());
  const [mapLoaded, setMapLoaded] = useState(false);
  const [activeCityTab, setActiveCityTab] = useState<string>("all");

  // Initialize Map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const initialCenter = INDIA_CENTER;
    const initialZoom = INDIA_DEFAULT_ZOOM;

    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: initialCenter,
      zoom: initialZoom,
      cooperativeGestures: false,
    });

    m.addControl(new mapboxgl.NavigationControl({ showCompass: true }), "top-right");

    m.on("load", () => {
      setMapLoaded(true);
    });

    map.current = m;

    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  // Update markers when events change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers & popups
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    popupsRef.current.clear();

    if (events.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();
    let hasCoords = false;

    events.forEach((event) => {
      const { coordinates, city } = resolveEventCoordinates(
        event.venue_or_city,
        activeLocation,
        event.name
      );

      const color = TYPE_COLORS[event.event_type] || "#ffd23f";
      const emoji = TYPE_EMOJI[event.event_type] || "📍";
      const dateText = formatDate(event.start_date, event.date_text);

      // Create Custom Neobrutalist Marker Element
      const el = document.createElement("div");
      el.className = "eventradar-marker cursor-pointer transition-transform hover:scale-110 active:scale-95";
      el.style.cssText = `
        background-color: ${color};
        border: 2.5px solid #000;
        box-shadow: 3px 3px 0 0 #000;
        padding: 3px 7px;
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        display: flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
        user-select: none;
      `;
      el.innerHTML = `<span>${emoji}</span><span>${event.event_type}</span>`;

      // Popup Content
      const popupHtml = `
        <div style="font-family: inherit;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
            <span style="background: ${color}; border: 2px solid #000; padding: 1px 6px; font-size: 10px; font-weight: 800; text-transform: uppercase;">
              ${event.event_type}
            </span>
            <span style="font-size: 11px; font-weight: 700; color: #444;">📍 ${city}</span>
          </div>
          <h4 style="font-size: 14px; font-weight: 800; line-height: 1.25; margin-bottom: 6px;">
            ${event.name}
          </h4>
          <div style="font-size: 12px; font-weight: 600; margin-bottom: 6px; background: #ffd23f; border: 1.5px solid #000; padding: 2px 6px; display: inline-block;">
            🗓 ${dateText}
          </div>
          <div style="font-size: 11px; color: #555; margin-bottom: 10px;">
            ${event.venue_or_city ? `🏢 ${event.venue_or_city}` : "Mode: " + (event.mode ?? "Not specified")}
          </div>
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            ${
              event.registration_url
                ? `<a href="${event.registration_url}" target="_blank" rel="noopener noreferrer" style="background: #ff6ec7; color: #000; border: 2px solid #000; box-shadow: 2px 2px 0 #000; padding: 3px 8px; font-size: 11px; font-weight: 800; text-transform: uppercase; text-decoration: none;">Register →</a>`
                : ""
            }
            <a href="${event.source_url}" target="_blank" rel="noopener noreferrer" style="background: #fff; color: #000; border: 2px solid #000; box-shadow: 2px 2px 0 #000; padding: 3px 8px; font-size: 11px; font-weight: 800; text-transform: uppercase; text-decoration: none;">Source</a>
          </div>
        </div>
      `;

      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: false,
        maxWidth: "300px",
      }).setHTML(popupHtml);

      el.addEventListener("click", () => {
        if (onSelectEvent) onSelectEvent(event);
      });

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat(coordinates)
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);
      popupsRef.current.set(event.name, popup);

      bounds.extend(coordinates);
      hasCoords = true;
    });

    // Auto fit map view to markers
    if (hasCoords) {
      if (events.length === 1) {
        const { coordinates } = resolveEventCoordinates(
          events[0].venue_or_city,
          activeLocation,
          events[0].name
        );
        map.current.flyTo({ center: coordinates, zoom: 11, duration: 1000 });
      } else {
        map.current.fitBounds(bounds, {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          maxZoom: 13,
          duration: 1000,
        });
      }
    }
  }, [events, activeLocation, mapLoaded, onSelectEvent]);

  // When selectedEvent changes from external list click
  useEffect(() => {
    if (!map.current || !selectedEvent) return;

    const { coordinates } = resolveEventCoordinates(
      selectedEvent.venue_or_city,
      activeLocation,
      selectedEvent.name
    );

    map.current.flyTo({
      center: coordinates,
      zoom: 12.5,
      essential: true,
      duration: 1200,
    });

    const popup = popupsRef.current.get(selectedEvent.name);
    if (popup) {
      popup.addTo(map.current);
    }
  }, [selectedEvent, activeLocation]);

  function flyToCity(cityKey: string) {
    if (!map.current) return;
    setActiveCityTab(cityKey);

    if (cityKey === "all") {
      map.current.flyTo({
        center: INDIA_CENTER,
        zoom: INDIA_DEFAULT_ZOOM,
        duration: 1000,
      });
      return;
    }

    const city = KNOWN_CITIES[cityKey];
    if (city) {
      map.current.flyTo({
        center: city.coordinates,
        zoom: city.zoom,
        duration: 1200,
      });
    }
  }

  const QUICK_CITIES = [
    { key: "all", label: "🇮🇳 All India" },
    { key: "bangalore", label: "Bangalore" },
    { key: "delhi", label: "Delhi NCR" },
    { key: "mumbai", label: "Mumbai" },
    { key: "hyderabad", label: "Hyderabad" },
    { key: "pune", label: "Pune" },
    { key: "chennai", label: "Chennai" },
    { key: "kolkata", label: "Kolkata" },
    { key: "ahmedabad", label: "Ahmedabad" },
    { key: "jaipur", label: "Jaipur" },
    { key: "goa", label: "Goa" },
  ];

  return (
    <div className="brutal flex flex-col bg-white p-4">
      {/* Header & Quick City Jump */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b-[3px] border-black pb-3">
        <div className="flex items-center gap-2">
          <span className="brutal-sm bg-brut-pink px-2.5 py-1 text-xs font-bold uppercase">
            🗺 Live Event Map
          </span>
          <span className="text-xs font-semibold text-black/70">
            {events.length} {events.length === 1 ? "location" : "locations"} plotted
          </span>
        </div>

        {/* Quick Fly-To Cities */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto py-1">
          <span className="text-[11px] font-bold uppercase text-black/60 mr-1">
            Jump to:
          </span>
          {QUICK_CITIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => flyToCity(c.key)}
              className={`border-2 border-black px-2 py-0.5 text-[11px] font-bold uppercase transition-all ${
                activeCityTab === c.key
                  ? "bg-brut-yellow shadow-[2px_2px_0_0_#000]"
                  : "bg-white hover:bg-black/5"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mapbox container */}
      <div className="relative h-[420px] w-full border-[3px] border-black shadow-[4px_4px_0_0_#000] sm:h-[480px]">
        <div ref={mapContainer} className="h-full w-full" />

        {/* Legend Overlay in Map corner */}
        <div className="brutal-sm pointer-events-auto absolute bottom-4 left-4 z-10 flex flex-wrap gap-2 bg-white/95 p-2 backdrop-blur-sm">
          <span className="text-[10px] font-bold uppercase text-black/60">Legend:</span>
          {Object.entries(TYPE_COLORS).map(([type, color]) => (
            <span
              key={type}
              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase"
            >
              <span
                className="inline-block h-2.5 w-2.5 border border-black"
                style={{ backgroundColor: color }}
              />
              {type}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-2 text-right text-[11px] font-semibold text-black/50">
        Powered by Mapbox GL · Click any marker to view event details & register
      </p>
    </div>
  );
}
