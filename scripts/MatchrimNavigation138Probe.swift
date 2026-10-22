import Foundation
import XCTest

// First-viewport sweep only. The sole interaction path is the five bottom links.
final class MatchrimNavigation138Tests: XCTestCase {
    private enum Stop: Error { case held }
    private var auditHadIssues = false
    private enum Destination: String, CaseIterable {
        case profile = "Perfil", home = "Inicio", airim = "aiRIM", scan = "Escanear", cellar = "Bodega"
    }

    @MainActor func testExistingQAReadOnlyNavigation138() throws {
        continueAfterFailure = false
        #if targetEnvironment(simulator)
        guard UUID(uuidString: ProcessInfo.processInfo.environment["MATCHRIM138_RUN_ID"] ?? "") != nil else {
            emit("NAV138_FAILURE"); XCTFail("Fresh sanitized host plan required"); return
        }
        let app = XCUIApplication(bundleIdentifier: "wine.matchrim.qa99review")
        app.launch()
        defer { app.terminate() }
        try require(app.wait(for: .runningForeground, timeout: 15), app, "Existing app did not launch")
        try require(app.frame.height > app.frame.width, app, "Portrait required; do not change device settings")

        try navigate(.profile, app)
        let identity = app.otherElements.matching(NSPredicate(format: "label == %@", "Correo de tu cuenta: info@winerim.com"))
        try require(identity.firstMatch.waitForExistence(timeout: 15) && identity.count == 1
                    && !identity.firstMatch.frame.isEmpty
                    && app.windows.firstMatch.frame.contains(identity.firstMatch.frame),
                    app, "Literal existing QA identity must be visible on Profile; no auth attempt")
        try authenticated(app)
        emit("NAV138_EXISTING_QA_IDENTITY")
        // Profile115-r5 AX and its probe use this heading text; the h3 can include an emoji prefix.
        let sensory = app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Tu perfil sensorial"))
        try require(wait(15) { app.staticTexts["Mi Perfil"].exists && sensory.count == 1 && sensory.firstMatch.exists
            && !app.staticTexts["Cargando tu perfil Matchrim"].exists }, app, "Loaded sensory Profile required; no quiz or retry")
        let settings = app.otherElements.matching(NSPredicate(format: "label == %@", "Ajustes de cuenta"))
        try require(settings.count == 1 && settings.firstMatch.isHittable, app, "Known account summary missing; do not open settings")
        try target(settings.firstMatch, app, mustFullyVisible: true)
        try captureAndAudit(app, "01-profile", "NAV138_PROFILE_AUDITED")

        try navigate(.home, app)
        try require(wait(20) {
            app.staticTexts["Matchrim"].exists && app.buttons["Buscar vino o bodega"].exists
                && app.staticTexts["Para ti"].exists
                && !app.otherElements["Cargando vinos"].exists
                && (app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Ver por qu\u{00e9} ")).count > 0
                    || app.staticTexts["Ya tienes estos vinos en tu colecci\u{00f3}n."].exists)
        }, app, "Loaded existing-profile Home required; no recommendation action or retry")
        try captureAndAudit(app, "02-home", "NAV138_HOME_AUDITED")

        try navigate(.airim, app)
        let question = app.textViews.matching(NSPredicate(format: "label == %@", "Pregunta para aiRIM"))
        let welcome = "Cu\u{00e9}ntame qu\u{00e9} vino, plato, carta u ocasi\u{00f3}n tienes delante. Te dar\u{00e9} una decisi\u{00f3}n concreta y se\u{00f1}alar\u{00e9} lo que no pueda saber."
        try require(question.firstMatch.waitForExistence(timeout: 15) && question.count == 1
                    && question.firstMatch.isHittable && app.staticTexts[welcome].exists
                    && app.buttons["Volver desde aiRIM"].exists && app.buttons["Gestionar mis gustos"].exists,
                    app, "Known native aiRIM landing required; never type or send")
        try require(wait(20) { !app.staticTexts["Cargando tu perfil..."].exists },
                    app, "aiRIM profile load did not finish; do not submit or retry")
        try require(!app.staticTexts["Orientaci\u{00f3}n general \u{00b7} sin perfil personal"].exists
                    && !app.staticTexts["Test base \u{00b7} valoraciones no disponibles"].exists,
                    app, "aiRIM profile unavailable; no general-mode fallback claimed as a loaded QA profile")
        let input = question.firstMatch.value as? String ?? ""
        try require((input.isEmpty || input == question.firstMatch.placeholderValue)
                    && app.buttons["Enviar pregunta"].exists && !app.buttons["Enviar pregunta"].isEnabled
                    && !app.buttons["Cancelar consulta"].exists,
                    app, "aiRIM must be idle with empty input and disabled send")
        try captureAndAudit(app, "03-airim", "NAV138_AIRIM_AUDITED")

        try navigate(.scan, app)
        try require(app.buttons["Etiqueta de vino \u{00b7} Botellas \u{00b7} Una o varias"].waitForExistence(timeout: 15)
                    && app.buttons["Carta de vinos Carta impresa o pizarra"].exists
                    && app.buttons["Comida y vinos del restaurante \u{00b7} Comida y vino"].exists
                    && app.buttons["M\u{00e1}s"].exists,
                    app, "Known native Scan hub required; no scanner, picker, import or analysis")
        try captureAndAudit(app, "04-scan-hub", "NAV138_SCAN_HUB_AUDITED")

        try navigate(.cellar, app)
        try require(wait(20) {
            let section = app.switches.matching(NSPredicate(format: "label BEGINSWITH %@", "En bodega")).firstMatch
            return app.staticTexts["Mis vinos"].exists && section.exists
                && (app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Ver ")).count > 0
                    || app.staticTexts["Tu bodega empieza con la primera botella"].exists
                    || app.staticTexts["Guarda aqu\u{00ed} los vinos que te recomienda Winerim"].exists
                    || app.staticTexts["Punt\u{00fa}a vinos para que Matchrim aprenda contigo"].exists
                    || app.staticTexts["Tus favoritos aparecer\u{00e1}n aqu\u{00ed}"].exists
                    || app.staticTexts["Aqu\u{00ed} van los vinos que no quieres repetir"].exists)
        }, app, "Loaded existing Bodega required; do not select a section, card, stock or rating")
        try captureAndAudit(app, "05-bodega", "NAV138_BODEGA_AUDITED")
        try require(!auditHadIssues, app, "Unfiltered accessibility issues remain; all reachable view evidence retained")
        attach("Existing QA session only; five first viewports at unchanged device text size/orientation. No auth, settings, privacy, quiz, wine, stock, rating or save interaction. No chat submission, image selection, analysis or matching action. Home recommendation GETs through passthroughWinerim and aiRIM before-send profile GETs are ordinary background reads; no network-zero or packet-level zero-call assertion. AX buttons/switches and bottom links measured in XCTest points, without CSS/padded-ancestor inference. Fixed navigation/settings require full-window containment. Partially exposed scroll cards are recorded without certifying their visible hit region or full content. Other links recorded only; AX may expose text bounds rather than the hit region. No offscreen coverage, physical-device certification, or VoiceOver speech/focus-order claim.", "scope")
        emit("NAV138_READONLY_SWEEP_COMPLETE")
        #else
        emit("NAV138_FAILURE"); XCTFail("Owned simulator only")
        #endif
    }

