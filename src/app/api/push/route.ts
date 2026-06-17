import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import http2 from "node:http2";

// Node runtime required: APNs needs HTTP/2 (node:http2) and crypto signing.
export const runtime = "nodejs";

/**
 * POST /api/push
 * Called by a Supabase database webhook when a row is inserted into
 * `notifications`. Looks up the recipient's device tokens, honors their
 * per-type push preference, and delivers an APNs push to each device.
 *
 * Auth: Bearer PUSH_WEBHOOK_SECRET (shared with the DB trigger). Fail closed.
 */

type NotificationRow = {
  user_id: string;
  type: string;
  message: string | null;
  actor_id: string | null;
  target_id: string | null;
  target_type: string | null;
};

const TITLES: Record<string, string> = {
  follow: "New follower",
  follow_request: "Follow request",
  follow_request_approved: "Follow request approved",
  like: "New like",
  comment: "New comment",
  companion_tag: "You were tagged",
  badge_earned: "Badge earned",
};

function apnsJwt(): string {
  const keyId = process.env.APNS_KEY_ID!;
  const teamId = process.env.APNS_TEAM_ID!;
  const p8 = process.env.APNS_KEY_P8!;
  const b64u = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const signingInput =
    b64u({ alg: "ES256", kid: keyId }) + "." + b64u({ iss: teamId, iat: Math.floor(Date.now() / 1000) });
  const sig = crypto
    .sign("sha256", Buffer.from(signingInput), { key: p8, dsaEncoding: "ieee-p1363" })
    .toString("base64url");
  return signingInput + "." + sig;
}

type SendResult = { token: string; status: number; reason?: string };

function sendAll(tokens: string[], payload: object, jwt: string, topic: string): Promise<SendResult[]> {
  return new Promise((resolve) => {
    const client = http2.connect("https://api.push.apple.com");
    const results: SendResult[] = [];
    let pending = tokens.length;
    const body = JSON.stringify(payload);
    client.on("error", () => {
      // Connection-level failure: report all as 0 so caller can log, then bail.
      resolve(tokens.map((t) => ({ token: t, status: 0 })));
    });
    for (const token of tokens) {
      const req = client.request({
        ":method": "POST",
        ":path": `/3/device/${token}`,
        authorization: `bearer ${jwt}`,
        "apns-topic": topic,
        "apns-push-type": "alert",
        "apns-priority": "10",
        "content-type": "application/json",
      });
      let status = 0;
      let data = "";
      req.on("response", (h) => {
        status = Number(h[":status"]) || 0;
      });
      req.setEncoding("utf8");
      req.on("data", (c) => (data += c));
      req.on("end", () => {
        let reason: string | undefined;
        if (status !== 200 && data) {
          try {
            reason = JSON.parse(data).reason;
          } catch {}
        }
        results.push({ token, status, reason });
        if (--pending === 0) {
          client.close();
          resolve(results);
        }
      });
      req.on("error", () => {
        results.push({ token, status: 0 });
        if (--pending === 0) {
          client.close();
          resolve(results);
        }
      });
      req.end(body);
    }
  });
}

export async function POST(request: Request) {
  const secret = process.env.PUSH_WEBHOOK_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const record: NotificationRow | undefined = body?.record;
  if (!record?.user_id || !record?.type) {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Honor the recipient's per-type push preference (default: send).
  const { data: pref } = await supabase
    .from("notification_preferences")
    .select("push_enabled")
    .eq("user_id", record.user_id)
    .eq("type", record.type)
    .maybeSingle();
  if (pref && pref.push_enabled === false) {
    return NextResponse.json({ skipped: "push disabled for type" });
  }

  const { data: tokenRows } = await supabase
    .from("device_tokens")
    .select("token")
    .eq("user_id", record.user_id);
  const tokens = (tokenRows || []).map((r) => r.token as string);
  if (tokens.length === 0) {
    return NextResponse.json({ skipped: "no devices" });
  }

  const payload = {
    aps: {
      alert: { title: TITLES[record.type] || "BoxdSeats", body: record.message || "" },
      sound: "default",
    },
    type: record.type,
    targetId: record.target_id,
    targetType: record.target_type,
  };

  const results = await sendAll(tokens, payload, apnsJwt(), process.env.APNS_BUNDLE_ID!);

  // Prune tokens APNs reports as dead so the table stays clean.
  const dead = results
    .filter((r) => r.status === 410 || r.reason === "BadDeviceToken" || r.reason === "Unregistered")
    .map((r) => r.token);
  if (dead.length) {
    await supabase.from("device_tokens").delete().in("token", dead);
  }

  const sent = results.filter((r) => r.status === 200).length;
  return NextResponse.json({ sent, total: tokens.length, pruned: dead.length });
}
