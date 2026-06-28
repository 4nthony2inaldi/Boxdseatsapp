"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoWithWordmark } from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export default function AppHeader() {
  const pathname = usePathname();
  // During onboarding the notifications + settings links are dead-ends (they
  // bounce back to onboarding), so show just the brand logo, no actions.
  const onboarding = pathname.startsWith("/onboarding");
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function loadUnread(userId: string) {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (mounted) setUnreadCount(count || 0);
    }

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !mounted) return;

      await loadUnread(user.id);

      // Real-time: refresh the badge whenever this user's notifications change
      channel = supabase
        .channel(`notifications-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => loadUnread(user.id)
        )
        .subscribe();
    }

    init();
    // Fallback poll (covers missed realtime events / reconnects)
    const interval = setInterval(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && mounted) loadUnread(user.id);
    }, 120000);

    return () => {
      mounted = false;
      clearInterval(interval);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return (
    <header
      className="sticky top-0 z-50 border-b border-border bg-bg/95 backdrop-blur-sm"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
        {onboarding ? (
          <LogoWithWordmark size={36} />
        ) : (
          <Link href="/">
            <LogoWithWordmark size={36} />
          </Link>
        )}
        {!onboarding && (
          <div className="flex items-center gap-4">
            <Link
              href="/notifications"
              className="p-2.5 -m-2.5 hover:opacity-80 transition-opacity"
              aria-label="Notifications"
            >
              <span className="relative block">
                <BellIcon />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-accent text-[10px] font-bold text-white flex items-center justify-center px-1">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </span>
            </Link>
            <Link
              href="/settings"
              className="p-2.5 -m-2.5 hover:opacity-80 transition-opacity"
              aria-label="Settings"
            >
              <SettingsIcon />
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
