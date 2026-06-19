import { describe, it, expect } from "vitest";
import { sanitizeSearchTerm } from "../queries/searchSanitize";

describe("sanitizeSearchTerm", () => {
  it("strips PostgREST-structural characters that could break out of an .or() clause", () => {
    expect(sanitizeSearchTerm("foo),id.eq.1")).toBe("foo id.eq.1");
    expect(sanitizeSearchTerm("a(b)c")).toBe("a b c");
    expect(sanitizeSearchTerm("x,y")).toBe("x y");
    expect(sanitizeSearchTerm("name*")).toBe("name");
    expect(sanitizeSearchTerm("back\\slash")).toBe("back slash");
  });

  it("leaves normal names intact (accents, apostrophes, periods, hyphens)", () => {
    expect(sanitizeSearchTerm("Shaquille O'Neal")).toBe("Shaquille O'Neal");
    expect(sanitizeSearchTerm("St. Louis")).toBe("St. Louis");
    expect(sanitizeSearchTerm("Aurélien Collin")).toBe("Aurélien Collin");
    expect(sanitizeSearchTerm("Smith-Schuster")).toBe("Smith-Schuster");
  });

  it("collapses whitespace and trims", () => {
    expect(sanitizeSearchTerm("  foo   bar  ")).toBe("foo bar");
    expect(sanitizeSearchTerm("")).toBe("");
  });
});
