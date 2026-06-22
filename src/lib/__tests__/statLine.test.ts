import { describe, it, expect } from "vitest";
import {
  formatStatLine,
  aggregatePlayerStats,
  parseStatLine,
  addLeaderboardContribution,
  LEADERBOARD_STATS,
} from "../statLine";

describe("parseStatLine", () => {
  it("parses JSON text from the column into an object", () => {
    expect(parseStatLine('{"batting":{"HR":"1"}}')).toEqual({ batting: { HR: "1" } });
    expect(parseStatLine(null)).toBeNull();
    expect(parseStatLine("not json")).toBeNull();
  });
});

describe("aggregatePlayerStats", () => {
  it("baseball hitter: recomputes AVG, sums HR/RBI/H", () => {
    const lines = [
      { batting: { AB: "4", H: "2", HR: "1", RBI: "3" } },
      { batting: { AB: "4", H: "1", HR: "0", RBI: "0" } },
    ];
    expect(aggregatePlayerStats("baseball", lines)).toEqual([
      { label: "AVG", value: ".375" }, { label: "HR", value: "1" }, { label: "RBI", value: "3" }, { label: "H", value: "3" },
    ]);
  });
  it("baseball pitcher: sums innings via outs and recomputes ERA", () => {
    const lines = [
      { pitching: { IP: "6.2", ER: "2", K: "7" } }, // 20 outs
      { pitching: { IP: "7.0", ER: "1", K: "9" } }, // 21 outs -> 41 outs = 13.2 IP
    ];
    const out = aggregatePlayerStats("baseball", lines);
    expect(out.find((s) => s.label === "IP")?.value).toBe("13.2");
    expect(out.find((s) => s.label === "K")?.value).toBe("16");
    // ERA = 3 ER * 9 / (41/3 innings) = 1.98
    expect(out.find((s) => s.label === "ERA")?.value).toBe("1.98");
  });
  it("basketball sums PTS/REB/AST", () => {
    const lines = [{ stats: { PTS: "28", REB: "11", AST: "6" } }, { stats: { PTS: "20", REB: "5", AST: "9" } }];
    expect(aggregatePlayerStats("basketball", lines)).toEqual([
      { label: "PTS", value: "48" }, { label: "REB", value: "16" }, { label: "AST", value: "15" },
    ]);
  });
  it("football shows only non-zero yard/TD totals", () => {
    const lines = [{ passing: { YDS: "300", TD: "2" } }, { passing: { YDS: "250", TD: "1" } }];
    expect(aggregatePlayerStats("football", lines)).toEqual([
      { label: "TD", value: "3" }, { label: "Pass yds", value: "550" },
    ]);
  });
  it("hockey skater sums G/A/PTS, goalie shows SV/GA", () => {
    expect(aggregatePlayerStats("hockey", [{ skaters: { G: "1", A: "2" } }, { skaters: { G: "2", A: "1" } }])).toEqual([
      { label: "G", value: "3" }, { label: "A", value: "3" }, { label: "PTS", value: "6" },
    ]);
    expect(aggregatePlayerStats("hockey", [{ goalies: { SV: "30", GA: "2" } }, { goalies: { SV: "25", GA: "3" } }])).toEqual([
      { label: "SV", value: "55" }, { label: "GA", value: "5" },
    ]);
  });
  it("football sums rushing and receiving yards in one game", () => {
    const out = aggregatePlayerStats("football", [{ rushing: { YDS: "40", TD: "1" }, receiving: { YDS: "55", TD: "1" } }]);
    expect(out).toEqual([
      { label: "TD", value: "2" }, { label: "Rush yds", value: "40" }, { label: "Rec yds", value: "55" },
    ]);
  });
  it("soccer outfield sums G/A/SOG, goalie shows SV/GA", () => {
    expect(aggregatePlayerStats("soccer", [{ stats: { G: "1", A: "1", SOG: "3" } }, { stats: { G: "2", A: "0", SOG: "2" } }])).toEqual([
      { label: "G", value: "3" }, { label: "A", value: "1" }, { label: "SOG", value: "5" },
    ]);
    expect(aggregatePlayerStats("soccer", [{ stats: { SV: "4", GA: "1" } }, { stats: { SV: "2", GA: "0" } }])).toEqual([
      { label: "SV", value: "6" }, { label: "GA", value: "1" },
    ]);
  });
});

