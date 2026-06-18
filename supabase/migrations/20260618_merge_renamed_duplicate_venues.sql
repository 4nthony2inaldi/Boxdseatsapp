-- Merge 16 duplicate/renamed venues into their canonical row.
--
-- Stadiums that were renamed (Red Bull Arena -> Sports Illustrated Stadium,
-- Qwest Field -> Lumen Field, Westfalenstadion -> Signal Iduna Park, etc.) got
-- a second venue row when ESPN issued a new venue id, splitting their event
-- history. A few more were mojibake/seed duplicates of the same name. Each
-- group is merged into the venue with the most events; the others' events,
-- logs, visits, list items, favorites, team links and aliases are repointed,
-- the old name is kept as a search alias so it still resolves, then the dup row
-- is deleted. (Relocations between distinct buildings -- e.g. White Hart Lane
-- vs the new Tottenham stadium, Children's Mercy Park vs Community America
-- Ballpark -- were deliberately NOT merged.)
--
-- Applied live via scripts/data/merge_duplicate_venues.py; this file is the
-- canonical record.

begin;
update events set venue_id = '0635e63e-f757-42b1-97f4-732ed3e604ef' where venue_id = '59448cee-6872-4d4e-8cd8-f69757b13352';
update event_logs set venue_id = '0635e63e-f757-42b1-97f4-732ed3e604ef' where venue_id = '59448cee-6872-4d4e-8cd8-f69757b13352';
update venue_visits set venue_id = '0635e63e-f757-42b1-97f4-732ed3e604ef' where venue_id = '59448cee-6872-4d4e-8cd8-f69757b13352';
update list_items set venue_id = '0635e63e-f757-42b1-97f4-732ed3e604ef' where venue_id = '59448cee-6872-4d4e-8cd8-f69757b13352';
update user_league_favorites set venue_id = '0635e63e-f757-42b1-97f4-732ed3e604ef' where venue_id = '59448cee-6872-4d4e-8cd8-f69757b13352';
update venue_teams set venue_id = '0635e63e-f757-42b1-97f4-732ed3e604ef' where venue_id = '59448cee-6872-4d4e-8cd8-f69757b13352';
update venue_aliases set venue_id = '0635e63e-f757-42b1-97f4-732ed3e604ef' where venue_id = '59448cee-6872-4d4e-8cd8-f69757b13352';
update profiles set fav_venue_id = '0635e63e-f757-42b1-97f4-732ed3e604ef' where fav_venue_id = '59448cee-6872-4d4e-8cd8-f69757b13352';
delete from venues where id = '59448cee-6872-4d4e-8cd8-f69757b13352';
update events set venue_id = 'a3a840a0-4ae9-587e-955c-db04baef9b4a' where venue_id = '0744700d-3777-4328-9ac6-4799ac1c5674';
update event_logs set venue_id = 'a3a840a0-4ae9-587e-955c-db04baef9b4a' where venue_id = '0744700d-3777-4328-9ac6-4799ac1c5674';
update venue_visits set venue_id = 'a3a840a0-4ae9-587e-955c-db04baef9b4a' where venue_id = '0744700d-3777-4328-9ac6-4799ac1c5674';
update list_items set venue_id = 'a3a840a0-4ae9-587e-955c-db04baef9b4a' where venue_id = '0744700d-3777-4328-9ac6-4799ac1c5674';
update user_league_favorites set venue_id = 'a3a840a0-4ae9-587e-955c-db04baef9b4a' where venue_id = '0744700d-3777-4328-9ac6-4799ac1c5674';
update venue_teams set venue_id = 'a3a840a0-4ae9-587e-955c-db04baef9b4a' where venue_id = '0744700d-3777-4328-9ac6-4799ac1c5674';
update venue_aliases set venue_id = 'a3a840a0-4ae9-587e-955c-db04baef9b4a' where venue_id = '0744700d-3777-4328-9ac6-4799ac1c5674';
update profiles set fav_venue_id = 'a3a840a0-4ae9-587e-955c-db04baef9b4a' where fav_venue_id = '0744700d-3777-4328-9ac6-4799ac1c5674';
delete from venues where id = '0744700d-3777-4328-9ac6-4799ac1c5674';
update venues set name = 'Antiguo San Mamés' where id = '0e243680-d783-4af4-ba8a-03fe2bc3b018';
update events set venue_id = '0e243680-d783-4af4-ba8a-03fe2bc3b018' where venue_id = '27a82893-6018-4683-9325-a0da0cfef18e';
update event_logs set venue_id = '0e243680-d783-4af4-ba8a-03fe2bc3b018' where venue_id = '27a82893-6018-4683-9325-a0da0cfef18e';
update venue_visits set venue_id = '0e243680-d783-4af4-ba8a-03fe2bc3b018' where venue_id = '27a82893-6018-4683-9325-a0da0cfef18e';
update list_items set venue_id = '0e243680-d783-4af4-ba8a-03fe2bc3b018' where venue_id = '27a82893-6018-4683-9325-a0da0cfef18e';
update user_league_favorites set venue_id = '0e243680-d783-4af4-ba8a-03fe2bc3b018' where venue_id = '27a82893-6018-4683-9325-a0da0cfef18e';
update venue_teams set venue_id = '0e243680-d783-4af4-ba8a-03fe2bc3b018' where venue_id = '27a82893-6018-4683-9325-a0da0cfef18e';
update venue_aliases set venue_id = '0e243680-d783-4af4-ba8a-03fe2bc3b018' where venue_id = '27a82893-6018-4683-9325-a0da0cfef18e';
update profiles set fav_venue_id = '0e243680-d783-4af4-ba8a-03fe2bc3b018' where fav_venue_id = '27a82893-6018-4683-9325-a0da0cfef18e';
delete from venues where id = '27a82893-6018-4683-9325-a0da0cfef18e';
update venues set name = 'Felix-Bollaert' where id = 'bdb932bd-b579-48ee-850a-5603c2f802ca';
update events set venue_id = 'bdb932bd-b579-48ee-850a-5603c2f802ca' where venue_id = '139bb018-2d21-4aeb-a7b6-5e288057b5e9';
update event_logs set venue_id = 'bdb932bd-b579-48ee-850a-5603c2f802ca' where venue_id = '139bb018-2d21-4aeb-a7b6-5e288057b5e9';
update venue_visits set venue_id = 'bdb932bd-b579-48ee-850a-5603c2f802ca' where venue_id = '139bb018-2d21-4aeb-a7b6-5e288057b5e9';
update list_items set venue_id = 'bdb932bd-b579-48ee-850a-5603c2f802ca' where venue_id = '139bb018-2d21-4aeb-a7b6-5e288057b5e9';
update user_league_favorites set venue_id = 'bdb932bd-b579-48ee-850a-5603c2f802ca' where venue_id = '139bb018-2d21-4aeb-a7b6-5e288057b5e9';
update venue_teams set venue_id = 'bdb932bd-b579-48ee-850a-5603c2f802ca' where venue_id = '139bb018-2d21-4aeb-a7b6-5e288057b5e9';
update venue_aliases set venue_id = 'bdb932bd-b579-48ee-850a-5603c2f802ca' where venue_id = '139bb018-2d21-4aeb-a7b6-5e288057b5e9';
update profiles set fav_venue_id = 'bdb932bd-b579-48ee-850a-5603c2f802ca' where fav_venue_id = '139bb018-2d21-4aeb-a7b6-5e288057b5e9';
delete from venues where id = '139bb018-2d21-4aeb-a7b6-5e288057b5e9';
update events set venue_id = '9cf18c7c-ca23-4474-be98-6c2db5e35d88' where venue_id = '19549647-6382-474c-b9aa-778b70faafaa';
update event_logs set venue_id = '9cf18c7c-ca23-4474-be98-6c2db5e35d88' where venue_id = '19549647-6382-474c-b9aa-778b70faafaa';
update venue_visits set venue_id = '9cf18c7c-ca23-4474-be98-6c2db5e35d88' where venue_id = '19549647-6382-474c-b9aa-778b70faafaa';
update list_items set venue_id = '9cf18c7c-ca23-4474-be98-6c2db5e35d88' where venue_id = '19549647-6382-474c-b9aa-778b70faafaa';
update user_league_favorites set venue_id = '9cf18c7c-ca23-4474-be98-6c2db5e35d88' where venue_id = '19549647-6382-474c-b9aa-778b70faafaa';
update venue_teams set venue_id = '9cf18c7c-ca23-4474-be98-6c2db5e35d88' where venue_id = '19549647-6382-474c-b9aa-778b70faafaa';
update venue_aliases set venue_id = '9cf18c7c-ca23-4474-be98-6c2db5e35d88' where venue_id = '19549647-6382-474c-b9aa-778b70faafaa';
update profiles set fav_venue_id = '9cf18c7c-ca23-4474-be98-6c2db5e35d88' where fav_venue_id = '19549647-6382-474c-b9aa-778b70faafaa';
delete from venues where id = '19549647-6382-474c-b9aa-778b70faafaa';
update events set venue_id = '274bd200-4733-419f-8492-948e78698f45' where venue_id = 'a92e5c59-9bd7-42a5-a3e2-7960fc3d8d3d';
update event_logs set venue_id = '274bd200-4733-419f-8492-948e78698f45' where venue_id = 'a92e5c59-9bd7-42a5-a3e2-7960fc3d8d3d';
update venue_visits set venue_id = '274bd200-4733-419f-8492-948e78698f45' where venue_id = 'a92e5c59-9bd7-42a5-a3e2-7960fc3d8d3d';
update list_items set venue_id = '274bd200-4733-419f-8492-948e78698f45' where venue_id = 'a92e5c59-9bd7-42a5-a3e2-7960fc3d8d3d';
update user_league_favorites set venue_id = '274bd200-4733-419f-8492-948e78698f45' where venue_id = 'a92e5c59-9bd7-42a5-a3e2-7960fc3d8d3d';
update venue_teams set venue_id = '274bd200-4733-419f-8492-948e78698f45' where venue_id = 'a92e5c59-9bd7-42a5-a3e2-7960fc3d8d3d';
update venue_aliases set venue_id = '274bd200-4733-419f-8492-948e78698f45' where venue_id = 'a92e5c59-9bd7-42a5-a3e2-7960fc3d8d3d';
update profiles set fav_venue_id = '274bd200-4733-419f-8492-948e78698f45' where fav_venue_id = 'a92e5c59-9bd7-42a5-a3e2-7960fc3d8d3d';
delete from venues where id = 'a92e5c59-9bd7-42a5-a3e2-7960fc3d8d3d';
update events set venue_id = '332c9264-96fd-4a57-a448-2024365b3425' where venue_id = 'cda6c443-a657-4678-9b38-b25404967c59';
update event_logs set venue_id = '332c9264-96fd-4a57-a448-2024365b3425' where venue_id = 'cda6c443-a657-4678-9b38-b25404967c59';
update venue_visits set venue_id = '332c9264-96fd-4a57-a448-2024365b3425' where venue_id = 'cda6c443-a657-4678-9b38-b25404967c59';
update list_items set venue_id = '332c9264-96fd-4a57-a448-2024365b3425' where venue_id = 'cda6c443-a657-4678-9b38-b25404967c59';
update user_league_favorites set venue_id = '332c9264-96fd-4a57-a448-2024365b3425' where venue_id = 'cda6c443-a657-4678-9b38-b25404967c59';
update venue_teams set venue_id = '332c9264-96fd-4a57-a448-2024365b3425' where venue_id = 'cda6c443-a657-4678-9b38-b25404967c59';
update venue_aliases set venue_id = '332c9264-96fd-4a57-a448-2024365b3425' where venue_id = 'cda6c443-a657-4678-9b38-b25404967c59';
update profiles set fav_venue_id = '332c9264-96fd-4a57-a448-2024365b3425' where fav_venue_id = 'cda6c443-a657-4678-9b38-b25404967c59';
delete from venues where id = 'cda6c443-a657-4678-9b38-b25404967c59';
update events set venue_id = 'd7ce7a08-a0fb-451e-87d6-ad76893f8025' where venue_id = '542094c8-7108-4f84-b51c-d5193500d0c2';
update event_logs set venue_id = 'd7ce7a08-a0fb-451e-87d6-ad76893f8025' where venue_id = '542094c8-7108-4f84-b51c-d5193500d0c2';
update venue_visits set venue_id = 'd7ce7a08-a0fb-451e-87d6-ad76893f8025' where venue_id = '542094c8-7108-4f84-b51c-d5193500d0c2';
update list_items set venue_id = 'd7ce7a08-a0fb-451e-87d6-ad76893f8025' where venue_id = '542094c8-7108-4f84-b51c-d5193500d0c2';
update user_league_favorites set venue_id = 'd7ce7a08-a0fb-451e-87d6-ad76893f8025' where venue_id = '542094c8-7108-4f84-b51c-d5193500d0c2';
update venue_teams set venue_id = 'd7ce7a08-a0fb-451e-87d6-ad76893f8025' where venue_id = '542094c8-7108-4f84-b51c-d5193500d0c2';
update venue_aliases set venue_id = 'd7ce7a08-a0fb-451e-87d6-ad76893f8025' where venue_id = '542094c8-7108-4f84-b51c-d5193500d0c2';
update profiles set fav_venue_id = 'd7ce7a08-a0fb-451e-87d6-ad76893f8025' where fav_venue_id = '542094c8-7108-4f84-b51c-d5193500d0c2';
delete from venues where id = '542094c8-7108-4f84-b51c-d5193500d0c2';
update events set venue_id = 'f638c2fd-c8ba-45b2-b885-6545af5d4d79' where venue_id = '580acd0d-7f5f-4830-bdd6-fccfe7d4946e';
update event_logs set venue_id = 'f638c2fd-c8ba-45b2-b885-6545af5d4d79' where venue_id = '580acd0d-7f5f-4830-bdd6-fccfe7d4946e';
update venue_visits set venue_id = 'f638c2fd-c8ba-45b2-b885-6545af5d4d79' where venue_id = '580acd0d-7f5f-4830-bdd6-fccfe7d4946e';
update list_items set venue_id = 'f638c2fd-c8ba-45b2-b885-6545af5d4d79' where venue_id = '580acd0d-7f5f-4830-bdd6-fccfe7d4946e';
update user_league_favorites set venue_id = 'f638c2fd-c8ba-45b2-b885-6545af5d4d79' where venue_id = '580acd0d-7f5f-4830-bdd6-fccfe7d4946e';
update venue_teams set venue_id = 'f638c2fd-c8ba-45b2-b885-6545af5d4d79' where venue_id = '580acd0d-7f5f-4830-bdd6-fccfe7d4946e';
update venue_aliases set venue_id = 'f638c2fd-c8ba-45b2-b885-6545af5d4d79' where venue_id = '580acd0d-7f5f-4830-bdd6-fccfe7d4946e';
update profiles set fav_venue_id = 'f638c2fd-c8ba-45b2-b885-6545af5d4d79' where fav_venue_id = '580acd0d-7f5f-4830-bdd6-fccfe7d4946e';
delete from venues where id = '580acd0d-7f5f-4830-bdd6-fccfe7d4946e';
update events set venue_id = '5bd92991-6f81-58b1-8e6f-7af0539bf351' where venue_id = '7f701bae-7513-4da2-9d4c-ba9ee961a1bf';
update event_logs set venue_id = '5bd92991-6f81-58b1-8e6f-7af0539bf351' where venue_id = '7f701bae-7513-4da2-9d4c-ba9ee961a1bf';
update venue_visits set venue_id = '5bd92991-6f81-58b1-8e6f-7af0539bf351' where venue_id = '7f701bae-7513-4da2-9d4c-ba9ee961a1bf';
update list_items set venue_id = '5bd92991-6f81-58b1-8e6f-7af0539bf351' where venue_id = '7f701bae-7513-4da2-9d4c-ba9ee961a1bf';
update user_league_favorites set venue_id = '5bd92991-6f81-58b1-8e6f-7af0539bf351' where venue_id = '7f701bae-7513-4da2-9d4c-ba9ee961a1bf';
update venue_teams set venue_id = '5bd92991-6f81-58b1-8e6f-7af0539bf351' where venue_id = '7f701bae-7513-4da2-9d4c-ba9ee961a1bf';
update venue_aliases set venue_id = '5bd92991-6f81-58b1-8e6f-7af0539bf351' where venue_id = '7f701bae-7513-4da2-9d4c-ba9ee961a1bf';
update profiles set fav_venue_id = '5bd92991-6f81-58b1-8e6f-7af0539bf351' where fav_venue_id = '7f701bae-7513-4da2-9d4c-ba9ee961a1bf';
delete from venues where id = '7f701bae-7513-4da2-9d4c-ba9ee961a1bf';
update events set venue_id = '64a96cb2-2055-4eeb-8424-59c9cd4e1f5d' where venue_id = 'ea7da605-23e1-404d-948c-f6e9dfa37e5c';
update event_logs set venue_id = '64a96cb2-2055-4eeb-8424-59c9cd4e1f5d' where venue_id = 'ea7da605-23e1-404d-948c-f6e9dfa37e5c';
update venue_visits set venue_id = '64a96cb2-2055-4eeb-8424-59c9cd4e1f5d' where venue_id = 'ea7da605-23e1-404d-948c-f6e9dfa37e5c';
update list_items set venue_id = '64a96cb2-2055-4eeb-8424-59c9cd4e1f5d' where venue_id = 'ea7da605-23e1-404d-948c-f6e9dfa37e5c';
update user_league_favorites set venue_id = '64a96cb2-2055-4eeb-8424-59c9cd4e1f5d' where venue_id = 'ea7da605-23e1-404d-948c-f6e9dfa37e5c';
update venue_teams set venue_id = '64a96cb2-2055-4eeb-8424-59c9cd4e1f5d' where venue_id = 'ea7da605-23e1-404d-948c-f6e9dfa37e5c';
update venue_aliases set venue_id = '64a96cb2-2055-4eeb-8424-59c9cd4e1f5d' where venue_id = 'ea7da605-23e1-404d-948c-f6e9dfa37e5c';
update profiles set fav_venue_id = '64a96cb2-2055-4eeb-8424-59c9cd4e1f5d' where fav_venue_id = 'ea7da605-23e1-404d-948c-f6e9dfa37e5c';
delete from venues where id = 'ea7da605-23e1-404d-948c-f6e9dfa37e5c';
update events set venue_id = 'f2c99587-640c-4c74-811d-4c375fa9c14d' where venue_id = '798b9c88-4e7a-430b-8f21-45a7c9ff828c';
update event_logs set venue_id = 'f2c99587-640c-4c74-811d-4c375fa9c14d' where venue_id = '798b9c88-4e7a-430b-8f21-45a7c9ff828c';
update venue_visits set venue_id = 'f2c99587-640c-4c74-811d-4c375fa9c14d' where venue_id = '798b9c88-4e7a-430b-8f21-45a7c9ff828c';
update list_items set venue_id = 'f2c99587-640c-4c74-811d-4c375fa9c14d' where venue_id = '798b9c88-4e7a-430b-8f21-45a7c9ff828c';
update user_league_favorites set venue_id = 'f2c99587-640c-4c74-811d-4c375fa9c14d' where venue_id = '798b9c88-4e7a-430b-8f21-45a7c9ff828c';
update venue_teams set venue_id = 'f2c99587-640c-4c74-811d-4c375fa9c14d' where venue_id = '798b9c88-4e7a-430b-8f21-45a7c9ff828c';
update venue_aliases set venue_id = 'f2c99587-640c-4c74-811d-4c375fa9c14d' where venue_id = '798b9c88-4e7a-430b-8f21-45a7c9ff828c';
update profiles set fav_venue_id = 'f2c99587-640c-4c74-811d-4c375fa9c14d' where fav_venue_id = '798b9c88-4e7a-430b-8f21-45a7c9ff828c';
delete from venues where id = '798b9c88-4e7a-430b-8f21-45a7c9ff828c';
update events set venue_id = '7e799749-6935-485a-827c-d58c2c571480' where venue_id = '8fe3de45-5591-43ec-a2cf-17d62313cc77';
update event_logs set venue_id = '7e799749-6935-485a-827c-d58c2c571480' where venue_id = '8fe3de45-5591-43ec-a2cf-17d62313cc77';
update venue_visits set venue_id = '7e799749-6935-485a-827c-d58c2c571480' where venue_id = '8fe3de45-5591-43ec-a2cf-17d62313cc77';
update list_items set venue_id = '7e799749-6935-485a-827c-d58c2c571480' where venue_id = '8fe3de45-5591-43ec-a2cf-17d62313cc77';
update user_league_favorites set venue_id = '7e799749-6935-485a-827c-d58c2c571480' where venue_id = '8fe3de45-5591-43ec-a2cf-17d62313cc77';
update venue_teams set venue_id = '7e799749-6935-485a-827c-d58c2c571480' where venue_id = '8fe3de45-5591-43ec-a2cf-17d62313cc77';
update venue_aliases set venue_id = '7e799749-6935-485a-827c-d58c2c571480' where venue_id = '8fe3de45-5591-43ec-a2cf-17d62313cc77';
update profiles set fav_venue_id = '7e799749-6935-485a-827c-d58c2c571480' where fav_venue_id = '8fe3de45-5591-43ec-a2cf-17d62313cc77';
delete from venues where id = '8fe3de45-5591-43ec-a2cf-17d62313cc77';
update events set venue_id = 'e284311c-0892-47bc-8fe0-7396025faffb' where venue_id = '8e3952a0-9be5-4884-b1df-41bc4cb4987f';
update event_logs set venue_id = 'e284311c-0892-47bc-8fe0-7396025faffb' where venue_id = '8e3952a0-9be5-4884-b1df-41bc4cb4987f';
update venue_visits set venue_id = 'e284311c-0892-47bc-8fe0-7396025faffb' where venue_id = '8e3952a0-9be5-4884-b1df-41bc4cb4987f';
update list_items set venue_id = 'e284311c-0892-47bc-8fe0-7396025faffb' where venue_id = '8e3952a0-9be5-4884-b1df-41bc4cb4987f';
update user_league_favorites set venue_id = 'e284311c-0892-47bc-8fe0-7396025faffb' where venue_id = '8e3952a0-9be5-4884-b1df-41bc4cb4987f';
update venue_teams set venue_id = 'e284311c-0892-47bc-8fe0-7396025faffb' where venue_id = '8e3952a0-9be5-4884-b1df-41bc4cb4987f';
update venue_aliases set venue_id = 'e284311c-0892-47bc-8fe0-7396025faffb' where venue_id = '8e3952a0-9be5-4884-b1df-41bc4cb4987f';
update profiles set fav_venue_id = 'e284311c-0892-47bc-8fe0-7396025faffb' where fav_venue_id = '8e3952a0-9be5-4884-b1df-41bc4cb4987f';
delete from venues where id = '8e3952a0-9be5-4884-b1df-41bc4cb4987f';
update events set venue_id = '9e35fa79-b036-5462-95d0-d900f2f0c9d8' where venue_id = 'b8fcb369-d0d3-43c3-8cb9-d69d68c8574e';
update event_logs set venue_id = '9e35fa79-b036-5462-95d0-d900f2f0c9d8' where venue_id = 'b8fcb369-d0d3-43c3-8cb9-d69d68c8574e';
update venue_visits set venue_id = '9e35fa79-b036-5462-95d0-d900f2f0c9d8' where venue_id = 'b8fcb369-d0d3-43c3-8cb9-d69d68c8574e';
update list_items set venue_id = '9e35fa79-b036-5462-95d0-d900f2f0c9d8' where venue_id = 'b8fcb369-d0d3-43c3-8cb9-d69d68c8574e';
update user_league_favorites set venue_id = '9e35fa79-b036-5462-95d0-d900f2f0c9d8' where venue_id = 'b8fcb369-d0d3-43c3-8cb9-d69d68c8574e';
update venue_teams set venue_id = '9e35fa79-b036-5462-95d0-d900f2f0c9d8' where venue_id = 'b8fcb369-d0d3-43c3-8cb9-d69d68c8574e';
update venue_aliases set venue_id = '9e35fa79-b036-5462-95d0-d900f2f0c9d8' where venue_id = 'b8fcb369-d0d3-43c3-8cb9-d69d68c8574e';
update profiles set fav_venue_id = '9e35fa79-b036-5462-95d0-d900f2f0c9d8' where fav_venue_id = 'b8fcb369-d0d3-43c3-8cb9-d69d68c8574e';
delete from venues where id = 'b8fcb369-d0d3-43c3-8cb9-d69d68c8574e';
update events set venue_id = 'd16eec03-40b4-4d83-9025-6af64e3ee214' where venue_id = 'eb254ff5-ef38-4635-9b88-221ae8d70268';
update event_logs set venue_id = 'd16eec03-40b4-4d83-9025-6af64e3ee214' where venue_id = 'eb254ff5-ef38-4635-9b88-221ae8d70268';
update venue_visits set venue_id = 'd16eec03-40b4-4d83-9025-6af64e3ee214' where venue_id = 'eb254ff5-ef38-4635-9b88-221ae8d70268';
update list_items set venue_id = 'd16eec03-40b4-4d83-9025-6af64e3ee214' where venue_id = 'eb254ff5-ef38-4635-9b88-221ae8d70268';
update user_league_favorites set venue_id = 'd16eec03-40b4-4d83-9025-6af64e3ee214' where venue_id = 'eb254ff5-ef38-4635-9b88-221ae8d70268';
update venue_teams set venue_id = 'd16eec03-40b4-4d83-9025-6af64e3ee214' where venue_id = 'eb254ff5-ef38-4635-9b88-221ae8d70268';
update venue_aliases set venue_id = 'd16eec03-40b4-4d83-9025-6af64e3ee214' where venue_id = 'eb254ff5-ef38-4635-9b88-221ae8d70268';
update profiles set fav_venue_id = 'd16eec03-40b4-4d83-9025-6af64e3ee214' where fav_venue_id = 'eb254ff5-ef38-4635-9b88-221ae8d70268';
delete from venues where id = 'eb254ff5-ef38-4635-9b88-221ae8d70268';

