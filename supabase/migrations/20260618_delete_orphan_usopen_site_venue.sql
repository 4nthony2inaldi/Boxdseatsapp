-- Remove an orphan venue surfaced in venue search: "Us Open Championships
-- Site" (city "Unknown") was a leftover from the early tennis seeding pass —
-- the real venue is "USTA Billie Jean King National Tennis Center". It has 0
-- events and 0 references anywhere, so it's safe to delete. (The "US Open"
-- search alias now points at the real venue.)
delete from venues
where id = '83bd0083-f953-4e12-962d-456ce1c5caa7'
  and name = 'Us Open Championships Site'
  and not exists (select 1 from events where venue_id = '83bd0083-f953-4e12-962d-456ce1c5caa7');
