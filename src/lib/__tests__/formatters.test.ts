import { describe, it, expect } from "vitest";
import { formatDate, formatShortDate, formatRelative } from "@/lib/formatters";

describe("formatDate", () => {
  it("uses the short default format and is timezone-stable (anchored to local midnight)", () => {
    expect(formatDate("2024-03-15")).toBe("Mar 15, 2024");
    expect(formatDate("2024-12-05")).toBe("Dec 5, 2024");
    expect(formatDate("2024-01-01")).toBe("Jan 1, 2024");
  });

  it("honors custom options (matches the event-page long format)", () => {
    expect(
      formatDate("2024-03-15", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    ).toBe("Friday, March 15, 2024");
  });
});

describe("formatShortDate", () => {
  it("formats as M/D/YY with no leading zeros and a 2-digit year", () => {
    expect(formatShortDate("2024-03-15")).toBe("3/15/24");
    expect(formatShortDate("2024-12-05")).toBe("12/5/24");
    expect(formatShortDate("2026-01-09")).toBe("1/9/26");
  });
});

describe("formatRelative", () => {
  const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

  it("shows 'just now' under a minute", () => {
    expect(formatRelative(ago(30_000))).toBe("just now");
  });
  it("shows minutes, hours, and days", () => {
    expect(formatRelative(ago(5 * 60_000))).toBe("5m ago");
    expect(formatRelative(ago(3 * 3_600_000))).toBe("3h ago");
    expect(formatRelative(ago(2 * 86_400_000))).toBe("2d ago");
  });
  it("falls back to a short calendar date a week or older", () => {
    expect(formatRelative(ago(10 * 86_400_000))).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
  });
});
