"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SettingsProfile } from "@/lib/queries/settings";
import { updateProfile } from "@/lib/queries/settings";
import AvatarUpload from "@/components/AvatarUpload";

type Props = {
  profile: SettingsProfile;
  userEmail: string;
  availableLists: { id: string; name: string; sport: string | null; item_count: number }[];
};

const SPORTS = [
  { key: "basketball", icon: "🏀", label: "Basketball" },
  { key: "football", icon: "🏈", label: "Football" },
  { key: "baseball", icon: "⚾", label: "Baseball" },
  { key: "hockey", icon: "🏒", label: "Hockey" },
  { key: "soccer", icon: "⚽", label: "Soccer" },
  { key: "golf", icon: "⛳", label: "Golf" },
];

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-[13px] text-text-muted tracking-[1.5px] uppercase mt-6 mb-3 px-4">
      {children}
    </h2>
  );
}

function SettingRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
      <span className="text-sm text-text-primary">{label}</span>
      {children}
    </div>
  );
}

export default function SettingsForm({ profile, userEmail, availableLists }: Props) {
  const [displayName, setDisplayName] = useState(profile.display_name || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [favSport, setFavSport] = useState(profile.fav_sport);
  const [isPrivate, setIsPrivate] = useState(profile.is_private);
  const [defaultPrivacy, setDefaultPrivacy] = useState(profile.default_privacy);
  const [commentsEnabled, setCommentsEnabled] = useState(profile.comments_enabled);
  const [pinnedList1, setPinnedList1] = useState(profile.pinned_list_1_id);
  const [pinnedList2, setPinnedList2] = useState(profile.pinned_list_2_id);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLogout, setShowLogout] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);

    const result = await updateProfile(supabase, profile.id, {
      display_name: displayName.trim() || null,
      bio: bio.trim() || null,
      fav_sport: favSport,
      is_private: isPrivate,
      default_privacy: defaultPrivacy,
      comments_enabled: commentsEnabled,
      pinned_list_1_id: pinnedList1,
      pinned_list_2_id: pinnedList2,
    });

    setSaving(false);

    if ("error" in result) {
      setError(result.error);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="pb-6">
      {/* Edit Profile */}
      <SectionHeader>Edit Profile</SectionHeader>
      <div className="bg-bg-card border-y border-border">
        <div className="px-4 py-4 border-b border-border flex justify-center">
          <AvatarUpload
            userId={profile.id}
            currentAvatarUrl={profile.avatar_url}
            displayName={profile.display_name}
            username={profile.username}
            size={80}
          />
        </div>
        <div className="px-4 py-3 border-b border-border">
          <label className="text-xs text-text-muted block mb-1">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your display name"
            className="w-full py-2 px-3 rounded-lg bg-bg-input border border-border text-text-primary text-sm outline-none focus:border-accent transition-colors"
          />
        </div>
        <div className="px-4 py-3 border-b border-border">
          <label className="text-xs text-text-muted block mb-1">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us about yourself..."
            rows={2}
            maxLength={160}
            className="w-full py-2 px-3 rounded-lg bg-bg-input border border-border text-text-primary text-sm outline-none focus:border-accent transition-colors resize-none"
          />
          <div className="text-xs text-text-muted text-right mt-0.5">
            {bio.length}/160
          </div>
        </div>
        <div className="px-4 py-3">
          <label className="text-xs text-text-muted block mb-2">Sport Badge</label>
          <div className="flex flex-wrap gap-1.5">
            {SPORTS.map((s) => {
              const selected = favSport === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => setFavSport(selected ? null : s.key)}
                  className="px-3 py-1.5 rounded-full text-xs transition-colors"
                  style={{
                    background: selected ? "rgba(212,135,44,0.15)" : "var(--color-bg-input)",
                    border: `1px solid ${selected ? "var(--color-accent)" : "var(--color-border)"}`,
                    color: selected ? "var(--color-accent)" : "var(--color-text-secondary)",
                    fontWeight: selected ? 600 : 400,
                  }}
                >
                  {s.icon} {s.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Big Four */}
      <SectionHeader>Big Four Favorites</SectionHeader>
      <div className="bg-bg-card border-y border-border">
        {(["team", "venue", "athlete", "event"] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => router.push(`/profile/favorites/${cat}`)}
            className="w-full flex items-center justify-between px-4 py-3 border-b border-border last:border-b-0 hover:bg-bg-elevated transition-colors text-left"
          >
            <span className="text-sm text-text-primary capitalize">
              Favorite {cat}
            </span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ))}
      </div>

      {/* Pinned Lists */}
      <SectionHeader>Pinned Lists</SectionHeader>
      <div className="bg-bg-card border-y border-border">
        <div className="px-4 py-3 border-b border-border">
          <label className="text-xs text-text-muted block mb-1">Pinned List 1</label>
          <select
            value={pinnedList1 || ""}
            onChange={(e) => setPinnedList1(e.target.value || null)}
            className="w-full py-2 px-3 rounded-lg bg-bg-input border border-border text-text-primary text-sm outline-none"
          >
            <option value="">None</option>
            {availableLists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <div className="px-4 py-3">
          <label className="text-xs text-text-muted block mb-1">Pinned List 2</label>
          <select
            value={pinnedList2 || ""}
            onChange={(e) => setPinnedList2(e.target.value || null)}
            className="w-full py-2 px-3 rounded-lg bg-bg-input border border-border text-text-primary text-sm outline-none"
          >
            <option value="">None</option>
            {availableLists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Privacy */}
      <SectionHeader>Privacy</SectionHeader>
      <div className="bg-bg-card border-y border-border">
        <SettingRow label="Private Profile">
          <button
            onClick={() => setIsPrivate(!isPrivate)}
            className="relative w-11 h-6 rounded-full transition-colors"
            style={{
              background: isPrivate ? "var(--color-accent)" : "var(--color-bg-input)",
            }}
          >
            <div
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
              style={{
                transform: isPrivate ? "translateX(22px)" : "translateX(2px)",
              }}
            />
          </button>
        </SettingRow>
        <div className="px-4 py-3 border-b border-border">
          <label className="text-xs text-text-muted block mb-1">Default Event Privacy</label>
          <select
            value={defaultPrivacy}
            onChange={(e) => setDefaultPrivacy(e.target.value)}
            className="w-full py-2 px-3 rounded-lg bg-bg-input border border-border text-text-primary text-sm outline-none"
          >
            <option value="show_all">Public — show everything</option>
            <option value="hide_personal">Semi-private — hide notes, rating, seat</option>
            <option value="hide_all">Private — hidden from everyone</option>
          </select>
        </div>
        <SettingRow label="Allow Comments">
          <button
            onClick={() => setCommentsEnabled(!commentsEnabled)}
            className="relative w-11 h-6 rounded-full transition-colors"
            style={{
              background: commentsEnabled ? "var(--color-accent)" : "var(--color-bg-input)",
            }}
          >
            <div
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
              style={{
                transform: commentsEnabled ? "translateX(22px)" : "translateX(2px)",
              }}
            />
          </button>
        </SettingRow>
      </div>

      {/* Save button */}
      {error && (
        <p className="text-loss text-sm px-4 mt-3">{error}</p>
      )}
      <div className="px-4 mt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 rounded-xl font-display text-base tracking-widest text-white disabled:opacity-50 transition-opacity"
          style={{
            background: saved
              ? "var(--color-win)"
              : "linear-gradient(135deg, var(--color-accent), var(--color-accent-brown))",
          }}
        >
          {saving ? "SAVING..." : saved ? "SAVED" : "SAVE CHANGES"}
        </button>
      </div>

      {/* Account */}
      <SectionHeader>Account</SectionHeader>
      <div className="bg-bg-card border-y border-border">
        <SettingRow label="Email">
          <span className="text-sm text-text-muted">{userEmail}</span>
        </SettingRow>
        <SettingRow label="Username">
          <span className="text-sm text-text-muted">@{profile.username}</span>
        </SettingRow>
        <button
          onClick={() => setShowLogout(!showLogout)}
          className="w-full flex items-center justify-between px-4 py-3 border-b border-border hover:bg-bg-elevated transition-colors"
        >
          <span className="text-sm text-loss">Log Out</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-loss)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
        {showLogout && (
          <div className="px-4 py-3 bg-bg-elevated">
            <p className="text-sm text-text-secondary mb-3">
              Are you sure you want to log out?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowLogout(false)}
                className="flex-1 py-2 rounded-lg bg-bg-card border border-border text-text-secondary text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-2 rounded-lg bg-loss text-white text-sm font-medium"
              >
                Log Out
              </button>
            </div>
          </div>
        )}
        <div className="px-4 py-3">
          <p className="text-xs text-text-muted">
            To change your password or delete your account, contact support.
          </p>
        </div>
      </div>
    </div>
  );
}
