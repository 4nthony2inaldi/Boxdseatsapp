import { describe, it, expect } from "vitest";
import { expandSearchTerms, orIlike } from "../searchAliases";

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

  it("expands a prefix so it works mid-typing", () => {
    // "Sixer" (no trailing s) is a prefix of the "sixers" nickname.
    expect(expandSearchTerms("Sixer")).toEqual(["Sixer", "76ers"]);
    // A prefix that hits multiple nicknames returns each (capped).
    expect(expandSearchTerms("man")).toEqual(["man", "manchester united", "manchester city"]);
  });

  it("leaves an ordinary query untouched (no false expansion)", () => {
    expect(expandSearchTerms("Madison")).toEqual(["Madison"]);
    expect(expandSearchTerms("Lakers")).toEqual(["Lakers"]);
    // A nickname embedded in a longer phrase should NOT expand — matching is on
    // the whole query, which keeps results tight.
    expect(expandSearchTerms("the sixers fan")).toEqual(["the sixers fan"]);
  });

  it("builds an ilike OR string across terms and columns", () => {
    expect(orIlike(["a", "b"], ["name", "city"])).toBe(
      "name.ilike.%a%,city.ilike.%a%,name.ilike.%b%,city.ilike.%b%"
    );
  });
});
