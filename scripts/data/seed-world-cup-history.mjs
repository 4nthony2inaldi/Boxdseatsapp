#!/usr/bin/env node
/**
 * seed-world-cup-history.mjs — additively backfills past FIFA World Cups
 * (2002–2022) into the existing fifa.world league, to bring it to parity with
 * the other leagues (which floor at ~2002). Companion to seed-world-cup.mjs,
 * which only handles the upcoming 2026 tournament and wipes the league.
 *
 * Unlike the 2026 script, this:
 *  - does NOT wipe fifa.world (idempotent: dedup by ESPN match id),
 *  - auto-creates host venues by name (foreign stadiums aren't in our DB),
 *  - derives national teams from match data (espn ids namespaced "fifa:<id>"
 *    to match the existing convention) and upserts them.
 *
 * Usage:  SUPABASE_PAT=... node scripts/data/seed-world-cup-history.mjs [--dry-run]
 * Env:    SUPABASE_PAT (or SUPA_MGMT_TOKEN), SUPABASE_PROJECT (default hsntmacdhuprmtsuxhsq)
 */

const PROJECT = process.env.SUPABASE_PROJECT || process.env.SUPA_PROJECT_REF || "hsntmacdhuprmtsuxhsq";
const PAT = process.env.SUPABASE_PAT || process.env.SUPA_MGMT_TOKEN || "";
const DRY = process.argv.includes("--dry-run");
const UA = "Mozilla/5.0 BoxdSeats/1.0 (noreply@boxdseats.com)";

// Tournament windows (ESPN soccer scoreboard accepts date ranges) + host country.
const TOURNAMENTS = [
  { year: 2002, host: "KR", ranges: ["20020531-20020620", "20020621-20020701"] },
  { year: 2006, host: "DE", ranges: ["20060609-20060629", "20060630-20060710"] },
  { year: 2010, host: "ZA", ranges: ["20100611-20100701", "20100702-20100712"] },
  { year: 2014, host: "BR", ranges: ["20140612-20140702", "20140703-20140714"] },
  { year: 2018, host: "RU", ranges: ["20180614-20180704", "20180705-20180716"] },
  { year: 2022, host: "QA", ranges: ["20221120-20221210", "20221211-20221219"] },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const q = (s) => (s == null ? "null" : "'" + String(s).replace(/'/g, "''") + "'");
const normName = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const isReal = (t) => { const n = t?.team?.displayName || ""; return n && !/winner|runner|tbd|place|group [a-l]\b|round of|third|seed|loser|\d/i.test(n); };

async function fetchJSON(url, attempt = 0) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.status === 429 || res.status >= 500) { if (attempt >= 6) throw new Error(`HTTP ${res.status}`); await sleep(800 * 2 ** attempt); return fetchJSON(url, attempt + 1); }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (e) { if (attempt >= 6) throw e; await sleep(800 * 2 ** attempt); return fetchJSON(url, attempt + 1); }
}
async function runSQL(query, attempt = 0) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
    method: "POST", headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" }, body: JSON.stringify({ query }),
  });
  if (res.status === 429 || res.status >= 500) { if (attempt >= 8) throw new Error(`Management API ${res.status} after retries`); await sleep(1000 * 2 ** attempt); return runSQL(query, attempt + 1); }
  if (!res.ok) throw new Error(`Management API ${res.status}: ${await res.text()}`);
  return res.json();
}

if (!DRY && !PAT) { console.error("SUPABASE_PAT required (or --dry-run)."); process.exit(2); }

