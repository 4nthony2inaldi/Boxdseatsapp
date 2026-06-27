import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /auth/confirm — verifies an emailed auth token via token_hash.
 *
 * Used by the password-recovery email. Unlike /auth/callback (the PKCE code
 * flow), verifyOtp validates the emailed token directly and needs no
 * code_verifier cookie — so the link works even when the email opens in a
 * different browser than the one that requested it (e.g. tapping reset inside
 * the iOS app, then opening the email in Safari). The recovery email template
 * points here: /auth/confirm?token_hash=...&type=recovery&next=/reset-password
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next") ?? "/";
  // Guard against open redirects: only allow same-origin relative paths.
  const next = nextParam.startsWith("/") ? nextParam : "/";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
