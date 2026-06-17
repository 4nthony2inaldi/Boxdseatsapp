#!/usr/bin/env ruby
# Configures the generated iOS project for push notifications during the
# Codemagic build (run from ios-app/, after `cap sync`):
#   1. writes the aps-environment entitlement and points the App target at it
#   2. injects the APNs token-forwarding methods into AppDelegate (Capacitor's
#      template omits them, so register() succeeds but the `registration`
#      event never fires and no token is delivered).
require "xcodeproj"

File.write("ios/App/App/App.entitlements", <<~PLIST)
  <?xml version="1.0" encoding="UTF-8"?>
  <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
  <plist version="1.0">
  <dict>
    <key>aps-environment</key>
    <string>production</string>
  </dict>
  </plist>
PLIST

proj = Xcodeproj::Project.open("ios/App/App.xcodeproj")
target = proj.targets.find { |t| t.name == "App" }
target.build_configurations.each do |c|
  c.build_settings["CODE_SIGN_ENTITLEMENTS"] = "App/App.entitlements"
end
proj.save
puts "CODE_SIGN_ENTITLEMENTS set for App target"

ad = "ios/App/App/AppDelegate.swift"
src = File.read(ad)
if src.include?("didRegisterForRemoteNotificationsWithDeviceToken")
  puts "AppDelegate already forwards APNs callbacks"
else
  methods = <<~SWIFT

      func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
          NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
      }
      func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
          NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
      }
  SWIFT
  src = src.sub(/(class AppDelegate[^{]*\{)/) { "#{$1}#{methods}" }
  File.write(ad, src)
  puts "injected APNs forwarding into AppDelegate"
end
