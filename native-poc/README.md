# BoxdSeats — Photo Scan proof-of-concept (iOS)

A throwaway app to answer one question on a real iPhone: **can we read your
photos' dates + GPS and match them to stadiums/arenas, without uploading
anything?** If yes, the full "it finds the games you went to automatically"
feature is on. Everything runs on the phone.

> Heads up: this is the one piece that can't be built in the cloud — it needs
> your Mac + Xcode. The steps below are copy-paste. If anything turns **red**,
> copy the red text back to me and I'll fix it — expect maybe a round or two of
> that, that's normal for a first native build.

## One-time prerequisites
1. **Xcode** — install from the Mac App Store if you don't have it. Open it once
   and let it finish "installing components."
2. **Node** — you likely have it (we use it for the web app). Check with
   `node -v` in Terminal; if it errors, install from https://nodejs.org.

## Steps (Terminal)
In Terminal, go to the BoxdSeats repo folder, then:

```sh
# 1. Get this branch
git fetch origin claude/project-review-finish-line-bi70xd
git checkout claude/project-review-finish-line-bi70xd
git pull

# 2. Into the PoC and install
cd native-poc
npm install

# 3. Create + open the iOS project
npx cap add ios
npx cap sync ios
npx cap open ios
```

If `npx cap add ios` complains about **CocoaPods**, run
`sudo gem install cocoapods` and then re-run the three `npx cap` lines.

## Steps (Xcode — a few clicks)
Xcode opens the project. Then:

1. **Signing:** left sidebar, click the blue **App** at the top → center pane
   **Signing & Capabilities** → tick **Automatically manage signing** → pick your
   **Team** in the dropdown. If there's no team, click **Add an Account…** and
   sign in with your normal Apple ID (free — no paid account needed for testing
   on your own phone).
2. **Photo permission text:** still on the **App** target → **Info** tab → hover
   any row, click the small **+** → start typing **Privacy - Photo Library Usage
   Description** and pick it → set the value to:
   `Find games you attended from your photos.`
   (Without this line iOS will refuse photo access.)
3. **Run it:** plug your iPhone into the Mac with a cable. In the top bar, where
   it says a device name, pick **your iPhone**. Click the **▶ (Run)** button.
   - First time, your phone may say the developer isn't trusted: on the phone go
     **Settings → General → VPN & Device Management →** tap your Apple ID **→
     Trust**, then press ▶ again.

## What to do in the app
Tap **"Scan my photos"** and **Allow** photo access. It'll show:
- how many photos it scanned,
- how many had GPS,
- how many were at a venue (with venue name + distance + date).

**Then screenshot the whole screen — including the "Raw sample" box at the
bottom — and paste it back to me.** That raw box is the important part: it tells
me exactly what iOS handed us, which decides the design of the real feature.

## What this proves (or disproves)
- **Lots of GPS hits at venues** → the dream is real; we move on to building the
  actual "Suggested logs" feature.
- **Photos scanned but 0 had GPS** → the photo plugin isn't surfacing location;
  I'll swap in a direct PhotoKit call (small next step, toolchain already proven).
- **Can't read photos at all** → we learn that here, cheaply, before investing.
