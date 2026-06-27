# Operations and infrastructure notes

The things that are **not** captured by the code itself: configuration that lives
in third-party dashboards (Supabase, Apple, Vercel), the iOS release process, and
the gotchas that cost time to rediscover. Read this before touching auth emails,
deep linking, or cutting an iOS build.

## Key identifiers

| Thing | Value |
| --- | --- |
| Supabase project ref | `hsntmacdhuprmtsuxhsq` |
| iOS bundle id | `com.boxdseats.app` |
| Apple Team ID | `PH34XPM475` |
| App Store ID (numeric) | `6781299327` |
| Production domain | `https://www.boxdseats.com` |

Auth is **email/password only** (no OAuth). That's why there is no "Sign in with
Apple" — Apple only requires it when you offer other third-party logins.

## Supabase configuration (lives in the dashboard / Management API, not the repo)

Applied via the Management API (`/v1/projects/{ref}/config/auth`) with a PAT.
Schema/data changes also have a committed migration in `supabase/migrations/` as
the record, but the auth *config* below has no migration — it's dashboard state.

- **Email rate limit (`rate_limit_email_sent`) = 30/hour.** Was `2`, which is the
  real cause if signup-confirm / password-reset emails suddenly stop sending with
  `429 over_email_send_rate_limit`. 2/hour is far too low for real use; don't drop
  it back. Email goes out through **Resend** (`smtp.resend.com`, sender
  `noreply@boxdseats.com`) — free tier is 100/day, so 30/hour is safe.
- **Leaked-password protection (HIBP) is ON.** A weak/breached password (e.g.
  `anthony1`) is rejected with `422 weak_password` / `reasons: ["pwned"]`. This is
  intentional. The reset and change-password screens surface this as "too easy to
  guess" — that's expected, not a bug.
- **Password min length = 6** server-side, but the signup/reset UIs ask for 8+.

### Auth email templates use the token_hash flow

