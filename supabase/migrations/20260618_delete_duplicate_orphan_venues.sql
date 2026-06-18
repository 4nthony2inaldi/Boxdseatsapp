-- Remove 3 empty duplicate venues (South African World Cup stadiums that were
-- seeded twice). Each has a populated twin that keeps all events; these copies
-- have 0 events and 0 references anywhere. Guarded by a 0-events check.
--   FNB Stadium (blank city)        -> keep c91b196a (Johannesburg)
--   Loftus Versfeld (dup)           -> keep de14de72 (Pretoria)
--   Nelson Mandela Bay (Port Eliz.) -> keep 6c804fa5 (Gqeberha)
delete from venues
where id in (
  'b7405b6f-78e2-4a20-aa04-844e1369edf9',
  '1ef63586-a7a3-4d82-bb2e-e6b540d3e1c6',
  '5c312b2b-48eb-4696-8760-3707e95ab7f1'
)
and not exists (select 1 from events where venue_id = venues.id);
