#!/usr/bin/env node
/**
 * seed-all-star-events.mjs — backfills all-star / exhibition events (2002+).
 *
 * Scope: MLB / NBA / NHL / NFL (Pro Bowl) / MLS All-Star games, plus the
 * curated skills competitions (Home Run Derby, Slam Dunk, 3-Point Contest).
 *
 * Why dedicated: these don't fit the league+season pipeline — they use
 * throwaway "teams" (American All-Stars, Team Shaq, AFC/NFC), and the skills
 * comps aren't in ESPN's scoreboard at all. So we model every all-star game
 * as a neutral, tournament-style event (event_template 'field', no FK teams,
 * a clean tournament_name) under its existing league, and DERIVE the skills
 * comps from each game's anchor (same venue, the day before).
 *
 * Sources / quirks:
 *  - NBA/NHL/NFL/MLS: scoreboard date ranges around the break, filtered by
 *    /all[- ]star|pro bowl/ on name+note+competitors (excludes the regular
 *    games in those same weeks).
 *  - MLB: the July range hits ESPN's 100-row cap, so we pull single dates
 *    Jul 7–16 instead.
 *  - Missing venues (some older NBA/NHL years) come from the event summary
 *    endpoint, then a curated host map; renamed buildings map to our existing
 *    venue rows so we never duplicate (Daikin→Minute Maid, Lenovo→PNC, …).
 *  - ESPN mistags the 2003 MLB ASG (it was at the White Sox park, not the
 *    demolished Atlanta-Fulton); 2020 MLS ASG was COVID-canceled (dropped).
 *    Only Moscone Center (2026 Pro Bowl) is genuinely new.
 *
 * Idempotent (keyed on external_ids.espn / synthetic skills keys).
 * Usage: SUPA_MGMT_TOKEN=... node scripts/data/seed-all-star-events.mjs [--dry-run]
 */

import { randomUUID } from "crypto";

const TOKEN = process.env.SUPA_MGMT_TOKEN;
const PROJECT = process.env.SUPA_PROJECT_REF || "hsntmacdhuprmtsuxhsq";
const DRY = process.argv.includes("--dry-run");
if (!TOKEN && !DRY) { console.error("Set SUPA_MGMT_TOKEN."); process.exit(2); }
const UA = "Mozilla/5.0 BoxdSeats/1.0 (noreply@boxdseats.com)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const q = (s) => (s == null ? "null" : "'" + String(s).replace(/'/g, "''") + "'");
const espn = (path, qs) => fetch(`https://site.api.espn.com/apis/site/v2/sports/${path}/${qs}`, { headers: { "User-Agent": UA } }).then((r) => r.json());
async function mgmt(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
    method: "POST", headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" }, body: JSON.stringify({ query }),
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}

const WINDOWS = [
  { slug: "nba", path: "basketball/nba", md: ["0210", "0225"] },
  { slug: "nhl", path: "hockey/nhl", md: ["0120", "0205"] },
  { slug: "nfl", path: "football/nfl", md: ["0124", "0212"] },
  { slug: "mls", path: "soccer/usa.1", md: ["0720", "0810"] },
];
const RE = /all[- ]star|pro bowl/i;
const LABEL = { mlb: "MLB All-Star Game", nba: "NBA All-Star Game", nhl: "NHL All-Star Game", nfl: "Pro Bowl", mls: "MLS All-Star Game" };
const RENAME = {
  "Daikin Park": "Minute Maid Park", "Toyota Center (Houston)": "Toyota Center", "crypto.com Arena": "Crypto.com Arena",
  "Rocket Arena": "Rocket Mortgage FieldHouse", "Marlins Park": "loanDepot Park", "Miller Park": "American Family Field",
  "Lenovo Center": "PNC Arena", "Mortgage Matchup Center": "Footprint Center", "Inter&Co Stadium": "Exploria Stadium",
  "ScottsMiracle-Gro Field": "Lower.com Field",
};
const CURATED = {
  "nba|2010": "AT&T Stadium", "nhl|2015": "Nationwide Arena", "nhl|2016": "Bridgestone Arena", "nhl|2017": "Crypto.com Arena",
  "nhl|2018": "Amalie Arena", "nhl|2019": "SAP Center", "nhl|2020": "Enterprise Center", "nfl|2009": "Aloha Stadium",
  "nfl|2014": "Aloha Stadium", "mlb|2003": "Guaranteed Rate Field",
};
const MOSCONE = { id: randomUUID(), name: "Moscone Center", city: "San Francisco", lat: 37.7841, lng: -122.4011 };

