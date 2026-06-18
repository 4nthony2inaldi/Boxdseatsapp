import Foundation
import Capacitor
import Photos

/**
 * Native photo access for BoxdSeats game discovery.
 *  - scan: enumerate PHAssets and return ONLY geotagged photos' metadata
 *    (identifier + timestamp + lat/lng). No thumbnails, so it's fast and light
 *    even on huge libraries.
 *  - getFullImage: return full-resolution image data (base64) for one asset, so
 *    a matched photo can be auto-attached to a logged game.
 */
@objc(PhotoScannerPlugin)
public class PhotoScannerPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PhotoScannerPlugin"
    public let jsName = "PhotoScanner"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "scan", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getFullImage", returnType: CAPPluginReturnPromise)
    ]

    @objc func scan(_ call: CAPPluginCall) {
        let monthsBack = call.getInt("monthsBack")
        func run() {
            let opts = PHFetchOptions()
            opts.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: false)]
            if let m = monthsBack,
               let cutoff = Calendar.current.date(byAdding: .month, value: -m, to: Date()) {
                opts.predicate = NSPredicate(format: "creationDate >= %@", cutoff as NSDate)
            }
            let result = PHAsset.fetchAssets(with: .image, options: opts)
            var photos: [[String: Any]] = []
            result.enumerateObjects { asset, _, _ in
                // Only geotagged photos can match a venue — skip the rest, which
                // keeps the payload small.
                guard let loc = asset.location else { return }
                var item: [String: Any] = [
                    "id": asset.localIdentifier,
                    "lat": loc.coordinate.latitude,
                    "lng": loc.coordinate.longitude
                ]
                if let d = asset.creationDate {
                    item["timestamp"] = d.timeIntervalSince1970 * 1000
                }
                photos.append(item)
            }
            call.resolve(["photos": photos])
        }

        ensureAuthorized { granted in
            if granted { run() } else { call.reject("denied") }
        }
    }

    /// Resolve read authorization, using the iOS 14+ read/write + limited-access
    /// API where available and falling back to the pre-14 API otherwise.
    private func ensureAuthorized(_ completion: @escaping (Bool) -> Void) {
        if #available(iOS 14, *) {
            let status = PHPhotoLibrary.authorizationStatus(for: .readWrite)
            switch status {
            case .authorized, .limited:
                completion(true)
            case .notDetermined:
                PHPhotoLibrary.requestAuthorization(for: .readWrite) { s in
                    completion(s == .authorized || s == .limited)
                }
            default:
                completion(false)
            }
        } else {
            let status = PHPhotoLibrary.authorizationStatus()
            switch status {
            case .authorized:
                completion(true)
            case .notDetermined:
                PHPhotoLibrary.requestAuthorization { s in
                    completion(s == .authorized)
                }
            default:
                completion(false)
            }
        }
    }

    @objc func getFullImage(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else {
            call.reject("missing id")
            return
        }
        let assets = PHAsset.fetchAssets(withLocalIdentifiers: [id], options: nil)
        guard let asset = assets.firstObject else {
            call.reject("not found")
            return
        }
        let opts = PHImageRequestOptions()
        opts.isNetworkAccessAllowed = true // allow iCloud-stored originals
        opts.deliveryMode = .highQualityFormat
        opts.isSynchronous = false
        opts.version = .current
        PHImageManager.default().requestImageDataAndOrientation(for: asset, options: opts) { data, uti, _, info in
            if let data = data {
                let mime = (uti?.contains("png") ?? false) ? "image/png" : "image/jpeg"
                call.resolve(["base64": data.base64EncodedString(), "mimeType": mime])
            } else {
                let err = (info?[PHImageErrorKey] as? NSError)?.localizedDescription ?? "no data"
                call.reject(err)
            }
        }
    }
}
