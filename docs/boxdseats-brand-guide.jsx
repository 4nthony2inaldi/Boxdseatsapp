import { useState } from "react";

const colors = {
  // Core palette
  bgPrimary: "#0D0F14",
  bgSecondary: "#161922",
  bgTertiary: "#1E2230",
  bgElevated: "#252A3A",
  
  // Logo-derived accents
  basketball: "#D4872C",
  basketballLight: "#E8A44E",
  baseball: "#F0EBE0",
  baseballStitch: "#C83C2C",
  football: "#7B5B3A",
  footballLight: "#9B7B5A",
  
  // Primary accent (from basketball orange)
  accent: "#D4872C",
  accentHover: "#E8A44E",
  accentSubtle: "rgba(212, 135, 44, 0.15)",
  
  // Secondary accent (from stitch red)
  highlight: "#C83C2C",
  highlightSubtle: "rgba(200, 60, 44, 0.15)",
  
  // Text
  textPrimary: "#F0EBE0",
  textSecondary: "#9BA1B5",
  textTertiary: "#5E6478",
  
  // Utility
  success: "#3CB878",
  warning: "#D4872C",
  error: "#C83C2C",
  border: "rgba(240, 235, 224, 0.08)",
  borderLight: "rgba(240, 235, 224, 0.15)",
};

const Logo = ({ size = 80 }) => {
  const r = size * 0.25;
  const rOuter = r * 0.82;
  const spread = r * 1.1;
  
  // Calculate actual content bounds
  const contentLeft = size / 2 - spread - rOuter;
  const contentRight = size / 2 + spread + rOuter;
  const contentTop = size / 2 - r;
  const contentBottom = size / 2 + r;
  const contentWidth = contentRight - contentLeft;
  const contentHeight = contentBottom - contentTop;
  
  const cx1 = size / 2 - spread;
  const cx2 = size / 2;
  const cx3 = size / 2 + spread;
  const cy = size / 2;
  
  // Scale output to requested size, maintaining aspect ratio
  const aspect = contentWidth / contentHeight;
  const outHeight = size * 0.5;
  const outWidth = outHeight * aspect;
  
  return (
    <svg width={outWidth} height={outHeight} viewBox={`${contentLeft} ${contentTop} ${contentWidth} ${contentHeight}`} style={{ display: "block" }}>
      {/* Basketball */}
      <circle cx={cx1} cy={cy} r={rOuter} fill={colors.basketball} />
      {/* Football */}
      <circle cx={cx3} cy={cy} r={rOuter} fill={colors.football} />
      {/* Baseball (on top) */}
      <circle cx={cx2} cy={cy} r={r} fill={colors.baseball} />
      {/* Stitching - smaller with spacing from edges and between each other */}
      {/* Left stitch ) */}
      <path
        d={`M ${cx2 - r * 0.38} ${cy - r * 0.5} 
            A ${rOuter * 0.9} ${rOuter * 0.9} 0 0 1 ${cx2 - r * 0.38} ${cy + r * 0.5}`}
        fill="none"
        stroke={colors.baseballStitch}
        strokeWidth={r * 0.11}
        strokeLinecap="round"
      />
      {/* Right stitch ( */}
      <path
        d={`M ${cx2 + r * 0.38} ${cy - r * 0.5} 
            A ${rOuter * 0.9} ${rOuter * 0.9} 0 0 0 ${cx2 + r * 0.38} ${cy + r * 0.5}`}
        fill="none"
        stroke={colors.baseballStitch}
        strokeWidth={r * 0.11}
        strokeLinecap="round"
      />
    </svg>
  );
};

const LogoWithWordmark = ({ size = 48 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: size * 0.45 }}>
    <Logo size={size} />
    <span
      style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: size * 0.55,
        letterSpacing: size * 0.04,
        color: colors.textPrimary,
        lineHeight: 1,
        position: "relative",
        top: size * 0.04,
      }}
    >
      BOXD<span style={{ color: colors.accent }}>SEATS</span>
    </span>
  </div>
);

