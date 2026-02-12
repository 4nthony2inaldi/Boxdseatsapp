"use client";

import { useState } from "react";
import ListItemCheckbox from "./ListItemCheckbox";
import { SkeletonListItem } from "@/components/Skeleton";
import type { ListVenueItem } from "@/lib/queries/lists";

type Props = {
  items: ListVenueItem[];
  totalCount: number;
  userId: string;
  visited: boolean;
};

const INITIAL_SHOW = 10;

export default function ListItemsSection({ items, totalCount, userId, visited }: Props) {
  const [showAll, setShowAll] = useState(items.length <= INITIAL_SHOW);
  const [expanding, setExpanding] = useState(false);

  const visibleItems = showAll ? items : items.slice(0, INITIAL_SHOW);
  const hiddenCount = items.length - INITIAL_SHOW;

  const handleShowAll = () => {
    setExpanding(true);
    // Brief delay for skeleton flash
    requestAnimationFrame(() => {
      setShowAll(true);
      setExpanding(false);
    });
  };

  return (
    <div className="space-y-2">
      {visibleItems.map((item) => (
        <ListItemCheckbox
          key={item.id}
          item={item}
          initialVisited={visited}
          userId={userId}
        />
      ))}

      {/* Show more button */}
      {!showAll && hiddenCount > 0 && !expanding && (
        <button
          onClick={handleShowAll}
          className="w-full text-center py-3 cursor-pointer bg-transparent border-none"
        >
          <span className="text-xs text-accent font-display tracking-wider hover:opacity-80 transition-opacity">
            Show all {totalCount} items
          </span>
        </button>
      )}

      {/* Loading skeleton while expanding */}
      {expanding && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <SkeletonListItem key={`skel-${i}`} />
          ))}
        </div>
      )}
    </div>
  );
}
