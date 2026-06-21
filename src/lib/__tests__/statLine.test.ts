import { describe, it, expect } from "vitest";
import { formatStatLine } from "../statLine";

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
