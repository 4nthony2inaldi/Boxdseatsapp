import { createClient } from "@/lib/supabase/server";
import {
  fetchAllLists,
  fetchWantToVisitCount,
  fetchUserLists,
  fetchFollowedLists,
} from "@/lib/queries/lists";
import Link from "next/link";
import SectionLabel from "@/components/profile/SectionLabel";

export default async function ListsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto text-center">
        <p className="text-text-muted">Please log in to view lists.</p>
      </div>
    );
  }

  const [systemLists, userLists, followedLists, wantToVisitCount] =
    await Promise.all([
      fetchAllLists(supabase, user.id),
      fetchUserLists(supabase, user.id),
      fetchFollowedLists(supabase, user.id),
      fetchWantToVisitCount(supabase, user.id),
    ]);

  return (
    <div className="px-4 py-8 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-display text-2xl tracking-wider text-text-primary">
          LISTS
        </h1>
        <Link
          href="/lists/create"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-display tracking-wider uppercase hover:opacity-90 transition-opacity"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create
        </Link>
      </div>
      <p className="text-text-secondary text-sm mb-6">
        Track your progress on stadium challenges and custom lists.
      </p>

      {/* Want to Visit */}
      {wantToVisitCount > 0 && (
        <div className="mb-6">
          <Link href="/lists/want-to-visit" className="block">
            <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 flex items-center gap-4 cursor-pointer hover:border-accent transition-colors">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-accent shrink-0"
              >
                <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
              <div className="flex-1 min-w-0">
                <div className="font-display text-sm tracking-wider text-text-primary">
                  Want to Visit
                </div>
                <div className="text-text-muted text-xs mt-0.5">
                  Venues on your bucket list
                </div>
              </div>
              <div className="font-display text-lg text-accent tracking-wide">
                {wantToVisitCount}
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* My Lists */}
      {userLists.length > 0 && (
        <div className="mb-6">
          <SectionLabel>My Lists</SectionLabel>
          <div className="space-y-4">
            {userLists.map((list) => (
              <ListCard key={list.id} list={list} />
            ))}
          </div>
        </div>
      )}

      {/* Following */}
      {followedLists.length > 0 && (
        <div className="mb-6">
          <SectionLabel>Following</SectionLabel>
          <div className="space-y-4">
            {followedLists.map((list) => (
              <ListCard
                key={list.id}
                list={list}
                subtitle={
                  list.creator_display_name || list.creator_username
                    ? `by ${list.creator_display_name || list.creator_username}`
                    : undefined
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Challenges */}
      {systemLists.length > 0 && (
        <div className="mb-6">
          <SectionLabel>Challenges</SectionLabel>
          <div className="space-y-4">
            {systemLists.map((list) => (
              <ListCard key={list.id} list={list} showIcon />
            ))}
          </div>
        </div>
      )}

      {/* Empty state — only if no lists at all */}
      {systemLists.length === 0 &&
        userLists.length === 0 &&
        followedLists.length === 0 && (
          <div className="rounded-xl border border-border bg-bg-card p-8 text-center">
            <div className="text-4xl mb-3">📋</div>
            <div className="font-display text-lg text-text-primary tracking-wide mb-2">
              No Lists Yet
            </div>
            <p className="text-text-muted text-sm mb-4">
              Create your own venue checklist or explore challenges.
            </p>
            <Link
              href="/lists/create"
              className="inline-block px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{
                background:
                  "linear-gradient(135deg, var(--color-accent), var(--color-accent-brown))",
              }}
            >
              Create a List
            </Link>
          </div>
        )}
    </div>
  );
}

// ── Reusable list card ──

function ListCard({
  list,
  subtitle,
  showIcon,
}: {
  list: {
    id: string;
    name: string;
    description: string | null;
    icon: string;
    item_count: number;
    visited: number;
  };
  subtitle?: string;
  showIcon?: boolean;
}) {
  const pct =
    list.item_count > 0
      ? Math.round((list.visited / list.item_count) * 100)
      : 0;

  return (
    <Link href={`/lists/${list.id}`} className="block">
      <div className="rounded-xl border border-border bg-bg-card p-4 flex items-center gap-4 cursor-pointer hover:border-accent transition-colors">
        {showIcon && <span className="text-2xl">{list.icon}</span>}
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
