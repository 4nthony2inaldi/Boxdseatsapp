import { useState } from "react";
import { Heart, MessageCircle, MapPin, Trophy, Search, Plus, User, Star, ChevronDown, Share2, Settings, MoreHorizontal, Calendar, Users, Lock, ChevronLeft, ChevronRight, Check, Camera, Clock, Edit3 } from "lucide-react";

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
  avatarUrl: null,
  isPrivate: false,
  stats: { totalEvents: 127, eventsThisYear: 23, totalVenues: 34, venuesThisYear: 8, followers: 284, following: 156, wins: 71, losses: 48, draws: 8 },
  bigFive: {
    sport: { label: "Basketball", icon: "🏀" },
    team: { label: "New York Knicks", icon: "🏀", sub: "NBA" },
    athlete: { label: "Jalen Brunson", sub: "NYK #11" },
    venue: { label: "Madison Square Garden", sub: "New York, NY" },
    event: { label: "Knicks vs Pacers G7", sub: "2024 ECSF" },
  },
};

const TIMELINE = [
  { id: 1, league: "NBA", teams: "Knicks 118 — Celtics 112", venue: "Madison Square Garden", venueId: "msg", date: "Jan 28, 2026", rating: 5, outcome: "W", rooting: "NYK", notes: "Brunson went off. 42 points. Garden was absolutely electric in the 4th.", hasPhoto: true, likes: 24, comments: 6, privacy: "show_all", seat: "Section 110, Row 4", companions: ["@kyle", "@mike", "Dad"] },
  { id: 2, league: "NFL", teams: "Giants 17 — Eagles 24", venue: "MetLife Stadium", venueId: "metlife", date: "Jan 12, 2026", rating: 3, outcome: "L", rooting: "NYG", notes: "Cold. Very cold. At least the tailgate was fun.", hasPhoto: false, likes: 8, comments: 2, privacy: "show_all", seat: "Section 234, Row 12", companions: ["@dave"] },
  { id: 3, league: "NHL", teams: "Rangers 4 — Devils 1", venue: "Madison Square Garden", venueId: "msg", date: "Jan 5, 2026", rating: 4, outcome: "W", rooting: "NYR", notes: null, hasPhoto: true, likes: 15, comments: 3, privacy: "show_all", seat: null, companions: [] },
  { id: 4, league: "NBA", teams: "Knicks 105 — Bucks 98", venue: "Madison Square Garden", venueId: "msg", date: "Dec 22, 2025", rating: 4, outcome: "W", rooting: "NYK", notes: "Christmas vibes at the Garden. OG was unreal defensively.", hasPhoto: false, likes: 31, comments: 8, privacy: "show_all", seat: "Section 110, Row 4", companions: ["@kyle"] },
  { id: 5, league: "MLB", teams: "Yankees 2 — Red Sox 6", venue: "Yankee Stadium", venueId: "yankee", date: "Sep 15, 2025", rating: 2, outcome: "L", rooting: "NYY", notes: "Rough one. Left in the 7th.", hasPhoto: true, likes: 5, comments: 1, privacy: "hide_personal", seat: null, companions: [] },
  { id: 6, league: "PGA", teams: "The Masters — Round 3", venue: "Augusta National", venueId: "augusta", date: "Apr 12, 2025", rating: 5, outcome: null, rooting: null, notes: "Bucket list. Amen Corner is even more beautiful in person.", hasPhoto: true, likes: 89, comments: 22, privacy: "show_all", seat: null, companions: ["@mike", "@dave", "@chris"] },
];

const VENUES_VISITED = [
  { name: "MSG", lat: 40.75, lng: -73.99, sport: "NBA" },
  { name: "Yankee Stadium", lat: 40.83, lng: -73.93, sport: "MLB" },
  { name: "MetLife", lat: 40.81, lng: -74.07, sport: "NFL" },
  { name: "Citi Field", lat: 40.76, lng: -73.85, sport: "MLB" },
  { name: "Barclays", lat: 40.68, lng: -73.97, sport: "NBA" },
  { name: "Prudential", lat: 40.73, lng: -74.17, sport: "NHL" },
  { name: "UBS Arena", lat: 40.72, lng: -73.72, sport: "NHL" },
  { name: "Fenway", lat: 42.35, lng: -71.10, sport: "MLB" },
  { name: "TD Garden", lat: 42.37, lng: -71.06, sport: "NBA" },
  { name: "Augusta", lat: 33.50, lng: -82.02, sport: "PGA" },
  { name: "Wrigley", lat: 41.95, lng: -87.66, sport: "MLB" },
  { name: "Soldier Field", lat: 41.86, lng: -87.62, sport: "NFL" },
];

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
    <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 13, color: colors[outcome] || C.textMuted, letterSpacing: 1, padding: "2px 6px", border: `1px solid ${colors[outcome] || C.textMuted}33`, borderRadius: 4 }}>
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

