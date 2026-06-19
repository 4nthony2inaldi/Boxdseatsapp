import { describe, it, expect } from "vitest";
import { parseEspnSearch } from "../queries/athleteSearchEspn";

// Shape mirrors a real ESPN search/v2 response (Gilbert Arenas + a baseball hit).
const payload = {
  results: [
    {
      type: "player",
      contents: [
        { displayName: "Gilbert Arenas", uid: "s:40~l:46~a:974", image: { default: "https://a.espncdn.com/i/headshots/nba/players/full/974.png" }, link: { web: "https://www.espn.com/nba/player/_/id/974/gilbert-arenas" } },
        { displayName: "Gilbert Arenas", uid: "s:40~l:41~a:2663", image: null, link: { web: "https://www.espn.com/mens-college-basketball/player/_/id/2663/gilbert-arenas" } },
        { displayName: "Dale Earnhardt", uid: "s:2000~a:150", image: null, link: { web: "https://www.espn.com/racing/driver/_/id/150/dale-earnhardt" } },
      ],
    },
    { type: "article", contents: [{ displayName: "Some headline" }] },
  ],
};

describe("parseEspnSearch", () => {
  it("extracts athlete id, sport, and headshot from player hits", () => {
    const out = parseEspnSearch(payload);
    expect(out).toContainEqual({ espnId: "974", name: "Gilbert Arenas", sport: "basketball", headshotUrl: "https://a.espncdn.com/i/headshots/nba/players/full/974.png" });
    // racing maps to motorsports; driver link form is handled
    expect(out.find((h) => h.espnId === "150")?.sport).toBe("motorsports");
  });

  it("ignores non-player sections", () => {
    const out = parseEspnSearch(payload);
    expect(out.every((h) => h.name !== "Some headline")).toBe(true);
  });

  it("filters by sport when given", () => {
    const out = parseEspnSearch(payload, "basketball");
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((h) => h.sport === "basketball")).toBe(true);
  });

  it("respects the limit", () => {
    expect(parseEspnSearch(payload, null, 1)).toHaveLength(1);
  });

  it("returns nothing for an empty payload", () => {
    expect(parseEspnSearch({})).toEqual([]);
  });
});
