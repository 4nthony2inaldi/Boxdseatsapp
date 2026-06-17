"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogoWithWordmark } from "@/components/Logo";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // When email confirmation is required, signUp returns no session — we show a
  // "check your inbox" screen instead of bouncing to a sign-in that won't work.
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resent, setResent] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username: username.toLowerCase().trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    // Session present → confirmation is off; go straight in. Otherwise, a
    // confirmation email was sent — surface that clearly.
    if (data.session) {
      router.push("/onboarding");
      router.refresh();
    } else {
      setSentTo(email);
      setResendCooldown(30);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || !sentTo) return;
    setResent(false);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: sentTo,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
    });
    if (!error) {
      setResent(true);
      setResendCooldown(30);
    }
  }

  if (sentTo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "#0D0F14" }}>
        <div className="mb-8">
          <LogoWithWordmark size={56} />
        </div>
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-5 w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "var(--color-accent-subtle)" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-10 5L2 7" />
            </svg>
          </div>
          <h1 className="font-display text-2xl text-text-primary tracking-wide mb-2">Check your email</h1>
          <p className="text-sm text-text-secondary leading-relaxed mb-1">
            We sent a confirmation link to
          </p>
          <p className="text-sm text-text-primary font-medium mb-4 break-all">{sentTo}</p>
          <p className="text-sm text-text-muted leading-relaxed mb-6">
            Click the link to activate your account, then you can sign in. It can take a minute to arrive — check your spam folder too.
          </p>

          <button
            onClick={handleResend}
            disabled={resendCooldown > 0}
            className="w-full py-3 rounded-lg font-display text-base tracking-wider bg-bg-input border border-border text-text-primary hover:border-accent transition-colors disabled:opacity-50"
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend email"}
          </button>
          {resent && resendCooldown > 0 && (
            <p className="text-win text-xs mt-2">Sent — check your inbox.</p>
          )}

          <div className="mt-6 space-y-2">
            <Link href="/login" className="block text-sm text-accent hover:text-accent-hover transition-colors">
              Go to sign in
            </Link>
            <button
              onClick={() => { setSentTo(null); setResent(false); }}
              className="block w-full text-sm text-text-muted hover:text-text-secondary transition-colors"
            >
              Wrong email? Start over
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "#0D0F14" }}>
      <div className="mb-10">
        <LogoWithWordmark size={56} />
      </div>

      <form onSubmit={handleSignup} className="w-full max-w-sm space-y-4">
        <div>
          <label className="block text-sm text-text-secondary mb-1.5">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            pattern="[a-zA-Z0-9_]+"
            className="w-full px-4 py-3 rounded-lg bg-bg-input border border-border text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
            placeholder="yourname"
          />
        </div>

        <div>
          <label className="block text-sm text-text-secondary mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg bg-bg-input border border-border text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="block text-sm text-text-secondary mb-1.5">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full px-4 py-3 rounded-lg bg-bg-input border border-border text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
            placeholder="••••••••"
          />
          <p className="text-xs text-text-muted mt-1.5">At least 8 characters.</p>
        </div>

        {error && (
          <p className="text-loss text-sm">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg font-display text-lg tracking-wider bg-accent hover:bg-accent-hover text-bg transition-colors disabled:opacity-50"
        >
          {loading ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
        </button>

        <p className="text-center text-sm text-text-secondary">
          Already have an account?{" "}
          <Link href="/login" className="text-accent hover:text-accent-hover transition-colors">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
