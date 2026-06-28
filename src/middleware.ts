import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - metadata routes that must stay public for crawlers/unfurlers
     *   (robots, sitemap, manifest, default OG image)
     * - public files (svg, png, jpg, etc.), incl. static .json like
     *   venues-geo.json (fetched on-device by the photo scan — gating it would
     *   redirect the fetch to an HTML page and break JSON.parse).
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|opengraph-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json)$).*)",
  ],
};
