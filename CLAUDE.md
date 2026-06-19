# CLAUDE.md — working notes for BoxdSeats

Orientation and hard-won gotchas for working in this repo. Read this first.

## What the app is

BoxdSeats is a check-in app for live sports: fans log the games they attend, rate
them, add photos, follow friends, and build a profile/passport of their fan
history. Domain: www.boxdseats.com.

## Stack and deployment model

- **Web:** Next.js 16 (App Router), React, Tailwind v4, TypeScript. Deployed on
  **Vercel** — pushing to `main` ships to production.
- **Backend:** Supabase (Postgres + Auth + Storage). Row-Level Security is
  enabled and enforcing (verified: anon writes are rejected, private logs aren't
  readable by others). Treat RLS as the real authorization layer; app-layer
  checks are defense-in-depth.
- **iOS:** a Capacitor **remote-URL shell** in `ios-app/` that loads the live
  website and adds native plugins. Built on **Codemagic** (`codemagic.yaml`) and
  shipped to **TestFlight**.

### The single most important deploy fact

The iOS app loads the live site, so **web changes reach the app on relaunch with
no rebuild and no App Store review.** Only changes to the **native layer**
(plugins, entitlements, Info.plist, app icon, iOS version) need a new Codemagic
build. When you fix something in `src/`, it ships by merging to `main`; do not
tell the user to cut a TestFlight build for a web change.

## Layout

- `src/app/(app)/` — authenticated app screens. `(auth)/` — login/signup.
  `(public)/` — pages reachable logged-out (shared profiles `/u/[username]`,
  events `/e/[id]`, and the legal pages `/privacy`, `/terms`).
- `src/lib/queries/` — all Supabase data access. `src/lib/native/` — the
  Capacitor bridge helpers (photo scan, push).
- `src/lib/supabase/middleware.ts` — route gating. Logged-out users are
  redirected to `/login` unless the path is in the public allowlist (`/@`,
  `/u/`, `/e/`, `/privacy`, `/terms`, `/api/`).
- `scripts/data/` — one-off data seeders and fixers (Node `.mjs` and Python).
- `supabase/migrations/` — SQL migrations (the canonical record; some are
  applied live via the service-role REST API).

## The photo finder (the signature feature)

Flow: native `PhotoScanner` plugin enumerates the photo library on-device and
returns only geotagged photos' `{id, lat, lng, timestamp}` (no thumbnails, no
image data) → `src/lib/native/photoScan.ts` `matchPhotosToVenues` geofences each
photo to a venue → `src/lib/queries/photoSuggestions.ts` looks up the games at
those (venue, date) pairs → `/api/photo-logs` creates the chosen logs.

- **Privacy:** photo scanning is entirely on-device. Only matched venue+date
  pairs leave the phone; photos and their locations never do. Say this
  accurately in any user-facing copy and App Store material.
- **Per-venue match radius:** `public/venues-geo.json` is `[id, lat, lng,
  radius?]`. Default radius is 175m (tight, for dense-city arenas like MSG that
  have an event nightly); sprawling venues carry a larger radius (tennis 600m,
  golf 1500m, motorsports 2000m, stadiums 300m). Regenerate this file from the
  DB after any venue coordinate change.
- **Lesson — the 1000-row cap:** PostgREST defaults to 1000 rows. The
  suggestions lookup must not do a cartesian `.in(venues).in(dates)` — it
  truncates silently and the under-reporting scales with how many games a user
  has attended. Query the exact (venue, date) pairs in chunks instead. Chunk any
  `.in()` over a user-controlled-size list (see `photoSuggestions.ts`).
- **Dates use a fixed UTC-5 offset** (`localEventDate`, and the sync's
  `localDate`). Both the photo side and the event side use it, so in-game photos
  stay consistent. Do not make one side timezone-aware without re-deriving the
  other, or matches break.

## Venue data model

- A venue has one canonical `name` (the current/most-recent name) plus rows in
  `venue_aliases` (`alias_name`) for historical names, so search finds old names
  (e.g. "Staples Center" → Crypto.com Arena). Search joins aliases.
- Renames create duplicate venue rows when the upstream (ESPN) issues a new
  venue id. Merge them with `scripts/data/standardize_venue_names.py` (curated
  current-name → historicals) or `merge_duplicate_venues.py` (proximity +
  shared-team). **Distinguish a rename from a relocation:** same physical
  building (near-identical coordinates) is a rename → merge; a team moving to a
  different building is a relocation → keep separate.
- Geocoding pitfalls: many venues were dumped at country-centroid coordinates
  (Nominatim "couldn't resolve" fallback) and are excluded from
  `venues-geo.json`. Others geocoded to the wrong same-named place (e.g.
  "Children's Mercy Park" → the hospital, 17km off). Nominatim returns
  confident-but-wrong results, so validate (stadium-type result, correct
  country/city) and prefer dry-runs before writing coordinates.

## Push notifications

APNs via `node:http2` from `/api/push`, triggered by a DB webhook on
`notifications` INSERT. The webhook bearer secret is stored base64 in
`private.config` and decoded at runtime (the Supabase Management API rejects SQL
containing raw secret-looking strings). On the native side, Capacitor's template
`AppDelegate` omits the APNs callbacks — `ios-app/scripts/configure-push.rb`
injects them during the Codemagic build. Without that, push registration never
fires.

## Running data scripts

Scripts read `.env.local`. Writes go through the **service-role key** over
PostgREST (`SUPABASE_SERVICE_ROLE_KEY`), which bypasses RLS — be careful. The
Supabase **Management API** (raw SQL, `SUPABASE_PAT`) is not available in this
environment, so apply data changes via PostgREST and commit a migration file as
the record. Always dry-run destructive scripts first.

## Dev workflow

- Develop on a feature branch; never push to `main` directly. Open a PR into
  `main` and squash-merge.
- Before committing: `npx tsc --noEmit`, `npm run lint`, `npm test` (vitest).
- Squash-merging via the GitHub API attributes the merge commit to GitHub
  (`noreply@github.com`); that's expected and shows as Verified on GitHub. Don't
  rewrite `main` to "fix" it.
- Keep user-facing copy plain: no "leverage/utilize/ensure/synergy", minimal em
  dashes (spaces around them), no emoji, no AI-tell phrasing.

## App Store status

Privacy Policy and Terms live at `/privacy` and `/terms`. Per-content reporting
(comments, photos) plus user block/report satisfy Guideline 1.2. Demo account
and the App Privacy nutrition-label declarations are in
`docs/app-store-review.md`. Open item before submission: stand up
`support@boxdseats.com` (referenced in both policies).
