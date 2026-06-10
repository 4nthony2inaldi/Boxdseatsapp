# BoxdSeats real-data seeding pipeline

Populates real historical event data from ESPN's public site APIs into the
BoxdSeats database, so users can log real games they attended:

- **Match leagues** (NFL, NBA, MLB, NHL, MLS) via `seed-real-data.mjs`
- **Field leagues** (PGA Tour, ATP, WTA, NASCAR Cup, IndyCar, F1) via
  `seed-field-events.mjs`
- **Athletes** (rosters + notable golf/tennis/racing names) via
  `seed-athletes.mjs`

Everything is idempotent and safe to re-run.

## Files

| File | Purpose |
| --- | --- |
| `001-external-ids-migration.sql` | Adds `external_ids jsonb` (+ GIN and uniqueness indexes) to `teams`, `venues`, `events`, `athletes`. Idempotent. |
| `seed-real-data.mjs` | Fetches teams + completed events for the five match leagues and upserts teams, venues, venue_teams, venue_aliases, events. |
| `seed-field-events.mjs` | Creates the field leagues (atp, wta, nascar-cup, indycar, f1) and seeds golf/tennis tournament day-rows and races; also repairs the original hand-seeded PGA events. |
| `seed-athletes.mjs` | Populates the athletes table from team rosters, tennis rankings, golf major fields and racing grids (adds the `uq_athletes_espn_id` unique index if missing). |
| `validate-data.mjs` | Post-seed data-quality checks (match + field events + athletes). Exit code 1 on hard failures. |

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
5. Seed field leagues + athletes:
   ```sh
   DATABASE_URL="postgresql://..." node scripts/data/seed-field-events.mjs
   DATABASE_URL="postgresql://..." node scripts/data/seed-athletes.mjs
   ```
6. Validate:
   ```sh
   DATABASE_URL="postgresql://..." node scripts/data/validate-data.mjs
   ```

### CLI flags

`seed-real-data.mjs`:
```
--leagues=nfl,nba,mlb,nhl,mls   subset of leagues (default: all five)
--from=YYYY-MM-DD               start date (default 2023-01-01)
--to=YYYY-MM-DD                 end date (default: yesterday)
--dry-run                       run everything, then ROLLBACK
```

`seed-field-events.mjs`:
```
--leagues=pga,atp,wta,nascar,indycar,f1   subset (default: all six)
--from=YYYY-MM-DD                         start date (default 2023-01-01)
--to=YYYY-MM-DD                           end date (default: yesterday)
--dry-run                                 run everything, then ROLLBACK
```

