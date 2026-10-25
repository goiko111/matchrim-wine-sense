import Foundation
import Vision
import ImageIO
import CryptoKit

struct Config207: Decodable {
    let input: String; let sha256: String; let output: String
    let owner: String; let leaseId: String; let stopEpoch: Double
    let languageCorrection: Bool
    let manualRegion: [Double]?
}
struct Failure207: Error { let message: String }
func require207(_ condition: Bool, _ message: String) throws {
    if !condition { throw Failure207(message: message) }
}
func gate207(_ config: Config207) throws {
    let bytes = try Data(contentsOf: URL(fileURLWithPath: "/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json"))
    let book = try JSONSerialization.jsonObject(with: bytes) as? [String: Any]
    let lease = (book?["leases"] as? [String: Any])?["heavy-local"] as? [String: Any]
    let now = Date().timeIntervalSince1970
    try require207(config.owner == "019f9da7-ae96-7c60-a1b4-fafb75b04d6d" && lease?["owner"] as? String == config.owner
        && lease?["leaseId"] as? String == config.leaseId && (lease?["reviewAfter"] as? Double ?? 0) > now + 5
        && config.stopEpoch > now + 5, "OWN_LIVE_LEASE_REQUIRED")
}
do {
    try require207(CommandLine.arguments.count == 2, "CONFIG_REQUIRED")
    let config = try JSONDecoder().decode(Config207.self, from: Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1])))
    try gate207(config)
    let bytes = try Data(contentsOf: URL(fileURLWithPath: config.input))
    let hash = SHA256.hash(data: bytes).map { String(format: "%02x", $0) }.joined()
    try require207(bytes.count < 12 * 1024 * 1024 && hash == config.sha256, "SOURCE_HASH_OR_SIZE")
    guard let source = CGImageSourceCreateWithData(bytes as CFData, nil), CGImageSourceGetCount(source) == 1,
        let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [String: Any],
        let width = properties[kCGImagePropertyPixelWidth as String] as? Int,
        let height = properties[kCGImagePropertyPixelHeight as String] as? Int else { throw Failure207(message: "IMAGE_INVALID") }
    try require207(width > 0 && height > 0 && width <= 16384 && height <= 16384 && width * height <= 64_000_000, "PIXEL_LIMIT")
    guard let thumbnail = CGImageSourceCreateThumbnailAtIndex(source, 0, [
        kCGImageSourceCreateThumbnailFromImageAlways: true, kCGImageSourceCreateThumbnailWithTransform: true,
        kCGImageSourceThumbnailMaxPixelSize: 2400, kCGImageSourceShouldCache: false
    ] as CFDictionary) else { throw Failure207(message: "DECODE_FAILED") }
    let image: CGImage
    if let region = config.manualRegion {
        try require207(region.count == 4 && region.allSatisfy { $0.isFinite && $0 >= 0 && $0 <= 1 }
            && region[2] > 0 && region[3] > 0 && region[0] + region[2] <= 1 && region[1] + region[3] <= 1, "REGION_INVALID")
        let rectangle = CGRect(x: region[0] * Double(thumbnail.width), y: region[1] * Double(thumbnail.height),
            width: region[2] * Double(thumbnail.width), height: region[3] * Double(thumbnail.height)).integral
        guard let cropped = thumbnail.cropping(to: rectangle) else { throw Failure207(message: "CROP_FAILED") }
        image = cropped
    } else { image = thumbnail }
    let request = VNRecognizeTextRequest()
    request.revision = VNRecognizeTextRequestRevision3
    request.recognitionLevel = .accurate
    request.automaticallyDetectsLanguage = false
    let supported = try request.supportedRecognitionLanguages()
    request.recognitionLanguages = ["es-ES", "en-US", "fr-FR"].filter { supported.contains($0) }
    request.usesLanguageCorrection = config.languageCorrection
    request.customWords = []
    request.minimumTextHeight = 0
    request.preferBackgroundProcessing = true
    request.usesCPUOnly = true
    try gate207(config)
    let start = DispatchTime.now().uptimeNanoseconds
    try VNImageRequestHandler(cgImage: image, orientation: .up, options: [:]).perform([request])
    let elapsed = Double(DispatchTime.now().uptimeNanoseconds - start) / 1_000_000
    try gate207(config)
    let lines: [[String: Any]] = (request.results ?? []).compactMap { observation in
        guard let text = observation.topCandidates(1).first else { return nil }
        let box = observation.boundingBox
        return ["text": text.string, "confidence": text.confidence,
            "box": ["x": box.minX, "y": 1 - box.maxY, "width": box.width, "height": box.height]]
    }
    let result: [String: Any] = ["source": "apple-vision-macos", "sourceSHA256": hash, "width": image.width,
        "height": image.height, "revision": request.revision, "recognitionLanguages": request.recognitionLanguages,
        "customWords": [], "lines": lines, "totalMs": elapsed, "providerCalls": 0, "iPhonePluginExecuted": false,
        "languageCorrection": config.languageCorrection, "manualRegion": config.manualRegion as Any? ?? NSNull()]
    try JSONSerialization.data(withJSONObject: result, options: [.sortedKeys, .prettyPrinted, .withoutEscapingSlashes])
        .write(to: URL(fileURLWithPath: config.output + "/OCR.json"), options: [.withoutOverwriting])
    print("Local Apple Vision macOS: \(lines.count) lines, \(elapsed) ms")
} catch { FileHandle.standardError.write(Data("\(error)\n".utf8)); exit(1) }
