#!/usr/bin/env node
/**
 * seed-venue-images.mjs — populates venues.photo_url from Wikipedia.
 *
 * For each venue without an image, asks the Wikipedia API for the page's
 * infobox image (prop=pageimages&piprop=original): exact title first, then a
 * full-text search of "{name} {city}". URLs point at upload.wikimedia.org
 * (Wikimedia Commons / Wikipedia media); most stadium photos there are
 * CC-licensed or public domain — if the app ever surfaces image credits,
 * the source page is derivable from the URL.
 *
 * Skips SVG and filenames that look like logos/maps/seals (infobox images on
 * some pages are crests rather than photographs).
 *
 * Usage: DATABASE_URL=... node scripts/data/seed-venue-images.mjs [--force]
 * Idempotent: venues that already have photo_url are skipped unless --force.
 */
import pg from "pg";

const DB_URL = process.env.DATABASE_URL || "postgres://boxd:boxd@localhost:5432/boxdseats";
const FORCE = process.argv.includes("--force");
const UA = "BoxdSeats/1.0 (venue image seeder; contact: admin@boxdseats.com)";

const db = new pg.Client(DB_URL);
await db.connect();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const BAD_FILE_RE = /\.svg$|logo|seal|crest|coat[_ ]of[_ ]arms|location[_ ]?map|locator/i;

async function wikiQuery(params) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=original&redirects=1&${params}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15000) });
      if (res.status === 429 || res.status >= 500) { await sleep(2000 * (attempt + 1)); continue; }
      if (!res.ok) return null;
      return await res.json();
    } catch { await sleep(1500 * (attempt + 1)); }
  }
  return null;
}

function extractImage(payload) {
  const pages = payload?.query?.pages;
  if (!pages) return null;
  for (const p of Object.values(pages)) {
    const src = p?.original?.source;
    if (src && !BAD_FILE_RE.test(src)) return src;
  }
  return null;
}

async function findImage(name, city) {
  // 1. exact page title
  let img = extractImage(await wikiQuery(`titles=${encodeURIComponent(name)}`));
  if (img) return img;
  // 2. full-text search with city for disambiguation
  img = extractImage(await wikiQuery(
    `generator=search&gsrlimit=1&gsrsearch=${encodeURIComponent(`${name} ${city ?? ""}`)}`));
  return img;
}

const { rows: venues } = await db.query(
  FORCE
    ? "SELECT id, name, city FROM venues ORDER BY name"
    : "SELECT id, name, city FROM venues WHERE photo_url IS NULL ORDER BY name"
);
console.log(`venues to process: ${venues.length}`);

let found = 0, missed = 0;
for (const [i, v] of venues.entries()) {
  const img = await findImage(v.name, v.city);
  if (img) {
    await db.query("UPDATE venues SET photo_url=$1 WHERE id=$2", [img, v.id]);
    found++;
  } else {
    missed++;
  }
  if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${venues.length} — found=${found} missed=${missed}`);
  await sleep(120);
}
console.log(`done: found=${found} missed=${missed} (coverage ${(100 * found / Math.max(1, venues.length)).toFixed(0)}%)`);
await db.end();
