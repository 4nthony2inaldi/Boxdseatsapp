import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { fetchPassport } from "@/lib/queries/passport";

export const runtime = "edge";

const BG = "#0D0F14";
const CARD = "#161920";
const ACCENT = "#D4872C";
const TEXT = "#F0EBE0";
const SUB = "#9BA1B5";
const MUTED = "#5A5F72";
const WIN = "#3CB878";
const BORDER = "#23272F";

const PROFILE_COLS =
  "id, username, display_name, bio, avatar_url, fav_sport, fav_team_id, fav_venue_id, fav_athlete_id, fav_event_id, pinned_list_1_id, pinned_list_2_id, is_private, passport_config";

export async function GET(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select(PROFILE_COLS).eq("username", username).maybeSingle();

  if (!profile || (profile.is_private as boolean)) {
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: BG, color: TEXT, fontSize: 48 }}>
          BoxdSeats
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  const data = await fetchPassport(supabase, profile);
  const name = (profile.display_name as string) || `@${profile.username}`;
  const stats: [string, string, string?][] = [
    [String(data.stats.games), "GAMES"],
    [String(data.stats.venues), "VENUES"],
    [String(data.stats.cities), "CITIES"],
    [data.stats.winPct !== null ? `${data.stats.winPct}%` : "—", "FAN WIN%"],
  ];
  const rings = data.rings.slice(0, 3);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: BG, padding: 64, color: TEXT, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 30, color: SUB, letterSpacing: 2 }}>FAN PASSPORT</div>
            <div style={{ fontSize: 56, fontWeight: 700, marginTop: 6 }}>{name}</div>
          </div>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700 }}>
            <span style={{ color: TEXT }}>BOXD</span><span style={{ color: ACCENT }}>SEATS</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 20, marginTop: 56 }}>
          {stats.map(([v, l], i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: "28px 12px" }}>
              <div style={{ fontSize: 64, fontWeight: 700, color: i === 3 ? WIN : TEXT }}>{v}</div>
              <div style={{ fontSize: 22, color: SUB, letterSpacing: 1, marginTop: 6 }}>{l}</div>
            </div>
          ))}
        </div>

        {rings.length > 0 && (
          <div style={{ display: "flex", gap: 16, marginTop: 44, flexWrap: "wrap" }}>
            {rings.map((r) => (
              <div key={r.list_id} style={{ display: "flex", alignItems: "center", gap: 10, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 999, padding: "12px 20px" }}>
                <span style={{ fontSize: 26, color: TEXT }}>{r.name}</span>
                <span style={{ fontSize: 26, fontWeight: 700, color: r.total > 0 && r.visited >= r.total ? ACCENT : WIN }}>{r.visited}/{r.total}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: "auto", fontSize: 24, color: MUTED }}>{`boxdseats.com/@${profile.username}/passport`}</div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