// ── Collect matches across all tournaments ──
const matches = [];
const seen = new Set();
for (const t of TOURNAMENTS) {
  let n = 0;
  for (const r of t.ranges) {
    const j = await fetchJSON(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${r}`);
    for (const e of j.events || []) {
      if (seen.has(e.id)) continue; seen.add(e.id);
      const c = e.competitions?.[0]; const comps = c?.competitors || [];
      const home = comps.find((x) => x.homeAway === "home") || comps[0];
      const away = comps.find((x) => x.homeAway === "away") || comps[1];
      if (!isReal(home) || !isReal(away)) continue; // historical tournaments have no TBD
      const note = c?.notes?.[0]?.headline || "";
      const knockout = /round of|final|quarter|semi|third place|play-?off/i.test(note);
      matches.push({
        espn: String(e.id), date: (e.date || "").slice(0, 10), year: t.year, host: t.host,
        venue: c?.venue?.fullName || null, venueEspn: c?.venue?.id ? `fifa:${c.venue.id}` : null,
        venueCity: c?.venue?.address?.city || "", venueCountry: c?.venue?.address?.country || t.host,
        home: { name: home.team.displayName, abbr: home.team.abbreviation, espn: String(home.team.id) },
        away: { name: away.team.displayName, abbr: away.team.abbreviation, espn: String(away.team.id) },
        hs: home?.score != null ? Number(home.score) : null,
        as: away?.score != null ? Number(away.score) : null,
        stage: note || (knockout ? "Knockout" : "Group Stage"), knockout,
      });
      n++;
    }
  }
  console.log(`  ${t.year}: ${n} matches`);
}
console.log(`${matches.length} total matches`);

if (!DRY) {
  const [{ id: leagueId } = {}] = await runSQL(`select id from leagues where slug='fifa.world'`);
  if (!leagueId) { console.error("fifa.world league missing"); process.exit(1); }

  // Preload existing teams (espn stored as fifa:<id>), venues, and event ids.
  const teamRows = await runSQL(`select id, external_ids->>'espn' as espn from teams where league_id=${q(leagueId)} and external_ids ? 'espn'`);
  const teamByEspn = new Map(teamRows.map((t) => [t.espn, t.id])); // key: "fifa:<id>"
  const venueRows = await runSQL(`select id, name, external_ids->>'espn' as espn from venues`);
  const venueByEspn = new Map(); const venueByName = new Map();
  for (const v of venueRows) { if (v.espn) venueByEspn.set(v.espn, v.id); const nn = normName(v.name); if (!venueByName.has(nn)) venueByName.set(nn, v.id); }
  const evRows = await runSQL(`select external_ids->>'espn' as espn from events where league_id=${q(leagueId)} and external_ids ? 'espn'`);
  const haveEspn = new Set(evRows.map((e) => e.espn));

  // New teams (from match data) not already present.
  const newTeams = new Map();
  for (const m of matches) for (const t of [m.home, m.away]) {
    const key = `fifa:${t.espn}`;
    if (!teamByEspn.has(key) && !newTeams.has(key)) newTeams.set(key, t);
  }
  if (newTeams.size) {
    const values = [...newTeams.entries()].map(([key, t]) =>
      `(${q(leagueId)},${q(t.name)},${q(t.name)},${q((t.abbr || t.name.slice(0, 3)).toUpperCase())},${q(t.name)},true,jsonb_build_object('espn',${q(key)}))`).join(",\n");
    const rows = await runSQL(`insert into teams (league_id,name,short_name,abbreviation,city,is_active,external_ids) values\n${values} on conflict (league_id,((external_ids->>'espn'))) where (external_ids ? 'espn') do update set name=excluded.name returning id, external_ids->>'espn' as espn;`);
    for (const r of rows) teamByEspn.set(r.espn, r.id);
  }
  console.log(`teams: +${newTeams.size} new`);

  // New venues (auto-created by name/espn).
  const newVenues = new Map();
  for (const m of matches) {
    if (!m.venue) continue;
    const existing = venueByName.get(normName(m.venue)) || (m.venueEspn && venueByEspn.get(m.venueEspn));
    if (!existing && m.venueEspn && !newVenues.has(m.venueEspn)) newVenues.set(m.venueEspn, m);
  }
  if (newVenues.size) {
    const values = [...newVenues.entries()].map(([espn, m]) =>
      `(${q(m.venue)},${q(m.venueCity)},${q(m.venueCountry)},'active',jsonb_build_object('espn',${q(espn)}))`).join(",\n");
    const rows = await runSQL(`insert into venues (name,city,country,status,external_ids) values\n${values} on conflict ((external_ids->>'espn')) where (external_ids ? 'espn') do update set external_ids=venues.external_ids returning id, external_ids->>'espn' as espn;`);
    for (const r of rows) venueByEspn.set(r.espn, r.id);
  }
  console.log(`venues: +${newVenues.size} new`);

  // Insert events (dedup by espn).
  const ready = matches.filter((m) => !haveEspn.has(m.espn)).map((m) => ({
    ...m, venueId: (m.venue && venueByName.get(normName(m.venue))) || (m.venueEspn && venueByEspn.get(m.venueEspn)) || null,
    homeId: teamByEspn.get(`fifa:${m.home.espn}`), awayId: teamByEspn.get(`fifa:${m.away.espn}`),
  })).filter((m) => m.venueId && m.homeId && m.awayId);

  let inserted = 0;
  for (let i = 0; i < ready.length; i += 200) {
    const batch = ready.slice(i, i + 200);
    const values = batch.map((m) =>
      `(${q(leagueId)},${q(m.venueId)},${q(m.date)},'match',${m.year},${m.knockout},false,${q(m.homeId)},${q(m.awayId)},${m.hs == null ? "null" : m.hs},${m.as == null ? "null" : m.as},${Number.isFinite(m.hs) && m.hs === m.as},null,${q(m.stage)},jsonb_build_object('espn',${q(m.espn)}))`).join(",\n");
    await runSQL(`insert into events (league_id,venue_id,event_date,event_template,season,is_postseason,is_preseason,home_team_id,away_team_id,home_score,away_score,is_draw,tournament_name,round_or_stage,external_ids) values\n${values};`);
    inserted += batch.length;
  }
  console.log(`[fifa.world] inserted ${inserted} historical matches`);
}
console.log(DRY ? "DRY RUN — nothing written." : "Done.");
