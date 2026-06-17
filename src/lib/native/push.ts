import { isNativeApp } from "./photoScan";
import { createClient } from "@/lib/supabase/client";

/**
 * Native push: registration, tap-to-navigate (deep linking), and a contextual
 * opt-in flow. The Capacitor PushNotifications plugin lives in the native
 * shell; we drive it over the bridge. All no-ops on the web.
 */

type PermState = { receive?: string };
type PushPlugin = {
  checkPermissions?: () => Promise<PermState>;
  requestPermissions?: () => Promise<PermState>;
  register?: () => Promise<void>;
  addListener?: (event: string, cb: (data: unknown) => void) => unknown;
};

function pushPlugin(): PushPlugin | null {
  const cap = (window as unknown as { Capacitor?: { Plugins?: Record<string, unknown> } }).Capacitor;
  return (cap?.Plugins?.PushNotifications as PushPlugin | undefined) ?? null;
}

const FOLLOW_TYPES = ["follow", "follow_request", "follow_request_approved", "friend_activity", "friend_milestone"];
const EVENT_TYPES = ["like", "comment", "companion_tag"];

/** Map a push payload to the in-app route to open — mirrors getNotificationLink. */
export function routeForPush(data: Record<string, unknown> | undefined): string {
  const type = String(data?.type ?? "");
  const targetId = data?.targetId ? String(data.targetId) : "";
  const actorUsername = data?.actorUsername ? String(data.actorUsername) : "";
  if (FOLLOW_TYPES.includes(type)) return actorUsername ? `/user/${actorUsername}` : "/notifications";
  if (EVENT_TYPES.includes(type)) return targetId ? `/event/${targetId}` : "/notifications";
  if (type === "badge_earned") return "/profile";
  if (type === "progress_nudge") return "/lists";
  return "/notifications";
}

async function saveToken(token: string): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("device_tokens").upsert(
    { user_id: user.id, token, platform: "ios", environment: "production", updated_at: new Date().toISOString() },
    { onConflict: "user_id,token" }
  );
}

let listenersWired = false;
let registered = false;

function wireListeners(onNavigate?: (path: string) => void): void {
  if (listenersWired) return;
  const Push = pushPlugin();
  if (!Push?.addListener) return;
  listenersWired = true;

  Push.addListener("registration", (data) => {
    const token = (data as { value?: string })?.value;
    if (token) void saveToken(token);
  });
  Push.addListener("registrationError", () => {
    registered = false; // allow a later retry
  });
  Push.addListener("pushNotificationActionPerformed", (ev) => {
    const data = (ev as { notification?: { data?: Record<string, unknown> } })?.notification?.data;
    const route = routeForPush(data);
    if (onNavigate) onNavigate(route);
    else if (typeof window !== "undefined") window.location.assign(route);
  });
}

async function doRegister(): Promise<void> {
  if (registered) return;
  const Push = pushPlugin();
  if (!Push?.register) return;
  registered = true;
  try {
    await Push.register();
  } catch {
    registered = false;
  }
}

/**
 * Called on every authed app load. Wires listeners (incl. tap-to-navigate) and
 * registers ONLY if permission was already granted — never prompts here, so we
 * don't burn the one-time OS prompt on launch.
 */
export async function initPush(onNavigate?: (path: string) => void): Promise<void> {
  if (typeof window === "undefined" || !isNativeApp()) return;
  const Push = pushPlugin();
  if (!Push?.register) return;
  wireListeners(onNavigate);
  try {
    const perm = await Push.checkPermissions?.();
    if (perm?.receive === "granted") await doRegister();
  } catch {
    /* ignore */
  }
}

/** Request OS permission and register. Returns true if granted. */
export async function enablePush(): Promise<boolean> {
  if (typeof window === "undefined" || !isNativeApp()) return false;
  const Push = pushPlugin();
  if (!Push?.requestPermissions) return false;
  wireListeners();
  try {
    const perm = await Push.requestPermissions();
    if (perm?.receive === "granted") {
      await doRegister();
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

const OFFERED_KEY = "boxd_push_offered";

export function markPushOffered(): void {
  try {
    localStorage.setItem(OFFERED_KEY, "1");
  } catch {
    /* ignore */
  }
}

/**
 * Called after a meaningful action (e.g. first follow). Fires a "boxd:offer-push"
 * event so the soft pre-prompt can show — but only on native, only if the OS
 * permission is still undetermined, and only once.
 */
export async function maybeOfferPush(): Promise<void> {
  if (typeof window === "undefined" || !isNativeApp()) return;
  try {
    if (localStorage.getItem(OFFERED_KEY)) return;
  } catch {
    return;
  }
  const Push = pushPlugin();
  try {
    const perm = await Push?.checkPermissions?.();
    if (perm?.receive === "prompt" || perm?.receive === "prompt-with-rationale") {
      window.dispatchEvent(new CustomEvent("boxd:offer-push"));
    }
  } catch {
    /* ignore */
  }
}
