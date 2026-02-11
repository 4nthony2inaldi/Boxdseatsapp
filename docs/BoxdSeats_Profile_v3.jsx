import { useState } from "react";
import { Heart, MessageCircle, MapPin, Trophy, Search, Plus, User, Star, ChevronDown, Share2, Settings, ChevronRight, Lock, Bell } from "lucide-react";

// ─── Brand Tokens ───
const C = {
  bg: "#0D0F14",
  bgCard: "#161920",
  bgElevated: "#1C1F2A",
  bgInput: "#232735",
  accent: "#D4872C",
  accentBrown: "#7B5B3A",
  textPrimary: "#F0EBE0",
  textSecondary: "#9BA1B5",
  textMuted: "#5A5F72",
  border: "#2A2D3A",
  win: "#4ADE80",
  loss: "#F87171",
  draw: "#9BA1B5",
};

const LEAGUES = {
  NFL: { color: "#013369", icon: "🏈" },
  NBA: { color: "#1D428A", icon: "🏀" },
  MLB: { color: "#002D72", icon: "⚾" },
  NHL: { color: "#000000", icon: "🏒" },
  MLS: { color: "#5B2C82", icon: "⚽" },
  PGA: { color: "#003B2F", icon: "⛳" },
};

// ─── Mock Data ───
const PROFILE = {
  username: "anthony",
  displayName: "Anthony",
  bio: "NYC sports junkie | 34 stadiums and counting",
  stats: {
    totalEvents: 127, eventsThisYear: 23,
    totalVenues: 34, venuesThisYear: 8,
    followers: 284, following: 156,
    wins: 71, losses: 48, draws: 8,
    createdLists: 3, wantToVisit: 12,
    coverPhotos: 4,
  },
};

const ACTIVITY_DATA = [
  { month: "Mar", count: 3 }, { month: "Apr", count: 5 }, { month: "May", count: 2 },
  { month: "Jun", count: 4 }, { month: "Jul", count: 6 }, { month: "Aug", count: 3 },
  { month: "Sep", count: 7 }, { month: "Oct", count: 8 }, { month: "Nov", count: 4 },
  { month: "Dec", count: 5 }, { month: "Jan", count: 6 }, { month: "Feb", count: 2 },
];

const PINNED_LISTS = [
  { name: "All 30 MLB Stadiums", icon: "⚾", visited: 12, total: 30 },
  { name: "All 32 NFL Stadiums", icon: "🏈", visited: 8, total: 32 },
];

const MOST_RECENT_EVENT = {
  id: 1, league: "NBA", teams: "Knicks 118 — Celtics 112",
  venue: "Madison Square Garden", date: "Jan 28, 2026",
  rating: 5, outcome: "W", notes: "Brunson went off. 42 points. Garden was absolutely electric in the 4th.",
  likes: 24, comments: 6, privacy: "show_all",
};

// ─── Components ───
const StarRating = ({ rating }) => (
  <div style={{ display: "flex", gap: 2 }}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star key={n} size={12} fill={n <= rating ? C.accent : "transparent"} color={n <= rating ? C.accent : C.textMuted} strokeWidth={1.5} />
    ))}
  </div>
);

const OutcomeBadge = ({ outcome }) => {
  if (!outcome) return null;
  const colors = { W: C.win, L: C.loss, D: C.draw };
  return (
    <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 13, color: colors[outcome], letterSpacing: 1, padding: "2px 6px", border: `1px solid ${colors[outcome]}33`, borderRadius: 4 }}>
      {outcome}
    </span>
  );
};

const StatBox = ({ value, label }) => (
  <div style={{ textAlign: "center", flex: 1 }}>
    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: C.textPrimary, letterSpacing: 1 }}>{value}</div>
    <div style={{ fontSize: 10, color: C.textSecondary, textTransform: "uppercase", letterSpacing: 1.2 }}>{label}</div>
  </div>
);

const BigFourCard = ({ label, value, sub, color }) => (
  <div style={{ flex: 1, background: C.bgCard, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
    <div style={{ height: 80, background: `linear-gradient(135deg, ${color}88, ${C.bgElevated})`, position: "relative" }}>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 30, background: `linear-gradient(transparent, ${C.bgCard})` }} />
    </div>
    <div style={{ padding: "6px 8px 10px" }}>
      <div style={{ fontSize: 8, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1.5, fontFamily: "'Bebas Neue', sans-serif" }}>{label}</div>
      <div style={{ fontSize: 11, color: C.textPrimary, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
      <div style={{ fontSize: 9, color: C.textMuted }}>{sub}</div>
    </div>
  </div>
);

const ActivityChart = ({ data }) => {
  const max = Math.max(...data.map(d => d.count));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 60 }}>
      {data.map((d, i) => {
        const isLast = i === data.length - 1;
        const barH = max > 0 ? (d.count / max) * 50 : 0;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ fontSize: 8, color: C.textSecondary }}>{d.count > 0 ? d.count : ""}</div>
            <div style={{ width: "100%", height: barH, borderRadius: 3, background: isLast ? C.accent : `linear-gradient(180deg, ${C.accent}88, ${C.accentBrown}66)` }} />
            <div style={{ fontSize: 8, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>{d.month}</div>
          </div>
        );
      })}
    </div>
  );
};

