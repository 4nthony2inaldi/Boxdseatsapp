/* eslint-disable @next/next/no-img-element -- ImageResponse markup, not the DOM */
import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { fetchPassport, type PassportRing } from "@/lib/queries/passport";
import { buildPassportMap } from "@/lib/passportMap";

export const runtime = "edge";

const BG = "#0D0F14";
const ACCENT = "#D4872C";
const TEXT = "#F0EBE0";
const SUB = "#9BA1B5";
const WIN = "#3CB878";
const TRACK = "#2A2D3A";

const PROFILE_COLS =
  "id, username, display_name, bio, avatar_url, fav_sport, fav_team_id, fav_venue_id, fav_athlete_id, fav_event_id, pinned_list_1_id, pinned_list_2_id, is_private, passport_config";

const MAP_W = 768;
const MAP_H = 380;
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://boxdseats.com";

function BigRing({ ring }: { ring: PassportRing }) {
  const R = 86;
  const C = 2 * Math.PI * R;
  const pct = ring.total > 0 ? Math.min(1, ring.visited / ring.total) : 0;
  const done = ring.total > 0 && ring.visited >= ring.total;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ display: "flex", position: "relative", width: 200, height: 200, alignItems: "center", justifyContent: "center" }}>
        <svg width={200} height={200} viewBox="0 0 200 200" style={{ position: "absolute", top: 0, left: 0 }}>
          <circle cx={100} cy={100} r={R} fill="none" stroke={TRACK} strokeWidth={13} />
          <circle
            cx={100} cy={100} r={R} fill="none" stroke={done ? ACCENT : WIN} strokeWidth={13} strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * (1 - pct)} transform="rotate(-90 100 100)"
          />
        </svg>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          {ring.icon ? <img src={`${SITE}${ring.icon}`} width={34} height={34} alt="" /> : null}
          <div style={{ fontSize: 46, fontWeight: 700, color: TEXT, marginTop: 4 }}>{`${ring.visited}/${ring.total}`}</div>
        </div>
      </div>
      <div style={{ display: "flex", fontSize: 22, color: SUB, textAlign: "center", marginTop: 16 }}>{ring.name}</div>
    </div>
  );
}

export async function GET(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select(PROFILE_COLS).eq("username", username).maybeSingle();

  if (!profile || (profile.is_private as boolean)) {
    return new ImageResponse(
      (<div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: BG, color: TEXT, fontSize: 48 }}>BoxdSeats</div>),
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
  const heroRing = data.topComplete[0] ?? null;
  const { landPath, bubbles } = buildPassportMap(data.venues, MAP_W, MAP_H, 20);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: BG, padding: "32px 48px", color: TEXT, fontFamily: "sans-serif" }}>
        {/* Brand */}
        <div style={{ display: "flex", fontSize: 26, fontWeight: 700 }}>
          <span style={{ color: TEXT }}>BOXD</span><span style={{ color: ACCENT }}>SEATS</span>
        </div>

        {/* Header: avatar + name | stats */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            {avatar ? (
              <img src={avatar} width={72} height={72} style={{ borderRadius: 999, objectFit: "cover" }} alt="" />
            ) : (
              <div style={{ width: 72, height: 72, borderRadius: 999, background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, fontWeight: 700, color: BG }}>
                {name.replace("@", "").charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ display: "flex", fontSize: 46, fontWeight: 700, marginLeft: 20 }}>{name}</div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            {stats.map(([v, l, hot], i) => (
              <div key={l} style={{ display: "flex", flexDirection: "column", alignItems: "center", marginLeft: i === 0 ? 0 : 36 }}>
                <div style={{ fontSize: 52, fontWeight: 700, lineHeight: 1, color: hot ? WIN : TEXT }}>{v}</div>
                <div style={{ fontSize: 17, color: SUB, letterSpacing: 1, marginTop: 5 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{ display: "flex", height: 2, background: ACCENT, opacity: 0.5, marginTop: 18, marginBottom: 20 }} />

        {/* Body: hero ring | map */}
        <div style={{ display: "flex", flex: 1 }}>
          <div style={{ display: "flex", width: 300, alignItems: "center", justifyContent: "center" }}>
            {heroRing ? <BigRing ring={heroRing} /> : null}
          </div>
          <div style={{ display: "flex", flex: 1, marginLeft: 24, borderRadius: 20, overflow: "hidden", background: "#0F1620" }}>
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
