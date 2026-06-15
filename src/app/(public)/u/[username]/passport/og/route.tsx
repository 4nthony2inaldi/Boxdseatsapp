/* eslint-disable @next/next/no-img-element -- ImageResponse markup, not the DOM */
import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { fetchPassport } from "@/lib/queries/passport";
import { buildPassportMap } from "@/lib/passportMap";

export const runtime = "edge";

const BG = "#0D0F14";
const ACCENT = "#D4872C";
const TEXT = "#F0EBE0";
const SUB = "#9BA1B5";
const WIN = "#3CB878";

const PROFILE_COLS =
  "id, username, display_name, bio, avatar_url, fav_sport, fav_team_id, fav_venue_id, fav_athlete_id, fav_event_id, pinned_list_1_id, pinned_list_2_id, is_private, passport_config";

const MAP_W = 700;
const MAP_H = 430;

function shortRing(name: string): string {
  return name.replace(/^All[- ]?(time |\d+ )?/i, "").trim();
}

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
  const avatar = profile.avatar_url as string | null;
  const stats: [string, string, boolean][] = [
    [String(data.stats.games), "GAMES", false],
    [String(data.stats.venues), "VENUES", false],
    [String(data.stats.cities), "CITIES", false],
    [data.stats.winPct !== null ? `${data.stats.winPct}%` : "—", "FAN WIN%", true],
  ];
  const topRing = data.rings[0];
  const { landPath, bubbles } = buildPassportMap(data.venues, MAP_W, MAP_H, 22);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: BG, padding: "44px 56px", color: TEXT, fontFamily: "sans-serif" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            {avatar ? (
              <img src={avatar} width={64} height={64} style={{ borderRadius: 999, objectFit: "cover" }} alt="" />
            ) : (
              <div style={{ width: 64, height: 64, borderRadius: 999, background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 700, color: BG }}>
                {name.replace("@", "").charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", marginLeft: 18 }}>
              <div style={{ fontSize: 22, color: SUB, letterSpacing: 2 }}>FAN PASSPORT</div>
              <div style={{ fontSize: 44, fontWeight: 700 }}>{name}</div>
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 28, fontWeight: 700 }}>
            <span style={{ color: TEXT }}>BOXD</span><span style={{ color: ACCENT }}>SEATS</span>
          </div>
        </div>

        {/* Body: stats + map */}
        <div style={{ display: "flex", flex: 1, marginTop: 26, alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", width: 320 }}>
            {stats.map(([v, l, hot]) => (
              <div key={l} style={{ display: "flex", flexDirection: "column", marginBottom: 22 }}>
                <div style={{ fontSize: 58, fontWeight: 700, lineHeight: 1, color: hot ? WIN : TEXT }}>{v}</div>
                <div style={{ fontSize: 19, color: SUB, letterSpacing: 1, marginTop: 4 }}>{l}</div>
              </div>
            ))}
            {topRing && topRing.total > 0 && (
              <div style={{ display: "flex", fontSize: 22, color: ACCENT }}>
                {`${topRing.visited}/${topRing.total} ${shortRing(topRing.name)}`}
              </div>
            )}
          </div>

          <div style={{ display: "flex", flex: 1, marginLeft: 28, borderRadius: 20, overflow: "hidden", background: "#0F1620" }}>
            <svg width={MAP_W} height={MAP_H} viewBox={`0 0 ${MAP_W} ${MAP_H}`}>
              <path d={landPath} fill="#1C2530" stroke="#2A3340" strokeWidth={0.6} />
              {bubbles.map((b) => (
                <circle key={b.id} cx={b.cx} cy={b.cy} r={b.r} fill={b.fill} />
              ))}
            </svg>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
