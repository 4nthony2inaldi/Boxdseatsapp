require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name = 'PhotoScanner'
  s.version = package['version']
  s.summary = package['description']
  s.license = 'MIT'
  s.homepage = 'https://www.boxdseats.com'
  s.author = 'BoxdSeats'
  s.source = { :git => 'https://www.boxdseats.com', :tag => s.version.to_s }
  s.source_files = 'ios/Sources/**/*.{swift,h,m}'
  # Match Capacitor 6's Podfile platform (iOS 13). iOS 14-only Photos APIs are
  # guarded with `if #available` in the Swift source.
  s.ios.deployment_target = '13.0'
  s.dependency 'Capacitor'
  s.swift_version = '5.1'
end