    @MainActor private func authenticated(_ app: XCUIApplication) throws {
        try require(app.secureTextFields.count == 0
                    && !app.buttons["Entrar en Matchrim"].exists
                    && !app.buttons["Iniciar Sesi\u{00f3}n"].exists
                    && !app.staticTexts["Antes de analizar una imagen"].exists,
                    app, "Auth or privacy gate detected; stop without changing it")
        for label in ["No hemos podido cargar tu test", "No hemos podido cargar tus vinos",
                      "No hemos podido cargar tus recomendaciones.", "QA local: respuestas deterministas"] {
            try require(!app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", label)).firstMatch.exists,
                        app, "Load failure or fixture UI; no retry")
        }
    }

    @MainActor private func navigation(_ destination: Destination, _ app: XCUIApplication) throws -> XCUIElement {
        let bars = app.otherElements.matching(NSPredicate(format: "label BEGINSWITH %@", "Navegaci\u{00f3}n principal"))
        try require(bars.firstMatch.waitForExistence(timeout: 10) && bars.count == 1,
                    app, "Unique observed bottom navigation required")
        let links = bars.firstMatch.links.matching(NSPredicate(format: "label == %@", destination.rawValue))
        try require(links.count == 1 && links.firstMatch.isEnabled && links.firstMatch.isHittable,
                    app, "Named navigation link missing or ambiguous; no fallback tap")
        return links.firstMatch
    }

