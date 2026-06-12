/**
 * Curated metro list for the "Around You" feed section and profile home city.
 * Coordinates are metro centroids — paired with a ~75mi venue radius, block-level
 * precision is unnecessary. Keys are stored in profiles.home_city.
 */

export type Metro = { key: string; label: string; state: string | null; lat: number; lng: number };

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
  // Canada + abroad
  { key: "calgary", label: "Calgary", state: "AB", lat: 51.045, lng: -114.057 },
  { key: "edmonton", label: "Edmonton", state: "AB", lat: 53.546, lng: -113.494 },
  { key: "montreal", label: "Montreal", state: "QC", lat: 45.502, lng: -73.567 },
  { key: "ottawa", label: "Ottawa", state: "ON", lat: 45.421, lng: -75.697 },
  { key: "toronto", label: "Toronto", state: "ON", lat: 43.653, lng: -79.383 },
  { key: "vancouver", label: "Vancouver", state: "BC", lat: 49.283, lng: -123.121 },
  { key: "winnipeg", label: "Winnipeg", state: "MB", lat: 49.895, lng: -97.138 },
  { key: "london", label: "London", state: null, lat: 51.507, lng: -0.128 },
  { key: "mexicocity", label: "Mexico City", state: null, lat: 19.433, lng: -99.133 },
];

export function metroFromKey(key: string | null | undefined): Metro | null {
  if (!key) return null;
  return METROS.find((m) => m.key === key) ?? null;
}
