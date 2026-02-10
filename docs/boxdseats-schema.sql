-- ═══════════════════════════════════════════════════════════════
-- BOXDSEATS DATABASE SCHEMA
-- Supabase (PostgreSQL 15+) with Row Level Security
-- Version 1.0 — February 2026
-- ═══════════════════════════════════════════════════════════════

-- ─── EXTENSIONS ───
create extension if not exists "uuid-ossp";
create extension if not exists "postgis";       -- venue coordinates & map
create extension if not exists "pg_trgm";       -- fuzzy text search


-- ═══════════════════════════════════════════════════════════════
-- 1. ENUMS
-- ═══════════════════════════════════════════════════════════════

create type sport_type as enum (
  'football', 'basketball', 'baseball', 'hockey', 'soccer',
  'golf', 'motorsports', 'tennis'
);

create type event_template as enum ('match', 'field');

create type venue_status as enum ('active', 'retired', 'demolished');

create type privacy_tier as enum ('show_all', 'hide_personal', 'hide_all');

create type venue_relationship as enum ('visited', 'want_to_visit');

create type list_type as enum ('venue', 'event');

create type list_source as enum ('system', 'user');

create type follow_status as enum ('active', 'pending');

create type notification_type as enum (
  'like', 'comment', 'follow', 'follow_request_approved',
  'companion_tag', 'badge_earned', 'progress_nudge',
  'friend_activity', 'friend_milestone'
);

create type report_status as enum ('pending', 'reviewed', 'resolved');

create type report_target_type as enum ('user', 'comment', 'event_log');

create type outcome_type as enum ('win', 'loss', 'draw', 'neutral');


-- ═══════════════════════════════════════════════════════════════
-- 2. REFERENCE DATA (seeded, not user-generated)
-- ═══════════════════════════════════════════════════════════════

-- ─── LEAGUES ───
create table leagues (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,                    -- "NFL", "NBA", "PGA Tour"
  slug          text not null unique,             -- "nfl", "nba", "pga-tour"
  sport         sport_type not null,
  event_template event_template not null,         -- match or field
  country       text not null default 'US',
  is_active     boolean not null default true,
  display_order smallint not null default 0,
  created_at    timestamptz not null default now()
);

-- ─── TEAMS ───
create table teams (
  id            uuid primary key default uuid_generate_v4(),
  league_id     uuid not null references leagues(id),
  name          text not null,                    -- "New York Knicks"
  short_name    text not null,                    -- "Knicks"
  abbreviation  text not null,                    -- "NYK"
  city          text not null,                    -- "New York"
  logo_url      text,
  is_active     boolean not null default true,    -- false for relocated/defunct
  created_at    timestamptz not null default now()
);

