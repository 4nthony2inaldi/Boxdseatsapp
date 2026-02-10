import { createClient } from "@/lib/supabase/server";
import CreateListForm from "@/components/lists/CreateListForm";

export default async function CreateListPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto text-center">
        <p className="text-text-muted">Please log in to create a list.</p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-8 max-w-lg mx-auto">
      <div className="mt-4 mb-6">
        <h1 className="font-display text-2xl text-text-primary tracking-wide">
          Create List
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          Build a custom venue checklist to track your progress.
        </p>
      </div>
      <CreateListForm userId={user.id} />
    </div>
  );
}
