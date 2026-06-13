import Link from "next/link";
import SportIcon from "@/components/SportIcon";

export type ListCardData = {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  item_count: number;
  visited: number;
};

export default function ListCard({
  list,
  subtitle,
  showIcon,
}: {
  list: ListCardData;
  subtitle?: string;
  showIcon?: boolean;
}) {
  const pct =
    list.item_count > 0
      ? Math.round((list.visited / list.item_count) * 100)
      : 0;

  return (
    <Link href={`/lists/${list.id}`} className="block">
      <div className="rounded-xl border border-border bg-bg-card p-4 flex items-center gap-4 cursor-pointer hover:border-accent active:scale-[0.99] transition-[transform,border-color]">
        {showIcon && list.icon && <SportIcon src={list.icon} size={28} />}
        <div className="flex-1 min-w-0">
          <div className="font-display text-sm tracking-wider text-text-primary">
            {list.name}
          </div>
          {subtitle && (
            <div className="text-text-muted text-xs mt-0.5">{subtitle}</div>
          )}
          {!subtitle && list.description && (
            <div className="text-text-muted text-xs mt-0.5 line-clamp-1">
              {list.description}
            </div>
          )}
          <div className="text-text-secondary text-xs mt-1">
            {list.visited} of {list.item_count}
          </div>
        </div>
        <div className="w-16 shrink-0">
          <div className="text-right text-[11px] text-text-muted font-display mb-1">
            {pct}%
          </div>
          <div className="w-full h-1.5 rounded-full bg-bg-elevated overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-accent-hover transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
