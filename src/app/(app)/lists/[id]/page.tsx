import { createClient } from "@/lib/supabase/server";
import { fetchListDetail, fetchListItems, checkListFollow } from "@/lib/queries/lists";
import Link from "next/link";
import SectionLabel from "@/components/profile/SectionLabel";
import ListActions from "@/components/lists/ListActions";
import ListItemsSection from "@/components/lists/ListItemsSection";
import SportIcon from "@/components/SportIcon";

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

  const [items, isFollowing] = await Promise.all([
    fetchListItems(supabase, id, user.id, list.list_type),
    checkListFollow(supabase, user.id, id),
  ]);

  const isOwner = list.created_by === user.id;

  const visitedItems = items.filter((i) => i.visited);
  const remainingItems = items.filter((i) => !i.visited);
  const totalItems = list.item_count || items.length;
  const visitedCount = visitedItems.length;
  const pct = totalItems > 0 ? Math.round((visitedCount / totalItems) * 100) : 0;

  return (
    <div className="px-4 pb-8 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mt-4 mb-1">
        {list.icon && <SportIcon src={list.icon} size={36} />}
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl text-text-primary tracking-wide leading-tight">
            {list.name}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            {list.source === "user" && list.creator_username && (
              <Link
                href={`/user/${list.creator_username}`}
                className="text-xs text-text-secondary hover:text-accent transition-colors"
              >
                by {list.creator_display_name || list.creator_username}
              </Link>
            )}
            {list.source === "user" && list.creator_username && list.sport && (
              <span className="text-text-muted text-xs">·</span>
            )}
            {list.sport && (
              <span className="font-display text-[10px] text-text-muted tracking-[1.5px] uppercase">
                {list.sport}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-3 mb-4">
        <ListActions
          listId={id}
          userId={user.id}
          isOwner={isOwner}
          isFollowing={isFollowing}
          source={list.source}
        />
      </div>

      {/* Description card */}
      {list.description && (
        <div className="bg-bg-card rounded-xl border border-border p-4 mb-5">
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
          <ListItemsSection
            items={visitedItems}
            totalCount={visitedItems.length}
            userId={user.id}
            visited={true}
          />
        </div>
      )}

      {/* Remaining */}
      {remainingItems.length > 0 && (
        <div className="mb-6">
          <SectionLabel>Remaining ({remainingItems.length})</SectionLabel>
          <ListItemsSection
            items={remainingItems}
            totalCount={remainingItems.length}
            userId={user.id}
            visited={false}
          />
        </div>
      )}
    </div>
  );
}
