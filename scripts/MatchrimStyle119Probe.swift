import Foundation
import XCTest

// One isolated QA save only. Host permanently reserves the budget before UI runtime.
final class MatchrimStyle119Tests: XCTestCase {
    private enum ProbeFailure: Error { case stopped(String) }
    private let privacyCheckbox = "He le\u{00ed}do el aviso de privacidad del esc\u{00e1}ner"
    private let localHeading = "Fotograf\u{00ed}a una etiqueta"
    private let proposalHeading = "Propuestas de Winerim"
    private let confirmLabel = "Confirmar esta referencia"
    private var saves = 0
    private let targetPredicate = NSPredicate(format: "label CONTAINS[cd] %@ AND label CONTAINS[cd] %@ AND label CONTAINS[cd] %@", "Terre d", "Aigle", "Quarts de Chaume Grand Cru")

    @MainActor func testExistingQAStyleRoundtrip119() throws {
        continueAfterFailure = false
        #if targetEnvironment(simulator)
        let env = ProcessInfo.processInfo.environment
        guard let reservation = env["MATCHRIM119_RESERVATION_ID"], UUID(uuidString: reservation) != nil else {
            XCTFail("Host save reservation required"); return
        }
        let app = XCUIApplication(bundleIdentifier: "wine.matchrim.qa99review")
        XCUIDevice.shared.orientation = .portrait
        app.launch()
        defer { audit(app, "99-final") }
        try account(app)
        try cellar(app)
        try require(cards(app).count == 0, app, "Target already exists: never duplicate or delete")
        // All cards are loaded by this native list. Audit the complete AX tree.
        audit(app, "02-before-save-no-target")
        try tap(app.links["Escanear"].firstMatch, app)
        let bottles = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Botellas"))
        try require(bottles.count == 1, app, "Ambiguous Botellas entry")
        try tap(bottles.firstMatch, app)
        try require(waitUntil(12) { app.staticTexts["Etiqueta de vino"].exists || app.staticTexts["Antes de analizar una imagen"].exists }, app, "Label screen missing")
        try acknowledgePrivacyIfPresent(app)
        let local = app.switches["Una etiqueta"].firstMatch
        try tap(local, app)
        try require(app.staticTexts[localHeading].waitForExistence(timeout: 8), app, "Explicit local mode required before gallery")
        try rejectFixtureUI(app)
        audit(app, "03-local-mode-before-gallery")
        try tap(app.buttons["Elegir de galer\u{00ed}a"].firstMatch, app)
        try selectPreparedPhoto(app)
        try require(waitUntil(55) { app.staticTexts[self.proposalHeading].exists || self.hasLinkedIdentity(app) }, app, "Real Apple Vision/public proposals missing")
        try assertPendingIdentity(app)
        try rejectFixtureUI(app)
        audit(app, "04-real-proposals")
        let names = app.staticTexts.matching(targetPredicate)
        try require(names.count == 1, app, "Expected one exact Terre d'Aigle Quarts de Chaume Grand Cru proposal")
        let target = names.firstMatch
        try reveal(target, in: app, stage: "proposal")
        let containers = app.descendants(matching: .any).containing(.staticText, identifier: target.label)
            .allElementsBoundByIndex.filter {
                $0.buttons.matching(NSPredicate(format: "label == %@", self.confirmLabel)).count == 1
                    && !$0.staticTexts[self.proposalHeading].exists
            }
        guard let proposal = containers.min(by: { area($0) < area($1) }) else {
            try require(false, app, "No unambiguous proposal-scoped choice"); return
        }
        try require(proposal.staticTexts.matching(targetPredicate).count == 1, app, "Proposal scope changed")
        try tap(proposal.buttons[confirmLabel].firstMatch, app)
        let source = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "Fuente: ficha p\u{00fa}blica Winerim.")).firstMatch
        try require(source.waitForExistence(timeout: 30), app, "Independent original public fiche source missing")
        try require(app.links["Ver ficha original Winerim"].exists && app.staticTexts.matching(targetPredicate).count > 0, app, "Original public fiche or expected name missing")
        try require(app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Ficha sin a\u{00f1}ada")).firstMatch.exists, app, "Public reference must be NV; do not manufacture vintage")
        try rejectFixtureUI(app)
        let estimate = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "Por su estilo:")).firstMatch
        try require(estimate.waitForExistence(timeout: 12), app, "Current numeric style estimate required")
        let score = try scoreFrom(estimate.label, prefix: "Por su estilo: \u{2248}", app: app)
        try reveal(estimate, in: app, stage: "current-style")
        audit(app, "05-original-public-fiche-nv-score")
        try tap(app.buttons["Cerrar"].firstMatch, app)
        let confirm = app.buttons.matching(NSPredicate(format: "label == %@", "Confirmar 1 referencia"))
        try require(confirm.count == 1 && saves == 0, app, "Exactly one reference and one remaining save required")
        try reveal(confirm.firstMatch, in: app, stage: "one-save")
        try require(confirm.firstMatch.isEnabled, app, "Single batch save must be enabled")
        audit(app, "06-immediately-before-one-save")
        saves += 1
        try durableSaveMarker(reservation)
        confirm.firstMatch.tap()
        try require(app.buttons["Lote confirmado"].firstMatch.waitForExistence(timeout: 25), app, "Save outcome unknown; never retry")
        audit(app, "07-lote-confirmado")
        try cellar(app)
        try saved(app, score: score, stage: "08-saved")
        emit("STYLE119_SAVED_SCORE_VERIFIED")
        try tap(app.buttons["Cerrar vino"].firstMatch, app)
        app.terminate(); app.launch()
        try account(app)
        try cellar(app)
        try saved(app, score: score, stage: "09-relaunched")
        emit("STYLE119_RELAUNCHED_SCORE_VERIFIED")
        try tap(app.buttons["Cerrar vino"].firstMatch, app)
        try require(saves == 1, app, "One save only")
        attach("Real isolated QA account; original public NV reference and saved initial score survive app relaunch. No human-taste accuracy claim; no authentication, ratings, quiz, stock or model-start controls used.", "scope")
        emit("STYLE119_REAL_PERSISTED110_NV_ROUNDTRIP_COMPLETE")
        #else
        XCTFail("Dedicated simulator only")
        #endif
    }

    @MainActor private func account(_ app: XCUIApplication) throws {
        try tap(app.links["Perfil"].firstMatch, app)
        try require(app.staticTexts["info@winerim.com"].waitForExistence(timeout: 15), app, "Literal isolated QA account required; no login here")
        try require(app.secureTextFields.count == 0 && !app.buttons["Entrar en Matchrim"].exists, app, "Authenticated session required")
        let sensory = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Perfil Sensorial")).firstMatch
        try tap(sensory, app)
        try require(app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Tu perfil sensorial")).firstMatch.waitForExistence(timeout: 15)
                    && !app.staticTexts["No hemos podido cargar tu test"].exists, app, "Loaded sensory profile required")
        try rejectFixtureUI(app)
        audit(app, "01-literal-qa-loaded-sensory")
    }

    @MainActor private func cellar(_ app: XCUIApplication) throws {
        try tap(app.links["Bodega"].firstMatch, app)
        let section = app.switches.matching(NSPredicate(format: "label BEGINSWITH %@", "Por probar")).firstMatch
        try tap(section, app)
        try require(waitUntil(15) {
            !app.staticTexts["No hemos podido cargar tus vinos"].exists
                && (app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Ver ")).count > 0
                    || app.staticTexts["Guarda aqu\u{00ed} los vinos que te recomienda Winerim"].exists)
        }, app, "Por probar must finish loading without error")
        try require(["1", "true"].contains(String(describing: section.value ?? "").lowercased()), app, "Por probar is not selected")
        audit(app, "por-probar-loaded")
    }

    @MainActor private func cards(_ app: XCUIApplication) -> XCUIElementQuery {
        app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@ AND label CONTAINS[cd] %@ AND label CONTAINS[cd] %@", "Ver ", "Terre d", "Aigle"))
    }

    @MainActor private func saved(_ app: XCUIApplication, score: Int, stage: String) throws {
        try require(cards(app).count == 1 && targetPredicate.evaluate(with: ["label": cards(app).firstMatch.label]), app, "Exactly one named Por probar card required")
        try tap(cards(app).firstMatch, app)
        try require(app.links["Ficha original de Winerim"].waitForExistence(timeout: 8), app, "Saved original public fiche missing")
        try require(app.staticTexts["Referencia sin a\u{00f1}ada. No confirma los datos sensoriales de tu botella."].exists, app, "Saved fiche must remain NV")
        let initial = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "Al guardar:")).firstMatch
        try require(initial.waitForExistence(timeout: 12), app, "Saved initial score did not load")
        let savedScore = try scoreFrom(initial.label, prefix: "Al guardar: \u{2248}", app: app)
        try require(initial.label.contains("por estilo.") && savedScore == score, app, "Saved initial style score differs from pre-save estimate")
        try reveal(initial, in: app, stage: stage)
        try rejectFixtureUI(app)
        audit(app, stage)
    }

    @MainActor private func scoreFrom(_ text: String, prefix: String, app: XCUIApplication) throws -> Int {
        try require(text.hasPrefix(prefix), app, "Style score prefix changed")
        let rest = text.dropFirst(prefix.count)
        guard let end = rest.range(of: "/100"), let number = Int(rest[..<end.lowerBound]), (0...100).contains(number) else {
            try require(false, app, "Numeric style score missing"); return -1
        }
        return number
    }

    @MainActor private func tap(_ element: XCUIElement, _ app: XCUIApplication) throws {
        try require(element.waitForExistence(timeout: 10), app, "Named UI control missing")
        try reveal(element, in: app, stage: element.label)
        try require(element.isEnabled, app, "Named UI control disabled")
        element.tap()
    }

    private func emit(_ marker: String) {
        FileHandle.standardOutput.write(Data((marker + "\n").utf8))
        try? FileHandle.standardOutput.synchronize()
    }

    private func durableSaveMarker(_ reservation: String) throws {
        // Test-runner sandbox only, never the product data store. Fail before tapping
        // if this exclusive on-disk evidence cannot be synchronized.
        let marker = "STYLE119_SAVE_SUBMITTED_ONCE"
        let file = FileManager.default.temporaryDirectory.appendingPathComponent("style119-save-" + reservation + ".txt")
        try Data((marker + "\n").utf8).write(to: file, options: .withoutOverwriting)
        let handle = try FileHandle(forWritingTo: file)
        defer { try? handle.close() }
        try handle.synchronize()
        attach(marker + "\nreservation=" + reservation, "durable-before-save-marker")
        emit(marker)
    }

    @MainActor private func acknowledgePrivacyIfPresent(_ app: XCUIApplication) throws {
        let gate = app.staticTexts["Antes de analizar una imagen"].firstMatch
        let next = app.buttons["Entiendo y continuar"].firstMatch
        let checkbox = app.descendants(matching: .any)
            .matching(NSPredicate(format: "label == %@", privacyCheckbox)).firstMatch
        guard gate.exists || checkbox.exists || next.exists else {
            audit(app, "06-privacy-gate-not-present")
            return
        }
        audit(app, "06-privacy-gate-present")
        try reveal(checkbox, in: app, stage: "06-privacy-checkbox")
        let checkboxTypes: [XCUIElement.ElementType] = [.checkBox, .switch, .button]
        let checkboxValue = String(describing: checkbox.value ?? "").lowercased()
        let webCheckbox = checkbox.elementType == .other
            && ["0", "1", "true", "false", "checked", "unchecked"].contains(checkboxValue)
        try require(checkboxTypes.contains(checkbox.elementType) || webCheckbox, app,
                    "Exact privacy label was not exposed as a checkbox control")
        try require(next.exists, app, "Privacy checkbox exists without exact continue button")
        // The gate's continue button is enabled only while its checkbox is checked.
        if !next.isEnabled {
            checkbox.tap()
            audit(app, "07-privacy-checkbox-acknowledged")
        }
        try reveal(next, in: app, stage: "07-privacy-continue")
        try require(next.isEnabled, app, "Privacy acknowledgement did not enable continue")
        next.tap()
        try require(waitUntil(8) { !next.exists }, app, "ScanPrivacyGate did not dismiss")
        audit(app, "07-privacy-dismissed")
    }

    @MainActor private func selectPreparedPhoto(_ app: XCUIApplication) throws {
        let libraryLabels = ["Fototeca", "Biblioteca de fotos", "Photo Library"]
        var openedLibrary = false
        let ready = waitUntil(15) {
            !self.photoGrids(app).isEmpty || libraryLabels.contains { app.buttons[$0].firstMatch.isHittable }
        }
        try require(ready, app, "Unknown picker/action sheet; no guessed process or coordinate fallback")
        let observed = libraryLabels.compactMap { label -> XCUIElement? in
            let button = app.buttons[label].firstMatch
            return button.exists && button.isHittable ? button : nil
        }
        if !observed.isEmpty {
            try require(observed.count == 1, app, "Expected exactly one known Photo Library action")
            audit(app, "14-observed-photo-library-action")
            observed[0].tap()
            openedLibrary = true
            audit(app, "15-after-photo-library-action")
        }
        try require(waitUntil(20) { !self.photoGrids(app).isEmpty }, app,
                    "No known photo collection grid; preserve evidence and stop")
        let grids = photoGrids(app)
        let knownPicker = openedLibrary
            || ["Cancel", "Cancelar"].contains { app.buttons[$0].firstMatch.isHittable }
            || ["Photos", "Fotos", "Recents", "Recientes", "Photo Library", "Fototeca"].contains {
                app.navigationBars[$0].exists
            }
        try require(knownPicker && grids.count == 1, app,
                    "Photo grid is not uniquely identifiable in the observed app XCUI tree")
        let first = grids[0].elementType == .collectionView ? grids[0].cells.firstMatch
            : grids[0].images.matching(identifier: "PXGGridLayout-Info").firstMatch
        try require(first.waitForExistence(timeout: 8), app,
                    "Photo grid first item must exist; do not pick another item")
        audit(app, "16-photo-grid-first-cell-before-selection")
        attach("Runner must attest first photo is prepared img-001.jpg; XCUI cell label: "
               + first.label + "\n" + first.debugDescription, "16-selected-media-assumption")
        if first.isHittable { first.tap() }
        else {
            // Observed Photos26 AX image reports non-hittable despite a visible
            // stable frame. Use only that named image's measured on-screen centre.
            let frame = first.frame
            try require(first.elementType == .image && first.identifier == "PXGGridLayout-Info"
                        && frame.width >= 44 && frame.height >= 44
                        && frame.minX >= -1 && frame.minY >= 154
                        && frame.maxX <= app.frame.maxX + 1 && frame.maxY < app.frame.maxY - 76,
                        app, "Non-hittable photo lacks a safe observed on-screen frame")
            first.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
        }
        audit(app, "17-photo-grid-after-first-cell")

        // Some iOS pickers return immediately; others expose Add/Choose.
        let completionLabels = ["Add", "Choose", "A\u{00f1}adir", "Agregar", "Elegir", "Seleccionar"]
        let reviewDoneID = "PUOneUpBarButtonItemIdentifierAssetExplorerReviewScreenDone"
        var usedCompletionLabels = Set<String>()
        for step in 0..<2 {
            var completion: XCUIElement?
            let transitioned = waitUntil(12) {
                let reviewDone = app.buttons[reviewDoneID].firstMatch
                completion = reviewDone.exists && reviewDone.isHittable && reviewDone.isEnabled ? reviewDone
                    : completionLabels.compactMap { label -> XCUIElement? in
                    let button = app.buttons[label].firstMatch
                    return button.exists && button.isHittable && button.isEnabled ? button : nil
                }.first
                return completion != nil || (self.photoGrids(app).isEmpty && !app.navigationBars["PUOneUpView"].exists)
            }
            try require(transitioned, app, "Picker stayed open without a known Add/Choose control")
            guard let button = completion else { return }
            try require(usedCompletionLabels.insert(button.label).inserted, app,
                        "Picker completion control persisted; do not tap it twice")
            audit(app, "17-picker-completion-\(step)-before")
            button.tap()
            audit(app, "17-picker-completion-\(step)-after")
        }
        try require(waitUntil(10) { self.photoGrids(app).isEmpty && !app.navigationBars["PUOneUpView"].exists }, app,
                    "Photo picker did not finish after bounded Add/Choose handling")
    }

    @MainActor private func photoGrids(_ app: XCUIApplication) -> [XCUIElement] {
        let collections = app.collectionViews.allElementsBoundByIndex.filter {
            $0.exists && $0.cells.count > 0 && !$0.buttons["Take Photo"].exists
                && !$0.buttons["Choose File"].exists
        }
        // Observed iOS26 Photos picker uses accessible images, not collection cells.
        let layouts = app.otherElements.matching(identifier: "PXGGridLayout-Group").allElementsBoundByIndex.filter {
            $0.exists && $0.images.matching(identifier: "PXGGridLayout-Info").count > 0
        }
        return collections + layouts
    }

    @MainActor private func hasLinkedIdentity(_ app: XCUIApplication) -> Bool {
        let labels = ["Ficha del cat\u{00e1}logo global Winerim", "Ficha original vinculada",
                      "Identificado en Winerim", "Identificado en el cat\u{00e1}logo Winerim",
                      "Referencia Winerim encontrada", "Referencia confirmada"]
        return labels.contains { label in
            app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH[cd] %@", label)).firstMatch.exists
        } || app.links["Ver ficha original Winerim"].exists
            || app.staticTexts.matching(NSPredicate(
                format: "label BEGINSWITH %@", "Fuente: ficha p\u{00fa}blica Winerim."
            )).firstMatch.exists
    }

    @MainActor private func assertPendingIdentity(_ app: XCUIApplication) throws {
        try require(!hasLinkedIdentity(app), app, "Linked identity exists before explicit proposal choice")
        try require(app.staticTexts.matching(NSPredicate(
            format: "label BEGINSWITH %@", "Etiqueta por identificar"
        )).firstMatch.exists, app, "OCR must leave the primary identity pending")
        try require(app.staticTexts["Referencia propuesta"].exists, app, "Missing proposed-identity status")
        try require(app.staticTexts["No hemos confirmado el vino. Compara la etiqueta y elige solo si coincide."].exists,
                    app, "Missing explicit unconfirmed-proposals notice")
    }

    @MainActor private func rejectFixtureUI(_ app: XCUIApplication) throws {
        try require(!app.staticTexts.matching(NSPredicate(
            format: "label CONTAINS[cd] %@", "QA local: respuestas deterministas"
        )).firstMatch.exists, app, "Deterministic fixture UI is not a real OCR/public-query run")
    }

    @MainActor private func reveal(_ element: XCUIElement, in app: XCUIApplication, stage: String) throws {
        if element.exists && element.isHittable { return }
        // The native drawer exposes this named scroll region. Otherwise scroll
        // the observed WebView, then the app surface; never synthesize coordinates.
        let region = app.otherElements["Contenido de la regi\u{00f3}n 1"].firstMatch
        let surface: XCUIElement = region.exists && region.isHittable ? region
            : app.webViews.firstMatch.exists ? app.webViews.firstMatch : app
        for direction in 0..<2 {
            for step in 0..<6 {
                if element.exists && element.isHittable { return }
                if direction == 0 { surface.swipeUp() } else { surface.swipeDown() }
                audit(app, "\(stage)-scroll-\(direction)-\(step)")
            }
        }
        try require(element.exists && element.isHittable, app,
                    "Bounded scrolling could not reveal \(stage)")
    }

    @MainActor private func area(_ element: XCUIElement) -> CGFloat {
        element.frame.width * element.frame.height
    }

    @MainActor private func waitUntil(_ timeout: TimeInterval, _ predicate: @escaping () -> Bool) -> Bool {
        let expectation = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in predicate() }, object: nil)
        return XCTWaiter.wait(for: [expectation], timeout: timeout) == .completed
    }

    @MainActor private func require(_ condition: Bool, _ app: XCUIApplication, _ message: String,
                                    file: StaticString = #filePath, line: UInt = #line) throws {
        guard condition else {
            emit("STYLE119_FAILURE")
            audit(app, "FAIL-\(line)")
            XCTFail(message, file: file, line: line)
            throw ProbeFailure.stopped(message)
        }
    }

    @MainActor private func audit(_ app: XCUIApplication, _ name: String) {
        let screenshot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        screenshot.name = "style119-" + name
        screenshot.lifetime = .keepAlways
        add(screenshot)
        attach("Orientation: \(XCUIDevice.shared.orientation.rawValue)\n" + app.debugDescription,
               name + "-debug-tree")
    }

    private func attach(_ text: String, _ name: String) {
        let attachment = XCTAttachment(string: text)
        attachment.name = "style119-" + name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}

