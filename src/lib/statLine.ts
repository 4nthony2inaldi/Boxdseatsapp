/**
 * A captured box-score stat line: category → label → value, as stored on
 * event_athletes.stat_line. Sports report wildly different lines, so this turns
 * one into a short, sport-appropriate headline like "2-4, HR, 3 RBI" or
 * "28 PTS · 11 REB · 6 AST". Returns null when there's nothing worth showing.
 */
export type StatLine = Record<string, Record<string, string>>;

/**
 * stat_line is a `text` column holding JSON (sports vary too much for fixed
 * columns), so reads come back as a string — parse it to a usable object.
 */
export function parseStatLine(value: string | null | undefined): StatLine | null {
  if (!value) return null;
  if (typeof value === "object") return value as StatLine;
  try {
    const o = JSON.parse(value);
    return o && typeof o === "object" && !Array.isArray(o) ? (o as StatLine) : null;
  } catch {
    return null;
  }
}

const num = (v: string | undefined): number | null => {
  if (v == null) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

export function formatStatLine(sport: string | null, sl: StatLine | null | undefined): string | null {
  if (!sl || typeof sl !== "object") return null;

  // Baseball must stay category-aware: batting and pitching share labels
  // (R, H, HR, K mean opposite things), so we can't flatten.
  if (sport === "baseball") {
    const b = sl.batting;
    if (b) {
      const parts: string[] = [];
      const hab = b["H-AB"] || (b.H != null && b.AB != null ? `${b.H}-${b.AB}` : null);
      if (hab) parts.push(hab);
      if ((num(b.HR) ?? 0) > 0) parts.push(`${b.HR} HR`);
      if ((num(b.RBI) ?? 0) > 0) parts.push(`${b.RBI} RBI`);
      if (parts.length) return parts.join(", ");
    }
    const p = sl.pitching;
    if (p) {
      const parts: string[] = [];
      if (p.IP != null) parts.push(`${p.IP} IP`);
      if (p.K != null) parts.push(`${p.K} K`);
      if (p.ER != null) parts.push(`${p.ER} ER`);
      if (parts.length) return parts.join(", ");
    }
    return null;
  }

  if (sport === "football") {
    if (sl.passing?.YDS != null) {
      const td = num(sl.passing.TD) ?? 0;
      return `${sl.passing.YDS} pass yds${td > 0 ? `, ${sl.passing.TD} TD` : ""}`;
    }
    if (sl.rushing?.YDS != null) {
      const td = num(sl.rushing.TD) ?? 0;
      return `${sl.rushing.YDS} rush yds${td > 0 ? `, ${sl.rushing.TD} TD` : ""}`;
    }
    if (sl.receiving?.REC != null || sl.receiving?.YDS != null) {
      return `${sl.receiving.REC ?? 0} rec, ${sl.receiving.YDS ?? 0} yds`;
    }
    return null;
  }

  // Single-category sports (basketball, hockey): labels are unique, so flatten.
  const flat: Record<string, string> = Object.assign({}, ...Object.values(sl));

  if (sport === "basketball") {
    const parts: string[] = [];
    if (flat.PTS != null) parts.push(`${flat.PTS} PTS`);
    if (flat.REB != null) parts.push(`${flat.REB} REB`);
    if (flat.AST != null) parts.push(`${flat.AST} AST`);
    return parts.length ? parts.join(" · ") : null;
  }

  if (sport === "hockey") {
    if (flat.SV != null || flat.SA != null) {
      const parts: string[] = [];
      if (flat.SV != null) parts.push(`${flat.SV} SV`);
      if (flat.GA != null) parts.push(`${flat.GA} GA`);
      return parts.length ? parts.join(", ") : null;
    }
    if (flat.G != null || flat.A != null) return `${flat.G ?? 0} G, ${flat.A ?? 0} A`;
    return null;
  }

  return null;
}
