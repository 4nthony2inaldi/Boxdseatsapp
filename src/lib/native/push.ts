import { isNativeApp } from "./photoScan";
import { createClient } from "@/lib/supabase/client";

/**
 * Native push registration. On iOS the Capacitor PushNotifications plugin
 * (in the native shell) registers with APNs and hands us a device token via
 * the bridge; we store it in `device_tokens` so the server can target the
 * device. No-ops on the web. Mirrors the Media-plugin bridge pattern.
 *
 * NOTE: temporarily instrumented with push_debug logging to diagnose why no
 * token persisted — strip the dbg() calls + table once registration is solid.
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

async function dbg(event: string, detail: unknown): Promise<void> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase
      .from("push_debug")
      .insert({ user_id: user?.id ?? null, event, detail: JSON.stringify(detail).slice(0, 500) });
  } catch {
    /* best-effort */
  }
}

let started = false;

async function saveToken(token: string): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    await dbg("save-no-user", { tokenPrefix: token.slice(0, 8) });
    return;
  }
  const { error } = await supabase.from("device_tokens").upsert(
    {
      user_id: user.id,
      token,
      platform: "ios",
      environment: "production",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,token" }
  );
  await dbg(error ? "save-error" : "saved", error ? error.message : { tokenPrefix: token.slice(0, 8) });
}

/**
 * Idempotent: wires the token listener, requests notification permission, and
 * registers with APNs. Safe to call on every authed app load.
 */
export async function initPush(): Promise<void> {
  if (typeof window === "undefined" || !isNativeApp() || started) return;
  const Push = pushPlugin();
  if (!Push?.register) {
    await dbg("no-plugin", { native: isNativeApp(), hasRegister: !!Push?.register });
    return;
  }
  started = true;
  await dbg("init", { ok: true });

  Push.addListener?.("registration", (data) => {
    const token = (data as { value?: string })?.value;
    void dbg("registration-event", { hasToken: !!token, tokenPrefix: token?.slice(0, 8) });
    if (token) void saveToken(token);
  });
  Push.addListener?.("registrationError", (err) => {
    started = false; // allow a later retry
    void dbg("registration-error", err);
  });

  try {
    let perm = await Push.checkPermissions?.();
    await dbg("check-perm", perm);
    if (perm?.receive !== "granted") {
      perm = await Push.requestPermissions?.();
      await dbg("request-perm", perm);
    }
    if (perm?.receive === "granted") {
      await Push.register?.();
      await dbg("register-called", { ok: true });
    } else {
      await dbg("perm-not-granted", perm);
    }
  } catch (e) {
    await dbg("init-throw", { message: String(e) });
  }
}
