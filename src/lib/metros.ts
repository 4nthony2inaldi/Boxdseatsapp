/**
 * Curated metro list for the "Around You" feed section and profile home city.
 * Coordinates are metro centroids — paired with a ~75mi venue radius, block-level
 * precision is unnecessary. Keys are stored in profiles.home_city.
 *
 * Coordinates here are hand-verified city centroids, NOT averages of our venue
 * data (those are polluted by mis-geocoded venues). `state` doubles as the
 * country/subdivision label shown after the city name. `region` groups cities
 * into <optgroup>s in the pickers; US cities omit it (the default region).
 */

export type Metro = {
  key: string;
  label: string;
  state: string | null;
  lat: number;
  lng: number;
  region?: string;
};

export const METROS: Metro[] = [
  { key: "atlanta", label: "Atlanta", state: "GA", lat: 33.749, lng: -84.388 },
  { key: "austin", label: "Austin", state: "TX", lat: 30.267, lng: -97.743 },
  { key: "baltimore", label: "Baltimore", state: "MD", lat: 39.29, lng: -76.612 },
  { key: "boston", label: "Boston", state: "MA", lat: 42.36, lng: -71.059 },
  { key: "buffalo", label: "Buffalo", state: "NY", lat: 42.886, lng: -78.878 },
  { key: "charlotte", label: "Charlotte", state: "NC", lat: 35.227, lng: -80.843 },
  { key: "chicago", label: "Chicago", state: "IL", lat: 41.878, lng: -87.63 },
  { key: "cincinnati", label: "Cincinnati", state: "OH", lat: 39.103, lng: -84.512 },
  { key: "cleveland", label: "Cleveland", state: "OH", lat: 41.499, lng: -81.694 },
  { key: "columbus", label: "Columbus", state: "OH", lat: 39.961, lng: -82.999 },
  { key: "dallas", label: "Dallas–Fort Worth", state: "TX", lat: 32.777, lng: -96.797 },
  { key: "denver", label: "Denver", state: "CO", lat: 39.739, lng: -104.99 },
  { key: "detroit", label: "Detroit", state: "MI", lat: 42.331, lng: -83.046 },
  { key: "hartford", label: "Hartford", state: "CT", lat: 41.764, lng: -72.685 },
  { key: "houston", label: "Houston", state: "TX", lat: 29.76, lng: -95.37 },
  { key: "indianapolis", label: "Indianapolis", state: "IN", lat: 39.768, lng: -86.158 },
  { key: "jacksonville", label: "Jacksonville", state: "FL", lat: 30.332, lng: -81.656 },
  { key: "kansascity", label: "Kansas City", state: "MO", lat: 39.1, lng: -94.578 },
  { key: "lasvegas", label: "Las Vegas", state: "NV", lat: 36.17, lng: -115.14 },
  { key: "losangeles", label: "Los Angeles", state: "CA", lat: 34.052, lng: -118.244 },
  { key: "memphis", label: "Memphis", state: "TN", lat: 35.149, lng: -90.049 },
  { key: "miami", label: "Miami", state: "FL", lat: 25.762, lng: -80.192 },
  { key: "milwaukee", label: "Milwaukee", state: "WI", lat: 43.039, lng: -87.906 },
  { key: "minneapolis", label: "Minneapolis–St. Paul", state: "MN", lat: 44.978, lng: -93.265 },
  { key: "nashville", label: "Nashville", state: "TN", lat: 36.163, lng: -86.781 },
  { key: "neworleans", label: "New Orleans", state: "LA", lat: 29.951, lng: -90.072 },
  { key: "newyork", label: "New York", state: "NY", lat: 40.713, lng: -74.006 },
  { key: "oklahomacity", label: "Oklahoma City", state: "OK", lat: 35.468, lng: -97.516 },
  { key: "orlando", label: "Orlando", state: "FL", lat: 28.538, lng: -81.379 },
  { key: "philadelphia", label: "Philadelphia", state: "PA", lat: 39.953, lng: -75.165 },
  { key: "phoenix", label: "Phoenix", state: "AZ", lat: 33.448, lng: -112.074 },
  { key: "pittsburgh", label: "Pittsburgh", state: "PA", lat: 40.441, lng: -79.996 },
  { key: "portland", label: "Portland", state: "OR", lat: 45.515, lng: -122.679 },
  { key: "raleigh", label: "Raleigh", state: "NC", lat: 35.78, lng: -78.638 },
  { key: "sacramento", label: "Sacramento", state: "CA", lat: 38.582, lng: -121.494 },
  { key: "saltlakecity", label: "Salt Lake City", state: "UT", lat: 40.761, lng: -111.891 },
  { key: "sanantonio", label: "San Antonio", state: "TX", lat: 29.425, lng: -98.494 },
  { key: "sandiego", label: "San Diego", state: "CA", lat: 32.716, lng: -117.161 },
  { key: "sanfrancisco", label: "San Francisco Bay Area", state: "CA", lat: 37.775, lng: -122.419 },
  { key: "seattle", label: "Seattle", state: "WA", lat: 47.606, lng: -122.332 },
  { key: "stlouis", label: "St. Louis", state: "MO", lat: 38.627, lng: -90.199 },
  { key: "tampa", label: "Tampa Bay", state: "FL", lat: 27.951, lng: -82.457 },
  { key: "washington", label: "Washington, D.C.", state: "DC", lat: 38.907, lng: -77.037 },
  // Spring training hubs
  { key: "fortmyers", label: "Fort Myers", state: "FL", lat: 26.64, lng: -81.873 },
  { key: "palmbeach", label: "West Palm Beach", state: "FL", lat: 26.715, lng: -80.054 },
  { key: "tucson", label: "Tucson", state: "AZ", lat: 32.222, lng: -110.975 },
  // Motorsports / golf country
  { key: "charlestonsc", label: "Charleston", state: "SC", lat: 32.776, lng: -79.931 },
  { key: "daytona", label: "Daytona Beach", state: "FL", lat: 29.211, lng: -81.023 },
  { key: "greenville", label: "Greenville", state: "SC", lat: 34.852, lng: -82.394 },
  { key: "louisville", label: "Louisville", state: "KY", lat: 38.253, lng: -85.758 },

  // Canada
  { key: "calgary", label: "Calgary", state: "AB", lat: 51.045, lng: -114.057, region: "Canada" },
  { key: "edmonton", label: "Edmonton", state: "AB", lat: 53.546, lng: -113.494, region: "Canada" },
  { key: "montreal", label: "Montreal", state: "QC", lat: 45.502, lng: -73.567, region: "Canada" },
  { key: "ottawa", label: "Ottawa", state: "ON", lat: 45.421, lng: -75.697, region: "Canada" },
  { key: "toronto", label: "Toronto", state: "ON", lat: 43.653, lng: -79.383, region: "Canada" },
  { key: "vancouver", label: "Vancouver", state: "BC", lat: 49.283, lng: -123.121, region: "Canada" },
  { key: "winnipeg", label: "Winnipeg", state: "MB", lat: 49.895, lng: -97.138, region: "Canada" },

  // UK & Ireland
  { key: "london", label: "London", state: "England", lat: 51.507, lng: -0.128, region: "UK & Ireland" },
  { key: "manchester", label: "Manchester", state: "England", lat: 53.481, lng: -2.242, region: "UK & Ireland" },
  { key: "liverpool", label: "Liverpool", state: "England", lat: 53.408, lng: -2.991, region: "UK & Ireland" },
  { key: "birmingham_uk", label: "Birmingham", state: "England", lat: 52.486, lng: -1.89, region: "UK & Ireland" },
  { key: "newcastle", label: "Newcastle", state: "England", lat: 54.978, lng: -1.618, region: "UK & Ireland" },
  { key: "leeds", label: "Leeds", state: "England", lat: 53.801, lng: -1.549, region: "UK & Ireland" },
  { key: "nottingham", label: "Nottingham", state: "England", lat: 52.954, lng: -1.158, region: "UK & Ireland" },
  { key: "glasgow", label: "Glasgow", state: "Scotland", lat: 55.864, lng: -4.252, region: "UK & Ireland" },
  { key: "edinburgh", label: "Edinburgh", state: "Scotland", lat: 55.953, lng: -3.188, region: "UK & Ireland" },
  { key: "dublin", label: "Dublin", state: "Ireland", lat: 53.35, lng: -6.26, region: "UK & Ireland" },

  // Europe
  { key: "madrid", label: "Madrid", state: "Spain", lat: 40.417, lng: -3.703, region: "Europe" },
  { key: "barcelona", label: "Barcelona", state: "Spain", lat: 41.385, lng: 2.173, region: "Europe" },
  { key: "seville", label: "Seville", state: "Spain", lat: 37.389, lng: -5.984, region: "Europe" },
  { key: "valencia", label: "Valencia", state: "Spain", lat: 39.47, lng: -0.376, region: "Europe" },
  { key: "bilbao", label: "Bilbao", state: "Spain", lat: 43.263, lng: -2.935, region: "Europe" },
  { key: "lisbon", label: "Lisbon", state: "Portugal", lat: 38.722, lng: -9.139, region: "Europe" },
  { key: "porto", label: "Porto", state: "Portugal", lat: 41.158, lng: -8.629, region: "Europe" },
  { key: "paris", label: "Paris", state: "France", lat: 48.857, lng: 2.351, region: "Europe" },
  { key: "lyon", label: "Lyon", state: "France", lat: 45.764, lng: 4.836, region: "Europe" },
  { key: "marseille", label: "Marseille", state: "France", lat: 43.296, lng: 5.37, region: "Europe" },
  { key: "lille", label: "Lille", state: "France", lat: 50.629, lng: 3.057, region: "Europe" },
  { key: "nice", label: "Nice", state: "France", lat: 43.71, lng: 7.262, region: "Europe" },
  { key: "monaco", label: "Monaco", state: "Monaco", lat: 43.738, lng: 7.424, region: "Europe" },
  { key: "munich", label: "Munich", state: "Germany", lat: 48.135, lng: 11.582, region: "Europe" },
  { key: "berlin", label: "Berlin", state: "Germany", lat: 52.52, lng: 13.405, region: "Europe" },
  { key: "hamburg", label: "Hamburg", state: "Germany", lat: 53.551, lng: 9.993, region: "Europe" },
  { key: "dortmund", label: "Dortmund", state: "Germany", lat: 51.514, lng: 7.466, region: "Europe" },
  { key: "frankfurt", label: "Frankfurt", state: "Germany", lat: 50.11, lng: 8.682, region: "Europe" },
  { key: "stuttgart", label: "Stuttgart", state: "Germany", lat: 48.776, lng: 9.182, region: "Europe" },
  { key: "cologne", label: "Cologne", state: "Germany", lat: 50.938, lng: 6.96, region: "Europe" },
  { key: "rome", label: "Rome", state: "Italy", lat: 41.903, lng: 12.496, region: "Europe" },
  { key: "milan", label: "Milan", state: "Italy", lat: 45.464, lng: 9.19, region: "Europe" },
  { key: "turin", label: "Turin", state: "Italy", lat: 45.07, lng: 7.687, region: "Europe" },
  { key: "naples", label: "Naples", state: "Italy", lat: 40.852, lng: 14.268, region: "Europe" },
  { key: "florence", label: "Florence", state: "Italy", lat: 43.77, lng: 11.256, region: "Europe" },
  { key: "amsterdam", label: "Amsterdam", state: "Netherlands", lat: 52.368, lng: 4.904, region: "Europe" },
  { key: "rotterdam", label: "Rotterdam", state: "Netherlands", lat: 51.924, lng: 4.478, region: "Europe" },
  { key: "eindhoven", label: "Eindhoven", state: "Netherlands", lat: 51.441, lng: 5.469, region: "Europe" },
  { key: "istanbul", label: "Istanbul", state: "Turkey", lat: 41.008, lng: 28.978, region: "Europe" },

  // Australia
  { key: "melbourne", label: "Melbourne", state: "Australia", lat: -37.814, lng: 144.963, region: "Australia" },
  { key: "sydney", label: "Sydney", state: "Australia", lat: -33.869, lng: 151.209, region: "Australia" },
  { key: "perth_au", label: "Perth", state: "Australia", lat: -31.953, lng: 115.857, region: "Australia" },
  { key: "adelaide", label: "Adelaide", state: "Australia", lat: -34.929, lng: 138.601, region: "Australia" },
  { key: "brisbane", label: "Brisbane", state: "Australia", lat: -27.469, lng: 153.026, region: "Australia" },
  { key: "geelong", label: "Geelong", state: "Australia", lat: -38.149, lng: 144.361, region: "Australia" },
  { key: "goldcoast", label: "Gold Coast", state: "Australia", lat: -28.017, lng: 153.4, region: "Australia" },

  // Latin America
  { key: "mexicocity", label: "Mexico City", state: "Mexico", lat: 19.433, lng: -99.133, region: "Latin America" },
  { key: "guadalajara", label: "Guadalajara", state: "Mexico", lat: 20.677, lng: -103.347, region: "Latin America" },
  { key: "monterrey", label: "Monterrey", state: "Mexico", lat: 25.686, lng: -100.316, region: "Latin America" },
  { key: "buenosaires", label: "Buenos Aires", state: "Argentina", lat: -34.604, lng: -58.382, region: "Latin America" },
  { key: "saopaulo", label: "São Paulo", state: "Brazil", lat: -23.551, lng: -46.633, region: "Latin America" },
  { key: "riodejaneiro", label: "Rio de Janeiro", state: "Brazil", lat: -22.907, lng: -43.173, region: "Latin America" },
  { key: "montevideo", label: "Montevideo", state: "Uruguay", lat: -34.901, lng: -56.164, region: "Latin America" },
  { key: "santiago", label: "Santiago", state: "Chile", lat: -33.449, lng: -70.669, region: "Latin America" },
  { key: "lima", label: "Lima", state: "Peru", lat: -12.046, lng: -77.043, region: "Latin America" },
  { key: "asuncion", label: "Asunción", state: "Paraguay", lat: -25.264, lng: -57.576, region: "Latin America" },
];

