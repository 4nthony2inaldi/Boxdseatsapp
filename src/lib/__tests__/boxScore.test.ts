import { describe, it, expect } from "vitest";
import { parseTeam, parseSoccer, parseField, isCompleted, isWalkoff } from "../ingest/boxScore";

// Build a summary with per-inning linescores for the walk-off tests.
const game = (homeInnings: number[], awayInnings: number[]) => {
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
  return {
    header: {
      competitions: [
        {
          competitors: [
            { homeAway: "home", score: sum(homeInnings), linescores: homeInnings.map((v) => ({ displayValue: String(v) })) },
            { homeAway: "away", score: sum(awayInnings), linescores: awayInnings.map((v) => ({ displayValue: String(v) })) },
          ],
        },
      ],
    },
  };
};

describe("isWalkoff", () => {
  it("tags a bottom-9th walk-off (home tied entering the 9th, wins there)", () => {
    // away scores 1 in the 9th to lead 4-3, home answers with 2 to win 5-4.
    expect(isWalkoff(game([0, 1, 1, 0, 1, 0, 0, 0, 2], [1, 0, 0, 2, 0, 0, 0, 0, 1]))).toBe(true);
  });
  it("tags an extra-innings walk-off", () => {
    expect(isWalkoff(game([0, 0, 0, 0, 0, 0, 0, 0, 0, 1], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe(true);
  });
  it("does NOT tag a home win where the home team led entering the 9th (no bottom half)", () => {
    // home leads 5-3 after 8 and does not bat in the 9th.
    expect(isWalkoff(game([1, 1, 1, 1, 1, 0, 0, 0], [0, 1, 0, 1, 0, 1, 0, 0, 0]))).toBe(false);
  });
  it("does NOT tag an away win or a game shorter than 9 innings", () => {
    expect(isWalkoff(game([0, 0, 0], [5, 0, 0]))).toBe(false);
    expect(isWalkoff(game([1, 1, 1, 1, 1, 1, 1], [0, 0, 0, 0, 0, 0, 0]))).toBe(false);
  });
});

describe("box-score parsers", () => {
  it("parseTeam pulls athletes with their team id", () => {
    const d = {
      boxscore: {
        players: [
          { team: { id: "10" }, statistics: [{ athletes: [{ athlete: { id: "1", displayName: "A" } }, { athlete: { id: "2", displayName: "B" } }] }] },
          { team: { id: "20" }, statistics: [{ athletes: [{ athlete: { id: "3", displayName: "C" } }] }] },
        ],
      },
    };
    const out = parseTeam(d);
    expect(out).toHaveLength(3);
    expect(out[0]).toMatchObject({ espnId: "1", name: "A", espnTeamId: "10" });
    expect(out[2]).toMatchObject({ espnId: "3", espnTeamId: "20" });
  });

  it("parseTeam skips entries with no athlete id and tolerates empty input", () => {
    expect(parseTeam({})).toEqual([]);
    expect(parseTeam({ boxscore: { players: [{ statistics: [{ athletes: [{ athlete: {} }] }] }] } })).toEqual([]);
  });

  it("parseTeam captures per-category stat lines and merges categories per athlete", () => {
    const d = {
      boxscore: {
        players: [
          {
            team: { id: "10" },
            statistics: [
              { name: "batting", labels: ["AB", "H", "HR", "RBI"], athletes: [{ athlete: { id: "1", displayName: "A" }, stats: ["4", "2", "1", "3"] }] },
              { name: "pitching", labels: ["IP", "K"], athletes: [{ athlete: { id: "1", displayName: "A" }, stats: ["2.0", "5"] }] },
            ],
          },
        ],
      },
    };
    const out = parseTeam(d);
    expect(out).toHaveLength(1);
    expect(out[0].statLine).toEqual({ batting: { AB: "4", H: "2", HR: "1", RBI: "3" }, pitching: { IP: "2.0", K: "5" } });
  });

  it("parseTeam yields a null stat line when there are no stats", () => {
    const d = { boxscore: { players: [{ team: { id: "1" }, statistics: [{ athletes: [{ athlete: { id: "5", displayName: "x" } }] }] }] } };
    expect(parseTeam(d)[0].statLine).toBeNull();
  });

  it("parseSoccer reads rosters[].roster[].athlete", () => {
    const d = { rosters: [{ team: { id: "5" }, roster: [{ athlete: { id: "99", displayName: "Keeper" } }] }] };
    const out = parseSoccer(d);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ espnId: "99", name: "Keeper", espnTeamId: "5" });
  });

  it("parseField uses competitor.id and carries finish/winner", () => {
    const d = { events: [{ competitions: [{ competitors: [
      { id: "4721", order: 1, winner: true, athlete: { displayName: "Byron" } },
      { id: "100", order: 2, winner: false, athlete: { displayName: "Other" } },
    ] }] }] };
    const out = parseField(d);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ espnId: "4721", name: "Byron", finish: 1, winner: true });
    expect(out[1]).toMatchObject({ espnId: "100", winner: false });
  });

  it("parseField accepts a bare object (no events wrapper)", () => {
    const d = { competitions: [{ competitors: [{ id: "7" }] }] };
    expect(parseField(d)).toHaveLength(1);
  });

  it("isCompleted reads header status, top-level status, and the post state", () => {
    expect(isCompleted({ header: { competitions: [{ status: { type: { completed: true } } }] } })).toBe(true);
    expect(isCompleted({ header: { competitions: [{ status: { type: { state: "post" } } }] } })).toBe(true);
    expect(isCompleted({ status: { type: { completed: true } } })).toBe(true);
    expect(isCompleted({ header: { competitions: [{ status: { type: { state: "in", completed: false } } }] } })).toBe(false);
    expect(isCompleted({})).toBe(false);
  });
});
