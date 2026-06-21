import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Public routes that don't require auth
  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/signup") ||
    request.nextUrl.pathname.startsWith("/auth") ||
    request.nextUrl.pathname.startsWith("/reset-password");

  const isOnboardingRoute = request.nextUrl.pathname.startsWith("/onboarding");

  // Public sharing routes — accessible to logged-out visitors
  const isPublicRoute =
    request.nextUrl.pathname.startsWith("/@") ||
    request.nextUrl.pathname.startsWith("/u/") ||
    request.nextUrl.pathname.startsWith("/e/") ||
    // Legal pages must be reachable logged-out (App Store review, web links).
    request.nextUrl.pathname === "/privacy" ||
    request.nextUrl.pathname === "/terms" ||
    // API routes authenticate themselves (session check or bearer secret);
    // redirecting them to /login breaks Vercel Cron and JSON clients.
    request.nextUrl.pathname.startsWith("/api/");

  // Rewrite /@username → /u/username (filesystem can't use @ prefix)
  if (request.nextUrl.pathname.startsWith("/@")) {
    const rest = request.nextUrl.pathname.slice(2); // remove "/@"
    const url = request.nextUrl.clone();
    url.pathname = `/u/${rest}`;
    return NextResponse.rewrite(url);
  }

  // Auth/onboarding redirects must never be cached: they depend on the
  // session, so a shared/edge cache could otherwise serve one user's redirect
  // to another (Next defaults these to a cacheable `public, max-age=0`).
  const redirectTo = (pathname: string) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    const res = NextResponse.redirect(url);
    res.headers.set("Cache-Control", "no-store");
    return res;
  };

  // If not logged in and trying to access protected route, redirect to login
  if (!user && !isAuthRoute && !isPublicRoute) {
    return redirectTo("/login");
  }

  // If logged in and trying to access auth routes, redirect to app.
  // /reset-password stays reachable: recovery links create a session first.
  if (
    user &&
    isAuthRoute &&
    !request.nextUrl.pathname.startsWith("/reset-password") &&
    !request.nextUrl.pathname.startsWith("/auth")
  ) {
    return redirectTo("/");
  }

  // If logged in and NOT on onboarding, check if onboarding is needed
  if (user && !isOnboardingRoute && !isAuthRoute) {
    const needsOnboarding = !user.user_metadata?.onboarding_completed;
    if (needsOnboarding) {
      // Check profile for fav_sport as secondary indicator
      const { data: profile } = await supabase
        .from("profiles")
        .select("fav_sport")
        .eq("id", user.id)
        .single();

      if (profile && !profile.fav_sport) {
        return redirectTo("/onboarding");
      }
    }
  }

  return supabaseResponse;
}
