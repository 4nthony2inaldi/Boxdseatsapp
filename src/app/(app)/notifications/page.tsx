import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  fetchNotifications,
  markNotificationsRead,
} from "@/lib/queries/notifications";
import NotificationList from "@/components/notifications/NotificationList";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const notifications = await fetchNotifications(supabase, user.id);

  // Mark all unread notifications as read on view
  const unreadIds = notifications
    .filter((n) => !n.is_read)
    .map((n) => n.id);

  if (unreadIds.length > 0) {
    await markNotificationsRead(supabase, user.id, unreadIds);
  }

  return (
    <div className="max-w-lg mx-auto pb-5">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <Link href="/" className="p-1 hover:opacity-80 transition-opacity">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <h1 className="font-display text-lg text-text-primary tracking-wide">
          Notifications
        </h1>
      </div>
      <NotificationList notifications={notifications} />
    </div>
  );
}
