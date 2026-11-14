import Foundation
import Capacitor
import CoreGraphics
import CoreImage
import ImageIO
import UIKit
import Vision

@objc(MatchrimOCRPlugin106)
public final class MatchrimOCRPlugin106: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "MatchrimOCRPlugin106"
    public let jsName = "MatchrimOCR"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "recognize", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancel", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "takePhoto", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pasteImage", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "takeSharedImage", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "confirm", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "recognizeLines", returnType: CAPPluginReturnPromise)
    ]

    private static let maxEncodedBytes = 18 * 1024 * 1024
    private static let maxDataBytes = 12 * 1024 * 1024
    private static let maxSourceDimension = 16_384
    private static let maxSourcePixels = 64_000_000
    private static let maxThumbnailDimension = 2_400
    private static let maxLines = 100
    private static let maxLineUTF16Units = 1_000
    // Small label crops (one bottle of a group photo, a packshot) read better at twice the size (286).
    private static let enlargeBelowDimension = 1_200
    // A label far away or in low light covers a small part of the photo; its text is read again from
    // an enlarged crop (131: plazablanca carta, low-light 98 -> 104 right first, others unchanged or better).
    private static let cropBelowTextArea: CGFloat = 0.10
    private static let maxCropScale = 3.0
    private static let enlargeContext = CIContext(options: [.useSoftwareRenderer: true, .cacheIntermediates: false])

    private enum Failure: String, Error {
        case invalidRequestID = "INVALID_REQUEST_ID"
        case invalidImage = "INVALID_IMAGE"
        case invalidBase64 = "INVALID_BASE64"
        case imageTooLarge = "IMAGE_TOO_LARGE"
        case unsupportedFormat = "UNSUPPORTED_IMAGE_FORMAT"
        case typeMismatch = "IMAGE_TYPE_MISMATCH"
        case dimensionLimit = "IMAGE_DIMENSION_LIMIT"
        case decodeFailed = "IMAGE_DECODE_FAILED"
        case unavailable = "OCR_UNAVAILABLE"
        case recognitionFailed = "OCR_FAILED"
        case busy = "BUSY"
        case cancelled = "CANCELLED"
        case timeout = "TIMEOUT"

        var message: String {
            switch self {
            case .invalidRequestID: return "A UUID requestId is required."
            case .invalidImage: return "An image data URL is required."
            case .invalidBase64: return "The image encoding is invalid."
            case .imageTooLarge: return "The image exceeds the input size limit."
            case .unsupportedFormat: return "Only single-frame JPEG and PNG images are supported."
            case .typeMismatch: return "The declared and detected image formats differ."
            case .dimensionLimit: return "The image exceeds the dimension or pixel limit."
            case .decodeFailed: return "The image could not be decoded."
            case .unavailable: return "Compatible device text recognition is unavailable."
            case .recognitionFailed: return "Device text recognition failed."
            case .busy: return "The OCR worker is occupied."
            case .cancelled: return "The OCR request was cancelled."
            case .timeout: return "The OCR request exceeded its deadline."
            }
        }
    }

    private enum Outcome {
        case success(PluginCallResultData)
        case failure(Failure)
    }

    // All mutable job fields and activeJob are protected by stateLock.
    private final class Job {
        let id: UUID
        let requestID: String
        let started: DispatchTime
        let deadline: DispatchTime
        var call: CAPPluginCall?
        var request: VNRecognizeTextRequest?
        var timer: DispatchSourceTimer?

        init(id: UUID, requestID: String, call: CAPPluginCall, started: DispatchTime) {
            self.id = id
            self.requestID = requestID
            self.call = call
            self.started = started
            self.deadline = started + .seconds(20)
        }
    }

    private let stateLock = NSLock()
    private let workerQueue = DispatchQueue(label: "matchrim.ocr106.worker", qos: .utility)
    private let deadlineQueue = DispatchQueue(label: "matchrim.ocr106.deadline", qos: .userInitiated)
    private var activeJob: Job?

    @objc public func recognize(_ call: CAPPluginCall) {
        let started = DispatchTime.now()
        guard let requestID = call.getString("requestId"), let id = Self.uuid(requestID) else {
            call.reject(Failure.invalidRequestID.message, Failure.invalidRequestID.rawValue)
            return
        }
        guard let image = call.getString("image") else {
            call.reject(Failure.invalidImage.message, Failure.invalidImage.rawValue)
            return
        }

        stateLock.lock()
        guard activeJob == nil else {
            stateLock.unlock()
            call.reject(Failure.busy.message, Failure.busy.rawValue)
            return
        }
        let job = Job(id: id, requestID: requestID, call: call, started: started)
        let timer = DispatchSource.makeTimerSource(queue: deadlineQueue)
        timer.schedule(deadline: job.deadline, leeway: .nanoseconds(0))
        timer.setEventHandler { [weak self, weak job] in
            guard let self = self, let job = job else { return }
            self.settle(job, as: .failure(.timeout))
        }
        job.timer = timer
        activeJob = job
        timer.resume()
        stateLock.unlock()

        workerQueue.async {
            autoreleasepool {
                self.run(job, image: image)
            }
            self.releaseWorker(job)
        }
    }

    @objc public func cancel(_ call: CAPPluginCall) {
        guard let requestID = call.getString("requestId"), let id = Self.uuid(requestID) else {
            call.reject(Failure.invalidRequestID.message, Failure.invalidRequestID.rawValue)
            return
        }
        stateLock.lock()
        let job = activeJob?.id == id ? activeJob : nil
        stateLock.unlock()

        var cancelled = false
        if let job = job, case .failure(.cancelled)? = settle(job, as: .failure(.cancelled)) {
            cancelled = true
        }
        call.resolve(["requestId": requestID, "cancelled": cancelled])
    }

    private static func uuid(_ value: String) -> UUID? {
        guard value.utf8.prefix(37).count == 36 else { return nil }
        return UUID(uuidString: value)
    }

    private func checkpoint(_ job: Job) throws {
        stateLock.lock()
        let live = activeJob === job && job.call != nil
        let expired = DispatchTime.now().uptimeNanoseconds >= job.deadline.uptimeNanoseconds
        stateLock.unlock()
        guard live else { throw Failure.cancelled }
        guard !expired else { throw Failure.timeout }
    }

    private func attach(_ request: VNRecognizeTextRequest, to job: Job) throws {
        stateLock.lock()
        let live = activeJob === job && job.call != nil
        let expired = DispatchTime.now().uptimeNanoseconds >= job.deadline.uptimeNanoseconds
        if live && !expired {
            job.request = request
        }
        stateLock.unlock()
        guard live && !expired else {
            request.cancel()
            throw expired ? Failure.timeout : Failure.cancelled
        }
    }

    // Claim settlement under the lock; neither Vision nor bridge callbacks run under it.
    // Keep the worker reserved until the queued/decode/Vision block actually exits.
    @discardableResult
    private func settle(_ job: Job, as proposed: Outcome) -> Outcome? {
        stateLock.lock()
        guard activeJob === job, let call = job.call else {
            stateLock.unlock()
            return nil
        }
        let outcome: Outcome = DispatchTime.now().uptimeNanoseconds >= job.deadline.uptimeNanoseconds
            ? .failure(.timeout) : proposed
        job.call = nil
        let timer = job.timer
        job.timer = nil
        let request = job.request
        stateLock.unlock()

        timer?.cancel()
        switch outcome {
        case .success(let result):
            call.resolve(result)
        case .failure(let failure):
            call.reject(failure.message, failure.rawValue)
            request?.cancel()
        }
        return outcome
    }

    private func releaseWorker(_ job: Job) {
        stateLock.lock()
        if activeJob === job {
            job.request = nil
            activeJob = nil
        }
        stateLock.unlock()
    }

    private func run(_ job: Job, image: String) {
        do {
            try checkpoint(job)
            let thumbnail = Self.enlargedForText(try decode(image, for: job))
            try checkpoint(job)
            let request = try makeRequest()
            try attach(request, to: job)
            try checkpoint(job)
            do {
                try VNImageRequestHandler(cgImage: thumbnail, orientation: .up, options: [:]).perform([request])
            } catch {
                throw Failure.recognitionFailed
            }
            try checkpoint(job)
            var observed = (request.results ?? []).map { ($0, CGRect(x: 0, y: 0, width: 1, height: 1)) }
            if let crop = Self.textCrop(observed.map { $0.0.boundingBox }, in: thumbnail) {
                try checkpoint(job)
                let second = try makeRequest()
                try attach(second, to: job)
                do {
                    try VNImageRequestHandler(cgImage: crop.image, orientation: .up, options: [:]).perform([second])
                    observed += (second.results ?? []).map { ($0, crop.region) }
                } catch {
                    // The first reading stands on its own; the crop only adds text.
                }
                try checkpoint(job)
            }
            var lines: [[String: Any]] = [], seen = Set<String>()
            for (observation, region) in observed where lines.count < Self.maxLines {
                try checkpoint(job)
                let rectangle = observation.boundingBox
                guard let candidate = observation.topCandidates(1).first,
                      let box = Self.topLeftBox(CGRect(x: region.minX + rectangle.minX * region.width, y: region.minY + rectangle.minY * region.height,
                                                        width: rectangle.width * region.width, height: rectangle.height * region.height)) else { continue }
                let text = Self.boundedText(candidate.string)
                guard !text.isEmpty, seen.insert(text).inserted else { continue }
                let confidence = candidate.confidence.isFinite ? min(1, max(0, candidate.confidence)) : 0
                lines.append(["text": text, "confidence": Double(confidence), "box": box])
            }
            let totalMs = Double(DispatchTime.now().uptimeNanoseconds - job.started.uptimeNanoseconds) / 1_000_000
            settle(job, as: .success([
                "source": "apple-vision-device",
                "requestId": job.requestID,
                "width": thumbnail.width,
                "height": thumbnail.height,
                "totalMs": totalMs,
                "revision": request.revision,
                "customWords": [String](),
                "lines": lines
            ]))
        } catch let failure as Failure {
            settle(job, as: .failure(failure))
        } catch {
            settle(job, as: .failure(.recognitionFailed))
        }
    }

    private func decode(_ image: String, for job: Job) throws -> CGImage {
        guard image.utf8.prefix(Self.maxEncodedBytes + 1).count <= Self.maxEncodedBytes else {
            throw Failure.imageTooLarge
        }
        try checkpoint(job)
        let prefix: String
        let expectedType: String
        let signature: [UInt8]
        if image.hasPrefix("data:image/jpeg;base64,") {
            prefix = "data:image/jpeg;base64,"
            expectedType = "public.jpeg"
            signature = [0xff, 0xd8, 0xff]
        } else if image.hasPrefix("data:image/png;base64,") {
            prefix = "data:image/png;base64,"
            expectedType = "public.png"
            signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
        } else {
            throw Failure.unsupportedFormat
        }
        let payload = String(image.dropFirst(prefix.count))
        let encodedCount = payload.utf8.count
        guard encodedCount > 0, encodedCount % 4 == 0 else { throw Failure.invalidBase64 }
        guard encodedCount <= ((Self.maxDataBytes + 2) / 3) * 4 else { throw Failure.imageTooLarge }
        try checkpoint(job)
        guard let data = Data(base64Encoded: payload, options: []), !data.isEmpty else {
            throw Failure.invalidBase64
        }
        guard data.count <= Self.maxDataBytes else { throw Failure.imageTooLarge }
        try checkpoint(job)
        guard data.starts(with: signature) else { throw Failure.typeMismatch }
        let sourceOptions = [kCGImageSourceShouldCache as String: false] as CFDictionary
        guard let source = CGImageSourceCreateWithData(data as CFData, sourceOptions),
              let actualType = CGImageSourceGetType(source) else { throw Failure.decodeFailed }
        guard actualType as String == expectedType else { throw Failure.typeMismatch }
        guard CGImageSourceGetCount(source) == 1 else { throw Failure.unsupportedFormat }
        guard CGImageSourceGetStatus(source) == .statusComplete,
              let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, sourceOptions) as? [String: Any],
              let width = properties[kCGImagePropertyPixelWidth as String] as? NSNumber,
              let height = properties[kCGImagePropertyPixelHeight as String] as? NSNumber else {
            throw Failure.decodeFailed
        }
        let w = width.doubleValue
        let h = height.doubleValue
        guard w.isFinite, h.isFinite, w >= 1, h >= 1,
              w.rounded(.down) == w, h.rounded(.down) == h,
              w <= Double(Self.maxSourceDimension), h <= Double(Self.maxSourceDimension),
              w * h <= Double(Self.maxSourcePixels) else { throw Failure.dimensionLimit }
        try checkpoint(job)
        let options: [String: Any] = [
            kCGImageSourceCreateThumbnailFromImageAlways as String: true,
            kCGImageSourceCreateThumbnailWithTransform as String: true,
            kCGImageSourceThumbnailMaxPixelSize as String: Self.maxThumbnailDimension,
            kCGImageSourceShouldCache as String: false,
            kCGImageSourceShouldCacheImmediately as String: true,
            kCGImageSourceShouldAllowFloat as String: false
        ]
        guard let thumbnail = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) else {
            throw Failure.decodeFailed
        }
        try checkpoint(job)
        guard thumbnail.width > 0, thumbnail.height > 0,
              thumbnail.width <= Self.maxThumbnailDimension,
              thumbnail.height <= Self.maxThumbnailDimension else { throw Failure.dimensionLimit }
        return thumbnail
    }

    private static func enlargedForText(_ image: CGImage) -> CGImage {
        let longest = max(image.width, image.height)
        guard longest > 0, longest < enlargeBelowDimension else { return image }
        let scale = min(2.0, Double(maxThumbnailDimension) / Double(longest))
        let input = CIImage(cgImage: image)
        let flat = CIImage(color: CIColor(red: 1, green: 1, blue: 1)).cropped(to: input.extent)
        let output = input.composited(over: flat).applyingFilter("CILanczosScaleTransform",
            parameters: [kCIInputScaleKey: scale, kCIInputAspectRatioKey: 1.0])
        let extent = CGRect(x: 0, y: 0, width: (Double(image.width) * scale).rounded(.down), height: (Double(image.height) * scale).rounded(.down))
        guard extent.width >= 1, extent.height >= 1,
              let enlarged = enlargeContext.createCGImage(output, from: extent),
              enlarged.width <= maxThumbnailDimension, enlarged.height <= maxThumbnailDimension else { return image }
        return enlarged
    }

    // Union of the text found, with a 15% (+2%) margin, cropped and enlarged up to 3x within the 2,400 px bound.
    // Returns the crop and its normalized bottom-left region in the thumbnail, or nil when the text is not small.
    private static func textCrop(_ found: [CGRect], in image: CGImage) -> (image: CGImage, region: CGRect)? {
        guard var union = found.first(where: { $0.width > 0 && $0.height > 0 && $0.minX.isFinite && $0.maxY.isFinite }) else { return nil }
        for rectangle in found where rectangle.width > 0 && rectangle.height > 0 && rectangle.minX.isFinite && rectangle.maxY.isFinite {
            union = union.union(rectangle)
        }
        guard union.width * union.height < cropBelowTextArea else { return nil }
        let mx = union.width * 0.15 + 0.02, my = union.height * 0.15 + 0.02
        let minX = max(0, union.minX - mx), minY = max(0, union.minY - my)
        let region = CGRect(x: minX, y: minY, width: min(1, union.maxX + mx) - minX, height: min(1, union.maxY + my) - minY)
        let width = CGFloat(image.width), height = CGFloat(image.height)
        let pixels = CGRect(x: region.minX * width, y: (1 - region.maxY) * height, width: region.width * width, height: region.height * height).integral
        guard pixels.width >= 16, pixels.height >= 16, let cropped = image.cropping(to: pixels) else { return nil }
        let scale = min(maxCropScale, Double(maxThumbnailDimension) / Double(max(cropped.width, cropped.height)))
        // Vision boxes on the crop are normalized to the pixels actually cropped.
        let actual = CGRect(x: pixels.minX / width, y: 1 - pixels.maxY / height, width: pixels.width / width, height: pixels.height / height)
        guard scale > 1.05 else { return (cropped, actual) }
        let input = CIImage(cgImage: cropped)
        let output = input.applyingFilter("CILanczosScaleTransform", parameters: [kCIInputScaleKey: scale, kCIInputAspectRatioKey: 1.0])
        let extent = CGRect(x: 0, y: 0, width: (Double(cropped.width) * scale).rounded(.down), height: (Double(cropped.height) * scale).rounded(.down))
        guard extent.width <= CGFloat(maxThumbnailDimension), extent.height <= CGFloat(maxThumbnailDimension),
              let enlarged = enlargeContext.createCGImage(output, from: extent) else { return (cropped, actual) }
        return (enlarged, actual)
    }

    private func makeRequest() throws -> VNRecognizeTextRequest {
        let request = VNRecognizeTextRequest()
        var revisions = [VNRecognizeTextRequestRevision2, VNRecognizeTextRequestRevision1]
        if #available(iOS 16.0, *) {
            revisions.insert(VNRecognizeTextRequestRevision3, at: 0)
            request.automaticallyDetectsLanguage = false
        }
        guard let revision = revisions.first(where: { VNRecognizeTextRequest.supportedRevisions.contains(Int($0)) }) else {
            throw Failure.unavailable
        }
        request.revision = revision
        request.recognitionLevel = .accurate
        let supported: [String]
        do {
            if #available(iOS 15.0, *) {
                supported = try request.supportedRecognitionLanguages()
            } else {
                supported = try VNRecognizeTextRequest.supportedRecognitionLanguages(for: .accurate, revision: revision)
            }
        } catch {
            throw Failure.unavailable
        }
        guard let fallback = supported.first else { throw Failure.unavailable }
        let preferred = ["es-ES", "en-US", "fr-FR"].filter { supported.contains($0) }
        request.recognitionLanguages = preferred.isEmpty ? [fallback] : preferred
        request.usesLanguageCorrection = true
        request.customWords = []
        request.minimumTextHeight = 0
        request.preferBackgroundProcessing = true
        request.usesCPUOnly = true
        return request
    }

    private static func boundedText(_ value: String) -> String {
        var units = Array(value.utf16.prefix(maxLineUTF16Units))
        if let last = units.last, (0xd800...0xdbff).contains(last) {
            units.removeLast()
        }
        return String(decoding: units, as: UTF16.self).trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private static func topLeftBox(_ rectangle: CGRect) -> [String: Double]? {
        guard rectangle.minX.isFinite, rectangle.maxX.isFinite,
              rectangle.minY.isFinite, rectangle.maxY.isFinite,
              rectangle.width > 0, rectangle.height > 0 else { return nil }
        let x = min(1, max(0, Double(rectangle.minX)))
        let y = min(1, max(0, 1 - Double(rectangle.maxY)))
        let right = min(1, max(0, Double(rectangle.maxX)))
        let bottom = min(1, max(0, 1 - Double(rectangle.minY)))
        guard right > x, bottom > y else { return nil }
        return ["x": x, "y": y, "width": right - x, "height": bottom - y]
    }
}

