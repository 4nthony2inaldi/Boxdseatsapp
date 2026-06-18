#!/usr/bin/env node
/**
 * regeocode-fallback-venues.mjs — re-geocodes venues that earlier geocoding
 * dumped onto a country/city *centroid* (the Nominatim "couldn't resolve"
 * fallback). These show up as an identical coordinate shared by many venues
 * (e.g. ~225 venues at the US centroid 39.78,-100.45) and are useless for the
 * photo-match and discovery features.
 *
 * Naive name-only geocoding is unsafe here: many of these venues have no city
 * in the DB (and sometimes the wrong country), so an ambiguous name like
 * "Giuseppe Meazza" resolves to the wrong place. So we first enrich the city
 * from ESPN (the original source — its event summary carries venue.address),
 * then geocode "name, city, country" and only accept a confident result
 * (a stadium-type hit, or high importance, inside the expected country).
 * Anything we can't place confidently is left as-is rather than guessed.
 *
 * Usage:  node scripts/data/regeocode-fallback-venues.mjs [--dry-run] [--limit=N] [--min-events=N]
 * Env:    NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (from .env.local)
 */
import { readFileSync } from "node:fs";

for (const line of readFileSync(new URL("../../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY = process.argv.includes("--dry-run");
const LIMIT = Number((process.argv.find((a) => a.startsWith("--limit=")) || "").split("=")[1] || Infinity);
const MIN_EVENTS = Number((process.argv.find((a) => a.startsWith("--min-events=")) || "").split("=")[1] || 0);
const UA = "BoxdSeats-geocode/1.0 (arinaldi@yext.com)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// leagues.slug -> ESPN scoreboard/summary path. Soccer league slugs already ARE
// ESPN codes (ita.1, esp.1, …). Others map by sport.
function espnPath(sport, slug) {
  if (sport === "soccer") return `soccer/${slug}`;
  const m = { mlb: "baseball/mlb", nba: "basketball/nba", wnba: "basketball/wnba", nhl: "hockey/nhl", nfl: "football/nfl" };
  return m[slug] || null;
}

// A few very-high-event venues resist free-text geocoding (sponsor noise in the
// name, or OSM tagging the stadium as a road). Verified coordinates, keyed by
// the exact DB name (lowercased), applied before the fuzzy geocode.
const CURATED = {
  "guaranteed rate field": [41.8299, -87.6338], // White Sox, Chicago
  "mestalla stadium": [39.4745, -0.3582], // Valencia CF
  "olimpico": [41.9339, 12.4547], // Stadio Olimpico, Rome
};

function demojibake(s) {
  if (!s) return s;
  if (!/[ÃÂ]/.test(s)) return s;
  try { const f = Buffer.from(s, "latin1").toString("utf8"); return /�/.test(f) ? s : f; } catch { return s; }
}

async function rest(path, init) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error(`REST ${res.status} ${await res.text()}`);
  return res;
}
function decodeWkb(hex) { const b = Buffer.from(hex, "hex"); return { lng: b.readDoubleLE(9), lat: b.readDoubleLE(17) }; }
function ewkb(lat, lng) {
  const b = Buffer.alloc(25); b.write("0101000020E6100000", 0, "hex");
  b.writeDoubleLE(lng, 9); b.writeDoubleLE(lat, 17); return b.toString("hex").toUpperCase();
}

async function allVenues() {
  const out = [];
  for (let off = 0; ; off += 1000) {
    const rows = await (await rest(`venues?select=id,name,city,country,location&order=id&limit=1000&offset=${off}`)).json();
    out.push(...rows); if (rows.length < 1000) break;
  }
  return out;
}

// For the fallback venues, grab event count + one event's ESPN id + league.
// Paginates within each chunk so high-event venues aren't truncated by the
// PostgREST 1000-row cap (which would undercount them).
async function venueEventInfo(ids) {
  const info = new Map(); // id -> {count, espnId, sport, slug}
  for (let i = 0; i < ids.length; i += 25) {
    const chunk = ids.slice(i, i + 25);
    for (let off = 0; ; off += 1000) {
      const rows = await (await rest(
        `events?select=venue_id,external_ids,leagues(slug,sport)&venue_id=in.(${chunk.join(",")})&order=id&limit=1000&offset=${off}`
      )).json();
      for (const r of rows) {
        const cur = info.get(r.venue_id) || { count: 0, espnId: null, sport: null, slug: null };
        cur.count++;
        if (!cur.espnId && r.external_ids?.espn) {
          cur.espnId = String(r.external_ids.espn);
          cur.sport = r.leagues?.sport || null;
          cur.slug = r.leagues?.slug || null;
        }
        info.set(r.venue_id, cur);
      }
      if (rows.length < 1000) break;
    }
  }
  return info;
}

async function espnVenueAddress(sport, slug, espnId) {
  const path = espnPath(sport, slug);
  if (!path || !espnId) return null;
  try {
    const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${path}/summary?event=${espnId}`,
      { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const d = await res.json();
    const v = d?.gameInfo?.venue || {};
    return { fullName: v.fullName || null, city: v.address?.city || null, country: v.address?.country || null };
  } catch { return null; }
}

const COARSE = new Set(["country", "state", "province", "region", "county", "continent"]);
const STADIUMISH = new Set(["stadium", "sports_centre", "pitch", "track", "soccer", "arena"]);
const sameCountry = (a, b) => {
  if (!a || !b) return true;
  const n = (s) => s.toLowerCase().replace(/[^a-z]/g, "");
  const x = n(a), y = n(b);
  const syn = { usa: "unitedstates", uk: "unitedkingdom", england: "unitedkingdom", scotland: "unitedkingdom", wales: "unitedkingdom" };
  const xx = syn[x] || x, yy = syn[y] || y;
  return xx === yy || xx.startsWith(yy) || yy.startsWith(xx);
};
function pick(arr, expectCountry) {
  const ok = arr.filter((r) => !COARSE.has(r.addresstype));
  if (!ok.length) return null;
  // Prefer a result inside the expected country, but don't hard-reject all if
  // none match (Nominatim's localized country names break naive equality).
  const inCountry = ok.filter((r) => sameCountry(r.address?.country, expectCountry));
  const pool = inCountry.length ? inCountry : ok;
  const stadium = pool.find((r) => STADIUMISH.has(r.type) || STADIUMISH.has(r.addresstype));
  const best = stadium || [...pool].sort((a, b) => (b.importance || 0) - (a.importance || 0))[0];
  if (!best) return null;
  const importance = best.importance || 0;
  if (!stadium && importance < 0.4) return null; // no stadium hit → demand real importance
  return { lat: parseFloat(best.lat), lng: parseFloat(best.lon), type: best.type, importance, label: best.display_name };
}
async function geocode(q, expectCountry) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&accept-language=en&limit=6&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) return null;
  return pick(await res.json(), expectCountry);
}

async function main() {
  console.log(`[regeocode] ${DRY ? "DRY RUN" : "LIVE"} limit=${LIMIT} min-events=${MIN_EVENTS}`);
  const venues = await allVenues();
  const withLoc = venues.filter((v) => v.location);
  const clusters = new Map();
  for (const v of withLoc) clusters.set(v.location, (clusters.get(v.location) || 0) + 1);
  const junk = new Set([...clusters].filter(([, c]) => c >= 5).map(([loc]) => loc));
  const centroids = new Set([...junk].map((h) => { const { lat, lng } = decodeWkb(h); return `${lat.toFixed(3)},${lng.toFixed(3)}`; }));
  const fallback = withLoc.filter((v) => junk.has(v.location));
  const info = await venueEventInfo(fallback.map((v) => v.id));
  fallback.sort((a, b) => (info.get(b.id)?.count || 0) - (info.get(a.id)?.count || 0));

  let fixed = 0, skipped = 0, processed = 0, cityBackfilled = 0;
  for (const v of fallback) {
    const meta = info.get(v.id) || { count: 0 };
    if (meta.count < MIN_EVENTS) continue;
    if (processed >= LIMIT) break;
    processed++;

    const name = demojibake(v.name)?.trim();

    // Curated override for high-volume venues that don't geocode cleanly.
    const cur = name && CURATED[name.toLowerCase()];
    if (cur) {
      if (!DRY) await rest(`venues?id=eq.${v.id}`, { method: "PATCH", body: JSON.stringify({ location: ewkb(cur[0], cur[1]) }) });
      fixed++;
      console.log(`  fix   [${meta.count}] ${name} -> ${cur[0]},${cur[1]} (curated)`);
      continue;
    }

    let city = demojibake(v.city)?.trim() || null;
    let country = v.country || null;
    let fullName = name;

    // Enrich from ESPN when the DB is missing a city (the disambiguator).
    if (!city) {
      await sleep(300);
      const a = await espnVenueAddress(meta.sport, meta.slug, meta.espnId);
      if (a) { city = a.city || city; country = a.country || country; if (a.fullName) fullName = a.fullName; }
    }
    if (!name) { skipped++; continue; }
    if (!city) { skipped++; console.log(`  skip  [${meta.count}] ${name} — no city (can't disambiguate)`); continue; }

    const queries = [
      `${fullName}, ${city}${country ? ", " + country : ""}`,
      `${name}, ${city}${country ? ", " + country : ""}`,
    ];
    let hit = null;
    for (const q of queries) {
      await sleep(1100);
      const r = await geocode(q, country);
      if (r && !centroids.has(`${r.lat.toFixed(3)},${r.lng.toFixed(3)}`)) { hit = { ...r, q }; break; }
    }
    if (!hit) { skipped++; console.log(`  skip  [${meta.count}] ${name} (${city}) — no confident match`); continue; }

    if (!DRY) {
      const patch = { location: ewkb(hit.lat, hit.lng) };
      if (!v.city && city) { patch.city = city; cityBackfilled++; }
      if (!v.country && country) patch.country = country;
      await rest(`venues?id=eq.${v.id}`, { method: "PATCH", body: JSON.stringify(patch) });
    }
    fixed++;
    console.log(`  fix   [${meta.count}] ${name} (${city}) -> ${hit.lat.toFixed(4)},${hit.lng.toFixed(4)} imp=${hit.importance.toFixed(2)} ${hit.type}`);
  }
  console.log(`[regeocode] done. processed=${processed} fixed=${fixed} skipped=${skipped} cityBackfilled=${cityBackfilled}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
