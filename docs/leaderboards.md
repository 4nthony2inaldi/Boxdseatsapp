# Leaderboards — design doc

A global, heavily-filterable ranking of fans by games logged. The raw global
list is just the entry point; the value is that anyone can slice it — by sport,
team seen, venue, and scope (global / their home city / people they follow) — to
find the subset where they rank. Many small winnable races inside one surface,
rather than a single global board only the top few care about.

## What — the metric and its definitions

Rank = **count of a user's logged games matching the current filters**, over the
selected time window, highest first.

Filters compose (AND):
- **Sport** — `event_logs.sport = X` (stored directly on the log).
- **Venue** — `event_logs.venue_id = V` (stored directly on the log).
- **Team seen** — games featuring that team on **either side**: the log's event
  has `home_team_id = T OR away_team_id = T` (needs the `events` join). "Team
  seen," not the user's favorite team — a road game you attended counts.

Time window:
- **All-time** — no date bound.
- **Last 12 months** — rolling: `event_date >= today − 12 months`. Rolling beats
  calendar-year (always a live window). Uses the local event date (UTC-5, per
  CLAUDE.md) so it agrees with the event side.

Scope (who is eligible to appear):
- **Global (default)** — all **public** profiles.
- **My City** — public profiles whose `home_city` equals the viewer's
  `home_city` (the field that already powers "Around You"). Note: this filters
  the *people*, distinct from the Venue filter which filters the *games*.
- **Following** — public profiles the viewer actively follows.

The viewer's **own row is always shown** (with rank + count), even if their
profile is private — they can see where they stand; they just aren't listed to
others.

## Privacy rules (the hard constraint)

- **Public = listed; private = never listed to others.** Boards show public
  profiles only. This is the "if you're public you're opted in" rule — surfaced
  in the privacy setting copy so going public isn't a surprise.
- **Private users can still view boards and their own rank**, privately.
- **Blocked users are excluded** from each other's board views (either
  direction), via the existing block check.
- Only public-safe fields are returned per ranked user: display name, username,
  avatar, and the count. No private data.
- **Following excludes private accounts you follow (v1 default).** Consistent
  with "public = opted in." (Open question: allow private-but-followed accounts
  to appear only to their approved followers — deferred; simplest is public-only
  everywhere.)

## Where — placement

The bottom bar is full and well-formed (Feed · Explore · Log(+) · Lists ·
Profile); a sixth tab isn't warranted and Log is sacred. So: **one canonical
home + contextual entry points that deep-link in pre-filtered.** (No feed card —
the feed is intentionally kept uncluttered.)

**Canonical home — Explore becomes a "Discover" hub.** A segmented control at the
top: **Search** (current behaviour, default segment) | **Leaderboards**. Gives
leaderboards a permanent, findable home with no new tab and no disruption to
search.

**Entry points (all land on the same screen, pre-filtered):**
- **Profile / passport — "Where you rank" card.** A compact card showing the
  viewer's standing across a few slices, e.g. "#3 Following · #8 Philadelphia ·
  #1,204 Global," each tapping into the board at that scope with the viewer
  highlighted. Makes the passport feel competitive; it's where fans check
  standing.
- **Team page — "Top fans →"** opens the board with Team = that team.
- **Venue page — "Most games logged here →"** opens the board with Venue = that
  venue.

## The screen

- **Controls (top):** Scope segmented (Global / My City / Following); Time toggle
  (All-time / Last 12 months); Filter chips (Sport, Team, Venue) that open
  pickers; an active-filters summary with a Reset.
- **List:** ranked rows — rank #, avatar, display name (@username), count. Tap a
  row → that user's profile (respecting privacy/blocks).
- **Your row:** pinned (sticky) with your rank + count; tapping jumps to your
  position and shows the few fans just above and below — so everyone sees a
  reachable target, not just a top-10 they can't crack.