// 133: the web file input ignores capture="environment" inside the app's web view and shows a
// Photo Library / Take Photo / Choose File menu; "Hacer foto" opens the camera directly instead.
// The photo stays on the device: it is returned to the page as a JPEG data URL, nothing is uploaded.
extension MatchrimOCRPlugin106: UIImagePickerControllerDelegate, UINavigationControllerDelegate {
    private static var pendingCameraCall: CAPPluginCall?
    private static let maxCameraDimension: CGFloat = 3_000

    @objc func takePhoto(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard UIImagePickerController.isSourceTypeAvailable(.camera), let presenter = self.bridge?.viewController else {
                call.reject("The camera is unavailable on this device.", "CAMERA_UNAVAILABLE"); return
            }
            guard Self.pendingCameraCall == nil else { call.reject("The camera is already open.", "BUSY"); return }
            Self.pendingCameraCall = call
            let picker = UIImagePickerController()
            picker.sourceType = .camera
            picker.cameraCaptureMode = .photo
            picker.delegate = self
            picker.modalPresentationStyle = .fullScreen
            // 134: present on the topmost controller; if presentation still fails, free the slot
            // so the camera is not reported BUSY until the app restarts.
            var top: UIViewController = presenter
            while let next = top.presentedViewController { top = next }
            top.present(picker, animated: true)
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                guard picker.presentingViewController == nil, Self.pendingCameraCall === call else { return }
                Self.pendingCameraCall = nil
                call.reject("The camera could not be shown.", "CAMERA_UNAVAILABLE")
            }
        }
    }

    public func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
        picker.dismiss(animated: true)
        Self.pendingCameraCall?.resolve(["status": "cancelled"])
        Self.pendingCameraCall = nil
    }

    public func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
        let image = info[.originalImage] as? UIImage
        picker.dismiss(animated: true)
        guard let call = Self.pendingCameraCall else { return }
        Self.pendingCameraCall = nil
        guard let image = image else { call.reject("The photo could not be read.", "CAMERA_FAILED"); return }
        DispatchQueue.global(qos: .userInitiated).async {
            guard let jpeg = Self.cameraJPEG(image) else { call.reject("The photo could not be encoded.", "CAMERA_FAILED"); return }
            call.resolve(["status": "captured", "image": "data:image/jpeg;base64," + jpeg.base64EncodedString()])
        }
    }

    // 152: «Pegar foto» read the clipboard from the web page, and on the phone that read came back empty with a
    // photo copied in Fotos. The system pasteboard is read here instead; iOS asks the person before handing it over,
    // and a refusal reads as an empty clipboard. The photo stays on the device, like one taken with the camera.
    @objc func pasteImage(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let board = UIPasteboard.general
            guard board.hasImages, let image = board.image, let data = Self.cameraJPEG(image) else { call.resolve(["status": "empty"]); return }
            call.resolve(["status": "captured", "image": "data:image/jpeg;base64," + data.base64EncodedString()])
        }
    }

    // 155: «Compartir → Matchrim». The share extension leaves one photo in the folder it shares with the app (the app
    // group). The app takes it once (the file is removed as it is read) and tells the page whenever it comes to the
    // front with a photo waiting. The photo stays on the phone, like one from the camera.
    private static let sharedGroup155 = "group.wine.matchrim.app"
    private static let sharedFile155 = "shared-photo155.jpg"
    private static var sharedURL155: URL? {
        FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: sharedGroup155)?.appendingPathComponent(sharedFile155)
    }

    override public func load() {
        NotificationCenter.default.addObserver(forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main) { [weak self] _ in
            guard let url = Self.sharedURL155, FileManager.default.fileExists(atPath: url.path) else { return }
            self?.notifyListeners("sharedImage", data: [:], retainUntilConsumed: true)
        }
    }

    @objc func takeSharedImage(_ call: CAPPluginCall) {
        guard let url = Self.sharedURL155, let data = try? Data(contentsOf: url) else { call.resolve(["status": "empty"]); return }
        try? FileManager.default.removeItem(at: url)
        guard data.count <= 16 * 1024 * 1024, UIImage(data: data) != nil else { call.resolve(["status": "empty"]); return }
        call.resolve(["status": "captured", "image": "data:image/jpeg;base64," + data.base64EncodedString()])
    }

    // Drawing applies the EXIF orientation, so the page always receives an upright image.
    private static func cameraJPEG(_ image: UIImage) -> Data? {
        let longest = max(image.size.width, image.size.height)
        guard longest > 0 else { return nil }
        let scale = min(1, maxCameraDimension / longest)
        let size = CGSize(width: floor(image.size.width * scale), height: floor(image.size.height * scale))
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        format.opaque = true
        let upright = UIGraphicsImageRenderer(size: size, format: format).image { _ in image.draw(in: CGRect(origin: .zero, size: size)) }
        return upright.jpegData(compressionQuality: 0.88)
    }
}

