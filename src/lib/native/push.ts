import { isNativeApp } from "./photoScan";
import { createClient } from "@/lib/supabase/client";

/**
 * Native push registration. On iOS the Capacitor PushNotifications plugin
 * (in the native shell) registers with APNs and hands us a device token via
 * the bridge; we store it in `device_tokens` so the server can target the
 * device. No-ops on the web. Mirrors the Media-plugin bridge pattern.
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

let started = false;

async function saveToken(token: string): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("device_tokens").upsert(
    {
      user_id: user.id,
      token,
      platform: "ios",
      environment: "production",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,token" }
  );
}

/**
 * Idempotent: wires the token listener, requests notification permission, and
 * registers with APNs. Safe to call on every authed app load.
 */
export async function initPush(): Promise<void> {
  if (typeof window === "undefined" || !isNativeApp() || started) return;
  const Push = pushPlugin();
  if (!Push?.register) return;
  started = true;

  Push.addListener?.("registration", (data) => {
    const token = (data as { value?: string })?.value;
    if (token) void saveToken(token);
  });
  Push.addListener?.("registrationError", () => {
    started = false; // allow a later retry
  });

  try {
    let perm = await Push.checkPermissions?.();
    if (perm?.receive !== "granted") perm = await Push.requestPermissions?.();
    if (perm?.receive === "granted") await Push.register?.();
  } catch {
    /* permission denied or plugin unavailable — leave it; user can enable later */
  }
}
