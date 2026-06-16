#!/usr/bin/env bash
# One-shot setup for the BoxdSeats iOS shell. Run from the ios-app/ folder:
#   bash scripts/setup.sh
# Then:  npx cap open ios   (set your signing Team in Xcode, then Run)
set -e
cd "$(dirname "$0")/.."

echo "→ installing dependencies"
npm install

if [ ! -d ios ]; then
  echo "→ creating the iOS project (npx cap add ios)"
  npx cap add ios
fi

PLIST="ios/App/App/Info.plist"
DESC="BoxdSeats reads the date and location saved in your photos to find games you've attended. Your photos aren't uploaded."
echo "→ adding the photo-library permission string to Info.plist"
/usr/libexec/PlistBuddy -c "Add :NSPhotoLibraryUsageDescription string $DESC" "$PLIST" 2>/dev/null \
  || /usr/libexec/PlistBuddy -c "Set :NSPhotoLibraryUsageDescription $DESC" "$PLIST"

echo "→ syncing native dependencies (pod install) + config"
npx cap sync ios

echo
echo "✅ Setup complete."
echo "Next:  npx cap open ios"
echo "In Xcode: App → Signing & Capabilities → pick your Team, choose a Simulator (or device), press ▶ Run."
echo "The app should load www.boxdseats.com — log in and use it like normal."
