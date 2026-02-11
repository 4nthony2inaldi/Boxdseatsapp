import Link from "next/link";

type SummaryRowProps = {
  label: string;
  total: number;
  thisYear?: number;
  href: string;
};

export default function SummaryRow({
  label,
  total,
  thisYear,
  href,
}: SummaryRowProps) {
  return (
    <Link href={href} className="block">
      <div className="flex items-center justify-between py-3.5 px-4 border-b border-border hover:bg-bg-card/50 transition-colors">
        <span className="text-sm text-text-primary">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-secondary tabular-nums">
            {total}
            {thisYear !== undefined && (
              <span className="text-text-muted">
                {" "}
                / {thisYear} this year
              </span>
            )}
          </span>
          {/* Chevron */}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#5A5F72"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
