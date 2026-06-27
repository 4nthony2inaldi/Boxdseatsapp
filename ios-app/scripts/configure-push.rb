#!/usr/bin/env ruby
# Configures the generated iOS project during the Codemagic build (run from
# ios-app/, after `cap sync`):
#   1. writes the aps-environment + associated-domains entitlements and points
#      the App target at them
#   2. injects the APNs token-forwarding methods AND the Universal Link
#      continue(userActivity) handler into AppDelegate (Capacitor's template
#      omits both, so push tokens never deliver and Universal Links never reach
#      the appUrlOpen listener).
#   3. pins the app to iPhone only (Capacitor defaults to iPhone+iPad, but
#      BoxdSeats is a phone-first app with no designed iPad layout; iPhone-only
#      avoids the iPad screenshot/UX requirements).
#
# NOTE: associated-domains requires the "Associated Domains" capability to be
# enabled on the App ID (com.boxdseats.app) in the Apple Developer portal, or the
# signing step will fail to include the entitlement. The AASA file is served at
# https://www.boxdseats.com/.well-known/apple-app-site-association.
require "xcodeproj"

File.write("ios/App/App/App.entitlements", <<~PLIST)
  <?xml version="1.0" encoding="UTF-8"?>
  <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
  <plist version="1.0">
  <dict>
    <key>aps-environment</key>
    <string>production</string>
    <key>com.apple.developer.associated-domains</key>
    <array>
      <string>applinks:www.boxdseats.com</string>
    </array>
  </dict>
  </plist>
PLIST

proj = Xcodeproj::Project.open("ios/App/App.xcodeproj")
target = proj.targets.find { |t| t.name == "App" }
target.build_configurations.each do |c|
  c.build_settings["CODE_SIGN_ENTITLEMENTS"] = "App/App.entitlements"
  # 1 = iPhone only (2 = iPad, "1,2" = both). Pins UIDeviceFamily in the binary.
  c.build_settings["TARGETED_DEVICE_FAMILY"] = "1"
end
proj.save
puts "CODE_SIGN_ENTITLEMENTS + iPhone-only device family set for App target"

ad = "ios/App/App/AppDelegate.swift"
src = File.read(ad)
changed = false

unless src.include?("didRegisterForRemoteNotificationsWithDeviceToken")
  apns = <<~SWIFT

      func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
          NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
      }
      func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
          NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
      }
  SWIFT
  src = src.sub(/(class AppDelegate[^{]*\{)/) { "#{$1}#{apns}" }
  changed = true
  puts "injected APNs forwarding into AppDelegate"
end

# Universal Links: forward continue(userActivity) to Capacitor so a tapped
# applink fires the JS appUrlOpen listener (see src/lib/native/deepLink.ts).
unless src.include?("continue userActivity")
  ua = <<~SWIFT

      func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
          return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
      }
  SWIFT
  src = src.sub(/(class AppDelegate[^{]*\{)/) { "#{$1}#{ua}" }
  changed = true
  puts "injected Universal Link continue(userActivity) into AppDelegate"
end

File.write(ad, src) if changed
