// Per-log privacy redaction for timeline entries.
//
// `event_logs.privacy` has three tiers: show_all, hide_personal, hide_all.
// RLS keeps hide_all rows out of other users' reads entirely, but it does NOT
// strip the personal fields of a hide_personal row — that is the app layer's
// job (see docs/boxdseats-schema.sql). Doing it only in the rendering component
// leaks the data in the payload, so we redact at the data layer, on both the
// server fetch and the client load-more, for any viewer who isn't the owner.
//
// Pure and dependency-free so both server (profile.ts) and client (Timeline)
// can share it without pulling server code into the client bundle.

const PERSONAL_FIELDS = ["notes", "rating", "seat_location", "photo_url"] as const;

/**
 * Null out the personal fields of a hide_personal log when the viewer is not
 * the owner. show_all rows and the owner's own rows pass through untouched.
 */
export function redactTimelineEntry<T extends { privacy: string | null }>(
  entry: T,
  isOwner: boolean
): T {
  if (isOwner || entry.privacy === "show_all") return entry;
  const out = { ...entry } as Record<string, unknown>;
  for (const f of PERSONAL_FIELDS) {
    if (f in out) out[f] = null;
  }
  return out as T;
}
