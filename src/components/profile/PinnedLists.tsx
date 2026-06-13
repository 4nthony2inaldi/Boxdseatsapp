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
};

export default function PinnedLists({ lists, compareUserId }: PinnedListsProps) {
  if (lists.length === 0) return null;

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
