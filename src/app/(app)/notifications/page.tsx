import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  fetchNotifications,
  markNotificationsRead,
} from "@/lib/queries/notifications";
import { fetchPendingRequesterIds } from "@/lib/queries/social";
import NotificationList from "@/components/notifications/NotificationList";
import PageHeader from "@/components/PageHeader";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [notifications, pendingRequesterIds] = await Promise.all([
    fetchNotifications(supabase, user.id),
    fetchPendingRequesterIds(supabase, user.id),
  ]);

  // Mark all unread notifications as read on view
  const unreadIds = notifications
    .filter((n) => !n.is_read)
    .map((n) => n.id);

  if (unreadIds.length > 0) {
    await markNotificationsRead(supabase, user.id, unreadIds);
  }

  return (
    <div className="max-w-lg mx-auto pb-5">
      <PageHeader title="Notifications" backHref="/" />
      <NotificationList
        notifications={notifications}
        currentUserId={user.id}
        pendingRequesterIds={pendingRequesterIds}
      />
    </div>
  );
}
