import Link from "next/link";
import type { PinnedListData } from "@/lib/queries/profile";
import SportIcon from "@/components/SportIcon";
import SectionLabel from "./SectionLabel";

type PinnedListsProps = {
  lists: PinnedListData[];
  /**
   * When viewing another user's profile, their id. Pinned lists then link to
   * a comparison view (their progress vs. yours) instead of the plain list.
   */
  compareUserId?: string;
  /**
   * True only on the signed-in user's own profile. When their pinned-list set
   * is empty we show a CTA inviting them to start a list, instead of a blank
   * gap. On other users' profiles we still render nothing.
   */
  isOwner?: boolean;
};

export default function PinnedLists({ lists, compareUserId, isOwner = false }: PinnedListsProps) {
  if (lists.length === 0) {
    if (!isOwner) return null;
    return (
      <div className="px-4 mb-5">
        <SectionLabel>Pinned Lists</SectionLabel>
        <div className="rounded-xl border border-border bg-bg-card p-6 text-center">
          <div className="font-display text-base text-text-primary tracking-wide mb-1">
            No Pinned Lists Yet
          </div>
          <p className="text-text-muted text-sm mb-4">
            Pin a list to track your progress right here on your profile.
          </p>
          <Link
            href="/lists"
            className="inline-block px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{
              background:
                "linear-gradient(135deg, var(--color-accent), var(--color-accent-brown))",
            }}
          >
            Browse Lists
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 mb-5">
      <SectionLabel>Pinned Lists</SectionLabel>
      {lists.map((list) => {
        const pct =
          list.item_count > 0
            ? Math.round((list.visited / list.item_count) * 100)
            : 0;
        const href = compareUserId
          ? `/lists/${list.id}?compare=${compareUserId}`
          : `/lists/${list.id}`;

        return (
          <Link
            key={list.id}
            href={href}
            className="block bg-bg-card rounded-xl border border-border px-3.5 py-3 mb-2 hover:border-accent/50 transition-colors"
          >
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                {list.icon && <SportIcon src={list.icon} size={20} />}
                <span className="text-[13px] text-text-primary font-medium">
                  {list.name}
                </span>
              </div>
              <div className="font-display text-sm text-accent tracking-wider">
                {list.visited}/{list.item_count}
              </div>
            </div>
            <div className="h-[5px] bg-bg-input rounded-sm overflow-hidden">
              <div
                className="h-full rounded-sm"
                style={{
                  width: `${pct}%`,
                  background:
                    "linear-gradient(90deg, var(--color-accent), var(--color-accent-hover))",
                }}
              />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
