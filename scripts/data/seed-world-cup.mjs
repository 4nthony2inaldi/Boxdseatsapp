#!/usr/bin/env node
/**
 * seed-world-cup.mjs — seeds the FIFA World Cup (fifa.world) as a competition.
 *
 * Why a dedicated script: the World Cup doesn't fit the league+season seeder
 * (national teams, single tournament, US/CA/MX host venues that already exist
 * in our DB as NFL/MLS grounds). This pulls the full bracket from ESPN's
 * soccer/fifa.world scoreboard and writes it via the Supabase Management API
 * (direct Postgres is blocked from the sandbox).
 *
 * Behavior:
 *  - Reuses existing US/Canada venues by exact name (so a World Cup match at
 *    Lincoln Financial Field unifies with people's existing venue history);
 *    creates only the Mexican stadiums, hand-geocoded.
 *  - National teams become teams under fifa.world (espn ids namespaced
 *    "fifa:<id>" to avoid colliding with club ids).
 *  - Group matches carry both teams; knockout matches stay as placeholders
 *    (round_or_stage / tournament_name) until the bracket resolves — re-run
 *    to refresh once teams are known. Idempotent (wipes + re-inserts).
 *
 * Scores/teams also stay fresh during the tournament because fifa.world is in
 * the hourly sync (src/app/api/sync-events/route.ts).
 *
 * Usage:  SUPA_MGMT_TOKEN=... node scripts/data/seed-world-cup.mjs [--dry-run]
 */

import { randomUUID } from "crypto";

const TOKEN = process.env.SUPA_MGMT_TOKEN;
const PROJECT = process.env.SUPA_PROJECT_REF || "hsntmacdhuprmtsuxhsq";
const DRY = process.argv.includes("--dry-run");
if (!TOKEN && !DRY) {
  console.error("Set SUPA_MGMT_TOKEN (Supabase Management API token).");
  process.exit(2);
}
const UA = "Mozilla/5.0 BoxdSeats/1.0 (noreply@boxdseats.com)";

// Host venues already in our DB — matched by exact ESPN fullName. Re-run
// `select id,name from venues where name = '<fullName>'` if ESPN renames one.
const EXISTING_VENUES = {
  "AT&T Stadium": "2b886c2d-6894-5536-9b8f-b73c7bef0962",
  "BC Place": "4428d0a2-3f15-53a2-acc1-2788505eca91",
  "BMO Field": "70a8eccc-193c-53b1-ad09-2552adcd1712",
  "GEHA Field at Arrowhead Stadium": "d77f75e2-d8c8-5df9-9a7f-4622debc07fc",
  "Gillette Stadium": "320a42f3-2b6f-5586-b9ed-8675d42d3c97",
  "Hard Rock Stadium": "af5ad933-6aee-56cd-a8cd-6afab45f40e6",
  "Levi's Stadium": "3c3e4ff9-22b4-5058-8055-72077c65a0c6",
  "Lincoln Financial Field": "7f29d8bf-d784-5c99-8170-b84b4669265b",
  "Lumen Field": "a3a840a0-4ae9-587e-955c-db04baef9b4a",
  "Mercedes-Benz Stadium": "a0300c47-0ae2-57a6-ba3f-bf4c15c3f0b6",
  "MetLife Stadium": "29407960-2439-518c-b7a4-c52dc9e50ecd",
  "NRG Stadium": "f9ecebfd-3e49-5739-bdad-18f297e688ee",
  "SoFi Stadium": "eb745c80-f25a-5cca-9183-8cd5fe24de6c",
};
const NEW_VENUES = {
  "Estadio Akron": { city: "Guadalajara", lat: 20.6817, lng: -103.4625 },
  "Estadio BBVA": { city: "Guadalupe", lat: 25.6692, lng: -100.2447 },
  "Estadio Banorte": { city: "Mexico City", lat: 19.3029, lng: -99.1505 },
};
for (const v of Object.values(NEW_VENUES)) v.id = randomUUID();

