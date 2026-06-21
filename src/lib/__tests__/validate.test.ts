import { describe, it, expect } from "vitest";
import { isUuid, isIsoDate } from "../validate";

describe("isUuid", () => {
  it("accepts a real uuid", () => {
    expect(isUuid("8019616f-6552-498c-87a7-43e1dff70e6e")).toBe(true);
  });
  it("rejects non-uuids and injection attempts", () => {
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid("8019616f-6552-498c-87a7-43e1dff70e6e),or(id.eq.x")).toBe(false);
    expect(isUuid("")).toBe(false);
    expect(isUuid(42)).toBe(false);
    expect(isUuid(null)).toBe(false);
  });
});

describe("isIsoDate", () => {
  it("accepts YYYY-MM-DD", () => {
    expect(isIsoDate("2025-06-06")).toBe(true);
  });
  it("rejects other shapes and injection", () => {
    expect(isIsoDate("2025-6-6")).toBe(false);
    expect(isIsoDate("2025-06-06,foo.eq.bar")).toBe(false);
    expect(isIsoDate("yesterday")).toBe(false);
    expect(isIsoDate(20250606)).toBe(false);
  });
});
