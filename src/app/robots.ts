import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.boxdseats.com";

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/u/", "/e/"],
      disallow: [
        "/api/",
        "/auth/",
        "/login",
        "/signup",
        "/reset-password",
        "/onboarding",
        "/settings",
        "/notifications",
        "/profile",
        "/timeline",
        "/log",
        "/lists",
        "/explore",
        "/venues",
        "/admin",
        "/event/",
        "/venue/",
        "/team/",
        "/user/",
        "/*/og",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
