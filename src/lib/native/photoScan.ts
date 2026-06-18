import { createClient } from "@/lib/supabase/client";

export type ScanItem = { venueId: string; date: string; photoId?: string };

// Temporary diagnostics — capture what getMedias actually does on a device that
// fails to read. Best-effort; strip with the photo_scan_debug table once solved.
async function dbgScan(event: string, detail: unknown): Promise<void> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase
      .from("photo_scan_debug")
      .insert({ user_id: user?.id ?? null, event, detail: JSON.stringify(detail).slice(0, 500) });
  } catch {
    /* best-effort */
  }
}

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

export type ScanProgress =
  | { phase: "reading" }
  | { phase: "scanning"; processed: number; total: number }
  | { phase: "matching" };

export type ScanOptions = {
  /** Only consider photos from the last N months. Undefined = as far back as
   *  the library fetch reaches. Shorter ranges also fetch fewer photos. */
  monthsBack?: number;
  onProgress?: (p: ScanProgress) => void;
};

// Yield to the event loop so React can paint progress between batches.
const yieldToUI = () => new Promise<void>((r) => setTimeout(r, 0));

// Reject if a promise doesn't settle in time, so a stalled native call can't
// leave the scan spinning forever.
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

/** Thrown when the photo library can't be read (denied access or a stall). */
export class PhotoReadError extends Error {
  constructor() {
    super("photo-read-failed");
    this.name = "PhotoReadError";
  }
}

/**
 * Native-only: read photo date + location on-device via the Media plugin,
 * geofence against the bundled venue list, and return one (venue, date) per
 * game. No coordinates or images leave the device — only the resulting
 * (venue, date) pairs are sent on to look up the games. Returns null on the
 * web (no photo-library access).
 *
 * `monthsBack` bounds the scan (the library is fetched newest-first, so we stop
 * as soon as we pass the cutoff). `onProgress` reports phase + counts so the UI
 * can show a real progress bar.
 */
export async function scanPhotosForVenues(opts: ScanOptions = {}): Promise<ScanItem[] | null> {
  const { monthsBack, onProgress } = opts;
  if (!isNativeApp()) return null;
  const Media = mediaPlugin();
  if (!Media?.getMedias) return null;

  onProgress?.({ phase: "reading" });

  // Fetch fewer photos for shorter ranges so a quick scan stays quick, with
  // very generous per-month headroom (~260/day) so an in-range photo is never
  // truncated before the exact date cutoff below can see it.
  // getMedias materializes `quantity` photos in one bridge call, so a huge
  // number stalls (50k timed out at 30s on a real device). Keep it modest —
  // the date cutoff below still bounds results to the chosen range.
  const quantity = monthsBack ? Math.min(8000, monthsBack * 1500) : 8000;
  // Minimal thumbnails: we only read GPS/date/identifier and never touch the
  // image, so skip the costly per-photo thumbnail generation that otherwise
  // makes getMedias crawl (or appear to hang) on large libraries.
  const thumb = { thumbnailWidth: 1, thumbnailHeight: 1, thumbnailQuality: 1 };
  const attempts: Record<string, unknown>[] = [
    { quantity, types: "photos", ...thumb, sort: [{ key: "creationDate", ascending: false }] },
    { quantity, type: "photos", ...thumb },
    { quantity, ...thumb },
    {},
  ];
  let assets: unknown[] = [];
  let sortedDesc = false;
  let readOk = false;
  await dbgScan("start", { monthsBack: monthsBack ?? "all", quantity });
  for (let ai = 0; ai < attempts.length; ai++) {
    const t0 = Date.now();
    try {
      const res = await withTimeout(Media.getMedias(attempts[ai]), 60000);
      readOk = true; // the plugin responded; this opts shape is supported
      const a = assetsFrom(res);
      await dbgScan("attempt-ok", { ai, ms: Date.now() - t0, count: a.length });
      if (a.length) {
        assets = a;
        sortedDesc = ai === 0; // only the first attempt requests newest-first
        break;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await dbgScan("attempt-fail", { ai, ms: Date.now() - t0, msg });
      // A hang (timeout) means the plugin is stalled — don't retry other shapes,
      // just surface the error. A plain rejection means a bad opts shape: try next.
      if (e instanceof Error && e.message === "timeout") break;
    }
  }
  // Nothing responded (denied access or a stall) — fail loudly instead of
  // returning [] (which reads as "no games found") or spinning forever.
  if (!readOk) {
    await dbgScan("read-failed", { quantity });
    throw new PhotoReadError();
  }
  await dbgScan("assets", { count: assets.length, sortedDesc });
  if (assets.length) {
    const a0 = asObj(assets[0]);
    await dbgScan("sample", { keys: a0 ? Object.keys(a0) : null });
  }

  const venues = await loadVenuesGeo();
  const cutoff = monthsBack ? Date.now() - monthsBack * 30.5 * 86400 * 1000 : null;

  const photos: Photo[] = [];
  const total = assets.length;
  for (let i = 0; i < total; i++) {
    const asset = assets[i];
    const iso = isoDateOf(asset);

    let older = false;
    if (cutoff && iso) {
      const t = Date.parse(iso);
      older = !Number.isNaN(t) && t < cutoff;
    }
    // Newest-first: once past the cutoff, everything after is older too.
    if (older && sortedDesc) break;

    if (!older) {
      const c = coordsOf(asset);
      if (c && iso) {
        const date = localEventDate(iso);
        if (date) photos.push({ lat: c.lat, lng: c.lng, date, id: identifierOf(asset) });
      }
    }

    if (i % 250 === 0) {
      onProgress?.({ phase: "scanning", processed: i, total });
      await yieldToUI();
    }
  }

  onProgress?.({ phase: "matching" });
  await yieldToUI();
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
