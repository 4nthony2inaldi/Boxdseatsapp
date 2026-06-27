import { NextResponse } from "next/server";

/**
 * Apple App Site Association (AASA).
 *
 * Lets the BoxdSeats iOS app claim Universal Links on www.boxdseats.com, so the
 * auth email links (/auth/confirm — password reset and signup confirmation) open
 * in the app when it's installed, and fall back to the browser otherwise.
 *
 * Served as JSON over HTTPS with no redirect, per Apple's requirements. This is
 * inert until an app build ships with the matching Associated Domains entitlement
 * (applinks:www.boxdseats.com). Team ID PH34XPM475, bundle com.boxdseats.app.
 */
export const dynamic = "force-static";

export function GET() {
  return NextResponse.json({
    applinks: {
      apps: [],
      details: [
        {
          appID: "PH34XPM475.com.boxdseats.app",
          paths: ["/auth/confirm", "/auth/confirm/*"],
        },
      ],
    },
  });
}
