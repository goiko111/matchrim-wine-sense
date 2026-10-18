import Foundation
import XCTest
import Vision

// Parent compiles this file only into a separate QA95 UI-test target. No custom
// XCUIApplication.openURL API or AppDelegate hook is assumed. The QA app's
// Capacitor server.url must be exactly http://127.0.0.1:4605. Run with one worker.
// Required runner environment: QA95_ENABLE_NATIVE_SYNTHETIC=YES and
// QA95_MANIFEST_SHA256=<freeze command's exact manifest file SHA256>.
// Server --limit-profiles 5 (default) selects 0,31,32,40,49; 50 selects all 0...49.
private enum QA95Failure: Error { case failed(String) }

private final class QA95NoRedirects: NSObject, URLSessionTaskDelegate {
    func urlSession(_ session: URLSession, task: URLSessionTask,
                    willPerformHTTPRedirection response: HTTPURLResponse,
                    newRequest request: URLRequest,
                    completionHandler: @escaping (URLRequest?) -> Void) {
        completionHandler(nil)
    }
}

private final class QA95ResponseBox: @unchecked Sendable {
    private let lock = NSLock()
    private var value: (Data?, Int?, Error?) = (nil, nil, nil)

    func set(_ data: Data?, _ status: Int?, _ error: Error?) {
        lock.lock(); defer { lock.unlock() }
        value = (data, status, error)
    }

    func get() -> (Data?, Int?, Error?) {
        lock.lock(); defer { lock.unlock() }
        return value
    }
}

final class Matchrim95NativeSyntheticTests: XCTestCase {
    private let bundle = "wine.matchrim.qa95synthetic"
    private let ownedSimulator = "B18822EF-BFBD-4A6A-89B2-33539BDE4127"
    private let origin = "http://127.0.0.1:4605"
    private let axes = ["potente", "acidez", "dulce", "tanico", "afrutado"]
    // Independent frozen quiz oracle, never imported from the product bundle.
    private let weights = [
        [0,2,0,0,1], [2,0,0,2,0], [2,0,0,2,0], [0,0,2,0,2],
        [2,0,0,2,0], [2,1,0,2,0], [0,2,0,0,0], [2,0,0,2,0],
        [0,0,2,0,2], [1,0,1,1,1], [2,0,0,2,0], [1,0,1,1,0],
        [1,0,2,1,0], [1,0,2,1,0], [0,1,0,0,1], [0,0,2,0,2],
        [0,2,0,0,0], [0,2,0,0,0], [2,0,0,1,0], [0,2,2,0,1]
    ]

    private func ensure(_ condition: Bool, _ message: String,
                        file: StaticString = #filePath, line: UInt = #line) throws {
        guard condition else {
            XCTFail(message, file: file, line: line)
            throw QA95Failure.failed(message)
        }
    }

