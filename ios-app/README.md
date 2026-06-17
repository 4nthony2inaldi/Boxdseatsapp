# BoxdSeats — iOS app (Capacitor shell)

The real native iOS app. It's a thin Capacitor shell that loads the live web
app (`https://www.boxdseats.com`) in a native webview and adds the native
capability the web can't have: **on-device photo scanning** for game discovery.

Because it loads the live site, **anything deployed to the web shows up in the
app automatically** — we only rebuild this shell when the *native* layer
changes (plugins, icons, permissions), not for normal feature work.

> This needs your Mac + Xcode. Steps are copy-paste; if anything turns **red**,
> paste it back and I'll fix it. (Same flow as the photo PoC — expect maybe a
> round of fixes on the first build.)

## Milestone 1 — get the app running (this build)
The goal right now is just: **BoxdSeats opens as an app and loads the live
site, and you can log in.** The photo feature gets wired on the web side next
and will appear here without another rebuild.

### Steps (Terminal)
```sh
# from the repo root, on this branch:
cd ios-app
bash scripts/setup.sh
npx cap open ios
```
If `setup.sh` complains about **CocoaPods**, install it once with
`brew install cocoapods`, then re-run `bash scripts/setup.sh`.

### Steps (Xcode)
1. Blue **App** in the sidebar → **Signing & Capabilities** → tick
   **Automatically manage signing** → pick your **Team** (your Apple ID).
2. Because the work Mac's USB is locked down (CrowdStrike), pick an **iPhone
   Simulator** as the run target rather than a physical device. Press **▶ Run**.
3. The app launches and should load **www.boxdseats.com**. Log in and poke
   around — it should behave like the website, just in an app frame.

**Tell me:** does it load and let you log in? Once that's confirmed, I'll wire
the photo scan (web side) and it'll appear in the app on next launch.

## Getting it on a real iPhone — cloud build → TestFlight (no Mac needed)

The work Mac's USB is locked (CrowdStrike), so device installs go through
TestFlight via a cloud build. All of this is doable from a browser (iPad-friendly).

**One-time setup (you, in a browser):**
1. **Apple Developer Program** — enroll at developer.apple.com/programs ($99/yr).
   Start this first; Apple's identity check can take a day or two.
2. **App Store Connect API key** — App Store Connect → Users and Access →
   Integrations → App Store Connect API → generate a key. Download the `.p8`
   and note the **Key ID** and **Issuer ID**.
3. **Register the app** — register bundle id `com.boxdseats.app` and create the
   app "BoxdSeats" in App Store Connect.
4. **Codemagic** (codemagic.io, free tier): sign up, connect this GitHub repo,
   add the App Store Connect key as an integration named exactly **`BoxdSeats ASC`**.

**Build:** Codemagic auto-detects `codemagic.yaml` (repo root). Start the
`ios-testflight` workflow. It builds the app on a cloud Mac, signs it, and
uploads to TestFlight.

**Install on your iPhone:** install Apple's **TestFlight** app, accept the
BoxdSeats build, tap install. Done — no cable, no local Mac.

The app icon comes from `ios-app/assets/logo.png` (the brand mark); the build
generates the full icon + splash set automatically.

## Notes
- App id: `com.boxdseats.app`. The photo-permission string is added by
  `setup.sh`; the photo prompt won't fire until the scan feature is wired.
- `native-poc/` (the earlier throwaway) is superseded by this and can be
  deleted whenever.
- Distribution later is via **TestFlight** (over the internet, no USB), so the
  USB block won't affect shipping to testers — only this local run loop.
