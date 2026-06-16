#!/usr/bin/env node
/**
 * seed-ncaa-teams.mjs — backfills the FULL Division I membership for the NCAA
 * basketball leagues. These leagues were seeded with lazyTeams + postseasonOnly
 * (see seed-real-data.mjs), so a team only exists if it appeared in an ingested
 * March Madness game — leaving ~190 men's / ~175 women's D1 programs (e.g.
 * Pittsburgh) absent from the favorite-team picker. Pro leagues don't have this
 * gap because they use full team sync.
 *
 * Pulls ESPN's complete team list per league and, matching seed-real-data.mjs's
 * column mapping (name=displayName, short_name=name, city=location, abbreviation,
 * logo, espn id), inserts teams we don't have. Existing lazily-created teams are
 * matched by espn id or normalized name and enriched (espn id + logo) rather
 * than duplicated.
 *
 * Usage:  node scripts/data/seed-ncaa-teams.mjs [--dry-run]
 * Env:    SUPABASE_PAT, SUPABASE_PROJECT (default hsntmacdhuprmtsuxhsq)
 */

const PROJECT = process.env.SUPABASE_PROJECT || "hsntmacdhuprmtsuxhsq";
const PAT = process.env.SUPABASE_PAT || "";
const DRY = process.argv.includes("--dry-run");

const LEAGUES = [
  { slug: "ncaam", espn: "mens-college-basketball", sport: "basketball" },
  { slug: "ncaaw", espn: "womens-college-basketball", sport: "basketball" },
];

function normName(s) {
  return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}
function sqlLit(s) { return s === null || s === undefined ? "null" : `'${String(s).replace(/'/g, "''")}'`; }

async function fetchJSON(url) {
  const res = await fetch(url, { headers: { "User-Agent": "BoxdSeats-ncaa/1.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}
async function runSQL(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Management API ${res.status}: ${await res.text()}`);
  return res.json();
}

if (!PAT) { console.error("SUPABASE_PAT is required."); process.exit(2); }

for (const lg of LEAGUES) {
  const [{ id: leagueId } = {}] = await runSQL(`select id from leagues where slug=${sqlLit(lg.slug)}`);
  if (!leagueId) { console.error(`  [${lg.slug}] league not found — skipping`); continue; }

  const existing = await runSQL(
    `select id, name, external_ids->>'espn' as espn from teams where league_id=${sqlLit(leagueId)}`
  );
  const byEspn = new Map();
  const byName = new Map();
  for (const r of existing) {
    if (r.espn) byEspn.set(r.espn, r);
    byName.set(normName(r.name), r);
  }

  const data = await fetchJSON(`https://site.api.espn.com/apis/site/v2/sports/basketball/${lg.espn}/teams?limit=500`);
  const espnTeams = (data.sports?.[0]?.leagues?.[0]?.teams ?? []).map((t) => t.team);

  const inserts = [];
  const enrich = [];
  let have = 0;
  for (const t of espnTeams) {
    const id = String(t.id);
    if (byEspn.has(id)) { have++; continue; }
    const name = t.displayName ?? `${t.location ?? ""} ${t.name ?? ""}`.trim();
    const logo = t.logos?.find((l) => l.rel?.includes("default"))?.href ?? t.logos?.[0]?.href ?? null;
    const match = byName.get(normName(name));
    if (match) { enrich.push({ rowId: match.id, espn: id, logo }); continue; }
    const shortName = t.name ?? t.shortDisplayName ?? name;
    const city = t.location ?? shortName;
    const abbreviation = t.abbreviation ?? normName(name).slice(0, 4).toUpperCase();
    inserts.push({ name, shortName, abbreviation, city, logo, espn: id });
  }

  console.log(`[${lg.slug}] espn=${espnTeams.length} already-have=${have} enrich=${enrich.length} insert=${inserts.length}`);
  if (DRY) { console.log("  sample inserts:", inserts.slice(0, 8).map((i) => i.name).join(", ")); continue; }

  for (const e of enrich) {
    await runSQL(`update teams set external_ids = external_ids || jsonb_build_object('espn', ${sqlLit(e.espn)}), logo_url = coalesce(logo_url, ${sqlLit(e.logo)}) where id=${sqlLit(e.rowId)};`);
  }
  for (let i = 0; i < inserts.length; i += 200) {
    const batch = inserts.slice(i, i + 200);
    const values = batch.map((t) =>
      `(${sqlLit(leagueId)}, ${sqlLit(t.name)}, ${sqlLit(t.shortName)}, ${sqlLit(t.abbreviation)}, ${sqlLit(t.city)}, ${sqlLit(t.logo)}, jsonb_build_object('espn', ${sqlLit(t.espn)}))`
    ).join(",\n");
    await runSQL(`insert into teams (league_id, name, short_name, abbreviation, city, logo_url, external_ids) values\n${values};`);
  }
  console.log(`  [${lg.slug}] enriched ${enrich.length}, inserted ${inserts.length}`);
}
console.log("Done.");
