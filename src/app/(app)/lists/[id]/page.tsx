import { createClient } from "@/lib/supabase/server";
import { fetchListDetail, fetchListItems } from "@/lib/queries/lists";
import Link from "next/link";
import SectionLabel from "@/components/profile/SectionLabel";

export default async function ListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto text-center">
        <p className="text-text-muted">Please log in to view list details.</p>
      </div>
    );
  }

  const list = await fetchListDetail(supabase, id);
  if (!list) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto text-center">
        <p className="text-text-muted">List not found.</p>
      </div>
    );
  }

  const items = await fetchListItems(supabase, id, user.id, list.list_type);

  const visitedItems = items.filter((i) => i.visited);
  const remainingItems = items.filter((i) => !i.visited);
  const totalItems = list.item_count || items.length;
  const visitedCount = visitedItems.length;
  const pct = totalItems > 0 ? Math.round((visitedCount / totalItems) * 100) : 0;

  // Show first 8 remaining, then "+ X more"
  const remainingVisible = remainingItems.slice(0, 8);
  const remainingHidden = remainingItems.length - remainingVisible.length;

  return (
    <div className="px-4 pb-8 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mt-4 mb-1">
        <span className="text-3xl">{list.icon}</span>
        <div>
          <h1 className="font-display text-2xl text-text-primary tracking-wide leading-tight">
            {list.name}
          </h1>
          {list.sport && (
            <span className="font-display text-[10px] text-text-muted tracking-[1.5px] uppercase">
              {list.sport} · {list.list_type}
            </span>
          )}
        </div>
      </div>

      {/* Description card */}
      {list.description && (
        <div className="bg-bg-card rounded-xl border border-border p-4 mt-4 mb-5">
          <p className="text-sm text-text-secondary leading-relaxed">
            {list.description}
          </p>
        </div>
      )}

      {/* Progress card */}
      <div className="bg-bg-card rounded-xl border border-border p-5 mb-6">
        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="font-display text-4xl text-accent tracking-wide">
              {pct}%
            </div>
            <div className="text-sm text-text-secondary mt-0.5">
              {visitedCount} of {totalItems}
            </div>
          </div>
          {visitedCount === totalItems && totalItems > 0 && (
            <div className="font-display text-xs text-win tracking-wider uppercase">
              Complete!
            </div>
          )}
        </div>
        <div className="w-full h-3 rounded-full bg-bg-elevated overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent to-accent-hover transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Visited */}
      {visitedItems.length > 0 && (
        <div className="mb-6">
          <SectionLabel>Visited ({visitedItems.length})</SectionLabel>
          <div className="space-y-2">
            {visitedItems.map((item) => (
              <ListItemRow
                key={item.id}
                item={item}
                visited={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* Remaining */}
      {remainingItems.length > 0 && (
        <div className="mb-6">
          <SectionLabel>Remaining ({remainingItems.length})</SectionLabel>
          <div className="space-y-2">
            {remainingVisible.map((item) => (
              <ListItemRow
                key={item.id}
                item={item}
                visited={false}
              />
            ))}
            {remainingHidden > 0 && (
              <div className="text-center py-3">
                <span className="text-xs text-text-muted font-display tracking-wider">
                  + {remainingHidden} more
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── List item row ──

function ListItemRow({
  item,
  visited,
}: {
  item: { id: string; venue_id: string | null; display_name: string };
  visited: boolean;
}) {
  const content = (
    <div
      className={`rounded-xl border px-4 py-3 flex items-center gap-3 transition-colors ${
        visited
          ? "bg-bg-card border-border"
          : "bg-bg-card/50 border-border/50"
      }`}
    >
      {/* Check / empty box */}
      <div
        className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
          visited
            ? "bg-win/20 text-win"
            : "border border-border"
        }`}
      >
        {visited && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>

      <span
        className={`text-sm flex-1 ${
          visited ? "text-text-primary" : "text-text-muted"
        }`}
      >
        {item.display_name}
      </span>

      {visited && item.venue_id && (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#5A5F72"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      )}
    </div>
  );

  if (visited && item.venue_id) {
    return <Link href={`/venue/${item.venue_id}`}>{content}</Link>;
  }

  return content;
}