describe("addLeaderboardContribution", () => {
  const fmt = (sport: string, key: string, total: number) =>
    LEADERBOARD_STATS[sport].find((s) => s.key === key)!.format(total);

  it("sums home runs across baseball games", () => {
    const t = new Map<string, number>();
    addLeaderboardContribution(t, { batting: { HR: "2", H: "3" } });
    addLeaderboardContribution(t, { batting: { HR: "1", H: "1" } });
    expect(fmt("baseball", "hr", t.get("hr")!)).toBe("3");
  });

  it("accumulates innings pitched as outs and formats back to IP", () => {
    const t = new Map<string, number>();
    addLeaderboardContribution(t, { pitching: { IP: "6.2" } }); // 20 outs
    addLeaderboardContribution(t, { pitching: { IP: "7.0" } }); // 21 outs -> 41 = 13.2
    expect(fmt("baseball", "ip", t.get("ip")!)).toBe("13.2");
  });

  it("totals football touchdowns across categories", () => {
    const t = new Map<string, number>();
    addLeaderboardContribution(t, { passing: { TD: "2", YDS: "300" }, rushing: { TD: "1", YDS: "20" } });
    expect(fmt("football", "td", t.get("td")!)).toBe("3");
    expect(fmt("football", "passyds", t.get("passyds")!)).toBe("300");
  });

  it("does not record keys for sports the line has no stats for", () => {
    const t = new Map<string, number>();
    addLeaderboardContribution(t, { batting: { HR: "1" } });
    expect(t.has("pts")).toBe(false);
    expect(t.has("g")).toBe(false);
  });

  it("sums football receiving yards under its own key", () => {
    const t = new Map<string, number>();
    addLeaderboardContribution(t, { receiving: { REC: "7", YDS: "95" } });
    addLeaderboardContribution(t, { receiving: { REC: "4", YDS: "60" } });
    expect(fmt("football", "recyds", t.get("recyds")!)).toBe("155");
  });

  it("totals soccer goals/assists/saves under soccer-specific keys", () => {
    const t = new Map<string, number>();
    addLeaderboardContribution(t, { stats: { G: "2", A: "1" } });
    addLeaderboardContribution(t, { stats: { G: "1", SV: "3" } });
    expect(fmt("soccer", "sgoals", t.get("sgoals")!)).toBe("3");
    expect(fmt("soccer", "sassists", t.get("sassists")!)).toBe("1");
    expect(fmt("soccer", "ssaves", t.get("ssaves")!)).toBe("3");
  });
});

describe("formatStatLine", () => {
  it("baseball batting: H-AB plus HR/RBI when nonzero", () => {
    expect(formatStatLine("baseball", { batting: { "H-AB": "2-4", HR: "1", RBI: "3", R: "1" } })).toBe("2-4, 1 HR, 3 RBI");
    expect(formatStatLine("baseball", { batting: { "H-AB": "0-4", HR: "0", RBI: "0" } })).toBe("0-4");
  });
  it("baseball pitching when no batting", () => {
    expect(formatStatLine("baseball", { pitching: { IP: "7.0", K: "9", ER: "3" } })).toBe("7.0 IP, 9 K, 3 ER");
  });
  it("basketball flattens to PTS/REB/AST", () => {
    expect(formatStatLine("basketball", { stats: { MIN: "36", PTS: "28", REB: "11", AST: "6" } })).toBe("28 PTS · 11 REB · 6 AST");
  });
  it("football picks the relevant category", () => {
    expect(formatStatLine("football", { passing: { YDS: "312", TD: "3" } })).toBe("312 pass yds, 3 TD");
    expect(formatStatLine("football", { rushing: { YDS: "84", TD: "0" } })).toBe("84 rush yds");
    expect(formatStatLine("football", { receiving: { REC: "7", YDS: "95" } })).toBe("7 rec, 95 yds");
  });
  it("hockey skater vs goalie", () => {
    expect(formatStatLine("hockey", { skaters: { G: "1", A: "2" } })).toBe("1 G, 2 A");
    expect(formatStatLine("hockey", { goalies: { SV: "31", GA: "2" } })).toBe("31 SV, 2 GA");
  });
  it("soccer scorer, keeper, and quiet outfielder", () => {
    expect(formatStatLine("soccer", { stats: { G: "1", A: "1", SOG: "2" } })).toBe("1 G, 1 A");
    expect(formatStatLine("soccer", { stats: { SV: "4", GA: "1", SHF: "5" } })).toBe("4 SV, 1 GA");
    expect(formatStatLine("soccer", { stats: { G: "0", A: "0", SOG: "2" } })).toBe("2 SOG");
    expect(formatStatLine("soccer", { stats: { G: "0", A: "0", SOG: "0", FC: "2" } })).toBeNull();
    // Shots-faced present without a save must not enter the keeper branch and
    // swallow the line; an outfielder with a shot on goal still reports it.
    expect(formatStatLine("soccer", { stats: { SHF: "1", G: "0", A: "0", SOG: "2" } })).toBe("2 SOG");
  });
  it("returns null for empty / unknown", () => {
    expect(formatStatLine("baseball", null)).toBeNull();
    expect(formatStatLine("tennis", { stats: { x: "1" } })).toBeNull();
    expect(formatStatLine("baseball", {})).toBeNull();
  });
});
