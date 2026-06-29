#!/usr/bin/env node
/**
 * sync-venues-geo.mjs — regenerate public/venues-geo.json from the DB.
 *
 * venues-geo.json is the on-device photo-finder match file: [id, lat, lng,
 * radius?]. The client reads ONLY this file, so a venue with coordinates in the
 * DB still can't match photos until it has an entry here.
 *
 * This is APPEND-ONLY by design: every existing entry is preserved byte-for-byte
 * (coords + any hand-tuned radius), and venues that have coordinates in the DB
 * but no entry yet are added. That makes the diff easy to review and can't
 * regress an existing venue's tuned radius. To force a full re-derive of a
 * specific venue, delete its line first and re-run.
 *
 * Radius by sport mirrors the documented defaults (CLAUDE.md): tight 175m
 * default for dense arenas (basketball/hockey — emitted as no radius), wider for
 * stadiums and sprawling field venues.
 *
 * Usage:  DATABASE_URL=... node scripts/data/sync-venues-geo.mjs [--dry-run]
 */
import pg from "pg";
import { readFileSync, writeFileSync } from "node:fs";

const { Client } = pg;
const FILE = "public/venues-geo.json";
const dryRun = process.argv.includes("--dry-run");

// primary_sport -> match radius (meters). Omitted sports fall back to the
// client's 175m default (kept tight for dense-city arenas).
const RADIUS_BY_SPORT = {
  golf: 1500,
  tennis: 600,
  motorsports: 2000,
  horse_racing: 1500,
  football: 300,
  soccer: 300,
  baseball: 300,
};

const round5 = (n) => Math.round(n * 1e5) / 1e5;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(2);
}

const existing = JSON.parse(readFileSync(FILE, "utf8"));
const byId = new Map(existing.map((e) => [e[0], e]));

const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const { rows } = await db.query(
  `select id, primary_sport,
          extensions.ST_Y(location::extensions.geometry) as lat,
          extensions.ST_X(location::extensions.geometry) as lng
     from venues
    where status = 'active' and location is not null`
);
await db.end();

let added = 0;
for (const r of rows) {
  if (byId.has(r.id)) continue; // append-only: never touch an existing entry
  const lat = Number(r.lat);
  const lng = Number(r.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
  const radius = RADIUS_BY_SPORT[r.primary_sport];
  byId.set(
    r.id,
    radius ? [r.id, round5(lat), round5(lng), radius] : [r.id, round5(lat), round5(lng)]
  );
  added++;
}

// Stable id-sorted order (the existing file is already id-sorted) so additions
// slot in place and the diff is purely new lines.
const out = [...byId.values()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

console.log(`venues-geo: ${existing.length} -> ${out.length} (+${added} added)`);
if (dryRun) {
  console.log("(dry run — not writing)");
} else if (added > 0) {
  writeFileSync(FILE, JSON.stringify(out));
  console.log(`wrote ${FILE}`);
} else {
  console.log("no new venues — file unchanged");
}
