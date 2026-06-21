import { describe, it, expect } from "vitest";
import { formatStatLine, aggregatePlayerStats, parseStatLine } from "../statLine";

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
  it("returns null for empty / unknown", () => {
    expect(formatStatLine("baseball", null)).toBeNull();
    expect(formatStatLine("tennis", { stats: { x: "1" } })).toBeNull();
    expect(formatStatLine("baseball", {})).toBeNull();
  });
});
