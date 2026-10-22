import Foundation
import XCTest

// One test entry point. All interactions are named navigation or local disclosures.
final class MatchrimCellar144Tests: XCTestCase {
    @MainActor func testExistingQAReadOnlyCellar144() throws {
        enum Hold: Error { case stopped }
        continueAfterFailure = false
        #if targetEnvironment(simulator)
        let runID = ProcessInfo.processInfo.environment["MATCHRIM144_RUN_ID"] ?? ""
        guard UUID(uuidString: runID) != nil else {
            XCTFail("Fresh sanitized host plan required"); return
        }
        let app = XCUIApplication(bundleIdentifier: "wine.matchrim.qa99review")
        func emit(_ marker: String) {
            FileHandle.standardOutput.write(Data((marker + "\n").utf8))
            try? FileHandle.standardOutput.synchronize()
        }
        func text(_ value: String, _ name: String) {
            let item = XCTAttachment(string: value)
            item.name = "cellar144-" + name; item.lifetime = .keepAlways; add(item)
        }
        func capture(_ name: String) {
            let item = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
            item.name = "cellar144-" + name; item.lifetime = .keepAlways; add(item)
            text(app.debugDescription, name + "-ax")
        }
        func require(_ condition: Bool, _ message: String) throws {
            if !condition {
                emit("CELLAR144_FAILURE"); capture("failure")
                XCTFail(message); throw Hold.stopped
            }
        }
        func wait(_ seconds: TimeInterval, _ body: @escaping () -> Bool) -> Bool {
            XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in body() }, object: nil)],
                          timeout: seconds) == .completed
        }
        func selected(_ item: XCUIElement) -> Bool {
            item.isSelected || ["1", "true"].contains(String(describing: item.value ?? "").lowercased())
        }
        func reveal(_ item: XCUIElement) throws {
            // Scroll only toward an already identified element; never use coordinates.
            try require(item.exists, "Unknown element; no discovery swipe or fallback")
            let surface = app.webViews.firstMatch
            for direction in 0..<2 {
                for _ in 0..<4 {
                    if item.isHittable { return }
                    try require(surface.exists, "Known WebView required for bounded reveal")
                    if direction == 0 { surface.swipeUp() } else { surface.swipeDown() }
                }
            }
            try require(item.isHittable, "Named element not reachable")
        }
        func tap(_ query: XCUIElementQuery) throws {
            try require(query.firstMatch.waitForExistence(timeout: 10) && query.count == 1,
                        "Named control absent or ambiguous; stop")
            let item = query.firstMatch
            try reveal(item)
            try require(item.isEnabled, "Named control disabled")
            item.tap()
        }
        func exact(_ root: XCUIElement, _ label: String) -> XCUIElementQuery {
            root.staticTexts.matching(NSPredicate(format: "label == %@", label))
        }
        func disclosure(_ root: XCUIElement, _ label: String) throws {
            // HTML summary maps to Button in the retained reference probe. No type fallback.
            try tap(root.buttons.matching(NSPredicate(format: "label == %@", label)))
        }
        func genuine() throws {
            try require(!app.staticTexts.matching(NSPredicate(format: "label CONTAINS[cd] %@",
                "QA local: respuestas deterministas")).firstMatch.exists, "Fixtures cannot prove a real readback")
            try require(app.secureTextFields.count == 0
                && !app.buttons["Entrar en Matchrim"].exists, "No authentication form allowed")
        }
        func number(_ label: String, _ pattern: String) -> Int? {
            guard let regex = try? NSRegularExpression(pattern: pattern),
                  let match = regex.firstMatch(in: label, range: NSRange(label.startIndex..., in: label)),
                  let range = Range(match.range(at: 1), in: label),
                  let value = Int(label[range]), (0...100).contains(value) else { return nil }
            return value
        }
        let dimensionPattern = "^(potencia|acidez|dulzor|tanino|fruta): tu perfil ([0-9]+[.][0-9])/5; este vino ([0-9]+[.][0-9])/5$"
        func validDimension(_ label: String) -> Bool {
            guard let regex = try? NSRegularExpression(pattern: dimensionPattern),
                let match = regex.firstMatch(in: label, range: NSRange(label.startIndex..., in: label)) else { return false }
            return [2, 3].allSatisfy { index in
                guard let range = Range(match.range(at: index), in: label),
                    let value = Double(label[range]) else { return false }
                return value.isFinite && (0...5).contains(value)
            }
        }

        app.launch()
        defer { app.terminate() }
        try require(app.wait(for: .runningForeground, timeout: 15)
                    && app.frame.height > app.frame.width, "Existing portrait app required; do not change settings")
        try require(wait(20) {
            app.buttons["Abrir perfil"].exists && app.buttons["Abrir perfil"].isHittable
                && app.buttons["Buscar vino o bodega"].exists && app.staticTexts["Para ti"].exists
                && app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Ver por qu\u{00e9} ")).count > 0
        }, "Loaded authenticated Home required before navigation; do not authenticate or retry")
        try tap(app.links.matching(NSPredicate(format: "label == %@", "Perfil")))
        let identity = app.otherElements.matching(NSPredicate(format: "label == %@", "Correo de tu cuenta: info@winerim.com"))
        try require(identity.firstMatch.waitForExistence(timeout: 15) && identity.count == 1
                    && identity.firstMatch.isHittable && app.textFields.count == 0,
                    "Visible literal QA email on Profile required; never authenticate")
        try genuine(); capture("01-profile")
        emit("CELLAR144_EXISTING_QA_IDENTITY")
        try tap(app.links.matching(NSPredicate(format: "label == %@", "Bodega")))
        let category = app.switches.matching(NSPredicate(format: "label MATCHES %@", "^Probados[0-9]+$"))
        try require(category.firstMatch.waitForExistence(timeout: 15) && category.count == 1,
                    "Observed Probados switch required; no other category")
        capture("02-bodega-before-category")
        if !selected(category.firstMatch) { try tap(category) }
        try require(wait(15) { selected(category.firstMatch) }, "Probados selection not proven")
        let names = ["Flor de Muga Blanco", "Manzanilla La Gitana"]
        let ratings = ["love", "not_for_me"]
        let ratingLabels = ["Ya sabes que te gusta", "Ya sabes que no te gusta"]
        let libraryIDs = [279035, 278688]
        let cards = names.map { name in app.buttons.matching(NSPredicate(format: "label == %@", "Ver " + name)) }
        try require(wait(20) { cards.allSatisfy { $0.count == 1 } }
                    && !app.staticTexts["No hemos podido cargar tus vinos"].exists,
                    "Both exact known cards required in Probados; no search, filters, substitutes or creation")
        try genuine(); capture("03-probados")
        let categoryLabel = category.firstMatch.label
        emit("CELLAR144_PROBADOS_KNOWN_CARDS")

        for index in names.indices {
            try require(selected(category.firstMatch) && cards.allSatisfy { $0.count == 1 }, "Category/cards changed")
            try tap(cards[index])
            try require(app.buttons["Cerrar vino"].waitForExistence(timeout: 10), "Known detail did not open")
            let dialogs = app.otherElements.matching(NSPredicate(format: "label == %@", "Tu vino, cuadro de di\u{00e1}logo de web"))
            try require(dialogs.count == 1, "Unique observed web dialog required")
            let detail = dialogs.firstMatch
            let heading = detail.otherElements.matching(NSPredicate(format: "label == %@", names[index]))
            try require(heading.count == 1 && exact(heading.firstMatch, names[index]).count == 1
                && detail.buttons.matching(NSPredicate(format: "label == %@", "Cerrar vino")).count == 1
                && exact(detail, ratingLabels[index]).count == 1, "Exact visible wine heading, saved rating and close required")
            if index == 0 { try require(exact(detail, "2022").count == 1, "Flor detail must expose 2022") }
            capture("0\(index + 4)-rating-first")
            try disclosure(detail, "Ver afinidad por estilo")
            let styleScores = detail.staticTexts.matching(NSPredicate(format: "label MATCHES %@", "^\u{2248}[0-9]{1,3}/100 para ti$"))
            let exactScores = detail.staticTexts.matching(NSPredicate(format: "label MATCHES %@", "^\u{2248}[0-9]{1,3}/100$"))
            try require(wait(12) { styleScores.count == 1 || exactScores.count == 1 }, "Current numeric affinity unavailable; never calculate/retry")
            try require(styleScores.count + exactScores.count == 1, "Competing current affinity labels; stop")
            let byStyle = styleScores.count == 1
            let currentLabel = (byStyle ? styleScores : exactScores).firstMatch.label
            guard let current = number(currentLabel, "^\u{2248}([0-9]{1,3})/100(?: para ti)?$") else {
                try require(false, "Current affinity must be numeric 0...100"); return
            }
            let initialQuery = detail.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "Al guardar:"))
            _ = wait(3) { initialQuery.count > 0 }
            try require(initialQuery.count <= 1, "Ambiguous saved initial affinity")
            let initialLabel = initialQuery.count == 1 ? initialQuery.firstMatch.label : nil
            let initial = initialLabel.flatMap { number($0, byStyle
                ? "^Al guardar: \u{2248}([0-9]{1,3})/100 por estilo\\.(?:.*)$"
                : "^Al guardar: ([0-9]{1,3})/100(?:.*)$") }
            try require(initialLabel == nil || initial != nil, "Exposed initial label is malformed; not an unavailable value")
            if byStyle {
                try disclosure(detail, "Origen y l\u{00ed}mites")
            } else {
                try disclosure(detail, "Por qu\u{00e9} esta afinidad")
                let summary = detail.otherElements.matching(NSPredicate(format: "label MATCHES %@", "^Afinidad orientativa: [0-9]{1,3} de 100$"))
                try require(summary.firstMatch.waitForExistence(timeout: 8) && summary.count == 1
                    && number(summary.firstMatch.label, "^Afinidad orientativa: ([0-9]{1,3}) de 100$") == current,
                    "NativeAffinitySummary must agree with the current exact score")
                try disclosure(detail, "Ver el detalle de afinidad")
            }
            let provenanceNeedle = byStyle ? "La ficha p\u{00fa}blica no especifica" : "Basado en tu perfil y en la ficha de este vino."
            let provenance = detail.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", provenanceNeedle))
            try require(provenance.count == 1, "Source-backed explanation/provenance unavailable")
            let explanations: [String]
            if byStyle {
                explanations = detail.staticTexts.allElementsBoundByIndex.map { $0.label }.filter {
                    $0.hasPrefix("Encaja contigo por su ") || $0.contains("que tu preferencia habitual.")
                        || $0 == "Ficha Winerim sin a\u{00f1}ada. Orienta sobre el estilo, no verifica los datos de tu cosecha."
                }
            } else {
                explanations = detail.otherElements.matching(NSPredicate(format: "label MATCHES %@", dimensionPattern))
                    .allElementsBoundByIndex.map { $0.label }
                let axes = Set(explanations.compactMap { $0.split(separator: ":").first.map(String.init) })
                try require(explanations.count == 5 && axes == Set(["potencia", "acidez", "dulzor", "tanino", "fruta"])
                    && explanations.allSatisfy(validDimension), "All five named profile/wine dimensions must be exposed with bounded values")
            }
            try require(!explanations.isEmpty, "Read-only explanation content required")
            try reveal((byStyle ? styleScores : exactScores).firstMatch)
            try genuine()
            let evidenceName = index == 0 ? "06-flor-readback" : "07-gitana-readback"
            capture(evidenceName)
            var accessibilityIssues = 0
            try app.performAccessibilityAudit(for: [.contrast, .sufficientElementDescription, .textClipped, .trait]) { issue in
                accessibilityIssues += 1
                text(String(describing: issue), evidenceName + "-audit-issue")
                emit("CELLAR144_AUDIT_ISSUE")
                return false
            }
            try require(accessibilityIssues == 0, "Unfiltered wine-detail accessibility issues remain")
            text("contrast/sufficientElementDescription/textClipped/trait: completed with zero reported issues; none suppressed. Checked current detail viewport only, not VoiceOver speech or all scrolling content.", evidenceName + "-audit")
            let firstVerified = detail.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "Primera afinidad registrada:"))
                .allElementsBoundByIndex.map { $0.label }
            let record: [String: Any] = ["schemaVersion": 1, "runId": runID, "account": "info@winerim.com",
                "name": names[index], "rating": ratings[index], "ratingLabel": ratingLabels[index],
                "libraryIdContextOnly": libraryIDs[index], "vintageContext": index == 0 ? "2022" : "NV",
                "vintageEvidence": index == 0 ? "2022" : "NV not independently exposed by this UI",
                "categoryLabel": categoryLabel, "current": current, "currentLabel": currentLabel,
                "scoreKind": byStyle ? "reference-style" : "exact-affinity",
                "initialPresent": initial != nil, "initial": initial.map { $0 as Any } ?? NSNull(),
                "initialLabel": initialLabel.map { $0 as Any } ?? NSNull(),
                "initialUnavailableReason": initial == nil ? "Initial-at-save not exposed in this readback; historical data gap" as Any : NSNull(),
                "firstVerifiedLabels": firstVerified, "explanation": explanations, "provenance": provenance.firstMatch.label,
                "evidenceName": evidenceName, "newSavePersistenceValidated": false]
            let data = try JSONSerialization.data(withJSONObject: record, options: [.sortedKeys])
            let item = XCTAttachment(data: data, uniformTypeIdentifier: "public.json")
            item.name = "cellar144-" + (index == 0 ? "flor-record" : "gitana-record")
            item.lifetime = .keepAlways; add(item)
            try tap(detail.buttons.matching(NSPredicate(format: "label == %@", "Cerrar vino")))
            try require(!app.buttons["Cerrar vino"].exists, "Detail did not close")
            emit(index == 0 ? "CELLAR144_FLOR_READBACK" : "CELLAR144_GITANA_READBACK")
        }
        text("Existing two-wine UI readback only. Missing initial is unavailable, never zero or inferred. No initial/current new-save persistence validation. No auth, wine, rating, stock, edit, delete, quiz, reanalysis, photo or model action. No harness network request; app background reads/images are not packet-audited.", "scope")
        emit("CELLAR144_READONLY_COMPLETE")
        #else
        XCTFail("Owned simulator only")
        #endif
    }
}
