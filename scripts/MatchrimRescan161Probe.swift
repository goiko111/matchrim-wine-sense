import Foundation
import XCTest

// One unsaved rescan; the host binds the new bottle PNG, not a historical benchmark image.
final class MatchrimRescan161Tests: XCTestCase {
    private enum Hold: Error { case stopped }
    private let proposalHeading = "Propuestas de Winerim"
    private let choice = "Confirmar esta referencia"
    private let wineName = "Flor de Muga Blanco"
    private let producer = "Muga"
    private let personalTitle = "Tu valoraci\u{00f3}n: te encanta"
    private let warning = "Elegirla cambiar\u{00e1} tu a\u{00f1}ada a"
    private let inputSHA = "8d213ff13a2a9c79ce6131180afe7a599bcda88b94cecf1cf853d2c6658cc1f9"
    private let selectionScope = "Explicit literal name/producer/2022 proposal after warning; public ID not independently exposed; not photo-certified vintage"
    private let dimensionPattern = "^(potencia|acidez|dulzor|tanino|fruta): tu perfil ([0-9]+[.][0-9])/5; este vino ([0-9]+[.][0-9])/5$"

    @MainActor func testExistingQAReadOnlyRescan161() throws {
        continueAfterFailure = false
        #if targetEnvironment(simulator)
        let env = ProcessInfo.processInfo.environment
        let runID = env["MATCHRIM161_RUN_ID"] ?? ""
        guard env["MATCHRIM161_INPUT_SHA256"] == inputSHA, UUID(uuidString: runID) != nil else {
            XCTFail("Fresh host photo attestation and sanitized runID required"); return
        }
        let app = XCUIApplication(bundleIdentifier: "wine.matchrim.qa99review")
        app.launch()
        defer { audit(app, "99-final"); app.terminate() }
        try require(app.wait(for: .runningForeground, timeout: 15)
            && app.frame.height > app.frame.width, app, "Existing portrait app required; no settings changes")
        try tapUnique(app.links.matching(NSPredicate(format: "label == %@", "Perfil")), app)
        let identity = app.otherElements.matching(NSPredicate(format: "label == %@", "Correo de tu cuenta: info@winerim.com"))
        try require(identity.firstMatch.waitForExistence(timeout: 12) && identity.count == 1
            && !identity.firstMatch.frame.isEmpty && app.windows.firstMatch.frame.contains(identity.firstMatch.frame)
            && app.textFields.count == 0, app, "Visible literal existing QA identity required; never authenticate")
        try genuine(app); audit(app, "01-existing-qa-session")
        emit("RESCAN161_EXISTING_QA_IDENTITY")
        try tapUnique(app.links.matching(NSPredicate(format: "label == %@", "Escanear")), app)
        let bottles = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Botellas"))
        try tapUnique(bottles, app)
        let localQuery = app.switches.matching(NSPredicate(format: "label == %@", "Una etiqueta"))
        try require(localQuery.firstMatch.waitForExistence(timeout: 10) && localQuery.count == 1
            && !app.staticTexts["Antes de analizar una imagen"].exists,
            app, "Previously acknowledged scanner required; no privacy preference changes")
        let local = localQuery.firstMatch
        if !selected(local) { try tap(local, app) }
        try require(selected(local) && app.staticTexts["Fotograf\u{00ed}a una etiqueta"].waitForExistence(timeout: 8),
                    app, "Explicit on-device single-label mode required")
        try genuine(app); audit(app, "02-local-mode-before-picker")
        emit("RESCAN161_LOCAL_MODE_SELECTED")
        try tapUnique(app.buttons.matching(NSPredicate(format: "label == %@", "Elegir de galer\u{00ed}a")), app)
        try photo(app)
        try require(wait(55) { app.staticTexts[self.proposalHeading].exists || self.linked(app) },
                    app, "Local reading/public proposals did not complete; no retry")
        try genuine(app)
        try require(!linked(app)
            && app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "Etiqueta por identificar")).firstMatch.exists
            && app.staticTexts["Referencia propuesta"].exists
            && app.staticTexts["No hemos confirmado el vino. Compara la etiqueta y elige solo si coincide."].exists,
            app, "Identity must remain pending until explicit proposal selection")
        audit(app, "08-real-unconfirmed-proposals")
        // Retained136 AX exposes each proposal as Other with this catalogue-image label prefix.
        let proposalRows = app.otherElements.matching(NSPredicate(format: "label BEGINSWITH %@",
            "Propuesta de cat\u{00e1}logo: Flor de Muga Blanco ")).allElementsBoundByIndex
        let proposals = proposalRows.filter { proposal in
            exact(proposal, wineName).count == 1 && exact(proposal, producer).count == 1
                && exact(proposal, "2022").count > 0
                && exact(proposal, warning).count == 1
                && proposal.buttons.matching(NSPredicate(format: "label == %@", choice)).count == 1
                && !proposal.staticTexts[proposalHeading].exists
                && Set(proposal.staticTexts.matching(NSPredicate(format: "label MATCHES %@", "^(19|20)[0-9]{2}$"))
                    .allElementsBoundByIndex.map { $0.label }) == Set(["2022"])
        }
        try require(!proposals.isEmpty && proposals.count <= 20, app,
                    "Exact Flor de Muga Blanco/Muga/2022 proposal plus vintage-change warning required")
        // Public IDs are not exposed by these duplicate labels. Pick the first measured literal match,
        // retain its scope, and never claim that this selects catalogue ID279035.
        try require(proposals.allSatisfy { !$0.frame.isEmpty && $0.frame.minY.isFinite && $0.frame.minX.isFinite },
                    app, "Measured named proposal geometry required")
        let ordered = proposals.sorted {
            $0.frame.minY == $1.frame.minY ? $0.frame.minX < $1.frame.minX : $0.frame.minY < $1.frame.minY
        }
        guard let proposal = ordered.first else { try require(false, app, "No named proposal"); return }
        try require(ordered.dropFirst().allSatisfy {
            $0.frame.minY > proposal.frame.minY || ($0.frame.minY == proposal.frame.minY && $0.frame.minX > proposal.frame.minX)
        }, app, "Duplicate literal proposals have ambiguous visual order")
        emit("RESCAN161_UNCONFIRMED_EXPECTED_PROPOSAL")
        try reveal(proposal.buttons[choice].firstMatch, app)
        try require(exact(proposal, wineName).count == 1 && exact(proposal, producer).count == 1
            && exact(proposal, "2022").count > 0 && exact(proposal, warning).count == 1,
            app, "Literal proposal scope changed before selection")
        audit(app, "09-before-explicit-reference")
        attach(proposal.debugDescription, "selected-proposal-ax")
        let selectedName = exact(proposal, wineName).firstMatch.label
        let selectedProducer = exact(proposal, producer).firstMatch.label
        attach(selectionScope + ". The source photograph has no legible year. Explicit2022 selection is not a photo-certified vintage. Retained cellar144-r5 is historical saved-love context, not a new save.", "selected-vintage-scope")
        try tapUnique(proposal.buttons.matching(NSPredicate(format: "label == %@", choice)), app)
        emit("RESCAN161_EXPLICIT_2022_SELECTED")
        let dialogs = app.otherElements.matching(NSPredicate(format: "label == %@",
            "Flor de Muga Blanco \u{00b7} 2022, cuadro de di\u{00e1}logo de web"))
        try require(dialogs.firstMatch.waitForExistence(timeout: 25) && dialogs.count == 1,
                    app, "Literal Flor2022 scan detail required; no substitute wine")
        let detail = dialogs.firstMatch
        let source = detail.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "Fuente: ficha p\u{00fa}blica Winerim."))
        try require(wait(25) {
            self.exact(detail, self.personalTitle).count == 1 && source.count == 1
                && detail.links["Ver ficha original Winerim"].exists
        }, app, "Saved love and independent public fiche must both load; never retry the read")
        try require(exact(detail, wineName).count > 0 && exact(detail, producer).count > 0
            && exact(detail, "2022").count > 0, app, "Independent literal name, producer and2022 required")
        try verdict(detail, app)
        let estimates = detail.otherElements.matching(NSPredicate(format: "label MATCHES %@", "^Afinidad orientativa: [0-9]{1,3} de 100$"))
        try require(estimates.firstMatch.waitForExistence(timeout: 10) && estimates.count == 1,
                    app, "Unique native numeric affinity required")
        let currentLabel = estimates.firstMatch.label
        let value = currentLabel.replacingOccurrences(of: "Afinidad orientativa: ", with: "")
            .replacingOccurrences(of: " de 100", with: "")
        guard let affinity = Int(value), (0...100).contains(affinity) else {
            try require(false, app, "Native affinity must be numeric0...100"); return
        }
        try reveal(exact(detail, personalTitle).firstMatch, app)
        audit(app, "10-native-personal-verdict")
        emit("RESCAN161_SAVED_LOVE_NUMERIC_AFFINITY")
        try tapUnique(detail.buttons.matching(NSPredicate(format: "label == %@", "Ver el detalle de afinidad")), app)
        let dimensions = detail.otherElements.matching(NSPredicate(format: "label MATCHES %@", dimensionPattern))
            .allElementsBoundByIndex.map { $0.label }
        let axes = Set(dimensions.compactMap { $0.split(separator: ":").first.map(String.init) })
        try require(dimensions.count == 5 && axes == Set(["potencia", "acidez", "dulzor", "tanino", "fruta"])
            && dimensions.allSatisfy(validDimension), app, "All five unique named axes and bounded profile/wine values required")
        try verdict(detail, app); try genuine(app)
        try require(estimates.count == 1 && estimates.firstMatch.label == currentLabel && source.count == 1,
                    app, "Score or fiche changed during readback")
        try reveal(exact(detail, personalTitle).firstMatch, app)
        audit(app, "11-five-axes-readback")
        var issues = 0
        try app.performAccessibilityAudit(for: [.contrast, .sufficientElementDescription, .textClipped, .trait]) { issue in
            issues += 1; self.attach(String(describing: issue), "detail-audit-issue")
            self.emit("RESCAN161_AUDIT_ISSUE"); return false
        }
        try require(issues == 0, app, "Unfiltered detail accessibility issues remain")
        attach("contrast/sufficientElementDescription/textClipped/trait: zero reported issues, none suppressed; current viewport only, not all scrolling content or VoiceOver speech.", "detail-audit")
        let record: [String: Any] = ["schemaVersion": 1, "runId": runID, "inputSHA256": inputSHA,
            "account": "info@winerim.com", "name": selectedName,
            "producer": selectedProducer, "vintage": 2022, "vintagePhotoCertified": false, "vintageWarning": warning,
            "selectionScope": selectionScope, "selectedPublicId": NSNull(), "proposalCount": proposals.count,
            "personalRating": "love", "personalVerdictTitle": exact(detail, personalTitle).firstMatch.label,
            "current": affinity, "currentLabel": currentLabel, "dimensions": dimensions,
            "provenance": source.firstMatch.label, "newSavePersistenceValidated": false]
        let attachment = XCTAttachment(data: try JSONSerialization.data(withJSONObject: record, options: [.sortedKeys]),
                                      uniformTypeIdentifier: "public.json")
        attachment.name = "rescan161-readback"; attachment.lifetime = .keepAlways; add(attachment)
        emit("RESCAN161_FIVE_AXES_READBACK")
        attach("One existing QA unsaved rescan. Actual new bottle PNG is host byte-attested against the uniquely latest-added asset.2022 is explicitly selected after a warning, not read from this photo. Saved love is read from the app; cellar144-r5 is retained baseline only. No identity typing, auth, save, rating, logout or model controls. Local Apple Vision/public-read path is source-bound, not packet-audited. No canonical-ID, new persistence or taste-accuracy claim.", "scope")
        emit("RESCAN161_READONLY_COMPLETE")
        #else
        XCTFail("Owned simulator only")
        #endif
    }

    @MainActor private func exact(_ root: XCUIElement, _ label: String) -> XCUIElementQuery {
        root.staticTexts.matching(NSPredicate(format: "label == %@", label))
    }

    @MainActor private func verdict(_ detail: XCUIElement, _ app: XCUIApplication) throws {
        try require(exact(detail, personalTitle).count == 1, app, "Saved love must remain primary")
        for label in ["Tu valoraci\u{00f3}n: no es para ti", "Tu valoraci\u{00f3}n: correcto",
                      "Encaja mucho contigo", "Puede encajar contigo", "Es una opci\u{00f3}n para explorar",
                      "Se aleja de tus gustos actuales"] {
            try require(exact(detail, label).count == 0, app, "No conflicting saved verdict or forecast headline")
        }
        try require(!detail.staticTexts.matching(NSPredicate(format: "label CONTAINS %@",
            "No se pudieron consultar tus valoraciones")).firstMatch.exists,
            app, "Unavailable verdict read cannot prove saved love")
    }

    private func validDimension(_ label: String) -> Bool {
        guard let regex = try? NSRegularExpression(pattern: dimensionPattern),
            let match = regex.firstMatch(in: label, range: NSRange(label.startIndex..., in: label)) else { return false }
        return [2, 3].allSatisfy { index in
            guard let range = Range(match.range(at: index), in: label), let value = Double(label[range]) else { return false }
            return value.isFinite && (0...5).contains(value)
        }
    }

    @MainActor private func tapUnique(_ query: XCUIElementQuery, _ app: XCUIApplication) throws {
        try require(query.firstMatch.waitForExistence(timeout: 8) && query.count == 1, app, "Named control absent or ambiguous")
        try tap(query.firstMatch, app)
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
        emit("RESCAN161_PHOTOS_ADDED_ORDER_VERIFIED")
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
        emit("RESCAN161_ATTESTED_PHOTO_SELECTED")
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

    @MainActor private func linked(_ app: XCUIApplication) -> Bool {
        app.links["Ver ficha original Winerim"].exists || app.staticTexts.matching(NSPredicate(
            format: "label BEGINSWITH %@", "Fuente: ficha p\u{00fa}blica Winerim.")).firstMatch.exists
    }

    @MainActor private func genuine(_ app: XCUIApplication) throws {
        try require(app.secureTextFields.count == 0 && !app.buttons["Entrar en Matchrim"].exists,
                    app, "No authentication allowed")
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
        func usable(_ frame: CGRect) -> Bool {
            !frame.isEmpty && !frame.isNull && frame.minX.isFinite && frame.maxX.isFinite
                && frame.minY.isFinite && frame.maxY.isFinite
        }
        let surface = app.webViews.firstMatch
        for _ in 0..<8 {
            try require(element.exists, app, "Unknown element; no discovery swipe")
            if element.isHittable { return }
            try require(surface.exists, app, "Known WebView required")
            let target = element.frame
            let window = app.windows.firstMatch.frame
            let web = surface.frame
            try require(usable(target) && usable(web) && usable(window), app, "Finite geometry required")
            let viewport = web.intersection(window)
            try require(usable(viewport) && target.maxX > viewport.minX && target.minX < viewport.maxX,
                        app, "Named target must overlap the visible WebView horizontally")
            let above = target.minY < viewport.minY
            let below = target.maxY > viewport.maxY
            try require(above != below, app, "No unambiguous reveal direction")
            if above { surface.swipeDown() } else { surface.swipeUp() }
            try require(element.exists, app, "Named target disappeared")
            if element.isHittable { return }
            let moved = element.frame
            try require(usable(moved) && (above ? moved.minY > target.minY : moved.minY < target.minY),
                        app, "Named target did not move toward the viewport")
        }
        try require(element.exists && element.isHittable, app, "Named target not reachable")
    }

    @MainActor private func wait(_ timeout: TimeInterval, _ body: @escaping () -> Bool) -> Bool {
        XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in body() }, object: nil)], timeout: timeout) == .completed
    }

    @MainActor private func require(_ condition: Bool, _ app: XCUIApplication, _ message: String,
                                    file: StaticString = #filePath, line: UInt = #line) throws {
        if !condition {
            emit("RESCAN161_FAILURE"); audit(app, "FAIL-\(line)")
            XCTFail(message, file: file, line: line); throw Hold.stopped
        }
    }

    @MainActor private func audit(_ app: XCUIApplication, _ name: String) {
        let image = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        image.name = "rescan161-" + name; image.lifetime = .keepAlways; add(image)
        attach(app.debugDescription, name + "-ax")
    }

    private func attach(_ text: String, _ name: String) {
        let attachment = XCTAttachment(string: text)
        attachment.name = "rescan161-" + name; attachment.lifetime = .keepAlways; add(attachment)
    }

    private func emit(_ marker: String) {
        FileHandle.standardOutput.write(Data((marker + "\n").utf8))
        try? FileHandle.standardOutput.synchronize()
    }
}