    private func control(_ path: String, _ payload: [String: Any]? = nil) throws -> [String: Any] {
        try ensure(path.hasPrefix("/__qa95/") && !path.contains("?") && !path.contains(".."), "Fixed QA control path only")
        let url = URL(string: origin + path)!
        try ensure(url.scheme == "http" && url.host == "127.0.0.1" && url.port == 4605, "No external control URL")
        let configuration = URLSessionConfiguration.ephemeral
        configuration.connectionProxyDictionary = [:]
        configuration.httpCookieStorage = nil
        configuration.httpShouldSetCookies = false
        configuration.urlCache = nil
        configuration.timeoutIntervalForRequest = 5
        configuration.timeoutIntervalForResource = 8
        let session = URLSession(configuration: configuration, delegate: QA95NoRedirects(), delegateQueue: nil)
        defer { session.invalidateAndCancel() }
        var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData)
        request.httpMethod = payload == nil ? "GET" : "POST"
        request.setValue(bundle, forHTTPHeaderField: "X-QA95-Control")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let payload = payload { request.httpBody = try JSONSerialization.data(withJSONObject: payload) }
        let finished = DispatchSemaphore(value: 0)
        let box = QA95ResponseBox()
        session.dataTask(with: request) { bytes, response, error in
            box.set(bytes, (response as? HTTPURLResponse)?.statusCode, error)
            finished.signal()
        }.resume()
        try ensure(finished.wait(timeout: .now() + 10) == .success, "Loopback control timed out")
        let (data, status, failure) = box.get()
        if let failure = failure { throw failure }
        try ensure(status == 200, "QA95 control rejected \(path): \(status ?? -1)")
        guard let data = data,
              let value = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw QA95Failure.failed("Invalid control JSON")
        }
        return value
    }

    private func receipt(until condition: ([String: Any]) -> Bool) throws -> [String: Any] {
        let deadline = Date().addingTimeInterval(12)
        repeat {
            let state = try control("/__qa95/state")
            if condition(state) { return state }
            Thread.sleep(forTimeInterval: 0.2)
        } while Date() < deadline
        throw QA95Failure.failed("Expected independent backend receipt did not arrive")
    }

    private func independentOracle(_ answers: [String: String]) throws -> [String: Int] {
        try ensure(answers.count == 20, "Exactly 20 immutable answers required")
        let multiplier = ["si": 1.0, "no": 0.0, "indiferente": 0.5]
        var vector: [String: Int] = [:]
        for (axisIndex, axis) in axes.enumerated() {
            var numerator = 0.0
            var denominator = 0.0
            for question in 0..<20 {
                guard let answer = answers[String(question + 1)], let factor = multiplier[answer] else {
                    throw QA95Failure.failed("Unsupported frozen answer")
                }
                numerator += Double(weights[question][axisIndex]) * factor
                denominator += Double(weights[question][axisIndex])
            }
            vector[axis] = Int(floor(5 * numerator / denominator + 0.5))
        }
        return vector
    }

    @MainActor private func capture(_ name: String, _ app: XCUIApplication) {
        let screenshot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        screenshot.name = name; screenshot.lifetime = .keepAlways; add(screenshot)
        let tree = XCTAttachment(string: app.debugDescription)
        tree.name = name + "-AX"; tree.lifetime = .keepAlways; add(tree)
        if let state = try? control("/__qa95/state"),
           let data = try? JSONSerialization.data(withJSONObject: state, options: [.prettyPrinted, .sortedKeys]),
           let text = String(data: data, encoding: .utf8) {
            let receipt = XCTAttachment(string: text)
            receipt.name = name + "-synthetic-receipt"; receipt.lifetime = .keepAlways; add(receipt)
        }
    }

    @MainActor private func tap(_ element: XCUIElement, _ app: XCUIApplication) throws {
        try ensure(element.waitForExistence(timeout: 12), "Missing real UI control: \(element)")
        if !element.isHittable {
            for _ in 0..<7 {
                if element.isHittable { break }
                app.swipeUp()
            }
        }
        if !element.isHittable {
            for _ in 0..<9 {
                if element.isHittable { break }
                app.swipeDown()
            }
        }
        try ensure(element.isHittable, "Unreachable real UI control: \(element)")
        element.tap()
    }

    @MainActor private func open(_ name: String, _ heading: String, _ app: XCUIApplication) throws {
        try tap(app.links.matching(identifier: name).firstMatch, app)
        try ensure(app.staticTexts[heading].firstMatch.waitForExistence(timeout: 15), "Destination did not render: " + name)
        try ensure(app.state == .runningForeground, "QA95 app left foreground")
    }

    @MainActor private func cellarTab(_ label: String, _ app: XCUIApplication) throws {
        let tab = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", label)).firstMatch
        try tap(tab, app)
    }

    @MainActor private func closeToast(_ title: String, _ app: XCUIApplication) throws {
        try ensure(app.staticTexts[title].firstMatch.waitForExistence(timeout: 10), "First active toast hidden by empty-region wrapper: " + title)
        let close = app.buttons["Cerrar aviso"].firstMatch
        try ensure(close.waitForExistence(timeout: 3), "Toast close must have button role and accessible name")
        try ensure(close.isHittable && close.frame.width >= 44 && close.frame.height >= 44, "Toast close must be reachable and at least 44x44pt")
        capture("first-toast-" + title, app)
        close.tap()
        let gone = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in !close.exists || !close.isHittable }, object: nil)
        try ensure(XCTWaiter.wait(for: [gone], timeout: 5) == .completed, "Named toast close did not dismiss")
    }

    private func collection(_ state: [String: Any], ownerKey: String = "primaryOwner") -> [String: Any]? {
        guard let owner = state[ownerKey] as? String, let wines = state["userWines"] as? [[String: Any]] else { return nil }
        return wines.first { $0["user_id"] as? String == owner && $0["status"] as? String == "collection" }
    }

    @MainActor private func logout(_ app: XCUIApplication) throws {
        try open("Perfil", "Mi Perfil", app)
        // WebKit exposes Radix's popup trigger as Other, not XCUI Button.
        let settings = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Ajustes de cuenta")).firstMatch
        try tap(settings, app)
        let item = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Cerrar sesi\u{00f3}n")).firstMatch
        try tap(item, app)
        _ = try receipt { state in
            guard state["currentOwner"] is NSNull, let storage = state["storage"] as? [String: Bool] else { return false }
            return storage.count == 4 && storage.values.allSatisfy { !$0 }
        }
    }

    @MainActor private func login(_ index: Int, _ app: XCUIApplication) throws {
        let email = app.textFields.firstMatch
        let password = app.secureTextFields.firstMatch
        try tap(email, app); email.typeText("consumer95-\(index + 1)@matchrim.invalid")
        try tap(password, app); password.typeText("Synthetic-only-not-real-95!")
        try submitLogin(app)
    }

    @MainActor private func submitLogin(_ app: XCUIApplication) throws {
        // The first identically named button is the already-selected auth tab.
        let controls = app.buttons.matching(identifier: "Iniciar Sesi\u{00f3}n")
        try ensure(controls.count == 2, "Expected the observed auth tab and form submit, separately")
        try tap(controls.element(boundBy: 1), app)
    }

    @MainActor private func dismissGuide(_ app: XCUIApplication) throws {
        let skip = app.buttons["Saltar gu\u{00ed}a"].firstMatch
        if skip.waitForExistence(timeout: 2) { try tap(skip, app) }
    }


    @MainActor private func homeRequire(_ condition: Bool, _ message: String) throws {
        guard condition else {
            XCTFail(message)
            throw NSError(domain: "QA95Home", code: 1, userInfo: [NSLocalizedDescriptionKey: message])
        }
    }

    @MainActor private func homeClip(_ app: XCUIApplication) throws -> CGRect {
        let web = app.webViews.firstMatch
        let navigation = app.descendants(matching: .any).matching(
            NSPredicate(format: "label BEGINSWITH %@", "Navegaci\u{00f3}n principal")).firstMatch
        try homeRequire(web.exists && navigation.exists, "Home WebView and named fixed navigation required")
        var clip = web.frame.intersection(app.frame)
        clip.size.height = min(clip.maxY, navigation.frame.minY) - clip.minY
        try homeRequire(!clip.isNull && clip.width >= 44 && clip.height >= 44, "Home body clip must exclude fixed navigation")
        return clip
    }

    @MainActor private func homeBodyAction(_ name: String, destination: String,
                                           tag: String, app: XCUIApplication) throws {
        let button = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", name)).firstMatch
        try homeRequire(button.waitForExistence(timeout: 12), "Missing Home body button " + name)
        var observations: [[String: Any]] = []
        var ready = false
        for attempt in 0...12 {
            let clip = try homeClip(app)
            let frame = button.frame
            let visible = frame.intersection(clip)
            let center = CGPoint(x: frame.midX, y: frame.midY)
            // Do not ask offscreen WebKit for an AX activation point. Geometry
            // is only a prerequisite: standard isHittable and tap remain gates.
            ready = frame.width >= 44 && frame.height >= 44 && !visible.isNull
                && visible.width >= 44 && visible.height >= 44
                && clip.insetBy(dx: 22, dy: 22).contains(center)
            observations.append(["attempt": attempt, "button": NSCoder.string(for: frame),
                                 "clip": NSCoder.string(for: clip), "visible": NSCoder.string(for: visible),
                                 "geometryReady": ready])
            if ready { break }
            if attempt < 12 {
                if frame.midY < clip.midY { app.swipeDown() }
                else { app.swipeUp() }
            }
        }
        let data = try JSONSerialization.data(withJSONObject: observations, options: [.sortedKeys])
        let geometry = XCTAttachment(data: data, uniformTypeIdentifier: "public.json")
        geometry.name = tag + "-geometry"; geometry.lifetime = .keepAlways; add(geometry)
        capture(tag + "-before-standardAX", app)
        try homeRequire(ready, "Home body " + name + " lacks an unclipped 44pt activation footprint after bounded scroll")
        try homeRequire(button.isHittable, "Home body " + name + " standard AX activation is not hittable")
        button.tap()
        try homeRequire(app.staticTexts[destination].firstMatch.waitForExistence(timeout: 15),
                        "Home body " + name + " did not open " + destination)
        try homeRequire(app.state == .runningForeground, "Home action left the app foreground")
        capture(tag + "-destination", app)
    }

    @MainActor private func homeBrand(_ tag: String, app: XCUIApplication) throws {
        let brand = app.buttons["Inicio de Matchrim"].firstMatch
        try homeRequire(brand.waitForExistence(timeout: 12), "Named Home brand control missing")
        for _ in 0..<12 {
            let clip = try homeClip(app)
            if clip.contains(brand.frame) { break }
            app.swipeDown()
        }
        let clip = try homeClip(app)
        capture(tag + "-brand", app)
        try homeRequire(clip.contains(brand.frame) && brand.frame.width >= 44 && brand.frame.height >= 44,
                        "MAXportrait brand AX bounds must be wholly visible")
        try homeRequire(brand.isHittable, "MAXportrait brand control must remain AX reachable")
        let screen = XCUIScreen.main.screenshot().image
        guard let pixels = screen.cgImage else { try homeRequire(false, "Native screenshot pixels unavailable"); return }
        try homeRequire(app.frame.width < app.frame.height, "Brand oracle requires actual portrait")
        let sx = CGFloat(pixels.width) / app.frame.width
        let sy = CGFloat(pixels.height) / app.frame.height
        let rect = CGRect(x: (brand.frame.minX - app.frame.minX) * sx,
                          y: (brand.frame.minY - app.frame.minY) * sy,
                          width: brand.frame.width * sx, height: brand.frame.height * sy).integral
        guard let cropped = pixels.cropping(to: rect) else { try homeRequire(false, "Brand crop outside native screenshot"); return }
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = false
        request.recognitionLanguages = ["en-US", "es-ES"]
        try VNImageRequestHandler(cgImage: cropped, options: [:]).perform([request])
        let rows = (request.results ?? []).map { row in
            ["text": row.topCandidates(1).first?.string ?? "",
             "bounds": NSCoder.string(for: row.boundingBox)] as [String: Any]
        }
        let receipt = try JSONSerialization.data(withJSONObject: [
            "brandAX": brand.label, "brandRect": NSCoder.string(for: brand.frame),
            "clip": NSCoder.string(for: clip), "localOCR": rows,
            "scope": "Local native pixels, no provider; explicit screenshot review still required"
        ], options: [.sortedKeys])
        let evidence = XCTAttachment(data: receipt, uniformTypeIdentifier: "public.json")
        evidence.name = tag + "-brand-localOCR"; evidence.lifetime = .keepAlways; add(evidence)
        let brandPattern = try NSRegularExpression(pattern: "^[\\p{P}\\p{S}\\s]*Matchrim[\\p{P}\\p{S}\\s]*$")
        let hasWholeBrandRow = rows.first { row in
            guard let text = row["text"] as? String else { return false }
            let range = NSRange(text.startIndex..<text.endIndex, in: text)
            return brandPattern.firstMatch(in: text, range: range)?.range == range
        } != nil
        try homeRequire(hasWholeBrandRow,
                        "MAXportrait native brand must be one unbroken Matchrim word, not Ma/tch/rim")
    }

    @MainActor private func homeOrientation(_ landscape: Bool, app: XCUIApplication) throws {
        XCUIDevice.shared.orientation = landscape ? .landscapeLeft : .portrait
        let settled = NSPredicate { _, _ in (app.frame.width > app.frame.height) == landscape }
        try homeRequire(XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: settled, object: nil)], timeout: 10) == .completed,
                        "Actual Home orientation did not settle")
    }

    @MainActor private func journey(_ index: Int, _ initial: [String: Any], _ app: XCUIApplication) throws {
        app.launchArguments = []
        app.launch()
        try ensure(app.webViews.firstMatch.waitForExistence(timeout: 15), "Dedicated QA95 native WebKit view missing")
        _ = try receipt { ($0["bootCount"] as? Int ?? 0) == 1 }
        try dismissGuide(app)

        // First Sonner activation must escape the initially aria-hidden wrapper.
        try open("Bodega", "Mis Vinos", app)
        try cellarTab("Mi Bodega", app)
        guard let wine = collection(initial), let name = wine["name"] as? String else { throw QA95Failure.failed("Missing synthetic wine") }
        _ = try control("/__qa95/fault", ["fault": "user_wines", "enabled": true])
        try tap(app.buttons["Guardar \(name) en favoritos"].firstMatch, app)
        try closeToast("Error al actualizar favorito", app)
        let unchanged = try control("/__qa95/state")
        try ensure(collection(unchanged)?["is_favorite"] as? Bool == false, "Failed favorite falsely saved")
        _ = try control("/__qa95/fault", ["fault": "user_wines", "enabled": false])

        try open("Inicio", "\u{00bf}Qu\u{00e9} quieres elegir?", app)
        for (body, destination) in [("Botellas", "Etiqueta de vino"), ("Carta", "Carta de vinos")] {
            try homeBodyAction(body, destination: destination, tag: "persona-\(index)-Home-" + body, app: app)
            try open("Inicio", "\u{00bf}Qu\u{00e9} quieres elegir?", app)
        }
        try tap(app.buttons["Crear mi perfil Matchrim"].firstMatch, app)
        try tap(app.buttons["Comenzar el test"].firstMatch, app)
        guard let answers = initial["answers"] as? [String: String], let prompts = initial["prompts"] as? [String] else {
            throw QA95Failure.failed("Missing pinned quiz matrix")
        }
        let labels = ["si": "Me gusta", "no": "No me gusta", "indiferente": "Me da igual"]
        for question in 1...20 {
            let progress = app.otherElements["Progreso del test"].firstMatch
            try ensure(progress.waitForExistence(timeout: 10), "Question progress missing")
            let currentQuestion = Double((progress.value as? String ?? "").replacingOccurrences(of: ",", with: "."))
            try ensure(currentQuestion == Double(question), "Question sequence diverged")
            let prompt = app.staticTexts.matching(NSPredicate(format: "label CONTAINS[cd] %@", prompts[question - 1])).firstMatch
            try ensure(prompt.exists, "Frozen quiz prompt missing")
            let next = app.buttons[question == 20 ? "Ver mi perfil" : "Siguiente"].firstMatch
            try ensure(!next.isEnabled, "Unanswered native question must not advance")
            guard let answer = answers[String(question)], let label = labels[answer] else { throw QA95Failure.failed("Invalid answer") }
            // WebKit exposes the radio as Other and its associated row label
            // as StaticText. Tap the visible label, never set React state.
            try tap(app.staticTexts[label].firstMatch, app)
            try ensure(next.isEnabled, "Real radio click did not enable Continue")
            try tap(next, app)
        }
        try ensure(app.staticTexts["Tu perfil"].firstMatch.waitForExistence(timeout: 15), "Quiz result not rendered")
        try ensure(app.staticTexts["Perfil guardado en tu cuenta."].firstMatch.waitForExistence(timeout: 10), "Native save not confirmed")
        let quizReceipt = try receipt { $0["quizReceiptMatches"] as? Bool == true }
        let oracle = try independentOracle(answers)
        try ensure(quizReceipt["actualQuizCount"] as? Int == 1 && quizReceipt["quizResults"] as? [[String: Int]] == [oracle], "Exact independent quiz backend receipt mismatch")
        try ensure(quizReceipt["expectedQuiz"] as? [String: Int] == oracle, "Pinned server and Swift oracle disagree")

        for (name, heading) in [("Inicio", "\u{00bf}Qu\u{00e9} quieres elegir?"),
                                ("aiRIM", "\u{00bf}Qu\u{00e9} necesitas decidir?"),
                                ("Escanear", "Escanear"), ("Perfil", "Mi Perfil"), ("Bodega", "Mis Vinos")] {
            try open(name, heading, app)
        }
        try cellarTab("Mi Bodega", app)
        try tap(app.buttons["Guardar \(name) en favoritos"].firstMatch, app)
        _ = try receipt { self.collection($0)?["is_favorite"] as? Bool == true }
        try cellarTab("Favoritos", app)
        try tap(app.buttons["Me encanta"].firstMatch, app)
        _ = try receipt { self.collection($0)?["rating"] as? String == "love" }
        try tap(app.switches["Usar \(name) para entrenar perfil"].firstMatch, app)
        _ = try receipt { self.collection($0)?["use_for_profile_training"] as? Bool == false }
        try tap(app.buttons["Correcto"].firstMatch, app)
        let edited = try receipt { self.collection($0)?["rating"] as? String == "ok" }
        let row = collection(edited)
        try ensure(row?["quantity"] as? Int == 3 && row?["status"] as? String == "collection", "Rating must not consume or move inventory")
        try ensure(row?["use_for_profile_training"] as? Bool == false, "Explicit opt-out lost on rating edit")
        try ensure((row?["place_details"] as? [String: Any])?["matchrim_training_policy"] as? String == "excluded", "Native exclusion receipt missing")

        try logout(app)
        app.terminate()
        // Same persona, no select/reset: bootstrap must NOT recreate a session.
        app.launch()
        _ = try receipt { ($0["bootCount"] as? Int ?? 0) == 2 }
        // Logout clears account-scoped onboarding; a fresh anonymous guide is expected.
        try dismissGuide(app)
        try tap(app.links["Bodega"].firstMatch, app)
        try ensure(app.textFields.firstMatch.waitForExistence(timeout: 12), "Relaunch silently restored logged-out primary account")
        // First Radix auth toast in this new launch must become accessible.
        _ = try control("/__qa95/fault", ["fault": "login", "enabled": true])
        try login(index + 100, app)
        // Observe the five-second toast before loopback receipt polling. The
        // same independent HTTP400 and null-owner checks still run afterwards.
        try closeToast("Error de autenticaci\u{00f3}n", app)
        _ = try receipt { state in
            (state["requests"] as? [[String: Any]] ?? []).contains { $0["path"] as? String == "/auth/v1/token" && $0["status"] as? Int == 400 }
        }
        let failedLogin = try control("/__qa95/state")
        try ensure(failedLogin["currentOwner"] is NSNull, "Controlled invalid login created a session")
        _ = try control("/__qa95/fault", ["fault": "login", "enabled": false])
        // Inputs retain their synthetic values after a failed login.
        try submitLogin(app)
        let secondary = try receipt { $0["currentOwner"] as? String == $0["secondaryOwner"] as? String }
        try dismissGuide(app)
        try ensure(secondary["secondaryQuizCount"] as? Int == 0, "Primary quiz leaked into second account")
        try ensure(app.staticTexts["Mis Vinos"].firstMatch.waitForExistence(timeout: 15), "Secondary login not rendered")
        try cellarTab("Mi Bodega", app)
        guard let secondName = collection(secondary, ownerKey: "secondaryOwner")?["name"] as? String else { throw QA95Failure.failed("Missing second-owner fixture") }
        try ensure(app.staticTexts[secondName].firstMatch.waitForExistence(timeout: 10), "Secondary owner wine not rendered")
        try ensure(!app.staticTexts[name].exists, "Primary owner's wine leaked into second account UI")
        try open("Perfil", "Mi Perfil", app)
        try ensure(app.staticTexts["No tienes un perfil a\u{00fa}n"].firstMatch.waitForExistence(timeout: 10), "Primary profile leaked into second account UI")
        try logout(app)
        let final = try control("/__qa95/state")
        try ensure((final["safetyErrors"] as? [String])?.isEmpty == true && (final["unmodeled"] as? [[String: Any]])?.isEmpty == true, "Unmodeled transport or safety failure")
        try ensure((final["blocked"] as? [String])?.isEmpty == true, "Unexpected egress/CSP/bootstrap block must be triaged")
        for request in final["requests"] as? [[String: Any]] ?? [] {
            if let counts = request["counts"] as? [String: Any] {
                try ensure(counts["matches"] as? Bool == true, "Independent expected/actual request counts disagree")
            }
        }
        let requests = final["requests"] as? [[String: Any]] ?? []
        let expectedCounts: [String: Int] = ["quizInserts": 1, "logouts": 2, "loginAttempts": 2,
                              "controlledCellarFailures": 1, "controlledLoginFailures": 1]
        func countRequests(path: String, method: String? = nil, status: Int? = nil) -> Int {
            return requests.filter { request in
                guard request["path"] as? String == path else { return false }
                if let method = method, request["method"] as? String != method { return false }
                if let status = status, request["status"] as? Int != status { return false }
                return true
            }.count
        }
        let actualCounts: [String: Int] = [
            "quizInserts": countRequests(path: "/rest/v1/quiz_results", method: "POST"),
            "logouts": countRequests(path: "/auth/v1/logout", method: "POST"),
            "loginAttempts": countRequests(path: "/auth/v1/token", method: "POST"),
            "controlledCellarFailures": countRequests(path: "/rest/v1/user_wines", status: 503),
            "controlledLoginFailures": countRequests(path: "/auth/v1/token", status: 400)
        ]
        try ensure(actualCounts == expectedCounts, "Exact journey request counts mismatch: \(actualCounts)")
        let summary = XCTAttachment(string: "persona=\(index) answerClicks=20 continueClicks=20 destinations=5\nexpected=\(expectedCounts)\nactual=\(actualCounts)\nScope: native synthetic UI, not hosted auth, provider intelligence, recognition or RLS.")
        summary.name = "persona-\(index)-expected-actual-counts"
        summary.lifetime = .keepAlways
        add(summary)
        capture("persona-\(index)-complete", app)
    }

    @MainActor private func authorizedApp(_ index: Int) throws -> XCUIApplication {
        #if !targetEnvironment(simulator)
        throw QA95Failure.failed("Owned simulator only; never a device or desktop application")
        #endif
        let environment = ProcessInfo.processInfo.environment
        try ensure(environment["SIMULATOR_UDID"] == ownedSimulator, "Wrong simulator; no UI or control requests performed")
        try ensure(environment["QA95_ENABLE_NATIVE_SYNTHETIC"] == "YES", "Explicit QA95 test-runner opt-in required")
        guard let expected = environment["QA95_MANIFEST_SHA256"], expected.count == 64 else { throw QA95Failure.failed("Exact frozen manifest SHA256 required") }
        continueAfterFailure = true
        let health = try control("/__qa95/health")
        try ensure(health["bundle"] as? String == bundle && health["origin"] as? String == origin && health["manifestSha256"] as? String == expected, "Wrong harness, bundle or frozen build")
        guard let indices = health["indices"] as? [Int] else { throw QA95Failure.failed("No explicit profile indices") }
        try ensure(indices == [0,31,32,40,49] || indices == Array(0..<50), "Only pinned QA5 or complete QA50 matrix")
        try ensure(indices.contains(index), "Method persona is outside the explicitly enabled fixture indices")
        return XCUIApplication(bundleIdentifier: bundle)
    }

    @MainActor private func runProfile(_ index: Int) throws {
        let app = try authorizedApp(index)
        defer { app.terminate(); XCUIDevice.shared.orientation = .portrait }
        app.terminate()
        XCUIDevice.shared.orientation = .portrait
        let state = try control("/__qa95/select", ["persona": index, "reset": true])
        do { try journey(index, state, app) }
        catch { capture("persona-\(index)-FAIL", app); throw error }
    }

    @MainActor private func runMaxHome(_ index: Int) throws {
        try ensure([0,31,32,40,49].contains(index), "Only five predeclared MAX companions")
        let app = try authorizedApp(index)
        defer { app.terminate(); XCUIDevice.shared.orientation = .portrait }
        app.terminate()
        XCUIDevice.shared.orientation = .portrait
        let initial = try control("/__qa95/select", ["persona": index, "reset": true])
        do {
            app.launchArguments = ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"]
            app.launch()
            try ensure(app.webViews.firstMatch.waitForExistence(timeout: 15), "MAX companion WebView missing")
            _ = try receipt { ($0["bootCount"] as? Int) == 1 }
            try dismissGuide(app)
            try open("Inicio", "\u{00bf}Qu\u{00e9} quieres elegir?", app)
            try homeBrand("max-home-\(index)-portrait", app: app)
            try homeOrientation(true, app: app)
            capture("max-home-\(index)-landscape-initial", app)
            for (name, heading) in [("Botellas", "Etiqueta de vino"), ("Carta", "Carta de vinos")] {
                try homeBodyAction(name, destination: heading, tag: "max-home-\(index)-" + name, app: app)
                try open("Inicio", "\u{00bf}Qu\u{00e9} quieres elegir?", app)
            }
            let final = try control("/__qa95/state")
            try ensure(final["bootCount"] as? Int == 1 && final["actualQuizCount"] as? Int == 0
                       && final["secondaryQuizCount"] as? Int == 0
                       && final["currentOwner"] as? String == initial["primaryOwner"] as? String,
                       "Separate MAX companion changed the bootstrap/owner/quiz contract")
            let beforeWines = try JSONSerialization.data(withJSONObject: initial["userWines"] ?? [], options: [.sortedKeys])
            let afterWines = try JSONSerialization.data(withJSONObject: final["userWines"] ?? [], options: [.sortedKeys])
            try ensure(beforeWines == afterWines, "MAX companion must not mutate cellar data")
            for key in ["blocked", "safetyErrors", "unmodeled"] {
                try ensure((final[key] as? [Any])?.isEmpty == true, "MAX companion transport safety failure: " + key)
            }
            try ensure(final["externalForwardCount"] as? Int == 0, "MAX companion external forwarding forbidden")
            try ensure((final["requests"] as? [[String: Any]] ?? []).allSatisfy {
                ["GET", "OPTIONS"].contains($0["method"] as? String ?? "")
            }, "MAX companion must perform no backend mutations")
            capture("max-home-\(index)-complete", app)
        } catch { capture("max-home-\(index)-FAIL", app); throw error }
    }

    // Run with one worker and four explicit -only-testing sets: 00...12,
    // 13...25, 26...37, 38...49. The strict reader rejects larger batches,
    // mixed MAX/profile batches, old seeds, missing or non-Passed methods.
    @MainActor func testProfile00() throws { try runProfile(0) }
    @MainActor func testProfile01() throws { try runProfile(1) }
    @MainActor func testProfile02() throws { try runProfile(2) }
    @MainActor func testProfile03() throws { try runProfile(3) }
    @MainActor func testProfile04() throws { try runProfile(4) }
    @MainActor func testProfile05() throws { try runProfile(5) }
    @MainActor func testProfile06() throws { try runProfile(6) }
    @MainActor func testProfile07() throws { try runProfile(7) }
    @MainActor func testProfile08() throws { try runProfile(8) }
    @MainActor func testProfile09() throws { try runProfile(9) }
    @MainActor func testProfile10() throws { try runProfile(10) }
    @MainActor func testProfile11() throws { try runProfile(11) }
    @MainActor func testProfile12() throws { try runProfile(12) }
    @MainActor func testProfile13() throws { try runProfile(13) }
    @MainActor func testProfile14() throws { try runProfile(14) }
    @MainActor func testProfile15() throws { try runProfile(15) }
    @MainActor func testProfile16() throws { try runProfile(16) }
    @MainActor func testProfile17() throws { try runProfile(17) }
    @MainActor func testProfile18() throws { try runProfile(18) }
    @MainActor func testProfile19() throws { try runProfile(19) }
    @MainActor func testProfile20() throws { try runProfile(20) }
    @MainActor func testProfile21() throws { try runProfile(21) }
    @MainActor func testProfile22() throws { try runProfile(22) }
    @MainActor func testProfile23() throws { try runProfile(23) }
    @MainActor func testProfile24() throws { try runProfile(24) }
    @MainActor func testProfile25() throws { try runProfile(25) }
    @MainActor func testProfile26() throws { try runProfile(26) }
    @MainActor func testProfile27() throws { try runProfile(27) }
    @MainActor func testProfile28() throws { try runProfile(28) }
    @MainActor func testProfile29() throws { try runProfile(29) }
    @MainActor func testProfile30() throws { try runProfile(30) }
    @MainActor func testProfile31() throws { try runProfile(31) }
    @MainActor func testProfile32() throws { try runProfile(32) }
    @MainActor func testProfile33() throws { try runProfile(33) }
    @MainActor func testProfile34() throws { try runProfile(34) }
    @MainActor func testProfile35() throws { try runProfile(35) }
    @MainActor func testProfile36() throws { try runProfile(36) }
    @MainActor func testProfile37() throws { try runProfile(37) }
    @MainActor func testProfile38() throws { try runProfile(38) }
    @MainActor func testProfile39() throws { try runProfile(39) }
    @MainActor func testProfile40() throws { try runProfile(40) }
    @MainActor func testProfile41() throws { try runProfile(41) }
    @MainActor func testProfile42() throws { try runProfile(42) }
    @MainActor func testProfile43() throws { try runProfile(43) }
    @MainActor func testProfile44() throws { try runProfile(44) }
    @MainActor func testProfile45() throws { try runProfile(45) }
    @MainActor func testProfile46() throws { try runProfile(46) }
    @MainActor func testProfile47() throws { try runProfile(47) }
    @MainActor func testProfile48() throws { try runProfile(48) }
    @MainActor func testProfile49() throws { try runProfile(49) }

    @MainActor func testMaxHomeProfile00() throws { try runMaxHome(0) }
    @MainActor func testMaxHomeProfile31() throws { try runMaxHome(31) }
    @MainActor func testMaxHomeProfile32() throws { try runMaxHome(32) }
    @MainActor func testMaxHomeProfile40() throws { try runMaxHome(40) }
    @MainActor func testMaxHomeProfile49() throws { try runMaxHome(49) }
}
