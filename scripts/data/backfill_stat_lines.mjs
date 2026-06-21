#!/usr/bin/env node
/**
 * Backfill event_athletes.stat_line for team-sport events ingested before the
 * box-score ingest started capturing stat lines. Re-fetches each event's ESPN
 * box score, parses the per-category stat line per athlete (mirrors
 * src/lib/ingest/boxScore.ts parseTeam), and writes it to the matching rows.
 *
 * Idempotent: only touches rows where stat_line is null. Polite to ESPN.
 * Usage:  node scripts/data/backfill_stat_lines.mjs [--dry-run] [--limit=N]
 */
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const BASE = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const DRY = process.argv.includes("--dry-run");
const limArg = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = limArg ? parseInt(limArg.slice(8), 10) : Infinity;
const UA = "BoxdSeats/1.0 (arinaldi@yext.com)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const TEAM_PATH = {
  mlb: "baseball/mlb", nba: "basketball/nba", wnba: "basketball/wnba",
  ncaam: "basketball/mens-college-basketball", nhl: "hockey/nhl",
  nfl: "football/nfl", ncaaf: "football/college-football",
};
const arr = (v) => (Array.isArray(v) ? v : []);
const get = async (q) => (await fetch(`${BASE}/rest/v1/${q}`, { headers: H })).json();

async function espn(url) {
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

// Mirrors boxScore.ts parseTeam: espnAthleteId -> { category: { label: value } }.
function parseStatLines(d) {
  const out = new Map();
  for (const t of arr(d?.boxscore?.players)) {
    for (const cat of arr(t?.statistics)) {
      const labels = (arr(cat?.labels).length ? arr(cat?.labels) : arr(cat?.names)).map((x) => String(x));
      const catName = String(cat?.name || cat?.type || "stats");
      for (const a of arr(cat?.athletes)) {
        const id = a?.athlete?.id ? String(a.athlete.id) : null;
        if (!id) continue;
        const vals = arr(a?.stats);
        if (!labels.length || !vals.length) continue;
        const row = {};
        for (let i = 0; i < labels.length; i++) {
          const v = vals[i];
          if (v !== undefined && v !== null && v !== "") row[labels[i]] = String(v);
        }
        if (Object.keys(row).length) {
          const cur = out.get(id) || {};
          cur[catName] = row;
          out.set(id, cur);
        }
      }
    }
  }
  return out;
}

async function main() {
  console.log(`[stat-backfill] ${DRY ? "DRY RUN" : "LIVE"}`);

  // Distinct events that still have un-backfilled team-sport rows.
  const eventIds = new Set();
  for (let off = 0; ; off += 1000) {
    const rows = await get(`event_athletes?select=event_id&stat_line=is.null&team_id=not.is.null&order=event_id&limit=1000&offset=${off}`);
    for (const r of rows) eventIds.add(r.event_id);
    if (rows.length < 1000) break;
  }
  let events = [...eventIds];
  console.log(`[stat-backfill] events needing backfill: ${events.length}`);
  if (LIMIT < events.length) events = events.slice(0, LIMIT);

  let done = 0, updated = 0, skipped = 0;
  for (const eventId of events) {
    done++;
    const ev = (await get(`events?select=external_ids,leagues(slug)&id=eq.${eventId}`))[0];
    const slug = ev?.leagues?.slug;
    const espnId = ev?.external_ids?.espn;
    const path = slug && TEAM_PATH[slug];
    if (!path || !espnId) { skipped++; continue; }

    const d = await espn(`https://site.api.espn.com/apis/site/v2/sports/${path}/summary?event=${espnId}`);
    await sleep(250);
    const lines = d ? parseStatLines(d) : new Map();
    if (lines.size === 0) { skipped++; continue; }

    // Our athlete rows for this event + their espn ids.
    const eaRows = await get(`event_athletes?select=id,athlete_id&event_id=eq.${eventId}&stat_line=is.null`);
    const athleteIds = [...new Set(eaRows.map((r) => r.athlete_id).filter(Boolean))];
    const espnByAthlete = new Map();
    for (let i = 0; i < athleteIds.length; i += 80) {
      const aths = await get(`athletes?select=id,external_ids&id=in.(${athleteIds.slice(i, i + 80).join(",")})`);
      for (const a of aths) { const e = a.external_ids?.espn; if (e) espnByAthlete.set(a.id, String(e)); }
    }

    const updates = [];
    for (const r of eaRows) {
      const espnAid = espnByAthlete.get(r.athlete_id);
      const sl = espnAid ? lines.get(espnAid) : null;
      if (sl) updates.push({ id: r.id, stat_line: sl });
    }
    if (DRY) {
      if (done <= 3) console.log(`  ${eventId} (${slug}): ${updates.length}/${eaRows.length} matched. sample:`, JSON.stringify(updates[0]?.stat_line)?.slice(0, 160));
    } else {
      // One PATCH per row (jsonb differs per athlete); modest concurrency.
      for (let i = 0; i < updates.length; i += 10) {
        await Promise.all(updates.slice(i, i + 10).map((u) =>
          // stat_line is a text column; store the line as JSON.
          fetch(`${BASE}/rest/v1/event_athletes?id=eq.${u.id}`, { method: "PATCH", headers: { ...H, Prefer: "return=minimal" }, body: JSON.stringify({ stat_line: JSON.stringify(u.stat_line) }) })
        ));
      }
    }
    updated += updates.length;
    if (done % 25 === 0) console.log(`[stat-backfill] ${done}/${events.length} events — rows updated=${updated} skipped-events=${skipped}`);
  }
  console.log(`\n[stat-backfill] done. events=${done} rows updated=${updated} skipped-events=${skipped}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
