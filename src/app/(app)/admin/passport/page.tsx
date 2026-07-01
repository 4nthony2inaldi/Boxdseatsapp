import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { redirect, notFound } from "next/navigation";
import { isAdmin } from "@/lib/queries/admin";
import { fetchGlobalPassport } from "@/lib/queries/adminPassport";
import GlobalPassportView from "@/components/admin/GlobalPassportView";

export const dynamic = "force-dynamic";

export default async function AdminPassportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Non-admins get a 404 — the route shouldn't be discoverable.
  if (!(await isAdmin(supabase, user.id))) notFound();

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto text-center">
        <p className="text-text-muted">Admin tools are not configured.</p>
      </div>
    );
  }
  const admin = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
  const data = await fetchGlobalPassport(admin);

  return <GlobalPassportView data={data} />;
}
