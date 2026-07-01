import { SupabaseClient } from "@supabase/supabase-js";

/**
 * App-wide "fan passport" for the admin console: the same shape of stats as a
 * user's passport, but aggregated across every fan. All read-only. Sourced from
 * the `admin_global_passport` Postgres function (one round trip; the coords come
 * from the PostGIS location column, which only a DB function can project). The
 * function is granted to service_role only, so this must be called with the
 * service-role client from an admin-gated route.
 */

export type GlobalPassport = {
  totals: { fans: number; games: number; venues: number; events: number };
  cities: number;
  sports: { sport: string; games: number }[];
  topVenues: {
    venue_id: string;
    name: string;
    city: string | null;
    sport: string | null;
    photo_url: string | null;
    games: number;
  }[];
  topAthletes: {
    id: string;
    name: string;
    sport: string | null;
    headshot_url: string | null;
    seen: number;
  }[];
  mapVenues: { venue_id: string; name: string; lat: number; lng: number; games: number }[];
};

const EMPTY: GlobalPassport = {
  totals: { fans: 0, games: 0, venues: 0, events: 0 },
  cities: 0,
  sports: [],
  topVenues: [],
  topAthletes: [],
  mapVenues: [],
};

export async function fetchGlobalPassport(admin: SupabaseClient): Promise<GlobalPassport> {
  const { data, error } = await admin.rpc("admin_global_passport");
  if (error) throw error;
  if (!data) return EMPTY;
  return data as GlobalPassport;
}
