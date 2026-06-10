# BoxdSeats real-data seeding pipeline

Populates real historical event data (NFL, NBA, MLB, NHL, MLS) from ESPN's
public site APIs into the BoxdSeats database, so users can log real games they
attended. Everything is idempotent and safe to re-run.

## Files

| File | Purpose |
| --- | --- |
| `001-external-ids-migration.sql` | Adds `external_ids jsonb` (+ GIN and uniqueness indexes) to `teams`, `venues`, `events`, `athletes`. Idempotent. |
| `seed-real-data.mjs` | Fetches teams + completed events from ESPN and upserts teams, venues, venue_teams, venue_aliases, events. |
| `validate-data.mjs` | Post-seed data-quality checks. Exit code 1 on hard failures. |

## Running against production (Supabase)

1. Get the connection string from **Supabase Dashboard → Connect**. Use the
   **Direct connection** string, or the **Session pooler** string if your
   network is IPv4-only (the seeder uses long-lived sessions with prepared
   statements — do **not** use the transaction pooler / port 6543).
   It looks like:
   `postgresql://postgres:[PASSWORD]@db.<ref>.supabase.co:5432/postgres`
   (or `postgresql://postgres.<ref>:[PASSWORD]@aws-0-<region>.pooler.supabase.com:5432/postgres` for the session pooler).
2. Apply the migration first:
   ```sh
   psql "$DATABASE_URL" -f scripts/data/001-external-ids-migration.sql
   ```
3. Optionally rehearse with `--dry-run` (runs the full pipeline inside a
   transaction and rolls back; nothing is written):
   ```sh
   DATABASE_URL="postgresql://..." node scripts/data/seed-real-data.mjs --dry-run
   ```
4. Seed (defaults: all 5 leagues, 2023-01-01 → yesterday):
   ```sh
   DATABASE_URL="postgresql://..." node scripts/data/seed-real-data.mjs
   ```
5. Validate:
   ```sh
   DATABASE_URL="postgresql://..." node scripts/data/validate-data.mjs
   ```

### CLI flags

```
--leagues=nfl,nba,mlb,nhl,mls   subset of leagues (default: all five)
--from=YYYY-MM-DD               start date (default 2023-01-01)
--to=YYYY-MM-DD                 end date (default: yesterday)
--dry-run                       run everything, then ROLLBACK
```

## Runtime expectations

- ESPN scoreboards are fetched in 28-day windows (`dates=YYYYMMDD-YYYYMMDD&limit=1000`),
  max 8 requests in flight, with exponential backoff on 429/5xx. The default
  2023→present range is ~45 windows × 5 leagues ≈ 225 HTTP requests.
- Expect roughly **6,000–7,000 events per full calendar year** across the five
  leagues (MLB ~2,460, NHL ~1,390, NBA ~1,310, MLS ~520, NFL ~285 per season,
  incl. playoffs). A full 2023→present run inserts ~20,000+ events.
- Against a local DB the whole run takes a few minutes; against Supabase the
  per-row round-trips dominate — budget **30–90 minutes** depending on latency.
  Progress is logged every 200 events per league.
- Re-runs are cheap: events already carrying `external_ids.espn` are skipped.
  To top up with the latest games, just re-run with `--from=<last run date>`.

## How matching / dedupe works

- **Teams**: matched by `external_ids.espn`, then unique abbreviation, then
  normalized name (diacritics/punctuation-insensitive), then an
  order-and-plural-insensitive token match ("Red Bull New York" ⇔
  "New York Red Bulls"). Matched rows get `external_ids.espn` and a
  `logo_url` backfill; genuinely new teams (e.g. San Diego FC) are inserted.
  Defunct/relocated teams that appear only in historical events (e.g. Arizona
  Coyotes) are created lazily from event payloads.
- **Venues**: matched by `external_ids.espn` → exact normalized name (incl.
  `venue_aliases`) → unique substring containment ("Oriole Park at Camden
  Yards" ⊃ "Camden Yards") → a guarded sponsor-rename heuristic (non-neutral
  game, home team has exactly one known home venue, same city, no conflicting
  ESPN id ⇒ e.g. "Daikin Park" maps onto "Minute Maid Park" and the new name
  is stored in `venue_aliases`). Otherwise a new venue row is inserted
  (status `active`, city/state from the ESPN address, full state/province
  names mapped to 2-letter codes). `venues.location` is left NULL — scoreboard
  payloads carry no coordinates.
- **Events**: keyed by `external_ids.espn` per league (skip if present).
  Events without an external id (the original hand-seeded rows) are matched by
  league + local date + home team + away team and **enriched** with the ESPN id
  instead of duplicated. Doubleheaders are handled (distinct ESPN ids ⇒ two
  rows). Only completed games are inserted; preseason and all-star games are
  excluded. `is_postseason` from ESPN season type 3 (or MLS playoff slugs);
  `round_or_stage` from playoff notes/slugs; `is_draw` when scores are level;
  `venue_name_at_time` records the ESPN venue name when it differs from the
  canonical venue name.
- **Dates**: ESPN timestamps are UTC; the stored `event_date` is the local US
  date approximated as UTC−5 (exact for Eastern/Central, correct for
  Mountain/Pacific for any realistic start time).
- **Seasons**: ESPN `season.year` is stored as-is. NFL uses the starting year
  (Jan-2024 playoff games ⇒ season 2023); NBA/NHL use the ending year
  (Nov-2023 games ⇒ season 2024); MLB/MLS use the calendar year.

## Extending

- **More seasons**: just widen the range, e.g.
  `node scripts/data/seed-real-data.mjs --from=2015-01-01 --to=2022-12-31`.
  Older seasons reference relocated franchises (St. Louis Rams, Oakland
  Raiders, …); these are auto-created as new team rows from event payloads —
  review them afterwards (they are listed in the run log and in
  `validate-data.mjs`'s "teams missing external id" section you can adapt).
- **More leagues**: add an entry to `LEAGUES` in `seed-real-data.mjs` with the
  ESPN `sport`/`league` path (e.g. WNBA: `basketball`/`wnba`, college football:
  `football`/`college-football`) and make sure a matching row exists in the
  `leagues` table (the script looks the league up by its BoxdSeats slug, which
  must equal the `LEAGUES` key). Soccer-style competitions need
  `soccer: true` so slug-based season types are classified correctly.
  PGA Tour is **not** covered: it uses the `field` event template
  (tournaments, not home/away matches) and a different ESPN API shape.
- **Other providers**: `external_ids` is a jsonb map — add keys alongside
  `espn` (e.g. `{"espn": "401581097", "statsapi": "748266"}`) without schema
  changes.

## Validation

`validate-data.mjs` hard-fails (exit 1) on: cross-league team references,
ESPN-sourced events missing scores, duplicate ESPN ids, un-deduped natural-key
duplicates, and event dates outside 2000-01-01..today. It also prints
per-league/per-season counts and totals for plausibility checks:

```sql
SELECT l.slug, e.season, count(*)
FROM events e JOIN leagues l ON l.id = e.league_id
GROUP BY 1, 2 ORDER BY 1, 2;
```
