"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { LogoWithWordmark } from "@/components/Logo";
import { MailCheckIcon } from "@/components/icons";
import PasswordInput from "@/components/PasswordInput";

/**
 * Two modes:
 *  - request: no session — collect email, send the recovery link
 *  - update:  arrived via the recovery link (session present) — set new password
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  // One client instance for the page's lifetime — recreating it each render
  // spawns multiple GoTrue clients and can desync the auth state the update call
  // relies on.
  const [supabase] = useState(() => createClient());

  const [mode, setMode] = useState<"loading" | "request" | "update">("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setMode(session ? "update" : "request");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setMode("update");
      }
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setBusy(false);
    if (err) {
      setError("Couldn't send the reset email. Check the address and try again.");
      return;
    }
    setSent(true);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    // Guard: confirm we actually have a recovery session before trying to update.
    // If the link's session never took hold, say so precisely instead of blaming
    // an "expired" link.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setBusy(false);
      setError("Your reset session isn't active. Open the most recent reset email and tap the link again.");
      return;
    }
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) {
      // Surface the real reason rather than a catch-all, so genuine failures are
      // actionable (and so we can diagnose them).
      console.error("Password update failed:", err);
      const msg = err.message || "";
      if (msg.includes("different from the old")) {
        setError("New password must be different from your current password.");
      } else if (/session|token|expired|jwt/i.test(msg)) {
        setError("Your reset link expired. Request a new one and try again.");
      } else {
        setError(msg || "Failed to update password. Please try again.");
      }
      return;
    }
    router.push("/");
    router.refresh();
  }

  const inputClass =
    "w-full py-3.5 px-4 rounded-xl bg-bg-input border border-border text-text-primary text-[15px] outline-none focus:border-accent transition-colors";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <LogoWithWordmark size={44} />
        </div>

        {mode === "loading" && (
          <div className="text-center text-text-muted text-sm py-8">
            Loading...
          </div>
        )}

        {mode === "request" && !sent && (
          <form onSubmit={handleRequest}>
            <h1 className="font-display text-2xl text-text-primary tracking-wide text-center mb-2">
              Reset Password
            </h1>
            <p className="text-sm text-text-secondary text-center mb-6">
              Enter your email and we&apos;ll send you a reset link.
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              aria-label="Email"
              required
              autoComplete="email"
              className={`${inputClass} mb-4`}
            />
            {error && <p className="text-loss text-sm mb-4">{error}</p>}
            <button
              type="submit"
              disabled={busy || !email}
              className="w-full py-4 rounded-xl font-display text-lg tracking-widest text-white disabled:opacity-50"
              style={{
                background:
                  "linear-gradient(135deg, var(--color-accent), var(--color-accent-brown))",
              }}
            >
              {busy ? "SENDING..." : "SEND RESET LINK"}
            </button>
            <Link
              href="/login"
              className="block text-center text-sm text-text-secondary mt-5 hover:text-text-primary"
            >
              ← Back to log in
            </Link>
          </form>
        )}

        {mode === "request" && sent && (
          <div className="text-center">
            <div className="mb-4 flex justify-center text-accent">
              <MailCheckIcon size={44} />
            </div>
            <h1 className="font-display text-2xl text-text-primary tracking-wide mb-2">
              Check Your Email
            </h1>
            <p className="text-sm text-text-secondary mb-6">
              If an account exists for {email}, a reset link is on its way.
            </p>
            <Link
              href="/login"
              className="text-sm text-accent hover:underline"
            >
              Back to log in
            </Link>
          </div>
        )}

        {mode === "update" && (
          <form onSubmit={handleUpdate}>
            <h1 className="font-display text-2xl text-text-primary tracking-wide text-center mb-2">
              Set New Password
            </h1>
            <p className="text-sm text-text-secondary text-center mb-6">
              Choose a new password for your account.
            </p>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password (8+ characters)"
              aria-label="New password"
              autoComplete="new-password"
              className={inputClass}
              wrapperClassName="mb-3"
            />
            <PasswordInput
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm new password"
              aria-label="Confirm new password"
              autoComplete="new-password"
              className={inputClass}
              wrapperClassName="mb-4"
            />
            {error && <p className="text-loss text-sm mb-4">{error}</p>}
            <button
              type="submit"
              disabled={busy || !password || !confirm}
              className="w-full py-4 rounded-xl font-display text-lg tracking-widest text-white disabled:opacity-50"
              style={{
                background:
                  "linear-gradient(135deg, var(--color-accent), var(--color-accent-brown))",
              }}
            >
              {busy ? "UPDATING..." : "UPDATE PASSWORD"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
