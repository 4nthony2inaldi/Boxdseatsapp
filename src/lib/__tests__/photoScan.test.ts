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
  it("rolls an early-UTC timestamp back to the previous local day", () => {
    // 03:00 UTC is still the previous evening once shifted by 5h.
    expect(localEventDate("2024-07-04T03:00:00Z")).toBe("2024-07-03");
  });
  it("honors an explicit timezone offset in the input", () => {
    // 9pm US-Pacific on the 4th = 04:00 UTC on the 5th → 23:00 on the 4th Eastern.
    expect(localEventDate("2024-07-04T21:00:00-07:00")).toBe("2024-07-04");
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

  it("honors a per-venue radius (4th element) over the default", () => {
    // Photo ~400m north of the venue: outside the default fence, inside a
    // venue that declares a larger one (e.g. a tennis ground).
    const photo = [{ lat: 40.0036, lng: -74.0, date: "2024-06-01" }];
    expect(matchPhotosToVenues(photo, [["arena", 40.0, -74.0]])).toEqual([]);
    expect(matchPhotosToVenues(photo, [["grounds", 40.0, -74.0, 600]])).toEqual([
      { venueId: "grounds", date: "2024-06-01", photoId: undefined },
    ]);
  });

  it("matches across a grid-cell boundary (3x3 neighborhood)", () => {
    // Venue just below a 0.05° cell line, photo just above it (~22m apart):
    // different grid cells, well within the default radius — must still match.
    const boundaryVenues: [string, number, number][] = [["arena", 0.0499, 0.0499]];
    const items = matchPhotosToVenues([{ lat: 0.0501, lng: 0.0501, date: "2024-06-01" }], boundaryVenues);
    expect(items).toEqual([{ venueId: "arena", date: "2024-06-01", photoId: undefined }]);
  });

  it("picks the nearest venue when two are in range", () => {
    // Two venues ~120m apart; photo sits right next to the second one.
    const close: [string, number, number][] = [
      ["a", 40.0, -74.0],
      ["b", 40.0011, -74.0], // ~122m north of a
    ];
    const items = matchPhotosToVenues([{ lat: 40.00105, lng: -74.0, date: "d" }], close);
    expect(items).toEqual([{ venueId: "b", date: "d", photoId: undefined }]);
  });

  it("carries the photo id through to the matched item", () => {
    const items = matchPhotosToVenues(
      [{ lat: 40.8296, lng: -73.9262, date: "2024-06-01", id: "photo-42" }],
      venues
    );
    expect(items[0].photoId).toBe("photo-42");
  });

  it("returns nothing when there are no venues", () => {
    expect(matchPhotosToVenues([{ lat: 40.8296, lng: -73.9262, date: "d" }], [])).toEqual([]);
  });

  it("matches a far photo via a large per-venue radius across grid cells", () => {
    // Motorsport-style 2000m fence; photo ~1.5km away in an adjacent grid cell.
    const photo = [{ lat: 40.0135, lng: -74.0, date: "race" }]; // ~1.5km north
    expect(matchPhotosToVenues(photo, [["circuit", 40.0, -74.0, 2000]])).toEqual([
      { venueId: "circuit", date: "race", photoId: undefined },
    ]);
    // …but the default fence would miss it.
    expect(matchPhotosToVenues(photo, [["circuit", 40.0, -74.0]])).toEqual([]);
  });
});
