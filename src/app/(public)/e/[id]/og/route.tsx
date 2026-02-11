import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { fetchPublicEventLog } from "@/lib/queries/sharing";
import { fetchEventDetail } from "@/lib/queries/event";

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

function getOutcomeColor(outcome: string | null): string {
  if (outcome === "win") return WIN;
  if (outcome === "loss") return LOSS;
  if (outcome === "draw") return DRAW;
  return TEXT_MUTED;
}

function getStarDisplay(rating: number): string {
  return "\u2605".repeat(rating) + "\u2606".repeat(5 - rating);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const logEntry = await fetchPublicEventLog(supabase, id);

  if (!logEntry) {
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
          Event Not Found
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  // Fetch event details if available
  const event = logEntry.event_id
    ? await fetchEventDetail(supabase, logEntry.event_id)
    : null;

  const isMatch = event?.event_template === "match";
  const displayTitle =
    logEntry.matchup || logEntry.manual_title || event?.tournament_name || "Event";
  const authorName =
    logEntry.author_display_name || logEntry.author_username;
  const formattedDate = new Date(
    logEntry.event_date + "T00:00:00"
  ).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const leagueColor = event?.league_color || ACCENT;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: BG,
          position: "relative",
        }}
      >
        {/* League-colored gradient header */}
        <div
          style={{
            width: "100%",
            height: 120,
            background: `linear-gradient(to bottom, ${leagueColor}40, transparent)`,
            display: "flex",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "0 56px",
            flex: 1,
            marginTop: -60,
          }}
        >
          {/* League badge */}
          {event && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: leagueColor,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                }}
              >
                {event.league_name}
              </div>
              {event.round_or_stage && (
                <>
                  <div style={{ color: TEXT_MUTED, fontSize: 16 }}>
                    &middot;
                  </div>
                  <div style={{ color: TEXT_MUTED, fontSize: 16 }}>
                    {event.round_or_stage}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Scoreboard or title */}
          {isMatch && event ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 40,
                backgroundColor: CARD_BG,
                border: `1px solid ${BORDER}`,
                borderRadius: 20,
                padding: "28px 48px",
                marginBottom: 24,
              }}
            >
              {/* Away team */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: TEXT_PRIMARY,
                    letterSpacing: 2,
                  }}
                >
                  {event.away_team_abbr || event.away_team_short || "AWAY"}
                </div>
                <div
                  style={{
                    fontSize: 56,
                    fontWeight: 700,
                    color: TEXT_PRIMARY,
                    marginTop: 4,
                  }}
                >
                  {event.away_score ?? "\u2014"}
                </div>
              </div>

              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: TEXT_MUTED,
                  letterSpacing: 3,
                }}
              >
                VS
              </div>

              {/* Home team */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: TEXT_PRIMARY,
                    letterSpacing: 2,
                  }}
                >
                  {event.home_team_abbr || event.home_team_short || "HOME"}
                </div>
                <div
                  style={{
                    fontSize: 56,
                    fontWeight: 700,
                    color: TEXT_PRIMARY,
                    marginTop: 4,
                  }}
                >
                  {event.home_score ?? "\u2014"}
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                fontSize: 42,
                fontWeight: 700,
                color: TEXT_PRIMARY,
                lineHeight: 1.1,
                marginBottom: 24,
              }}
            >
              {displayTitle}
            </div>
          )}

          {/* Venue + Date */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 24,
            }}
          >
            <div style={{ fontSize: 20, color: TEXT_SECONDARY }}>
              {logEntry.venue_name || ""}
            </div>
            {logEntry.venue_name && (
              <div style={{ fontSize: 20, color: TEXT_MUTED }}>&middot;</div>
            )}
            <div style={{ fontSize: 20, color: TEXT_MUTED }}>
              {formattedDate}
            </div>
          </div>

          {/* Log details row: outcome + rating */}
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            {logEntry.outcome && (
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: getOutcomeColor(logEntry.outcome),
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  backgroundColor: `${getOutcomeColor(logEntry.outcome)}15`,
                  padding: "8px 20px",
                  borderRadius: 8,
                  border: `1px solid ${getOutcomeColor(logEntry.outcome)}30`,
                }}
              >
                {logEntry.outcome}
              </div>
            )}
            {logEntry.rating && (
              <div style={{ fontSize: 24, color: ACCENT, letterSpacing: 2 }}>
                {getStarDisplay(logEntry.rating)}
              </div>
            )}
          </div>

          {/* Author */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginTop: "auto",
              marginBottom: 8,
            }}
          >
            {logEntry.author_avatar_url ? (
              <img
                src={logEntry.author_avatar_url}
                alt=""
                width={40}
                height={40}
                style={{
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: `2px solid ${BORDER}`,
                }}
              />
            ) : (
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${ACCENT}, #7B5B3A)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  fontWeight: 700,
                  color: "white",
                  border: `2px solid ${BORDER}`,
                }}
              >
                {authorName.charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{ fontSize: 18, fontWeight: 600, color: TEXT_PRIMARY }}
              >
                {authorName}
              </div>
              <div style={{ fontSize: 14, color: TEXT_MUTED }}>
                @{logEntry.author_username}
              </div>
            </div>
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
            boxdseats.com/e/{id}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