- **States:**
  - *Thin filter* (few matches): "Only N fans match — climb the board." Still
    show what's there.
  - *No home city set*: My City disabled with a "Set your home city" link to
    settings.
  - *Following with no follows*: prompt to follow people.
- **Copy:** encouraging, never shaming (and with no feed card, there's no
  "you dropped to #9" push at all).

## Data & performance

**No new tables in v1.** But two DB changes are needed (low-risk, checkpointed):

1. **A read-only aggregation function.** RLS scopes a normal user's reads to
   their own + visible rows, so we can't rank across all public users as the
   caller. A `SECURITY DEFINER` RPC (`leaderboard(...)`) runs the aggregation and
   **enforces the public-only + scope + block rules itself**, returning only
   public-safe aggregate rows. (Alternative: a server route using the
   service-role client with the same rules in the query, mirroring the admin
   passport. Either works; the RPC keeps the rules in one place and eases later
   materialization.)
2. **Supporting indexes** for the filter columns:
   `event_logs(sport)`, `event_logs(venue_id)`, `events(home_team_id)`,
   `events(away_team_id)`, `profiles(is_private)`, `profiles(home_city)`. We
   already added `event_logs(user_id, event_date)` (helps the window + grouping).

**Query shape (conceptual):**
```
select el.user_id, count(*) as n
from event_logs el
[join events e on e.id = el.event_id]     -- only when a team filter is set
join profiles p on p.id = el.user_id
where <time window on el.event_date>
  and [el.sport = :sport]
  and [el.venue_id = :venue]
  and [e.home_team_id = :team or e.away_team_id = :team]
  and <scope: p.is_private = false                       -- global
       | (p.is_private = false and p.home_city = :city)  -- my city
       | el.user_id = any(:followed_public_ids)>         -- following
  and el.user_id <> all(:blocked_ids)
group by el.user_id
order by n desc
limit :N
```

- **Your rank** = `1 + (# eligible users with n > your n)`; **neighbors** = the
  window around your rank (fetched separately when you're outside the top N).
- **Ties:** standard competition ranking (1, 2, 2, 4); stable tiebreak by
  earliest account or username so order doesn't jump between loads.
- v1 runs this **live**, capped to top ~100 + your-rank window — fine at current
  user/log volume. **Later:** if it gets slow, precompute per-`(user, dimension)`
  standings into a summary table refreshed on a cron (the materialize-when-needed
  pattern), and cache/precompute ranks.

## Edge cases

- **Deep ranks feel bad.** Consider bucketing below a threshold ("Top 5%")
  instead of an exact "#4,182." Open question.
- **No home city** → My City unavailable, fall copy back to Global/Following.
- **Filter combos with zero matches** → thin-state, never an error.
- **Renamed teams / venue aliases** — team/venue filters key on ids, so aliases
  don't matter here (we pick a canonical team/venue in the picker).
- **Backfill inflation** (once ticket/photo import lands) mostly hits *All-time*;
  the Last-12-months window stays a live, fair race.

## Rollout

- **P0:** the aggregation RPC + supporting indexes; the Explore → Leaderboards
  segment; scope + time toggles; Sport/Team/Venue filters; ranked list + pinned
  "your row + neighbors." Global default.
- **P1:** Profile "Where you rank" card; Team-page and Venue-page entry points.
- **P2:** materialized standings if needed; rank bucketing; possibly
  bucket-list-completion leaderboards as a second metric.

## Success metrics

- Leaderboard opens / return visits.
- Filter usage (are people slicing, or bouncing off the raw global list?).
- Taps from Profile "Where you rank" and team/venue entry points.
- Follows initiated from the board (does comparing drive social graph growth?).

## Open decisions

1. **Following scope:** public-only (v1 default) vs. include private accounts you
   actively follow (shown only to their approved followers)?
2. **Deep ranks:** exact position everywhere, or bucket ("Top 5%") past some cutoff?
3. **Ties tiebreak:** account age vs. username vs. most-recent activity.
4. **Default Explore segment:** keep Search default (proposed) or lead with
   Leaderboards?
