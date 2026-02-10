import type { ActivityMonth } from "@/lib/queries/profile";
import SectionLabel from "./SectionLabel";

type ActivityChartProps = {
  months: ActivityMonth[];
  total: number;
};

export default function ActivityChart({ months, total }: ActivityChartProps) {
  const max = Math.max(...months.map((m) => m.count), 1);

  return (
    <div className="px-4 mb-5">
      <div className="flex justify-between items-center mb-2.5">
        <SectionLabel>Activity</SectionLabel>
        <div className="text-[11px] text-text-secondary">
          {total} events · past 12 mo
        </div>
      </div>
      <div className="bg-bg-card rounded-xl border border-border px-3 pt-3.5 pb-2">
        <div className="flex items-end gap-1 h-20">
          {months.map((m, i) => {
            const isCurrentMonth = i === months.length - 1;
            const barHeight =
              m.count > 0 ? `${(m.count / max) * 50}px` : "4px";

            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <div className="text-[9px] text-text-muted font-display">
                  {m.count > 0 ? m.count : ""}
                </div>
                <div
                  className="w-full rounded-sm min-h-1"
                  style={{
                    height: barHeight,
                    background: isCurrentMonth
                      ? "var(--color-accent)"
                      : "linear-gradient(180deg, rgba(212, 135, 44, 0.53), rgba(123, 91, 58, 0.53))",
                  }}
                />
                <div className="text-[8px] text-text-muted font-display tracking-wider">
                  {m.month}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
