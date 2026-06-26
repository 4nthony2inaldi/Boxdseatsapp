import Link from "next/link";
import type { BigFourItem } from "@/lib/queries/profile";
import SectionLabel from "./SectionLabel";
import BigFourCard from "./BigFourCard";

type BigFourSectionProps = {
  items: BigFourItem[];
  linkable?: boolean;
  /** Base path for the per-category drill-in (no trailing slash). */
  hrefBase?: string;
  /** The viewer is the profile owner (own /profile). Visitors default to false. */
  isOwner?: boolean;
};

export default function BigFourSection({
  items,
  linkable = true,
  hrefBase = "/profile/favorites",
  isOwner = false,
}: BigFourSectionProps) {
  // For visitors, a completely-unset Big Four reads as a broken profile, so
  // hide the section. Owners always see it (empty slots become "add" prompts).
  if (!isOwner && !items.some((i) => !i.empty)) return null;

  return (
    <div className="px-4 mb-5">
      <SectionLabel>The Big Four</SectionLabel>
      <div className="flex gap-2">
        {items.map((item) => {
          // Link filled cards as before; for owners, an empty slot links into
          // the picker to set it. A visitor's empty slot is inert.
          const shouldLink = linkable && (!item.empty || isOwner);
          return shouldLink ? (
            <Link
              key={item.category}
              href={`${hrefBase}/${item.category}`}
              className="flex-1 min-w-0"
            >
              <BigFourCard item={item} isOwner={isOwner} />
            </Link>
          ) : (
            <BigFourCard key={item.category} item={item} isOwner={isOwner} />
          );
        })}
      </div>
    </div>
  );
}