const BigFiveItem = ({ icon, label, sub, type }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 64 }}>
    <div style={{ width: 52, height: 52, borderRadius: 12, background: `linear-gradient(135deg, ${C.bgElevated}, ${C.bgCard})`, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
      {icon || type.charAt(0).toUpperCase()}
    </div>
    <div style={{ fontSize: 11, color: C.textPrimary, fontWeight: 600, textAlign: "center", lineHeight: 1.2, maxWidth: 72, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
    {sub && <div style={{ fontSize: 9, color: C.textMuted, textAlign: "center", marginTop: -4 }}>{sub}</div>}
  </div>
);

const VenueMapMini = ({ venues }) => {
  const minLat = Math.min(...venues.map(v => v.lat)) - 1;
  const maxLat = Math.max(...venues.map(v => v.lat)) + 1;
  const minLng = Math.min(...venues.map(v => v.lng)) - 1;
  const maxLng = Math.max(...venues.map(v => v.lng)) + 1;
  const sportColors = { NBA: "#1D428A", MLB: "#002D72", NFL: "#013369", NHL: "#C8102E", MLS: "#5B2C82", PGA: "#003B2F" };

  return (
    <div style={{ width: "100%", height: 160, borderRadius: 12, background: C.bgCard, border: `1px solid ${C.border}`, position: "relative", overflow: "hidden" }}>
      {/* Simplified US outline hint */}
      <svg viewBox="0 0 100 60" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.06 }}>
        <path d="M10,15 Q15,10 25,12 L35,10 Q50,8 65,10 L80,12 Q90,14 92,20 L93,30 Q92,35 88,38 L85,42 Q80,45 75,44 L65,46 Q55,50 45,48 L35,50 Q25,48 20,44 L15,40 Q10,35 8,28 L10,15Z" fill={C.textMuted} />
      </svg>
      {venues.map((v, i) => {
        const x = ((v.lng - minLng) / (maxLng - minLng)) * 90 + 5;
        const y = ((maxLat - v.lat) / (maxLat - minLat)) * 80 + 10;
        return (
          <div key={i} style={{ position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: sportColors[v.sport] || C.accent, border: `1.5px solid ${C.textPrimary}`, boxShadow: `0 0 6px ${sportColors[v.sport] || C.accent}44` }} />
          </div>
        );
      })}
      <div style={{ position: "absolute", bottom: 8, right: 10, fontSize: 10, color: C.textMuted }}>
        {venues.length} venues visited
      </div>
    </div>
  );
};

const TimelineCard = ({ entry, onVenueTap, onEventTap, showAuthor }) => {
  const [liked, setLiked] = useState(false);
  const leagueData = LEAGUES[entry.league] || { color: C.accent, icon: "🏟️" };

  return (
    <div style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 12 }}>
      <div style={{ padding: "14px 16px" }}>
        {/* Author row (feed only) */}
        {showAuthor && entry.author && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg, ${entry.author.color || C.accent}, ${C.accentBrown})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 12, color: "#fff" }}>{entry.author.name.charAt(0).toUpperCase()}</span>
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 13, color: C.textPrimary, fontWeight: 600 }}>{entry.author.name}</span>
              <span style={{ fontSize: 12, color: C.textMuted, marginLeft: 6 }}>@{entry.author.username}</span>
            </div>
            <span style={{ fontSize: 11, color: C.textMuted }}>{entry.date}</span>
          </div>
        )}
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>{leagueData.icon}</span>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 12, color: leagueData.color, letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.9 }}>{entry.league}</span>
            <OutcomeBadge outcome={entry.outcome} />
          </div>
          <StarRating rating={entry.rating} />
        </div>
        {/* Teams / Event */}
        <div onClick={() => onEventTap?.(entry.id)} style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: C.textPrimary, letterSpacing: 0.5, lineHeight: 1.2, marginBottom: 4, cursor: "pointer" }}>
          {entry.teams}
        </div>
        {/* Venue + Date */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <MapPin size={12} color={C.textMuted} />
          <span onClick={() => onVenueTap?.(entry.venueId)} style={{ fontSize: 12, color: C.textSecondary, cursor: "pointer" }}>{entry.venue}</span>
          <span style={{ fontSize: 12, color: C.textMuted }}>·</span>
          <span style={{ fontSize: 12, color: C.textMuted }}>{entry.date}</span>
        </div>
        {/* Notes */}
        {entry.notes && entry.privacy === "show_all" && (
          <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.5, marginBottom: 12, fontStyle: "italic" }}>
            "{entry.notes}"
          </div>
        )}
        {entry.privacy === "hide_personal" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <Lock size={11} color={C.textMuted} />
            <span style={{ fontSize: 11, color: C.textMuted }}>Personal details hidden</span>
          </div>
        )}
        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
          <button onClick={() => setLiked(!liked)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <Heart size={16} fill={liked ? "#F87171" : "transparent"} color={liked ? "#F87171" : C.textMuted} />
            <span style={{ fontSize: 12, color: liked ? "#F87171" : C.textMuted }}>{entry.likes + (liked ? 1 : 0)}</span>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <MessageCircle size={16} color={C.textMuted} />
            <span style={{ fontSize: 12, color: C.textMuted }}>{entry.comments}</span>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <Share2 size={15} color={C.textMuted} />
          </div>
        </div>
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

// ─── Screen: Profile ───
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

const IMG_TEAM = "data:image/jpeg;base64,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";
const IMG_ATHLETE = "data:image/jpeg;base64,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";
const IMG_VENUE = "data:image/jpeg;base64,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";
const IMG_AVATAR = "data:image/jpeg;base64,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";
const IMG_EVENT = "data:image/jpeg;base64,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";

const Logo = ({ size = 40 }) => {
  const r = size * 0.25, rO = r * 0.82, sp = r * 1.1;
  const cx1 = size/2 - sp, cx2 = size/2, cx3 = size/2 + sp, cy = size/2;
  const cL = cx1 - rO, cR = cx3 + rO, cT = cy - r, cB = cy + r;
  const cW = cR - cL, cH = cB - cT;
  const asp = cW / cH, oH = size * 0.5, oW = oH * asp;
  return (
    <svg width={oW} height={oH} viewBox={`${cL} ${cT} ${cW} ${cH}`} style={{ display: "block" }}>
      <circle cx={cx1} cy={cy} r={rO} fill={C.accent} />
      <circle cx={cx3} cy={cy} r={rO} fill={C.accentBrown} />
      <circle cx={cx2} cy={cy} r={r} fill={C.textPrimary} />
      <path d={`M ${cx2 - r*0.38} ${cy - r*0.5} A ${rO*0.9} ${rO*0.9} 0 0 1 ${cx2 - r*0.38} ${cy + r*0.5}`} fill="none" stroke="#C83C2C" strokeWidth={r*0.11} strokeLinecap="round" />
      <path d={`M ${cx2 + r*0.38} ${cy - r*0.5} A ${rO*0.9} ${rO*0.9} 0 0 0 ${cx2 + r*0.38} ${cy + r*0.5}`} fill="none" stroke="#C83C2C" strokeWidth={r*0.11} strokeLinecap="round" />
    </svg>
  );
};

const ActivityChart = ({ data }) => {
  const max = Math.max(...data.map(d => d.count));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ fontSize: 9, color: C.textMuted, fontFamily: "'Bebas Neue', sans-serif" }}>{d.count}</div>
          <div style={{ width: "100%", height: `${(d.count / max) * 50}px`, borderRadius: 3, background: i === data.length - 1 ? C.accent : `linear-gradient(180deg, ${C.accent}88, ${C.accentBrown}88)`, minHeight: 4 }} />
          <div style={{ fontSize: 8, color: C.textMuted, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 0.5 }}>{d.month}</div>
        </div>
      ))}
    </div>
  );
};

