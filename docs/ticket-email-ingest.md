# Ticket-email ingest — design doc

Backfill a fan's attendance history by reading the ticket-order emails they
already have, from the major marketplaces. This is the primary path for users
who don't have camera-roll location (the photo finder needs geotags; a large
share of people have that off). A ticket email is a *stronger* signal than a
geotagged photo — it names the event, venue, date, and seats outright.

Vendors in scope: **StubHub, Ticketmaster, Gametime, TickPick, Vivid Seats.**

## Goals / non-goals

Goals
- One-tap connect an email account, then sweep years of order history in one go.
- Extract event + venue + date (+ section/row/seat where present) and match to a
  BoxdSeats event.
- Surface matches in the existing review-and-confirm flow; never auto-log.
- Keep parsing efficient and precise — only touch transactional order mail, never
  the marketing blasts these vendors send constantly.

Non-goals (for now)
- No logging into vendor accounts / scraping their sites (ToS + security + MFA).
  There is no consumer purchase-history API from any of these vendors; email is
  the only vendor-agnostic source.
- No concerts/theatre. BoxdSeats is sports; non-sports orders are dropped.
- No bank/card-transaction parsing — a "TICKETMASTER $214" charge can't identify
  the game.

## Why not "forward your confirmations"

Rejected. Forwarding one email per game is the same friction as logging one game
manually — it defeats the point. The value is the **bulk, zero-effort backfill**
of games a user would never re-enter by hand. That requires reading the inbox,
not per-message forwarding. (A forwarding address may still exist later as an
opt-in fallback for providers we can't OAuth into — see iCloud, below.)

## User flow

1. **Connect.** "Add your games from your tickets" → OAuth to Google (Gmail) or
   Microsoft (Outlook), read-only. Clear copy on exactly what we read.
2. **Sweep.** Server queries only the allowlisted transactional senders, parses
   the order emails, matches each to a BoxdSeats event.
3. **Review.** A results screen groups the finds (high-confidence pre-selected,
   uncertain shown for a tap, unmatched listed separately). Reuses the photo-
   finder confirm UX.
4. **Confirm.** Selected orders become `event_logs` (with seats). Dismissed ones
   are remembered so they don't resurface.
5. **Ongoing.** After the first backfill, incremental sync picks up new orders
   and drops them into suggestions.

## Auth & scopes

**Google (majority of users).**
- Scope: `https://www.googleapis.com/auth/gmail.readonly` — a **restricted**
  scope. Production use requires OAuth app verification **plus an annual CASA
  Tier-2 security assessment** (real cost + lead time).
- De-risk: run the initial closed beta in Google **"testing" mode (≤100 test
  users)**, which allows the restricted scope with no CASA. Validate the lift
  (forgotten games surfaced per user, confirm rate) before funding verification
  + CASA for GA.
- Caveat for the beta: an unverified app requesting a restricted scope shows a
  Google **"this app isn't verified"** interstitial that testers must expand and
  click through. That's real friction and will depress the beta connect rate, so
  read connect-rate as a floor, not the GA number — post-verification the screen
  is clean.
- `gmail.metadata` (headers only, no body) is tempting for privacy but can't read
  the body where venue/seat live, and still can't combine with a search query —
  so `readonly` it is, behaviourally scoped (below).

**Microsoft (Outlook/Hotmail).**
- Scope: `Mail.Read` (delegated). Lighter review bar than Google (publisher
  verification; no CASA-equivalent). Add after Google.

**iCloud / Yahoo.** No clean consumer read API. Likely uncovered at launch; a
forwarding address is the only fallback and is explicitly a secondary path.

Token handling: refresh/access tokens are secrets — stored server-side only,
encrypted, service-role access only, never sent to the client. Disconnect must
revoke + delete tokens and (optionally) purge ingested data.

## Fetch strategy — efficient and precise

The marketplaces send heavy marketing volume, and a promo email ("Yankees vs Red
Sox — get tickets!") carries the *same* event/venue/date text as a real order. So
we filter hard **before** parsing, mostly on the provider's side, and gate on
*purchase evidence* (an order number), never on event keywords.

Layered, cheapest first:

1. **Sender-address allowlist.** Vendors split transactional from marketing by
   sending address/subdomain. We only ever fetch from the transactional senders
   (table below). This removes the large majority for free.
2. **Server-side Gmail `q` query.** `messages.list` runs the query on Google's
   servers, so marketing is never downloaded. Combine sender + intent + Gmail's
   own promo classification, e.g.
   `from:noreply@stubhub.com ("Order #" OR "your order") -category:promotions`.
   Receipts land in Primary/Updates; blasts land in Promotions, so
   `-category:promotions` is a strong free discriminator. (Microsoft Graph:
   equivalent `$search`/`$filter` on `from` + subject.)
3. **Required-field gate.** After fetch, only proceed if the message has the
   transactional markers — an **order number** *and* a date+venue block. A promo
   that slips through has no order number and is dropped. This is the anti-false-
   positive backstop.
4. **Dedupe + incremental.** One order emits several messages (confirmation →
   "tickets ready"/transfer → reminders); collapse to one record. Key on
   `order_ref` when present, but the original-provider transfer email often
   lacks the marketplace order #, so fall back to `(user, resolved event_id)` —
   i.e. dedupe on the matched game — so a transfer and its confirmation don't
   double-log. After the first backfill, store Gmail `historyId` (Graph: delta
   token) and process only new mail — never re-scan.

Bias to **precision over recall**: better to miss an oddball receipt (the user
can manually add) than to log a game they didn't attend.

## Per-vendor senders & email types

Starting allowlist — **verify each against real samples during beta** (sending
addresses change and vary by region). One confirmed sample so far: StubHub order
confirmations come from `noreply@stubhub.com`.

| Vendor | Transactional sender(s) (to confirm) | Order email types | Marketing (ignore) |
|---|---|---|---|
| StubHub | `noreply@stubhub.com` | "Thanks for your order!" (Order #), ticket-ready/transfer, reminder | `e.stubhub.com`, `mail.stubhub.com` |
| Ticketmaster | `@ticketmaster.com`, `orders@…`, Account-Manager transfers | order confirmation, transfer received, "you're going" | `e.ticketmaster.com`, `info.…` |
| Gametime | `@gametime.co` / `mail.gametime.co` | order confirmation, tickets delivered | promo subdomain |
| TickPick | `@tickpick.com` | order confirmation, transfer | promo subdomain |
| Vivid Seats | `@vividseats.com` / `email.vividseats.com` | order confirmation, tickets ready | promo subdomain |

Note: resale purchases (StubHub/TickPick/Vivid/Gametime) often produce **two**
relevant emails — the marketplace order confirmation *and* a transfer email from
the original provider (Ticketmaster/team). Dedupe across both to one logged game.

## Parser design

- **Deterministic per-vendor parsers** keyed on sender. The transactional emails
  are structured HTML with stable labels; regex/DOM-selector parsing is fast,
  cheap, and reliable. Reserve any model-based parsing as a fallback for
  recognized-sender-but-unrecognized-layout messages, if used at all.
- **Anchor on durable bits**, not exact layout: the date line
  (`Saturday, March 11, 2023 | 13:05`), the event title, the venue line
  (`LECOM Park (formerly McKechnie Field)`), `Section/Row/Seat(s)`, `Order #`.
- **Parser interface** (shape, not final types):
  ```
  parse(email): ParsedOrder | null
  ParsedOrder = {
    vendor, orderRef,
    eventTitle, homeHint?, awayHint?,   // "Yankees at Pirates …"
    venueText,                          // raw, incl. "(formerly …)" alias
    startLocal,                         // local date/time as printed
    section?, row?, seat?, quantity?, price?,
    sourceMessageId,
  }
  ```
  Returns `null` unless the required fields (orderRef + venue + date) are present.

## Matching to BoxdSeats events

A ticket names the venue + teams + date, so matching is stronger than the photo
path. Reuse the `(venue, date) → games` machinery from `photoSuggestions.ts`,
then refine with the teams.

- **Venue:** match `venueText` against `venues.name` + `venue_aliases`. The
  vendor's "(formerly McKechnie Field)" parenthetical maps directly onto our
  alias model — match on either the canonical or historical name.
- **Date:** match on the **local event date** (UTC-5 offset, per CLAUDE.md — align
  with `localEventDate`/`localDate` so this agrees with the event side).
- **Teams are required for team sports, not just a tiebreaker.** Venue + date is
  necessary but *not sufficient*: a concert or another event at a sports venue can
  land on a day the home team also played. For team sports we only match when the
  parsed teams resolve to that event's teams; venue + date alone never creates a
  log. (Individual sports without two teams — golf, tennis, motorsports — match on
  venue + date + the event/tournament name instead.)
- **Confidence:** venue + date + teams all resolve → high (pre-selected in
  review). Missing the team match → not logged as that game; shown as "unmatched"
  rather than guessed. No event in our DB → "unmatched" bucket with a manual-add
  affordance. Never silently create events.

## Purchase ≠ attendance

Buying a ticket isn't proof of going (resale, no-show). So ingested orders always
flow through the **confirm flow** — suggested, user taps to log — exactly like
photo matches. Never auto-log. (Cancellation/refund emails are a later signal we
may detect to suppress a suggestion; low priority — the user can dismiss.)

## New data: seats

Seat/section/row is data we can't get from photos or manual entry — it enables a
genuinely novel feature (a "where you've sat" view / seat-map / section history on
the passport). Requires a **schema addition** (a prod change → human checkpoint):

- `event_logs`: add `seat_section text`, `seat_row text`, `seat_number text`
  (nullable). Keep them `text`, not numeric — seats come as "GA", ranges
  ("7-8"), or multiple sections, so store what's printed and normalize lightly.
  Price is personal; hold unless we want a "spend" stat later.

Ship ingest first; the seat-history *feature* is a fast follow once the data is
flowing.

## Data model

- `email_connections` — `id, user_id, provider (google|microsoft), status,
  scopes, sync_token/history_id, connected_at, last_synced_at`. Tokens stored
  encrypted (Supabase Vault or an encrypted column), service-role access only,
  RLS so a user only sees their own connection row (never the tokens).
- `ticket_orders` — one row per deduped order: `id, user_id, vendor, order_ref,
  event_id (nullable), event_title, venue_text, event_local_date, section, row,
  seat, quantity, price, source_message_ids text[], status
  (pending|confirmed|dismissed|unmatched), created_at`. Unique
  `(user_id, vendor, order_ref)` for idempotent re-runs. RLS: owner-only.
- `event_logs` — gains the seat columns above; a confirmed `ticket_order` writes a
  log the same way a photo match does.

## Pipeline

1. OAuth connect → store encrypted tokens in `email_connections`.
2. Backfill as a **resumable background job**, not a single request — a multi-year
   inbox exceeds a serverless function's time limit. Process in pages with a
   stored cursor (`messages.list` `pageToken` + last-seen message id) so it can
   run in chunks and resume; drive it the way the repo already runs jobs (a
   worker / scheduled run) rather than blocking the connect request. Per page:
   per-vendor `q` → skip already-seen ids → fetch (metadata, then body only for
   survivors) → parse → gate → upsert `ticket_orders`.
3. Match each order to an event → set `event_id` + confidence.
4. Review screen → confirm writes `event_logs` (+ seats); dismiss sets status.
5. Incremental: persist `history_id`/delta token; poll or Gmail `watch` for new
   mail → new pending orders → suggestions.

Runs server-side by necessity (tokens + parsing). Mind Gmail API quotas; page and
back off.

## Privacy & security

Email is sensitive, so the posture has to be tight and legible:
- **Narrow behaviour:** only ever query the allowlisted transactional senders —
  we never read the rest of the inbox even though the grant technically allows it.
  Say this plainly in the connect screen.
- **Minimal retention:** store the parsed order fields + message id (for dedupe/
  audit), **not** raw email bodies. Never download attachments (.pkpass/PDF
  tickets) — the data we need is in the body, and skipping them cuts cost and
  exposure.
- **Tokens:** encrypted, server-only, revoked + deleted on disconnect.
- **User control:** disconnect any time; option to delete all ingested orders.
- **Google Limited Use** binds us with the restricted Gmail scope: the mail data
  may be used only to provide this user-facing feature — no selling it, no ads, no
  using it to train models, and no human reads it except with consent or for
  security/abuse/legal. Our minimal-retention design already fits this; it's also
  what CASA/verification will check.
- Honest framing: unlike the on-device photo scan, this is server-side (it must
  be) — we lean on narrow scope + minimal retention instead of on-device.

## Edge cases

- **Two emails per resale order** (marketplace + original-provider transfer) →
  dedupe to one game.
- **Split-squad / doubleheaders** (two games, one day) → disambiguate by venue +
  teams.
- **Concerts/theatre** → out of scope; drop when the parsed event isn't a sport /
  isn't in our catalog.
- **Event/venue not in DB** → "unmatched" bucket + manual add; never auto-create.
- **Refunds/cancellations** → possible later suppression signal; for now the user
  dismisses.
- **Timezone** → match on local event date (UTC-5), consistent with the event side.

## Rollout

- **P0 (closed beta, Google testing mode ≤100):** schema + Google OAuth connect +
  **StubHub** parser (we have real samples) + backfill + review flow. Measure
  games-surfaced/user, confirm rate, false-positive (dismiss) rate.
- **P1:** add Ticketmaster, Vivid Seats, Gametime, TickPick parsers (collect real
  samples for sender allowlists); incremental sync.
- **P2:** Microsoft/Outlook; seat-history feature; fund OAuth verification + CASA
  for GA.

## Success metrics

- Connect rate among location-off users.
- Median games surfaced per connected user (the backfill "wow").
- Confirm rate (precision) and dismiss rate (false positives) per vendor.
- Parser coverage: % of fetched transactional emails successfully parsed.

## Open decisions

- Ship **seat history** as a feature in P2, or just store seats for later?
- Store ticket **price** (enables a lifetime-spend stat) or skip for privacy?
- iCloud/Yahoo users: offer the forwarding fallback, or leave uncovered at launch?
- Gmail `watch` (push) vs periodic poll for incremental sync.
