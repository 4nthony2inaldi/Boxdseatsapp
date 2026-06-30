import { SupabaseClient } from "@supabase/supabase-js";

export type RememberGuy = {
  id: string;
  name: string;
  headshotUrl: string | null;
  sport: string | null;
  seenCount?: number;
};

export type RememberGuysResult = {
  mode: "personal" | "system";
  guys: RememberGuy[];
};

const LIMIT = 12;
// Below this the personal pull is too thin to feel like a row of "your" guys,
// so we fall back to a system-wide random batch instead.
const MIN_PERSONAL = 8;

type PersonalRow = {
  id: string;
  name: string;
  headshot_url: string | null;
  sport: string | null;
  seen_count: number;
};

type SystemRow = {
  id: string;
  name: string;
  headshot_url: string | null;
  sport: string | null;
};

/**
 * Pull a random row of athletes for the "Remember Some Guys" feed strip.
 *
 * Prefers athletes the user has actually seen (with a per-athlete seen count);
 * if they've seen too few, falls back to a system-wide random batch so the
 * strip still has something to show. `exclude` is the rolling memory of
 * recently-shown ids so a reshuffle pulls fresh faces.
 */
export async function fetchRememberGuys(
  supabase: SupabaseClient,
  userId: string,
  exclude: string[] = []
): Promise<RememberGuysResult> {
  const { data: personal } = await supabase.rpc("remember_some_guys", {
    p_user: userId,
    p_limit: LIMIT,
    p_exclude: exclude,
  });
  const personalRows = (personal as PersonalRow[] | null) ?? [];

  if (personalRows.length >= MIN_PERSONAL) {
    return {
      mode: "personal",
      guys: personalRows.map((r) => ({
        id: r.id,
        name: r.name,
        headshotUrl: r.headshot_url,
        sport: r.sport,
        seenCount: Number(r.seen_count) || 0,
      })),
    };
  }

  const { data: system } = await supabase.rpc("remember_some_guys_system", {
    p_limit: LIMIT,
    p_exclude: exclude,
  });
  const systemRows = (system as SystemRow[] | null) ?? [];

  return {
    mode: "system",
    guys: systemRows.map((r) => ({
      id: r.id,
      name: r.name,
      headshotUrl: r.headshot_url,
      sport: r.sport,
    })),
  };
}
