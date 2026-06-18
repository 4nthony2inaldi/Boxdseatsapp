-- Venue display cleanup (cosmetic; no merges/deletes).
--
-- 1) Tennis tournament venues were seeded as "<tournament> Site" placeholders
--    (ESPN exposes no real stadium name for tennis), often with "ATP"/"WTA"
--    prefixes — ugly in search. Strip the " Site" suffix and the tour prefix
--    so they read as the tournament (e.g. "ATP Western & Southern Open Site"
--    -> "Western & Southern Open").
update venues
set name = trim(
  regexp_replace(
    regexp_replace(name, ' Site$', ''),
    '^(ATP Tour |WTA Tour |ATP |WTA )', ''
  )
)
where name like '% Site';

-- 2) Stop showing the literal placeholder "Unknown" as a city (column is NOT
--    NULL, so blank it). Real city backfill is a separate geocoding effort.
update venues set city = '' where city ilike 'unknown';
