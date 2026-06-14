"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogoWithWordmark } from "@/components/Logo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resent, setResent] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setUnconfirmed(false);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const notConfirmed =
        error.code === "email_not_confirmed" || /not confirmed/i.test(error.message);
      if (notConfirmed) {
        setUnconfirmed(true);
        setError("Your email isn't confirmed yet. Check your inbox for the link.");
      } else if (/invalid login credentials/i.test(error.message)) {
        setError("Incorrect email or password.");
      } else {
        setError(error.message);
      }
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || !email) return;
    setResent(false);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
    });
    if (!error) {
      setResent(true);
      setResendCooldown(30);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "#0D0F14" }}>
      <div className="mb-10">
        <LogoWithWordmark size={56} />
      </div>

      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
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
            className="w-full px-4 py-3 rounded-lg bg-bg-input border border-border text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
            placeholder="••••••••"
          />
        </div>

        {error && <p className="text-loss text-sm">{error}</p>}

        {unconfirmed && (
          <div>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0}
              className="w-full py-2.5 rounded-lg text-sm font-medium bg-bg-input border border-border text-text-primary hover:border-accent transition-colors disabled:opacity-50"
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend confirmation email"}
            </button>
            {resent && resendCooldown > 0 && (
              <p className="text-win text-xs mt-2 text-center">Sent — check your inbox.</p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg font-display text-lg tracking-wider bg-accent hover:bg-accent-hover text-bg transition-colors disabled:opacity-50"
        >
          {loading ? "SIGNING IN..." : "SIGN IN"}
        </button>

        <p className="text-center text-sm">
          <Link
            href="/reset-password"
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            Forgot password?
          </Link>
        </p>

        <p className="text-center text-sm text-text-secondary">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-accent hover:text-accent-hover transition-colors">
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}
