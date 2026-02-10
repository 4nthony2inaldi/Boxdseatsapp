import Link from "next/link";
import type { BigFourItem } from "@/lib/queries/profile";
import SectionLabel from "./SectionLabel";
import BigFourCard from "./BigFourCard";

type BigFourSectionProps = {
  items: BigFourItem[];
  linkable?: boolean;
};

export default function BigFourSection({ items, linkable = true }: BigFourSectionProps) {
  return (
    <div className="px-4 mb-5">
      <SectionLabel>The Big Four</SectionLabel>
      <div className="flex gap-2">
        {items.map((item) =>
          linkable ? (
            <Link
              key={item.category}
              href={`/profile/favorites/${item.category}`}
              className="flex-1 min-w-0"
            >
              <BigFourCard item={item} />
            </Link>
          ) : (
            <BigFourCard key={item.category} item={item} />
          )
        )}
      </div>
    </div>
  );
}
