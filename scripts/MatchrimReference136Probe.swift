import Foundation
import XCTest

// Read-only continuation. Confirming a proposal changes only the unsaved scan.
final class MatchrimReference136Tests: XCTestCase {
    private enum Hold: Error { case stopped }
    private let proposalHeading = "Propuestas de Winerim"
    private let choice = "Confirmar esta referencia"
    private let target = NSPredicate(format: "label CONTAINS[cd] %@ AND label CONTAINS[cd] %@ AND label CONTAINS[cd] %@",
                                     "Terre d", "Aigle", "Quarts de Chaume Grand Cru")

    @MainActor func testExistingQAReadOnlyReference136() throws {
        continueAfterFailure = false
        #if targetEnvironment(simulator)
        let env = ProcessInfo.processInfo.environment
        guard env["MATCHRIM136_INPUT_SHA256"] == "a6e1e36b8c3f5220a6174320af42e788826103d5fb09d7b25bb0bc1bbc194409",
              UUID(uuidString: env["MATCHRIM136_RUN_ID"] ?? "") != nil else {
            XCTFail("Fresh host photo attestation required"); return
        }
        let app = XCUIApplication(bundleIdentifier: "wine.matchrim.qa99review")
        app.launch()
        defer { audit(app, "99-final"); app.terminate() }
        try require(app.frame.height > app.frame.width, app, "Expected portrait device; do not change simulator settings")
        try tap(app.links["Perfil"].firstMatch, app)
        try require(app.staticTexts["info@winerim.com"].waitForExistence(timeout: 12)
                    && app.secureTextFields.count == 0 && !app.buttons["Entrar en Matchrim"].exists,
                    app, "Existing literal QA session required; no authentication")
        try genuine(app)
        audit(app, "01-existing-qa-session")
        emit("REF136_EXISTING_QA_IDENTITY")
        try tap(app.links["Escanear"].firstMatch, app)
        let bottles = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Botellas"))
        try require(bottles.count == 1, app, "Ambiguous scanner entry")
        try tap(bottles.firstMatch, app)
        try require(app.switches["Una etiqueta"].firstMatch.waitForExistence(timeout: 10)
                    && !app.staticTexts["Antes de analizar una imagen"].exists,
                    app, "Expected previously acknowledged scanner; do not alter privacy preferences")
        let local = app.switches["Una etiqueta"].firstMatch
        if !selected(local) { try tap(local, app) }
        try require(selected(local) && app.staticTexts["Fotograf\u{00ed}a una etiqueta"].waitForExistence(timeout: 8),
                    app, "Explicit local mode required before picker")
        try genuine(app)
        audit(app, "02-local-mode-before-picker")
        emit("REF136_LOCAL_MODE_SELECTED")
        try tap(app.buttons["Elegir de galer\u{00ed}a"].firstMatch, app)
        try photo(app)
        try require(wait(55) { app.staticTexts[self.proposalHeading].exists || self.linked(app) },
                    app, "Real local reading/public proposals did not complete; no retry")
        try genuine(app)
        try require(!linked(app)
                    && app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "Etiqueta por identificar")).firstMatch.exists
                    && app.staticTexts["Referencia propuesta"].exists
                    && app.staticTexts["No hemos confirmado el vino. Compara la etiqueta y elige solo si coincide."].exists,
                    app, "Identity must remain pending before explicit selection")
        audit(app, "08-real-unconfirmed-proposals")
        // Expected names are predicates only, never typed into the app or OCR.
        let names = app.staticTexts.matching(target)
        try require(names.count == 1, app, "Expected reference absent or ambiguous; stop without any other action")
        emit("REF136_UNCONFIRMED_EXPECTED_PROPOSAL")
        try reveal(names.firstMatch, app)
        let containers = app.descendants(matching: .any).containing(.staticText, identifier: names.firstMatch.label)
            .allElementsBoundByIndex.filter {
                $0.buttons.matching(NSPredicate(format: "label == %@", self.choice)).count == 1
                    && !$0.staticTexts[self.proposalHeading].exists
            }
        guard let proposal = containers.min(by: { $0.frame.width * $0.frame.height < $1.frame.width * $1.frame.height }) else {
            try require(false, app, "No proposal-scoped confirmation"); return
        }
        try require(proposal.staticTexts.matching(target).count == 1, app, "Proposal scope changed")
        try require(proposal.staticTexts.matching(NSPredicate(format: "label == %@", "Domaine Aguilas")).count == 1
                    && proposal.staticTexts.matching(NSPredicate(format: "label == %@", "2020")).count > 0
                    && proposal.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Elegirla cambiar\u{00e1} tu a\u{00f1}ada a")).firstMatch.exists,
                    app, "Observed2020 proposal and explicit vintage-change warning required")
        audit(app, "09-before-explicit-reference")
        attach("2020 is chosen explicitly from the public proposal after its visible vintage-change warning, not read or certified from the photograph.", "selected-vintage-scope")
        try tap(proposal.buttons[choice].firstMatch, app)
        emit("REF136_EXPLICIT_REFERENCE_SELECTED")
        let source = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "Fuente: ficha p\u{00fa}blica Winerim.")).firstMatch
        try require(source.waitForExistence(timeout: 25)
                    && app.links["Ver ficha original Winerim"].exists
                    && app.staticTexts.matching(target).count > 0
                    && app.staticTexts["2020"].firstMatch.exists
                    && app.staticTexts["Domaine Aguilas"].firstMatch.exists,
                    app, "Independent expected public2020 fiche required")
        let estimates = app.otherElements.matching(NSPredicate(format: "label MATCHES %@", "^Afinidad orientativa: [0-9]{1,3} de 100$"))
        try require(estimates.firstMatch.waitForExistence(timeout: 10) && estimates.count == 1,
                    app, "Unique numeric affinity unavailable")
        let estimate = estimates.firstMatch
        let value = estimate.label.replacingOccurrences(of: "Afinidad orientativa: ", with: "")
            .replacingOccurrences(of: " de 100", with: "")
        guard let affinity = Int(value), (0...100).contains(affinity) else {
            try require(false, app, "Invalid numeric affinity"); return
        }
        try require(app.staticTexts["Lo que podr\u{00ed}a gustarte menos"].exists
                    && app.buttons["Ver el detalle de afinidad"].exists,
                    app, "Consumer explanation and detailed-affinity action required")
        try genuine(app)
        try reveal(estimate, app)
        audit(app, "10-independent-fiche-numeric-affinity")
        attach("Current unsaved affinity: \(affinity)/100 for the explicitly chosen2020 public reference. Not photo-certified vintage, consumer accuracy, or new persistence.", "affinity-scope")
        emit("REF136_INDEPENDENT_FICHE_NUMERIC_AFFINITY")
        // No batch confirmation. Closing the drawer and navigating away is read-only.
        try tap(app.buttons["Cerrar"].firstMatch, app)
        try existingCellar(app)
        attach("UI/source-bound local Apple Vision path and public reference. No packet-level model-call assertion. No data writes, new save, persistence comparison, or taste-accuracy claim.", "scope")
        emit("REF136_READONLY_REFERENCE_COMPLETE")
        #else
        XCTFail("Owned simulator only")
        #endif
    }

    @MainActor private func photo(_ app: XCUIApplication) throws {
        let library = app.buttons["Photo Library"].firstMatch
        try require(library.waitForExistence(timeout: 10) && library.isHittable, app, "Exact observed Photo Library action required")
        audit(app, "03-photo-library-before")
        try tap(library, app)
        let sort = app.buttons.matching(identifier: "Sort and Filter")
        try require(sort.firstMatch.waitForExistence(timeout: 15) && sort.count == 1, app, "Known Photos sorting control required")
        audit(app, "04-before-added-sort")
        try tap(sort.firstMatch, app)
        let added = app.buttons["Ordenar por fecha de adici\u{00f3}n"].firstMatch
        try tap(added, app)
        try tap(sort.firstMatch, app)
        try require(added.waitForExistence(timeout: 8) && added.isSelected, app, "Date-added ordering is not selected")
        audit(app, "05-added-sort-verified")
        emit("REF136_PHOTOS_ADDED_ORDER_VERIFIED")
        // Re-select the verified menu item to dismiss its own menu; no outside tap.
        try tap(added, app)
        var groups: [XCUIElement] = []
        try require(wait(12) {
            groups = app.otherElements.matching(identifier: "PXGGridLayout-Group").allElementsBoundByIndex.filter {
                $0.images.matching(identifier: "PXGGridLayout-Info").count > 0
            }
            return groups.count == 1 && !added.exists
        }, app, "Unique observed image grid required after menu dismissal settles")
        let images = groups[0].images.matching(identifier: "PXGGridLayout-Info").allElementsBoundByIndex
        guard let first = images.first else { try require(false, app, "No first date-added image"); return }
        let frame = first.frame
        try require(frame.width >= 44 && frame.height >= 44 && frame.minX >= -1 && frame.minY >= 154
                    && frame.maxX <= app.frame.maxX + 1 && frame.maxY < app.frame.maxY - 76
                    && images.dropFirst().allSatisfy { other in
                        other.frame.minY > frame.minY + 2
                            || (abs(other.frame.minY - frame.minY) <= 2 && other.frame.minX > frame.minX)
                    }, app, "First AX image must also be the top-left visible item; no guessed index")
        audit(app, "06-attested-first-image-before")
        attach(first.debugDescription, "first-image-ax")
        // iOS26 exposes this image as non-hittable. Only its measured centre is permitted.
        if first.isHittable { first.tap() }
        else { first.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap() }
        audit(app, "07-first-image-after")
        emit("REF136_ATTESTED_PHOTO_SELECTED")
        let doneID = "PUOneUpBarButtonItemIdentifierAssetExplorerReviewScreenDone"
        var used = Set<String>()
        for step in 0..<2 {
            var completion: XCUIElement?
            try require(wait(10) {
                let done = app.buttons[doneID].firstMatch
                let choices = ["Add", "Choose", "A\u{00f1}adir", "Agregar", "Elegir", "Seleccionar"].map { app.buttons[$0].firstMatch }
                    .filter { $0.exists && $0.isHittable && $0.isEnabled }
                completion = done.exists && done.isHittable && done.isEnabled ? done : choices.count == 1 ? choices[0] : nil
                return completion != nil || (!sort.firstMatch.exists && !app.navigationBars["PUOneUpView"].exists)
            }, app, "Picker completion unknown; no retry")
            guard let button = completion else { return }
            try require(used.insert(button.identifier + button.label).inserted, app, "Never repeat picker completion")
            audit(app, "07-completion-\(step)-before")
            try tap(button, app)
            audit(app, "07-completion-\(step)-after")
        }
        try require(wait(8) { !sort.firstMatch.exists && !app.navigationBars["PUOneUpView"].exists }, app, "Picker did not close")
    }

    @MainActor private func existingCellar(_ app: XCUIApplication) throws {
        try tap(app.links["Bodega"].firstMatch, app)
        let section = app.switches.matching(NSPredicate(format: "label BEGINSWITH %@", "Por probar")).firstMatch
        try require(section.waitForExistence(timeout: 10), app, "Existing cellar view unavailable")
        if !selected(section) { try tap(section, app) }
        let cards = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Ver "))
        try require(wait(12) { cards.count > 0 || app.staticTexts["Guarda aqu\u{00ed} los vinos que te recomienda Winerim"].exists },
                    app, "Existing cellar did not finish loading")
        try require(selected(section) && !app.staticTexts["No hemos podido cargar tus vinos"].exists, app, "Cellar read failed")
        audit(app, "11-existing-cellar")
        let matches = cards.matching(target)
        guard matches.count == 1 else {
            attach("Expected existing card count: \(matches.count). No creation, fallback selection, or persistence assertion.", "existing-cellar-unavailable")
            emit("REF136_EXISTING_BODEGA_UNAVAILABLE"); return
        }
        try tap(matches.firstMatch, app)
        try require(app.buttons["Cerrar vino"].firstMatch.waitForExistence(timeout: 8), app, "Existing wine detail unavailable")
        try require(app.links["Ficha original de Winerim"].exists && app.staticTexts.matching(target).count > 0,
                    app, "Existing detail must independently identify the expected reference")
        _ = wait(8) { app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "Al guardar:")).firstMatch.exists }
        let initial = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "Al guardar:")).allElementsBoundByIndex
        let current = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@ AND label ENDSWITH %@", "\u{2248}", "/100 para ti")).allElementsBoundByIndex
        audit(app, "12-existing-initial-current-scores")
        if initial.count == 1, current.count == 1,
           let old = score(initial[0].label, prefix: "Al guardar: \u{2248}"),
           let now = score(current[0].label, prefix: "\u{2248}") {
            attach("Existing Bodega only: initial \(old)/100; current \(now)/100. No equality, new save or persistence assertion.", "existing-scores")
            emit("REF136_EXISTING_BODEGA_CAPTURED")
        } else {
            attach("Existing detail opened; initial/current numeric style labels not both available. AX and screenshot retained.", "existing-scores-unavailable")
            emit("REF136_EXISTING_BODEGA_UNAVAILABLE")
        }
        try tap(app.buttons["Cerrar vino"].firstMatch, app)
    }

    private func score(_ text: String, prefix: String) -> Int? {
        guard text.hasPrefix(prefix) else { return nil }
        let rest = text.dropFirst(prefix.count)
        guard let end = rest.range(of: "/100"), let number = Int(rest[..<end.lowerBound]), (0...100).contains(number) else { return nil }
        return number
    }

    @MainActor private func linked(_ app: XCUIApplication) -> Bool {
        app.links["Ver ficha original Winerim"].exists || app.staticTexts.matching(NSPredicate(
            format: "label BEGINSWITH %@", "Fuente: ficha p\u{00fa}blica Winerim.")).firstMatch.exists
    }

    @MainActor private func genuine(_ app: XCUIApplication) throws {
        try require(!app.staticTexts.matching(NSPredicate(format: "label CONTAINS[cd] %@", "QA local: respuestas deterministas")).firstMatch.exists,
                    app, "Fixture UI cannot prove real reading")
    }

    @MainActor private func selected(_ element: XCUIElement) -> Bool {
        element.isSelected || ["1", "true"].contains(String(describing: element.value ?? "").lowercased())
    }

    @MainActor private func tap(_ element: XCUIElement, _ app: XCUIApplication) throws {
        try require(element.waitForExistence(timeout: 8), app, "Named control unavailable")
        try reveal(element, app)
        try require(element.isEnabled, app, "Named control disabled")
        element.tap()
    }

    @MainActor private func reveal(_ element: XCUIElement, _ app: XCUIApplication) throws {
        let region = app.otherElements["Contenido de la regi\u{00f3}n 1"].firstMatch
        let surface = region.exists && region.isHittable ? region : app.webViews.firstMatch.exists ? app.webViews.firstMatch : app
        for direction in 0..<2 {
            for _ in 0..<4 {
                if element.exists && element.isHittable { return }
                if direction == 0 { surface.swipeUp() } else { surface.swipeDown() }
            }
        }
        try require(element.exists && element.isHittable, app, "Bounded reveal failed")
    }

    @MainActor private func wait(_ timeout: TimeInterval, _ body: @escaping () -> Bool) -> Bool {
        XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in body() }, object: nil)], timeout: timeout) == .completed
    }

    @MainActor private func require(_ condition: Bool, _ app: XCUIApplication, _ message: String,
                                    file: StaticString = #filePath, line: UInt = #line) throws {
        if !condition {
            emit("REF136_FAILURE"); audit(app, "FAIL-\(line)")
            XCTFail(message, file: file, line: line); throw Hold.stopped
        }
    }

    @MainActor private func audit(_ app: XCUIApplication, _ name: String) {
        let image = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        image.name = "ref136-" + name; image.lifetime = .keepAlways; add(image)
        attach(app.debugDescription, name + "-ax")
    }

    private func attach(_ text: String, _ name: String) {
        let attachment = XCTAttachment(string: text)
        attachment.name = "ref136-" + name; attachment.lifetime = .keepAlways; add(attachment)
    }

    private func emit(_ marker: String) {
        FileHandle.standardOutput.write(Data((marker + "\n").utf8))
        try? FileHandle.standardOutput.synchronize()
    }
}
