#!/usr/bin/env bash
# One-shot setup for the iOS photo-scan PoC. Run from the native-poc/ folder
# AFTER Xcode is installed:  bash scripts/setup.sh
# Then:  npx cap open ios  (set your signing Team in Xcode, plug in iPhone, Run)
set -e
cd "$(dirname "$0")/.."

echo "→ installing dependencies"
npm install

if [ ! -d ios ]; then
  echo "→ creating the iOS project (npx cap add ios)"
  npx cap add ios
fi

PLIST="ios/App/App/Info.plist"
DESC="Find games you attended from your photos."
echo "→ adding the photo-library permission string to Info.plist"
/usr/libexec/PlistBuddy -c "Add :NSPhotoLibraryUsageDescription string $DESC" "$PLIST" 2>/dev/null \
  || /usr/libexec/PlistBuddy -c "Set :NSPhotoLibraryUsageDescription $DESC" "$PLIST"

echo "→ syncing web assets + plugins into the iOS project"
npx cap sync ios

echo
echo "✅ Setup complete."
echo "Next:  npx cap open ios"
echo "In Xcode: App → Signing & Capabilities → pick your Team, plug in your iPhone, press ▶ Run."