-- keep old names searchable
insert into venue_aliases (venue_id, alias_name) values ('e284311c-0892-47bc-8fe0-7396025faffb', 'Stadio Friuli');
insert into venue_aliases (venue_id, alias_name) values ('9cf18c7c-ca23-4474-be98-6c2db5e35d88', 'San Siro');
insert into venue_aliases (venue_id, alias_name) values ('a3a840a0-4ae9-587e-955c-db04baef9b4a', 'Qwest Field');
insert into venue_aliases (venue_id, alias_name) values ('f638c2fd-c8ba-45b2-b885-6545af5d4d79', 'Westfalenstadion');
insert into venue_aliases (venue_id, alias_name) values ('0635e63e-f757-42b1-97f4-732ed3e604ef', 'Arena AufSchalke');
insert into venue_aliases (venue_id, alias_name) values ('5bd92991-6f81-58b1-8e6f-7af0539bf351', 'Invesco Field');
insert into venue_aliases (venue_id, alias_name) values ('274bd200-4733-419f-8492-948e78698f45', 'Anoeta Stadium');
insert into venue_aliases (venue_id, alias_name) values ('f2c99587-640c-4c74-811d-4c375fa9c14d', 'Niedersachsenstadion');
insert into venue_aliases (venue_id, alias_name) values ('64a96cb2-2055-4eeb-8424-59c9cd4e1f5d', 'Gottlieb-Daimler Stadion');
insert into venue_aliases (venue_id, alias_name) values ('7e799749-6935-485a-827c-d58c2c571480', 'Estadio Municipal de Butarque');
insert into venue_aliases (venue_id, alias_name) values ('bdb932bd-b579-48ee-850a-5603c2f802ca', 'Stade Bollaert-Delelis');

commit;
