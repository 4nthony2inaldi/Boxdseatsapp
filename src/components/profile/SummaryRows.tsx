import Link from "next/link";
import type { ProfileSummaryCounts } from "@/lib/queries/profile";
import SectionLabel from "./SectionLabel";
import SummaryRow from "./SummaryRow";

type SummaryRowsProps = {
  counts: ProfileSummaryCounts;
  /** Base path prefix for links — "" for own profile, "/user/[username]" for other users */
  basePath?: string;
  /** Public Fan Passport link (e.g. /@username/passport). */
  passportHref?: string;
};

export default function SummaryRows({
  counts,
  basePath = "",
  passportHref,
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
          href={
            basePath ? `${basePath}/want-to-visit` : "/lists/want-to-visit"
          }
        />
        {passportHref && (
          <Link
            href={passportHref}
            className="flex items-center justify-between px-4 py-3 border-t border-border hover:bg-bg-elevated active:opacity-70 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm text-accent font-medium">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              Fan Passport
            </span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        )}
      </div>
    </div>
  );
}
