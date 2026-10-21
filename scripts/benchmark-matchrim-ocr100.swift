import Foundation
import Vision
import ImageIO
import CryptoKit

struct Input: Decodable { let imageId: String; let path: String; let sha256: String; let sourceSHA256: String }
struct Config: Decodable { let inputs: [Input]; let output: String; let owner: String; let leaseId: String; let stopEpoch: Double }
struct Failure: Error { let message: String }
func require(_ value: Bool, _ message: String) throws { if !value { throw Failure(message: message) } }
func digest(_ bytes: Data) -> String { SHA256.hash(data: bytes).map { String(format: "%02x", $0) }.joined() }
func gate(_ config: Config) throws {
    let now = Date().timeIntervalSince1970
    let data = try Data(contentsOf: URL(fileURLWithPath: "/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json"))
    let book = try JSONSerialization.jsonObject(with: data) as? [String: Any]
    let lease = (book?["leases"] as? [String: Any])?["heavy-local"] as? [String: Any]
    try require(config.owner == "019f9da7-ae96-7c60-a1b4-fafb75b04d6d" && lease?["owner"] as? String == config.owner
        && lease?["leaseId"] as? String == config.leaseId && (lease?["reviewAfter"] as? Double ?? 0) > now + 5
        && config.stopEpoch > now + 5, "OWN_LIVE_LEASE_REQUIRED")
}
func box(_ rectangle: CGRect) -> [String: Any] {
    ["bottomLeft": ["x": rectangle.minX, "y": rectangle.minY, "width": rectangle.width, "height": rectangle.height]]
}
do {
    try require(CommandLine.arguments.count == 2, "CONFIG_REQUIRED")
    let config = try JSONDecoder().decode(Config.self, from: Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1])))
    try require(config.inputs.count == 200 && Set(config.inputs.map { $0.imageId }).count == 200, "EXACT200_REQUIRED")
    for input in config.inputs {
        try gate(config)
        try require(input.path == config.output + "/prepared/" + input.imageId + ".jpg", "PREPARED_PATH_REQUIRED")
        try require(URL(fileURLWithPath: input.path).resolvingSymlinksInPath().path == input.path, "NO_PATH_ALIAS")
        let start = DispatchTime.now().uptimeNanoseconds
        let bytes = try Data(contentsOf: URL(fileURLWithPath: input.path))
        try require(bytes.count < 25 * 1024 * 1024 && digest(bytes) == input.sha256, "PREPARED_HASH_MISMATCH")
        guard let source = CGImageSourceCreateWithData(bytes as CFData, nil),
              let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else { throw Failure(message: "JPEG_DECODE") }
        try require(image.width * image.height <= 64_000_000, "PIXEL_LIMIT")
        let request = VNRecognizeTextRequest()
        request.revision = VNRecognizeTextRequestRevision3
        request.recognitionLevel = .accurate
        request.recognitionLanguages = ["es-ES", "en-US", "fr-FR"]
        request.usesLanguageCorrection = true
        request.automaticallyDetectsLanguage = false
        request.customWords = []
        request.minimumTextHeight = 0
        request.preferBackgroundProcessing = true
        request.usesCPUOnly = true
        try VNImageRequestHandler(cgImage: image, orientation: .up, options: [:]).perform([request])
        var lines: [[String: Any]] = [], tokens: [[String: Any]] = []
        for (index, observation) in (request.results ?? []).enumerated() {
            guard let top = observation.topCandidates(1).first else { continue }
            lines.append(["index": index, "text": top.string, "confidence": top.confidence, "box": box(observation.boundingBox)])
            top.string.enumerateSubstrings(in: top.string.startIndex..<top.string.endIndex, options: [.byWords]) { word, _, _, _ in
                if let word = word { tokens.append(["index": tokens.count, "text": word, "lineIndex": index]) }
            }
        }
        let row: [String: Any] = ["imageId": input.imageId, "status": "ok", "lines": lines, "tokens": tokens,
            "preparedSHA256": input.sha256, "sourceSHA256": input.sourceSHA256, "width": image.width, "height": image.height,
            "hashMatches": true, "totalMs": Double(DispatchTime.now().uptimeNanoseconds - start) / 1_000_000,
            "engine": "Apple Vision revision3 accurate", "customWords": [], "providerCalls": 0]
        let data = try JSONSerialization.data(withJSONObject: row, options: [.sortedKeys, .prettyPrinted, .withoutEscapingSlashes])
        try data.write(to: URL(fileURLWithPath: config.output + "/raw/" + input.imageId + ".json"), options: [.withoutOverwriting])
        print("\(input.imageId) \(lines.count) lines")
        fflush(stdout)
    }
} catch { FileHandle.standardError.write(Data("\(error)\n".utf8)); exit(1) }