const RANGES = ["20260601-20260620", "20260621-20260710", "20260711-20260720"];
const q = (s) => (s == null ? "null" : "'" + String(s).replace(/'/g, "''") + "'");
const isReal = (t) => {
  const n = t?.team?.displayName || "";
  return n && !/winner|runner|tbd|place|group [a-l]\b|round of|third|seed|loser|\d/i.test(n);
};

async function main() {
  const seen = new Set();
  const events = [];
  for (const r of RANGES) {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${r}`,
      { headers: { "User-Agent": UA } }
    );
    const j = await res.json();
    for (const e of j.events || []) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      const c = e.competitions?.[0];
      const comps = c?.competitors || [];
      const home = comps.find((x) => x.homeAway === "home") || comps[0];
      const away = comps.find((x) => x.homeAway === "away") || comps[1];
      events.push({
        espn: e.id,
        date: (e.date || "").slice(0, 10),
        venue: c?.venue?.fullName || null,
        note: c?.notes?.[0]?.headline || "",
        home: isReal(home) ? { name: home.team.displayName, abbr: home.team.abbreviation, espn: home.team.id } : null,
        away: isReal(away) ? { name: away.team.displayName, abbr: away.team.abbreviation, espn: away.team.id } : null,
        hs: home?.score != null ? Number(home.score) : null,
        as: away?.score != null ? Number(away.score) : null,
      });
    }
  }

  const teamMap = new Map();
  for (const ev of events)
    for (const t of [ev.home, ev.away])
      if (t && !teamMap.has(t.espn)) teamMap.set(t.espn, { ...t, id: randomUUID() });

  const vid = (name) => EXISTING_VENUES[name] || NEW_VENUES[name]?.id || null;
  const unmapped = [...new Set(events.map((e) => e.venue).filter((v) => v && !vid(v)))];
  if (unmapped.length) {
    console.error("Unmapped venues (add to EXISTING_VENUES or NEW_VENUES):", unmapped);
    process.exit(1);
  }

  const LID = randomUUID();
  const stmts = [];
  stmts.push(`delete from events where league_id=(select id from leagues where slug='fifa.world')`);
  stmts.push(`delete from teams where league_id=(select id from leagues where slug='fifa.world')`);
  stmts.push(`delete from leagues where slug='fifa.world'`);
  stmts.push(
    `insert into leagues (id,name,slug,sport,event_template,country,display_order,is_active) values (${q(LID)},'FIFA World Cup','fifa.world','soccer','match','World',7,true)`
  );
  stmts.push(
    `insert into venues (id,name,city,country,status,primary_sport,location,external_ids) values\n` +
      Object.entries(NEW_VENUES)
        .map(
          ([name, v]) =>
            `(${q(v.id)},${q(name)},${q(v.city)},'MX','active','soccer',ST_SetSRID(ST_MakePoint(${v.lng},${v.lat}),4326)::geography,'{}'::jsonb)`
        )
        .join(",\n")
  );
  stmts.push(
    `insert into teams (id,league_id,name,short_name,abbreviation,city,is_active,external_ids) values\n` +
      [...teamMap.values()]
        .map(
          (t) =>
            `(${q(t.id)},${q(LID)},${q(t.name)},${q(t.name)},${q(t.abbr || t.name.slice(0, 3).toUpperCase())},${q(t.name)},true,${q(JSON.stringify({ espn: "fifa:" + t.espn }))}::jsonb)`
        )
        .join(",\n")
  );
  const byEspn = new Map([...teamMap.values()].map((t) => [t.espn, t.id]));
  stmts.push(
    `insert into events (id,league_id,venue_id,event_date,event_template,season,is_postseason,home_team_id,away_team_id,home_score,away_score,tournament_name,round_or_stage,external_ids) values\n` +
      events
        .map((e) => {
          const knockout = /round of|final|quarter|semi|third place|play-?off/i.test(e.note) || !(e.home && e.away);
          const stage = e.note || (knockout ? "Knockout" : "Group Stage");
          const tname = e.home && e.away ? null : "World Cup " + stage;
          const hid = e.home ? byEspn.get(e.home.espn) : null;
          const aid = e.away ? byEspn.get(e.away.espn) : null;
          return `(${q(randomUUID())},${q(LID)},${q(vid(e.venue))},${q(e.date)},'match',2026,${knockout},${q(hid)},${q(aid)},${e.hs == null ? "null" : e.hs},${e.as == null ? "null" : e.as},${q(tname)},${q(stage)},${q(JSON.stringify({ espn: e.espn }))}::jsonb)`;
        })
        .join(",\n")
  );

  console.log(`World Cup: ${events.length} matches, ${teamMap.size} teams, ${Object.keys(NEW_VENUES).length} new venues.`);
  if (DRY) {
    console.log("--dry-run: not applying.");
    return;
  }
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
    method: "POST",
    headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({ query: stmts.join(";\n") + ";" }),
  });
  console.log("apply:", res.status, (await res.text()).slice(0, 300));
}

main();
