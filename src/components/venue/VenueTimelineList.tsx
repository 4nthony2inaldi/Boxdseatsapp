import Link from "next/link";
import TimelineCard, { type TimelineCardEntry } from "@/components/TimelineCard";
import type { VenueTimelineEntry } from "@/lib/queries/venue";

type Props = {
  entries: VenueTimelineEntry[];
};

export default function VenueTimelineList({ entries }: Props) {
  return (
    <div>
      {entries.map((entry) =>
        entry.event_id ? (
          <Link key={entry.id} href={`/event/${entry.event_id}`}>
            <TimelineCard entry={entry as TimelineCardEntry} />
          </Link>
        ) : (
          <div key={entry.id}>
            <TimelineCard entry={entry as TimelineCardEntry} />
          </div>
        )
      )}
    </div>
  );
}
