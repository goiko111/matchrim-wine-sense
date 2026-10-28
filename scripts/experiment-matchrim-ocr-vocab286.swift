// Experiment 286: same Vision settings as vision-ocr285.swift plus (a) the known list's vocabulary as
// customWords and (b) a Lanczos upscale before recognition. Offline; no lease gate; skips existing outputs.
import Foundation
import Vision
import ImageIO
import CryptoKit
import CoreImage

struct Input: Decodable { let imageId: String; let path: String; let sha256: String }
struct Config: Decodable { let inputs: [Input]; let output: String; let budgetSeconds: Double; let customWords: [String]; let scale: Double }
struct Failure: Error { let message: String }
func require(_ value: Bool, _ message: String) throws { if !value { throw Failure(message: message) } }
func digest(_ bytes: Data) -> String { SHA256.hash(data: bytes).map { String(format: "%02x", $0) }.joined() }
func box(_ rectangle: CGRect) -> [String: Any] {
    ["bottomLeft": ["x": rectangle.minX, "y": rectangle.minY, "width": rectangle.width, "height": rectangle.height]]
}
do {
    try require(CommandLine.arguments.count == 2, "CONFIG_REQUIRED")
    let config = try JSONDecoder().decode(Config.self, from: Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1])))
    try require(Set(config.inputs.map { $0.imageId }).count == config.inputs.count, "UNIQUE_IDS_REQUIRED")
    let began = Date()
    let context = CIContext(options: [.useSoftwareRenderer: true])
    for input in config.inputs {
        if Date().timeIntervalSince(began) > config.budgetSeconds { print("BUDGET_EXHAUSTED before \(input.imageId)"); break }
        let target = URL(fileURLWithPath: config.output + "/" + input.imageId + ".json")
        if FileManager.default.fileExists(atPath: target.path) { print("\(input.imageId) exists"); continue }
        let start = DispatchTime.now().uptimeNanoseconds
        let bytes = try Data(contentsOf: URL(fileURLWithPath: input.path))
        try require(bytes.count < 25 * 1024 * 1024 && digest(bytes) == input.sha256, "HASH_MISMATCH " + input.imageId)
        guard let source = CGImageSourceCreateWithData(bytes as CFData, nil),
              let decoded = CGImageSourceCreateImageAtIndex(source, 0, nil) else { throw Failure(message: "DECODE " + input.imageId) }
        var image = decoded
        if config.scale > 1 {
            let flat = CIImage(color: CIColor(red: 1, green: 1, blue: 1)).cropped(to: CIImage(cgImage: decoded).extent)
            let up = CIImage(cgImage: decoded).composited(over: flat).applyingFilter("CILanczosScaleTransform", parameters: [kCIInputScaleKey: config.scale, kCIInputAspectRatioKey: 1])
            image = context.createCGImage(up, from: up.extent)!
        }
        try require(image.width * image.height <= 64_000_000, "PIXEL_LIMIT")
        let request = VNRecognizeTextRequest()
        request.revision = VNRecognizeTextRequestRevision3
        request.recognitionLevel = .accurate
        request.recognitionLanguages = ["es-ES", "en-US", "fr-FR"]
        request.usesLanguageCorrection = true
        request.automaticallyDetectsLanguage = false
        request.customWords = config.customWords
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
            "sourceSHA256": input.sha256, "width": image.width, "height": image.height, "hashMatches": true,
            "totalMs": Double(DispatchTime.now().uptimeNanoseconds - start) / 1_000_000,
            "engine": "Apple Vision revision3 accurate", "customWords": config.customWords.count, "scale": config.scale, "providerCalls": 0]
        let data = try JSONSerialization.data(withJSONObject: row, options: [.sortedKeys, .prettyPrinted, .withoutEscapingSlashes])
        try data.write(to: target, options: [.withoutOverwriting])
        print("\(input.imageId) \(lines.count) lines")
        fflush(stdout)
    }
} catch { FileHandle.standardError.write(Data("\(error)\n".utf8)); exit(1) }
