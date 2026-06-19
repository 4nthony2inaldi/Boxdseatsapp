import { describe, it, expect } from "vitest";
import { parseTeam, parseSoccer, parseField, isCompleted } from "../ingest/boxScore";

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