    @MainActor private func navigate(_ destination: Destination, _ app: XCUIApplication) throws {
        try authenticated(app)
        let link = try navigation(destination, app)
        try target(link, app, mustFullyVisible: true)
        link.tap()
    }

    @MainActor private func target(_ element: XCUIElement, _ app: XCUIApplication, mustFullyVisible: Bool = false) throws {
        let frame = element.frame
        let window = app.windows.firstMatch.frame
        let fullyVisible = window.contains(frame)
        try require(!frame.isEmpty && frame.width.isFinite && frame.height.isFinite
                    && frame.width >= 44 && frame.height >= 44 && window.intersects(frame)
                    && (!mustFullyVisible || fullyVisible),
                    app, "AX target must be at least44x44pt and intersect the window; fixed navigation/settings must be fully in-window: \(element.label)")
        if !fullyVisible {
            attach("Partially exposed scroll content: \(element.label), AX frame \(frame). Full target size measured; visible portion, touch point and offscreen content are not certified.", "partial-scroll-target")
        }
    }

    @MainActor private func captureAndAudit(_ app: XCUIApplication, _ name: String, _ marker: String) throws {
        capture(app, name)
        try authenticated(app)
        var controls = app.buttons.allElementsBoundByIndex + app.switches.allElementsBoundByIndex
        for destination in Destination.allCases { controls.append(try navigation(destination, app)) }
        let visible = controls.filter { $0.isHittable }
        let otherLinks = app.links.allElementsBoundByIndex.filter {
            $0.isHittable && !Destination.allCases.map(\.rawValue).contains($0.label)
        }
        attach((visible.map { "interactive \($0.elementType) \($0.label): \($0.frame), enabled=\($0.isEnabled)" }
                + otherLinks.map { "link-limitation \($0.label): \($0.frame); AX text bounds do not prove padded hit area" })
                .joined(separator: "\n"), name + "-geometry")
        try require(!visible.isEmpty, app, "No visible interactive targets")
        for control in visible {
            let fixedNavigation = control.elementType == .link && Destination.allCases.map(\.rawValue).contains(control.label)
            try target(control, app, mustFullyVisible: fixedNavigation)
        }
        var issues = 0
        var unavailable = false
        let priorFailureMode = continueAfterFailure
        continueAfterFailure = true
        defer { continueAfterFailure = priorFailureMode }
        do {
            try app.performAccessibilityAudit(for: [.contrast, .sufficientElementDescription, .textClipped, .trait]) { issue in
                issues += 1
                self.attach(String(describing: issue), name + "-audit-issue-\(issues)")
                self.emit("NAV138_AUDIT_ISSUE")
                return false
            }
        } catch {
            unavailable = true
            attach(String(describing: error), name + "-audit-error")
            emit("NAV138_AUDIT_ERROR")
        }
        if issues == 0 && !unavailable {
            attach("contrast/sufficientElementDescription/textClipped/trait: completed with zero reported issues; no issue suppressed", name + "-audit")
            emit(marker)
        } else {
            auditHadIssues = true
            attach("Unfiltered audit issues: \(issues); unavailable: \(unavailable). Not approved; continue navigation only to retain remaining evidence.", name + "-audit")
            emit("NAV138_VIEW_AUDIT_FAILED")
        }
    }

    @MainActor private func wait(_ timeout: TimeInterval, _ body: @escaping () -> Bool) -> Bool {
        XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in body() }, object: nil)], timeout: timeout) == .completed
    }

    @MainActor private func require(_ value: Bool, _ app: XCUIApplication, _ message: String,
                                    file: StaticString = #filePath, line: UInt = #line) throws {
        guard value else {
            emit("NAV138_FAILURE"); capture(app, "FAIL-\(line)")
            XCTFail(message, file: file, line: line); throw Stop.held
        }
    }

    @MainActor private func capture(_ app: XCUIApplication, _ name: String) {
        let shot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        shot.name = "nav138-" + name; shot.lifetime = .keepAlways; add(shot)
        attach(app.debugDescription, name + "-ax")
    }

    private func attach(_ text: String, _ name: String) {
        let item = XCTAttachment(string: text)
        item.name = "nav138-" + name; item.lifetime = .keepAlways; add(item)
    }

    private func emit(_ marker: String) {
        FileHandle.standardOutput.write(Data((marker + "\n").utf8))
        try? FileHandle.standardOutput.synchronize()
    }
}
