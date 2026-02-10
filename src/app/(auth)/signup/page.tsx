"use client";

import { useState } from "react";
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
  const router = useRouter();
  const supabase = createClient();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username.toLowerCase().trim(),
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
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
            minLength={6}
            className="w-full px-4 py-3 rounded-lg bg-bg-input border border-border text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
            placeholder="••••••••"
          />
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
