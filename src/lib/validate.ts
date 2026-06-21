/**
 * Small format guards for values that get interpolated into PostgREST filter
 * strings (e.g. `.or("venue_id.eq.<v>")`). supabase-js does NOT escape values
 * inside a raw `.or()`/`.filter()` string, so a client-supplied id or date with
 * PostgREST-special characters (`,` `(` `)`) could otherwise inject extra
 * filter conditions. Validating the shape first closes that off.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

export function isIsoDate(v: unknown): v is string {
  return typeof v === "string" && ISO_DATE_RE.test(v);
}
