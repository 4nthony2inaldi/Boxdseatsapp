-- Make Grand Slam venues findable by tournament name in venue search.
-- After merging/renaming venues, the canonical names ("All England Lawn
-- Tennis Club", "Melbourne Park", "USTA Billie Jean King National Tennis
-- Center") no longer contain the searchable tournament name (e.g. "Wimbledon"),
-- so they stopped appearing when logging. Venue search is alias-aware (#80),
-- so adding aliases restores discoverability. Idempotent.

insert into venue_aliases (venue_id, alias_name)
select t.v::uuid, t.a
from (values
  ('33152e34-1b62-4bd6-a818-0626e9c916c5', 'Wimbledon'),
  ('33152e34-1b62-4bd6-a818-0626e9c916c5', 'Wimbledon Championships'),
  ('33152e34-1b62-4bd6-a818-0626e9c916c5', 'All England Club'),
  ('472f7bba-1fd2-4d7d-ac48-1a7581efd5fc', 'Australian Open'),
  ('8019616f-6552-498c-87a7-43e1dff70e6e', 'French Open'),
  ('8019616f-6552-498c-87a7-43e1dff70e6e', 'Roland Garros'),
  ('8150a029-4f45-4177-8e6a-6b253a14f304', 'US Open'),
  ('8150a029-4f45-4177-8e6a-6b253a14f304', 'Flushing Meadows')
) as t(v, a)
where not exists (
  select 1 from venue_aliases va where va.venue_id = t.v::uuid and va.alias_name = t.a
);
