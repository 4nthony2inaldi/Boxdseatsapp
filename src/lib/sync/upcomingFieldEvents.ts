import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Create scheduled / in-progress individual-sport events so fans can log them
 * (and they appear in "happening around you") WHILE the event is on — not only
 * after it finishes. The seed scripts are completed-only by design, so a live
 * tournament like the U.S. Open never existed in the DB until it ended.
 *
 * This runs in the hourly Vercel cron alongside the team-sport sync. It mirrors
 * the seeder's event shape exactly (one `field` event per round day, keyed
 * `external_ids.espn = "{tournamentId}-d{N}"`, shared tournament_id), so the
 * GitHub Actions finalize pass dedupes against these rows and just fills the
 * winner/scores once the event is final.
 *
 * Golf only for now (the live-logging gap that prompted this). Tennis tour and
 * motorsports follow the same pattern and can be added here.
 */

// Golf scoreboard dates are date-only (served at T04:00Z); the UTC calendar
// date is the round date, matching how the seeder stores them.
function utcDay(iso: string): string {
  return iso.slice(0, 10);
}
function addDays(day: string, n: number): string {
  const d = new Date(day + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function daySpan(start: string, end: string): number {
  const a = new Date(start + "T00:00:00Z").getTime();
  const b = new Date(end + "T00:00:00Z").getTime();
  return Math.round((b - a) / 86400000) + 1; // inclusive
}

async function espn(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "BoxdSeats/1.0 (arinaldi@yext.com)" },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

const MAX_GOLF_DAYS = 8; // match the seeder so an 8-day event isn't split/skipped

/**
 * Create upcoming/in-progress PGA tournaments as round-day `field` events, and
 * finalize them (fill winner_name) once they complete. Runs over a window from
 * `daysBack` to `daysAhead` so it catches both sides: scheduled/live events to
 * create, and just-finished ones to finalize. The seeder remains the source for
 * deep history; this owns the recent window so live events appear immediately.
 */
export async function syncUpcomingGolf(
  supabase: SupabaseClient,
  daysAhead = 45,
  daysBack = 10
): Promise<{ created: number; finalized: number; tournaments: number; skipped: number }> {
  const stats = { created: 0, finalized: 0, tournaments: 0, skipped: 0 };

  const { data: league } = await supabase.from("leagues").select("id").eq("slug", "pga-tour").single();
  if (!league) return stats;
  const leagueId = (league as { id: string }).id;

  const today = new Date().toISOString().slice(0, 10);
  const from = addDays(today, -daysBack).replace(/-/g, "");
  const to = addDays(today, daysAhead).replace(/-/g, "");
  const board = await espn(`https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard?dates=${from}-${to}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const events = ((board as any)?.events ?? []) as any[];
  const horizon = addDays(today, daysAhead);

  for (const ev of events) {
    const completed = ev?.status?.type?.state === "post" || ev?.status?.type?.completed === true;
    const id = ev?.id ? String(ev.id) : null;
    if (!id || !ev.date || !ev.endDate) continue;

    const startDay = utcDay(ev.date);
    const endDay = utcDay(ev.endDate);
    if (startDay > horizon) continue; // too far out
    const n = daySpan(startDay, endDay);
    if (n < 1 || n > MAX_GOLF_DAYS) continue;

    const exts = Array.from({ length: n }, (_, i) => `${id}-d${i + 1}`);
    const { data: existingRows } = await supabase
      .from("events").select("id, external_ids, tournament_id, winner_name").eq("league_id", leagueId).in("external_ids->>espn", exts);
    const have = new Set<string>();
    let tournamentId: string | null = null;
    const needsWinner: string[] = [];
    for (const r of existingRows || []) {
      const e = (r.external_ids as Record<string, unknown> | null)?.espn;
      if (e) have.add(String(e));
      if (r.tournament_id) tournamentId = r.tournament_id as string;
      if (!r.winner_name) needsWinner.push(r.id as string);
    }
    const missing = exts.filter((e) => !have.has(e));

    // Nothing to do: fully present and (if done) already has a winner.
    if (missing.length === 0 && !(completed && needsWinner.length > 0)) { stats.skipped++; continue; }

    // Need the leaderboard for the venue (create) and/or winner (finalize).
    const lb = await espn(`https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga&event=${id}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lbEvent = ((lb as any)?.events ?? [])[0];
    const winner: string | null = lbEvent?.winner?.displayName ?? null;

    if (missing.length > 0) {
      const courses = lbEvent?.courses ?? [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const course = courses.find((c: any) => c?.host) ?? courses[0];
      if (!course?.id) { stats.skipped++; continue; }
      // Resolve to an existing venue only (don't spawn venues for events that
      // may not be played). Match the seeder's `golf:{courseId}` id, then name.
      let venueId: string | null = null;
      const { data: byExt } = await supabase
        .from("venues").select("id").eq("external_ids->>espn", `golf:${course.id}`).maybeSingle();
      if (byExt) venueId = (byExt as { id: string }).id;
      if (!venueId && course.name) {
        const { data: byName } = await supabase
          .from("venues").select("id").ilike("name", course.name).limit(1).maybeSingle();
        if (byName) venueId = (byName as { id: string }).id;
      }
      if (!venueId) { stats.skipped++; continue; }

      const season = Number(startDay.slice(0, 4));
      if (!tournamentId) tournamentId = crypto.randomUUID();
      const rows = missing.map((ext) => {
        const d = Number(ext.split("-d")[1]);
        return {
          league_id: leagueId,
          venue_id: venueId,
          event_date: addDays(startDay, d - 1),
          event_template: "field",
          tournament_name: ev.name,
          tournament_id: tournamentId,
          day_number: d,
          season,
          is_postseason: false,
          round_or_stage: d === n ? "Final Round" : `Round ${d}`,
          winner_name: completed ? winner : null,
          external_ids: { espn: ext },
        };
      });
      const { error } = await supabase.from("events").insert(rows);
      if (error) console.error(`[upcomingGolf] insert failed for ${ev.name} (${id}): ${error.message}`);
      else { stats.created += rows.length; stats.tournaments++; }
    }

    // Finalize: fill winner on existing rows that lack one.
    if (completed && winner && needsWinner.length > 0) {
      const { error } = await supabase.from("events").update({ winner_name: winner }).in("id", needsWinner);
      if (!error) stats.finalized += needsWinner.length;
    }
  }

  return stats;
}
