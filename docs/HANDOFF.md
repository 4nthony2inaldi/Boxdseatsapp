# BoxdSeats Development Handoff

## Session 1 — Foundation

**Date:** February 10, 2026
**Scope:** Project scaffolding, Supabase setup, database schema, seed data, auth, app shell, Vercel deployment.

---

### File / Folder Structure

```
Boxdseatsapp/
├── docs/                          # Product documentation (PRD, wireframes, brand guide, etc.)
│   ├── HANDOFF.md                 # This file
│   ├── boxdseats-schema.sql       # Original schema SQL (reference copy)
│   ├── boxdseats-brand-guide.jsx  # Brand guide (React component)
│   ├── BoxdSeats_Wireframe_v2.jsx # Interactive wireframes
│   ├── BoxdSeats_PRD_v1.5.docx   # Product Requirements Document
│   ├── BoxdSeats_TechArch_v1.2.docx
│   ├── BoxdSeats_DataModel_v1.1.docx
│   ├── BoxdSeats_DataStrategy_v1.2.docx
│   └── BoxdSeats_Roadmap_v1.0.docx
├── scripts/
│   └── seed.sql                   # Comprehensive seed data (1,340 lines)
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout (metadata, global CSS import)
│   │   ├── globals.css            # Tailwind + brand tokens (@theme inline)
│   │   ├── (auth)/                # Auth route group (no app shell)
│   │   │   ├── login/page.tsx     # Email/password login
│   │   │   └── signup/page.tsx    # Email/password signup with username
│   │   ├── auth/
│   │   │   └── callback/route.ts  # OAuth callback handler
│   │   └── (app)/                 # Main app route group (with shell)
│   │       ├── layout.tsx         # App shell: header + bottom nav + auth check
│   │       ├── page.tsx           # Feed tab (placeholder)
│   │       ├── explore/page.tsx   # Explore tab (placeholder)
│   │       ├── log/page.tsx       # Log tab (placeholder)
│   │       ├── lists/page.tsx     # Lists tab (placeholder)
│   │       └── profile/page.tsx   # Profile tab (server component, reads user)
│   ├── components/
│   │   ├── AppHeader.tsx          # Top header: logo + wordmark + bell/share/settings
│   │   ├── BottomNav.tsx          # 5-tab bottom nav with elevated Log button
│   │   └── Logo.tsx               # SVG logo mark + LogoWithWordmark component
│   ├── lib/
│   │   ├── constants.ts           # Brand color tokens + league config
│   │   └── supabase/
│   │       ├── client.ts          # Browser Supabase client (createBrowserClient)
│   │       ├── server.ts          # Server Supabase client (createServerClient + cookies)
│   │       └── middleware.ts      # Session refresh + auth redirect logic
│   └── middleware.ts              # Next.js middleware entry point
├── supabase/
│   ├── config.toml                # Supabase local dev config
│   └── .gitignore
├── .env.local                     # Environment variables (NOT committed)
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
└── tailwind uses @theme inline in globals.css (Tailwind v4 pattern)
```

---

### Supabase Client Setup

**Two clients, following the official `@supabase/ssr` pattern:**

| Client | File | Used In | How |
|--------|------|---------|-----|
| Browser | `src/lib/supabase/client.ts` | Client Components | `createBrowserClient()` — sends cookies automatically |
| Server | `src/lib/supabase/server.ts` | Server Components, Route Handlers, Server Actions | `createServerClient()` with `cookies()` from `next/headers` |

**Middleware client** (`src/lib/supabase/middleware.ts`):
- Creates a server client using request/response cookies
- Refreshes auth tokens on every request
- Used by `src/middleware.ts`

**Environment variables** (in `.env.local` and Vercel):
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Public anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Server-only, for admin operations

---

### How Auth Works

**Flow:**
1. **Middleware** (`src/middleware.ts`) runs on every request (except static files)
2. It calls `updateSession()` from `src/lib/supabase/middleware.ts` which:
   - Refreshes the Supabase auth session (keeps tokens alive)
   - Redirects unauthenticated users to `/login` (except auth routes)
   - Redirects authenticated users away from `/login` and `/signup` to `/`
3. **Signup** (`src/app/(auth)/signup/page.tsx`):
   - Calls `supabase.auth.signUp()` with email, password, and username in `user_metadata`
   - The database trigger `on_auth_user_created` auto-creates a `profiles` row using the username from metadata
4. **Login** (`src/app/(auth)/login/page.tsx`):
   - Calls `supabase.auth.signInWithPassword()` with email and password
   - On success, redirects to `/` and refreshes the router
5. **Auth callback** (`src/app/auth/callback/route.ts`):
   - Handles OAuth code exchange (for future Google/Apple auth)

**Protected routes:** Everything under `(app)/` requires authentication. Auth pages (`/login`, `/signup`) are accessible without auth.

**Test accounts** (all use password `password123`):
- `anthony@test.com` — primary test user
- `kyle@test.com`, `sarah@test.com`, `dave@test.com`, `mike@test.com`

---

### App Shell Component Structure

```
Root Layout (src/app/layout.tsx)
  ├── (auth) routes — no shell, just centered forms with logo
  └── (app) layout (src/app/(app)/layout.tsx)
       ├── AppHeader (src/components/AppHeader.tsx)
       │    ├── LogoWithWordmark — three-ball SVG + "BOXDSEATS" text
       │    └── Icons: Bell, Share, Settings (SVG inline)
       ├── <main> — page content with pb-24 for nav clearance
       └── BottomNav (src/components/BottomNav.tsx)
            ├── Feed — RSS-style icon
            ├── Explore — Search icon
            ├── Log — Elevated orange gradient circle with + icon
            ├── Lists — List icon
            └── Profile — User icon
```

**Logo component** (`src/components/Logo.tsx`): Pure SVG, renders the three overlapping circles (basketball orange, football brown, baseball off-white with red stitching). Accepts a `size` prop. `LogoWithWordmark` adds the "BOXDSEATS" text with "SEATS" in accent orange.

---

### Brand Tokens & Shared Constants

**File:** `src/lib/constants.ts`

Colors (from brand guide):
- `bg: "#0D0F14"` — App background
- `bgCard: "#161920"` — Card/panel background
- `bgElevated: "#1C1F2A"` — Elevated surfaces
- `bgInput: "#232735"` — Input fields
- `accent: "#D4872C"` — Primary accent (basketball orange)
- `textPrimary: "#F0EBE0"` — Headlines (baseball off-white)
- `textSecondary: "#9BA1B5"` — Body text
- `textMuted: "#5A5F72"` — Labels/metadata
- `border: "#2A2D3A"` — Borders
- `win: "#3CB878"`, `loss: "#C83C2C"`, `draw: "#9BA1B5"` — Outcome colors

**Tailwind integration:** Brand tokens are defined in `globals.css` using `@theme inline` (Tailwind v4 pattern). This makes them available as Tailwind utility classes like `bg-bg`, `text-accent`, `border-border`, etc.

**Fonts:**
- **Bebas Neue** — Display font (headlines, nav, stats). Applied via `.font-display` class.
- **DM Sans** — Body font (text, descriptions, UI). Set as the default body font.
- Loaded via Google Fonts `@import` in `globals.css`.

---

### Seed Data Summary

**Script:** `scripts/seed.sql` (1,340 lines)

| Entity | Count | Details |
|--------|-------|---------|
| Leagues | 6 | NFL, NBA, MLB, NHL, MLS, PGA Tour |
| Teams | 153 | 32 NFL, 30 NBA, 30 MLB, 32 NHL, 29 MLS |
| Venues | 141 | All major stadiums/arenas across all leagues + 7 golf courses |
| Athletes | 24 | Mahomes, LeBron, Judge, McDavid, Messi, Scheffler, etc. |
| Events | 169 | Spread Feb 2025 – Feb 2026, all 6 leagues, realistic scores |
| Venue-Team associations | 152 | Multi-tenant venues handled (MSG → Knicks + Rangers, etc.) |
| Test users | 5 | anthony, kyle, sarah, dave, mike |
| Event logs | 51 | anthony: 25, kyle: 8, dave: 7, sarah: 6, mike: 5 |
| Venue visits | 36 | Auto-created by trigger + 7 want_to_visit for anthony |
| System lists | 6 | MLB Stadiums, NFL Stadiums, NBA Arenas, NHL Arenas, Grand Slams, PGA Majors |
| List items | 130 | Real venues/events assigned to each list |
| Follows | 8 | anthony ↔ all others, some mutual |
| Likes | 30 | Scattered across event logs (triggers update like_count) |
| Comments | 15 | From various users (triggers update comment_count) |
| Companion tags | 10 | On anthony's events |
| User league favorites | 16 | Anthony's Big Four drill-through |
| List follows | 10 | Users following system lists |

**To re-run the seed:**
1. First clear user data: delete from auth.users (cascades to profiles and all user data)
2. Reference data (leagues, teams, venues, etc.) uses `ON CONFLICT DO NOTHING` so it's safe to re-run
3. Users must be created via the Supabase Admin API (not raw SQL) for auth to work properly
4. Then run the user-data portion of the seed via a Node.js script that looks up real IDs

**Important:** The original `scripts/seed.sql` uses deterministic UUIDs for users (`00000000-...`), but the actual users in the database were recreated via the Supabase Admin API with different UUIDs. The seed SQL is still useful as a reference for all the reference data, but the user-specific data was inserted via a separate Node.js script.

---

### Schema Changes & Issues Encountered

1. **Circular dependency:** `profiles` references `lists` (pinned_list_1_id, pinned_list_2_id), but `lists` references `profiles` (created_by). **Fix:** Created profiles table without the list FK constraints, then added them via `ALTER TABLE` after lists table was created.

2. **PostGIS in public schema:** PostGIS extension installed ~680 functions in the `public` schema, which caused Supabase GoTrue (auth service) to fail with "Database error querying schema" on any auth operation. **Fix:** Moved PostGIS to the `extensions` schema:
   ```sql
   DROP EXTENSION postgis CASCADE;
   CREATE EXTENSION postgis SCHEMA extensions;
   ```
   The `venues.location` column was recreated as `extensions.geography(Point, 4326)`.

3. **Auth user creation:** Creating users via raw SQL `INSERT INTO auth.users` with `crypt()` password hashing didn't work properly with GoTrue. **Fix:** Users must be created via the Supabase Admin API (`supabase.auth.admin.createUser()`), which handles password hashing, identity creation, and metadata correctly.

4. **Trigger `on_auth_user_created`:** Works correctly — auto-creates a `profiles` row when a new auth user is created. The profile gets the username from `raw_user_meta_data->>'username'`.

5. **Like/comment count triggers:** Work correctly — `like_count` and `comment_count` on `event_logs` are auto-incremented/decremented by triggers when likes/comments are inserted/deleted.

---

### What Was NOT Completed / Deferred

- **Onboarding flow** — Not built. Users go directly to the main app after signup.
- **Feature screens** — All 5 tabs (Feed, Explore, Log, Lists, Profile) show placeholder content only.
- **TypeScript types from Supabase** — `supabase gen types` was not run. No `database.types.ts` file yet.
- **Image optimization** — `next.config.ts` doesn't have Supabase Storage `remotePatterns` configured yet.
- **Real-time subscriptions** — Not set up (needed for feed updates and notification badges).
- **Error boundaries** — No `error.tsx` or `loading.tsx` files for route segments.
- **OAuth providers** — Only email/password auth. Google/Apple OAuth not configured.
- **Mobile viewport meta** — Not explicitly set beyond Next.js defaults.

