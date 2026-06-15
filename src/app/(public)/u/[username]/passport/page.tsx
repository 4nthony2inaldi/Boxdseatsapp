import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchPassport } from "@/lib/queries/passport";
import PassportView from "@/components/passport/PassportView";

type Props = { params: Promise<{ username: string }> };

const PROFILE_COLS =
  "id, username, display_name, bio, avatar_url, fav_sport, fav_team_id, fav_venue_id, fav_athlete_id, fav_event_id, pinned_list_1_id, pinned_list_2_id, is_private, passport_config";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("display_name, username").eq("username", username).maybeSingle();
  if (!profile) return { title: "Fan Passport" };
  const name = profile.display_name || `@${profile.username}`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://boxdseats.com";
  const ogUrl = `${siteUrl}/u/${username}/passport/og`;
  const description = `${name}'s games, venues, and bucket-list progress on BoxdSeats.`;
  return {
    title: `${name}'s Fan Passport | BoxdSeats`,
    description,
    openGraph: {
      title: `${name}'s Fan Passport | BoxdSeats`,
      description,
      url: `${siteUrl}/@${username}/passport`,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title: `${name}'s Fan Passport`, description, images: [ogUrl] },
  };
}

export default async function PassportPage({ params }: Props) {
  const { username } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select(PROFILE_COLS).eq("username", username).maybeSingle();
  if (!profile) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4 text-center">
        <div>
          <h1 className="font-display text-2xl text-text-primary mb-2">Passport not found</h1>
          <Link href="/" className="text-accent text-sm">Go home</Link>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === profile.id;

  // Private profiles: only the owner and active followers can view.
  if (profile.is_private && !isOwner) {
    let following = false;
    if (user) {
      const { data: rel } = await supabase
        .from("follows")
        .select("status")
        .eq("follower_id", user.id)
        .eq("following_id", profile.id)
        .maybeSingle();
      following = rel?.status === "active";
    }
    if (!following) {
      return (
        <div className="min-h-screen bg-bg flex items-center justify-center px-4 text-center">
          <p className="text-text-muted text-sm">This passport is private.</p>
        </div>
      );
    }
  }

  const data = await fetchPassport(supabase, profile);
  const backHref = isOwner ? "/profile" : `/u/${username}`;

  return (
    <div className="min-h-screen bg-bg">
      <PassportView
        username={profile.username}
        displayName={profile.display_name}
        avatarUrl={profile.avatar_url}
        data={data}
        editHref={isOwner ? "/profile/passport/edit" : undefined}
        backHref={backHref}
      />
    </div>
  );
}
