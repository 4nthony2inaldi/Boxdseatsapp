#!/usr/bin/env node
/**
 * geocode-venues.mjs — fills venues.location for rows that have none. The
 * seeder (and the NCAA importers) create venues with NULL location because
 * ESPN's payloads carry no coordinates (its venue API only returns address +
 * grass/indoor). Without coordinates a venue can't appear on the passport heat
 * map, so this pass geocodes name + city/state via the free OpenStreetMap
 * Nominatim API and writes a PostGIS point.
 *
 * Nominatim usage policy: <=1 request/second and a real User-Agent — so this
 * runs sequentially with a delay. A name+city+state query resolves arenas and
 * stadiums well; on a miss it retries with city+state for a coarse fix.
 *
 * Usage:  node scripts/data/geocode-venues.mjs [--limit=N] [--dry-run]
 * Env:    SUPABASE_PAT, SUPABASE_PROJECT (default hsntmacdhuprmtsuxhsq)
 */

const PROJECT = process.env.SUPABASE_PROJECT || "hsntmacdhuprmtsuxhsq";
const PAT = process.env.SUPABASE_PAT || "";
const DRY = process.argv.includes("--dry-run");
const limArg = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = limArg ? parseInt(limArg.slice(8), 10) : Infinity;
const DELAY_MS = 1100; // Nominatim: <=1 req/sec
const UA = "BoxdSeats-geocode/1.0 (arinaldi@yext.com)";

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function sqlLit(s) { return s === null || s === undefined ? "null" : `'${String(s).replace(/'/g, "''")}'`; }

async function runSQL(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
    method: "POST", headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" }, body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Management API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function geocode(q) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (res.status === 429 || res.status >= 500) { await sleep(2000 * (attempt + 1)); continue; }
      if (!res.ok) return null;
      const d = await res.json();
      if (d?.length) return { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) };
      return null;
    } catch { await sleep(1500 * (attempt + 1)); }
  }
  return null;
}

// Country bounding boxes [minLat, maxLat, minLng, maxLng] for the countries we
// actually carry venues in. Used to reject a confident-but-wrong Nominatim hit
// that lands on the wrong continent (e.g. an ambiguous ground name resolving to
// a same-named place abroad). Only enforced when we have a box for the country,
// so an unlisted country is never over-filtered.
const COUNTRY_BBOX = {
  US: [18, 72, -180, -66], CA: [41, 84, -141, -52], AU: [-44, -9, 112, 154],
  GB: [49, 61, -9, 2], IE: [51, 56, -11, -5], ES: [35, 44, -10, 5],
  PT: [36, 42.5, -10, -6], FR: [41, 51.5, -5.5, 9.8], DE: [47, 55.5, 5.5, 15.5],
  IT: [35.5, 47.5, 6, 19], NL: [50.5, 53.7, 3, 7.3], TR: [35.8, 42.2, 25.5, 45],
  MX: [14, 33, -118.5, -86], AR: [-55, -21, -74, -53], BR: [-34, 6, -74, -34],
  UY: [-35, -30, -58.5, -53], CL: [-56, -17, -76, -66], PE: [-18.5, 0, -81.5, -68.5],
  PY: [-27.7, -19, -62.7, -54], CN: [18, 54, 73, 135],
};

/** A usable locality — anything but a missing/"Unknown" city placeholder. */
function hasUsableCity(city) {
  const c = String(city || "").trim().toLowerCase();
  return c.length > 0 && c !== "unknown";
}

/** True if coords fall inside the country's bounding box (or we have no box). */
function inCountry(country, lat, lng) {
  const box = COUNTRY_BBOX[String(country || "").toUpperCase()];
  if (!box) return true;
  const [minLat, maxLat, minLng, maxLng] = box;
  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
}

if (!DRY && !PAT) { console.error("SUPABASE_PAT required (or --dry-run)."); process.exit(2); }

const venues = await runSQL(
  `select id, name, city, state, country from venues where location is null
     order by (exists (
       select 1 from events e
        where e.venue_id = venues.id
          and e.event_date >= current_date - interval '60 days'
     )) desc, name`
);
const todo = venues.slice(0, LIMIT);
console.log(`Venues missing coords: ${venues.length}${todo.length < venues.length ? ` (processing ${todo.length})` : ""}`);

const updates = [];
let hit = 0, miss = 0, n = 0;
for (const v of todo) {
  n++;
  const useCity = hasUsableCity(v.city);
  // Only include the city in the query string when it's a real locality, so we
  // don't ask Nominatim for "<venue>, Unknown, ...".
  const loc = [useCity ? v.city : null, v.state, v.country === "US" ? "USA" : v.country].filter(Boolean).join(", ");
  let coords = await geocode([v.name, loc].filter(Boolean).join(", "));
  await sleep(DELAY_MS);
  // Coarse fallback only when we have a real city — geocoding "Unknown, USA"
  // (or bare country) returns a single junk point shared by every such venue.
  if (!coords && loc && useCity) { coords = await geocode(loc); await sleep(DELAY_MS); }
  // Reject a hit that lands outside the venue's country (confident-but-wrong).
  if (coords && !inCountry(v.country, coords.lat, coords.lng)) coords = null;
  if (coords) { updates.push({ id: v.id, ...coords }); hit++; } else miss++;
  if (n % 50 === 0) console.log(`  ${n}/${todo.length} — geocoded=${hit} missed=${miss}`);
}

console.log(`\nGeocoded ${hit}/${todo.length} (missed ${miss}).`);
if (DRY) { console.log("sample:", updates.slice(0, 8).map((u) => `${u.lat.toFixed(3)},${u.lng.toFixed(3)}`).join("  ")); console.log("DRY RUN — nothing written."); process.exit(0); }

// Batched PostGIS updates via a VALUES join.
let written = 0;
for (let i = 0; i < updates.length; i += 200) {
  const batch = updates.slice(i, i + 200);
  const vals = batch.map((u) => `(${sqlLit(u.id)}::uuid, ${u.lng}::float8, ${u.lat}::float8)`).join(",\n");
  await runSQL(
    `update venues v set location = extensions.ST_SetSRID(extensions.ST_MakePoint(d.lng, d.lat), 4326)::extensions.geography
     from (values\n${vals}\n) as d(id, lng, lat) where v.id = d.id;`
  );
  written += batch.length;
  console.log(`  wrote ${written}/${updates.length}`);
}
console.log(`\nDone. Set coordinates on ${written} venues.`);