---

### Decisions Made for Future Sessions

1. **Tailwind v4 pattern:** Using `@theme inline` in `globals.css` for brand tokens instead of `tailwind.config.ts`. This is the Tailwind v4 way (which ships with Next.js 15+).

2. **Route groups:** `(auth)` for login/signup (no app shell), `(app)` for main app (with header + bottom nav). This follows the Tech Architecture doc's recommended structure.

3. **Server vs Client components:** Profile page is a Server Component (fetches user data server-side). Auth pages are Client Components (handle form state and auth calls). All other tab pages are currently simple server components with static placeholder content.

4. **Bottom nav structure:** The Log tab uses an elevated circular gradient button (matching the brand guide wireframe). Other tabs use standard icon + label layout.

5. **Font loading:** Bebas Neue and DM Sans loaded via Google Fonts CSS import in `globals.css` rather than `next/font`. This is simpler but means fonts aren't self-hosted. Can be migrated to `next/font/google` later for better performance.

6. **PostGIS in `extensions` schema:** This is the Supabase-recommended pattern and avoids the GoTrue schema cache conflict. Any future PostGIS queries need to reference `extensions.geography`, `extensions.ST_DWithin`, etc., or set `search_path` to include `extensions`.

7. **Seed data users:** Test users are created via the Admin API, not SQL. Their UUIDs are not deterministic. If the database is reset, users must be recreated via the Admin API and user-dependent seed data re-inserted with the new UUIDs.

---

## Session 2 — Profile

**Date:** February 10, 2026
**Scope:** Full profile page with all 6 sections: header, stats, Big Four, activity chart, pinned lists, and timeline with league filtering.

---

### New Components Created

| Component | File | Description |
|-----------|------|-------------|
| ProfileHeader | `src/components/profile/ProfileHeader.tsx` | Avatar (gradient fallback), sport badge, display name, @username, W-L-D record |
| StatsRow | `src/components/profile/StatsRow.tsx` | 4-column grid: Events, Venues, Followers (tappable), Following (tappable) |
| StatBox | `src/components/profile/StatBox.tsx` | Reusable stat display with optional `href` for tappable stats |
| BigFourSection | `src/components/profile/BigFourSection.tsx` | Container for the Big Four cards with section label |
| BigFourCard | `src/components/profile/BigFourCard.tsx` | Tall image card: photo area (110px, gradient placeholder), category label, name, subtitle |
| ActivityChart | `src/components/profile/ActivityChart.tsx` | Rolling 12-month bar chart showing events/month, summary line, accent color for current month |
| PinnedLists | `src/components/profile/PinnedLists.tsx` | 1-2 pinned list cards with icon, name, progress fraction, gradient progress bar |
| Timeline | `src/components/profile/Timeline.tsx` | Client component: reverse-chronological feed with league filter dropdown |
| TimelineCard | `src/components/profile/TimelineCard.tsx` | Individual timeline entry: league icon, outcome badge, star rating, matchup, venue, date, notes |
| StarRating | `src/components/profile/StarRating.tsx` | 1-5 star display using inline SVG, accent fill |
| OutcomeBadge | `src/components/profile/OutcomeBadge.tsx` | W/L/D badge with color-coded text and border |
| SectionLabel | `src/components/profile/SectionLabel.tsx` | Uppercase Bebas Neue section header |

**New pages:**
- `src/app/(app)/profile/page.tsx` — Full profile page (Server Component, rewritten from placeholder)
- `src/app/(app)/profile/followers/page.tsx` — Placeholder followers page
- `src/app/(app)/profile/following/page.tsx` — Placeholder following page

---

### Data Fetching Pattern

The profile page uses **server-side data fetching** via the Server Component pattern:

1. `ProfilePage` (Server Component) in `src/app/(app)/profile/page.tsx`:
   - Creates a server Supabase client via `createClient()` from `src/lib/supabase/server.ts`
   - Gets the authenticated user via `supabase.auth.getUser()`
   - Calls 5 query functions in parallel via `Promise.all()`
   - Passes data as props to child components

2. `Timeline` component is a **Client Component** (`"use client"`) because it handles:
   - League filter dropdown state
   - Client-side re-fetching when filter changes (uses `createClient()` from `src/lib/supabase/client.ts`)
   - Server-rendered initial data is passed as `initialEntries` prop

---

### Database Queries

**File:** `src/lib/queries/profile.ts`

All queries are exported as async functions that take a `SupabaseClient` instance:

| Function | Description | Tables Queried |
|----------|-------------|----------------|
| `fetchProfile(supabase, userId)` | Fetches the user's profile record | `profiles` |
| `fetchProfileStats(supabase, userId)` | Counts events, venues, followers, following, W-L-D | `event_logs`, `venue_visits`, `follows` |
| `fetchBigFour(supabase, profile)` | Resolves fav_team_id → team name, etc. | `teams`, `venues`, `athletes`, `events` (with joins to `leagues`, `teams`) |
| `fetchActivityChart(supabase, userId)` | Groups event_logs by month for last 12 months | `event_logs` |
| `fetchPinnedLists(supabase, userId, listIds)` | Fetches pinned list metadata and calculates progress | `lists`, `list_items`, `venue_visits`, `event_logs` (with join to `events`) |
| `fetchTimeline(supabase, userId, leagueFilter?)` | Fetches event_logs with joins for display | `event_logs`, `venues`, `leagues`, `events` (with joins to `teams`) |

**Query pattern for Supabase joins:**
- Foreign key relationships are queried using Supabase's nested select syntax: `venues(name)`, `leagues(slug, name)`
- Named joins with explicit FK: `home_team:teams!events_home_team_id_fkey(short_name)`
- Results require `as unknown as Type` casts because Supabase returns inferred types that don't match expected shapes without generated types

---

### Shared/Reusable Components — Props Interfaces

```typescript
// StatBox — used on profile and venue detail screens
type StatBoxProps = {
  value: number;
  label: string;
  href?: string;  // optional link (e.g., followers/following)
};

// StarRating — used on timeline cards
type StarRatingProps = {
  rating: number;
  size?: number;  // default 12px
};

// OutcomeBadge — used on timeline cards
type OutcomeBadgeProps = {
  outcome: string | null;  // "win" | "loss" | "draw" | "neutral" | null
};

// SectionLabel — uppercase Bebas Neue header
type SectionLabelProps = {
  children: React.ReactNode;
};

// TimelineCard — individual event log entry
type TimelineCardProps = {
  entry: TimelineEntry;  // see TimelineEntry type in src/lib/queries/profile.ts
};

// BigFourCard — single Big Four card
type BigFourCardProps = {
  item: BigFourItem;  // { category, name, subtitle }
};
```

---

### Tailwind Theme Additions

Added to `src/app/globals.css` `@theme inline` block:
- `--color-draw: #9BA1B5` — Draw/neutral outcome color (enables `text-draw`, `border-draw`, etc.)
- `--color-accent-brown: #7B5B3A` — Football brown accent (enables `text-accent-brown`, etc.)

---

### Big Four Card Structure

Each Big Four card is structured for future drill-through navigation:

```
BigFourCard
├── Image area (110px height)
│   ├── Photo (or gradient placeholder using category-specific color)
│   └── Gradient fade overlay (transparent → card bg)
├── Category label (TEAM / VENUE / ATHLETE / EVENT)
├── Name (truncated, single line)
└── Subtitle (league name, city, sport, venue)
```

**Category colors:**
- Team: `#002D72` (MLB blue)
- Venue: `#D4872C` (accent orange)
- Athlete: `#7B5B3A` (football brown)
- Event: `#8B0000` (dark red)

**Data source:** Profile record fields `fav_team_id`, `fav_venue_id`, `fav_athlete_id`, `fav_event_id` are resolved to their display names via separate queries in `fetchBigFour()`.

**To add drill-through:** Wrap `BigFourCard` in a `Link` component pointing to the relevant detail page (e.g., `/teams/[id]`, `/venues/[id]`). The `item.category` field can be used to determine the route.

---

### No New Seed Data

This session uses the existing seed data from Session 1. Anthony's profile already has:
- 25 event logs across NFL, NBA, MLB, NHL, MLS, PGA
- `fav_sport: basketball`, `fav_team_id` (Yankees), `fav_venue_id` (PNC Park), `fav_athlete_id` (Ryan Blaney), `fav_event_id` (Pirates vs Reds at PNC)
- `pinned_list_1_id` (MLB Stadiums), `pinned_list_2_id` (NFL Stadiums)
- 8 follows (4 followers, 4 following, some mutual)
- Venue visits auto-created by triggers

---

### Known Issues / Incomplete Items

1. **No generated Supabase types** — All Supabase query results use `as unknown as Type` casts. Running `supabase gen types` would eliminate this and provide compile-time safety.

2. **Big Four images** — Using gradient color placeholders. Real images require either Supabase Storage URLs on team/venue/athlete records or a third-party image API.

3. **Timeline pagination** — Currently limited to 50 entries with no infinite scroll or "load more" button.

4. **Followers/Following pages** — Placeholder pages only. Need to implement user list with follow/unfollow buttons.

5. **Timeline like/share actions** — Icons are rendered but not interactive (no optimistic update logic or Supabase mutations).

6. **Matchup/venue taps** — Cursor pointer is set but no navigation implemented (needs event detail and venue detail pages).

7. **CSS warning** — The `@import url(fonts.googleapis.com)` rule in `globals.css` triggers a CSS lint warning about `@import` ordering. This is cosmetic and doesn't affect functionality. Can be fixed by moving to `next/font/google`.

8. **PGA Tour league slug** — The PGA Tour league has slug `pga-tour` in the DB but the filter dropdown uses `PGA` (matching the LEAGUES constant key). The filter works because it looks up by slug: `pga` (lowercased). If the slug doesn't match, PGA filtering won't return results. Verify the league slug matches.

9. **Privacy enforcement** — Timeline cards respect `hide_personal` (hides notes) and the `show_all` check for notes display. However, `hide_all` entries are not filtered out client-side — this relies on RLS policies to exclude them from query results.

10. **Activity chart date math** — Uses JavaScript `Date` constructor which may produce off-by-one month issues near month boundaries depending on timezone. Server time is used for consistency.

---

## Session 3 — Event Logging

**Date:** February 10, 2026
**Scope:** Complete 4-step event logging flow, shared TimelineCard component, venue search, event matching, event_logs insert with denormalized fields, venue_visits upsert via trigger.

---

### Log Flow Component Structure

```
LogPage (Server Component — src/app/(app)/log/page.tsx)
  └── LogFlow (Client Component — src/components/log/LogFlow.tsx)
       ├── Progress Indicator (4-step dots with labels + connecting lines)
       ├── Step 1: StepVenue (src/components/log/StepVenue.tsx)
       ├── Step 2: StepDate (src/components/log/StepDate.tsx)
       ├── Step 3: StepEvent (src/components/log/StepEvent.tsx)
       └── Step 4: StepDetails (src/components/log/StepDetails.tsx)
```

**State management:** `LogFlow` is the orchestrator. It holds all state in `useState` hooks:
- `step` (1-4) — current step number
- `selectedVenue: VenueResult | null`
- `selectedDate: string | null` (YYYY-MM-DD)
- `selectedEvent: EventMatch | null`
- `manualTitle: string | null` — for manual event entries
- `saving: boolean`, `error: string | null`, `success: boolean`

