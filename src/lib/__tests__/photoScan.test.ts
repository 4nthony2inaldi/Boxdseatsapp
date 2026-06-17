import { describe, it, expect } from "vitest";
import { localEventDate, matchPhotosToVenues } from "@/lib/native/photoScan";

describe("localEventDate", () => {
  it("shifts UTC to an approximate US-Eastern (UTC-5) calendar date", () => {
    // 02:00 UTC → 21:00 previous day Eastern
    expect(localEventDate("2024-03-15T02:00:00Z")).toBe("2024-03-14");
    // midday UTC stays the same calendar day
    expect(localEventDate("2024-03-15T12:00:00Z")).toBe("2024-03-15");
  });
  it("returns null for unparseable input", () => {
    expect(localEventDate("not-a-date")).toBeNull();
  });
});

describe("matchPhotosToVenues", () => {
  // [id, lat, lng]
  const venues: [string, number, number][] = [
    ["yankee", 40.8296, -73.9262],
    ["fenway", 42.3467, -71.0972],
  ];

  it("matches a photo within the radius to the nearest venue", () => {
    const items = matchPhotosToVenues(
      [{ lat: 40.8298, lng: -73.9264, date: "2024-06-01" }],
      venues
    );
    expect(items).toEqual([{ venueId: "yankee", date: "2024-06-01", photoId: undefined }]);
  });

  it("ignores photos far from any venue", () => {
    const items = matchPhotosToVenues([{ lat: 0, lng: 0, date: "2024-06-01" }], venues);
    expect(items).toEqual([]);
  });

  it("collapses many photos at one game to a single (venue, date) item", () => {
    const items = matchPhotosToVenues(
      [
        { lat: 40.8296, lng: -73.9262, date: "2024-06-01", id: "a" },
        { lat: 40.8297, lng: -73.9261, date: "2024-06-01", id: "b" },
        { lat: 40.8298, lng: -73.9263, date: "2024-06-01", id: "c" },
      ],
      venues
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ venueId: "yankee", date: "2024-06-01" });
  });

  it("keeps separate items for the same venue on different dates", () => {
    const items = matchPhotosToVenues(
      [
        { lat: 40.8296, lng: -73.9262, date: "2024-06-01" },
        { lat: 40.8296, lng: -73.9262, date: "2024-06-02" },
      ],
      venues
    );
    expect(items).toHaveLength(2);
  });

  it("matches across a grid-cell boundary (3x3 neighborhood)", () => {
    // Venue just below a 0.05° cell line, photo just above it (~22m apart):
    // different grid cells, well within the 350m radius — must still match.
    const boundaryVenues: [string, number, number][] = [["arena", 0.0499, 0.0499]];
    const items = matchPhotosToVenues([{ lat: 0.0501, lng: 0.0501, date: "2024-06-01" }], boundaryVenues);
    expect(items).toEqual([{ venueId: "arena", date: "2024-06-01", photoId: undefined }]);
  });
});
