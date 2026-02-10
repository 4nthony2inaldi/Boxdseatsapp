"use client";

import Link from "next/link";
import TimelineCard, { type TimelineCardEntry } from "@/components/TimelineCard";
import type { VenueTimelineEntry } from "@/lib/queries/venue";

type Props = {
  entries: VenueTimelineEntry[];
};

export default function VenueTimelineList({ entries }: Props) {
  return (
    <div>
      {entries.map((entry) => (
        <Link key={entry.id} href={entry.event_id ? `/event/${entry.event_id}` : "#"}>
          <TimelineCard entry={entry as TimelineCardEntry} />
        </Link>
      ))}
    </div>
  );
}
