import Foundation
import Capacitor

@main
struct MatchrimOCR106Probe {
    final class Completion {
        let lock = NSLock()
        var value: [String: Any]?
        var count = 0
        func finish(_ value: [String: Any]) {
            lock.lock(); self.value = value; count += 1; lock.unlock()
        }
        func read() -> ([String: Any]?, Int) {
            lock.lock(); defer { lock.unlock() }; return (value, count)
        }
    }

    static func call(_ method: String, _ options: [String: Any], _ completion: Completion) -> CAPPluginCall {
        CAPPluginCall(callbackId: UUID().uuidString, methodName: method, options: options,
            success: { result, _ in completion.finish(["ok": true, "data": result?.data ?? [:]]) },
            error: { error in completion.finish(["ok": false, "code": error?.code ?? "UNKNOWN"]) })
    }

    static func wait(_ completion: Completion) -> [String: Any] {
        let deadline = Date().addingTimeInterval(25)
        while completion.read().0 == nil && Date() < deadline {
            RunLoop.current.run(until: Date().addingTimeInterval(0.01))
        }
        let (value, count) = completion.read()
        return ["response": value ?? ["ok": false, "code": "PROBE_TIMEOUT"], "settlements": count]
    }

    static func main() throws {
        let plugin = MatchrimOCRPlugin106()
        var results: [[String: Any]] = []
        for file in CommandLine.arguments.dropFirst() {
            let data = try Data(contentsOf: URL(fileURLWithPath: file))
            let image = "data:image/jpeg;base64," + data.base64EncodedString()
            let completion = Completion(), id = UUID().uuidString
            plugin.recognize(call("recognize", ["requestId": id, "image": image], completion))
            var output = wait(completion)
            output["file"] = URL(fileURLWithPath: file).lastPathComponent
            output["requestId"] = id
            results.append(output)
            RunLoop.current.run(until: Date().addingTimeInterval(0.05))
        }
        for (label, options) in [
            ("invalid-id", ["requestId": "bad", "image": "data:image/jpeg;base64,AA=="]),
            ("invalid-base64", ["requestId": UUID().uuidString, "image": "data:image/jpeg;base64,%%=="]),
            ("wrong-signature", ["requestId": UUID().uuidString, "image": "data:image/jpeg;base64,AAAA"])
        ] {
            let completion = Completion()
            plugin.recognize(call("recognize", options, completion))
            var output = wait(completion); output["case"] = label; results.append(output)
            RunLoop.current.run(until: Date().addingTimeInterval(0.05))
        }
        if let file = CommandLine.arguments.dropFirst().first {
            let image = "data:image/jpeg;base64," + (try Data(contentsOf: URL(fileURLWithPath: file))).base64EncodedString()
            let first = Completion(), second = Completion(), cancel = Completion(), id = UUID().uuidString
            plugin.recognize(call("recognize", ["requestId": id, "image": image], first))
            plugin.recognize(call("recognize", ["requestId": UUID().uuidString, "image": image], second))
            plugin.cancel(call("cancel", ["requestId": id], cancel))
            results.append(["case": "busy", "result": wait(second)])
            results.append(["case": "cancel", "result": wait(first), "ack": wait(cancel)])
            RunLoop.current.run(until: Date().addingTimeInterval(0.2))
            results.append(["case": "late-settlement", "count": first.read().1])
        }
        let output = try JSONSerialization.data(withJSONObject: ["results": results], options: [.sortedKeys])
        FileHandle.standardOutput.write(output)
        FileHandle.standardOutput.write(Data("\n".utf8))
    }
}
