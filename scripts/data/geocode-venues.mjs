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
  const loc = [v.city, v.state, v.country === "US" ? "USA" : v.country].filter(Boolean).join(", ");
  let coords = await geocode([v.name, loc].filter(Boolean).join(", "));
  await sleep(DELAY_MS);
  if (!coords && loc) { coords = await geocode(loc); await sleep(DELAY_MS); } // coarse fallback
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