const ColorSwatch = ({ color, name, hex, role }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    <div
      style={{
        width: "100%",
        aspectRatio: "1",
        borderRadius: 12,
        backgroundColor: color,
        border: `1px solid ${colors.borderLight}`,
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
      }}
    />
    <div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, color: colors.textPrimary, letterSpacing: 1 }}>
        {name}
      </div>
      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: colors.textSecondary, fontFamily: "monospace" }}>
        {hex}
      </div>
      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: colors.textTertiary, marginTop: 2 }}>
        {role}
      </div>
    </div>
  </div>
);

const Section = ({ title, children, id }) => (
  <div id={id} style={{ marginBottom: 80 }}>
    <div
      style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: 36,
        color: colors.textPrimary,
        letterSpacing: 3,
        marginBottom: 8,
        lineHeight: 1,
      }}
    >
      {title}
    </div>
    <div
      style={{
        width: 60,
        height: 3,
        backgroundColor: colors.accent,
        borderRadius: 2,
        marginBottom: 32,
      }}
    />
    {children}
  </div>
);

const Subsection = ({ title, children }) => (
  <div style={{ marginBottom: 40 }}>
    <div
      style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: 20,
        color: colors.textSecondary,
        letterSpacing: 2,
        marginBottom: 16,
      }}
    >
      {title}
    </div>
    {children}
  </div>
);

const Body = ({ children, secondary }) => (
  <div
    style={{
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 15,
      lineHeight: 1.7,
      color: secondary ? colors.textSecondary : colors.textPrimary,
      maxWidth: 640,
    }}
  >
    {children}
  </div>
);