const BigFourCard = ({ label, value, sub, img, color }) => (
  <div style={{ flex: 1, minWidth: 0, borderRadius: 12, overflow: "hidden", background: C.bgCard, border: `1px solid ${C.border}`, display: "flex", flexDirection: "column" }}>
    <div style={{ height: 110, position: "relative", overflow: "hidden" }}>
      {img ? <img src={img} alt={value} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", background: `linear-gradient(160deg, ${color}55, ${C.bgElevated})` }} />}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 40, background: `linear-gradient(transparent, ${C.bgCard})` }} />
    </div>
    <div style={{ padding: "8px 6px 10px", textAlign: "center" }}>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 9, color: C.textMuted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 11, color: C.textPrimary, fontWeight: 600, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
      {sub && <div style={{ fontSize: 9, color: C.textMuted, marginTop: 2 }}>{sub}</div>}
    </div>
  </div>
);

const ProfileScreen = ({ onVenueTap, onEventTap }) => {
  const [filter, setFilter] = useState("All");
  const p = PROFILE;

  return (
    <div style={{ paddingBottom: 20 }}>
      {/* Avatar + Name + Sport badge */}
      <div style={{ display: "flex", alignItems: "center", padding: "8px 16px 0", gap: 14, marginBottom: 12 }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", overflow: "hidden", border: `2px solid ${C.border}` }}>
            <img src={IMG_AVATAR} alt="Anthony" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          {/* Sport badge */}
          <div style={{ position: "absolute", bottom: -2, right: -2, width: 26, height: 26, borderRadius: "50%", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${C.border}` }}>
            <span style={{ fontSize: 14 }}>🏀</span>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.textPrimary }}>{p.displayName}</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 12, color: C.textMuted }}>@{p.username}</div>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: C.win }}>71</span>
              <span style={{ fontSize: 11, color: C.textMuted }}>—</span>
              <span style={{ fontSize: 11, color: C.loss }}>48</span>
              <span style={{ fontSize: 11, color: C.textMuted }}>—</span>
              <span style={{ fontSize: 11, color: C.draw }}>8</span>
            </div>
          </div>
          <div style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.4, marginTop: 3 }}>{p.bio}</div>
        </div>
      </div>

      {/* Stats row - more spacing */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, padding: "0 16px", marginBottom: 20 }}>
        <StatBox value={p.stats.totalEvents} label="Events" />
        <StatBox value={p.stats.totalVenues} label="Venues" />
        <StatBox value={p.stats.followers} label="Followers" />
        <StatBox value={p.stats.following} label="Following" />
      </div>

      {/* The Big Four - tall image cards */}
      <div style={{ padding: "0 16px", marginBottom: 20 }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 13, color: C.textMuted, letterSpacing: 2, marginBottom: 10, textTransform: "uppercase" }}>The Big Four</div>
        <div style={{ display: "flex", gap: 8 }}>
          <BigFourCard label="Team" value="Yankees" sub="MLB" img={IMG_TEAM} color={LEAGUES.MLB.color} />
          <BigFourCard label="Venue" value="PNC Park" sub="Pittsburgh, PA" img={IMG_VENUE} color={C.accent} />
          <BigFourCard label="Athlete" value="R. Blaney" sub="NASCAR #12" img={IMG_ATHLETE} color={C.accentBrown} />
          <BigFourCard label="Event" value="10.01.2013" sub="PIT 6 — CIN 2" img={IMG_EVENT} color="#8B0000" />
        </div>
      </div>

      {/* Activity Chart - 12 month rolling */}
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

      {/* Timeline section */}
      <div style={{ padding: "0 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 13, color: C.textMuted, letterSpacing: 2, textTransform: "uppercase" }}>Timeline</div>
          <button style={{ display: "flex", alignItems: "center", gap: 4, background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}>
            <span style={{ fontSize: 11, color: C.textSecondary }}>{filter}</span>
            <ChevronDown size={12} color={C.textSecondary} />
          </button>
        </div>
        {TIMELINE.map((entry) => (
          <TimelineCard key={entry.id} entry={entry} onVenueTap={onVenueTap} onEventTap={onEventTap} />
        ))}
      </div>
    </div>
  );
};

// ─── Screen: Log Event (Step 1: Select Venue) ───
const LogScreen = () => {
  const [step, setStep] = useState(1);
  const [search, setSearch] = useState("");

  const recentVenues = [
    { name: "Madison Square Garden", city: "New York, NY", visits: 23, sport: "NBA" },
    { name: "MetLife Stadium", city: "East Rutherford, NJ", visits: 8, sport: "NFL" },
    { name: "Yankee Stadium", city: "Bronx, NY", visits: 12, sport: "MLB" },
    { name: "Citi Field", city: "Queens, NY", visits: 6, sport: "MLB" },
    { name: "Barclays Center", city: "Brooklyn, NY", visits: 4, sport: "NBA" },
  ];

  if (step === 2) {
    return (
      <div style={{ padding: "0 16px", paddingBottom: 20 }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: C.textPrimary, letterSpacing: 1, marginBottom: 4 }}>Select Date</div>
        <div style={{ fontSize: 13, color: C.textSecondary, marginBottom: 20 }}>Madison Square Garden</div>
        <div style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16, marginBottom: 20 }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: C.textPrimary, textAlign: "center", marginBottom: 16, letterSpacing: 1 }}>January 2026</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, textAlign: "center" }}>
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i} style={{ fontSize: 10, color: C.textMuted, padding: 6, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1 }}>{d}</div>
            ))}
            {Array.from({ length: 4 }, (_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: 31 }, (_, i) => {
              const day = i + 1;
              const hasEvent = [5, 12, 18, 22, 28].includes(day);
              const isSelected = day === 28;
              return (
                <button key={day} onClick={() => hasEvent && setStep(3)} style={{ padding: 8, borderRadius: 8, fontSize: 13, color: isSelected ? "#fff" : hasEvent ? C.textPrimary : C.textMuted, background: isSelected ? C.accent : "transparent", border: "none", cursor: hasEvent ? "pointer" : "default", position: "relative", fontWeight: hasEvent ? 600 : 400 }}>
                  {day}
                  {hasEvent && !isSelected && <div style={{ position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)", width: 4, height: 4, borderRadius: "50%", background: C.accent }} />}
                </button>
              );
            })}
          </div>
        </div>
        <button onClick={() => setStep(1)} style={{ fontSize: 13, color: C.textSecondary, background: "none", border: "none", cursor: "pointer" }}>← Back to venue</button>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div style={{ padding: "0 16px", paddingBottom: 20 }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: C.textPrimary, letterSpacing: 1, marginBottom: 4 }}>Confirm Event</div>
        <div style={{ fontSize: 13, color: C.textSecondary, marginBottom: 20 }}>MSG · Jan 28, 2026</div>
        <button onClick={() => setStep(4)} style={{ width: "100%", background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16, cursor: "pointer", textAlign: "left", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>🏀</span>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 11, color: "#1D428A", letterSpacing: 1.5 }}>NBA</span>
          </div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: C.textPrimary, letterSpacing: 0.5, marginBottom: 4 }}>Knicks vs Celtics</div>
          <div style={{ fontSize: 12, color: C.textSecondary }}>7:30 PM · Regular Season</div>
        </button>
        <button onClick={() => setStep(2)} style={{ fontSize: 13, color: C.textSecondary, background: "none", border: "none", cursor: "pointer" }}>← Back to date</button>
      </div>
    );
  }

  if (step === 4) {
    return (
      <div style={{ padding: "0 16px", paddingBottom: 20 }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: C.textPrimary, letterSpacing: 1, marginBottom: 4 }}>Log Details</div>
        <div style={{ fontSize: 13, color: C.textSecondary, marginBottom: 20 }}>Knicks vs Celtics · MSG · Jan 28</div>

        {/* Rooting interest */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1.2, fontFamily: "'Bebas Neue', sans-serif", display: "block", marginBottom: 8 }}>Rooting for</label>
          <div style={{ display: "flex", gap: 8 }}>
            {["Knicks", "Celtics", "Neutral"].map((opt) => (
              <button key={opt} style={{ flex: 1, padding: "10px 0", borderRadius: 10, background: opt === "Knicks" ? `${C.accent}22` : C.bgInput, border: `1px solid ${opt === "Knicks" ? C.accent : C.border}`, color: opt === "Knicks" ? C.accent : C.textSecondary, fontSize: 13, cursor: "pointer", fontWeight: opt === "Knicks" ? 600 : 400 }}>{opt}</button>
            ))}
          </div>
        </div>

        {/* Rating */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1.2, fontFamily: "'Bebas Neue', sans-serif", display: "block", marginBottom: 8 }}>Rating</label>
          <div style={{ display: "flex", gap: 6 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} size={28} fill={n <= 4 ? C.accent : "transparent"} color={n <= 4 ? C.accent : C.textMuted} strokeWidth={1.5} style={{ cursor: "pointer" }} />
            ))}
          </div>
        </div>

        {/* Seat */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1.2, fontFamily: "'Bebas Neue', sans-serif", display: "block", marginBottom: 8 }}>Where I Sat</label>
          <input placeholder="Section, row, seat" style={{ width: "100%", padding: "12px 14px", borderRadius: 10, background: C.bgInput, border: `1px solid ${C.border}`, color: C.textPrimary, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1.2, fontFamily: "'Bebas Neue', sans-serif", display: "block", marginBottom: 8 }}>Notes</label>
          <textarea placeholder="What made this game memorable?" rows={3} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, background: C.bgInput, border: `1px solid ${C.border}`, color: C.textPrimary, fontSize: 14, outline: "none", resize: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
        </div>

        {/* Photo */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1.2, fontFamily: "'Bebas Neue', sans-serif", display: "block", marginBottom: 8 }}>Photo</label>
          <div style={{ width: "100%", height: 100, borderRadius: 10, border: `2px dashed ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <span style={{ fontSize: 13, color: C.textMuted }}>+ Add photo</span>
          </div>
        </div>

        {/* Privacy */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1.2, fontFamily: "'Bebas Neue', sans-serif", display: "block", marginBottom: 8 }}>Privacy</label>
          <div style={{ display: "flex", gap: 6 }}>
            {["Show All", "Hide Personal", "Hide All"].map((opt, i) => (
              <button key={opt} style={{ flex: 1, padding: "10px 4px", borderRadius: 10, background: i === 0 ? `${C.accent}22` : C.bgInput, border: `1px solid ${i === 0 ? C.accent : C.border}`, color: i === 0 ? C.accent : C.textSecondary, fontSize: 11, cursor: "pointer", fontWeight: i === 0 ? 600 : 400 }}>{opt}</button>
            ))}
          </div>
        </div>

        {/* Save */}
        <button style={{ width: "100%", padding: "14px 0", borderRadius: 12, background: `linear-gradient(135deg, ${C.accent}, ${C.accentBrown})`, border: "none", color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 2, cursor: "pointer", boxShadow: `0 4px 20px ${C.accent}44` }}>
          SAVE EVENT
        </button>
        <button onClick={() => setStep(3)} style={{ display: "block", margin: "12px auto 0", fontSize: 13, color: C.textSecondary, background: "none", border: "none", cursor: "pointer" }}>← Back</button>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 16px", paddingBottom: 20 }}>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: C.textPrimary, letterSpacing: 1, marginBottom: 16 }}>Log Event</div>
      {/* Search */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <Search size={16} color={C.textMuted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search venues..." style={{ width: "100%", padding: "12px 12px 12px 36px", borderRadius: 10, background: C.bgInput, border: `1px solid ${C.border}`, color: C.textPrimary, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
      </div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 11, color: C.textMuted, letterSpacing: 2, marginBottom: 10, textTransform: "uppercase" }}>Recent Venues</div>
      {recentVenues.map((v, i) => (
        <button key={i} onClick={() => setStep(2)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: C.bgCard, borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 8, cursor: "pointer", textAlign: "left" }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: `${(LEAGUES[v.sport]?.color || C.accent)}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
            {LEAGUES[v.sport]?.icon || "🏟️"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, color: C.textPrimary, fontWeight: 500 }}>{v.name}</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>{v.city}</div>
          </div>
          <div style={{ fontSize: 11, color: C.textMuted }}>{v.visits}×</div>
        </button>
      ))}
      <button style={{ width: "100%", padding: "12px 0", marginTop: 8, background: "none", border: `1px dashed ${C.border}`, borderRadius: 10, color: C.textMuted, fontSize: 13, cursor: "pointer" }}>
        Can't find your venue? Search all venues →
      </button>
    </div>
  );
};

// ─── Screen: Lists ───
const ListsScreen = ({ onListTap }) => {
  return (
    <div style={{ padding: "0 16px", paddingBottom: 20 }}>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: C.textPrimary, letterSpacing: 1, marginBottom: 16 }}>Lists & Challenges</div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 11, color: C.textMuted, letterSpacing: 2, marginBottom: 10, textTransform: "uppercase" }}>System Lists</div>
      {LISTS_DATA.map((list) => {
        const pct = Math.round((list.visited.length / list.total) * 100);
        return (
          <button key={list.id} onClick={() => onListTap?.(list.id)} style={{ width: "100%", background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, padding: "14px 16px", marginBottom: 10, cursor: "pointer", textAlign: "left" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 18 }}>{list.icon}</span><span style={{ fontSize: 14, color: C.textPrimary, fontWeight: 500 }}>{list.name}</span></div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: pct === 100 ? C.win : C.accent, letterSpacing: 1 }}>{list.visited.length}/{list.total}</div>
            </div>
            {list.desc && <div style={{ fontSize: 11, color: C.textSecondary, lineHeight: 1.4, marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{list.desc}</div>}
            <div style={{ height: 6, background: C.bgInput, borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? C.win : `linear-gradient(90deg, ${C.accent}, ${C.accentBrown})`, borderRadius: 3, transition: "width 0.3s" }} />
            </div>
          </button>
        );
      })}
    </div>
  );
};

// ─── Lists Data ───
const LISTS_DATA = [
  { id: "mlb30", name: "All 30 MLB Stadiums", sport: "MLB", icon: "⚾", total: 30, desc: "Visit every active Major League Baseball stadium across the United States and Canada. From the ivy walls of Wrigley to the bay views at Oracle Park.", visited: ["Yankee Stadium","Citi Field","Fenway Park","Wrigley Field","Dodger Stadium","Oracle Park","PNC Park","Camden Yards","Citizens Bank Park","Tropicana Field","Busch Stadium","Target Field"], remaining: ["Chase Field","Truist Park","Guaranteed Rate Field","Great American Ballpark","Progressive Field","Coors Field","Comerica Park","Minute Maid Park","Kauffman Stadium","Angel Stadium","loanDepot Park","American Family Field","T-Mobile Park","Petco Park","Globe Life Field","Rogers Centre","Nationals Park","Oakland Coliseum"] },
  { id: "nfl32", name: "All 32 NFL Stadiums", sport: "NFL", icon: "🏈", total: 32, desc: "Hit every NFL stadium from coast to coast. Tailgates, touchdown celebrations, and 32 unique gameday atmospheres.", visited: ["MetLife Stadium","Lincoln Financial Field","Gillette Stadium","Highmark Stadium","M&T Bank Stadium","Acrisure Stadium","FedExField","Hard Rock Stadium"], remaining: Array(24).fill("").map((_,i)=>"Stadium "+(i+1)) },
  { id: "nba30", name: "All 30 NBA Arenas", sport: "NBA", icon: "🏀", total: 30, desc: "Experience live basketball in every NBA arena. From the Garden to Crypto.com, catch a game in all 30 buildings.", visited: ["Madison Square Garden","Barclays Center","TD Garden","Wells Fargo Center","Capital One Arena","United Center"], remaining: Array(24).fill("").map((_,i)=>"Arena "+(i+1)) },
  { id: "nhl32", name: "All 32 NHL Arenas", sport: "NHL", icon: "🏒", total: 32, desc: "See a puck drop in every NHL barn. 32 arenas, 32 fanbases, one epic hockey pilgrimage.", visited: ["MSG","Prudential Center","UBS Arena","TD Garden"], remaining: Array(28).fill("").map((_,i)=>"Arena "+(i+1)) },
  { id: "slams", name: "All 4 Grand Slams", sport: "Tennis", icon: "🎾", total: 4, desc: "Attend all four tennis Grand Slam tournaments — the pinnacle of the sport across three continents.", visited: ["US Open — Billie Jean King NTC"], remaining: ["Australian Open","French Open — Roland Garros","Wimbledon"] },
  { id: "pgamajors", name: "PGA Major Championships", sport: "PGA", icon: "⛳", total: 4, desc: "Walk the fairways at golf's four major championships. Augusta, the PGA, the US Open, and The Open.", visited: ["The Masters — Augusta National"], remaining: ["PGA Championship","U.S. Open","The Open Championship"] },
];

const SectionLabel = ({ children }) => <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 11, color: C.textMuted, letterSpacing: 2, marginBottom: 10, textTransform: "uppercase" }}>{children}</div>;

const BackHeader = ({ title, onBack }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
    <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0 }}><ChevronLeft size={20} color={C.textSecondary} /><span style={{ fontSize: 13, color: C.textSecondary }}>Back</span></button>
    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: C.textPrimary, letterSpacing: 1.5 }}>{title}</div>
    <div style={{ width: 60, display: "flex", justifyContent: "flex-end" }}><Share2 size={18} color={C.textSecondary} /></div>
  </div>
);

// ─── Screen: Onboarding ───
const OnboardingScreen = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [username, setUsername] = useState("");
  const [selectedFaves, setSelectedFaves] = useState({});
  const [markedVenues, setMarkedVenues] = useState([]);
  const toggleVenue = (n) => setMarkedVenues(p => p.includes(n) ? p.filter(v => v !== n) : [...p, n]);

  if (step === 0) return (
    <div style={{ padding: "0 24px", paddingTop: 40 }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}><div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, letterSpacing: 4, marginBottom: 8 }}><span style={{ color: C.textPrimary }}>BOXD</span><span style={{ color: C.accent }}>SEATS</span></div><div style={{ fontSize: 14, color: C.textSecondary }}>Your personal sports profile.</div></div>
      <div style={{ marginBottom: 20 }}><label style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1.2, fontFamily: "'Bebas Neue', sans-serif", display: "block", marginBottom: 8 }}>Choose a username</label><div style={{ position: "relative" }}><span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: C.textMuted, fontSize: 14 }}>@</span><input value={username} onChange={e => setUsername(e.target.value)} placeholder="username" style={{ width: "100%", padding: "14px 14px 14px 30px", borderRadius: 12, background: C.bgInput, border: `1px solid ${C.border}`, color: C.textPrimary, fontSize: 15, outline: "none", boxSizing: "border-box" }} /></div></div>
      <div style={{ marginBottom: 20 }}><label style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1.2, fontFamily: "'Bebas Neue', sans-serif", display: "block", marginBottom: 8 }}>Profile Photo</label><div style={{ width: 80, height: 80, borderRadius: "50%", border: `2px dashed ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", margin: "0 auto" }}><Camera size={24} color={C.textMuted} /></div></div>
      <div style={{ marginBottom: 20 }}><label style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1.2, fontFamily: "'Bebas Neue', sans-serif", display: "block", marginBottom: 8 }}>Email</label><input placeholder="you@email.com" style={{ width: "100%", padding: "14px", borderRadius: 12, background: C.bgInput, border: `1px solid ${C.border}`, color: C.textPrimary, fontSize: 15, outline: "none", boxSizing: "border-box" }} /></div>
      <div style={{ marginBottom: 28 }}><label style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1.2, fontFamily: "'Bebas Neue', sans-serif", display: "block", marginBottom: 8 }}>Password</label><input type="password" placeholder="••••••••" style={{ width: "100%", padding: "14px", borderRadius: 12, background: C.bgInput, border: `1px solid ${C.border}`, color: C.textPrimary, fontSize: 15, outline: "none", boxSizing: "border-box" }} /></div>
      <button onClick={() => setStep(1)} style={{ width: "100%", padding: "16px 0", borderRadius: 12, background: `linear-gradient(135deg, ${C.accent}, ${C.accentBrown})`, border: "none", color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 2, cursor: "pointer", marginBottom: 16 }}>CREATE ACCOUNT</button>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}><div style={{ flex: 1, height: 1, background: C.border }} /><span style={{ fontSize: 11, color: C.textMuted }}>or sign in with</span><div style={{ flex: 1, height: 1, background: C.border }} /></div>
      <div style={{ display: "flex", gap: 12 }}><button style={{ flex: 1, padding: "12px", borderRadius: 12, background: C.bgCard, border: `1px solid ${C.border}`, color: C.textPrimary, fontSize: 13, cursor: "pointer" }}>Google</button><button style={{ flex: 1, padding: "12px", borderRadius: 12, background: C.bgCard, border: `1px solid ${C.border}`, color: C.textPrimary, fontSize: 13, cursor: "pointer" }}>Apple</button></div>
    </div>
  );

  if (step === 1) {
    const faves = [{key:"sport",label:"Favorite Sport",opts:["Basketball 🏀","Football 🏈","Baseball ⚾","Hockey 🏒","Soccer ⚽","Golf ⛳"]},{key:"team",label:"Favorite Team",opts:["New York Knicks","New York Yankees","New York Giants","New York Rangers"]},{key:"athlete",label:"Favorite Athlete",opts:["Jalen Brunson","Aaron Judge","Saquon Barkley","Artemi Panarin"]},{key:"venue",label:"Favorite Venue",opts:["Madison Square Garden","Yankee Stadium","MetLife Stadium","Augusta National"]},{key:"event",label:"Favorite Event",opts:["Knicks vs Pacers G7 '24","Yankees ALCS '24","Super Bowl XLII"]}];
    return (
      <div style={{ padding: "0 24px", paddingTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: C.textPrimary, letterSpacing: 1 }}>Your Big Five</div><div style={{ fontSize: 12, color: C.textMuted }}>Step 1 of 3</div></div>
        <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.5, marginBottom: 24 }}>Pick your all-time favorites. These live at the top of your profile.</div>
        <div style={{ display: "flex", gap: 4, marginBottom: 28 }}>{[0,1,2].map(i => <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i === 0 ? C.accent : C.bgInput }} />)}</div>
        {faves.map(({key,label,opts}) => (
          <div key={key} style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1.2, fontFamily: "'Bebas Neue', sans-serif", display: "block", marginBottom: 8 }}>{label}</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{opts.map(o => { const s = selectedFaves[key] === o; return <button key={o} onClick={() => setSelectedFaves(p => ({...p,[key]:s?null:o}))} style={{ padding: "8px 14px", borderRadius: 20, background: s ? `${C.accent}22` : C.bgInput, border: `1px solid ${s ? C.accent : C.border}`, color: s ? C.accent : C.textSecondary, fontSize: 12, cursor: "pointer", fontWeight: s ? 600 : 400 }}>{o}</button>; })}</div>
          </div>
        ))}
        <div style={{ display: "flex", gap: 12 }}><button onClick={() => setStep(0)} style={{ flex: 1, padding: "14px", borderRadius: 12, background: C.bgCard, border: `1px solid ${C.border}`, color: C.textSecondary, fontSize: 14, cursor: "pointer" }}>Back</button><button onClick={() => setStep(2)} style={{ flex: 2, padding: "14px", borderRadius: 12, background: `linear-gradient(135deg, ${C.accent}, ${C.accentBrown})`, border: "none", color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: 1.5, cursor: "pointer" }}>NEXT →</button></div>
      </div>
    );
  }

  if (step === 2) {
    const av = [{name:"Madison Square Garden",city:"New York, NY",sport:"NBA"},{name:"Yankee Stadium",city:"Bronx, NY",sport:"MLB"},{name:"MetLife Stadium",city:"East Rutherford, NJ",sport:"NFL"},{name:"Citi Field",city:"Queens, NY",sport:"MLB"},{name:"Barclays Center",city:"Brooklyn, NY",sport:"NBA"},{name:"Prudential Center",city:"Newark, NJ",sport:"NHL"},{name:"UBS Arena",city:"Elmont, NY",sport:"NHL"},{name:"Fenway Park",city:"Boston, MA",sport:"MLB"},{name:"TD Garden",city:"Boston, MA",sport:"NBA"},{name:"Wrigley Field",city:"Chicago, IL",sport:"MLB"},{name:"Augusta National",city:"Augusta, GA",sport:"PGA"}];
    return (
      <div style={{ padding: "0 24px", paddingTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: C.textPrimary, letterSpacing: 1 }}>Mark Your Venues</div><div style={{ fontSize: 12, color: C.textMuted }}>Step 2 of 3</div></div>
        <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.5, marginBottom: 16 }}>Tap every venue you have been to. This seeds your venue map instantly.</div>
        <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>{[0,1,2].map(i => <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= 1 ? C.accent : C.bgInput }} />)}</div>
        {markedVenues.length > 0 && <div style={{ padding: "10px 14px", background: `${C.accent}15`, borderRadius: 10, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}><Check size={16} color={C.accent} /><span style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>{markedVenues.length} venues marked</span></div>}
        <div style={{ maxHeight: 340, overflowY: "auto" }}>{av.map(v => { const chk = markedVenues.includes(v.name); const lg = LEAGUES[v.sport]; return (
          <button key={v.name} onClick={() => toggleVenue(v.name)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: chk ? `${C.accent}10` : C.bgCard, borderRadius: 10, border: `1px solid ${chk ? C.accent+"44" : C.border}`, marginBottom: 8, cursor: "pointer", textAlign: "left" }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: `${(lg?.color||C.accent)}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{lg?.icon||"🏟️"}</div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 13, color: C.textPrimary, fontWeight: 500 }}>{v.name}</div><div style={{ fontSize: 11, color: C.textMuted }}>{v.city}</div></div>
            <div style={{ width: 24, height: 24, borderRadius: 6, border: `2px solid ${chk ? C.accent : C.border}`, background: chk ? C.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{chk && <Check size={14} color="#fff" />}</div>
          </button>
        ); })}</div>
        <div style={{ display: "flex", gap: 12, marginTop: 16 }}><button onClick={() => setStep(1)} style={{ flex: 1, padding: "14px", borderRadius: 12, background: C.bgCard, border: `1px solid ${C.border}`, color: C.textSecondary, fontSize: 14, cursor: "pointer" }}>Back</button><button onClick={() => setStep(3)} style={{ flex: 2, padding: "14px", borderRadius: 12, background: `linear-gradient(135deg, ${C.accent}, ${C.accentBrown})`, border: "none", color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: 1.5, cursor: "pointer" }}>NEXT →</button></div>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 24px", paddingTop: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: C.textPrimary, letterSpacing: 1 }}>Log Your First Event</div><div style={{ fontSize: 12, color: C.textMuted }}>Step 3 of 3</div></div>
      <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.5, marginBottom: 16 }}>Seed your timeline with a recent game. Optional.</div>
      <div style={{ display: "flex", gap: 4, marginBottom: 28 }}>{[0,1,2].map(i => <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: C.accent }} />)}</div>
      <div style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20, marginBottom: 20, textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: `${C.accent}22`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28 }}>🏟️</div>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: C.textPrimary, letterSpacing: 1, marginBottom: 20 }}>What was the last game you went to?</div>
        {["Madison Square Garden","MetLife Stadium","Yankee Stadium"].map(v => <button key={v} style={{ width: "100%", padding: "12px 14px", background: C.bgInput, borderRadius: 10, border: `1px solid ${C.border}`, color: C.textPrimary, fontSize: 13, cursor: "pointer", textAlign: "left", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}><MapPin size={14} color={C.accent} />{v}</button>)}
      </div>
      <button onClick={onComplete} style={{ width: "100%", padding: "16px 0", borderRadius: 12, background: `linear-gradient(135deg, ${C.accent}, ${C.accentBrown})`, border: "none", color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 2, cursor: "pointer", marginBottom: 12 }}>GO TO MY PROFILE →</button>
      <button onClick={onComplete} style={{ display: "block", margin: "0 auto", fontSize: 13, color: C.textMuted, background: "none", border: "none", cursor: "pointer" }}>Skip for now</button>
    </div>
  );
};

// ─── Screen: Venue Detail ───
const VenueDetailScreen = ({ onBack, onEventTap }) => {
  const v = { name: "Madison Square Garden", city: "New York, NY", capacity: "19,812", homeTeams: [{name:"New York Knicks",league:"NBA",icon:"🏀"},{name:"New York Rangers",league:"NHL",icon:"🏒"}], userVisits: 23, firstVisit: "Mar 2012", lastVisit: "Jan 2026", totalCheckins: 4821, friends: ["@kyle","@sarah","@mike","@jess","@dave"], events: [{league:"NBA",teams:"Knicks 118 — Celtics 112",date:"Jan 28, 2026",id:1},{league:"NHL",teams:"Rangers 4 — Devils 1",date:"Jan 5, 2026",id:3},{league:"NBA",teams:"Knicks 105 — Bucks 98",date:"Dec 22, 2025",id:4}] };
  return (
    <div style={{ paddingBottom: 20 }}>
      <BackHeader title="Venue" onBack={onBack} />
      <div style={{ height: 160, background: `linear-gradient(135deg, ${LEAGUES.NBA.color}44, ${C.bgElevated})`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}><MapPin size={48} color={C.textMuted} style={{ opacity: 0.3 }} /><div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 60, background: `linear-gradient(transparent, ${C.bg})` }} /></div>
      <div style={{ padding: "0 16px", marginTop: -20, position: "relative" }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: C.textPrimary, letterSpacing: 1, lineHeight: 1.1, marginBottom: 4 }}>{v.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}><MapPin size={13} color={C.textMuted} /><span style={{ fontSize: 13, color: C.textSecondary }}>{v.city}</span><span style={{ color: C.textMuted }}>·</span><span style={{ fontSize: 13, color: C.textMuted }}>{v.capacity} capacity</span></div>
        <div style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16, marginBottom: 16 }}><SectionLabel>Your History</SectionLabel><div style={{ display: "flex", justifyContent: "space-around" }}><StatBox value={v.userVisits} label="Visits" /><StatBox value={v.firstVisit} label="First Visit" /><StatBox value={v.lastVisit} label="Last Visit" /></div></div>
        <SectionLabel>Home Teams</SectionLabel>
        {v.homeTeams.map((t,i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: C.bgCard, borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 8 }}><span style={{ fontSize: 20 }}>{t.icon}</span><div><div style={{ fontSize: 14, color: C.textPrimary, fontWeight: 500 }}>{t.name}</div><div style={{ fontSize: 11, color: C.textMuted }}>{t.league}</div></div></div>)}
        <div style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16, marginBottom: 16, marginTop: 8 }}><SectionLabel>Community</SectionLabel><div style={{ display: "flex", justifyContent: "space-around", marginBottom: 14 }}><StatBox value={v.totalCheckins.toLocaleString()} label="Check-ins" /><StatBox value={v.friends.length+"+"} label="Friends" /></div><div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 6 }}>Friends who have been here</div><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{v.friends.map((u,i) => <span key={i} style={{ fontSize: 12, color: C.accent, background: `${C.accent}15`, padding: "4px 10px", borderRadius: 12 }}>{u}</span>)}</div></div>
        <SectionLabel>Your Events Here</SectionLabel>
        {v.events.map((e,i) => <button key={i} onClick={() => onEventTap?.(e.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: C.bgCard, borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 8, cursor: "pointer", textAlign: "left" }}><span style={{ fontSize: 18 }}>{LEAGUES[e.league]?.icon}</span><div style={{ flex: 1 }}><div style={{ fontSize: 13, color: C.textPrimary, fontWeight: 500 }}>{e.teams}</div><div style={{ fontSize: 11, color: C.textMuted }}>{e.date}</div></div><ChevronRight size={16} color={C.textMuted} /></button>)}
        <button style={{ width: "100%", padding: "14px 0", borderRadius: 12, background: `linear-gradient(135deg, ${C.accent}, ${C.accentBrown})`, border: "none", color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: 2, cursor: "pointer", marginTop: 8 }}>LOG EVENT HERE</button>
      </div>
    </div>
  );
};

// ─── Screen: Event Detail ───
const EventDetailScreen = ({ eventId, onBack, onVenueTap }) => {
  const userLog = TIMELINE.find(t => t.id === eventId);
  if (eventId !== 1) return (
    <div><BackHeader title="Event" onBack={onBack} /><div style={{ padding: "40px 16px", textAlign: "center" }}><div style={{ fontSize: 48, marginBottom: 16 }}>🏟️</div><div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: C.textPrimary, marginBottom: 8 }}>Event Detail</div><div style={{ fontSize: 13, color: C.textSecondary }}>Wireframe placeholder. Every event gets a page like Knicks vs Celtics.</div><button onClick={onBack} style={{ marginTop: 20, padding: "10px 24px", borderRadius: 10, background: C.bgCard, border: `1px solid ${C.border}`, color: C.textSecondary, fontSize: 13, cursor: "pointer" }}>Go Back</button></div></div>
  );
  const lg = LEAGUES.NBA;
  return (
    <div style={{ paddingBottom: 20 }}>
      <BackHeader title="Event" onBack={onBack} />
      <div style={{ background: `linear-gradient(135deg, ${lg.color}33, ${C.bgElevated})`, padding: "24px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 16 }}><span style={{ fontSize: 16 }}>{lg.icon}</span><span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 12, color: lg.color, letterSpacing: 2 }}>NBA</span><span style={{ fontSize: 12, color: C.textMuted }}>· 2025-26 Regular Season</span></div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20 }}>
          <div style={{ textAlign: "center" }}><div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: C.textSecondary, marginBottom: 4 }}>BOS</div><div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 40, color: C.textMuted }}>112</div></div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: C.textMuted, letterSpacing: 2 }}>FINAL</div>
          <div style={{ textAlign: "center" }}><div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: C.textSecondary, marginBottom: 4 }}>NYK</div><div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 40, color: C.textPrimary }}>118</div></div>
        </div>
      </div>
      <div style={{ padding: "0 16px", marginTop: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Calendar size={13} color={C.textMuted} /><span style={{ fontSize: 12, color: C.textSecondary }}>Tue, January 28, 2026</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Clock size={13} color={C.textMuted} /><span style={{ fontSize: 12, color: C.textSecondary }}>7:30 PM EST</span></div>
          <div onClick={() => onVenueTap?.("msg")} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}><MapPin size={13} color={C.textMuted} /><span style={{ fontSize: 12, color: C.accent }}>Madison Square Garden</span></div>
        </div>
        {userLog && <div style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.accent}33`, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}><SectionLabel>Your Log</SectionLabel><Edit3 size={14} color={C.textMuted} /></div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}><OutcomeBadge outcome={userLog.outcome} /><StarRating rating={userLog.rating} />{userLog.seat && <span style={{ fontSize: 11, color: C.textMuted }}>· {userLog.seat}</span>}</div>
          {userLog.notes && <div style={{ fontSize: 13, color: C.textSecondary, fontStyle: "italic", lineHeight: 1.5, marginBottom: 10 }}>"{userLog.notes}"</div>}
          {userLog.companions?.length > 0 && <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Users size={12} color={C.textMuted} /><span style={{ fontSize: 11, color: C.textMuted }}>with {userLog.companions.join(", ")}</span></div>}
        </div>}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}><SectionLabel>BoxdSeats Attendees</SectionLabel><span style={{ fontSize: 12, color: C.accent, fontWeight: 600 }}>47</span></div>
        {[{u:"@anthony",r:5,o:"W"},{u:"@kyle",r:5,o:"W"},{u:"@mike",r:4,o:"W"},{u:"@sarah",r:4,o:"L"},{u:"@jess",r:3,o:"L"}].map((u,i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: C.bgCard, borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 6 }}><div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${C.accent}, ${C.accentBrown})`, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 13, color: "#fff" }}>{u.u.charAt(1).toUpperCase()}</span></div><div style={{ flex: 1 }}><span style={{ fontSize: 13, color: C.textPrimary }}>{u.u}</span></div><OutcomeBadge outcome={u.o} /><StarRating rating={u.r} size={10} /></div>)}
        <div style={{ marginTop: 16 }}><SectionLabel>Comments</SectionLabel>
        {[{u:"@kyle",t:"Best game of the year. Brunson is HIM.",time:"2h ago"},{u:"@sarah",t:"Hurts to lose but MSG atmosphere was incredible",time:"3h ago"},{u:"@dave",t:"Wish I was there 😭",time:"4h ago"}].map((c,i) => <div key={i} style={{ padding: "12px 14px", background: C.bgCard, borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 8 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>{c.u}</span><span style={{ fontSize: 11, color: C.textMuted }}>{c.time}</span></div><div style={{ fontSize: 13, color: C.textSecondary }}>{c.t}</div></div>)}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}><input placeholder="Add a comment..." style={{ flex: 1, padding: "10px 14px", borderRadius: 10, background: C.bgInput, border: `1px solid ${C.border}`, color: C.textPrimary, fontSize: 13, outline: "none" }} /><button style={{ padding: "10px 16px", borderRadius: 10, background: C.accent, border: "none", color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>Post</button></div></div>
      </div>
    </div>
  );
};

// ─── Screen: List Detail ───
const ListDetailScreen = ({ listId, onBack }) => {
  const list = LISTS_DATA.find(l => l.id === listId) || LISTS_DATA[0];
  const pct = Math.round((list.visited.length / list.total) * 100);
  return (
    <div style={{ paddingBottom: 20 }}>
      <BackHeader title="List" onBack={onBack} />
      <div style={{ padding: "0 16px", marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}><span style={{ fontSize: 32 }}>{list.icon}</span><div><div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: C.textPrimary, letterSpacing: 1 }}>{list.name}</div><div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>{list.sport} · System List</div></div></div>
        {list.desc && <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.5, marginBottom: 16, padding: "12px 14px", background: C.bgCard, borderRadius: 10, border: `1px solid ${C.border}` }}>{list.desc}</div>}
        <div style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16, marginBottom: 20 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}><div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, color: C.accent }}>{pct}%</div><div style={{ fontSize: 13, color: C.textSecondary }}>{list.visited.length} of {list.total}</div></div><div style={{ height: 8, background: C.bgInput, borderRadius: 4, overflow: "hidden" }}><div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${C.accent}, ${C.accentBrown})`, borderRadius: 4 }} /></div></div>
        <SectionLabel>Visited ({list.visited.length})</SectionLabel>
        {list.visited.map((v,i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: C.bgCard, borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 6 }}><div style={{ width: 24, height: 24, borderRadius: 6, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={14} color="#fff" /></div><span style={{ fontSize: 13, color: C.textPrimary }}>{v}</span></div>)}
        <div style={{ marginTop: 16 }}><SectionLabel>Remaining ({list.remaining.length})</SectionLabel>
        {list.remaining.slice(0,8).map((v,i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: C.bgCard, borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 6, opacity: 0.6 }}><div style={{ width: 24, height: 24, borderRadius: 6, border: `2px solid ${C.border}` }} /><span style={{ fontSize: 13, color: C.textSecondary }}>{v}</span></div>)}
        {list.remaining.length > 8 && <div style={{ textAlign: "center", padding: 12 }}><span style={{ fontSize: 12, color: C.textMuted }}>+ {list.remaining.length - 8} more</span></div>}</div>
      </div>
    </div>
  );
};