Each step component receives only the data it needs via props and calls a callback (`onSelect`, `onSave`, `onBack`) to advance or retreat. No global state library is used — simple prop drilling within the 4-step flow.

After save success, `LogFlow` shows a success screen for 1.2 seconds then navigates to `/profile` with `router.push` + `router.refresh()` to re-render the profile with the new entry.

---

### How Venue Search Works

**File:** `src/lib/queries/log.ts` — `fetchUserVenues()` and `searchVenues()`

**Initial load (no search query):**
1. `fetchUserVenues(supabase, userId)` queries `event_logs` for all the user's logged venue IDs with counts
2. Then queries `venues` table for those IDs to get name/city/state
3. Results are sorted by `visit_count` descending — most-visited venues appear first
4. This provides the "Your Venues" list (combined recent + most-visited)

**Search mode (user types in search box):**
1. Input is debounced at 300ms using `useRef` + `setTimeout`
2. `searchVenues(supabase, query, userId)` runs `ilike('%query%')` on `venues.name` where `status = 'active'`, limited to 20 results
3. For each result, a secondary query counts the user's event_logs at that venue to show the visit count badge
4. Results ordered alphabetically by name

**Debouncing pattern:** `StepVenue` uses a `useRef<ReturnType<typeof setTimeout>>` for the debounce timer. On each keystroke, the previous timer is cleared and a new 300ms timer is set. The search state shows a loading indicator during the async query.

---

### How Event Matching Works

**File:** `src/lib/queries/log.ts` — `findEventsAtVenueOnDate()`

**Date range logic:**
1. First query: exact date match — `events` where `venue_id = X` AND `event_date = YYYY-MM-DD`
2. If no results: fallback query — `events` where `venue_id = X` AND `event_date` between `date - 1 day` and `date + 1 day`
3. This ±1 day fallback handles timezone mismatches (e.g., a late-night game that spans midnight)

**Event display:** Each result shows the league icon, league name (color-coded), matchup (away @ home), score (if available), and round/stage.

**Fallback to manual entry:**
- If no events are found, a "Enter event manually" button appears immediately
- If events are found, a "Don't see your event? Enter manually →" dashed button appears below the list
- Manual entry provides a text input for the event title (e.g., "Yankees vs Red Sox")
- Manual entries set `is_manual = true`, `event_id = null`, and `manual_title` on the event_logs row

---

### Event Logs Insert Function

**File:** `src/lib/queries/log.ts` — `saveEventLog()`

**Fields written to `event_logs`:**

| Field | Source |
|-------|--------|
| `user_id` | Auth user ID (from LogFlow prop) |
| `event_id` | Selected event's UUID, or `null` for manual entries |
| `venue_id` | Selected venue's UUID |
| `event_date` | Selected date (YYYY-MM-DD) |
| `league_id` | From the matched event, or `null` for manual |
| `sport` | From the matched event's league, or `null` for manual |
| `rating` | 1-5 from star picker, or `null` if not set |
| `notes` | Free text, or `null` |
| `seat_location` | Free text, or `null` |
| `privacy` | `show_all` (default), `hide_personal`, or `hide_all` |
| `rooting_team_id` | UUID of team user rooted for, or `null` |
| `is_neutral` | `true` if user selected "Neutral" |
| `outcome` | Computed: `win`, `loss`, `draw`, `neutral`, or `null` |
| `is_manual` | `true` if no event was selected from the database |
| `manual_title` | User-typed event title for manual entries |
| `manual_description` | Reserved for future use, currently always `null` |

**Outcome computation** (`computeOutcome()` in `log.ts`):
- If `is_neutral` → `"neutral"`
- If no `rooting_team_id` or no event → `null`
- If scores not available → `null`
- Otherwise: compares rooted team's score to opponent's score → `"win"`, `"loss"`, or `"draw"`

**Companion tags:** After inserting the event log, companion tags are bulk-inserted into `companion_tags` with the new `event_log_id`. Each companion has a `display_name` (either `@username` for tagged users or free text like "my dad") and an optional `tagged_user_id`.

---

### How venue_visits Gets Upserted

**Mechanism:** Database trigger `trg_event_log_auto_visit` (defined in the schema).

When a new row is inserted into `event_logs`, the `auto_visit_venue()` trigger function automatically runs:
```sql
INSERT INTO venue_visits (user_id, venue_id, relationship)
VALUES (NEW.user_id, NEW.venue_id, 'visited')
ON CONFLICT (user_id, venue_id)
DO UPDATE SET relationship = 'visited', updated_at = now();
```

This means:
- If the user has never visited the venue: a new `venue_visits` row is created with `relationship = 'visited'`
- If the user had the venue as `want_to_visit`: it's upgraded to `visited`
- If the user already visited: `updated_at` is refreshed
- No application code needed — the trigger handles everything

---

### Shared TimelineCard Component

**File:** `src/components/TimelineCard.tsx`

**Exported types:**
- `TimelineCardEntry` — the data shape for a single timeline entry (matches `TimelineEntry` from profile queries, plus optional `manual_title` and `is_manual` fields)
- `TimelineAuthor` — `{ id, username, display_name, avatar_url }` for feed mode

**Props:**

```typescript
type TimelineCardProps = {
  entry: TimelineCardEntry;    // Required: the event log data
  showAuthor?: boolean;        // Default false. When true, renders author header
  author?: TimelineAuthor;     // Required when showAuthor=true
  onLike?: (entryId: string) => void;     // Like button callback
  onComment?: (entryId: string) => void;  // Comment button callback
  onShare?: (entryId: string) => void;    // Share button callback
};
```

**How `showAuthor` works:**
- When `false` (default, profile mode): The card renders league icon → outcome badge → stars → matchup → venue/date → notes → actions. This is the same layout as the original profile TimelineCard.
- When `true` (feed mode): A bordered author row is prepended at the top of the card showing the author's avatar (image or gradient initial fallback), display name (or username), and @username. The rest of the card is identical.

**Feed usage example:**
```tsx
<TimelineCard
  entry={entry}
  showAuthor={true}
  author={{ id: "...", username: "kyle", display_name: "Kyle", avatar_url: null }}
  onLike={(id) => handleLike(id)}
/>
```

**Migration note:** The profile `Timeline` component (`src/components/profile/Timeline.tsx`) was updated to import from `../TimelineCard` instead of `./TimelineCard`. The old `src/components/profile/TimelineCard.tsx` is no longer imported anywhere but was left in place. It can be safely deleted.

---

### New Files Created

| File | Type | Description |
|------|------|-------------|
| `src/lib/queries/log.ts` | Query functions | Venue search, event matching, save event log, user search |
| `src/components/log/LogFlow.tsx` | Client Component | 4-step orchestrator with progress indicator |
| `src/components/log/StepVenue.tsx` | Client Component | Venue search with user venues + real-time search |
| `src/components/log/StepDate.tsx` | Client Component | Calendar picker with month navigation |
| `src/components/log/StepEvent.tsx` | Client Component | Event list + manual entry fallback |
| `src/components/log/StepDetails.tsx` | Client Component | Rating, rooting, seat, notes, companions, privacy |
| `src/components/TimelineCard.tsx` | Client Component | Shared timeline card with showAuthor prop |

**Modified files:**
- `src/app/(app)/log/page.tsx` — Replaced placeholder with server component that fetches user and renders `LogFlow`
- `src/components/profile/Timeline.tsx` — Updated import to use shared `TimelineCard`

---

### No New Seed Data

This session uses the existing seed data from Sessions 1-2. The event logging flow works with the existing 141 venues and 169 events in the database.

---

### Known Issues / Edge Cases

1. **Photo upload** — The photo upload area in Step 4 is a visual placeholder only. Actual file upload to Supabase Storage (`event-photos` bucket) is not yet implemented. The `photo_url` field is always `null` on insert.

2. **Duplicate event log prevention** — The database has a unique index `idx_event_logs_no_duplicates` on `(user_id, event_id)` where `event_id IS NOT NULL`. If a user tries to log the same event twice, the insert will fail with a Supabase error. The error is displayed in the UI but there's no pre-check to warn the user before they fill out the form.

3. **PGA/field event rooting** — The rooting interest UI only shows team buttons for match-type events (where `home_team_id` and `away_team_id` exist). For field events (golf, etc.), no rooting UI is shown. The `rooting_athlete_id` field on `event_logs` is not used yet.

4. **Manual entry league/sport** — When a user enters an event manually, `league_id` and `sport` are set to `null`. This means manual entries won't appear when filtering the timeline by league. A future enhancement could add league selection to the manual entry form.

5. **Venue search limitations** — Uses `ilike('%query%')` which is case-insensitive but doesn't use the `pg_trgm` index for fuzzy matching. The `gin_trgm_ops` index on `venues.name` exists in the schema but `ilike` doesn't leverage it. Switching to `similarity()` or `%` operator would enable fuzzy matching.

6. **Venue aliases** — The `venue_aliases` table (historical venue names like "Staples Center" for Crypto.com Arena) is not queried during venue search. Users searching by an old venue name won't find results.

7. **Stats update after save** — The profile page stats (event count, venue count, W/L/D) update after save because `router.refresh()` triggers a full server re-render. However, there's no optimistic UI update — the user sees the success screen, then the profile loads fresh.

8. **Calendar navigation** — The calendar blocks future date selection and prevents navigating past the current month. There's no lower bound — users can scroll back indefinitely. Very old dates might not have events in the database.

9. **Companion search** — The user search for companion tagging uses `ilike` on both `username` and `display_name`. Users can also add free-text companions (e.g., "my dad") by typing and pressing Enter. Free-text companions have `tagged_user_id = null`.

10. **Privacy default** — The details form defaults to `show_all` privacy. The schema notes that the app should read `profiles.default_privacy` and use it as the default, but this is not implemented yet.

11. **Calendar event date preloading — scalability** — `fetchEventDatesForVenue()` currently fetches *all* event dates for a venue with no date range limit. This works fine with seed data (~169 events total) but could be slow for high-volume venues (e.g., MSG with decades of events) once real data is loaded. Future fix: add a date floor (e.g., last 2-3 years) or load dates per-month as the user navigates the calendar.

12. **Calendar auto-navigate may be disorienting** — When the calendar opens, it auto-jumps to the most recent month with events. If a user picks a baseball stadium in February expecting to log today's game but the most recent event is from October, the calendar jumps back 4 months. The "Today" shortcut is still visible, but consider only auto-navigating when the current month has zero events, or showing a brief indicator of why the month changed.

13. **Error messages** — `saveEventLog()` maps raw Supabase/Postgres error messages to user-friendly strings via `friendlyError()`. The mapping covers: duplicate event logs, foreign key violations, rating check constraints, RLS violations, and expired sessions. Unknown errors fall back to a generic message. The raw error is never shown to the user.

---

## Session 4 — Venues, Events, Lists

**Date:** February 10, 2026
**Scope:** Venue detail page, event detail page with comments, lists index with real data, list detail page with progress, cross-navigation links, log flow pre-fill from venue CTA.

---

### New Page Routes

| Route | File | Type | Description |
|-------|------|------|-------------|
| `/venue/[id]` | `src/app/(app)/venue/[id]/page.tsx` | Server Component | Venue detail with history, home teams, community stats, timeline, log CTA |
| `/event/[id]` | `src/app/(app)/event/[id]/page.tsx` | Server Component | Event detail with scoreboard, user log, attendees, comments |
| `/lists` | `src/app/(app)/lists/page.tsx` | Server Component | Lists index with real data and progress (replaces placeholder) |
| `/lists/[id]` | `src/app/(app)/lists/[id]/page.tsx` | Server Component | List detail with progress bar, visited/remaining items |

