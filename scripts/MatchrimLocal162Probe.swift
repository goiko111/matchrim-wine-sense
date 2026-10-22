import Foundation
import Capacitor

// Diagnosis only: the unmodified production plugin reads one original image.
@main
struct MatchrimLocal162Probe {
    final class Completion {
        private let lock = NSLock()
        private var value: [String: Any]?
        private var count = 0
        func finish(_ result: [String: Any]) {
            lock.lock(); defer { lock.unlock() }
            value = result; count += 1
        }
        func read() -> ([String: Any]?, Int) {
            lock.lock(); defer { lock.unlock() }; return (value, count)
        }
    }
    static func main() throws {
        guard CommandLine.arguments.count == 2 else { fatalError("Exactly one local image required") }
        let url = URL(fileURLWithPath: CommandLine.arguments[1])
        let data = try Data(contentsOf: url)
        guard data.count <= 12 * 1024 * 1024 else { fatalError("Input bound exceeded") }
        let mime: String
        if data.starts(with: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) { mime = "image/png" }
        else if data.starts(with: [0xff, 0xd8, 0xff]) { mime = "image/jpeg" }
        else { fatalError("Unsupported image signature") }
        let completion = Completion(), request = UUID().uuidString
        guard let call = CAPPluginCall(callbackId: UUID().uuidString, methodName: "recognize",
            options: ["requestId": request, "image": "data:\(mime);base64," + data.base64EncodedString()],
            success: { result, _ in completion.finish(["ok": true, "data": result?.data ?? [:]]) },
            error: { error in completion.finish(["ok": false, "code": error?.code ?? "UNKNOWN"]) })
        else { fatalError("Plugin call could not be created") }
        let plugin = MatchrimOCRPlugin106()
        plugin.recognize(call)
        let deadline = Date().addingTimeInterval(25)
        while completion.read().0 == nil && Date() < deadline {
            RunLoop.current.run(until: Date().addingTimeInterval(0.01))
        }
        RunLoop.current.run(until: Date().addingTimeInterval(0.2))
        let (response, count) = completion.read()
        let output: [String: Any] = ["file": url.lastPathComponent, "requestId": request,
            "settlements": count, "response": response ?? ["ok": false, "code": "PROBE_TIMEOUT"],
            "networkRequestsIssuedByProbe": 0, "expectedMetadataProvided": false,
            "scope": "original image and unchanged production plugin; not gallery preparation or a new save"]
        FileHandle.standardOutput.write(try JSONSerialization.data(withJSONObject: output, options: [.sortedKeys]))
        FileHandle.standardOutput.write(Data("\n".utf8))
    }
}