-- ─── ATHLETES ───
create table athletes (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  sport         sport_type,                       -- primary sport for search/filter
  headshot_url  text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ─── ATHLETE ↔ TEAM (many-to-many, time-bounded) ───
create table athlete_teams (
  id            uuid primary key default uuid_generate_v4(),
  athlete_id    uuid not null references athletes(id),
  team_id       uuid not null references teams(id),
  league_id     uuid not null references leagues(id),
  season_start  smallint not null,                -- e.g., 2024
  season_end    smallint,                         -- null = current
  created_at    timestamptz not null default now()
);

-- ─── VENUES ───
create table venues (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,                    -- current name
  city          text not null,
  state         text,
  country       text not null default 'US',
  location      geography(Point, 4326),           -- PostGIS point
  capacity      integer,
  photo_url     text,
  description   text,
  status        venue_status not null default 'active',
  opened_year   smallint,
  closed_year   smallint,                         -- null if active
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── VENUE ALIASES (historical names for search) ───
create table venue_aliases (
  id            uuid primary key default uuid_generate_v4(),
  venue_id      uuid not null references venues(id) on delete cascade,
  alias_name    text not null,                    -- "Staples Center"
  effective_from date,                            -- when this name started
  effective_to   date,                            -- when it ended (null = was current)
  created_at    timestamptz not null default now()
);

-- ─── VENUE ↔ TEAM (many-to-many, tenancy) ───
create table venue_teams (
  id            uuid primary key default uuid_generate_v4(),
  venue_id      uuid not null references venues(id),
  team_id       uuid not null references teams(id),
  is_primary    boolean not null default true,    -- primary home venue
  season_start  smallint,
  season_end    smallint,                         -- null = current
  created_at    timestamptz not null default now()
);

-- ─── EVENTS (pre-populated game/tournament data) ───
create table events (
  id            uuid primary key default uuid_generate_v4(),
  league_id     uuid not null references leagues(id),
  venue_id      uuid not null references venues(id),
  event_date    date not null,
  event_template event_template not null,
  -- Match fields
  home_team_id  uuid references teams(id),
  away_team_id  uuid references teams(id),
  home_score    smallint,
  away_score    smallint,
  is_draw       boolean default false,
  -- Field event fields
  tournament_name text,                           -- "2026 Masters", "Daytona 500"
  tournament_id   uuid,                           -- self-ref: groups multi-day events
  day_number      smallint,                       -- day 1, 2, 3, 4
  winner_name     text,                           -- tournament winner (for display)
  -- Shared fields
  season          smallint not null,              -- e.g., 2025 (NFL uses year season starts)
  round_or_stage  text,                           -- "Regular Season", "Wild Card", "Final"
  venue_name_at_time text,                        -- venue name when event occurred
  headline        text,                           -- "Brunson 38 pts, Knicks rally"
  is_postseason   boolean not null default false,
  event_tags      text[],                         -- canonical tags for list matching: ['grand_slam', 'us_open']
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── EVENT ATHLETES (field events: who competed) ───
create table event_athletes (
  id            uuid primary key default uuid_generate_v4(),
  event_id      uuid not null references events(id) on delete cascade,
  athlete_id    uuid not null references athletes(id),
  team_id       uuid references teams(id),        -- null for individual sports
  finish_position smallint,                       -- 1st, 2nd, etc.
  is_winner     boolean default false,
  stat_line     text,                             -- "68-70-69-67 (−14)"
  created_at    timestamptz not null default now()
);

-- ─── EVENT ATHLETES (match events: rosters/key performers) ───
create table event_rosters (
  id            uuid primary key default uuid_generate_v4(),
  event_id      uuid not null references events(id) on delete cascade,
  athlete_id    uuid not null references athletes(id),
  team_id       uuid not null references teams(id),
  stat_line     text,                             -- "38 pts, 6 ast, 4 reb"
  is_notable    boolean default false,            -- flagged for "athletes seen"
  created_at    timestamptz not null default now()
);


-- ═══════════════════════════════════════════════════════════════
-- 3. USER DATA
-- ═══════════════════════════════════════════════════════════════

-- ─── PROFILES (extends Supabase auth.users) ───
create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  username        text not null unique,
  display_name    text,
  bio             text,
  avatar_url      text,
  is_private      boolean not null default false,
  default_privacy privacy_tier not null default 'show_all',
  comments_enabled boolean not null default true,
  -- Sport badge (displayed on avatar)
  fav_sport       sport_type,
  -- Big Four featured favorites
  fav_team_id     uuid references teams(id),
  fav_athlete_id  uuid references athletes(id),
  fav_venue_id    uuid references venues(id),
  fav_event_id    uuid references events(id),
  -- Pinned lists on profile
  pinned_list_1_id uuid references lists(id),
  pinned_list_2_id uuid references lists(id),
  -- Metadata
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── USER LEAGUE FAVORITES (Big Four drill-through) ───
create table user_league_favorites (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  category    text not null check (category in ('team', 'venue', 'athlete', 'event')),
  league_id   uuid not null references leagues(id),
  team_id     uuid references teams(id),
  athlete_id  uuid references athletes(id),
  venue_id    uuid references venues(id),
  event_id    uuid references events(id),
  is_featured boolean not null default false,
  created_at  timestamptz not null default now(),
  unique(user_id, category, league_id)
);

-- Ensure exactly one FK is set matching the category
alter table user_league_favorites add constraint check_category_fk check (
  case category
    when 'team' then team_id is not null and athlete_id is null and venue_id is null and event_id is null
    when 'athlete' then athlete_id is not null and team_id is null and venue_id is null and event_id is null
    when 'venue' then venue_id is not null and team_id is null and athlete_id is null and event_id is null
    when 'event' then event_id is not null and team_id is null and athlete_id is null and venue_id is null
  end
);

alter table user_league_favorites enable row level security;
create policy "Anyone can read league favorites"
  on user_league_favorites for select using (true);
create policy "Users manage own league favorites"
  on user_league_favorites for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_league_fav_user on user_league_favorites(user_id);
create index idx_league_fav_user_cat on user_league_favorites(user_id, category);

-- ─── EVENT LOGS (the core user action) ───
-- NOTE: The 'hide_personal' privacy tier hides personal FIELDS (notes, photo,
-- rating, seat, companions) while keeping the event visible. This is enforced
-- at the API/application layer, not RLS. RLS cannot selectively hide columns
-- within a visible row. RLS handles 'hide_all' (entire row hidden) and the
-- profile-level private/public visibility.
create table event_logs (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references profiles(id) on delete cascade,
  event_id        uuid references events(id),     -- null for manual entries
  venue_id        uuid not null references venues(id),
  -- Event context (for manual entries or denormalized lookups)
  event_date      date not null,
  league_id       uuid references leagues(id),
  sport           sport_type,
  -- Personal fields
  rating          smallint check (rating between 1 and 5),
  notes           text,
  photo_url       text,
  seat_location   text,
  privacy         privacy_tier not null default 'show_all',
  -- NOTE: The column default is 'show_all', but the app layer should read
  -- profiles.default_privacy and pass it as the value on insert.
  comments_enabled boolean not null default true,
  -- Rooting interest
  rooting_team_id uuid references teams(id),
  rooting_athlete_id uuid references athletes(id),  -- for field events
  is_neutral      boolean not null default false,
  outcome         outcome_type,                     -- computed: W/L/D/neutral
  -- Manual entry fields
  is_manual       boolean not null default false,
  manual_title    text,                             -- "Yankees vs Red Sox"
  manual_description text,
  -- Denormalized counters (updated via triggers)
  -- NOTE: These fields are writable by the row owner via RLS. The API layer
  -- should EXCLUDE like_count and comment_count from client UPDATE operations
  -- to prevent manual manipulation. Only triggers should modify these values.
  like_count      integer not null default 0,
  comment_count   integer not null default 0,
  -- Metadata
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Prevent duplicate logs for same user + event (manual entries excluded)
create unique index idx_event_logs_no_duplicates
  on event_logs (user_id, event_id) where event_id is not null;

-- ─── COMPANION TAGS ───
create table companion_tags (
  id              uuid primary key default uuid_generate_v4(),
  event_log_id    uuid not null references event_logs(id) on delete cascade,
  tagged_user_id  uuid references profiles(id) on delete set null,  -- null = plain text
  display_name    text not null,                  -- "@kyle" or "my dad"
  created_at      timestamptz not null default now()
);

-- ─── VENUE VISITS (independent of event logs) ───
create table venue_visits (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references profiles(id) on delete cascade,
  venue_id        uuid not null references venues(id),
  relationship    venue_relationship not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, venue_id)
);


-- ═══════════════════════════════════════════════════════════════
-- 4. SOCIAL
-- ═══════════════════════════════════════════════════════════════

-- ─── FOLLOWS ───
create table follows (
  id              uuid primary key default uuid_generate_v4(),
  follower_id     uuid not null references profiles(id) on delete cascade,
  following_id    uuid not null references profiles(id) on delete cascade,
  status          follow_status not null default 'active',
  -- NOTE: Default is 'active' which works for public profiles. For private
  -- profiles, the app layer must set status = 'pending' on insert.
  created_at      timestamptz not null default now(),
  unique (follower_id, following_id),
  check (follower_id != following_id)
);

-- ─── LIKES ───
create table likes (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references profiles(id) on delete cascade,
  event_log_id    uuid not null references event_logs(id) on delete cascade,
  created_at      timestamptz not null default now(),
  unique (user_id, event_log_id)
);

-- ─── COMMENTS ───
create table comments (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references profiles(id) on delete cascade,
  event_log_id    uuid not null references event_logs(id) on delete cascade,
  body            text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── BLOCKS ───
create table blocks (
  id              uuid primary key default uuid_generate_v4(),
  blocker_id      uuid not null references profiles(id) on delete cascade,
  blocked_id      uuid not null references profiles(id) on delete cascade,
  created_at      timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  check (blocker_id != blocked_id)
);

-- ─── REPORTS ───
create table reports (
  id              uuid primary key default uuid_generate_v4(),
  reporter_id     uuid not null references profiles(id) on delete cascade,
  target_type     report_target_type not null,
  target_id       uuid not null,                  -- polymorphic: user/comment/event_log id
  reason          text,
  status          report_status not null default 'pending',
  admin_notes     text,
  created_at      timestamptz not null default now(),
  resolved_at     timestamptz
);


-- ═══════════════════════════════════════════════════════════════
-- 5. LISTS, CHALLENGES & BADGES
-- ═══════════════════════════════════════════════════════════════

-- ─── LISTS ───
create table lists (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,                  -- "All 30 MLB Stadiums"
  description     text,
  list_type       list_type not null,             -- venue or event
  source          list_source not null,           -- system or user
  created_by      uuid references profiles(id) on delete set null,
  forked_from     uuid references lists(id) on delete set null,  -- null if original or parent deleted
  is_featured     boolean not null default false,  -- curated spotlight
  sport           sport_type,                     -- optional: scope to a sport
  league_id       uuid references leagues(id),    -- optional: scope to a league
  item_count      smallint not null default 0,    -- denormalized for display
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── LIST ITEMS ───
create table list_items (
  id              uuid primary key default uuid_generate_v4(),
  list_id         uuid not null references lists(id) on delete cascade,
  -- One of these will be set depending on list_type
  venue_id        uuid references venues(id),
  event_tag       text,                           -- for event lists: "grand_slam", "nfl_wild_card"
  display_name    text not null,                  -- "Fenway Park" or "Grand Slam: Australian Open"
  display_order   smallint not null default 0,
  created_at      timestamptz not null default now()
);

-- ─── LIST FOLLOWS (read-only, stays synced) ───
create table list_follows (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references profiles(id) on delete cascade,
  list_id         uuid not null references lists(id) on delete cascade,
  created_at      timestamptz not null default now(),
  unique (user_id, list_id)
);

-- ─── BADGES ───
create table badges (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references profiles(id) on delete cascade,
  list_id         uuid references lists(id) on delete set null,
  completed_at    timestamptz not null default now(),
  item_count_at_completion smallint not null,      -- "30/30" for legacy tracking
  is_legacy       boolean not null default false,  -- true if list has since expanded
  created_at      timestamptz not null default now(),
  unique (user_id, list_id)
);


-- ═══════════════════════════════════════════════════════════════
-- 6. NOTIFICATIONS
-- ═══════════════════════════════════════════════════════════════

create table notifications (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references profiles(id) on delete cascade,
  type            notification_type not null,
  actor_id        uuid references profiles(id) on delete set null,  -- who triggered it
  target_id       uuid,                           -- polymorphic: event_log, list, etc.
  target_type     text,                           -- 'event_log', 'follow', 'badge', etc.
  message         text,                           -- pre-rendered notification text
  is_read         boolean not null default false,
  created_at      timestamptz not null default now()
);

-- ─── NOTIFICATION PREFERENCES ───
create table notification_preferences (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references profiles(id) on delete cascade,
  type            notification_type not null,
  in_app_enabled  boolean not null default true,
  push_enabled    boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, type)
);


-- ═══════════════════════════════════════════════════════════════
-- 7. INDEXES
-- ═══════════════════════════════════════════════════════════════

-- Profiles
create index idx_profiles_username on profiles using gin (username gin_trgm_ops);
create index idx_profiles_display_name on profiles using gin (display_name gin_trgm_ops);

-- Events
create index idx_events_league_date on events (league_id, event_date desc);
create index idx_events_venue_date on events (venue_id, event_date desc);
create index idx_events_tournament on events (tournament_id) where tournament_id is not null;
create index idx_events_season on events (league_id, season);
create index idx_events_tags on events using gin (event_tags) where event_tags is not null;

-- Event logs
create index idx_event_logs_user_date on event_logs (user_id, event_date desc);
create index idx_event_logs_user_venue on event_logs (user_id, venue_id);
create index idx_event_logs_event on event_logs (event_id) where event_id is not null;
create index idx_event_logs_venue_date on event_logs (venue_id, event_date desc);
create index idx_event_logs_privacy on event_logs (privacy) where privacy != 'hide_all';

-- Companion tags
create index idx_companion_tags_log on companion_tags (event_log_id);
create index idx_companion_tags_user on companion_tags (tagged_user_id) where tagged_user_id is not null;

-- Venue visits
create index idx_venue_visits_user on venue_visits (user_id);
create index idx_venue_visits_venue on venue_visits (venue_id);

-- Venues
create index idx_venues_location on venues using gist (location);
create index idx_venues_name on venues using gin (name gin_trgm_ops);
create index idx_venue_aliases_name on venue_aliases using gin (alias_name gin_trgm_ops);

-- Teams
create index idx_teams_league on teams (league_id);
create index idx_teams_name on teams using gin (name gin_trgm_ops);

-- Athletes
create index idx_athletes_name on athletes using gin (name gin_trgm_ops);
create index idx_athlete_teams_athlete on athlete_teams (athlete_id);
create index idx_athlete_teams_team on athlete_teams (team_id);

-- Social
create index idx_follows_follower on follows (follower_id) where status = 'active';
create index idx_follows_following on follows (following_id) where status = 'active';
create index idx_likes_log on likes (event_log_id);
create index idx_likes_user on likes (user_id);
create index idx_comments_log on comments (event_log_id, created_at desc);
create index idx_blocks_blocker on blocks (blocker_id);
create index idx_blocks_blocked on blocks (blocked_id);

-- Lists
create index idx_list_items_list on list_items (list_id);
create index idx_list_items_venue on list_items (venue_id) where venue_id is not null;
create index idx_list_follows_user on list_follows (user_id);
create index idx_badges_user on badges (user_id);

-- Notifications
create index idx_notifications_user_unread on notifications (user_id, created_at desc) where is_read = false;
create index idx_notifications_user on notifications (user_id, created_at desc);


-- ═══════════════════════════════════════════════════════════════
-- 8. ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════

-- Enable RLS on all tables
alter table profiles enable row level security;
alter table event_logs enable row level security;
alter table companion_tags enable row level security;
alter table venue_visits enable row level security;
alter table follows enable row level security;
alter table likes enable row level security;
alter table comments enable row level security;
alter table blocks enable row level security;
alter table reports enable row level security;
alter table lists enable row level security;
alter table list_items enable row level security;
alter table list_follows enable row level security;
alter table badges enable row level security;
alter table notifications enable row level security;
alter table notification_preferences enable row level security;

-- Reference data: public read
alter table leagues enable row level security;
alter table teams enable row level security;
alter table athletes enable row level security;
alter table athlete_teams enable row level security;
alter table venues enable row level security;
alter table venue_aliases enable row level security;
alter table venue_teams enable row level security;
alter table events enable row level security;
alter table event_athletes enable row level security;
alter table event_rosters enable row level security;

create policy "Reference data is publicly readable"
  on leagues for select using (true);
create policy "Reference data is publicly readable"
  on teams for select using (true);
create policy "Reference data is publicly readable"
  on athletes for select using (true);
create policy "Reference data is publicly readable"
  on athlete_teams for select using (true);
create policy "Reference data is publicly readable"
  on venues for select using (true);
create policy "Reference data is publicly readable"
  on venue_aliases for select using (true);
create policy "Reference data is publicly readable"
  on venue_teams for select using (true);
create policy "Reference data is publicly readable"
  on events for select using (true);
create policy "Reference data is publicly readable"
  on event_athletes for select using (true);
create policy "Reference data is publicly readable"
  on event_rosters for select using (true);

-- ─── PROFILES ───
create policy "Public profiles are viewable by everyone"
  on profiles for select using (
    id = auth.uid()
    or (
      (
        not is_private
        or exists (
          select 1 from follows
          where follower_id = auth.uid()
            and following_id = profiles.id
            and status = 'active'
        )
      )
      and not exists (select 1 from blocks where blocker_id = profiles.id and blocked_id = auth.uid())
      and not exists (select 1 from blocks where blocker_id = auth.uid() and blocked_id = profiles.id)
    )
  );

create policy "Users can update their own profile"
  on profiles for update using (id = auth.uid());

create policy "Users can insert their own profile"
  on profiles for insert with check (id = auth.uid());

-- ─── EVENT LOGS ───
create policy "Users can view public event logs"
  on event_logs for select using (
    -- Own logs: always visible
    user_id = auth.uid()
    -- Public logs from non-blocked, non-private users
    or (
      privacy != 'hide_all'
      and not exists (select 1 from blocks where blocker_id = event_logs.user_id and blocked_id = auth.uid())
      and not exists (select 1 from blocks where blocker_id = auth.uid() and blocked_id = event_logs.user_id)
      and (
        -- Public profile: visible to all
        exists (select 1 from profiles where id = event_logs.user_id and not is_private)
        -- Private profile: visible to approved followers
        or exists (
          select 1 from follows
          where follower_id = auth.uid()
            and following_id = event_logs.user_id
            and status = 'active'
        )
      )
    )
  );

create policy "Users can insert their own event logs"
  on event_logs for insert with check (user_id = auth.uid());

create policy "Users can update their own event logs"
  on event_logs for update using (user_id = auth.uid());

create policy "Users can delete their own event logs"
  on event_logs for delete using (user_id = auth.uid());

-- ─── COMPANION TAGS ───
create policy "Companion tags follow event log visibility"
  on companion_tags for select using (
    exists (
      select 1 from event_logs
      where event_logs.id = companion_tags.event_log_id
        and (
          event_logs.user_id = auth.uid()
          or (
            event_logs.privacy = 'show_all'
            -- Must also pass profile visibility and block checks
            and (
              exists (select 1 from profiles where id = event_logs.user_id and not is_private)
              or exists (
                select 1 from follows
                where follower_id = auth.uid()
                  and following_id = event_logs.user_id
                  and status = 'active'
              )
            )
            and not exists (select 1 from blocks where blocker_id = event_logs.user_id and blocked_id = auth.uid())
            and not exists (select 1 from blocks where blocker_id = auth.uid() and blocked_id = event_logs.user_id)
          )
        )
    )
  );

create policy "Users can manage companion tags on their own logs"
  on companion_tags for insert with check (
    exists (select 1 from event_logs where id = event_log_id and user_id = auth.uid())
  );

create policy "Users can delete companion tags on their own logs"
  on companion_tags for delete using (
    exists (select 1 from event_logs where id = event_log_id and user_id = auth.uid())
  );

-- ─── VENUE VISITS ───
create policy "Venue visits follow profile visibility"
  on venue_visits for select using (
    user_id = auth.uid()
    or (
      exists (select 1 from profiles where id = venue_visits.user_id and not is_private)
      and not exists (select 1 from blocks where blocker_id = venue_visits.user_id and blocked_id = auth.uid())
      and not exists (select 1 from blocks where blocker_id = auth.uid() and blocked_id = venue_visits.user_id)
    )
    or exists (
      select 1 from follows
      where follower_id = auth.uid()
        and following_id = venue_visits.user_id
        and status = 'active'
    )
  );

create policy "Users can manage their own venue visits"
  on venue_visits for insert with check (user_id = auth.uid());

create policy "Users can update their own venue visits"
  on venue_visits for update using (user_id = auth.uid());

create policy "Users can delete their own venue visits"
  on venue_visits for delete using (user_id = auth.uid());

-- ─── FOLLOWS ───
create policy "Users can view follows they're part of"
  on follows for select using (
    follower_id = auth.uid() or following_id = auth.uid()
  );

create policy "Users can create follows"
  on follows for insert with check (
    follower_id = auth.uid()
    and not exists (select 1 from blocks where blocker_id = follows.following_id and blocked_id = auth.uid())
    and not exists (select 1 from blocks where blocker_id = auth.uid() and blocked_id = follows.following_id)
  );

create policy "Users can update follows they're part of"
  on follows for update using (
    -- Follower can cancel their own pending request
    follower_id = auth.uid()
    -- Following user can approve/reject pending requests
    or following_id = auth.uid()
  ) with check (
    -- Only the person being followed can change status to 'active' (approve)
    case when status = 'active' then following_id = auth.uid()
    -- The follower can only set status back to 'pending' (no self-approve)
    else true end
  );

create policy "Users can delete their own follows"
  on follows for delete using (follower_id = auth.uid());

-- ─── LIKES ───
create policy "Likes are publicly readable"
  on likes for select using (
    -- Own likes always visible
    user_id = auth.uid()
    or (
      not exists (select 1 from blocks where blocker_id = likes.user_id and blocked_id = auth.uid())
      and not exists (select 1 from blocks where blocker_id = auth.uid() and blocked_id = likes.user_id)
    )
  );

create policy "Users can insert their own likes"
  on likes for insert with check (
    user_id = auth.uid()
    -- Prevent liking entries from users who blocked you (or you blocked)
    and not exists (
      select 1 from event_logs
        join blocks on (
          (blocks.blocker_id = event_logs.user_id and blocks.blocked_id = auth.uid())
          or (blocks.blocker_id = auth.uid() and blocks.blocked_id = event_logs.user_id)
        )
      where event_logs.id = likes.event_log_id
    )
  );

create policy "Users can delete their own likes"
  on likes for delete using (user_id = auth.uid());

-- ─── COMMENTS ───
create policy "Comments are readable where event log is visible"
  on comments for select using (
    exists (
      select 1 from event_logs
      where event_logs.id = comments.event_log_id
        and event_logs.privacy != 'hide_all'
    )
    and not exists (select 1 from blocks where blocker_id = comments.user_id and blocked_id = auth.uid())
    and not exists (select 1 from blocks where blocker_id = auth.uid() and blocked_id = comments.user_id)
  );

create policy "Users can insert comments"
  on comments for insert with check (
    user_id = auth.uid()
    -- Prevent commenting on entries with comments disabled
    and exists (
      select 1 from event_logs
      where event_logs.id = comments.event_log_id
        and event_logs.comments_enabled = true
    )
    -- Prevent commenting when entry owner has global comments disabled
    and exists (
      select 1 from event_logs
        join profiles on profiles.id = event_logs.user_id
      where event_logs.id = comments.event_log_id
        and profiles.comments_enabled = true
    )
    -- Prevent commenting on blocked users' entries
    and not exists (
      select 1 from event_logs
        join blocks on blocks.blocker_id = event_logs.user_id
      where event_logs.id = comments.event_log_id
        and blocks.blocked_id = auth.uid()
    )
  );

create policy "Users can update their own comments"
  on comments for update using (user_id = auth.uid());

create policy "Users can delete their own comments or comments on their logs"
  on comments for delete using (
    user_id = auth.uid()
    or exists (
      select 1 from event_logs
      where event_logs.id = comments.event_log_id
        and event_logs.user_id = auth.uid()
    )
  );

-- ─── BLOCKS ───
create policy "Users can view their own blocks"
  on blocks for select using (blocker_id = auth.uid());

create policy "Users can create blocks"
  on blocks for insert with check (blocker_id = auth.uid());

create policy "Users can delete their own blocks"
  on blocks for delete using (blocker_id = auth.uid());

-- ─── REPORTS ───
create policy "Users can view their own reports"
  on reports for select using (reporter_id = auth.uid());

create policy "Users can create reports"
  on reports for insert with check (reporter_id = auth.uid());

-- ─── LISTS ───
create policy "System lists are publicly readable"
  on lists for select using (
    source = 'system'
    or created_by = auth.uid()
    or exists (select 1 from list_follows where list_id = lists.id and user_id = auth.uid())
    or is_featured
    -- User-created lists from public, non-blocked profiles are browsable
    or (
      source = 'user'
      and exists (select 1 from profiles where id = lists.created_by and not is_private)
      and not exists (select 1 from blocks where blocker_id = lists.created_by and blocked_id = auth.uid())
      and not exists (select 1 from blocks where blocker_id = auth.uid() and blocked_id = lists.created_by)
    )
  );

create policy "Users can create lists"
  on lists for insert with check (created_by = auth.uid() and source = 'user');

create policy "Users can update their own lists"
  on lists for update using (created_by = auth.uid());

create policy "Users can delete their own lists"
  on lists for delete using (created_by = auth.uid() and source = 'user');

-- ─── LIST ITEMS ───
create policy "List items are readable with the list"
  on list_items for select using (
    exists (select 1 from lists where id = list_items.list_id)
  );

create policy "Users can manage items on their own lists"
  on list_items for insert with check (
    exists (select 1 from lists where id = list_id and created_by = auth.uid() and source = 'user')
  );

create policy "Users can update items on their own lists"
  on list_items for update using (
    exists (select 1 from lists where id = list_id and created_by = auth.uid() and source = 'user')
  );

create policy "Users can delete items from their own lists"
  on list_items for delete using (
    exists (select 1 from lists where id = list_id and created_by = auth.uid() and source = 'user')
  );

-- ─── LIST FOLLOWS ───
create policy "Users can view their own list follows"
  on list_follows for select using (user_id = auth.uid());

create policy "Users can follow lists"
  on list_follows for insert with check (user_id = auth.uid());

create policy "Users can unfollow lists"
  on list_follows for delete using (user_id = auth.uid());

-- ─── BADGES ───
create policy "Badges follow profile visibility"
  on badges for select using (
    user_id = auth.uid()
    or (
      (
        exists (select 1 from profiles where id = badges.user_id and not is_private)
        or exists (
          select 1 from follows
          where follower_id = auth.uid()
            and following_id = badges.user_id
            and status = 'active'
        )
      )
      and not exists (select 1 from blocks where blocker_id = badges.user_id and blocked_id = auth.uid())
      and not exists (select 1 from blocks where blocker_id = auth.uid() and blocked_id = badges.user_id)
    )
  );

-- ─── NOTIFICATIONS ───
create policy "Users can view their own notifications"
  on notifications for select using (user_id = auth.uid());

create policy "Users can update their own notifications"
  on notifications for update using (user_id = auth.uid());

-- ─── NOTIFICATION PREFERENCES ───
create policy "Users can view their own notification prefs"
  on notification_preferences for select using (user_id = auth.uid());

create policy "Users can manage their own notification prefs"
  on notification_preferences for insert with check (user_id = auth.uid());

create policy "Users can update their own notification prefs"
  on notification_preferences for update using (user_id = auth.uid());


-- ═══════════════════════════════════════════════════════════════
-- 9. FUNCTIONS & TRIGGERS
-- ═══════════════════════════════════════════════════════════════

-- Auto-update updated_at timestamps
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

create trigger trg_event_logs_updated_at
  before update on event_logs
  for each row execute function update_updated_at();

create trigger trg_venues_updated_at
  before update on venues
  for each row execute function update_updated_at();

create trigger trg_lists_updated_at
  before update on lists
  for each row execute function update_updated_at();

create trigger trg_venue_visits_updated_at
  before update on venue_visits
  for each row execute function update_updated_at();

create trigger trg_comments_updated_at
  before update on comments
  for each row execute function update_updated_at();

create trigger trg_notification_prefs_updated_at
  before update on notification_preferences
  for each row execute function update_updated_at();

-- Auto-mark venue as visited when logging an event
create or replace function auto_visit_venue()
returns trigger
security definer
set search_path = public
as $$
begin
  insert into venue_visits (user_id, venue_id, relationship)
  values (new.user_id, new.venue_id, 'visited')
  on conflict (user_id, venue_id)
  do update set relationship = 'visited', updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_event_log_auto_visit
  after insert on event_logs
  for each row execute function auto_visit_venue();

-- NOTE: Reverting venue visits on event deletion is intentionally NOT automated.
-- The PRD states that if the user independently marked the venue, the status is preserved.
-- Since we can't reliably distinguish auto-created from user-marked visits, we leave
-- venue_visits intact on event deletion. Users can manually un-visit if needed.

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data->>'username');
  return new;
end;
$$ language plpgsql;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Increment/decrement like count
create or replace function update_like_count()
returns trigger
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    update event_logs set like_count = like_count + 1 where id = new.event_log_id;
    return new;
  elsif TG_OP = 'DELETE' then
    update event_logs set like_count = like_count - 1 where id = old.event_log_id;
    return old;
  end if;
end;
$$ language plpgsql;

create trigger trg_likes_increment
  after insert on likes
  for each row execute function update_like_count();

create trigger trg_likes_decrement
  after delete on likes
  for each row execute function update_like_count();

-- Increment/decrement comment count
create or replace function update_comment_count()
returns trigger
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    update event_logs set comment_count = comment_count + 1 where id = new.event_log_id;
    return new;
  elsif TG_OP = 'DELETE' then
    update event_logs set comment_count = comment_count - 1 where id = old.event_log_id;
    return old;
  end if;
end;
$$ language plpgsql;

create trigger trg_comments_increment
  after insert on comments
  for each row execute function update_comment_count();

create trigger trg_comments_decrement
  after delete on comments
  for each row execute function update_comment_count();


-- ═══════════════════════════════════════════════════════════════
-- 10. STORAGE BUCKETS
-- ═══════════════════════════════════════════════════════════════

-- Event photos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-photos',
  'event-photos',
  true,
  5242880,  -- 5MB
  array['image/jpeg', 'image/png', 'image/heic', 'image/webp']
);

-- Avatars
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,  -- 2MB
  array['image/jpeg', 'image/png', 'image/webp']
);

-- Storage policies: authenticated users can upload to their own folder
create policy "Users can upload event photos"
  on storage.objects for insert
  with check (
    bucket_id = 'event-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Event photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'event-photos');

create policy "Users can delete their own event photos"
  on storage.objects for delete
  using (
    bucket_id = 'event-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can upload avatars"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update their own event photos"
  on storage.objects for update
  using (
    bucket_id = 'event-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );


-- ═══════════════════════════════════════════════════════════════
-- 11. VIEWS (convenience queries)
-- ═══════════════════════════════════════════════════════════════

-- Event attendance count (all users, regardless of privacy)
-- total_logs = the "247 fans logged this game" number (includes all privacy tiers per PRD)
-- public_logs = entries visible in the event page feed (excludes hide_all)
create or replace view event_attendance as
select
  event_id,
  count(*) as total_logs,
  count(*) filter (where privacy != 'hide_all') as public_logs
from event_logs
where event_id is not null
group by event_id;

-- User stats summary (for profile display)
create or replace view user_stats as
select
  user_id,
  count(*) as total_events,
  count(*) filter (where event_date >= date_trunc('year', current_date)) as events_this_year,
  count(distinct venue_id) as total_venues,
  count(distinct venue_id) filter (where event_date >= date_trunc('year', current_date)) as venues_this_year,
  count(*) filter (where outcome = 'win') as wins,
  count(*) filter (where outcome = 'loss') as losses,
  count(*) filter (where outcome = 'draw') as draws
from event_logs
group by user_id;
