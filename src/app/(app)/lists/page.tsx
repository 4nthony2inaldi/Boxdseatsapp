import { createClient } from "@/lib/supabase/server";
import { ButtonLink } from "@/components/Button";
import {
  fetchAllLists,
  fetchWantToVisitCount,
  fetchUserLists,
  fetchFollowedLists,
} from "@/lib/queries/lists";
import Link from "next/link";
import SectionLabel from "@/components/profile/SectionLabel";
import ListCard from "@/components/lists/ListCard";
import ListsBrowser from "@/components/lists/ListsBrowser";
import { ListIcon } from "@/components/icons";

export default async function ListsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const showOnlyCreated = filter === "created";
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
        {showOnlyCreated
          ? "Lists you've created."
          : "Track your progress on stadium challenges and custom lists."}
      </p>

      {showOnlyCreated && (
        <div className="mb-4">
          <Link
            href="/lists"
            className="text-xs text-accent hover:underline"
          >
            ← Show all lists
          </Link>
        </div>
      )}

      {/* My Lists (created-only view) */}
      {showOnlyCreated && (
        <div className="mb-6">
          <SectionLabel>My Lists</SectionLabel>
          {userLists.length > 0 ? (
            <div className="space-y-4">
              {userLists.map((list) => (
                <ListCard key={list.id} list={list} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-bg-card p-8 text-center">
              <div className="mb-3 flex justify-center text-text-muted">
                <ListIcon size={40} />
              </div>
              <div className="font-display text-lg text-text-primary tracking-wide mb-2">
                No Lists Created Yet
              </div>
              <p className="text-text-muted text-sm mb-4">
                Create your own venue checklist to track your goals.
              </p>
              <ButtonLink href="/lists/create" size="md">Create a List</ButtonLink>
            </div>
          )}
        </div>
      )}

      {/* Want to Visit */}
      {!showOnlyCreated && wantToVisitCount > 0 && (
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

      {/* Browsable lists: search + My Lists, Following, and sport accordions */}
      {!showOnlyCreated &&
        (systemLists.length > 0 ||
          userLists.length > 0 ||
          followedLists.length > 0) && (
          <ListsBrowser
            userLists={userLists}
            followedLists={followedLists}
            systemLists={systemLists}
          />
        )}

      {/* Empty state — only if no lists at all */}
      {!showOnlyCreated &&
        systemLists.length === 0 &&
        userLists.length === 0 &&
        followedLists.length === 0 && (
          <div className="rounded-xl border border-border bg-bg-card p-8 text-center">
            <div className="mb-3 flex justify-center text-text-muted">
              <ListIcon size={40} />
            </div>
            <div className="font-display text-lg text-text-primary tracking-wide mb-2">
              No Lists Yet
            </div>
            <p className="text-text-muted text-sm mb-4">
              Create your own venue checklist or explore challenges.
            </p>
            <ButtonLink href="/lists/create" size="md">Create a List</ButtonLink>
          </div>
        )}
    </div>
  );
}
