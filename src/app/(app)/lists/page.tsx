import { createClient } from "@/lib/supabase/server";
import { fetchAllLists } from "@/lib/queries/lists";
import Link from "next/link";

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

  const lists = await fetchAllLists(supabase, user.id);

  return (
    <div className="px-4 py-8 max-w-lg mx-auto">
      <h1 className="font-display text-2xl tracking-wider text-text-primary mb-2">
        LISTS
      </h1>
      <p className="text-text-secondary text-sm">
        Track your progress on stadium challenges and custom lists.
      </p>
      <div className="mt-6 space-y-3">
        {lists.map((list) => {
          const pct =
            list.item_count > 0
              ? Math.round((list.visited / list.item_count) * 100)
              : 0;

          return (
            <Link key={list.id} href={`/lists/${list.id}`}>
              <div className="rounded-xl border border-border bg-bg-card p-4 flex items-center gap-4 cursor-pointer hover:border-accent transition-colors mb-0">
                <span className="text-2xl">{list.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-sm tracking-wider text-text-primary">
                    {list.name}
                  </div>
                  {list.description && (
                    <div className="text-text-muted text-xs mt-0.5 line-clamp-2">
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
        })}

        {lists.length === 0 && (
          <div className="rounded-xl border border-border bg-bg-card p-8 text-center">
            <div className="text-4xl mb-3">📋</div>
            <div className="font-display text-lg text-text-primary tracking-wide mb-2">
              No Lists Yet
            </div>
            <p className="text-text-muted text-sm">
              Lists will appear here once system lists or custom lists are available. Start logging events to track your progress.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
