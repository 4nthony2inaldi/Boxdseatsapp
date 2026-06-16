export type ScanItem = { venueId: string; date: string };

/**
 * Run the on-device photo scan. In the native (Capacitor) build, the PhotoScan
 * plugin reads each photo's date + location on-device, geofences them against
 * the venue list locally, groups them to one (venue, date) per game, and
 * returns those pairs — no coordinates or images leave the phone. On the web
 * there's no photo-library access, so this returns null and callers should show
 * the "scanning runs in the app" state.
 */
export async function scanPhotosForVenues(): Promise<ScanItem[] | null> {
  if (typeof window === "undefined") return null;
  const cap = (window as unknown as {
    Capacitor?: { isNativePlatform?: () => boolean; Plugins?: Record<string, unknown> };
  }).Capacitor;
  if (!cap?.isNativePlatform?.()) return null;
  const plugin = cap.Plugins?.PhotoScan as { scan?: () => Promise<{ items?: ScanItem[] }> } | undefined;
  if (!plugin?.scan) return null;
  const res = await plugin.scan();
  return res.items ?? [];
}

export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return !!cap?.isNativePlatform?.();
}
