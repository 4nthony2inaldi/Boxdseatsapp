-- Re-geocode marquee tennis venues to their real stadiums.
--
-- These venues are named after the tournament (e.g. "Miami Open"), so they
-- had geocoded to the city centroid (or the US geographic-center "couldn't
-- resolve" fallback), tens of km from the actual courts. With the photo
-- finder's tight tennis radius, real photos never matched. Corrected to the
-- verified venue coordinates (Hard Rock Stadium, Lindner Family Tennis Center,
-- Qizhong, Caja Magica, Foro Italico, Sobeys/IGA Stadium, etc.).
-- public/venues-geo.json updated to match (and the missing rows added).
update venues set location = ST_SetSRID(ST_MakePoint(-80.2388497, 25.9579032), 4326), updated_at = now() where id = '4680d38a-0633-498d-9642-106e46c748eb';
update venues set location = ST_SetSRID(ST_MakePoint(-80.2388497, 25.9579032), 4326), updated_at = now() where id = '07359cef-e0d3-4198-9616-d3a6c16a025c';
update venues set location = ST_SetSRID(ST_MakePoint(-84.2771507, 39.346673), 4326), updated_at = now() where id = 'c983b33c-0543-410c-a153-3e0d8ab8bec2';
update venues set location = ST_SetSRID(ST_MakePoint(-84.2771507, 39.346673), 4326), updated_at = now() where id = '2a9c1895-42c2-43bd-a754-d8f9a7a96496';
update venues set location = ST_SetSRID(ST_MakePoint(-84.2771507, 39.346673), 4326), updated_at = now() where id = '0cfb032a-dd30-438c-b007-191944d9651a';
update venues set location = ST_SetSRID(ST_MakePoint(-84.2771507, 39.346673), 4326), updated_at = now() where id = '9b017a6a-a029-4c23-998f-5d812baab5a8';
update venues set location = ST_SetSRID(ST_MakePoint(-84.2771507, 39.346673), 4326), updated_at = now() where id = '96958684-68d5-499e-883b-a74380aaf558';
update venues set location = ST_SetSRID(ST_MakePoint(55.3424785, 25.2429386), 4326), updated_at = now() where id = '85b349f2-ba0c-476f-bda0-2400aa333ae7';
update venues set location = ST_SetSRID(ST_MakePoint(55.3424785, 25.2429386), 4326), updated_at = now() where id = '89d66df9-598b-4f12-9499-9cb3e9213cd6';
update venues set location = ST_SetSRID(ST_MakePoint(55.3424785, 25.2429386), 4326), updated_at = now() where id = '7a4ebb43-00a9-4b30-8a5e-63275c73b2c6';
update venues set location = ST_SetSRID(ST_MakePoint(55.3424785, 25.2429386), 4326), updated_at = now() where id = '290bc0af-c534-4d95-a75d-d0ace82098e4';
update venues set location = ST_SetSRID(ST_MakePoint(55.3424785, 25.2429386), 4326), updated_at = now() where id = 'bc7d4ceb-7c58-463b-8fdb-1a8701286d9c';
update venues set location = ST_SetSRID(ST_MakePoint(55.3424785, 25.2429386), 4326), updated_at = now() where id = '604f5939-f835-4608-b0e5-0c9119730bbf';
update venues set location = ST_SetSRID(ST_MakePoint(121.355585, 31.0420757), 4326), updated_at = now() where id = '13a16604-2d41-4e06-9dfe-8c286d4feeae';
update venues set location = ST_SetSRID(ST_MakePoint(121.355585, 31.0420757), 4326), updated_at = now() where id = '247eec20-49b3-49f3-9e90-ac33726a4255';
update venues set location = ST_SetSRID(ST_MakePoint(121.355585, 31.0420757), 4326), updated_at = now() where id = 'a8247f09-1263-4f5c-81bf-5510e99e3480';
update venues set location = ST_SetSRID(ST_MakePoint(121.355585, 31.0420757), 4326), updated_at = now() where id = '3d9fe788-0780-45ea-b22e-6dc825982cdc';
update venues set location = ST_SetSRID(ST_MakePoint(121.355585, 31.0420757), 4326), updated_at = now() where id = '24ab3b2a-3bc5-408f-b2eb-3b669c1ccedc';
update venues set location = ST_SetSRID(ST_MakePoint(121.355585, 31.0420757), 4326), updated_at = now() where id = 'df3d05ef-6b23-455e-a8e8-a8b57bb919e7';
update venues set location = ST_SetSRID(ST_MakePoint(-3.6853316, 40.3672924), 4326), updated_at = now() where id = 'e6e3eabb-e2cd-481b-a522-64b9477ce1e9';
update venues set location = ST_SetSRID(ST_MakePoint(-3.6853316, 40.3672924), 4326), updated_at = now() where id = '0f2b486c-4f7b-453a-b493-402b0e18614c';
update venues set location = ST_SetSRID(ST_MakePoint(-3.6853316, 40.3672924), 4326), updated_at = now() where id = '7bf40e76-c59c-40e1-a016-e531f77b5745';
update venues set location = ST_SetSRID(ST_MakePoint(12.4570742, 41.9325174), 4326), updated_at = now() where id = 'd3b004cf-b25b-494c-9346-d87830713299';
update venues set location = ST_SetSRID(ST_MakePoint(12.4570742, 41.9325174), 4326), updated_at = now() where id = 'c0acbf3b-c7d7-4e4a-9366-1c8124d27eb3';
update venues set location = ST_SetSRID(ST_MakePoint(12.4570742, 41.9325174), 4326), updated_at = now() where id = '356aa2d5-8950-45f2-97c3-2053c2a98bdf';
update venues set location = ST_SetSRID(ST_MakePoint(12.4570742, 41.9325174), 4326), updated_at = now() where id = 'a8431697-93cf-49d8-8773-34164706f7b4';
update venues set location = ST_SetSRID(ST_MakePoint(7.4413448, 43.7521951), 4326), updated_at = now() where id = '018ed401-af0f-496e-9ede-c7e194f4e4d4';
update venues set location = ST_SetSRID(ST_MakePoint(7.4413448, 43.7521951), 4326), updated_at = now() where id = 'd2928408-a275-4da2-a11d-6cbd9d3b197e';
update venues set location = ST_SetSRID(ST_MakePoint(7.4413448, 43.7521951), 4326), updated_at = now() where id = '367828d5-edc0-4ffc-913c-820fa623fcc2';
update venues set location = ST_SetSRID(ST_MakePoint(-79.5120776, 43.7715881), 4326), updated_at = now() where id = '55f3b773-87be-4e60-82f9-2773bc8c7089';
update venues set location = ST_SetSRID(ST_MakePoint(-79.5120776, 43.7715881), 4326), updated_at = now() where id = '634f1d74-65da-4876-9bd4-1517fb91b519';
update venues set location = ST_SetSRID(ST_MakePoint(-79.5120776, 43.7715881), 4326), updated_at = now() where id = '991a91b2-dff6-4f10-82ff-afb0fed4ba54';
update venues set location = ST_SetSRID(ST_MakePoint(-73.6267358, 45.5329553), 4326), updated_at = now() where id = '3c403ee6-6d7e-4d25-82fe-4865a7ed4544';
update venues set location = ST_SetSRID(ST_MakePoint(-73.6267358, 45.5329553), 4326), updated_at = now() where id = '6cfd0322-cf96-40b7-a3ff-6c1268b61bac';
update venues set location = ST_SetSRID(ST_MakePoint(-73.6267358, 45.5329553), 4326), updated_at = now() where id = '1bdff09e-e374-4be2-a793-14a9b0fffd01';