// ─── Main App ───
export default function BoxdSeatsWireframe() {
  const [activeTab, setActiveTab] = useState("profile");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [detailView, setDetailView] = useState(null);

  const handleVenueTap = (id) => setDetailView({ type: "venue", id });
  const handleEventTap = (id) => setDetailView({ type: "event", id });
  const handleListTap = (id) => setDetailView({ type: "list", id });
  const handleBack = () => setDetailView(null);

  if (showOnboarding) return (
    <div style={{ maxWidth: 390, margin: "0 auto", background: C.bg, minHeight: "100vh", fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <OnboardingScreen onComplete={() => setShowOnboarding(false)} />
    </div>
  );

  if (detailView) return (
    <div style={{ maxWidth: 390, margin: "0 auto", background: C.bg, minHeight: "100vh", fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ paddingBottom: 70, overflowY: "auto" }}>
        {detailView.type === "venue" && <VenueDetailScreen onBack={handleBack} onEventTap={handleEventTap} />}
        {detailView.type === "event" && <EventDetailScreen eventId={detailView.id} onBack={handleBack} onVenueTap={handleVenueTap} />}
        {detailView.type === "list" && <ListDetailScreen listId={detailView.id} onBack={handleBack} />}
      </div>
      <BottomNav active={activeTab} onNav={(tab) => { setDetailView(null); setActiveTab(tab); }} />
    </div>
  );

  return (
    <div style={{ maxWidth: 390, margin: "0 auto", background: C.bg, minHeight: "100vh", fontFamily: "'DM Sans', -apple-system, sans-serif", position: "relative" }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ height: 48, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Logo size={32} /><span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 15, letterSpacing: 3 }}><span style={{ color: C.textPrimary }}>BOXD</span><span style={{ color: C.accent }}>SEATS</span></span></div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={() => setShowOnboarding(true)} style={{ fontSize: 10, color: C.textMuted, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}>ONBOARDING</button>
          <Share2 size={18} color={C.textSecondary} style={{ cursor: "pointer" }} />
          <Settings size={18} color={C.textSecondary} style={{ cursor: "pointer" }} />
        </div>
      </div>
      <div style={{ paddingBottom: 70, overflowY: "auto" }}>
        {activeTab === "profile" && <ProfileScreen onVenueTap={handleVenueTap} onEventTap={handleEventTap} />}
        {activeTab === "log" && <LogScreen />}
        {activeTab === "lists" && <ListsScreen onListTap={handleListTap} />}
        {activeTab === "feed" && (
          <div style={{ padding: "0 16px" }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: C.textPrimary, letterSpacing: 1, marginBottom: 16 }}>Feed</div>
            {[
              { ...TIMELINE[0], author: { name: "Anthony", username: "anthony", color: C.accent } },
              { ...TIMELINE[1], id: 101, author: { name: "Kyle", username: "kyle", color: "#1D428A" }, teams: "Knicks 118 — Celtics 112", league: "NBA", venue: "Madison Square Garden", venueId: "msg", date: "Jan 28, 2026", rating: 5, outcome: "W", notes: "Best game I've been to all year. Brunson is that guy.", privacy: "show_all" },
              { ...TIMELINE[2], author: { name: "Anthony", username: "anthony", color: C.accent } },
              { ...TIMELINE[3], id: 102, author: { name: "Sarah", username: "sarah", color: "#8B5CF6" }, teams: "Celtics 112 — Knicks 118", league: "NBA", venue: "Madison Square Garden", venueId: "msg", date: "Jan 28, 2026", rating: 3, outcome: "L", notes: "MSG was loud. Tough loss but great atmosphere.", privacy: "show_all", likes: 12, comments: 4 },
              { ...TIMELINE[4], id: 103, author: { name: "Dave", username: "dave", color: "#059669" }, teams: "Eagles 24 — Giants 17", league: "NFL", venue: "MetLife Stadium", venueId: "metlife", date: "Jan 12, 2026", rating: 4, outcome: "W", notes: "Fly Eagles Fly 🦅", privacy: "show_all", likes: 6, comments: 1 },
            ].map((entry) => <TimelineCard key={entry.id} entry={entry} showAuthor={true} onVenueTap={handleVenueTap} onEventTap={handleEventTap} />)}
          </div>
        )}
        {activeTab === "explore" && (
          <div style={{ padding: "0 16px" }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: C.textPrimary, letterSpacing: 1, marginBottom: 16 }}>Explore</div>
            <div style={{ position: "relative", marginBottom: 20 }}><Search size={16} color={C.textMuted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} /><input placeholder="Search venues, events, users, lists..." style={{ width: "100%", padding: "12px 12px 12px 36px", borderRadius: 10, background: C.bgInput, border: `1px solid ${C.border}`, color: C.textPrimary, fontSize: 14, outline: "none", boxSizing: "border-box" }} /></div>
            {VENUES_VISITED.slice(0, 5).map((v, i) => (
              <button key={i} onClick={() => handleVenueTap("msg")} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: C.bgCard, borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 8, cursor: "pointer", textAlign: "left" }}><MapPin size={18} color={C.accent} /><div><div style={{ fontSize: 14, color: C.textPrimary }}>{v.name}</div><div style={{ fontSize: 11, color: C.textMuted }}>{v.sport}</div></div></button>
            ))}
          </div>
        )}
      </div>
      <BottomNav active={activeTab} onNav={setActiveTab} />
    </div>
  );
}
