-- Fix the BNP Paribas Open (Indian Wells) venue coordinates.
--
-- The venue is named after the tournament, so it had geocoded ~3.4km west of the
-- actual Indian Wells Tennis Garden. With the photo finder's 600m match radius,
-- real photos taken at the grounds fell outside it and never matched, so the
-- games were never suggested. Corrected to the verified Tennis Garden location
-- (78-200 Miles Avenue, Indian Wells, CA). public/venues-geo.json updated to match.
update venues
set location = ST_SetSRID(ST_MakePoint(-116.3012579, 33.7201239), 4326),
    updated_at = now()
where id = 'dab821a1-5223-4f6f-9e76-6cb2c7364969';
