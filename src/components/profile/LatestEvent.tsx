import Link from "next/link";
import type { TimelineEntry } from "@/lib/queries/profile";
import SectionLabel from "./SectionLabel";
import TimelineCard from "../TimelineCard";

type LatestEventProps = {
  entry: TimelineEntry | null;
  timelineHref?: string;
};

export default function LatestEvent({
  entry,
  timelineHref = "/timeline",
}: LatestEventProps) {
  if (!entry) return null;

  return (
    <div className="px-4">
      <div className="flex items-center justify-between mb-2.5">
        <SectionLabel>Latest Event</SectionLabel>
        <Link
          href={timelineHref}
          className="text-[11px] text-accent font-display tracking-[1px] uppercase hover:opacity-80 transition-opacity"
        >
          See All
        </Link>
      </div>
      <TimelineCard entry={entry} />
    </div>
  );
}