async function gather() {
  const out = [];
  for (const lg of WINDOWS) {
    for (let y = 2002; y <= 2026; y++) {
      let j; try { j = await espn(lg.path, `scoreboard?dates=${y}${lg.md[0]}-${y}${lg.md[1]}`); } catch { continue; }
      for (const e of j.events || []) {
        const c = e.competitions?.[0]; const note = c?.notes?.[0]?.headline || "";
        const names = (c?.competitors || []).map((x) => x.team?.displayName || "").join(" ");
        if (!RE.test(e.name || "") && !RE.test(note) && !RE.test(names)) continue;
        let venue = c?.venue?.fullName || null;
        if (!venue) { try { venue = (await espn(lg.path, `summary?event=${e.id}`))?.gameInfo?.venue?.fullName || null; } catch {} await sleep(120); }
        out.push({ slug: lg.slug, year: y, date: (e.date || "").slice(0, 10), note, espn: e.id, venue });
      }
      await sleep(60);
    }
  }
  // MLB: single dates (July range exceeds ESPN's 100-row cap)
  for (let y = 2002; y <= 2026; y++) {
    for (let d = 7; d <= 16; d++) {
      let j; try { j = await espn("baseball/mlb", `scoreboard?dates=${y}07${String(d).padStart(2, "0")}`); } catch { continue; }
      for (const e of j.events || []) {
        const c = e.competitions?.[0]; const note = c?.notes?.[0]?.headline || "";
        if (!RE.test(e.name || "") && !RE.test(note)) continue;
        out.push({ slug: "mlb", year: y, date: (e.date || "").slice(0, 10), note, espn: e.id, venue: c?.venue?.fullName || null });
      }
      await sleep(40);
    }
  }
  return out.filter((e) => !(e.slug === "mls" && e.year === 2020)); // canceled
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
const tname = (e) => { let t = LABEL[e.slug]; const m = /(semifinal|final|championship)/i.exec(e.note || ""); return m && e.slug !== "nfl" ? `${t} — ${cap(m[1])}` : t; };
const venueName = (e) => CURATED[`${e.slug}|${e.year}`] || RENAME[e.venue] || e.venue;
const dayBefore = (d) => { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() - 1); return x.toISOString().slice(0, 10); };

async function main() {
  const events = await gather();
  console.log(`gathered ${events.length} all-star games.`);

  const leagues = (await mgmt(`select slug,id from leagues where slug in ('mlb','nba','nhl','nfl','mls')`)).body;
  const LID = Object.fromEntries(leagues.map((r) => [r.slug, r.id]));

  const names = [...new Set(events.map(venueName).filter(Boolean))].filter((n) => n !== MOSCONE.name);
  const vrows = (await mgmt(`select id,name from venues where name = any(array[${names.map(q).join(",")}]::text[])`)).body;
  const vmap = new Map(vrows.map((r) => [r.name, r.id])); vmap.set(MOSCONE.name, MOSCONE.id);
  const unresolved = names.filter((n) => !vmap.has(n));
  if (unresolved.length) { console.error("UNRESOLVED venues:", unresolved); process.exit(1); }

  // All-star games
  const espnIds = events.map((e) => e.espn);
  const gameStmts = [
    `delete from events where external_ids->>'espn' = any(array[${espnIds.map(q).join(",")}]::text[])`,
    `insert into venues (id,name,city,country,status,primary_sport,location,external_ids) values (${q(MOSCONE.id)},${q(MOSCONE.name)},${q(MOSCONE.city)},'US','active','football',ST_SetSRID(ST_MakePoint(${MOSCONE.lng},${MOSCONE.lat}),4326)::geography,'{}'::jsonb) on conflict do nothing`,
    `insert into events (id,league_id,venue_id,event_date,event_template,season,is_postseason,tournament_name,round_or_stage,external_ids) values\n` +
      events.map((e) => `(${q(randomUUID())},${q(LID[e.slug])},${q(vmap.get(venueName(e)))},${q(e.date)},'field',${e.year},${e.slug === "nfl"},${q(tname(e))},${q(e.note || "All-Star")},${q(JSON.stringify({ espn: e.espn }))}::jsonb)`).join(",\n"),
  ];

  // Skills comps derived from anchors (same venue, day before)
  const mlbAnchors = events.filter((e) => e.slug === "mlb");
  const nbaByYear = new Map();
  for (const e of events.filter((e) => e.slug === "nba")) if (!nbaByYear.has(e.year)) nbaByYear.set(e.year, e);
  const skills = [];
  for (const e of mlbAnchors) skills.push({ slug: "mlb", vid: vmap.get(venueName(e)), date: dayBefore(e.date), season: e.year, name: "Home Run Derby", key: { hrderby: String(e.year) } });
  for (const e of nbaByYear.values()) {
    const d = dayBefore(e.date), vid = vmap.get(venueName(e));
    skills.push({ slug: "nba", vid, date: d, season: e.year, name: "Slam Dunk Contest", key: { nbadunk: String(e.year) } });
    skills.push({ slug: "nba", vid, date: d, season: e.year, name: "3-Point Contest", key: { nba3pt: String(e.year) } });
  }
  const skillStmts = [
    `delete from events where ${skills.map((s) => `external_ids = '${JSON.stringify(s.key)}'::jsonb`).join(" or ")}`,
    `insert into events (id,league_id,venue_id,event_date,event_template,season,is_postseason,tournament_name,round_or_stage,external_ids) values\n` +
      skills.map((s) => `(${q(randomUUID())},${q(LID[s.slug])},${q(s.vid)},${q(s.date)},'field',${s.season},false,${q(s.name)},'All-Star',${q(JSON.stringify(s.key))}::jsonb)`).join(",\n"),
  ];

  console.log(`all-star games: ${events.length}, skills comps: ${skills.length}.`);
  if (DRY) { console.log("--dry-run: not applying."); return; }
  for (const [name, stmts] of [["games", gameStmts], ["skills", skillStmts]]) {
    const res = await mgmt(stmts.join(";\n") + ";");
    console.log(`${name}:`, res.status, JSON.stringify(res.body).slice(0, 160));
  }
}

main();
