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
export function parseStatLine(value: string | StatLine | null | undefined): StatLine | null {
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

const toNum = (v: string | undefined): number => num(v) ?? 0;

/** Sum a label across whichever category holds it (single-category sports). */
function flatSum(lines: StatLine[], label: string): number {
  let total = 0;
  for (const sl of lines) for (const cat of Object.values(sl)) total += toNum(cat[label]);
  return total;
}

// Baseball innings are fractional thirds: "6.2" = 6 innings + 2 outs, so they
// can't be summed as plain floats. Convert through outs.
function ipToOuts(ip: string | undefined): number {
  const f = num(ip);
  if (f == null) return 0;
  const whole = Math.floor(f);
  const frac = Math.round((f - whole) * 10);
  return whole * 3 + (frac === 1 ? 1 : frac === 2 ? 2 : 0);
}
const outsToIp = (outs: number): string => `${Math.floor(outs / 3)}.${outs % 3}`;

export type AggStat = { label: string; value: string };

/**
 * Totals across the games a fan saw a player in, for the top of the player
 * page. Counting stats are summed; baseball AVG/ERA are recomputed from their
 * components (you can't average an average).
 */
export function aggregatePlayerStats(sport: string | null, lines: StatLine[]): AggStat[] {
  if (!lines.length) return [];

  if (sport === "baseball") {
    const out: AggStat[] = [];
    const batting = lines.filter((l) => l.batting);
    if (batting.length) {
      const AB = batting.reduce((s, l) => s + toNum(l.batting!.AB), 0);
      const H = batting.reduce((s, l) => s + toNum(l.batting!.H), 0);
      const HR = batting.reduce((s, l) => s + toNum(l.batting!.HR), 0);
      const RBI = batting.reduce((s, l) => s + toNum(l.batting!.RBI), 0);
      const avg = AB > 0 ? (H / AB).toFixed(3).replace(/^0/, "") : "—";
      out.push({ label: "AVG", value: avg }, { label: "HR", value: `${HR}` }, { label: "RBI", value: `${RBI}` }, { label: "H", value: `${H}` });
    }
    const pitching = lines.filter((l) => l.pitching);
    if (pitching.length) {
      const outs = pitching.reduce((s, l) => s + ipToOuts(l.pitching!.IP), 0);
      const ER = pitching.reduce((s, l) => s + toNum(l.pitching!.ER), 0);
      const K = pitching.reduce((s, l) => s + toNum(l.pitching!.K), 0);
      const era = outs > 0 ? ((ER * 9) / (outs / 3)).toFixed(2) : "—";
      out.push({ label: "ERA", value: era }, { label: "K", value: `${K}` }, { label: "IP", value: outsToIp(outs) });
    }
    return out;
  }

  if (sport === "basketball") {
    return [
      { label: "PTS", value: `${Math.round(flatSum(lines, "PTS"))}` },
      { label: "REB", value: `${Math.round(flatSum(lines, "REB"))}` },
      { label: "AST", value: `${Math.round(flatSum(lines, "AST"))}` },
    ];
  }

  if (sport === "football") {
    const passYds = lines.reduce((s, l) => s + toNum(l.passing?.YDS), 0);
    const rushYds = lines.reduce((s, l) => s + toNum(l.rushing?.YDS), 0);
    const recYds = lines.reduce((s, l) => s + toNum(l.receiving?.YDS), 0);
    const td = lines.reduce((s, l) => s + toNum(l.passing?.TD) + toNum(l.rushing?.TD) + toNum(l.receiving?.TD), 0);
    const out: AggStat[] = [];
    if (td > 0) out.push({ label: "TD", value: `${Math.round(td)}` });
    if (passYds > 0) out.push({ label: "Pass yds", value: `${Math.round(passYds)}` });
    if (rushYds > 0) out.push({ label: "Rush yds", value: `${Math.round(rushYds)}` });
    if (recYds > 0) out.push({ label: "Rec yds", value: `${Math.round(recYds)}` });
    return out.slice(0, 4);
  }

  if (sport === "hockey") {
    const SV = flatSum(lines, "SV");
    if (SV > 0) return [{ label: "SV", value: `${Math.round(SV)}` }, { label: "GA", value: `${Math.round(flatSum(lines, "GA"))}` }];
    const G = Math.round(flatSum(lines, "G"));
    const A = Math.round(flatSum(lines, "A"));
    return [{ label: "G", value: `${G}` }, { label: "A", value: `${A}` }, { label: "PTS", value: `${G + A}` }];
  }

  if (sport === "soccer") {
    const SV = flatSum(lines, "SV");
    if (SV > 0) return [{ label: "SV", value: `${Math.round(SV)}` }, { label: "GA", value: `${Math.round(flatSum(lines, "GA"))}` }];
    return [
      { label: "G", value: `${Math.round(flatSum(lines, "G"))}` },
      { label: "A", value: `${Math.round(flatSum(lines, "A"))}` },
      { label: "SOG", value: `${Math.round(flatSum(lines, "SOG"))}` },
    ];
  }

  return [];
}

/** Sum a label across a single line's categories (single-game version of flatSum). */
function flatOne(sl: StatLine, label: string): number {
  let t = 0;
  for (const cat of Object.values(sl)) t += toNum(cat[label]);
  return t;
}

const round = (t: number): string => `${Math.round(t)}`;

/**
 * Per-sport "most X you've seen" leaderboard stats for the bottom of the fan
 * passport. `extract` returns one game's contribution in accumulation units
 * (innings pitched accumulate as outs so fractional thirds sum correctly);
 * `format` turns the running total into its display value. Keys are unique
 * across sports so totals can be accumulated in one flat map per athlete.
 */
export type LeaderboardStat = {
  key: string;
  label: string;
  short: string;
  extract: (sl: StatLine) => number;
  format: (total: number) => string;
};

export const LEADERBOARD_STATS: Record<string, LeaderboardStat[]> = {
  baseball: [
    { key: "hr", label: "Most home runs", short: "HR", extract: (sl) => toNum(sl.batting?.HR), format: round },
    { key: "ip", label: "Most innings pitched", short: "IP", extract: (sl) => ipToOuts(sl.pitching?.IP), format: outsToIp },
  ],
  basketball: [
    { key: "pts", label: "Most points", short: "PTS", extract: (sl) => flatOne(sl, "PTS"), format: round },
    { key: "reb", label: "Most rebounds", short: "REB", extract: (sl) => flatOne(sl, "REB"), format: round },
    { key: "ast", label: "Most assists", short: "AST", extract: (sl) => flatOne(sl, "AST"), format: round },
  ],
  football: [
    { key: "td", label: "Most touchdowns", short: "TD", extract: (sl) => toNum(sl.passing?.TD) + toNum(sl.rushing?.TD) + toNum(sl.receiving?.TD), format: round },
    { key: "passyds", label: "Most passing yards", short: "yds", extract: (sl) => toNum(sl.passing?.YDS), format: round },
    { key: "rushyds", label: "Most rushing yards", short: "yds", extract: (sl) => toNum(sl.rushing?.YDS), format: round },
    { key: "recyds", label: "Most receiving yards", short: "yds", extract: (sl) => toNum(sl.receiving?.YDS), format: round },
  ],
  hockey: [
    { key: "g", label: "Most goals", short: "G", extract: (sl) => flatOne(sl, "G"), format: round },
    { key: "a", label: "Most assists", short: "A", extract: (sl) => flatOne(sl, "A"), format: round },
    { key: "sv", label: "Most saves", short: "SV", extract: (sl) => flatOne(sl, "SV"), format: round },
  ],
  // Soccer keys are distinct from hockey's even though the labels match, so the
  // shared accumulator never double-counts (every stat runs against every line).
  soccer: [
    { key: "sgoals", label: "Most goals", short: "G", extract: (sl) => flatOne(sl, "G"), format: round },
    { key: "sassists", label: "Most assists", short: "A", extract: (sl) => flatOne(sl, "A"), format: round },
    { key: "ssaves", label: "Most saves", short: "SV", extract: (sl) => flatOne(sl, "SV"), format: round },
  ],
};

const ALL_LEADERBOARD_STATS = Object.values(LEADERBOARD_STATS).flat();

/**
 * Fold one game's stat line into an athlete's running leaderboard totals
 * (key → total). Every sport's stats are applied; keys are unique and only the
 * athlete's own sport contributes nonzero values, so the caller filters by
 * sport at ranking time.
 */
export function addLeaderboardContribution(totals: Map<string, number>, sl: StatLine): void {
  for (const st of ALL_LEADERBOARD_STATS) {
    const v = st.extract(sl);
    if (v) totals.set(st.key, (totals.get(st.key) || 0) + v);
  }
}

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

  if (sport === "soccer") {
    // Goalkeepers report saves; everyone else gets a line only when they did
    // something worth noting (a goal, an assist, or a shot on target). Gate the
    // keeper branch on saves alone — gating on shots-faced too could swallow an
    // outfielder's line in the rare case that stat appears without a save.
    if ((num(flat.SV) ?? 0) > 0) {
      const parts: string[] = [];
      if (flat.SV != null) parts.push(`${flat.SV} SV`);
      if ((num(flat.GA) ?? 0) > 0) parts.push(`${flat.GA} GA`);
      return parts.length ? parts.join(", ") : null;
    }
    const parts: string[] = [];
    if ((num(flat.G) ?? 0) > 0) parts.push(`${flat.G} G`);
    if ((num(flat.A) ?? 0) > 0) parts.push(`${flat.A} A`);
    if (!parts.length && (num(flat.SOG) ?? 0) > 0) parts.push(`${flat.SOG} SOG`);
    return parts.length ? parts.join(", ") : null;
  }

  return null;
}