Both the **recovery** and **signup confirmation** emails were switched from the
default `{{ .ConfirmationURL }}` (PKCE code flow) to the **token_hash** flow:

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/onboarding
```

Why: the PKCE code flow needs a `code_verifier` cookie from the browser that
*requested* the email, so opening the link in a different browser (the normal
mobile case) failed and dumped users on `/login`. `verifyOtp({ type, token_hash })`
(handled by `src/app/auth/confirm/route.ts`) verifies the emailed token directly —
no cookie needed — so it works anywhere. It also had to point at
`www.boxdseats.com` (not `supabase.co`) for Universal Links to fire.

`/auth/callback` (the PKCE code route) still exists for completeness but the email
links no longer use it.

**Editing these templates via the Management API:** replace `{{ .ConfirmationURL }}`
with the token_hash URL using a *literal* replacement (perl `\Q…\E` with the URL in
an env var). Do **not** use `sed s|…|…|` — `&` in the sed replacement re-inserts the
matched text and silently corrupts the `&type=…&next=…` query string.

## Universal Links (deep linking) — email links open the app

Goal: a user with the app installed who taps an auth email link lands back in the
app, not Safari.

**Web side (in the repo, already live):**
- AASA file served at `/.well-known/apple-app-site-association`
  (`src/app/.well-known/apple-app-site-association/route.ts`), claiming
  `/auth/confirm` for `PH34XPM475.com.boxdseats.app`. Allowlisted in
  `src/lib/supabase/middleware.ts`.
- `src/lib/native/deepLink.ts` + `DeepLinkHandler` (mounted in the root layout)
  route an opened link into the in-app webview. Each launch URL is handled **once
  per session** (sessionStorage dedupe) — without that, `App.getLaunchUrl()`
  re-fires `/auth/confirm` on every reload and the consumed one-time token sends
  the app into a refresh loop.

**Native side (in the repo, applied at build time):**
- `applinks:www.boxdseats.com` entitlement + the AppDelegate
  `continue(userActivity)` forwarder are injected by
  `ios-app/scripts/configure-push.rb`.
- `@capacitor/app` is an `ios-app` dependency (provides `appUrlOpen`).

**Apple portal (one-time, done):** the **Associated Domains** capability is
enabled on the App ID `com.boxdseats.app` (Identifiers → com.boxdseats.app). It's
the plain one, **not** "MDM Managed Associated Domains." Without it, a build that
includes the entitlement **fails to sign**.

**Web → app prompts for users who don't have it open in the app:**
- iOS **Smart App Banner** (`itunes.appId` in the root layout metadata) shows
  "Open / Get" in Safari only (ignored in the app's own webview).
- `AppPromoBanner` (persistent, dismissible) + the onboarding `StepGetApp` finale +
  the app-required state on `/log/photos` all push web users to the App Store. All
  gated to `!isNativeApp()`, so none ever show inside the app. The **photo finder
  is iOS-only** (on-device library scan) and is not portable to the web — these
  nudges are the activation path, not a web port.

## iOS release process (Codemagic → TestFlight → App Store)

The native shell is a Capacitor remote-URL app: it loads the live site, so **web
changes ship via Vercel and reach the app on relaunch — no rebuild.** Only native
changes (entitlements, plugins, Info.plist, AppDelegate, app version) need a build.

To cut a release:

1. **Bump the marketing version.** In `ios-app/scripts/configure-push.rb`, set
   `c.build_settings["MARKETING_VERSION"]` to a value higher than the last
   approved one (`1.0.1 → 1.0.2 → 1.1 …`). This is **manual, per release.**
   - It MUST be the build setting, not an Info.plist edit. Capacitor's Info.plist
     reads `$(MARKETING_VERSION)`, and the build setting wins at archive time.
     Symptom of getting this wrong: upload fails with `90062` ("must contain a
     higher version") / `90186` ("train … is closed"), still showing the old
     version. The build *number* (CFBundleVersion) auto-increments via `agvtool`
     and needs no attention.
2. **Run the Codemagic build** (`ios-testflight` workflow, `main` branch). Watch
   the **code-signing** step — it's the riskiest, and `configure-push.rb` is the
   signing path. A signing failure usually means a capability was added to the
   entitlements but not enabled on the App ID, or the provisioning profile needs
   regenerating (re-running the build refetches signing files and often fixes it).
3. **TestFlight** — install and smoke-test (camera, push, the deep link).
4. **App Store Connect** — create the new version, attach the build, submit.
   **Leave the metadata (screenshots, keywords, description) untouched** — those
   were the cause of the original 4.1 "copycats" rejection and are now in their
   approved state.

Other things `configure-push.rb` / `codemagic.yaml` do at build time: inject
`NSPhotoLibraryUsageDescription` + `NSCameraUsageDescription` (missing the camera
one hard-crashes the app — that was a 2.1 rejection), `ITSAppUsesNonExemptEncryption`,
the APNs forwarding methods, and pin the app to iPhone-only.

## Monitoring (Sentry) — needs activation

Sentry is wired runtime-only (no build plugin) and **env-gated**. It does nothing
until these are set in **Vercel** env vars (Production):

- `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` (same DSN value).

Once set, both app error reporting and the **ingest dead-man's switch** go live
(the switch routes through `Sentry.captureMessage`). The switch:
- `ingest_heartbeats` table — each sync writes a heartbeat; `last_success_at`
  only advances on a run that did useful work.
- `/api/ingest-health` (hourly Vercel cron) alerts when a job's last success is
  stale. Watches job health, not event recency, so the offseason doesn't trip it.
- Admin view at `/admin/ingest` (per-job status + per-league freshness).

## Photo finder — venue geocoding accuracy

The photo finder geofences each photo to a venue using `public/venues-geo.json`
(`[venueId, lat, lng, radiusMeters?]`, generated from the DB `location` column).
A match only happens if the venue's coordinate is within its radius of where the
photo was taken — so **coordinate accuracy is the whole game**, and bad coords
fail silently (the game just never gets suggested).

Hard-won lessons from fixing this:

- **Tournament-named venues are the weak spot.** Individual-sport venues named
  after the event ("BNP Paribas Open", "Miami Open") don't geocode to the
  stadium — they land on the city centroid, or on the `39.78, -100.45` US
  geographic-center "couldn't resolve" fallback, often tens of km off. Indian
  Wells was ~3.4 km off; Cincinnati's "Western & Southern Open" was at the
  centroid 34 km from the Lindner Center.
- **Golf, motorsports, and the tennis slams are fine** — they're named after the
  real course/track/club ("Royal Birkdale GC", "Sonoma Raceway", "All England
  Lawn Tennis Club"), which geocodes correctly. Don't waste effort there.
- **Re-geocoding: validate the feature, not just the distance.** Nominatim *can*
  resolve the real venue when you query its actual name (e.g. "Indian Wells
  Tennis Garden"), but you must check the returned `class`/`type` is the named
  stadium/sports_centre — distance alone is misleading (the big "moves" are just
  the broken old centroid snapping to the right place). Always dry-run first.
- **`venues-geo.json` is a subset.** Venues with no usable coords were excluded,
  so a venue can be missing entirely — fixing the DB coord isn't enough; the
  entry has to exist in the json (the client only reads the json). There is no
  committed generator script; the marquee-tennis fix updated present rows and
  appended the missing ones directly (see migration 20260627).
- **Long tail left as-is:** ~700 obscure lower-tour tennis venues likely share
  the issue but are events nobody photographs. Fix on report, not preemptively.

## Where secrets live

- App secrets (Sentry DSN, etc.): **Vercel env vars**, never the repo or chat.
- Supabase service-role / PAT: used by data scripts and the Management API; never
  commit them. (Any key pasted into a chat or commit should be rotated.)
