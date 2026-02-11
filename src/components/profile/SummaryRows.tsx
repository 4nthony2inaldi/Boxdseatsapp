import type { ProfileSummaryCounts } from "@/lib/queries/profile";
import SectionLabel from "./SectionLabel";
import SummaryRow from "./SummaryRow";

type SummaryRowsProps = {
  counts: ProfileSummaryCounts;
  /** Base path prefix for links — "" for own profile, "/user/[username]" for other users */
  basePath?: string;
};

export default function SummaryRows({
  counts,
  basePath = "",
}: SummaryRowsProps) {
  return (
    <div className="px-4 mt-1">
      <SectionLabel>Summary</SectionLabel>
      <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
        <SummaryRow
          label="Visited Venues"
          total={counts.totalVenues}
          thisYear={counts.venuesThisYear}
          href={basePath ? `${basePath}/venues` : "/venues"}
        />
        <SummaryRow
          label="Logged Events"
          total={counts.totalEvents}
          thisYear={counts.eventsThisYear}
          href={basePath ? `${basePath}/timeline` : "/timeline"}
        />
        <SummaryRow
          label="Created Lists"
          total={counts.createdLists}
          href={basePath ? `${basePath}/lists` : "/lists?filter=created"}
        />
        <SummaryRow
          label="Want to Visit"
          total={counts.wantToVisit}
          href="/lists/want-to-visit"
        />
      </div>
    </div>
  );
}
