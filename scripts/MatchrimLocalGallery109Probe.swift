import Foundation
import XCTest

// Parent writer: d716d160-a366-4e2e-9919-e306ddcda37f.
// Runner preconditions: dedicated anonymous iOS simulator; actual candidate103+
// app with local-single support installed; ONLY prepared img-061.jpg imported,
// newest first. Copy this source as AutomationModeProbe.swift in the UI target.
// No fixture flags, API clients, account actions, media imports, or data resets.
// UI evidence cannot establish canonicalId internals, packet counts, or taste accuracy.
final class MatchrimLocalGallery109Tests: XCTestCase {
    private enum ProbeFailure: Error { case stopped(String) }
    private let privacyCheckbox = "He le\u{00ed}do el aviso de privacidad del esc\u{00e1}ner"
    private let localHeading = "Fotograf\u{00ed}a una etiqueta"
    private let proposalHeading = "Propuestas de Winerim"
    private let confirmLabel = "Confirmar esta referencia"

    @MainActor func testAnonymousLocalGallery109() throws {
        continueAfterFailure = false
        #if targetEnvironment(simulator)
        let app = XCUIApplication(bundleIdentifier: "wine.matchrim.qa99review")
        XCUIDevice.shared.orientation = .portrait
        app.terminate()
        app.launch()
        defer { audit(app, "99-final-state") }
        audit(app, "01-launch")
        try require(XCUIDevice.shared.orientation == .portrait, app, "Portrait is required")
        let skipGuide = app.buttons["Saltar gu\u{00ed}a"].firstMatch
        if skipGuide.waitForExistence(timeout: 2) && skipGuide.isHittable { skipGuide.tap() }
        let anonymousEntry = app.buttons["Entrar en Matchrim"].firstMatch
        try require(anonymousEntry.waitForExistence(timeout: 12), app,
                    "Anonymous home entry required; never log out or reuse an authenticated account")
        try reveal(anonymousEntry, in: app, stage: "01-anonymous-entry")
        anonymousEntry.tap()
        try require(app.secureTextFields["Contrase\u{00f1}a"].firstMatch.waitForExistence(timeout: 10),
                    app, "Anonymous auth form required; no credentials will be entered")
        audit(app, "01-anonymous-auth-form-no-login")
        let back = app.buttons["Volver"].firstMatch
        try reveal(back, in: app, stage: "01-auth-back")
        back.tap()

        let scan = app.links["Escanear"].firstMatch
        try require(scan.waitForExistence(timeout: 15), app, "Missing Escanear link")
        try reveal(scan, in: app, stage: "02-scan-link")
        scan.tap()
        audit(app, "03-scan-hub")

        let bottles = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Botellas")).firstMatch
        try require(bottles.waitForExistence(timeout: 10), app, "Missing Botellas button")
        try reveal(bottles, in: app, stage: "04-bottles")
        bottles.tap()
        audit(app, "05-label-entry-before-privacy")
        try require(waitUntil(15) {
            app.staticTexts["Etiqueta de vino"].exists
                || app.staticTexts["Antes de analizar una imagen"].exists
                || app.buttons["Una etiqueta"].exists
        }, app, "Neither label screen nor ScanPrivacyGate appeared")
        try acknowledgePrivacyIfPresent(app)
        try require(app.staticTexts["Etiqueta de vino"].firstMatch.waitForExistence(timeout: 10),
                    app, "Expected Etiqueta de vino screen")
        audit(app, "08-label-screen")

        let localMode = app.buttons["Una etiqueta"].firstMatch
        try require(localMode.waitForExistence(timeout: 10), app,
                    "Installed app lacks explicit local-single mode; do not fall back to cloud")
        try reveal(localMode, in: app, stage: "09-local-mode")
        localMode.tap()
        try require(app.staticTexts[localHeading].firstMatch.waitForExistence(timeout: 8),
                    app, "Local-mode heading is required before any media selection")
        try rejectFixtureUI(app)
        audit(app, "10-local-mode-selected")

        let gallery = app.buttons["Elegir de galer\u{00ed}a"].firstMatch
        try reveal(gallery, in: app, stage: "11-gallery-control")
        try require(app.staticTexts[localHeading].exists, app, "Local mode changed before gallery")
        try require(XCUIDevice.shared.orientation == .portrait, app, "Orientation changed")
        audit(app, "12-before-gallery")
        let galleryStarted = Date()
        gallery.tap()
        audit(app, "13-gallery-presentation")
        try selectPreparedPhoto(app)
        let pickerReturned = Date()
        audit(app, "18-after-media-selection")

        // Wait for the actual installed app's OCR and automatic public lookup.
        // No query text is injected, and no Analyze/cloud/retry control is tapped.
        var prematureIdentity = false
        let proposalsArrived = waitUntil(60) {
            prematureIdentity = self.hasLinkedIdentity(app)
            return prematureIdentity || app.staticTexts[self.proposalHeading].exists
        }
        audit(app, "19-ocr-and-public-query-outcome")
        try require(!prematureIdentity, app, "Canonical/linked identity appeared before explicit choice")
        try require(proposalsArrived && app.staticTexts[proposalHeading].exists, app,
                    "Real local OCR/public Winerim query did not produce Propuestas de Winerim")
        let proposalsReady = Date()
        try rejectFixtureUI(app)
        try assertPendingIdentity(app)
        try reveal(app.staticTexts[proposalHeading].firstMatch, in: app, stage: "20-proposals")
        audit(app, "21-proposals-visible")

        let target = app.staticTexts.matching(
            NSPredicate(format: "label CONTAINS[cd] %@", "Biografo del Vino")
        ).firstMatch
        try require(target.waitForExistence(timeout: 10), app,
                    "Expected Biografo del Vino proposal (case/diacritic insensitive)")
        try reveal(target, in: app, stage: "22-target-proposal")
        audit(app, "23-target-proposal-before-choice")
        try assertPendingIdentity(app)

        // Scope the explicit choice to an observed ancestor of this proposal's
        // accessible name, never to the first of several global confirm buttons.
        let containers = app.descendants(matching: .any)
            .containing(.staticText, identifier: target.label).allElementsBoundByIndex
            .filter {
                $0.buttons.matching(NSPredicate(format: "label == %@", self.confirmLabel)).count == 1
                    && !$0.staticTexts[self.proposalHeading].exists
            }
        guard let proposal = containers.min(by: { area($0) < area($1) }) else {
            try require(false, app, "Cannot unambiguously scope confirmation to Biografo del Vino")
            return
        }
        let confirm = proposal.buttons.matching(NSPredicate(format: "label == %@", confirmLabel)).firstMatch
        try reveal(confirm, in: app, stage: "24-explicit-choice")
        try require(proposal.staticTexts.matching(
            NSPredicate(format: "label CONTAINS[cd] %@", "Biografo del Vino")
        ).firstMatch.exists, app, "Proposal changed before confirmation")
        try assertPendingIdentity(app)
        audit(app, "25-immediately-before-confirmation")
        let confirmationStarted = Date()
        confirm.tap() // One reference choice only; not a save/rating/account action.
        audit(app, "26-after-explicit-choice")

        let source = app.staticTexts.matching(NSPredicate(
            format: "label BEGINSWITH %@", "Fuente: ficha p\u{00fa}blica Winerim."
        )).firstMatch
        try require(source.waitForExistence(timeout: 35), app,
                    "Explicit proposal choice did not yield independent public-fiche provenance")
        let original = app.links["Ver ficha original Winerim"].firstMatch
        try require(original.waitForExistence(timeout: 8), app, "Missing original public-fiche link")
        try require(app.staticTexts.matching(NSPredicate(
            format: "label CONTAINS[cd] %@", "Biografo del Vino"
        )).firstMatch.exists, app, "Selected public fiche lost the expected wine name")
        try require(!app.staticTexts.matching(NSPredicate(
            format: "label BEGINSWITH %@", "Etiqueta por identificar"
        )).firstMatch.exists, app, "Pending identity remained after explicit selection")
        try reveal(source, in: app, stage: "27-public-fiche-source")
        audit(app, "28-public-fiche-after-choice")
        try reveal(original, in: app, stage: "29-public-fiche-link")
        try require(XCUIDevice.shared.orientation == .portrait, app, "Orientation changed")
        audit(app, "30-public-fiche-link-not-opened")
        let metrics: [String: Any] = [
            "galleryOpenToProposalsMs": proposalsReady.timeIntervalSince(galleryStarted) * 1000,
            "afterPickerToProposalsMs": proposalsReady.timeIntervalSince(pickerReturned) * 1000,
            "explicitChoiceToFicheAndAuditMs": Date().timeIntervalSince(confirmationStarted) * 1000,
            "anonymousAuthFormVerified": true,
            "scope": "UI intervals include polling and audits; not isolated Vision/network latency or packet counts"
        ]
        let metricsData = try JSONSerialization.data(withJSONObject: metrics, options: [.sortedKeys])
        attach(String(decoding: metricsData, as: UTF8.self), "31-timing-and-scope")
        print("LOCAL_GALLERY109_UI_FLOW_COMPLETE_PUBLIC_FICHE_NO_ACCOUNT_ACTIONS")
        #else
        XCTFail("This probe requires a dedicated iOS simulator; never run on a physical device")
        #endif
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
        if photoGrids(app).isEmpty {
            let observed = libraryLabels.compactMap { label -> XCUIElement? in
                let button = app.buttons[label].firstMatch
                return button.exists && button.isHittable ? button : nil
            }
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
        let first = grids[0].cells.firstMatch
        try require(first.waitForExistence(timeout: 8) && first.isHittable, app,
                    "Photo grid first cell must be hittable; do not pick another cell")
        audit(app, "16-photo-grid-first-cell-before-selection")
        attach("Runner must attest first photo is prepared img-061.jpg; XCUI cell label: "
               + first.label + "\n" + first.debugDescription, "16-selected-media-assumption")
        first.tap()
        audit(app, "17-photo-grid-after-first-cell")

        // Some iOS pickers return immediately; others expose Add/Choose.
        let completionLabels = ["Add", "Choose", "A\u{00f1}adir", "Agregar", "Elegir", "Seleccionar"]
        var usedCompletionLabels = Set<String>()
        for step in 0..<2 {
            var completion: XCUIElement?
            let transitioned = waitUntil(12) {
                completion = completionLabels.compactMap { label -> XCUIElement? in
                    let button = app.buttons[label].firstMatch
                    return button.exists && button.isHittable && button.isEnabled ? button : nil
                }.first
                return completion != nil || self.photoGrids(app).isEmpty
            }
            try require(transitioned, app, "Picker stayed open without a known Add/Choose control")
            guard let button = completion else { return }
            try require(usedCompletionLabels.insert(button.label).inserted, app,
                        "Picker completion control persisted; do not tap it twice")
            audit(app, "17-picker-completion-\(step)-before")
            button.tap()
            audit(app, "17-picker-completion-\(step)-after")
        }
        try require(waitUntil(10) { self.photoGrids(app).isEmpty }, app,
                    "Photo picker did not finish after bounded Add/Choose handling")
    }

    @MainActor private func photoGrids(_ app: XCUIApplication) -> [XCUIElement] {
        app.collectionViews.allElementsBoundByIndex.filter { $0.exists && $0.cells.count > 0 }
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
            audit(app, "FAIL-\(line)")
            XCTFail(message, file: file, line: line)
            throw ProbeFailure.stopped(message)
        }
    }

    @MainActor private func audit(_ app: XCUIApplication, _ name: String) {
        let screenshot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        screenshot.name = "local-gallery109-" + name
        screenshot.lifetime = .keepAlways
        add(screenshot)
        attach("Orientation: \(XCUIDevice.shared.orientation.rawValue)\n" + app.debugDescription,
               name + "-debug-tree")
    }

    private func attach(_ text: String, _ name: String) {
        let attachment = XCTAttachment(string: text)
        attachment.name = "local-gallery109-" + name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
