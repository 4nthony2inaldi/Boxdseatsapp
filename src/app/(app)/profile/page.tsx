import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="px-4 py-8 max-w-lg mx-auto">
      <h1 className="font-display text-2xl tracking-wider text-text-primary mb-2">PROFILE</h1>
      <div className="mt-4 rounded-xl border border-border bg-bg-card p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-bg-elevated border-2 border-border flex items-center justify-center">
            <span className="font-display text-2xl text-accent">
              {user?.email?.charAt(0).toUpperCase() || "?"}
            </span>
          </div>
          <div>
            <div className="font-display text-lg tracking-wider text-text-primary">
              {user?.user_metadata?.username || "User"}
            </div>
            <div className="text-text-muted text-sm">{user?.email}</div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 pt-4 border-t border-border">
          {[
            { num: "0", label: "Events" },
            { num: "0", label: "Venues" },
            { num: "0", label: "Following" },
            { num: "0", label: "Followers" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="font-display text-xl text-text-primary">{stat.num}</div>
              <div className="text-[10px] text-text-muted uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-bg-card p-6 text-center">
        <p className="text-text-muted text-sm">Your timeline will appear here once you start logging events.</p>
      </div>
    </div>
  );
}
