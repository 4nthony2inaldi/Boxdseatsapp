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