export function metroFromKey(key: string | null | undefined): Metro | null {
  if (!key) return null;
  return METROS.find((m) => m.key === key) ?? null;
}

/** Region display order for grouped pickers. US is the implicit default. */
export const REGION_ORDER = [
  "United States",
  "Canada",
  "UK & Ireland",
  "Europe",
  "Australia",
  "Latin America",
] as const;

/** The region a metro belongs to ("United States" when untagged). */
export function regionOf(m: Metro): string {
  return m.region ?? "United States";
}

/**
 * Metros grouped by region for <optgroup> rendering, in REGION_ORDER, each
 * group's cities sorted by label.
 */
export function metrosByRegion(): { region: string; metros: Metro[] }[] {
  const groups = new Map<string, Metro[]>();
  for (const m of METROS) {
    const r = regionOf(m);
    const list = groups.get(r) ?? [];
    list.push(m);
    groups.set(r, list);
  }
  const ordered: { region: string; metros: Metro[] }[] = [];
  for (const region of REGION_ORDER) {
    const metros = groups.get(region);
    if (metros) {
      ordered.push({ region, metros: [...metros].sort((a, b) => a.label.localeCompare(b.label)) });
    }
  }
  // Any region not in REGION_ORDER (future-proofing) appended alphabetically.
  for (const [region, metros] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (!REGION_ORDER.includes(region as (typeof REGION_ORDER)[number])) {
      ordered.push({ region, metros: [...metros].sort((a, b) => a.label.localeCompare(b.label)) });
    }
  }
  return ordered;
}
