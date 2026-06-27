"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PasswordInput from "@/components/PasswordInput";

export default function AccountSecurity() {
  const router = useRouter();

  // Password change
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Account deletion
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handlePasswordChange() {
    setPasswordError(null);
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setPasswordStatus("saving");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setPasswordStatus("error");
      setPasswordError(
        error.message.includes("different from the old")
          ? "New password must be different from your current password."
          : "Failed to update password. Please try again."
      );
      return;
    }

    setPasswordStatus("saved");
    setNewPassword("");
    setConfirmPassword("");
    setTimeout(() => {
      setPasswordStatus("idle");
      setShowPassword(false);
    }, 1500);
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== "DELETE") return;
    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setDeleteError(body?.error || "Failed to delete account.");
        setDeleting(false);
        return;
      }
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch {
      setDeleteError("Failed to delete account. Please try again.");
      setDeleting(false);
    }
  }

  const inputClass =
    "w-full py-2.5 px-3.5 rounded-lg bg-bg-input border border-border text-text-primary text-sm outline-none focus:border-accent transition-colors";

  return (
    <>
      {/* Change Password */}
      <button
        onClick={() => setShowPassword(!showPassword)}
        className="w-full flex items-center justify-between px-4 py-3 border-b border-border hover:bg-bg-elevated transition-colors"
      >
        <span className="text-sm text-text-primary">Change Password</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-text-muted)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: showPassword ? "rotate(90deg)" : undefined,
            transition: "transform 0.15s",
          }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
      {showPassword && (
        <div className="px-4 py-3 bg-bg-elevated border-b border-border">
          <div className="space-y-2.5 mb-3">
            <PasswordInput
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (8+ characters)"
              aria-label="New password"
              autoComplete="new-password"
              className={inputClass}
            />
            <PasswordInput
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              aria-label="Confirm new password"
              autoComplete="new-password"
              className={inputClass}
            />
          </div>
          {passwordError && (
            <p className="text-loss text-xs mb-3">{passwordError}</p>
          )}
          <button
            onClick={handlePasswordChange}
            disabled={
              passwordStatus === "saving" || !newPassword || !confirmPassword
            }
            className="w-full py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-opacity"
            style={{
              background:
                passwordStatus === "saved"
                  ? "var(--color-win)"
                  : "linear-gradient(135deg, var(--color-accent), var(--color-accent-brown))",
            }}
          >
            {passwordStatus === "saving"
              ? "Updating..."
              : passwordStatus === "saved"
                ? "Password Updated"
                : "Update Password"}
          </button>
        </div>
      )}

      {/* Delete Account */}
      <button
        onClick={() => setShowDelete(!showDelete)}
        className="w-full flex items-center justify-between px-4 py-3 border-b border-border hover:bg-bg-elevated transition-colors"
      >
        <span className="text-sm text-loss">Delete Account</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-loss)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
      {showDelete && (
        <div className="px-4 py-3 bg-bg-elevated border-b border-border">
          <p className="text-sm text-text-secondary mb-1.5">
            This permanently deletes your account, all logged events, lists,
            photos, and social connections. This cannot be undone.
          </p>
          <p className="text-xs text-text-muted mb-3">
            Type <span className="font-semibold text-loss">DELETE</span> to
            confirm.
          </p>
          <input
            type="text"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder="DELETE"
            aria-label="Type DELETE to confirm account deletion"
            className={`${inputClass} mb-3`}
          />
          {deleteError && (
            <p className="text-loss text-xs mb-3">{deleteError}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowDelete(false);
                setDeleteConfirmText("");
              }}
              className="flex-1 py-2 rounded-lg bg-bg-card border border-border text-text-secondary text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== "DELETE" || deleting}
              className="flex-1 py-2 rounded-lg bg-loss text-white text-sm font-medium disabled:opacity-40"
            >
              {deleting ? "Deleting..." : "Delete Forever"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
