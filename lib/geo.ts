/**
 * Geocoding helpers and predefined coordinates for Indian tech hubs & cities.
 * Order is [longitude, latitude] as standard for GeoJSON and Mapbox GL.
 */

export interface CityCoord {
  name: string;
  aliases: string[];
  coordinates: [number, number]; // [lng, lat]
  zoom: number;
}

export const KNOWN_CITIES: Record<string, CityCoord> = {
  bangalore: {
    name: "Bangalore",
    aliases: ["bengaluru", "bangalore", "whitefield", "koramangala", "indiranagar", "hsr", "electronic city"],
    coordinates: [77.5946, 12.9716],
    zoom: 11,
  },
  delhi: {
    name: "Delhi NCR",
    aliases: ["delhi", "new delhi", "ncr", "gurgaon", "gurugram", "noida", "greater noida", "ghaziabad", "faridabad"],
    coordinates: [77.209, 28.6139],
    zoom: 10,
  },
  mumbai: {
    name: "Mumbai",
    aliases: ["mumbai", "bombay", "navi mumbai", "thane", "bandra", "andheri", "powai"],
    coordinates: [72.8777, 19.076],
    zoom: 11,
  },
  hyderabad: {
    name: "Hyderabad",
    aliases: ["hyderabad", "secunderabad", "hitec city", "gachibowli", "madhapur", "cyberabad"],
    coordinates: [78.4867, 17.385],
    zoom: 11,
  },
  pune: {
    name: "Pune",
    aliases: ["pune", "hinjewadi", "baner", "viman nagar", "kharadi", "wakad", "shivajinagar"],
    coordinates: [73.8567, 18.5204],
    zoom: 11,
  },
  chennai: {
    name: "Chennai",
    aliases: ["chennai", "madras", "omr", "velachery", "guindy", "t nagar", "sholinganallur"],
    coordinates: [80.2707, 13.0827],
    zoom: 11,
  },
  kolkata: {
    name: "Kolkata",
    aliases: ["kolkata", "calcutta", "salt lake", "new town", "howrah"],
    coordinates: [88.3639, 22.5726],
    zoom: 11,
  },
  ahmedabad: {
    name: "Ahmedabad",
    aliases: ["ahmedabad", "gandhinagar", "gift city", "sg highway"],
    coordinates: [72.5714, 23.0225],
    zoom: 11,
  },
  jaipur: {
    name: "Jaipur",
    aliases: ["jaipur", "pink city", "malviya nagar", "sitapura"],
    coordinates: [75.7873, 26.9124],
    zoom: 11,
  },
  goa: {
    name: "Goa",
    aliases: ["goa", "panaji", "panjim", "margao", "vasco", "mapusa"],
    coordinates: [73.8278, 15.2993],
    zoom: 10,
  },
  kochi: {
    name: "Kochi",
    aliases: ["kochi", "cochin", "infopark", "kakkanad", "ernakulam"],
    coordinates: [76.2673, 9.9312],
    zoom: 11,
  },
  indore: {
    name: "Indore",
    aliases: ["indore", "super corridor", "vijay nagar"],
    coordinates: [75.8577, 22.7196],
    zoom: 11,
  },
  chandigarh: {
    name: "Chandigarh",
    aliases: ["chandigarh", "mohali", "panchkula", "tricity"],
    coordinates: [76.7794, 30.7333],
    zoom: 11,
  },
  bhubaneswar: {
    name: "Bhubaneswar",
    aliases: ["bhubaneswar", "cuttack", "patia", "infocity"],
    coordinates: [85.8245, 20.2961],
    zoom: 11,
  },
  coimbatore: {
    name: "Coimbatore",
    aliases: ["coimbatore", "kovai", "saravanampatti", "peelamedu"],
    coordinates: [76.9558, 11.0168],
    zoom: 11,
  },
};

export const INDIA_CENTER: [number, number] = [78.9629, 21.5937];
export const INDIA_DEFAULT_ZOOM = 4.3;

/** Deterministic pseudo-random jitter based on a string so events don't stack on exact same spot */
function getJitter(seed: string): [number, number] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const factor = 0.035; // ~3-4 km spread across tech parks/venues
  const angle = Math.abs(hash % 360) * (Math.PI / 180);
  const radius = ((Math.abs(hash) % 100) / 100) * factor;
  return [Math.cos(angle) * radius, Math.sin(angle) * radius];
}

/**
 * Resolves [longitude, latitude] for an event.
 * Scans venue_or_city text for known Indian tech hubs, then falls back to location param.
 */
export function resolveEventCoordinates(
  venueOrCity: string | null | undefined,
  fallbackLocation: string,
  eventName: string = ""
): { coordinates: [number, number]; city: string; isApprox: boolean } {
  const text = `${venueOrCity ?? ""} ${fallbackLocation}`.toLowerCase();

  for (const [key, city] of Object.entries(KNOWN_CITIES)) {
    if (city.aliases.some((alias) => text.includes(alias))) {
      const [baseLng, baseLat] = city.coordinates;
      const [jLng, jLat] = getJitter(eventName || text);
      return {
        coordinates: [baseLng + jLng, baseLat + jLat],
        city: city.name,
        isApprox: false,
      };
    }
  }

  // Fallback: check fallbackLocation alone
  const fbKey = fallbackLocation.toLowerCase().trim();
  for (const [key, city] of Object.entries(KNOWN_CITIES)) {
    if (city.aliases.some((alias) => fbKey.includes(alias))) {
      const [baseLng, baseLat] = city.coordinates;
      const [jLng, jLat] = getJitter(eventName || text);
      return {
        coordinates: [baseLng + jLng, baseLat + jLat],
        city: city.name,
        isApprox: true,
      };
    }
  }

  // Country level default: jitter around central India tech region (Nagpur / Hyderabad corridor)
  const [jLng, jLat] = getJitter(eventName || "india");
  return {
    coordinates: [INDIA_CENTER[0] + jLng * 2, INDIA_CENTER[1] + jLat * 2],
    city: "India",
    isApprox: true,
  };
}
