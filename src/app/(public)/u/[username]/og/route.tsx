import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { fetchProfileStats, fetchBigFour } from "@/lib/queries/profile";
import { fetchUserProfileByUsername } from "@/lib/queries/social";

export const runtime = "edge";

const BG = "#0D0F14";
const CARD_BG = "#161920";
const ACCENT = "#D4872C";
const TEXT_PRIMARY = "#F0EBE0";
const TEXT_SECONDARY = "#9BA1B5";
const TEXT_MUTED = "#5A5F72";
const WIN = "#3CB878";
const LOSS = "#C83C2C";
const DRAW = "#9BA1B5";
const BORDER = "#23272F";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const supabase = await createClient();
  const profile = await fetchUserProfileByUsername(supabase, username);

  if (!profile) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: BG,
            color: TEXT_PRIMARY,
            fontSize: 48,
            fontWeight: 700,
          }}
        >
          User Not Found
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  const [stats, bigFour] = await Promise.all([
    fetchProfileStats(supabase, profile.id),
    fetchBigFour(supabase, profile),
  ]);

  const displayName = profile.display_name || profile.username;
  const initial = displayName.charAt(0).toUpperCase();

  const bigFourLabels: Record<string, string> = {
    team: "Team",
    venue: "Venue",
    athlete: "Athlete",
    event: "Event",
  };

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: BG,
          padding: 0,
          position: "relative",
        }}
      >
        {/* Top gradient bar */}
        <div
          style={{
            width: "100%",
            height: 6,
            background: `linear-gradient(90deg, ${ACCENT}, #7B5B3A)`,
            display: "flex",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "40px 56px",
            flex: 1,
          }}
        >
          {/* Header: avatar + name + stats */}
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            {/* Avatar */}
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                width={96}
                height={96}
                style={{
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: `3px solid ${BORDER}`,
                }}
              />
            ) : (
              <div
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${ACCENT}, #7B5B3A)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 42,
                  fontWeight: 700,
                  color: "white",
                  border: `3px solid ${BORDER}`,
                }}
              >
                {initial}
              </div>
            )}

            {/* Name + username */}
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div
                style={{
                  fontSize: 40,
                  fontWeight: 700,
                  color: TEXT_PRIMARY,
                  lineHeight: 1.1,
                }}
              >
                {displayName}
              </div>
              <div style={{ fontSize: 22, color: TEXT_MUTED, marginTop: 4 }}>
                @{profile.username}
              </div>
              {profile.bio && (
                <div
                  style={{
                    fontSize: 18,
                    color: TEXT_SECONDARY,
                    marginTop: 8,
                    lineHeight: 1.3,
                    maxWidth: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {profile.bio.length > 80
                    ? profile.bio.slice(0, 80) + "..."
                    : profile.bio}
                </div>
              )}
            </div>

            {/* Fan Record */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                backgroundColor: CARD_BG,
                border: `1px solid ${BORDER}`,
                borderRadius: 16,
                padding: "16px 24px",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: TEXT_MUTED,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Fan Record
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ fontSize: 28, fontWeight: 700, color: WIN }}>
                  {stats.wins}
                </span>
                <span style={{ fontSize: 20, color: TEXT_MUTED }}>{"\u2014"}</span>
                <span style={{ fontSize: 28, fontWeight: 700, color: LOSS }}>
                  {stats.losses}
                </span>
                <span style={{ fontSize: 20, color: TEXT_MUTED }}>{"\u2014"}</span>
                <span style={{ fontSize: 28, fontWeight: 700, color: DRAW }}>
                  {stats.draws}
                </span>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div
            style={{
              display: "flex",
              gap: 16,
              marginTop: 32,
            }}
          >
            {[
              { value: stats.totalEvents, label: "Events" },
              { value: stats.totalVenues, label: "Venues" },
              { value: stats.followers, label: "Followers" },
              { value: stats.following, label: "Following" },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  flex: 1,
                  backgroundColor: CARD_BG,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 12,
                  padding: "16px 0",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 30,
                    fontWeight: 700,
                    color: ACCENT,
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: TEXT_MUTED,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                    marginTop: 2,
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Big Four */}
          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            {bigFour.map((item) => (
              <div
                key={item.category}
                style={{
                  flex: 1,
                  backgroundColor: CARD_BG,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 12,
                  padding: "14px 16px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: TEXT_MUTED,
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  {bigFourLabels[item.category] || item.category}
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color:
                      item.name === "Not set" ? TEXT_MUTED : TEXT_PRIMARY,
                    lineHeight: 1.2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {item.name}
                </div>
                {item.subtitle && (
                  <div
                    style={{
                      fontSize: 12,
                      color: TEXT_SECONDARY,
                      marginTop: 2,
                    }}
                  >
                    {item.subtitle}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 56px 28px",
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: ACCENT,
              letterSpacing: 2,
            }}
          >
            BOXDSEATS
          </div>
          <div style={{ fontSize: 16, color: TEXT_MUTED }}>
            boxdseats.com/@{username}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
