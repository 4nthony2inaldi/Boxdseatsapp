"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type U = { username: string; displayName: string | null };

/**
 * Typeahead for the admin diagnostics inspector: fuzzy-filters the user roster
 * (client-side, instant) and navigates to ?u=<username> on pick. Beats the
 * exact-match form — you can search by username or display name.
 */
export default function UserPicker({ users, initial }: { users: U[]; initial?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial ?? "");
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return users
      .filter((u) => u.username.toLowerCase().includes(s) || (u.displayName?.toLowerCase().includes(s) ?? false))
      // exact/prefix username first, then the rest
      .sort((a, b) => {
        const au = a.username.toLowerCase(), bu = b.username.toLowerCase();
        const ar = au === s ? 0 : au.startsWith(s) ? 1 : 2;
        const br = bu === s ? 0 : bu.startsWith(s) ? 1 : 2;
        return ar - br || au.localeCompare(bu);
      })
      .slice(0, 8);
  }, [q, users]);

  function go(username: string) {
    if (!username.trim()) return;
    setOpen(false);
    router.push(`/admin/diagnostics?u=${encodeURIComponent(username.trim())}`);
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <input
          type="text"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === "Enter") go(matches[0]?.username ?? q); }}
          placeholder="Search username or name"
          autoComplete="off"
          className="flex-1 rounded-lg bg-bg-input border border-border px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
        />
        <button
          onClick={() => go(matches[0]?.username ?? q)}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-display tracking-wide uppercase text-bg"
        >
          Look up
        </button>
      </div>
      {open && matches.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-lg bg-bg-elevated border border-border shadow-lg max-h-64 overflow-y-auto">
          {matches.map((u) => (
            <button
              key={u.username}
              onClick={() => go(u.username)}
              className="block w-full text-left px-3 py-2 hover:bg-bg-input transition-colors border-b border-border last:border-0"
            >
              <div className="text-sm text-text-primary truncate">{u.displayName || u.username}</div>
              <div className="text-xs text-text-muted truncate">@{u.username}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