const SummaryRow = ({ label, value, subValue, onClick }) => (
  <button onClick={onClick} style={{
    display: "flex", alignItems: "center", justifyContent: "space-between",
    width: "100%", padding: "14px 0",
    background: "none", border: "none", borderBottom: `1px solid ${C.border}`,
    cursor: "pointer",
  }}>
    <span style={{ fontSize: 15, color: C.textPrimary, fontWeight: 500 }}>{label}</span>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 14, color: C.textSecondary }}>
        {value}
        {subValue && <span style={{ color: C.textMuted }}> / {subValue} this year</span>}
      </span>
      <ChevronRight size={16} color={C.textMuted} />
    </div>
  </button>
);

// ─── Logo ───
const Logo = ({ size = 32 }) => (
  <svg width={size} height={size * 0.75} viewBox="0 0 80 60">
    <circle cx="22" cy="36" r="18" fill={C.accent} opacity="0.85" />
    <circle cx="50" cy="36" r="18" fill={C.accentBrown} opacity="0.85" />
    <circle cx="36" cy="20" r="16" fill={C.textPrimary} opacity="0.9" />
    <path d="M30,15 Q32,11 36,14 Q40,11 42,15" fill="none" stroke="#C83C2C" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M30,25 Q32,29 36,26 Q40,29 42,25" fill="none" stroke="#C83C2C" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// ─── Main Profile Screen (New Layout) ───
const ProfileScreen = () => {
  const [activeView, setActiveView] = useState("profile"); // profile | timeline | venues
  const p = PROFILE;

  if (activeView === "timeline") {
    return (
      <div style={{ paddingBottom: 20 }}>
        <button onClick={() => setActiveView("profile")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 16px", background: "none", border: "none", cursor: "pointer" }}>
          <span style={{ fontSize: 13, color: C.accent }}>← Back to Profile</span>
        </button>
        <div style={{ padding: "0 16px" }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: C.textPrimary, letterSpacing: 1, marginBottom: 16 }}>Logged Events</div>
          {[MOST_RECENT_EVENT, 
            { id: 2, league: "NFL", teams: "Giants 17 — Eagles 24", venue: "MetLife Stadium", date: "Jan 12, 2026", rating: 3, outcome: "L", notes: "Cold. Very cold. At least the tailgate was fun.", likes: 8, comments: 2, privacy: "show_all" },
            { id: 3, league: "NHL", teams: "Rangers 4 — Devils 1", venue: "Madison Square Garden", date: "Jan 5, 2026", rating: 4, outcome: "W", notes: null, likes: 15, comments: 3, privacy: "show_all" },
            { id: 4, league: "NBA", teams: "Knicks 105 — Bucks 98", venue: "Madison Square Garden", date: "Dec 22, 2025", rating: 4, outcome: "W", notes: "Christmas vibes at the Garden. OG was unreal defensively.", likes: 31, comments: 8, privacy: "show_all" },
            { id: 5, league: "MLB", teams: "Yankees 2 — Red Sox 6", venue: "Yankee Stadium", date: "Sep 15, 2025", rating: 2, outcome: "L", notes: "Rough one. Left in the 7th.", likes: 5, comments: 1, privacy: "hide_personal" },
          ].map((entry) => {
            const leagueData = LEAGUES[entry.league] || { icon: "🏟️" };
            return (
              <div key={entry.id} style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 12, padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{leagueData.icon}</span>
                    <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 12, color: leagueData.color, letterSpacing: 1.5, textTransform: "uppercase" }}>{entry.league}</span>
                    <OutcomeBadge outcome={entry.outcome} />
                  </div>
                  <StarRating rating={entry.rating} />
                </div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: C.textPrimary, letterSpacing: 0.5, lineHeight: 1.2, marginBottom: 4 }}>{entry.teams}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <MapPin size={12} color={C.textMuted} />
                  <span style={{ fontSize: 12, color: C.textSecondary }}>{entry.venue}</span>
                  <span style={{ fontSize: 12, color: C.textMuted }}>·</span>
                  <span style={{ fontSize: 12, color: C.textMuted }}>{entry.date}</span>
                </div>
                {entry.notes && entry.privacy === "show_all" && (
                  <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.5, marginBottom: 12, fontStyle: "italic" }}>"{entry.notes}"</div>
                )}
                {entry.privacy === "hide_personal" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                    <Lock size={11} color={C.textMuted} />
                    <span style={{ fontSize: 11, color: C.textMuted }}>Personal details hidden</span>
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 20, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <Heart size={16} color={C.textMuted} />
                    <span style={{ fontSize: 12, color: C.textMuted }}>{entry.likes}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <MessageCircle size={16} color={C.textMuted} />
                    <span style={{ fontSize: 12, color: C.textMuted }}>{entry.comments}</span>
                  </div>
                  <div style={{ marginLeft: "auto" }}>
                    <Share2 size={15} color={C.textMuted} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── Main Profile View ───
  return (
    <div style={{ paddingBottom: 20 }}>
      {/* Avatar + Name + Sport badge */}
      <div style={{ display: "flex", alignItems: "center", padding: "8px 16px 0", gap: 14, marginBottom: 12 }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: `linear-gradient(135deg, ${C.accent}, ${C.accentBrown})`, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${C.border}` }}>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: "#fff" }}>A</span>
          </div>
          <div style={{ position: "absolute", bottom: -2, right: -2, width: 26, height: 26, borderRadius: "50%", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${C.border}` }}>
            <span style={{ fontSize: 14 }}>🏀</span>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.textPrimary }}>{p.displayName}</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 12, color: C.textMuted }}>@{p.username}</div>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: C.win }}>{p.stats.wins}</span>
              <span style={{ fontSize: 11, color: C.textMuted }}>—</span>
              <span style={{ fontSize: 11, color: C.loss }}>{p.stats.losses}</span>
              <span style={{ fontSize: 11, color: C.textMuted }}>—</span>
              <span style={{ fontSize: 11, color: C.draw }}>{p.stats.draws}</span>
            </div>
          </div>
          <div style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.4, marginTop: 3 }}>{p.bio}</div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, padding: "0 16px", marginBottom: 20 }}>
        <StatBox value={p.stats.totalEvents} label="Events" />
        <StatBox value={p.stats.totalVenues} label="Venues" />
        <StatBox value={p.stats.followers} label="Followers" />
        <StatBox value={p.stats.following} label="Following" />
      </div>

      {/* The Big Four */}
      <div style={{ padding: "0 16px", marginBottom: 20 }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 13, color: C.textMuted, letterSpacing: 2, marginBottom: 10, textTransform: "uppercase" }}>The Big Four</div>
        <div style={{ display: "flex", gap: 8 }}>
          <BigFourCard label="Team" value="Yankees" sub="MLB" color={LEAGUES.MLB.color} />
          <BigFourCard label="Venue" value="PNC Park" sub="Pittsburgh, PA" color={C.accent} />
          <BigFourCard label="Athlete" value="R. Blaney" sub="NASCAR #12" color={C.accentBrown} />
          <BigFourCard label="Event" value="10.01.2013" sub="PIT 6 — CIN 2" color="#8B0000" />
        </div>
      </div>

      {/* Activity Chart */}
      <div style={{ padding: "0 16px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 13, color: C.textMuted, letterSpacing: 2, textTransform: "uppercase" }}>Activity</div>
          <div style={{ fontSize: 11, color: C.textSecondary }}>55 events · past 12 mo</div>
        </div>
        <div style={{ background: C.bgCard, borderRadius: 12, border: `1px solid ${C.border}`, padding: "14px 12px 8px" }}>
          <ActivityChart data={ACTIVITY_DATA} />
        </div>
      </div>

      {/* Pinned Lists */}
      <div style={{ padding: "0 16px", marginBottom: 20 }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 13, color: C.textMuted, letterSpacing: 2, marginBottom: 10, textTransform: "uppercase" }}>Pinned Lists</div>
        {PINNED_LISTS.map((list, i) => {
          const pct = Math.round((list.visited / list.total) * 100);
          return (
            <div key={i} style={{ background: C.bgCard, borderRadius: 12, border: `1px solid ${C.border}`, padding: "12px 14px", marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{list.icon}</span>
                  <span style={{ fontSize: 13, color: C.textPrimary, fontWeight: 500 }}>{list.name}</span>
                </div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, color: C.accent, letterSpacing: 1 }}>{list.visited}/{list.total}</div>
              </div>
              <div style={{ height: 5, background: C.bgInput, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${C.accent}, ${C.accentBrown})`, borderRadius: 3 }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Most Recent Event */}
      <div style={{ padding: "0 16px", marginBottom: 6 }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 13, color: C.textMuted, letterSpacing: 2, marginBottom: 10, textTransform: "uppercase" }}>Latest Event</div>
        <div style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>{LEAGUES[MOST_RECENT_EVENT.league].icon}</span>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 12, color: LEAGUES[MOST_RECENT_EVENT.league].color, letterSpacing: 1.5, textTransform: "uppercase" }}>{MOST_RECENT_EVENT.league}</span>
              <OutcomeBadge outcome={MOST_RECENT_EVENT.outcome} />
            </div>
            <StarRating rating={MOST_RECENT_EVENT.rating} />
          </div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: C.textPrimary, letterSpacing: 0.5, lineHeight: 1.2, marginBottom: 4 }}>{MOST_RECENT_EVENT.teams}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <MapPin size={12} color={C.textMuted} />
            <span style={{ fontSize: 12, color: C.textSecondary }}>{MOST_RECENT_EVENT.venue}</span>
            <span style={{ fontSize: 12, color: C.textMuted }}>·</span>
            <span style={{ fontSize: 12, color: C.textMuted }}>{MOST_RECENT_EVENT.date}</span>
          </div>
          {MOST_RECENT_EVENT.notes && (
            <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.5, fontStyle: "italic" }}>"{MOST_RECENT_EVENT.notes}"</div>
          )}
        </div>
      </div>

      {/* Summary Rows — Letterboxd style */}
      <div style={{ padding: "0 16px", marginBottom: 20 }}>
        <SummaryRow label="Visited Venues" value={p.stats.totalVenues} subValue={p.stats.venuesThisYear} onClick={() => {}} />
        <SummaryRow label="Logged Events" value={p.stats.totalEvents} subValue={p.stats.eventsThisYear} onClick={() => setActiveView("timeline")} />
        <SummaryRow label="Created Lists" value={p.stats.createdLists} onClick={() => {}} />
        <SummaryRow label="Want to Visit" value={p.stats.wantToVisit} onClick={() => {}} />
      </div>

      {/* Share Profile Button */}
      <div style={{ padding: "0 16px", marginBottom: 20 }}>
        <button style={{
          width: "100%", padding: "14px 0",
          background: "none", border: `1px solid ${C.accent}`,
          borderRadius: 12, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <Share2 size={16} color={C.accent} />
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 15, color: C.accent, letterSpacing: 2 }}>Share Profile</span>
        </button>
      </div>
    </div>
  );
};

// ─── Bottom Nav ───
const BottomNav = ({ active, onNav }) => {
  const tabs = [
    { id: "feed", icon: <User size={20} />, label: "Feed" },
    { id: "explore", icon: <Search size={20} />, label: "Explore" },
    { id: "log", icon: <Plus size={22} />, label: "Log", isCenter: true },
    { id: "lists", icon: <Trophy size={20} />, label: "Lists" },
    { id: "profile", icon: <User size={20} />, label: "Profile" },
  ];
  return (
    <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 390, background: C.bg, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-around", alignItems: "center", height: 60, zIndex: 100, paddingBottom: 4 }}>
      {tabs.map((tab) => (
        <button key={tab.id} onClick={() => onNav(tab.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "none", border: "none", cursor: "pointer", padding: "6px 12px", position: "relative" }}>
          {tab.isCenter ? (
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: `linear-gradient(135deg, ${C.accent}, ${C.accentBrown})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", marginTop: -14, boxShadow: `0 4px 16px ${C.accent}44` }}>
              {tab.icon}
            </div>
          ) : (
            <>
              <div style={{ color: active === tab.id ? C.accent : C.textMuted }}>{tab.icon}</div>
              <span style={{ fontSize: 9, color: active === tab.id ? C.accent : C.textMuted, letterSpacing: 0.8, textTransform: "uppercase", fontFamily: "'Bebas Neue', sans-serif" }}>{tab.label}</span>
            </>
          )}
        </button>
      ))}
    </div>
  );
};

// ─── App Shell ───
export default function App() {
  return (
    <div style={{ maxWidth: 390, margin: "0 auto", minHeight: "100vh", background: C.bg, color: C.textPrimary, fontFamily: "system-ui, -apple-system, sans-serif", position: "relative" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 10px", position: "sticky", top: 0, background: C.bg, zIndex: 50, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Logo size={32} />
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 15, letterSpacing: 3 }}>
            <span style={{ color: C.textPrimary }}>BOXD</span><span style={{ color: C.accent }}>SEATS</span>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Bell size={20} color={C.textSecondary} />
          <Settings size={20} color={C.textSecondary} />
        </div>
      </div>

      {/* Profile Content */}
      <ProfileScreen />

      {/* Bottom Nav */}
      <BottomNav active="profile" onNav={() => {}} />

      {/* Bottom safe area */}
      <div style={{ height: 70 }} />
    </div>
  );
}
