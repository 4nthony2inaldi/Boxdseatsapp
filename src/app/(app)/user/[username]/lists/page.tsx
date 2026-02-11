import { createClient } from "@/lib/supabase/server";
import { fetchUserProfileByUsername, checkBlocked } from "@/lib/queries/social";
import { fetchUserLists } from "@/lib/queries/lists";
import Link from "next/link";
import { getSportIconPath } from "@/lib/sportIcons";
import SportIcon from "@/components/SportIcon";

type Props = {
  params: Promise<{ username: string }>;
};

export default async function UserListsPage({ params }: Props) {
  const { username } = await params;
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

  const profile = await fetchUserProfileByUsername(supabase, username);

  if (!profile) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto text-center">
        <p className="text-text-muted">User not found.</p>
      </div>
    );
  }

  const isBlocked = await checkBlocked(supabase, user.id, profile.id);
  if (isBlocked) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto text-center">
        <p className="text-text-muted">This profile is not available.</p>
      </div>
    );
  }

  const lists = await fetchUserLists(supabase, profile.id);

  return (
    <div className="max-w-lg mx-auto pb-5">
      {/* Back header */}
      <div className="flex items-center gap-3 px-4 mt-4 mb-4">
        <Link
          href={`/user/${username}`}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-bg-elevated"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#F0EBE0"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div>
          <h1 className="font-display text-2xl text-text-primary tracking-wide leading-tight">
            {profile.display_name || profile.username}&apos;s Lists
          </h1>
          <span className="text-text-secondary text-sm">
            {lists.length} {lists.length === 1 ? "list" : "lists"}
          </span>
        </div>
      </div>

      <div className="px-4">
        {lists.length > 0 ? (
          <div className="space-y-2">
            {lists.map((list) => {
              const pct =
                list.item_count > 0
                  ? Math.round((list.visited / list.item_count) * 100)
                  : 0;
              return (
                <Link key={list.id} href={`/lists/${list.id}`}>
                  <div className="rounded-xl border border-border bg-bg-card px-4 py-3 hover:border-accent transition-colors">
                    <div className="flex items-center gap-3">
                      <SportIcon
                        sport={list.sport}
                        src={getSportIconPath(list.sport)}
                        size={20}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-text-primary truncate">
                          {list.name}
                        </div>
                        <div className="text-xs text-text-muted mt-0.5">
                          {list.visited} of {list.item_count} · {pct}%
                        </div>
                      </div>
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
                    </div>
                    {/* Progress bar */}
                    <div className="mt-2 h-1 rounded-full bg-bg-input overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background:
                            "linear-gradient(90deg, var(--color-accent), var(--color-accent-hover))",
                        }}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-bg-card p-8 text-center">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#5A5F72"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto mb-3"
            >
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            </svg>
            <div className="font-display text-lg text-text-primary tracking-wide mb-2">
              No Lists Yet
            </div>
            <p className="text-text-muted text-sm">
              This user hasn&apos;t created any lists yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