---

### New Query Files

| File | Exports | Description |
|------|---------|-------------|
| `src/lib/queries/venue.ts` | `fetchVenueDetail`, `fetchVenueHistory`, `fetchVenueTeams`, `fetchVenueCommunityStats`, `fetchVenueTimeline` | All venue detail data |
| `src/lib/queries/event.ts` | `fetchEventDetail`, `fetchUserEventLog`, `fetchEventAttendees`, `fetchEventComments`, `postComment`, `deleteComment` | Event detail data + comment CRUD |
| `src/lib/queries/lists.ts` | `fetchAllLists`, `fetchListDetail`, `fetchListItems` | List index and detail data |

---

### New Components

| Component | File | Type | Description |
|-----------|------|------|-------------|
| `VenueTimelineList` | `src/components/venue/VenueTimelineList.tsx` | Client Component | Wraps timeline entries in Links to event detail pages |
| `CommentsSection` | `src/components/event/CommentsSection.tsx` | Client Component | Displays existing comments, input to post new ones, delete own comments |

---

### How Cross-Navigation Works

**Links between pages** use Next.js `<Link>` components with dynamic route segments:

1. **TimelineCard → Event detail:** The matchup line in `TimelineCard.tsx` is wrapped in `<Link href={/event/${entry.event_id}}>` when `event_id` is present. Manual entries (no `event_id`) are not linked.

2. **TimelineCard → Venue detail:** The venue name in `TimelineCard.tsx` is wrapped in `<Link href={/venue/${entry.venue_id}}>` when `venue_id` is present. Uses `e.stopPropagation()` to prevent bubbling when the card is wrapped in another link.

3. **Event detail → Venue detail:** The venue name on the event detail page is a `<Link href={/venue/${event.venue_id}}>`.

4. **Venue detail → Event detail:** Timeline entries in `VenueTimelineList` are wrapped in `<Link href={/event/${entry.event_id}}>`.

5. **Lists index → List detail:** Each list card is wrapped in `<Link href={/lists/${list.id}}>`.

6. **List detail → Venue detail:** Visited venue items in the list are wrapped in `<Link href={/venue/${item.venue_id}}>`.

7. **Venue detail → Log flow (pre-filled):** The "Log Event Here" CTA links to `/log?venueId=X&venueName=Y&venueCity=Z&venueState=W`.

**URL parameter passing:** Query params are encoded with `encodeURIComponent()` for venue name/city/state. The log page server component reads `searchParams` and constructs a `VenueResult` object to pass as `prefillVenue` to `LogFlow`.

---

### Comments System

**Implementation:** `CommentsSection` is a client component that manages comment state.

**Insert flow:**
1. User types in input field, presses Enter or clicks "Post"
2. `postComment(supabase, userId, eventLogId, body)` inserts into `comments` table
3. After insert, re-fetches all comments for the event log to get fresh data with profile info
4. The `comment_count` on `event_logs` is auto-incremented by the database trigger `trg_comment_insert` (defined in schema)

**Delete flow:**
1. Only the comment author sees a "Delete" button
2. `deleteComment(supabase, commentId, userId)` deletes from `comments` where both `id` and `user_id` match (ensures ownership)
3. Optimistically removes from local state
4. The `comment_count` is auto-decremented by the database trigger `trg_comment_delete`

**Permissions:**
- Any authenticated user can post a comment on any event log (where `comments_enabled = true` — not currently enforced in the query)
- Only the comment author can delete their own comment (enforced by the `.eq("user_id", userId)` filter in the delete query)
- The event log owner does not have special delete permissions on others' comments (would need RLS or app-level check)

---

### How List Progress Is Calculated

**For venue-type lists** (MLB Stadiums, NFL Stadiums, NBA Arenas, NHL Arenas):
1. Query `list_items` for the list to get all `venue_id` values
2. Query `venue_visits` for the user where `relationship = 'visited'` and `venue_id IN (list venue IDs)`
3. Count matches = visited count
4. Progress percentage = `Math.round((visited / item_count) * 100)`

**For event-type lists** (Grand Slams, PGA Majors):
1. Query `list_items` for the list to get all `event_tag` values (e.g., `"grand_slam"`, `"us_open"`)
2. Query user's `event_logs` joined with `events` to get `event_tags` arrays
3. For each list item, check if the user has any event log with a matching `event_tag`
4. Count matches = visited count

**Optimization in list index:** `fetchAllLists()` pre-fetches all visited venue IDs and event tags in bulk, then loops through each list's items. This avoids N+1 queries per list.

**Display:** Both the lists index and list detail pages show:
- Fraction: "X of Y"
- Percentage: "Z%"
- Visual progress bar with accent gradient (`from-accent to-accent-hover`)

---

### How "Log Event Here" Pre-Fill Works

1. **Venue detail page** renders a CTA link: `/log?venueId=X&venueName=Y&venueCity=Z&venueState=W`
2. **Log page** (`src/app/(app)/log/page.tsx`) reads `searchParams` and constructs a `VenueResult` object if `venueId` and `venueName` are present
3. **LogFlow** accepts an optional `prefillVenue?: VenueResult` prop
4. When `prefillVenue` is provided:
   - `step` initializes to `2` (skipping venue selection)
   - `selectedVenue` initializes to the prefilled venue
   - User lands directly on the date picker step
5. User can still go back to step 1 to change the venue

---

### Modified Files

| File | Change |
|------|--------|
| `src/components/TimelineCard.tsx` | Added `Link` import. Matchup line links to `/event/[id]`. Venue name links to `/venue/[id]`. |
| `src/components/log/LogFlow.tsx` | Added `prefillVenue` prop. Initializes step/venue state from prop. |
| `src/app/(app)/log/page.tsx` | Reads `searchParams` for venue pre-fill. Passes `prefillVenue` to `LogFlow`. |
| `src/app/(app)/lists/page.tsx` | Replaced static placeholder with server component fetching real list data. |

---

### Known Issues / Edge Cases

1. **Event detail for manual entries** — If a user logged an event manually (no `event_id`), there's no `/event/[id]` page for it. Manual entry timeline cards are not linked to event detail. A future enhancement could create a log detail page at `/log/[id]` for manual entries.

