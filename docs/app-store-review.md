# App Store review notes

Everything App Review needs to evaluate and approve BoxdSeats. Copy the
relevant parts into App Store Connect.

## Demo account

The app is behind a login, so App Review needs a working account. This one is
confirmed and pre-populated with logged games across several leagues.

- Email: `appreview@boxdseats.com`
- Password: `BoxdSeats-Review-2026`

Username `appreview`. It has six logged events (NBA, MLB, NHL, NFL, MLS, World
Cup) so the timeline, profile, and event pages all show real content.

## Review notes (paste into "Notes" in App Store Connect)

> BoxdSeats is a check-in app for live sports: fans log the games they attend,
> rate them, and follow friends. Sign in with the demo account above.
>
> What to try: open the Feed and Profile tabs to see logged games; tap a game
> to see the event page; tap the + button to log a new game.
>
> Photo finder: the optional photo feature reads the date and location stored in
> your photos on the device to suggest games you attended. This processing
> happens entirely on device. Photos and their location are not uploaded; only
> the matched venue and date are sent to look up the game. A photo is uploaded
> only if the user chooses to attach it to a log.
>
> User-generated content: users can report any comment or photo (the Report
> option next to it) and block any user (from their profile). We act on
> objectionable content or abusive users within 24 hours.
>
> Team names, league names, and logos belong to their owners. BoxdSeats is an
> independent fan app for logging events attended and is not affiliated with or
> endorsed by any team, league, or venue.

## App Privacy ("nutrition label") — what to declare

Set these in App Store Connect → App Privacy. They match the Privacy Policy at
https://www.boxdseats.com/privacy.

Data collected and linked to the user, used only for App Functionality (not for
tracking, not for advertising):

- Contact Info → Email Address (account sign-in).
- User Content → Photos (only photos the user chooses to attach to a log).
- User Content → Other User Content (logged games, ratings, notes, comments, lists).
- Identifiers → User ID (the account identifier).

Do NOT declare:

- Location. The photo scan reads photo location on device and does not transmit
  it, so location is not collected.
- Tracking. There is no third-party advertising or cross-app tracking, so
  "Data Used to Track You" is none.
- Usage/analytics and diagnostics. No third-party analytics or crash SDK is
  bundled, so leave these unchecked.

Note on the push token: the APNs device token is used solely to deliver
notifications the user turns on. It is not used to track the user and is not an
advertising identifier.

## Trademark and logos (in case it comes up)

The app shows team names, league names, venue names, and logos so fans can
identify the games they attended. These marks belong to their owners. BoxdSeats
is independent and is not affiliated with, endorsed by, or sponsored by any
team, league, or venue. This is stated in the Terms of Service at
https://www.boxdseats.com/terms. The use is nominative (identifying the real
event a user attended), which is how comparable fan-logging apps operate.

## Links

- Privacy Policy: https://www.boxdseats.com/privacy
- Terms of Service: https://www.boxdseats.com/terms
- Support: support@boxdseats.com

## Before submitting — open items

- DONE: `support@boxdseats.com` inbox is stood up and receiving mail.
- Add a Support URL page (App Store Connect requires the Support URL field to
  resolve to a real page; a `mailto:` inside the legal pages is not enough).
- Set the Privacy Policy URL field in App Store Connect to the link above.
- If `NEXT_PUBLIC_SENTRY_DSN` is set in production, Sentry is live (added in the
  error-monitoring change), so the App Privacy label must declare Diagnostics →
  Crash Data. The "no crash SDK is bundled" note above only holds if the DSN is
  unset in prod. Reconcile this before certifying the label.
- Confirm `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel production, or in-app
  account deletion returns "Account deletion is not configured" (a 5.1.1(v)
  rejection if a reviewer tests it).
- Confirm the age rating questionnaire reflects user-generated content and
  social features (typically 12+).
