import { describe, it, expect } from "vitest";
import { expandSearchTerms } from "../searchAliases";

describe("expandSearchTerms", () => {
  it("expands well-known nicknames to the canonical name (keeping the original)", () => {
    expect(expandSearchTerms("sixers")).toEqual(["sixers", "76ers"]);
    expect(expandSearchTerms("msg")).toEqual(["msg", "madison square garden"]);
    expect(expandSearchTerms("unc")).toEqual(["unc", "north carolina"]);
  });

  it("is case-insensitive and ignores a leading/trailing space", () => {
    expect(expandSearchTerms("MSG")).toEqual(["MSG", "madison square garden"]);
    expect(expandSearchTerms("  Sixers ")).toEqual(["  Sixers ", "76ers"]);
  });

  it("matches multi-word nicknames", () => {
    expect(expandSearchTerms("man u")).toEqual(["man u", "manchester united"]);
  });

  it("leaves an ordinary query untouched (no false expansion)", () => {
    expect(expandSearchTerms("Madison")).toEqual(["Madison"]);
    expect(expandSearchTerms("Lakers")).toEqual(["Lakers"]);
    // A nickname embedded in a longer phrase should NOT expand — matching is on
    // the whole query, which keeps results tight.
    expect(expandSearchTerms("the sixers fan")).toEqual(["the sixers fan"]);
  });
});
