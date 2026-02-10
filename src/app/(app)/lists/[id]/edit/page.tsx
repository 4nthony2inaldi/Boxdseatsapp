import { createClient } from "@/lib/supabase/server";
import { fetchListDetail, fetchListItems } from "@/lib/queries/lists";
import EditListForm from "@/components/lists/EditListForm";
import { redirect } from "next/navigation";

export default async function EditListPage({
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
        <p className="text-text-muted">Please log in.</p>
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

  // Only the creator can edit
  if (list.created_by !== user.id || list.source !== "user") {
    redirect(`/lists/${id}`);
  }

  const items = await fetchListItems(supabase, id, user.id, list.list_type);

  return (
    <div className="px-4 pb-8 max-w-lg mx-auto">
      <div className="mt-4 mb-6">
        <h1 className="font-display text-2xl text-text-primary tracking-wide">
          Edit List
        </h1>
      </div>
      <EditListForm
        listId={id}
        userId={user.id}
        initialName={list.name}
        initialDescription={list.description || ""}
        initialItems={items.map((i) => ({
          id: i.id,
          venue_id: i.venue_id,
          display_name: i.display_name,
        }))}
      />
    </div>
  );
}
