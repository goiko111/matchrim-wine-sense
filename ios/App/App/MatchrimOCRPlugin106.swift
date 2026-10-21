import Foundation
import Capacitor
import CoreGraphics
import ImageIO
import Vision

@objc(MatchrimOCRPlugin106)
public final class MatchrimOCRPlugin106: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "MatchrimOCRPlugin106"
    public let jsName = "MatchrimOCR"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "recognize", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancel", returnType: CAPPluginReturnPromise)
    ]

    private static let maxEncodedBytes = 18 * 1024 * 1024
    private static let maxDataBytes = 12 * 1024 * 1024
    private static let maxSourceDimension = 16_384
    private static let maxSourcePixels = 64_000_000
    private static let maxThumbnailDimension = 2_400
    private static let maxLines = 100
    private static let maxLineUTF16Units = 1_000

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
            let thumbnail = try decode(image, for: job)
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
            var lines: [[String: Any]] = []
            for observation in (request.results ?? []).prefix(Self.maxLines) {
                try checkpoint(job)
                guard let candidate = observation.topCandidates(1).first,
                      let box = Self.topLeftBox(observation.boundingBox) else { continue }
                let text = Self.boundedText(candidate.string)
                guard !text.isEmpty else { continue }
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