// 135: window.confirm in the iOS WebView shows Capacitor's fixed English "Cancel" / "Ok" buttons.
// This alert carries the app's own Spanish labels. Nothing leaves the device.
extension MatchrimOCRPlugin106 {
    @objc func confirm(_ call: CAPPluginCall) {
        let message = String((call.getString("message") ?? "").prefix(600))
        let ok = String((call.getString("ok") ?? "Aceptar").prefix(40))
        let cancel = String((call.getString("cancel") ?? "Cancelar").prefix(40))
        let destructive = call.getBool("destructive") ?? false
        DispatchQueue.main.async {
            guard let presenter = self.bridge?.viewController else { call.reject("No screen to show the dialog.", "UNAVAILABLE"); return }
            var top: UIViewController = presenter
            while let next = top.presentedViewController { top = next }
            let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: cancel, style: .cancel) { _ in call.resolve(["value": false]) })
            alert.addAction(UIAlertAction(title: ok, style: destructive ? .destructive : .default) { _ in call.resolve(["value": true]) })
            top.present(alert, animated: true)
        }
    }
}

// 143: the wine-list scanner paints each wine's score on the photo of the list and needs to know where every
// printed line is. `recognize` is made for one label: it keeps 100 lines and drops a text it has already seen, so
// on a list the second «18.00€» and the bottom of a long page are lost. This method reads one whole page once and
// returns every line with its box (fractions of the page, top-left origin, as `recognize`). `recognize`, its limits
// and its result are untouched; both share the single worker and the 20 s deadline. Nothing leaves the device.
extension MatchrimOCRPlugin106 {
    private static let maxPageLines143 = 400

