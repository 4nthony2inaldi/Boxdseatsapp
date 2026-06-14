"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toastError } from "@/components/Toaster";
import type { AdminUserRow } from "@/lib/queries/admin";

export default function AdminUserList({
  users,
  currentUserId,
}: {
  users: AdminUserRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [resetId, setResetId] = useState<string | null>(null);
  const [resetDone, setResetDone] = useState<Set<string>>(new Set());

  async function handleReset(id: string, isSelf: boolean) {
    setResetId(id);
    const res = await fetch("/api/admin/reset-onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: id }),
    });
    const json = await res.json().catch(() => ({}));
    setResetId(null);
    if (!res.ok) {
      toastError(json.error || "Failed to reset onboarding.");
      return;
    }
    // Resetting your own account: walk the flow now. Otherwise confirm inline.
    if (isSelf) router.push("/onboarding");
    else setResetDone((prev) => new Set(prev).add(id));
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    const res = await fetch("/api/admin/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: id }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toastError(json.error || "Failed to delete user.");
      setBusyId(null);
      setConfirmId(null);
      return;
    }
    setRemoved((prev) => new Set(prev).add(id));
    setBusyId(null);
    setConfirmId(null);
    router.refresh();
  }

  const visible = users.filter((u) => !removed.has(u.id));

  return (
    <div className="divide-y divide-border">
      {visible.map((u) => {
        const isSelf = u.id === currentUserId;
        const confirming = confirmId === u.id;
        return (
          <div key={u.id} className="px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Link
                  href={u.username ? `/user/${u.username}` : "#"}
                  className="text-sm text-text-primary font-medium truncate hover:text-accent"
                >
                  {u.display_name || (u.username ? `@${u.username}` : "(no name)")}
                </Link>
                {u.is_admin && (
                  <span className="text-[10px] uppercase tracking-wide text-accent border border-accent/40 rounded px-1.5 py-0.5">
                    admin
                  </span>
                )}
                {u.is_private && <span className="text-[10px] text-text-muted">private</span>}
              </div>
              <div className="text-xs text-text-muted truncate">
                {u.username ? `@${u.username}` : ""} · {u.email || "no email"} · {u.logs} logs
                {u.created_at ? ` · ${u.created_at.slice(0, 10)}` : ""}
              </div>
            </div>

            {resetDone.has(u.id) ? (
              <span className="text-[11px] text-win">re-armed ✓</span>
            ) : (
              <button
                onClick={() => handleReset(u.id, isSelf)}
                disabled={resetId === u.id}
                title="Re-trigger the onboarding flow for this account"
                className="text-xs text-text-muted hover:text-accent transition-colors px-2 py-1 disabled:opacity-50"
              >
                {resetId === u.id ? "…" : "Reset onboarding"}
              </button>
            )}
            {isSelf ? (
              <span className="text-[11px] text-text-muted">you</span>
            ) : u.is_admin ? (
              <span className="text-[11px] text-text-muted">protected</span>
            ) : confirming ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleDelete(u.id)}
                  disabled={busyId === u.id}
                  className="text-xs font-semibold text-white bg-loss rounded-lg px-2.5 py-1.5 disabled:opacity-50"
                >
                  {busyId === u.id ? "Deleting…" : "Confirm"}
                </button>
                <button
                  onClick={() => setConfirmId(null)}
                  disabled={busyId === u.id}
                  className="text-xs text-text-secondary bg-bg-input border border-border rounded-lg px-2.5 py-1.5"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmId(u.id)}
                className="text-xs text-text-muted hover:text-loss transition-colors px-2 py-1"
              >
                Delete
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
