"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SettingsProfile, AvailableList } from "@/lib/queries/settings";
import { updateProfile } from "@/lib/queries/settings";
import AvatarUpload from "@/components/AvatarUpload";
import Button from "@/components/Button";
import AccountSecurity from "@/components/settings/AccountSecurity";
import NotificationSettings from "@/components/settings/NotificationSettings";
import UsernameEditor from "@/components/settings/UsernameEditor";
import SportIcon from "@/components/SportIcon";
import { SPORTS_LIST } from "@/lib/sportIcons";
import { METROS } from "@/lib/metros";
import { toastError } from "@/components/Toaster";

type Props = {
  profile: SettingsProfile;
  userEmail: string;
  availableLists: AvailableList[];
};

const SPORTS = SPORTS_LIST;

// Forked lists copy the original name, so disambiguate user lists by owner.
function listOptionLabel(list: AvailableList, currentUserId: string): string {
  if (list.source === "system") return list.name;
  if (list.created_by === currentUserId) return `${list.name} · yours`;
  if (list.creator_username) return `${list.name} · @${list.creator_username}`;
  return list.name;
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-[13px] text-text-muted tracking-[2px] uppercase mt-6 mb-3 px-4">
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
  const [homeCity, setHomeCity] = useState(profile.home_city);
  const [isPrivate, setIsPrivate] = useState(profile.is_private);
  const [defaultPrivacy, setDefaultPrivacy] = useState(profile.default_privacy);
  const [commentsEnabled, setCommentsEnabled] = useState(profile.comments_enabled);
  const [pinnedList1, setPinnedList1] = useState(profile.pinned_list_1_id);
  const [pinnedList2, setPinnedList2] = useState(profile.pinned_list_2_id);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // The Edit Profile identity fields buffer and commit on an explicit Save
  // (it feels more intentional than blur-saving a name/bio). Everything else
  // still auto-saves on change. `base` is the last-saved snapshot, so we can
  // tell when there are unsaved edits.
  const [base, setBase] = useState({
    displayName: profile.display_name,
    bio: profile.bio,
    favSport: profile.fav_sport,
    homeCity: profile.home_city,
  });
  const norm = (s: string) => s.trim() || null;
  const profileDirty =
    norm(displayName) !== base.displayName ||
    norm(bio) !== base.bio ||
    favSport !== base.favSport ||
    homeCity !== base.homeCity;

  async function saveProfile() {
    setSaving(true);
    const updates = {
      display_name: norm(displayName),
      bio: norm(bio),
      fav_sport: favSport,
      home_city: homeCity,
    };
    const result = await updateProfile(supabase, profile.id, updates);
    setSaving(false);
    if ("error" in result) {
      toastError("Couldn't save — check your connection.");
    } else {
      setBase({ displayName: updates.display_name, bio: updates.bio, favSport, homeCity });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  }

  // Autosave for the instant controls (toggles, selects). Text/profile fields
  // use the Save button above instead.
  async function autoSave(
    updates: Parameters<typeof updateProfile>[2],
    revert?: () => void
  ) {
    setSaving(true);
    const result = await updateProfile(supabase, profile.id, updates);
    setSaving(false);
    if ("error" in result) {
      // Roll the control back so the UI doesn't show a value that never saved.
      revert?.();
      toastError("Couldn't save — check your connection.");
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
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
        <div className="px-4 py-3 border-b border-border">
          <label className="text-xs text-text-muted block mb-1">Home City</label>
          <select
            value={homeCity || ""}
            onChange={(e) => setHomeCity(e.target.value || null)}
            className="w-full py-2 px-3 rounded-lg bg-bg-input border border-border text-text-primary text-sm outline-none"
          >
            <option value="">Not set</option>
            {METROS.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
                {m.state ? `, ${m.state}` : ""}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-text-muted mt-1">
            Powers the &ldquo;Around You&rdquo; section on your feed.
          </p>
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
                  <SportIcon sport={s.key} size={14} className="inline-block mr-1 -mt-0.5" /> {s.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="px-4 py-3 border-t border-border">
          <Button onClick={saveProfile} disabled={!profileDirty || saving} fullWidth>
            {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
          </Button>
          {profileDirty && !saving && (
            <p className="text-[11px] text-text-muted text-center mt-2">
              You have unsaved changes
            </p>
          )}
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
            onChange={(e) => {
              const prev = pinnedList1;
              const next = e.target.value || null;
              setPinnedList1(next);
              autoSave({ pinned_list_1_id: next }, () => setPinnedList1(prev));
            }}
            className="w-full py-2 px-3 rounded-lg bg-bg-input border border-border text-text-primary text-sm outline-none"
          >
            <option value="">None</option>
            {availableLists.map((l) => (
              <option key={l.id} value={l.id}>
                {listOptionLabel(l, profile.id)}
              </option>
            ))}
          </select>
        </div>
        <div className="px-4 py-3">
          <label className="text-xs text-text-muted block mb-1">Pinned List 2</label>
          <select
            value={pinnedList2 || ""}
            onChange={(e) => {
              const prev = pinnedList2;
              const next = e.target.value || null;
              setPinnedList2(next);
              autoSave({ pinned_list_2_id: next }, () => setPinnedList2(prev));
            }}
            className="w-full py-2 px-3 rounded-lg bg-bg-input border border-border text-text-primary text-sm outline-none"
          >
            <option value="">None</option>
            {availableLists.map((l) => (
              <option key={l.id} value={l.id}>
                {listOptionLabel(l, profile.id)}
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
            onClick={() => {
              const prev = isPrivate;
              setIsPrivate(!isPrivate);
              autoSave({ is_private: !isPrivate }, () => setIsPrivate(prev));
            }}
            role="switch"
            aria-checked={isPrivate}
            aria-label="Private profile"
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
            onChange={(e) => {
              const prev = defaultPrivacy;
              const next = e.target.value;
              setDefaultPrivacy(next);
              autoSave({ default_privacy: next }, () => setDefaultPrivacy(prev));
            }}
            className="w-full py-2 px-3 rounded-lg bg-bg-input border border-border text-text-primary text-sm outline-none"
          >
            <option value="show_all">Public — show everything</option>
            <option value="hide_personal">Semi-private — hide notes, rating, seat</option>
            <option value="hide_all">Private — hidden from everyone</option>
          </select>
        </div>
        <SettingRow label="Allow Comments">
          <button
            onClick={() => {
              const prev = commentsEnabled;
              setCommentsEnabled(!commentsEnabled);
              autoSave({ comments_enabled: !commentsEnabled }, () => setCommentsEnabled(prev));
            }}
            role="switch"
            aria-checked={commentsEnabled}
            aria-label="Allow comments"
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

      {/* Floating save status (autosave) */}
      <div
        className={`fixed top-16 right-4 z-50 px-3 py-1.5 rounded-full text-xs font-medium transition-opacity duration-300 pointer-events-none ${
          saving || saved ? "opacity-100" : "opacity-0"
        } ${saved ? "bg-win/15 text-win border border-win/40" : "bg-bg-elevated text-text-secondary border border-border"}`}
      >
        {saved ? "Saved ✓" : "Saving..."}
      </div>

      {/* Push notifications (native only) */}
      <NotificationSettings userId={profile.id} />

      {/* Account */}
      <SectionHeader>Account</SectionHeader>
      <div className="bg-bg-card border-y border-border">
        <SettingRow label="Email">
          <span className="text-sm text-text-muted">{userEmail}</span>
        </SettingRow>
        <UsernameEditor userId={profile.id} currentUsername={profile.username} />
        <AccountSecurity />
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
            To change your email address, contact support.
          </p>
        </div>
      </div>
    </div>
  );
}
