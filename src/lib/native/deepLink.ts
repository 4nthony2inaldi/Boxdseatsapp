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
 *
 * Each URL is handled at most once per app session. getLaunchUrl() keeps
 * returning the SAME launch URL on every page load, and navigating there does a
 * full reload that re-runs this code — without the guard that re-fires
 * /auth/confirm endlessly, and after the first run the one-time token is spent,
 * so it fails, redirects, and loops. sessionStorage survives the in-app reloads,
 * so we dedupe against it.
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

const HANDLED_KEY = "boxd:deeplink:handled";

function alreadyHandled(url: string): boolean {
  try {
    return sessionStorage.getItem(HANDLED_KEY) === url;
  } catch {
    return false;
  }
}

function markHandled(url: string): void {
  try {
    sessionStorage.setItem(HANDLED_KEY, url);
  } catch {
    // sessionStorage unavailable — proceed without dedupe.
  }
}

/** Navigate into the app for a deep link, at most once per URL per session. */
function handle(url?: string | null): void {
  if (!url) return;
  const path = inAppPath(url);
  if (!path) return;
  if (alreadyHandled(url)) return;
  markHandled(url);
  window.location.href = path;
}

export async function initDeepLinks(): Promise<void> {
  if (!isNativeApp()) return;
  const App = appPlugin();
  if (!App) return;

  // Warm: the app is already running when the link is tapped.
  App.addListener?.("appUrlOpen", (data) => handle((data as { url?: string })?.url));

  // Cold start: the link launched the app.
  try {
    const launch = await App.getLaunchUrl?.();
    handle(launch?.url);
  } catch {
    // No launch URL — normal launch.
  }
}