`seed-athletes.mjs`:
```
--sports=teams,golf,tennis,racing   subset of sources (default: all)
--dry-run                           run everything, then ROLLBACK
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

## Field events (seed-field-events.mjs)

Creates any missing field leagues (`atp`, `wta`, `nascar-cup`, `indycar`,
`f1`; `pga-tour` already exists) and seeds completed events only:

- **Golf (PGA)** — scoreboard tournaments are expanded into **one events row
  per day** (`date` → `endDate`, usually 4 days; >8-day oddities skipped).
  Day rows share a generated `tournament_id`, get `day_number` 1..N and
  `round_or_stage` "Round N"/"Final Round", and all carry `winner_name`.
  Venue + winner come from the per-event leaderboard endpoint
  (`golf/leaderboard?league=pga&event=<id>`); the scoreboard has neither.
  FedEx playoff events (St. Jude/BMW/TOUR Championship) ⇒ `is_postseason`.
- **Tennis (ATP/WTA)** — one row per day, capped at the **last 15 days** of
  the span (ESPN spans include qualifying; capping from the end keeps the
  final on the real final day). `round_or_stage` "Day N", last day "Final".
  `winner_name` = singles champion from the last completed singles match.
  ESPN only exposes "City, Country" for tennis, so the four majors map to
  curated real venues (Melbourne Park, Stade Roland Garros, All England Lawn
  Tennis Club, USTA BJK National Tennis Center; the 2024 Olympics event also
  maps to Roland Garros) and other tournaments get a "<Tournament> Site"
  venue in the host city.
- **Racing (NASCAR Cup/IndyCar/F1)** — single-day rows, `winner_name` = race
  winner, no tournament_id/day_number. F1 uses the weekend's "Race"
  competition for date/winner and the scoreboard `circuit` for the venue
  (with curated address fixes; ESPN retro-reports 2023-25 Spanish GPs at
  "Madring", corrected to Circuit de Catalunya). NASCAR venues come from the
  core API per event (stale names like "Lowe's Motor Speedway" are renamed,
  and Iowa/Mexico City/North Wilkesboro — which have no core venue — are
  curated). IndyCar has **no venue data anywhere in ESPN's API**, so circuits
  come from a curated race-name map. NASCAR exhibitions (Clash/Duels/All-Star)
  are excluded ⇒ exactly 36 points races per season.
- **event_tags** (exact strings, they power badge lists): golf majors get
  `['masters'|'pga_championship'|'us_open'|'open_championship', 'pga_major']`
  on every day row; slams get
  `['grand_slam_<australian_open|french_open|wimbledon|us_open>', 'grand_slam']`.
- **external_ids**: `{"espn": "<eventId>-d<dayNumber>"}` per day row, plain
  event id for races. Re-runs skip existing ids; partially-seeded tournaments
  are topped up reusing the existing `tournament_id`. Venue external ids for
  golf courses / circuits are **namespaced** (`golf:21`, `nascar:21`,
  `f1:4243`) because ESPN's per-sport venue id spaces collide with the
  stadium ids stored by `seed-real-data.mjs`.
- **PGA hand-seed repair**: pre-existing `pga-tour` rows without an ESPN id
  are matched by year-stripped tournament-name + season and **updated in
  place** to become the final-day row (fixing the wrong hand-seeded venues —
  e.g. 2025 U.S. Open Pebble Beach → Oakmont, Open Championship Pinehurst →
  Royal Portrush, PGA Championship Valhalla → Quail Hollow, TOUR Championship
  TPC Sawgrass → East Lake — plus dates/winners/tags) so existing event_logs
  keep pointing at the right row. Unmatched hand rows inside the seeded window
  are deleted when nothing references them, otherwise left and reported.
- ESPN's scoreboard range filter can drop events sitting exactly on a window
  boundary, so fetch windows overlap by a day on each side (id-dedupe absorbs
  the overlap).

Expected volumes per full year: PGA ~48-51 tournaments (~190-200 day rows),
ATP ~60-70 tournaments (~600-700 day rows), WTA ~95-105 (~880-990 day rows,
includes WTA 125s), NASCAR exactly 36 races, IndyCar 17-18, F1 22-24.

## Athletes (seed-athletes.mjs)

- **Team sports**: every roster of every team carrying `external_ids.espn`
  (NFL ~2,900, NHL ~960, MLS ~930, MLB ~780, NBA ~540). Handles both grouped
  (NFL/NHL/MLB) and flat (NBA/MLS) roster payload shapes.
- **Tennis**: ATP + WTA top-150 from the rankings endpoint.
- **Golf**: union of the fields of recent marquee tournaments (majors,
  PLAYERS, TOUR Championship over the last ~18 months — ESPN's golf rankings
  endpoint 500s) ⇒ ~370 players incl. LIV players who entered majors.
- **Racing**: every driver who started a NASCAR Cup/IndyCar/F1 race in the
  last ~18 months ⇒ ~140 drivers.
- Existing athletes are matched by sport + normalized name and enriched with
  `external_ids.espn` + headshot; re-runs skip on (sport, espn id). The
  script creates `uq_athletes_espn_id` — a partial unique index on
  `(sport, external_ids->>'espn')` — if missing (athlete ids are only unique
  per ESPN sport namespace, and racing shares one namespace across its three
  leagues). Tennis/racing headshots use the canonical CDN URL pattern after a
  HEAD existence check.
- Known gaps: Aaron Judge (not on ESPN's 26-man Yankees roster payload at
  seed time) and Christian Pulisic (not in MLS) keep their hand-seeded rows
  without ESPN ids.

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
  Field-template sports (golf/tennis/racing) belong in
  `seed-field-events.mjs` instead — add an entry to its `LEAGUES` map with
  the ESPN path and a `kind` of `golf`/`tennis`/`racing`.
- **Other providers**: `external_ids` is a jsonb map — add keys alongside
  `espn` (e.g. `{"espn": "401581097", "statsapi": "748266"}`) without schema
  changes.

## Caveats / known data notes

- ESPN reports historical games under a venue's **current** name (e.g. 2023
  Astros games say "Daikin Park"). The seeder maps these onto the existing row
  and stores the new branding as a `venue_alias`. When ESPN instead assigns a
  **new venue id** across a rename (Red Bull Arena ⇄ Sports Illustrated
  Stadium, Bercy ⇄ Accor Arena, Mexico City Arena ⇄ Arena CDMX), the curated
  `KNOWN_VENUE_EQUIVALENTS` map in `seed-real-data.mjs` keeps them as one row —
  extend it if validation or the run log shows a new duplicate building.
- `KNOWN_TEAM_ALIASES` handles franchise rebrands ESPN can't be fuzzy-matched
  on (currently Utah Mammoth → the seeded "Utah Hockey Club" row).
- All-star exhibitions (NBA All-Star weekend, NFL Pro Bowl, MLB/NHL ASG, the
  2025 4 Nations Face-Off) are excluded so fake "franchises" (Team LeBron,
  AFC/NFC, national teams) never enter the teams table.
- Hand-seeded events that correspond to real games are enriched with
  `external_ids.espn`; hand-seeded events that don't match any real game
  (fictional matchups) are left untouched and show up as non-`espn` rows in
  the validation report.
- A few legitimately new venue rows are created for special games (London /
  Munich / São Paulo NFL games, Tokyo/Seoul MLB openers, Field of Dreams-style
  one-offs, NHL outdoor games, the Coyotes' Mullett Arena, etc.).

## Validation

`validate-data.mjs` hard-fails (exit 1) on: cross-league team references,
ESPN-sourced match events missing scores, duplicate ESPN ids (teams/venues/
events/athletes), un-deduped natural-key duplicates, event dates outside
2000-01-01..today, field events missing `tournament_name`, golf/tennis day
rows missing `tournament_id`/`day_number`, tournaments whose day rows point
at different venues or repeat a day_number, and golf majors / tennis slams
missing their required `event_tags`. It also prints per-league/per-season
counts and totals for plausibility checks:

```sql
SELECT l.slug, e.season, count(*)
FROM events e JOIN leagues l ON l.id = e.league_id
GROUP BY 1, 2 ORDER BY 1, 2;
```
