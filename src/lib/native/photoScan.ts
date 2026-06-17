export type ScanItem = { venueId: string; date: string; photoId?: string };

type VenueGeo = [string, number, number]; // [venueId, lat, lng]
type Photo = { lat: number; lng: number; date: string; id?: string }; // date = local YYYY-MM-DD

const VENUE_RADIUS_M = 350;

export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return !!cap?.isNativePlatform?.();
}

// ── pure helpers (unit-testable) ──────────────────────────────────────────

/** Local calendar date for a photo, approximating US Eastern (UTC-5) to match
 *  how event dates were ingested. Good enough for venue/date matching. */
export function localEventDate(isoUtc: string): string | null {
  const t = Date.parse(isoUtc);
  if (Number.isNaN(t)) return null;
  return new Date(t - 5 * 3600 * 1000).toISOString().slice(0, 10);
}

function distMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// Grid cell ~5.5km of latitude — comfortably larger than the match radius, so
// any venue within radius of a photo is in the photo's cell or an adjacent one.
const GRID_CELL_DEG = 0.05;

function buildVenueGrid(venues: VenueGeo[]): Map<string, VenueGeo[]> {
  const grid = new Map<string, VenueGeo[]>();
  for (const v of venues) {
    const k = `${Math.floor(v[1] / GRID_CELL_DEG)},${Math.floor(v[2] / GRID_CELL_DEG)}`;
    const arr = grid.get(k) ?? [];
    arr.push(v);
    grid.set(k, arr);
  }
  return grid;
}

/**
 * Geofence each photo to its nearest venue (within radius), then collapse to
 * one (venue, date) per game — so 20 photos at one game produce a single item.
 * Uses a spatial grid so each photo only checks venues in its 3×3 cell
 * neighborhood (≈O(photos)) rather than every venue (O(photos × venues)).
 */
export function matchPhotosToVenues(photos: Photo[], venues: VenueGeo[], radius = VENUE_RADIUS_M): ScanItem[] {
  const grid = buildVenueGrid(venues);
  const seen = new Set<string>();
  const items: ScanItem[] = [];
  for (const p of photos) {
    const gx = Math.floor(p.lat / GRID_CELL_DEG);
    const gy = Math.floor(p.lng / GRID_CELL_DEG);
    let best: { id: string; d: number } | null = null;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const arr = grid.get(`${gx + dx},${gy + dy}`);
        if (!arr) continue;
        for (const [id, vlat, vlng] of arr) {
          const d = distMeters(p.lat, p.lng, vlat, vlng);
          if (d <= radius && (!best || d < best.d)) best = { id, d };
        }
      }
    }
    if (!best) continue;
    const key = `${best.id}|${p.date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ venueId: best.id, date: p.date, photoId: p.id });
  }
  return items;
}

// ── photo metadata extraction (defensive — plugin field names vary) ────────

function asObj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}
function numAt(o: Record<string, unknown> | null, k: string): number | undefined {
  const v = o?.[k];
  return typeof v === "number" ? v : undefined;
}

function coordsOf(asset: unknown): { lat: number; lng: number } | null {
  const a = asObj(asset);
  const loc = asObj(a?.location) ?? asObj(a?.gps) ?? asObj(a?.coords) ?? a;
  const lat = numAt(loc, "latitude") ?? numAt(loc, "lat") ?? numAt(a, "latitude") ?? numAt(a, "lat");
  const lng = numAt(loc, "longitude") ?? numAt(loc, "lng") ?? numAt(loc, "lon") ?? numAt(a, "longitude") ?? numAt(a, "lng");
  if (lat !== undefined && lng !== undefined && (lat !== 0 || lng !== 0)) return { lat, lng };
  return null;
}

function isoDateOf(asset: unknown): string | null {
  const a = asObj(asset);
  const v = a?.creationDate ?? a?.dateTaken ?? a?.timestamp ?? a?.date;
  if (typeof v === "string") return v;
  if (typeof v === "number") return new Date(v).toISOString();
  return null;
}

function identifierOf(asset: unknown): string | undefined {
  const a = asObj(asset);
  const v = a?.identifier ?? a?.id ?? a?.localIdentifier;
  return typeof v === "string" ? v : undefined;
}

// ── the scan ───────────────────────────────────────────────────────────────

type MediaPlugin = {
  getMedias?: (opts: Record<string, unknown>) => Promise<unknown>;
  getMediaByIdentifier?: (opts: { identifier: string }) => Promise<{ path?: string }>;
};

function mediaPlugin(): MediaPlugin | null {
  const cap = (window as unknown as { Capacitor?: { Plugins?: Record<string, unknown> } }).Capacitor;
  return (cap?.Plugins?.Media as MediaPlugin | undefined) ?? null;
}

// The venue coordinate set is static within a session — fetch + parse once.
let venuesCache: VenueGeo[] | null = null;
async function loadVenuesGeo(): Promise<VenueGeo[]> {
  if (!venuesCache) venuesCache = await fetch("/venues-geo.json").then((r) => r.json());
  return venuesCache as VenueGeo[];
}

function assetsFrom(res: unknown): unknown[] {
  const r = asObj(res);
  const arr = r?.medias ?? r?.assets ?? r?.photos ?? r?.results;
  if (Array.isArray(arr)) return arr;
  return Array.isArray(res) ? res : [];
}

/**
 * Native-only: read photo date + location on-device via the Media plugin,
 * geofence against the bundled venue list, and return one (venue, date) per
 * game. No coordinates or images leave the device — only the resulting
 * (venue, date) pairs are sent on to look up the games. Returns null on the
 * web (no photo-library access).
 */
export async function scanPhotosForVenues(): Promise<ScanItem[] | null> {
  if (!isNativeApp()) return null;
  const Media = mediaPlugin();
  if (!Media?.getMedias) return null;

  // Option names vary by plugin version — try a few and take the first that
  // returns assets.
  const attempts: Record<string, unknown>[] = [
    { quantity: 10000, types: "photos", sort: [{ key: "creationDate", ascending: false }] },
    { quantity: 10000, type: "photos" },
    { quantity: 10000 },
    {},
  ];
  let assets: unknown[] = [];
  for (const opts of attempts) {
    try {
      const res = await Media.getMedias(opts);
      const a = assetsFrom(res);
      if (a.length) { assets = a; break; }
    } catch {
      /* try next shape */
    }
  }

  const venues = await loadVenuesGeo();

  const photos: Photo[] = [];
  for (const asset of assets) {
    const c = coordsOf(asset);
    const iso = isoDateOf(asset);
    if (!c || !iso) continue;
    const date = localEventDate(iso);
    if (!date) continue;
    photos.push({ lat: c.lat, lng: c.lng, date, id: identifierOf(asset) });
  }

  return matchPhotosToVenues(photos, venues);
}

/**
 * Load a full-quality photo (by its library identifier) as a File for upload —
 * used to auto-attach the matched photo to a log. Native only; returns null if
 * unavailable, so callers treat attachment as best-effort.
 */
export async function loadPhotoFile(identifier: string): Promise<File | null> {
  if (!isNativeApp()) return null;
  const Media = mediaPlugin();
  const cap = (window as unknown as { Capacitor?: { convertFileSrc?: (p: string) => string } }).Capacitor;
  if (!Media?.getMediaByIdentifier || !cap?.convertFileSrc) return null;
  try {
    const { path } = await Media.getMediaByIdentifier({ identifier });
    if (!path) return null;
    const blob = await fetch(cap.convertFileSrc(path)).then((r) => r.blob());
    return new File([blob], "photo.jpg", { type: blob.type || "image/jpeg" });
  } catch {
    return null;
  }
}