2. **Comments on other users' logs** — The comments section only appears for the current user's event log. If you visit an event detail page and another user logged it (but you didn't), you can't comment on their log from the event page. A future enhancement could show comments on other users' logs in the attendees section.

3. **Event attendees privacy** — Attendees with `privacy = 'hide_all'` are filtered out. But attendees with `privacy = 'hide_personal'` still show their rating and outcome. Consider whether to hide ratings too.

4. **List item ordering** — `list_items` are sorted by `display_order`. Some seed data may have `display_order = 0` for all items. In that case, items appear in insertion order, which may not be alphabetical.

5. **Remaining items cap** — List detail shows the first 8 remaining venues, then a "+ X more" label. There is no "Show All" button to expand the full list. For lists with many remaining items (e.g., 25+ of 30), this may frustrate users.

6. **Community friends overlap** — `fetchVenueCommunityStats` queries all friends (people the user follows) who have event logs at the venue. If a friend visited the venue multiple times, they only appear once in the friends list (deduped by user ID).

7. **Edit button on event detail** — The "Edit" link for the user's log entry links to `/log?edit=[logId]`, but the log flow does not yet support edit mode. This is a placeholder for future implementation.

8. **Comment input not debounced** — Comment posting has no debounce or throttle. Rapid clicking could submit duplicate comments. The database doesn't have a unique constraint preventing duplicate comment bodies.

---

## Session 5 — Social

**Date:** February 10, 2026
**Scope:** Feed page, follow system with private profile gating, other users' profiles, followers/following lists, explore search, like toggle, enhanced comments, block and report.

---

### New Page Routes

| Route | File | Type | Description |
|-------|------|------|-------------|
| `/` (Feed) | `src/app/(app)/page.tsx` | Server Component | Feed with entries from self + followed users |
| `/explore` | `src/app/(app)/explore/page.tsx` | Server Component | Search across users, venues, teams |
| `/user/[username]` | `src/app/(app)/user/[username]/page.tsx` | Server Component | Other user's profile (same layout, no edit, follow button) |
| `/user/[username]/followers` | `src/app/(app)/user/[username]/followers/page.tsx` | Server Component | User's followers list |
| `/user/[username]/following` | `src/app/(app)/user/[username]/following/page.tsx` | Server Component | User's following list |
| `/profile/followers` | `src/app/(app)/profile/followers/page.tsx` | Server Component | Own followers list (replaces placeholder) |
| `/profile/following` | `src/app/(app)/profile/following/page.tsx` | Server Component | Own following list (replaces placeholder) |

---

### New Query File

**File:** `src/lib/queries/social.ts`

All social queries are consolidated in this file:

| Function | Description | Tables Queried |
|----------|-------------|----------------|
| `fetchFeed(supabase, userId, limit?, offset?)` | Feed entries from self + followed users, with author info and like status | `follows`, `blocks`, `event_logs`, `profiles`, `likes`, `venues`, `leagues`, `events`, `teams` |
| `fetchFollowRelationship(supabase, currentUserId, targetUserId)` | Checks isFollowing, isPending, isFollowedBy between two users | `follows` |
| `followUser(supabase, followerId, followingId)` | Creates follow (active) or follow request (pending for private profiles) | `profiles`, `follows` |
| `unfollowUser(supabase, followerId, followingId)` | Removes follow/request | `follows` |
| `acceptFollowRequest(supabase, currentUserId, requesterId)` | Accepts a pending follow request | `follows` |
| `fetchFollowersList(supabase, userId, currentUserId)` | List of followers with current user's follow status | `follows`, `profiles` |
| `fetchFollowingList(supabase, userId, currentUserId)` | List of following with current user's follow status | `follows`, `profiles` |
| `toggleLike(supabase, userId, eventLogId, currentlyLiked)` | Like/unlike toggle | `likes` |
| `checkUserLike(supabase, userId, eventLogId)` | Check if user liked an entry | `likes` |
| `searchAll(supabase, query, limit?)` | Search users, venues, teams in parallel | `profiles`, `venues`, `teams`, `leagues` |
| `blockUser(supabase, blockerId, blockedId)` | Block user + remove follow relationships | `blocks`, `follows` |
| `unblockUser(supabase, blockerId, blockedId)` | Remove block | `blocks` |
| `checkBlocked(supabase, userId1, userId2)` | Check if either user has blocked the other | `blocks` |
| `reportContent(supabase, reporterId, targetType, targetId, reason)` | Submit a report | `reports` |
| `fetchUserProfileByUsername(supabase, username)` | Fetch profile by username (includes is_private) | `profiles` |

---

### New Components

| Component | File | Type | Description |
|-----------|------|------|-------------|
| `FeedList` | `src/components/feed/FeedList.tsx` | Client Component | Renders feed entries with optimistic like toggle |
| `FollowButton` | `src/components/social/FollowButton.tsx` | Client Component | Follow/Unfollow/Requested toggle button |
| `UserList` | `src/components/social/UserList.tsx` | Client Component | Reusable user list with follow buttons (used by followers/following pages) |
| `UserProfileActions` | `src/components/social/UserProfileActions.tsx` | Client Component | Three-dot menu with block/report actions |
| `ExploreSearch` | `src/components/explore/ExploreSearch.tsx` | Client Component | Search input with debounce, results grouped by type |

---

### Feed Query Structure

The feed query in `fetchFeed()` works in 6 steps:

1. **Get following IDs:** Query `follows` table for all users the current user follows (`status = 'active'`). Include self in the feed user list.
2. **Get blocked IDs:** Query `blocks` table for both directions (blocker or blocked). These users' entries are excluded from the feed.
3. **Fetch event logs:** Query `event_logs` for all feed user IDs, excluding `privacy = 'hide_all'` entries. Ordered by `created_at DESC` with pagination via `range()`. Joins: `venues(name)`, `leagues(slug, name)`, `events(scores, teams, tournament)`.
4. **Fetch author profiles:** Get profiles for all unique `user_id` values in the results. Map to `author` object on each entry.
5. **Fetch like status:** Query `likes` table for the current user's likes on the fetched log IDs. Produces a `liked_by_me` boolean per entry.
6. **Filter blocked:** Remove entries from blocked users.

---

### Follow/Unfollow Implementation

**Approach:** Optimistic UI with server confirmation.

**Follow flow:**
1. User clicks Follow button
2. `followUser()` checks `profiles.is_private` for the target user
3. If public: inserts into `follows` with `status = 'active'` → instant follow
4. If private: inserts with `status = 'pending'` → "Requested" state
5. Uses `upsert` with `onConflict: 'follower_id,following_id'` to handle re-follows after unfollowing

**Unfollow flow:**
1. User clicks Following/Requested button
2. Optimistically updates local state to unfollowed
3. `unfollowUser()` deletes the `follows` row
4. On error: reverts to previous state

**Button states:**
- Not following: orange "Follow" button
- Following: muted "Following" button, hover turns red "Unfollow"
- Pending: muted "Requested" button, click cancels

---

### Private Profile Gating

**How it works:**

1. `/user/[username]` page loads the profile via `fetchUserProfileByUsername()`, which includes `is_private: boolean`
2. Checks `fetchFollowRelationship()` between the current user and the profile user
3. If `is_private = true` AND `isFollowing = false`:
   - Shows ProfileHeader + FollowButton + StatsRow only
   - Below stats, shows a lock icon with "This account is private" message
   - BigFour, ActivityChart, PinnedLists, and Timeline are NOT rendered
4. If `is_private = false` OR `isFollowing = true`:
   - Full profile is rendered with all sections

**Block gating:**
- `checkBlocked()` runs before any profile data is fetched
- If either user has blocked the other, returns "This profile is not available" immediately

**Own profile redirect:**
- If `profile.id === user.id`, redirects to `/profile` to avoid showing the Follow button on your own profile

---

### Search Implementation

**File:** `src/components/explore/ExploreSearch.tsx`

**Tables searched:**
- `profiles` — by `username` or `display_name` using `ilike('%query%')`
- `venues` — by `name` or `city` using `ilike('%query%')`, filtered to `status = 'active'`
- `teams` — by `name` or `short_name` using `ilike('%query%')`, joins `leagues(name, slug)` for league display

**Debouncing:** 300ms debounce using `useRef<ReturnType<typeof setTimeout>>`. On each keystroke, the previous timer is cleared and a new 300ms timer is set. Loading indicator shown during the async search.

**Result limit:** 8 per type (configurable via `limit` parameter).

**Indexes used:**
- No dedicated trigram index is used — all searches use `ilike` which leverages sequential scan. The `gin_trgm_ops` indexes on `venues.name`, `profiles.username`, `profiles.display_name`, and `teams.name` exist in the schema but `ilike` doesn't use them. Switching to `similarity()` or the `%` operator would enable fuzzy matching.

**Result display:** Results are grouped under "Users", "Venues", "Teams" section labels. Users show avatar + name + @username with link to `/user/[username]`. Venues show map pin icon + name + city/state with link to `/venue/[id]`. Teams show league emoji + name + league name (no detail page yet, rendered as static items).

---

### Like Toggle Implementation

**Files modified:**
- `src/components/TimelineCard.tsx` — Added `liked` prop for visual state (filled red heart vs outline)
- `src/components/feed/FeedList.tsx` — Manages like state with optimistic updates

**How it works:**
1. `FeedList` maintains entries in local state
2. On like click: immediately updates `liked_by_me` and `like_count` in local state (optimistic)
3. Calls `toggleLike()` which either inserts or deletes from the `likes` table
4. On error: reverts to previous state

**How like_count stays in sync:**
- Database triggers `trg_like_insert` and `trg_like_delete` on the `likes` table auto-increment/decrement `event_logs.like_count`
- The optimistic UI increment/decrement mirrors what the trigger does
- On next page load, the server-fetched `like_count` reflects the trigger-updated value

**Visual states:**
- Unliked: outline heart icon, stroke `#5A5F72`, count in muted text
- Liked: filled heart icon, fill + stroke `#F87171` (red-400), count in red-400

---

### Comment CRUD and Permission Checks

**Modified files:**
- `src/lib/queries/event.ts` — `deleteComment()` now accepts optional `logOwnerId` parameter
- `src/components/event/CommentsSection.tsx` — Accepts `logOwnerId` prop, shows delete button for both comment authors and log owners

**Post flow:** Unchanged from Session 4. `postComment()` validates non-empty body, inserts into `comments`, triggers auto-increment of `comment_count`.

**Delete flow — enhanced permissions:**
1. If `logOwnerId === userId`: the current user owns the log entry → can delete ANY comment on their log. Deletes by `comment.id` only (no `user_id` filter).
2. If `logOwnerId !== userId`: standard behavior → can only delete own comments. Deletes by `comment.id + user_id` filter.
3. The delete button now appears when `comment.user_id === userId` OR `logOwnerId === userId`.

**Trigger sync:** `comment_count` on `event_logs` is auto-decremented by the `trg_comment_delete` trigger regardless of who performs the deletion.

---

### How Profile Page Handles "Own" vs "Other User" Mode

**Own profile** (`/profile`):
- Server component fetches data using `supabase.auth.getUser()` → `user.id`
- No FollowButton or UserProfileActions rendered
- StatsRow links to `/profile/followers` and `/profile/following`
- Edit controls can be added (not yet implemented)

**Other user's profile** (`/user/[username]`):
- Fetches profile by username via `fetchUserProfileByUsername()`
- If `profile.id === user.id` → redirects to `/profile`
- Checks blocked status → shows "not available" if blocked
- Renders FollowButton + UserProfileActions (three-dot menu with block/report)
- StatsRow links to `/user/[username]/followers` and `/user/[username]/following`
- Privacy gating: if private + not following → shows lock message instead of content sections
- Reuses all the same data-fetching functions and profile components (ProfileHeader, StatsRow, BigFourSection, ActivityChart, PinnedLists, Timeline)

**StatsRow update:** Added optional `followersHref` and `followingHref` props (default to `/profile/followers` and `/profile/following`). The other user's profile passes `/user/[username]/followers` etc.

---

### Other Modified Files

| File | Change |
|------|--------|
| `src/components/TimelineCard.tsx` | Added `liked` prop for visual like state. Author row now wrapped in `<Link>` to `/user/[username]`. Timestamp shown in author row. |
| `src/components/profile/StatsRow.tsx` | Added optional `followersHref` and `followingHref` props for customizable link targets. |
| `src/lib/queries/event.ts` | `deleteComment()` now accepts optional `logOwnerId` — log owners can delete any comment on their entries. |
| `src/components/event/CommentsSection.tsx` | Added `logOwnerId` prop. Delete button shows for both comment authors and log owners. |
| `src/app/(app)/event/[id]/page.tsx` | Passes `logOwnerId` to CommentsSection. Attendee rows now link to `/user/[username]`. |
| `src/app/(app)/page.tsx` | Replaced static placeholder with server component fetching feed data. |
| `src/app/(app)/explore/page.tsx` | Replaced static placeholder with ExploreSearch component. |
| `src/app/(app)/profile/followers/page.tsx` | Replaced placeholder with real followers list using UserList. |
| `src/app/(app)/profile/following/page.tsx` | Replaced placeholder with real following list using UserList. |

---

### Known Issues / Incomplete Items

1. **Feed pagination** — `fetchFeed()` supports `offset` parameter but the FeedList component does not implement infinite scroll or "load more" button. Currently limited to 30 entries.

2. **Feed real-time updates** — No Supabase real-time subscription. New entries from followed users only appear on page refresh or re-navigation to the feed tab.

3. **Explore fuzzy search** — Uses `ilike` which provides case-insensitive substring matching but not fuzzy/typo-tolerant matching. The `pg_trgm` GIN indexes exist in the schema but are not leveraged. Switching to `similarity()` or `%` operator would improve search quality.

4. **Team detail pages** — Teams in search results are rendered as static items (no link). There is no `/team/[id]` route. A future session should add team detail pages.

5. **Follow request notifications** — When a private profile receives a follow request, there is no notification mechanism. The `acceptFollowRequest()` function exists but there is no UI for viewing/accepting pending requests.

6. **Unblock UI** — `unblockUser()` function exists but there is no settings page or blocked users list to unblock from. Currently, once blocked, the only way to unblock is via database.

7. **Report review** — Reports are inserted into the `reports` table with `status = 'pending'`, but there is no admin panel to review them.

8. **Profile images** — All avatars use gradient initial fallbacks since Supabase Storage upload is not yet implemented. `avatar_url` is always null.

9. **Like state on profile timeline** — The profile Timeline component does not pass `liked` prop to TimelineCard, so like visual state is not shown on the profile page. The feed page has full like support.

10. **Comments on other users' logs** — The event detail page only shows comments for the current user's log. If viewing an event where another user logged it, their comments are not visible. A future enhancement could show all comments across all logs for an event.

11. **Search result limit** — Each search type is limited to 8 results. There is no "show all" or pagination for search results. For queries that match many results (e.g., searching "New" returns many teams), the user cannot see beyond the first 8.

12. **Block does not retroactively remove likes/comments** — When blocking a user, their existing likes and comments on your event logs remain. Only follow relationships are removed. A future enhancement could clean up social interactions on block.

---

## Session 6 — Onboarding & Polish

**Date:** February 10, 2026
**Scope:** Complete onboarding flow for new users, Big Four drill-through, notification bell with unread badge, settings page, empty states, loading skeletons, error boundaries, responsive layout, and final polish.

---

### Onboarding Flow

**Route:** `/onboarding`
**Detection mechanism:** Two-layer check for first-time users:
1. **Middleware** (`src/lib/supabase/middleware.ts`): On every authenticated request (except auth and onboarding routes), checks `user.user_metadata.onboarding_completed`. If not set, queries `profiles.fav_sport` as a secondary indicator. If neither is truthy, redirects to `/onboarding`.
2. **Signup redirect:** After successful signup, `src/app/(auth)/signup/page.tsx` redirects to `/onboarding` instead of `/`.
3. **Onboarding page guard:** `src/app/(app)/onboarding/page.tsx` checks both `user_metadata.onboarding_completed` and `profile.fav_sport` — if either indicates completion, redirects to `/profile`.

**Completion:** `completeOnboarding()` in `src/lib/queries/onboarding.ts` calls `supabase.auth.updateUser({ data: { onboarding_completed: true } })`, which sets the metadata flag that the middleware checks.

**Component structure:**

```
OnboardingPage (Server Component — src/app/(app)/onboarding/page.tsx)
  └── OnboardingFlow (Client Component — src/components/onboarding/OnboardingFlow.tsx)
       ├── Progress Indicator (4 segments with accent fill)
       ├── Step 0: StepAccount (src/components/onboarding/StepAccount.tsx)
       ├── Step 1: StepBigFour (src/components/onboarding/StepBigFour.tsx)
       ├── Step 2: StepVenues (src/components/onboarding/StepVenues.tsx)
       └── Step 3: StepFirstEvent (src/components/onboarding/StepFirstEvent.tsx)
```

**Step details:**

| Step | Component | Description |
|------|-----------|-------------|
| 0 — Account Setup | `StepAccount` | Edit username with real-time uniqueness validation (400ms debounce), display name, profile photo placeholder. Username validated against `profiles` table excluding current user. Shows check/X status indicators. |
| 1 — Favorites | `StepBigFour` | Select favorite sport (avatar badge, pill-style buttons), then search/autocomplete for favorite team, venue, athlete, event. Each uses `SearchPicker` — a reusable search component with debounced API calls and dropdown results. All picks are optional. Saves to `profiles` table. |
| 2 — Mark Venues | `StepVenues` | Searchable checklist of all 141+ venues from the database. Venues are fetched server-side and passed as props. Users tap to toggle visited status. Running count badge shows marked venues. Search filters client-side by name/city/state. |
| 3 — First Event | `StepFirstEvent` | Optional step. Shows venue buttons from the venues marked in step 2. Tapping a venue navigates to `/log?venueId=X&...&fromOnboarding=1` to pre-fill the log flow. "Go to My Profile" button calls `completeOnboarding()` and navigates to `/profile`. "Skip for now" does the same. |

**Query file:** `src/lib/queries/onboarding.ts`

| Function | Description |
|----------|-------------|
| `checkUsernameAvailable(supabase, username, currentUserId)` | Real-time username uniqueness check |
| `updateProfileSetup(supabase, userId, updates)` | Updates username/display_name on profiles |
| `updateBigFourAndSport(supabase, userId, updates)` | Updates fav_sport, fav_team_id, etc. on profiles |
| `searchTeams(supabase, query)` | Autocomplete search for teams with league name |
| `searchVenuesForOnboarding(supabase, query)` | Autocomplete search for venues |
| `searchAthletes(supabase, query)` | Autocomplete search for athletes |
| `searchEvents(supabase, query)` | Autocomplete search for events (by tournament name and team names) |
| `fetchAllVenues(supabase)` | Fetches all active venues for step 2 |
| `markVenuesVisited(supabase, userId, venueIds)` | Bulk upserts venue_visits with relationship='visited' |
| `completeOnboarding(supabase, userId)` | Sets user_metadata.onboarding_completed = true |

---

### Big Four Drill-Through

**Route:** `/profile/favorites/[category]` where category is `team`, `venue`, `athlete`, or `event`.

**How to access:** Tapping any Big Four card on the profile page navigates to the drill-through. `BigFourSection` now wraps each `BigFourCard` in a `<Link>` to `/profile/favorites/[category]` when `linkable=true` (default).

**Component structure:**

```
BigFourCategoryPage (Server Component — src/app/(app)/profile/favorites/[category]/page.tsx)
  ├── Back header with link to /profile
  ├── Overall Favorite card (from profiles.fav_team_id, etc.)
  └── BigFourDrillThrough (Client Component — src/components/profile/BigFourDrillThrough.tsx)
       └── Per-league rows (NFL, NBA, MLB, NHL, MLS, PGA Tour)
            ├── League icon + name
            ├── Current pick name (or "No pick yet")
            └── Edit/Add button → inline search picker
```

**Data source:** `user_league_favorites` table. Each row stores `(user_id, category, league_id, team_id/athlete_id/venue_id/event_id)` with a unique constraint on `(user_id, category, league_id)`.

**Query file:** `src/lib/queries/bigfour.ts`

| Function | Description |
|----------|-------------|
| `fetchLeagueFavorites(supabase, userId, category)` | Fetches all league favorites for a category, resolves pick names |
| `upsertLeagueFavorite(supabase, userId, category, leagueId, pickId)` | Creates or updates a league favorite |
| `deleteLeagueFavorite(supabase, favoriteId, userId)` | Removes a league favorite |

**Edit flow:** Clicking "Edit" or "Add" on a league row opens an inline search input. Search results appear in a dropdown. Selecting a result calls `upsertLeagueFavorite()` which uses Supabase's `upsert` with `onConflict: "user_id,category,league_id"`. The local state updates optimistically.

---

### Notification System

**Route:** `/notifications`

**Bell icon:** `AppHeader` (`src/components/AppHeader.tsx`) now includes:
- A `<Link>` to `/notifications` wrapping the bell icon
- An unread count badge (accent orange, min-width 16px, shows "99+" for >99)
- Unread count is fetched on mount and polled every 30 seconds via client-side query to `notifications` table where `is_read = false`

**Notification page:** `src/app/(app)/notifications/page.tsx`
- Server component that fetches all notifications and marks unread ones as read on page load
- Back button links to `/` (feed)
- Renders `NotificationList` client component

**Component:** `NotificationList` (`src/components/notifications/NotificationList.tsx`)
- Renders each notification with actor avatar (gradient initial fallback), message, time ago, and unread dot
- Links notifications to relevant pages: follow → user profile, like/comment/companion_tag → event detail
- Empty state shows bell icon with "No Notifications" message
- Time formatting: just now, Xm, Xh, Xd, Xw, or date

**Query file:** `src/lib/queries/notifications.ts`

| Function | Description |
|----------|-------------|
| `fetchNotifications(supabase, userId, limit)` | Fetches notifications with actor profiles |
| `fetchUnreadCount(supabase, userId)` | Count of unread notifications |
| `markNotificationsRead(supabase, userId, notificationIds?)` | Marks specific or all notifications as read |

**Notification types supported:** `like`, `comment`, `follow`, `follow_request_approved`, `companion_tag`, `badge_earned`, `progress_nudge`, `friend_activity`, `friend_milestone`

**Note:** Notifications are read from the existing `notifications` table defined in the schema. The app does not currently create notifications — this requires server-side triggers or edge functions to insert notification rows when likes, comments, follows, etc. occur. The notification UI is fully built and ready to display notifications once they are generated.

---

### Settings Page

**Route:** `/settings`

**How to access:** Settings gear icon in `AppHeader` now links to `/settings`. Back button on settings page links to `/profile`.

**Component structure:**

```
SettingsPage (Server Component — src/app/(app)/settings/page.tsx)
  └── SettingsForm (Client Component — src/components/settings/SettingsForm.tsx)
       ├── Edit Profile section
       │    ├── Display Name (text input)
       │    ├── Bio (textarea, 160 char max with counter)
       │    └── Sport Badge (pill-style sport selector)
       ├── Big Four Favorites section
       │    └── 4 rows (team/venue/athlete/event) → link to /profile/favorites/[category]
       ├── Pinned Lists section
       │    ├── Pinned List 1 (dropdown of system lists)
       │    └── Pinned List 2 (dropdown of system lists)
       ├── Privacy section
       │    ├── Private Profile (toggle switch)
       │    ├── Default Event Privacy (dropdown: show_all, hide_personal, hide_all)
       │    └── Allow Comments (toggle switch)
       ├── Save Changes button (with saved/saving states)
       └── Account section
            ├── Email (read-only display)
            ├── Username (read-only display)
            ├── Log Out (with confirmation dialog)
            └── Note about contacting support for password/account deletion
```

**Query file:** `src/lib/queries/settings.ts`

| Function | Description |
|----------|-------------|
| `fetchSettingsProfile(supabase, userId)` | Fetches profile with all settings fields |
| `updateProfile(supabase, userId, updates)` | Updates profile settings |
| `fetchAvailableLists(supabase)` | Fetches system lists for pinned list dropdowns |

**Toggle switches:** Custom-built CSS toggle switches (no external library). State managed locally, saved on "Save Changes" button click.

**Logout flow:** "Log Out" button reveals a confirmation dialog with Cancel/Log Out buttons. Confirmation calls `supabase.auth.signOut()` and redirects to `/login`.

---

### Empty States

| Context | Trigger | Display |
|---------|---------|---------|
| Profile timeline | No event logs | Stadium icon, "Log Your First Event" heading, CTA button linking to `/log` |
| Feed | No followed users or no entries | People icon, "Find Fans to Follow" heading, CTA button linking to `/explore` |
| Lists | No lists available | Clipboard icon, "No Lists Yet" heading, descriptive text |
| Notifications | No notifications | Bell icon, "No Notifications" heading, descriptive text |

---

### Loading Skeletons & Error Handling

**Skeleton components:** `src/components/Skeleton.tsx`

| Export | Description |
|--------|-------------|
| `SkeletonLine` | Single animated pulse line |
| `SkeletonCard` | Timeline card placeholder with avatar, text lines |
| `SkeletonProfile` | Full profile page skeleton: header, stats grid, Big Four cards, timeline cards |
| `SkeletonFeed` | Feed page skeleton: title + 4 card placeholders |
| `SkeletonList` | Lists page skeleton: title + 6 list item placeholders |

**Loading files:** `loading.tsx` created for:
- `src/app/(app)/loading.tsx` — Feed page loading (uses `SkeletonFeed`)
- `src/app/(app)/profile/loading.tsx` — Profile page loading (uses `SkeletonProfile`)
- `src/app/(app)/lists/loading.tsx` — Lists page loading (uses `SkeletonList`)

**Error boundary:** `src/app/(app)/error.tsx`
- Client component with warning icon, error message display, and "Try Again" button that calls `reset()`
- Catches any unhandled errors in `(app)` route group pages

---

### Responsive Layout & Polish

**Viewport configuration:** `src/app/layout.tsx` now exports a `viewport` object:
- `width: "device-width"`, `initialScale: 1`, `maximumScale: 1`, `userScalable: false`
- `themeColor: "#0D0F14"` (app background for mobile browser chrome)

**CSS additions** (`src/app/globals.css`):
- `@keyframes fadeIn` and `@keyframes slideUp` for page transitions
- `.animate-fade-in` and `.animate-slide-up` utility classes
- `.scrollbar-hide` for hiding scrollbars on venue lists
- `@media (min-width: 640px)` constraint: body max-width 640px with auto margins for desktop centering

**Header updates** (`src/components/AppHeader.tsx`):
- Logo is now a `<Link>` to `/` (feed)
- Bell icon is a `<Link>` to `/notifications` with unread count badge
- Settings icon is a `<Link>` to `/settings`
- Removed unused `ShareIcon`

---

### New Files Created

| File | Type | Description |
|------|------|-------------|
| `src/app/(app)/onboarding/page.tsx` | Server Component | Onboarding page with auth guard |
| `src/app/(app)/onboarding/layout.tsx` | Layout | Onboarding layout wrapper |
| `src/app/(app)/notifications/page.tsx` | Server Component | Notification list page |
| `src/app/(app)/settings/page.tsx` | Server Component | Settings page |
| `src/app/(app)/profile/favorites/[category]/page.tsx` | Server Component | Big Four drill-through |
| `src/app/(app)/loading.tsx` | Loading UI | Feed skeleton |
| `src/app/(app)/profile/loading.tsx` | Loading UI | Profile skeleton |
| `src/app/(app)/lists/loading.tsx` | Loading UI | Lists skeleton |
| `src/app/(app)/error.tsx` | Error UI | Error boundary for app routes |
| `src/components/onboarding/OnboardingFlow.tsx` | Client Component | 4-step onboarding orchestrator |
| `src/components/onboarding/StepAccount.tsx` | Client Component | Username + display name + photo |
| `src/components/onboarding/StepBigFour.tsx` | Client Component | Sport badge + Big Four search pickers |
| `src/components/onboarding/StepVenues.tsx` | Client Component | Searchable venue checklist |
| `src/components/onboarding/StepFirstEvent.tsx` | Client Component | Optional first event with venue shortcuts |
| `src/components/profile/BigFourDrillThrough.tsx` | Client Component | Per-league favorites with inline editing |
| `src/components/notifications/NotificationList.tsx` | Client Component | Notification display list |
| `src/components/settings/SettingsForm.tsx` | Client Component | Settings form with toggles |
| `src/components/Skeleton.tsx` | Component | Loading skeleton primitives |
| `src/lib/queries/onboarding.ts` | Query functions | Onboarding data operations |
| `src/lib/queries/bigfour.ts` | Query functions | League favorites CRUD |
| `src/lib/queries/notifications.ts` | Query functions | Notification queries |
| `src/lib/queries/settings.ts` | Query functions | Settings profile queries |

### Modified Files

| File | Change |
|------|--------|
| `src/app/(auth)/signup/page.tsx` | Redirect to `/onboarding` after signup instead of `/` |
| `src/lib/supabase/middleware.ts` | Added onboarding detection: checks `user_metadata.onboarding_completed` and `profiles.fav_sport`, redirects to `/onboarding` if needed |
| `src/components/AppHeader.tsx` | Added notification bell badge with unread count (30s polling). Logo, bell, settings now Link components. Removed ShareIcon. |
| `src/components/profile/BigFourSection.tsx` | Added `linkable` prop. Each BigFourCard wrapped in `<Link>` to drill-through page. |
| `src/components/profile/Timeline.tsx` | Enhanced empty state with icon, heading, and CTA to log flow |
| `src/components/feed/FeedList.tsx` | Enhanced empty state with icon, heading, and CTA to explore |
| `src/app/(app)/lists/page.tsx` | Enhanced empty state with icon, heading, and descriptive text |
| `src/app/layout.tsx` | Added `viewport` export with device-width, theme-color, no user-scalable |
| `src/app/globals.css` | Added animation keyframes, scrollbar-hide, desktop max-width media query |

---

### Known Issues / Remaining Work

1. **Notification generation** — The notification UI is fully built but notifications are not currently generated. Server-side triggers or Supabase edge functions are needed to insert notification rows when likes, comments, follows, companion tags, etc. occur. The `notifications` table exists in the schema with proper RLS policies.

2. ~~**Avatar upload**~~ — **RESOLVED.** Profile photo upload is now fully implemented via Supabase Storage `avatars` bucket. See "Session 6 Addendum — Avatar Upload & Bug Fixes" below.

3. **Big Four images** — BigFourCard still uses gradient color placeholders instead of real team/venue/athlete photos. Would need image URLs on the reference data tables or a third-party sports image API.

4. **Password change / account deletion** — Settings page shows these as "contact support" items. Supabase provides `updateUser({ password })` for password changes and `auth.admin.deleteUser()` for account deletion, but these need dedicated UI and confirmation flows.

5. **Email change** — Would need `supabase.auth.updateUser({ email })` with email verification flow.

6. **Onboarding middleware performance** — The middleware queries `profiles.fav_sport` on every request for users without the metadata flag. For existing test users (created before onboarding was implemented), this query runs on every page load until they either complete onboarding or manually have `fav_sport` set. A migration to set the metadata flag for existing users would eliminate this.

7. **Real-time notifications** — Currently uses 30-second polling in AppHeader. Supabase real-time subscriptions on the `notifications` table would provide instant updates. Subscribe to `INSERT` events where `user_id = current_user.id`.

8. **Blocked users list** — Settings page doesn't include a "Blocked Users" section for viewing/unblocking. The `unblockUser()` function exists in `src/lib/queries/social.ts` but has no UI.

9. **Feed pagination / infinite scroll** — Feed is limited to 30 entries with no "load more" or infinite scroll. The `fetchFeed()` function supports `offset` parameter but the FeedList component doesn't use it.

10. **Team detail pages** — Teams in search results and explore are still not linkable. No `/team/[id]` route exists.

11. **Generated TypeScript types** — Still using `as unknown as Type` casts for Supabase query results. Running `supabase gen types` would provide compile-time type safety.

12. **Photo upload on event logs** — The photo area in StepDetails (log flow step 4) is still a visual placeholder. No Supabase Storage integration for event photos.

13. ~~**Edit event log**~~ — **RESOLVED.** The edit button now loads the existing log data and pre-fills the details step for updating. See "Session 6 Addendum" below.

14. **Onboarding for existing users** — Test users created before onboarding will be redirected to onboarding on every page load because they don't have the metadata flag or fav_sport set. They need to either complete onboarding or have their profiles manually updated.

---

### Current State Summary

BoxdSeats is a fully functional sports event logging and social platform built with Next.js 15, Supabase, and Tailwind CSS v4. The app includes:

**Core Features (complete):**
- Email/password authentication with protected routes
- 4-step event logging flow with venue search, date picker, event matching, and details (rating, notes, companions, privacy, rooting interest, outcome)
- Full profile with avatar, stats, Big Four showcase, 12-month activity chart, pinned list progress, and timeline with league filtering
- Social system: follow/unfollow with pending requests for private profiles, block/report
- Feed page showing entries from followed users with optimistic like toggle
- Explore search across users, venues, and teams
- Venue detail pages with visit history, home teams, community stats, and timeline
- Event detail pages with scoreboard, user log, attendees, and comments
- Lists index and detail pages with progress tracking (venue and event-based)
- Cross-navigation links between all entities (events, venues, user profiles, lists)

**Session 6 Features (complete):**
- 4-step onboarding flow for new users (account setup, Big Four + sport badge, mark venues, optional first event)
- Automatic onboarding detection via middleware with redirect
- Big Four drill-through showing per-league favorites with inline editing
- Notification bell with unread count badge in header
- Full notification list page with mark-as-read on view
- Settings page with profile editing, sport badge, pinned lists, privacy controls, and logout
- Empty states for profile (no events), feed (no follows), lists (no lists), notifications (empty)
- Loading skeletons for feed, profile, and lists pages
- Error boundary for unhandled errors
- Responsive layout with mobile-first design (390px target), desktop max-width constraint
- CSS animations for page transitions
- Viewport meta tag with theme color for mobile browser chrome

**Architecture:**
- 20 page routes across auth, app shell, profile, social, content, and settings
- 37 components across 8 component directories
- 8 query files with 40+ exported query/mutation functions
- Server Components for data fetching, Client Components for interactivity
- Supabase RLS policies enforce privacy and access control at the database level
- Database triggers maintain denormalized counts (likes, comments) and auto-create venue visits

**Database:** 18+ tables with full reference data (6 leagues, 153 teams, 141 venues, 24 athletes, 169 events), 5 test users with seeded event logs, follows, likes, comments, and companion tags.

---

## Session 6 Addendum — Avatar Upload & Bug Fixes

**Date:** February 10, 2026
**Scope:** Profile photo upload via Supabase Storage, edit event log bug fix, Big Four featured favorite selector.

---

### Avatar Upload — Supabase Storage

**Bucket:** `avatars` (public)

**Required Supabase setup** (run in Supabase Dashboard → SQL Editor):
```sql
-- Create the avatars bucket (public so images are accessible via URL)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to update/overwrite their own avatar
CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read access to all avatars
CREATE POLICY "Public avatar read access"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');
```

**File path pattern:** `avatars/{user_id}/avatar.jpg` — each user gets one avatar file that is overwritten on re-upload.

**Image processing** (`src/lib/avatar.ts`):
- **Validation:** Accepts JPG, PNG, WebP; max 5MB
- **Resize:** Client-side Canvas API crops to center square, scales to 400×400px
- **Output:** JPEG at 85% quality (~30-80KB typical)
- **Upload:** Uses `supabase.storage.from("avatars").upload()` with `upsert: true`
- **URL:** Public URL with cache-busting `?v=timestamp` query param
- **Profile update:** After upload, updates `profiles.avatar_url` with the public URL

**Reusable component:** `src/components/AvatarUpload.tsx`
- Shows current avatar (or gradient initial fallback)
- Hover overlay with camera icon
- Click opens file picker
- Shows spinner during upload
- Error messages for validation failures
- `onUploadComplete` callback prop for parent components

**Integration points:**
1. **Settings page** (`src/components/settings/SettingsForm.tsx`): AvatarUpload at top of "Edit Profile" section
2. **Onboarding step 1** (`src/components/onboarding/StepAccount.tsx`): AvatarUpload replaces the "coming soon" placeholder

**Next.js image config:** `next.config.ts` updated with `remotePatterns` for the Supabase Storage hostname, enabling future migration to `next/image` if desired. Currently uses standard `<img>` tags consistent with the rest of the app.

---

### Avatar Display Locations

All components that render user avatars follow the same pattern: show `<img>` if `avatar_url` exists, otherwise show gradient initial fallback.

| Component | Size | Notes |
|-----------|------|-------|
| `ProfileHeader.tsx` | 72×72px | Profile page header |
| `UserList.tsx` | 40×40px | Followers/following lists |
| `TimelineCard.tsx` | 32×32px | Feed author rows |
| `CommentsSection.tsx` | 28×28px | Comment authors |
| `ExploreSearch.tsx` | 36×36px | Search result users |
| `NotificationList.tsx` | 40×40px | Notification actors (was initial-only, now fixed) |
| `event/[id]/page.tsx` | 32×32px | Event attendee rows |
| `venue/[id]/page.tsx` | 32×32px | Venue community friends |
| `StepDetails.tsx` | 24×24px | Companion tag search results |

**Gradient fallback:** `linear-gradient(135deg, #D4872C 0%, #7B5B3A 100%)` with white initial letter (uppercase first char of display_name or username).

---

### Edit Event Log Fix

**Bug:** The "Edit" button on event detail pages linked to `/log?edit={logId}` but the log flow ignored the `edit` parameter and always started a new log.

**Fix:**

| File | Change |
|------|--------|
| `src/lib/queries/log.ts` | Added `fetchEventLogForEdit()` — fetches log with venue, event (teams/league), and companions. Added `updateEventLog()` — updates existing log and replaces companion tags. |
| `src/app/(app)/log/page.tsx` | Reads `edit` search param. When present, fetches existing log and passes to `LogFlow` as `editLog` prop. |
| `src/components/log/LogFlow.tsx` | Accepts `editLog` prop. In edit mode: starts at step 4 with all fields pre-filled, uses `updateEventLog()` instead of `saveEventLog()`, shows "EVENT UPDATED" on success, redirects back to event detail page. |
| `src/components/log/StepDetails.tsx` | Accepts `initialValues` and `isEditMode` props. Pre-fills rating, rooting team, seat location, notes, companions, and privacy from existing data. Button shows "UPDATE EVENT". |

---

### Big Four Featured Favorite Selector

**Feature:** Users can now choose which league favorite is "featured" (displayed on their profile Big Four cards) by tapping a star icon on the drill-through page.

| File | Change |
|------|--------|
| `src/lib/queries/bigfour.ts` | Added `setFeaturedFavorite()` — updates `profiles.fav_team_id` / `fav_venue_id` / `fav_athlete_id` / `fav_event_id` with the selected pick ID. |
| `src/components/profile/BigFourDrillThrough.tsx` | Added `featuredPickId` prop and star icon button per league row. Filled amber star = current featured; empty star = tap to set. |
| `src/app/(app)/profile/favorites/[category]/page.tsx` | Passes `featuredPickId` from profile to drill-through component. Added hint text explaining the star interaction. Card label changed from "Overall Favorite" to "Featured Favorite". |

---

### New Files Created

| File | Type | Description |
|------|------|-------------|
| `src/lib/avatar.ts` | Utility | Image validation, Canvas resize/crop, Supabase Storage upload, profile update |
| `src/components/AvatarUpload.tsx` | Client Component | Reusable avatar upload with preview, hover overlay, file picker, error handling |

### Modified Files

| File | Change |
|------|--------|
| `next.config.ts` | Added `images.remotePatterns` for Supabase Storage hostname |
| `src/components/settings/SettingsForm.tsx` | Added AvatarUpload component at top of Edit Profile section |
| `src/components/onboarding/StepAccount.tsx` | Replaced photo placeholder with AvatarUpload component |
| `src/components/notifications/NotificationList.tsx` | Fixed actor avatar to render `<img>` when `avatar_url` exists instead of always showing initial |
| `src/components/log/LogFlow.tsx` | Added edit mode support with `editLog` prop |
| `src/components/log/StepDetails.tsx` | Added `initialValues` and `isEditMode` props for pre-filling edit data |
| `src/app/(app)/log/page.tsx` | Reads `edit` search param and fetches existing log for edit mode |
| `src/lib/queries/log.ts` | Added `fetchEventLogForEdit()`, `updateEventLog()`, and `EditableEventLog` type |
| `src/lib/queries/bigfour.ts` | Added `setFeaturedFavorite()` function |
| `src/components/profile/BigFourDrillThrough.tsx` | Added star button for setting featured favorite |
| `src/app/(app)/profile/favorites/[category]/page.tsx` | Passes featured pick ID, added hint text |

---

## Session 7 — Venue Visit Toggle & User-Created Lists

**Date:** February 10, 2026
**Scope:** Venue visited/want-to-visit toggle, want-to-visit list page, user-created lists with CRUD, follow, fork, and reorganized lists tab.

---

### Venue Visit Status Toggle

**Feature:** Users can mark a venue as "visited" or "want to visit" directly from the venue detail page without logging a full event.

**Component:** `src/components/venue/VenueStatusToggle.tsx` (Client Component)

**Props:** `venueId`, `userId`, `initialStatus` (null | 'visited' | 'want_to_visit'), `hasEventLogs` (boolean)

**Behavior:**
- Two side-by-side buttons: "Visited" (check-circle icon, green when active) and "Want to Visit" (bookmark icon, accent orange when active)
- Optimistic state management with revert on error
- When `hasEventLogs` is true: shows a locked green "Visited" badge (non-toggleable, since the `auto_visit_venue` DB trigger would recreate it)
- When `hasEventLogs` is false: both buttons shown, click toggles on/off or switches between states

**Query functions added to `src/lib/queries/venue.ts`:**

| Function | Description |
|----------|-------------|
| `fetchVenueVisitStatus(supabase, userId, venueId)` | Returns current status: `'visited'`, `'want_to_visit'`, or `null` |
| `upsertVenueVisit(supabase, userId, venueId, relationship)` | Sets or switches venue visit status via upsert |
| `removeVenueVisit(supabase, userId, venueId)` | Deletes the venue_visit record |

**Integration:** Venue detail page (`src/app/(app)/venue/[id]/page.tsx`) fetches status in parallel `Promise.all`, renders toggle between hero header and "Your History" section.

---

### Want to Visit List

**Route:** `/lists/want-to-visit`

Venues marked as "want to visit" appear as a bucket list card at the top of the Lists tab. The card only renders when count > 0.

**Query functions added to `src/lib/queries/lists.ts`:**

| Function | Description |
|----------|-------------|
| `fetchWantToVisitCount(supabase, userId)` | Count of want_to_visit venue_visits |
| `fetchWantToVisitVenues(supabase, userId)` | Full venue list with name, city, state |

**Auto-removal:** When a venue is marked as "Visited" (via toggle or event logging), the DB upsert overwrites `want_to_visit` with `visited`, removing it from the list automatically.

---

### User-Created Lists

**New Page Routes:**

| Route | File | Type | Description |
|-------|------|------|-------------|
| `/lists/create` | `src/app/(app)/lists/create/page.tsx` | Server Component | Create list form |
| `/lists/[id]/edit` | `src/app/(app)/lists/[id]/edit/page.tsx` | Server Component | Edit list (owner only, redirects non-owners) |

**New Components:**

| Component | File | Type | Description |
|-----------|------|------|-------------|
| `CreateListForm` | `src/components/lists/CreateListForm.tsx` | Client Component | Name, description, sport selector, venue search to add items |
| `EditListForm` | `src/components/lists/EditListForm.tsx` | Client Component | Edit name/description, add/remove items, delete list with confirmation |
| `ListActions` | `src/components/lists/ListActions.tsx` | Client Component | Follow/unfollow toggle, fork button, edit button (owner only) |

---

### Create List Flow

1. User taps "Create" button in Lists tab header
2. Form collects: list name (required), description (optional), sport (optional pill selector)
3. Venue search input with 300ms debounce to add venues — results filtered to exclude already-added items
4. Added venues shown as numbered list with X button to remove
5. "Create List" button saves the list and all items, then navigates to the new list detail page

**Data flow:**
- `createList()` inserts into `lists` with `source: 'user'`, `created_by: userId`
- For each added venue: `addListItem()` inserts into `list_items` with auto-incrementing `display_order`
- `item_count` on the list is updated after each add/remove via counting query

---

### List Management (Edit)

- Owner sees "Edit" button on list detail page via `ListActions` component
- Edit page pre-fills name, description, and existing items
- Items can be added via venue search or removed with X button (live mutations, not batched)
- `removeListItem()` deletes from `list_items` and recounts `item_count`
- "Delete List" button with two-step confirmation (Cancel / Delete)
- `deleteList()` cascades to list_items via FK constraint

---

### Follow / Unfollow Lists

- Non-owner users see a Follow/Unfollow toggle button on list detail pages
- Optimistic state management matching the FollowButton pattern
- `followList()` inserts into `list_follows` (unique constraint on `user_id, list_id`)
- `unfollowList()` deletes from `list_follows`
- Followed lists appear under "Following" section on the Lists tab with creator attribution

---

### Fork Lists

- All users see a "Fork" button on any list detail page
- `forkList()` creates a new list with `source: 'user'`, `forked_from: originalListId`, copies all `list_items`
- Fork is fully independent — changes to original don't affect the fork
- After forking, user is navigated to their new forked list

---

### Lists Tab Reorganization

The Lists tab (`/lists`) now shows multiple sections:

1. **Header:** "LISTS" title + "Create" button (accent orange, top right)
2. **Want to Visit** (conditional, only if count > 0): Accent-bordered card with bookmark icon and count
3. **My Lists** (conditional): User-created lists with progress bars
4. **Following** (conditional): Lists from other users with "by @username" subtitle
5. **Challenges**: System lists with sport emoji icons and progress bars

Each section uses `SectionLabel` component for consistent heading style. All list cards use a shared `ListCard` helper function with consistent styling.

---

### List Detail Page Updates

The list detail page (`/lists/[id]/page.tsx`) now includes:
- Creator attribution for user-created lists (links to creator's profile)
- `ListActions` component below header with Follow/Fork/Edit buttons
- `checkListFollow()` query added to `Promise.all` for initial follow state

---

### Query Functions Added to `src/lib/queries/lists.ts`

| Function | Description |
|----------|-------------|
| `fetchUserLists(supabase, userId)` | User's own lists with progress |
| `fetchFollowedLists(supabase, userId)` | Lists the user follows with creator info and progress |
| `computeListProgress(supabase, userId, lists)` | Shared helper: calculates visited count for venue/event lists |
| `createList(supabase, userId, data)` | Insert new list with `source: 'user'` |
| `updateList(supabase, userId, listId, updates)` | Update name/description (owner check via `.eq("created_by")`) |
| `deleteList(supabase, userId, listId)` | Delete list (owner + source='user' check) |
| `addListItem(supabase, listId, item)` | Add item with auto display_order, updates item_count |
| `removeListItem(supabase, listId, itemId)` | Remove item, recounts item_count |
| `followList(supabase, userId, listId)` | Insert into list_follows |
| `unfollowList(supabase, userId, listId)` | Delete from list_follows |
| `checkListFollow(supabase, userId, listId)` | Returns boolean |
| `forkList(supabase, userId, originalListId)` | Copies list + items with `forked_from` reference |
| `searchVenuesForList(supabase, query, limit)` | Venue search for adding to lists |

**`ListDetail` type updated** to include `source`, `created_by`, `creator_username`, `creator_display_name`, `forked_from`.

**`fetchListDetail` updated** to join `profiles` table for creator info.

---

### New Files Created

| File | Type | Description |
|------|------|-------------|
| `src/app/(app)/lists/create/page.tsx` | Server Component | Create list page |
| `src/app/(app)/lists/[id]/edit/page.tsx` | Server Component | Edit list page (owner only) |
| `src/app/(app)/lists/want-to-visit/page.tsx` | Server Component | Want to visit venue list |
| `src/components/lists/CreateListForm.tsx` | Client Component | Create list form with venue search |
| `src/components/lists/EditListForm.tsx` | Client Component | Edit list form with add/remove items and delete |
| `src/components/lists/ListActions.tsx` | Client Component | Follow/fork/edit action buttons |
| `src/components/venue/VenueStatusToggle.tsx` | Client Component | Visited/want-to-visit toggle |

### Modified Files

| File | Change |
|------|--------|
| `src/lib/queries/venue.ts` | Added `fetchVenueVisitStatus`, `upsertVenueVisit`, `removeVenueVisit`, `VenueVisitStatus` type |
| `src/lib/queries/lists.ts` | Added 13 new functions, updated `ListDetail` type and `fetchListDetail` to include creator info, added `UserListSummary` type |
| `src/app/(app)/venue/[id]/page.tsx` | Added VenueStatusToggle between hero and history |
| `src/app/(app)/lists/page.tsx` | Rewritten with sections (My Lists, Following, Challenges), Create button, ListCard helper |
| `src/app/(app)/lists/[id]/page.tsx` | Added ListActions, creator attribution, checkListFollow query |

---

### Known Issues / Remaining Work

1. **Event-type user lists** — The create form currently only supports venue lists. The `list_type` field is hardcoded to `'venue'`. Adding event-type list creation would require an event tag search interface.

2. **List reordering** — Items are ordered by `display_order` but there is no drag-and-drop or reorder UI. Items are appended in the order they are added.

3. **List item cap** — List detail page shows first 8 remaining items with "+ X more". No "Show All" expansion.

4. **Explore search for lists** — User-created lists are not surfaced in the Explore search. The `searchAll()` function in `social.ts` searches users, venues, and teams but not lists.

5. **Profile lists section** — Other users' profiles don't show their created lists. A "Lists" section on the user profile page would make lists more discoverable.

6. **Fork attribution** — The `forked_from` field is stored but not displayed in the UI. A "Forked from [original list]" label could be added.

7. **List privacy** — All user-created lists from public profiles are visible to everyone (via RLS policy). There is no per-list privacy toggle.

8. **Notifications** — No notifications are generated when a user follows, forks, or comments on a list. The notification infrastructure exists but is not wired to list actions.

9. **item_count sync** — The `lists.item_count` field is manually updated in application code after add/remove. A database trigger would be more reliable but is not yet implemented.