const MockProfileCard = () => (
  <div
    style={{
      backgroundColor: colors.bgSecondary,
      borderRadius: 16,
      border: `1px solid ${colors.border}`,
      overflow: "hidden",
      maxWidth: 400,
    }}
  >
    {/* Header band */}
    <div
      style={{
        height: 80,
        background: `linear-gradient(135deg, ${colors.bgTertiary} 0%, ${colors.bgElevated} 100%)`,
        position: "relative",
      }}
    />
    {/* Avatar */}
    <div style={{ padding: "0 24px", marginTop: -36 }}>
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          backgroundColor: colors.bgElevated,
          border: `3px solid ${colors.bgSecondary}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 28,
          color: colors.accent,
        }}
      >
        AV
      </div>
    </div>
    {/* Info */}
    <div style={{ padding: "12px 24px 24px" }}>
      <div
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 22,
          color: colors.textPrimary,
          letterSpacing: 1,
        }}
      >
        Anthony V.
      </div>
      <div
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 13,
          color: colors.textTertiary,
          marginBottom: 20,
        }}
      >
        @anthony
      </div>

      {/* Big Five Favorites */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          marginBottom: 20,
        }}
      >
        {[
          { label: "Sport", value: "Basketball", img: "https://cdn.nba.com/logos/leagues/logo-nba.svg" },
          { label: "Team", value: "NY Knicks", img: "https://cdn.nba.com/logos/nba/1610612752/global/L/logo.svg" },
          { label: "Athlete", value: "Jalen Brunson", img: "https://cdn.nba.com/headshots/nba/latest/260x190/1628973.png" },
          { label: "Venue", value: "MSG", img: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Madison_Square_Garden_%28February_2018%29.jpg/320px-Madison_Square_Garden_%28February_2018%29.jpg" },
        ].map((item, i) => (
          <div
            key={i}
            style={{
              backgroundColor: colors.bgTertiary,
              borderRadius: 10,
              padding: "10px 12px",
              border: `1px solid ${colors.border}`,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: i === 2 ? "50%" : 6,
                overflow: "hidden",
                flexShrink: 0,
                backgroundColor: i <= 1 ? "#fff" : colors.bgElevated,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src={item.img}
                alt={item.value}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: i <= 1 ? "contain" : "cover",
                  padding: i <= 1 ? 4 : 0,
                }}
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.parentNode.innerHTML = `<span style="font-size:18px;color:${colors.accent}">${item.value[0]}</span>`;
                }}
              />
            </div>
            <div>
              <div style={{ fontSize: 10, color: colors.textTertiary, fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>
                {item.label}
              </div>
              <div style={{ fontSize: 13, color: colors.textPrimary, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
                {item.value}
              </div>
            </div>
          </div>
        ))}
        <div
          style={{
            backgroundColor: colors.accentSubtle,
            borderRadius: 10,
            padding: "10px 12px",
            border: `1px solid rgba(212, 135, 44, 0.25)`,
            gridColumn: "1 / -1",
          }}
        >
          <div style={{ fontSize: 10, color: colors.textTertiary, fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
            Favorite Event
          </div>
          <div style={{ fontSize: 13, color: colors.textPrimary, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
            Knicks vs. Pacers — Game 7, 2024 ECSF
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          padding: "16px 0",
          borderTop: `1px solid ${colors.border}`,
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        {[
          { num: "142", label: "Events" },
          { num: "38", label: "Venues" },
          { num: "247", label: "Following" },
          { num: "312", label: "Followers" },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: colors.textPrimary }}>
              {s.num}
            </div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: colors.textTertiary, textTransform: "uppercase", letterSpacing: 1 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const MockTimelineEntry = () => (
  <div
    style={{
      backgroundColor: colors.bgSecondary,
      borderRadius: 14,
      border: `1px solid ${colors.border}`,
      padding: 20,
      maxWidth: 400,
    }}
  >
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
      <div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: colors.textTertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
          Feb 6, 2026 · NBA
        </div>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: colors.textPrimary, letterSpacing: 1 }}>
          Knicks 118 — Celtics 112
        </div>
      </div>
      <div
        style={{
          backgroundColor: colors.success + "22",
          color: colors.success,
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 13,
          padding: "4px 10px",
          borderRadius: 6,
          letterSpacing: 1,
        }}
      >
        W
      </div>
    </div>
    <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
      <div
        style={{
          backgroundColor: colors.bgTertiary,
          borderRadius: 8,
          padding: "6px 10px",
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 12,
          color: colors.textSecondary,
        }}
      >
        Madison Square Garden
      </div>
      <div
        style={{
          backgroundColor: colors.bgTertiary,
          borderRadius: 8,
          padding: "6px 10px",
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 12,
          color: colors.textSecondary,
        }}
      >
        Section 117
      </div>
    </div>
    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: colors.textSecondary, lineHeight: 1.6, marginBottom: 14 }}>
      Incredible atmosphere. Brunson dropped 38 and the Garden was rocking in the 4th quarter. One of the best regular season games I've been to.
    </div>
    {/* Rating */}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", gap: 4 }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} style={{ color: star <= 5 ? colors.accent : colors.textTertiary, fontSize: 16 }}>
            ★
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 16, fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: colors.textTertiary }}>
        <span>♡ 12</span>
        <span>⌐ 3 comments</span>
      </div>
    </div>
  </div>
);

const MockLogButton = () => (
  <div
    style={{
      width: 56,
      height: 56,
      borderRadius: "50%",
      background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.basketball} 100%)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: `0 4px 20px rgba(212, 135, 44, 0.4)`,
      cursor: "pointer",
      fontSize: 28,
      color: colors.bgPrimary,
      fontWeight: 700,
    }}
  >
    +
  </div>
);

const MockBadge = ({ name, progress, total, complete }) => (
  <div
    style={{
      backgroundColor: complete ? colors.accentSubtle : colors.bgTertiary,
      borderRadius: 12,
      padding: 16,
      border: `1px solid ${complete ? "rgba(212, 135, 44, 0.3)" : colors.border}`,
      textAlign: "center",
    }}
  >
    <div style={{ fontSize: 28, marginBottom: 8 }}>
      {complete ? (
        <span style={{ color: colors.accent }}>✦</span>
      ) : (
        <span style={{ color: colors.textTertiary }}>○</span>
      )}
    </div>
    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, color: colors.textPrimary, letterSpacing: 1, marginBottom: 6 }}>
      {name}
    </div>
    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: complete ? colors.accent : colors.textTertiary }}>
      {progress} / {total}
    </div>
    {/* Progress bar */}
    <div style={{ height: 3, backgroundColor: colors.bgPrimary, borderRadius: 2, marginTop: 8 }}>
      <div
        style={{
          height: "100%",
          width: `${(progress / total) * 100}%`,
          backgroundColor: complete ? colors.accent : colors.textTertiary,
          borderRadius: 2,
          transition: "width 0.5s ease",
        }}
      />
    </div>
  </div>
);

const NavItem = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      background: "none",
      border: "none",
      padding: "8px 0",
      fontFamily: "'Bebas Neue', sans-serif",
      fontSize: 15,
      letterSpacing: 2,
      color: active ? colors.accent : colors.textTertiary,
      cursor: "pointer",
      borderBottom: active ? `2px solid ${colors.accent}` : "2px solid transparent",
      transition: "all 0.2s ease",
    }}
  >
    {label}
  </button>
);

export default function BoxdSeatsBrandGuide() {
  const [activeSection, setActiveSection] = useState("overview");

  const navItems = [
    { id: "overview", label: "Overview" },
    { id: "colors", label: "Colors" },
    { id: "typography", label: "Type" },
    { id: "logo", label: "Logo" },
    { id: "sporticons", label: "Sports" },
    { id: "components", label: "UI" },
  ];

  return (
    <div
      style={{
        backgroundColor: colors.bgPrimary,
        minHeight: "100vh",
        color: colors.textPrimary,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap"
        rel="stylesheet"
      />


      {/* Sticky nav */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          backgroundColor: colors.bgPrimary,
          borderBottom: `1px solid ${colors.border}`,
          padding: "16px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <LogoWithWordmark size={36} />
        <div style={{ display: "flex", gap: 24 }}>
          {navItems.map((item) => (
            <NavItem
              key={item.id}
              label={item.label}
              active={activeSection === item.id}
              onClick={() => {
                setActiveSection(item.id);
                document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth" });
              }}
            />
          ))}
        </div>
      </div>

      {/* Hero */}
      <div
        style={{
          padding: "80px 40px 60px",
          textAlign: "center",
          background: `radial-gradient(ellipse at 50% 0%, rgba(212, 135, 44, 0.08) 0%, transparent 60%)`,
        }}
      >
        <Logo size={120} />
        <h1
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 72,
            letterSpacing: 8,
            color: colors.textPrimary,
            margin: "24px 0 8px",
            lineHeight: 1,
          }}
        >
          BOXD<span style={{ color: colors.accent }}>SEATS</span>
        </h1>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 18,
            color: colors.textSecondary,
            maxWidth: 500,
            margin: "0 auto",
            lineHeight: 1.6,
          }}
        >
          Brand Guidelines & Visual Identity
        </p>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 40px 120px" }}>
        {/* OVERVIEW */}
        <Section title="Brand Overview" id="overview">
          <Body>
            BoxdSeats is the definitive sports identity platform — your personal record of allegiances, 
            experiences, and memories as a fan. The brand communicates premium quality, warmth, and passion 
            without being loud or gimmicky. It takes your sports life seriously and presents it beautifully.
          </Body>
          <div style={{ marginTop: 24 }}>
            <Body secondary>
              The visual identity is rooted in three principles:
            </Body>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginTop: 24 }}>
            {[
              {
                title: "Premium",
                desc: "Dark, refined surfaces that make your content — photos, team colors, stats — the star.",
              },
              {
                title: "Warm",
                desc: "Earthy, sporty tones derived from the logo. Approachable and energetic, never cold.",
              },
              {
                title: "Intentional",
                desc: "Every element earns its place. Clean typography, generous space, purposeful color.",
              },
            ].map((p, i) => (
              <div
                key={i}
                style={{
                  backgroundColor: colors.bgSecondary,
                  borderRadius: 12,
                  padding: 24,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: 18,
                    color: colors.accent,
                    letterSpacing: 2,
                    marginBottom: 8,
                  }}
                >
                  {p.title}
                </div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: colors.textSecondary, lineHeight: 1.6 }}>
                  {p.desc}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* COLORS */}
        <Section title="Color Palette" id="colors">
          <Subsection title="Background System">
            <Body secondary>
              A layered dark UI system. Surfaces get progressively lighter to create depth and hierarchy 
              without relying on shadows alone.
            </Body>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginTop: 20 }}>
              <ColorSwatch color={colors.bgPrimary} name="Primary BG" hex="#0D0F14" role="App background" />
              <ColorSwatch color={colors.bgSecondary} name="Secondary BG" hex="#161922" role="Cards, panels" />
              <ColorSwatch color={colors.bgTertiary} name="Tertiary BG" hex="#1E2230" role="Inputs, chips" />
              <ColorSwatch color={colors.bgElevated} name="Elevated BG" hex="#252A3A" role="Modals, popovers" />
            </div>
          </Subsection>

          <Subsection title="Logo-Derived Accents">
            <Body secondary>
              The primary palette comes directly from the three balls in the logo, creating an inherent 
              connection between the mark and the interface.
            </Body>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginTop: 20 }}>
              <ColorSwatch color={colors.basketball} name="Basketball" hex="#D4872C" role="Primary accent, CTAs" />
              <ColorSwatch color={colors.basketballLight} name="Basketball Lt" hex="#E8A44E" role="Hover states" />
              <ColorSwatch color={colors.baseball} name="Baseball" hex="#F0EBE0" role="Primary text" />
              <ColorSwatch color={colors.baseballStitch} name="Stitch Red" hex="#C83C2C" role="Highlights, alerts" />
              <ColorSwatch color={colors.football} name="Football" hex="#7B5B3A" role="Warm secondary" />
            </div>
          </Subsection>

          <Subsection title="Text Hierarchy">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 8 }}>
              <ColorSwatch color={colors.textPrimary} name="Primary Text" hex="#F0EBE0" role="Headlines, key info" />
              <ColorSwatch color={colors.textSecondary} name="Secondary Text" hex="#9BA1B5" role="Body, descriptions" />
              <ColorSwatch color={colors.textTertiary} name="Tertiary Text" hex="#5E6478" role="Labels, metadata" />
            </div>
          </Subsection>

          <Subsection title="Semantic Colors">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 8 }}>
              <ColorSwatch color={colors.success} name="Win / Success" hex="#3CB878" role="Positive outcomes" />
              <ColorSwatch color={colors.warning} name="Warning" hex="#D4872C" role="Caution states" />
              <ColorSwatch color={colors.error} name="Loss / Error" hex="#C83C2C" role="Negative outcomes" />
            </div>
          </Subsection>
        </Section>

        {/* TYPOGRAPHY */}
        <Section title="Typography" id="typography">
          <Subsection title="Display — Bebas Neue">
            <Body secondary>
              Used for headlines, navigation, stats, and any text that needs to command attention. 
              Athletic, bold, and unapologetically uppercase. Always tracked out with generous letter-spacing.
            </Body>
            <div
              style={{
                marginTop: 24,
                backgroundColor: colors.bgSecondary,
                borderRadius: 12,
                padding: 32,
                border: `1px solid ${colors.border}`,
              }}
            >
              {[72, 48, 36, 24, 18, 14].map((size) => (
                <div
                  key={size}
                  style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: size,
                    color: colors.textPrimary,
                    letterSpacing: Math.max(size * 0.06, 1),
                    lineHeight: 1.1,
                    marginBottom: 16,
                    display: "flex",
                    alignItems: "baseline",
                    gap: 16,
                  }}
                >
                  <span style={{ color: colors.textTertiary, fontFamily: "'DM Sans', sans-serif", fontSize: 11, minWidth: 40 }}>
                    {size}px
                  </span>
                  BOXDSEATS
                </div>
              ))}
            </div>
          </Subsection>

          <Subsection title="Body — DM Sans">
            <Body secondary>
              Used for all body text, descriptions, metadata, and UI labels. Clean, highly legible, 
              and modern without being generic. Supports regular, medium, semibold, and bold weights.
            </Body>
            <div
              style={{
                marginTop: 24,
                backgroundColor: colors.bgSecondary,
                borderRadius: 12,
                padding: 32,
                border: `1px solid ${colors.border}`,
              }}
            >
              {[
                { weight: 400, label: "Regular", text: "The best seat in the house is the one with the best story." },
                { weight: 500, label: "Medium", text: "142 events logged across 38 venues since 2019." },
                { weight: 600, label: "Semibold", text: "Knicks 118 — Celtics 112" },
                { weight: 700, label: "Bold", text: "Madison Square Garden" },
              ].map((item, i) => (
                <div key={i} style={{ marginBottom: 20 }}>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: colors.textTertiary, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>
                    {item.label} ({item.weight})
                  </div>
                  <div
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 16,
                      fontWeight: item.weight,
                      color: colors.textPrimary,
                      lineHeight: 1.6,
                    }}
                  >
                    {item.text}
                  </div>
                </div>
              ))}
            </div>
          </Subsection>

          <Subsection title="Pairing Rules">
            <div
              style={{
                backgroundColor: colors.bgSecondary,
                borderRadius: 12,
                padding: 24,
                border: `1px solid ${colors.border}`,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                color: colors.textSecondary,
                lineHeight: 1.8,
              }}
            >
              <div><span style={{ color: colors.accent }}>→</span> Bebas Neue for headings, stats, navigation labels, and badges</div>
              <div><span style={{ color: colors.accent }}>→</span> DM Sans for body text, descriptions, user input, and metadata</div>
              <div><span style={{ color: colors.accent }}>→</span> Never use Bebas Neue for body text or long-form content</div>
              <div><span style={{ color: colors.accent }}>→</span> Monospace (DM Mono or system mono) for data-heavy stats tables only</div>
            </div>
          </Subsection>
        </Section>

        {/* LOGO */}
        <Section title="Logo System" id="logo">
          <Subsection title="Icon Mark">
            <Body secondary>
              Three overlapping circles representing a basketball, baseball, and football. The baseball 
              sits on top with red stitching detail. Used as the app icon and in compact spaces.
            </Body>
            <div style={{ display: "flex", gap: 40, marginTop: 24, alignItems: "center", flexWrap: "wrap" }}>
              {/* Dark bg */}
              <div
                style={{
                  backgroundColor: colors.bgSecondary,
                  borderRadius: 16,
                  padding: 32,
                  border: `1px solid ${colors.border}`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <Logo size={100} />
                <span style={{ fontSize: 11, color: colors.textTertiary }}>On dark (primary)</span>
              </div>
              {/* Light bg */}
              <div
                style={{
                  backgroundColor: "#F5F3EE",
                  borderRadius: 16,
                  padding: 32,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <Logo size={100} />
                <span style={{ fontSize: 11, color: "#666" }}>On light</span>
              </div>
              {/* Dark gradient bg */}
              <div
                style={{
                  background: `linear-gradient(135deg, #1a1c24 0%, #2a2d3a 100%)`,
                  borderRadius: 16,
                  padding: 32,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <Logo size={100} />
                <span style={{ fontSize: 11, color: colors.textTertiary }}>On gradient</span>
              </div>
            </div>
          </Subsection>

          <Subsection title="Full Wordmark">
            <Body secondary>
              The icon paired with the BoxdSeats wordmark in Bebas Neue. "BOXD" in primary text color, 
              "SEATS" in the accent orange. This creates a natural visual break and emphasizes the 
              experiential nature of the product.
            </Body>
            <div
              style={{
                marginTop: 24,
                backgroundColor: colors.bgSecondary,
                borderRadius: 16,
                padding: "40px 48px",
                border: `1px solid ${colors.border}`,
                display: "flex",
                flexDirection: "column",
                gap: 32,
              }}
            >
              <LogoWithWordmark size={56} />
              <LogoWithWordmark size={40} />
              <LogoWithWordmark size={28} />
            </div>
          </Subsection>

          <Subsection title="Clear Space & Minimum Size">
            <div
              style={{
                backgroundColor: colors.bgSecondary,
                borderRadius: 12,
                padding: 24,
                border: `1px solid ${colors.border}`,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                color: colors.textSecondary,
                lineHeight: 1.8,
              }}
            >
              <div><span style={{ color: colors.accent }}>→</span> Maintain clear space equal to the diameter of one logo circle on all sides</div>
              <div><span style={{ color: colors.accent }}>→</span> Minimum icon size: 24px (digital), 0.5" (print)</div>
              <div><span style={{ color: colors.accent }}>→</span> Minimum wordmark size: 32px height (digital)</div>
              <div><span style={{ color: colors.accent }}>→</span> Never rotate, skew, or recolor individual circles</div>
              <div><span style={{ color: colors.accent }}>→</span> The baseball (off-white #F0EBE0) should never be pure white</div>
            </div>
          </Subsection>
        </Section>

        {/* SPORT ICONS */}
        <Section title="Sport Icons" id="sporticons">
          <Body secondary>
            Each sport has a distinctive icon used throughout the app for filtering, logging, 
            timeline entries, and profile stats. Where a sport covers multiple leagues, a single 
            icon represents the sport. Icons should be sourced from a professional icon library 
            and styled to match the brand.
          </Body>

          <Subsection title="Icon Set">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
              {[
                { sport: "Football", leagues: "NFL", icon: "American football with laces", source: "fa-football" },
                { sport: "Basketball", leagues: "NBA · WNBA", icon: "Basketball with seam lines", source: "fa-basketball" },
                { sport: "Baseball", leagues: "MLB", icon: "Baseball with stitching", source: "fa-baseball" },
                { sport: "Hockey", leagues: "NHL", icon: "Hockey puck", source: "fa-hockey-puck" },
                { sport: "Soccer", leagues: "MLS", icon: "Soccer ball with pentagon pattern", source: "fa-futbol" },
                { sport: "Golf", leagues: "PGA Tour", icon: "Golf ball on tee", source: "fa-golf-ball-tee" },
                { sport: "Motorsports", leagues: "NASCAR · IndyCar", icon: "Checkered racing flag", source: "fa-flag-checkered" },
                { sport: "Tennis", leagues: "ATP · WTA", icon: "Table tennis paddle and ball", source: "fa-table-tennis-paddle-ball" },
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: colors.bgSecondary,
                    borderRadius: 12,
                    padding: "16px 20px",
                    border: `1px solid ${colors.border}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: colors.textPrimary, letterSpacing: 1 }}>
                      {item.sport}
                    </div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: colors.textTertiary, marginTop: 2 }}>
                      {item.leagues}
                    </div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: colors.textSecondary, marginTop: 4, fontStyle: "italic" }}>
                      {item.icon}
                    </div>
                  </div>
                  <div
                    style={{
                      backgroundColor: colors.bgTertiary,
                      borderRadius: 8,
                      padding: "4px 10px",
                      fontFamily: "monospace",
                      fontSize: 11,
                      color: colors.accent,
                    }}
                  >
                    {item.source}
                  </div>
                </div>
              ))}
            </div>
          </Subsection>

          <Subsection title="Styling Specifications">
            <div
              style={{
                backgroundColor: colors.bgSecondary,
                borderRadius: 12,
                padding: 24,
                border: `1px solid ${colors.border}`,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                color: colors.textSecondary,
                lineHeight: 1.8,
              }}
            >
              <div><span style={{ color: colors.accent }}>→</span> <strong style={{ color: colors.textPrimary }}>Source:</strong> Font Awesome 6 Free (solid) or equivalent professional icon set</div>
              <div><span style={{ color: colors.accent }}>→</span> <strong style={{ color: colors.textPrimary }}>Default color:</strong> Text Secondary ({colors.textSecondary}) on dark surfaces</div>
              <div><span style={{ color: colors.accent }}>→</span> <strong style={{ color: colors.textPrimary }}>Active/selected:</strong> Accent orange ({colors.accent}) when a sport filter is active</div>
              <div><span style={{ color: colors.accent }}>→</span> <strong style={{ color: colors.textPrimary }}>Sizes:</strong> 16px (inline/chips), 24px (nav/filters), 32–36px (feature cards)</div>
              <div><span style={{ color: colors.accent }}>→</span> <strong style={{ color: colors.textPrimary }}>Style:</strong> Solid fill, no outlines — consistent weight across all icons</div>
              <div><span style={{ color: colors.accent }}>→</span> <strong style={{ color: colors.textPrimary }}>Containers:</strong> 80×80px rounded cards (16px radius) with bgSecondary fill for display</div>
            </div>
          </Subsection>

          <Subsection title="Recommended Sources">
            <div
              style={{
                backgroundColor: colors.bgSecondary,
                borderRadius: 12,
                padding: 24,
                border: `1px solid ${colors.border}`,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                color: colors.textSecondary,
                lineHeight: 1.8,
              }}
            >
              <div><span style={{ color: colors.accent }}>→</span> <strong style={{ color: colors.textPrimary }}>Font Awesome 6 Free</strong> — fontawesome.com — solid sport icons, open source</div>
              <div><span style={{ color: colors.accent }}>→</span> <strong style={{ color: colors.textPrimary }}>Phosphor Icons</strong> — phosphoricons.com — clean, consistent, multiple weights</div>
              <div><span style={{ color: colors.accent }}>→</span> <strong style={{ color: colors.textPrimary }}>Flaticon / Noun Project</strong> — for individual sport-specific SVGs if needed</div>
              <div><span style={{ color: colors.accent }}>→</span> <strong style={{ color: colors.textPrimary }}>Custom commission</strong> — for a fully bespoke set matching the logo's rounded, warm aesthetic</div>
            </div>
          </Subsection>
        </Section>

                {/* UI COMPONENTS */}
        <Section title="UI Concept" id="components">
          <Subsection title="Profile Card">
            <Body secondary>
              The profile is the centerpiece of BoxdSeats. It communicates identity at a glance through 
              the Big Five favorites, key stats, and activity. Dark surface with warm accent tones.
            </Body>
            <div style={{ marginTop: 24 }}>
              <MockProfileCard />
            </div>
          </Subsection>

          <Subsection title="Timeline Entry">
            <Body secondary>
              Each logged event appears as a card on the user's timeline. The outcome badge (W/L) uses 
              semantic color. Personal details, rating, and social interactions are layered beneath.
            </Body>
            <div style={{ marginTop: 24 }}>
              <MockTimelineEntry />
            </div>
          </Subsection>

          <Subsection title="Log Event Action">
            <Body secondary>
              The primary action — logging an event — is represented by a persistent floating action button 
              in the brand's accent gradient. It's always accessible, always inviting.
            </Body>
            <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 20 }}>
              <MockLogButton />
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: colors.textTertiary }}>
                Floating action button · Always visible
              </span>
            </div>
          </Subsection>

          <Subsection title="Badges & Lists">
            <Body secondary>
              Completed challenges earn badges displayed on your profile. Progress tracking uses 
              subtle bars and completion counts. Locked badges stay muted, completed ones glow 
              in the accent tone.
            </Body>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 24, maxWidth: 450 }}>
              <MockBadge name="All MLB Parks" progress={30} total={30} complete={true} />
              <MockBadge name="Grand Slams" progress={3} total={4} complete={false} />
              <MockBadge name="NYC Venues" progress={7} total={12} complete={false} />
            </div>
          </Subsection>

          <Subsection title="Navigation Pattern">
            <div
              style={{
                backgroundColor: colors.bgSecondary,
                borderRadius: 16,
                padding: 20,
                border: `1px solid ${colors.border}`,
                display: "flex",
                justifyContent: "space-around",
                maxWidth: 400,
              }}
            >
              {["Feed", "Explore", "", "Lists", "Profile"].map((item, i) =>
                item === "" ? (
                  <MockLogButton key={i} />
                ) : (
                  <div
                    key={i}
                    style={{
                      textAlign: "center",
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: 12,
                      letterSpacing: 1.5,
                      color: item === "Profile" ? colors.accent : colors.textTertiary,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                      justifyContent: "center",
                    }}
                  >
                    <div style={{ fontSize: 20 }}>
                      {item === "Feed" && "◉"}
                      {item === "Explore" && "◎"}
                      {item === "Lists" && "☰"}
                      {item === "Profile" && "●"}
                    </div>
                    {item}
                  </div>
                )
              )}
            </div>
          </Subsection>
        </Section>
      </div>
    </div>
  );
}
