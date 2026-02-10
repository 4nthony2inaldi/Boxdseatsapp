// BoxdSeats Brand Tokens — from brand guide
export const colors = {
  // Background system
  bg: "#0D0F14",
  bgCard: "#161920",
  bgElevated: "#1C1F2A",
  bgInput: "#232735",

  // Primary accent (basketball orange)
  accent: "#D4872C",
  accentHover: "#E8A44E",
  accentSubtle: "rgba(212, 135, 44, 0.15)",

  // Logo-derived
  basketball: "#D4872C",
  baseball: "#F0EBE0",
  baseballStitch: "#C83C2C",
  football: "#7B5B3A",

  // Text
  textPrimary: "#F0EBE0",
  textSecondary: "#9BA1B5",
  textMuted: "#5A5F72",

  // Borders
  border: "#2A2D3A",
  borderLight: "rgba(240, 235, 224, 0.15)",

  // Semantic
  win: "#3CB878",
  loss: "#C83C2C",
  draw: "#9BA1B5",
  error: "#C83C2C",
  success: "#3CB878",
} as const;

export const LEAGUES = {
  NFL: { color: "#013369", icon: "🏈", sport: "football" },
  NBA: { color: "#1D428A", icon: "🏀", sport: "basketball" },
  MLB: { color: "#002D72", icon: "⚾", sport: "baseball" },
  NHL: { color: "#000000", icon: "🏒", sport: "hockey" },
  MLS: { color: "#5B2C82", icon: "⚽", sport: "soccer" },
  PGA: { color: "#003B2F", icon: "⛳", sport: "golf" },
} as const;
