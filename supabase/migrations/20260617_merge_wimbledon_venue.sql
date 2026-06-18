begin;
-- Merge the duplicate Wimbledon venue ("Wimbledon Championships Site", 2002-05)
-- into the canonical "All England Lawn Tennis Club" so a user picking the venue
-- sees the full history instead of a 4-year slice.
update events                set venue_id     = '33152e34-1b62-4bd6-a818-0626e9c916c5' where venue_id     = 'ce5c553a-1a5e-46a0-8660-9ecddd35ef24';
update event_logs            set venue_id     = '33152e34-1b62-4bd6-a818-0626e9c916c5' where venue_id     = 'ce5c553a-1a5e-46a0-8660-9ecddd35ef24';
update venue_visits          set venue_id     = '33152e34-1b62-4bd6-a818-0626e9c916c5' where venue_id     = 'ce5c553a-1a5e-46a0-8660-9ecddd35ef24';
update list_items            set venue_id     = '33152e34-1b62-4bd6-a818-0626e9c916c5' where venue_id     = 'ce5c553a-1a5e-46a0-8660-9ecddd35ef24';
update user_league_favorites set venue_id     = '33152e34-1b62-4bd6-a818-0626e9c916c5' where venue_id     = 'ce5c553a-1a5e-46a0-8660-9ecddd35ef24';
update venue_teams           set venue_id     = '33152e34-1b62-4bd6-a818-0626e9c916c5' where venue_id     = 'ce5c553a-1a5e-46a0-8660-9ecddd35ef24';
update profiles              set fav_venue_id = '33152e34-1b62-4bd6-a818-0626e9c916c5' where fav_venue_id = 'ce5c553a-1a5e-46a0-8660-9ecddd35ef24';
-- normalize the moved events' tournament name to match the canonical "Wimbledon"
update events set tournament_name = 'Wimbledon' where venue_id = '33152e34-1b62-4bd6-a818-0626e9c916c5' and tournament_name = 'Wimbledon Championships';
delete from venues where id = 'ce5c553a-1a5e-46a0-8660-9ecddd35ef24';
commit;
