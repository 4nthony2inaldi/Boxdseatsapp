import { isNativeApp } from "./photoScan";

/**
 * Universal Link handling for the native shell.
 *
 * When iOS opens the app via a claimed link (the auth emails point at
 * /auth/confirm — see the AASA file at /.well-known/apple-app-site-association),
 * Capacitor's App plugin fires `appUrlOpen` but does NOT navigate the webview on
 * its own. This routes the opened link into the in-app webview so the flow runs
 * inside the app. Handles both warm (already running) and cold-start (launched by
 * the link) cases. No-op on the web.
 */

type AppPlugin = {
  addListener?: (event: string, cb: (data: unknown) => void) => unknown;
  getLaunchUrl?: () => Promise<{ url?: string } | null>;
};

function appPlugin(): AppPlugin | null {
  const cap = (window as unknown as { Capacitor?: { Plugins?: Record<string, unknown> } }).Capacitor;
  return (cap?.Plugins?.App as AppPlugin | undefined) ?? null;
}

/** If the opened URL is one of ours, return the in-app path+query to load. */
function inAppPath(url?: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith("boxdseats.com")) return null;
    return u.pathname + u.search;
  } catch {
    return null;
  }
}

export async function initDeepLinks(): Promise<void> {
  if (!isNativeApp()) return;
  const App = appPlugin();
  if (!App) return;

  // Warm: the app is already running when the link is tapped.
  App.addListener?.("appUrlOpen", (data) => {
    const path = inAppPath((data as { url?: string })?.url);
    if (path) window.location.href = path;
  });

  // Cold start: the link launched the app.
  try {
    const launch = await App.getLaunchUrl?.();
    const path = inAppPath(launch?.url);
    if (path) window.location.href = path;
  } catch {
    // No launch URL — normal launch.
  }
}