    @objc func recognizeLines(_ call: CAPPluginCall) {
        let started = DispatchTime.now()
        guard let requestID = call.getString("requestId"), let id = Self.uuid(requestID) else {
            call.reject(Failure.invalidRequestID.message, Failure.invalidRequestID.rawValue)
            return
        }
        guard let image = call.getString("image") else {
            call.reject(Failure.invalidImage.message, Failure.invalidImage.rawValue)
            return
        }

        stateLock.lock()
        guard activeJob == nil else {
            stateLock.unlock()
            call.reject(Failure.busy.message, Failure.busy.rawValue)
            return
        }
        let job = Job(id: id, requestID: requestID, call: call, started: started)
        let timer = DispatchSource.makeTimerSource(queue: deadlineQueue)
        timer.schedule(deadline: job.deadline, leeway: .nanoseconds(0))
        timer.setEventHandler { [weak self, weak job] in
            guard let self = self, let job = job else { return }
            self.settle(job, as: .failure(.timeout))
        }
        job.timer = timer
        activeJob = job
        timer.resume()
        stateLock.unlock()

        workerQueue.async {
            autoreleasepool {
                self.runLines143(job, image: image)
            }
            self.releaseWorker(job)
        }
    }

    private func runLines143(_ job: Job, image: String) {
        do {
            try checkpoint(job)
            let page = try decode(image, for: job)
            try checkpoint(job)
            let request = try makeRequest()
            try attach(request, to: job)
            try checkpoint(job)
            do {
                try VNImageRequestHandler(cgImage: page, orientation: .up, options: [:]).perform([request])
            } catch {
                throw Failure.recognitionFailed
            }
            try checkpoint(job)
            var lines: [[String: Any]] = []
            for observation in request.results ?? [] where lines.count < Self.maxPageLines143 {
                guard let candidate = observation.topCandidates(1).first,
                      let box = Self.topLeftBox(observation.boundingBox) else { continue }
                let text = Self.boundedText(candidate.string)
                guard !text.isEmpty else { continue }
                let confidence = candidate.confidence.isFinite ? min(1, max(0, candidate.confidence)) : 0
                lines.append(["text": text, "confidence": Double(confidence), "box": box])
            }
            let totalMs = Double(DispatchTime.now().uptimeNanoseconds - job.started.uptimeNanoseconds) / 1_000_000
            settle(job, as: .success([
                "source": "apple-vision-device-lines",
                "requestId": job.requestID,
                "width": page.width,
                "height": page.height,
                "totalMs": totalMs,
                "revision": request.revision,
                "lines": lines
            ]))
        } catch let failure as Failure {
            settle(job, as: .failure(failure))
        } catch {
            settle(job, as: .failure(.recognitionFailed))
        }
    }
}
