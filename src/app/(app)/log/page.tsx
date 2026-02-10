import { createClient } from "@/lib/supabase/server";
import LogFlow from "@/components/log/LogFlow";

export default async function LogPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto text-center">
        <p className="text-text-muted">Please log in to log events.</p>
      </div>
    );
  }

  return <LogFlow userId={user.id} />;
}
