import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.boxdseats.com";

  const supabase = await createClient();

  const entries: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/`,
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  // Public (non-private) profiles → /@username and /@username/passport
  const { data: profiles } = await supabase
    .from("profiles")
    .select("username, updated_at")
    .eq("is_private", false);

  for (const profile of profiles ?? []) {
    if (!profile.username) continue;
    const lastModified = profile.updated_at
      ? new Date(profile.updated_at)
      : undefined;
    entries.push({
      url: `${siteUrl}/@${profile.username}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    });
    entries.push({
      url: `${siteUrl}/@${profile.username}/passport`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  // Public event logs → /e/{id}. Public pages render anything that is
  // not "hide_all", so mirror that visibility filter here.
  const { data: eventLogs } = await supabase
    .from("event_logs")
    .select("id, updated_at")
    .neq("privacy", "hide_all");

  for (const log of eventLogs ?? []) {
    if (!log.id) continue;
    entries.push({
      url: `${siteUrl}/e/${log.id}`,
      lastModified: log.updated_at ? new Date(log.updated_at) : undefined,
      changeFrequency: "monthly",
      priority: 0.5,
    });
  }

  return entries;
}
