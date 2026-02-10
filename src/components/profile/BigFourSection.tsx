import type { BigFourItem } from "@/lib/queries/profile";
import SectionLabel from "./SectionLabel";
import BigFourCard from "./BigFourCard";

type BigFourSectionProps = {
  items: BigFourItem[];
};

export default function BigFourSection({ items }: BigFourSectionProps) {
  return (
    <div className="px-4 mb-5">
      <SectionLabel>The Big Four</SectionLabel>
      <div className="flex gap-2">
        {items.map((item) => (
          <BigFourCard key={item.category} item={item} />
        ))}
      </div>
    </div>
  );
}
