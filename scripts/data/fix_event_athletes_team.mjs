#!/usr/bin/env node
/**
 * Backfill: correct event_athletes.team_id rows that were mapped to the wrong
 * team because the original ingest matched ESPN team ids without scoping to the
 * event's league. ESPN reuses numeric team ids across sports (id 10 is both the
 * NY Yankees and the Houston Rockets), so a baseball box score could resolve to
 * an NBA/NFL team.
 *
 * The fix needs no ESPN calls: the wrongly-chosen team shares the same espn id
 * as the correct one (that's why they collided), so we recover the espn id from
 * the current team and re-pick the team with that espn id *in the event's
 * league*.
 *
 * Dry-run by default; pass --live to write. Reads .env.local.
 */
import { readFileSync } from "node:fs";

const LIVE = process.argv.includes("--live");

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);
const BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

const get = async (q) => {
  const r = await fetch(`${BASE}/rest/v1/${q}`, { headers: H });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
};

async function main() {
  console.log(`[fix-team] ${LIVE ? "LIVE" : "DRY RUN"}`);

  // 1) All teams: id -> {leagueId, espn, name}; (leagueId|espn) -> id
  const teamById = new Map();
  const byLeagueEspn = new Map();
  for (let off = 0; ; off += 1000) {
    const rows = await get(`teams?select=id,league_id,name,short_name,external_ids&order=id&limit=1000&offset=${off}`);
    for (const t of rows) {
      const espn = t.external_ids?.espn ? String(t.external_ids.espn) : null;
      teamById.set(t.id, { leagueId: t.league_id, espn, name: t.short_name || t.name });
      if (espn && t.league_id) byLeagueEspn.set(`${t.league_id}|${espn}`, t.id);
    }
    if (rows.length < 1000) break;
  }
  console.log(`[fix-team] loaded ${teamById.size} teams`);

  // 2) event_athletes with a team_id
  const ea = [];
  for (let off = 0; ; off += 1000) {
    const rows = await get(`event_athletes?select=id,event_id,team_id&team_id=not.is.null&order=id&limit=1000&offset=${off}`);
    ea.push(...rows);
    if (rows.length < 1000) break;
  }
  console.log(`[fix-team] ${ea.length} event_athletes rows with a team`);

  // 3) event -> league_id
  const eventLeague = new Map();
  const eventIds = [...new Set(ea.map((r) => r.event_id))];
  for (let i = 0; i < eventIds.length; i += 200) {
    const rows = await get(`events?select=id,league_id&id=in.(${eventIds.slice(i, i + 200).join(",")})`);
    for (const e of rows) eventLeague.set(e.id, e.league_id);
  }

  // 4) Compute corrections
  const updates = [];
  const samples = [];
  let noEspn = 0, noTarget = 0, alreadyOk = 0;
  for (const r of ea) {
    const cur = teamById.get(r.team_id);
    const leagueId = eventLeague.get(r.event_id);
    if (!cur || !cur.espn || !leagueId) { noEspn++; continue; }
    const correct = byLeagueEspn.get(`${leagueId}|${cur.espn}`);
    if (!correct) { noTarget++; continue; }
    if (correct === r.team_id) { alreadyOk++; continue; }
    updates.push({ id: r.id, team_id: correct });
    if (samples.length < 15) {
      samples.push(`  ${cur.name} -> ${teamById.get(correct)?.name} (espn ${cur.espn})`);
    }
  }

  console.log(`[fix-team] already correct: ${alreadyOk}`);
  console.log(`[fix-team] no espn / no league: ${noEspn}`);
  console.log(`[fix-team] no in-league target (left as-is): ${noTarget}`);
  console.log(`[fix-team] TO FIX: ${updates.length}`);
  console.log(samples.join("\n"));

  if (!LIVE) {
    console.log("[fix-team] dry run — pass --live to apply");
    return;
  }

  // 5) Apply, one PATCH per row (PostgREST has no bulk-by-id update).
  let done = 0;
  for (const u of updates) {
    const r = await fetch(`${BASE}/rest/v1/event_athletes?id=eq.${u.id}`, {
      method: "PATCH",
      headers: { ...H, Prefer: "return=minimal" },
      body: JSON.stringify({ team_id: u.team_id }),
    });
    if (!r.ok) { console.error(`fail ${u.id}: ${r.status} ${await r.text()}`); continue; }
    if (++done % 500 === 0) console.log(`[fix-team] ${done}/${updates.length}`);
  }
  console.log(`[fix-team] done: updated ${done} rows`);
}

main().catch((e) => { console.error(e); process.exit(1); });
