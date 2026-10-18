import XCTest
import Vision

final class Matchrim95ConsumerTests: XCTestCase {
    private let bundle = "wine.matchrim.qa91live"
    private let ownedSimulator = "B18822EF-BFBD-4A6A-89B2-33539BDE4127"

    @MainActor private func ownedApp() throws -> XCUIApplication {
        #if !targetEnvironment(simulator)
        throw XCTSkip("Owned simulator only; never replace or drive the owner's phone")
        #endif
        XCTAssertEqual(ProcessInfo.processInfo.environment["SIMULATOR_UDID"], ownedSimulator)
        continueAfterFailure = false
        return XCUIApplication(bundleIdentifier: bundle)
    }

    @MainActor private func capture(_ name: String, _ app: XCUIApplication) {
        let screenshot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        screenshot.name = name
        screenshot.lifetime = .keepAlways
        add(screenshot)
        let tree = XCTAttachment(string: app.debugDescription)
        tree.name = name + "-tree"
        tree.lifetime = .keepAlways
        add(tree)
    }

    @MainActor private func open(_ name: String, heading: String, app: XCUIApplication) {
        let link = app.links.matching(identifier: name).firstMatch
        XCTAssertTrue(link.waitForExistence(timeout: 20), app.debugDescription)
        XCTAssertTrue(link.isHittable, name + " is not reachable")
        link.tap()
        XCTAssertTrue(app.staticTexts[heading].firstMatch.waitForExistence(timeout: 20), app.debugDescription)
        XCTAssertEqual(app.state, .runningForeground)
    }

    @MainActor private func assertNavigation(_ app: XCUIApplication) {
        for name in ["Inicio", "aiRIM", "Escanear", "Bodega", "Perfil"] {
            let link = app.links.matching(identifier: name).firstMatch
            XCTAssertTrue(link.isHittable, name + " is not reachable")
            XCTAssertGreaterThanOrEqual(link.frame.width, 43.5, name)
            XCTAssertGreaterThanOrEqual(link.frame.height, 43.5, name)
            XCTAssertGreaterThanOrEqual(link.frame.minX, app.frame.minX - 1, name)
            XCTAssertLessThanOrEqual(link.frame.maxX, app.frame.maxX + 1, name)
            XCTAssertLessThanOrEqual(link.frame.maxY, app.frame.maxY + 1, name)
        }
    }

    @MainActor private func reveal(_ element: XCUIElement, app: XCUIApplication) {
        for _ in 0..<12 {
            if element.isHittable { break }
            app.swipeUp()
        }
        XCTAssertTrue(element.isHittable, app.debugDescription)
    }

    @MainActor func test01MainNavigationRequiresRealDestinations() throws {
        let app = try ownedApp()
        XCUIDevice.shared.orientation = .portrait
        app.launchArguments = []
        app.launch()
        for (name, heading) in [
            ("Inicio", "¿Qué quieres elegir?"),
            ("aiRIM", "¿Qué necesitas decidir?"),
            ("Bodega", "Mis Vinos"),
            ("Perfil", "Mi Perfil"),
            ("Escanear", "Escanear")
        ] {
            open(name, heading: heading, app: app)
            assertNavigation(app)
            capture("native95-destination-" + name, app)
        }
        app.terminate()
        app.launch()
        open("Perfil", heading: "Mi Perfil", app: app)
        capture("native95-account-persists-after-relaunch", app)
    }

    @MainActor func test02OrientationAndActualDynamicType() throws {
        let app = try ownedApp()
        defer {
            XCUIDevice.shared.orientation = .portrait
            app.launchArguments = []
            app.terminate()
            app.launch()
        }
        var normalHeadingHeight: CGFloat = 0
        for large in [false, true] {
            XCUIDevice.shared.orientation = .portrait
            app.launchArguments = ["-UIPreferredContentSizeCategoryName", large ? "UICTContentSizeCategoryAccessibilityXXXL" : "UICTContentSizeCategoryL"]
            app.launch()
            open("Escanear", heading: "Escanear", app: app)
            let heading = app.staticTexts["Escanear"].firstMatch
            if large { XCTAssertGreaterThan(heading.frame.height, normalHeadingHeight * 1.5) }
            else { normalHeadingHeight = heading.frame.height }
            for landscape in [false, true] {
                XCUIDevice.shared.orientation = landscape ? .landscapeLeft : .portrait
                let settled = NSPredicate { _, _ in (app.frame.width > app.frame.height) == landscape }
                XCTAssertEqual(XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: settled, object: nil)], timeout: 10), .completed)
                assertNavigation(app)
                capture("native95-scan-\(large ? "max" : "normal")-\(landscape ? "landscape" : "portrait")", app)
            }
            app.terminate()
        }
    }

    @MainActor func test03GalleryCanBeCancelledWithoutAnalysis() throws {
        let app = try ownedApp()
        XCUIDevice.shared.orientation = .portrait
        app.launchArguments = []
        app.launch()
        open("Escanear", heading: "Escanear", app: app)
        let entry = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Carta de vinos")).firstMatch
        XCTAssertTrue(entry.exists, app.debugDescription)
        entry.tap()
        let upload = app.buttons["Subir archivo"]
        XCTAssertTrue(upload.waitForExistence(timeout: 10), app.debugDescription)
        upload.tap()
        let library = app.buttons["Photo Library"]
        XCTAssertTrue(library.waitForExistence(timeout: 5), app.debugDescription)
        library.tap()
        let cancel = app.buttons.matching(NSPredicate(format: "label IN %@", ["Cancel", "Cancelar"])).firstMatch
        XCTAssertTrue(cancel.waitForExistence(timeout: 10), app.debugDescription)
        capture("native95-native-photo-picker", app)
        cancel.tap()
        XCTAssertTrue(upload.waitForExistence(timeout: 10), app.debugDescription)
        XCTAssertFalse(app.buttons["Cancelar análisis"].exists, "Cancelling selection must not begin a reading")
        capture("native95-photo-selection-cancelled", app)
    }

    @MainActor func test04NativeAccessibilityAudit() throws {
        let app = try ownedApp()
        XCUIDevice.shared.orientation = .portrait
        app.launchArguments = []
        app.launch()
        open("Escanear", heading: "Escanear", app: app)
        capture("native95-accessibility-audit-scan", app)
        assertNavigation(app)
        for button in app.buttons.allElementsBoundByIndex where button.isHittable {
            XCTAssertGreaterThanOrEqual(button.frame.width, 43.5, button.label)
            XCTAssertGreaterThanOrEqual(button.frame.height, 43.5, button.label)
        }
        var reviewedStaticHeadingExclusions = 0
        try app.performAccessibilityAudit(for: [.hitRegion, .sufficientElementDescription, .textClipped, .trait]) { issue in
            let evidence = XCTAttachment(string: issue.compactDescription + "\n" + issue.detailedDescription + "\n" + (issue.element?.debugDescription ?? "No element"))
            evidence.name = "native95-accessibility-issue"
            evidence.lifetime = .keepAlways
            self.add(evidence)
            // R1/R2 screenshot, AX tree and source confirm this exact node is an
            // inert h2, not a control. Do not waive any other node or audit type.
            if issue.auditType == .hitRegion, let element = issue.element,
               element.elementType == .staticText, element.label == "También puedes" {
                reviewedStaticHeadingExclusions += 1
                let review = XCTAttachment(string: "Reviewed WKWebView static h2 false positive. Actual interactive targets checked separately at >=44pt. This is not full VoiceOver certification.")
                review.name = "native95-reviewed-static-heading-exclusion"
                review.lifetime = .keepAlways
                self.add(review)
                return true
            }
            return false
        }
        XCTAssertLessThanOrEqual(reviewedStaticHeadingExclusions, 1)
    }

    @MainActor func test05NativePhotoCollectionsWithoutAnalysis() throws {
        let app = try ownedApp()
        XCUIDevice.shared.orientation = .portrait
        app.launchArguments = []
        app.launch()
        open("Escanear", heading: "Escanear", app: app)
        let entry = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Carta de vinos")).firstMatch
        XCTAssertTrue(entry.exists, app.debugDescription)
        entry.tap()
        let upload = app.buttons["Subir archivo"]
        XCTAssertTrue(upload.waitForExistence(timeout: 10), app.debugDescription)
        upload.tap()
        let library = app.buttons["Photo Library"]
        XCTAssertTrue(library.waitForExistence(timeout: 5), app.debugDescription)
        library.tap()
        let collections = app.buttons.matching(NSPredicate(format: "label IN %@", ["Collections", "Colecciones"])).firstMatch
        XCTAssertTrue(collections.waitForExistence(timeout: 10), app.debugDescription)
        collections.tap()
        capture("native95-photo-collections-no-reading", app)
        let cancel = app.buttons.matching(NSPredicate(format: "label IN %@", ["Cancel", "Cancelar"])).firstMatch
        XCTAssertTrue(cancel.isHittable, app.debugDescription)
        cancel.tap()
        XCTAssertTrue(upload.waitForExistence(timeout: 10), app.debugDescription)
        XCTAssertFalse(app.buttons["Cancelar an\u{00e1}lisis"].exists)
    }

    @MainActor func test06ContrastAndTextAcrossMainDestinations() throws {
        let app = try ownedApp()
        XCUIDevice.shared.orientation = .portrait
        app.launchArguments = []
        app.launch()
        var findings: [String] = []
        for (name, heading) in [
            ("Inicio", "¿Qué quieres elegir?"), ("aiRIM", "¿Qué necesitas decidir?"),
            ("Bodega", "Mis Vinos"), ("Perfil", "Mi Perfil"), ("Escanear", "Escanear")
        ] {
            open(name, heading: heading, app: app)
            capture("native95-broad-audit-" + name, app)
            try app.performAccessibilityAudit(for: [.contrast, .elementDetection, .sufficientElementDescription, .textClipped, .trait]) { issue in
                let description = name + ": " + issue.compactDescription + "\n" + issue.detailedDescription + "\n" + (issue.element?.debugDescription ?? "No element")
                findings.append(description)
                let evidence = XCTAttachment(string: description)
                evidence.name = "native95-broad-audit-finding-" + name
                evidence.lifetime = .keepAlways
                self.add(evidence)
                // Collect every destination before failing once; never turn
                // these findings into passes through the issue handler.
                return true
            }
        }
        XCTAssertTrue(findings.isEmpty, findings.joined(separator: "\n\n"))
    }

    @MainActor func test07RecentlySavedPhotoInspectionWithoutAnalysis() throws {
        let app = try ownedApp()
        XCUIDevice.shared.orientation = .portrait
        app.launchArguments = []
        app.launch()
        open("Escanear", heading: "Escanear", app: app)
        let entry = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Carta de vinos")).firstMatch
        XCTAssertTrue(entry.exists, app.debugDescription)
        entry.tap()
        let upload = app.buttons["Subir archivo"]
        XCTAssertTrue(upload.waitForExistence(timeout: 10), app.debugDescription)
        upload.tap()
        let library = app.buttons["Photo Library"]
        XCTAssertTrue(library.waitForExistence(timeout: 5), app.debugDescription)
        library.tap()
        let collections = app.buttons.matching(NSPredicate(format: "label IN %@", ["Collections", "Colecciones"])).firstMatch
        XCTAssertTrue(collections.waitForExistence(timeout: 10), app.debugDescription)
        collections.tap()
        let recent = app.buttons.matching(NSPredicate(format: "label IN %@", ["Recently Saved", "Guardados recientemente"])).firstMatch
        XCTAssertTrue(recent.waitForExistence(timeout: 10), app.debugDescription)
        recent.tap()
        // iOS 26's album grid has a back control, not the picker's Cancel button.
        let back = app.buttons.matching(identifier: "BackButton").matching(NSPredicate(format: "label == %@", "Colecciones")).firstMatch
        XCTAssertTrue(back.waitForExistence(timeout: 10), app.debugDescription)
        XCTAssertTrue(back.isHittable, app.debugDescription)
        capture("native95-recently-saved-inspection-no-reading", app)
        back.tap()
        let cancel = app.buttons.matching(NSPredicate(format: "label IN %@", ["Cancel", "Cancelar"])).firstMatch
        XCTAssertTrue(cancel.isHittable, app.debugDescription)
        cancel.tap()
        XCTAssertTrue(upload.waitForExistence(timeout: 10), app.debugDescription)
        XCTAssertFalse(app.buttons["Cancelar an\u{00e1}lisis"].exists)
    }

    @MainActor func test08RealOwner7548GalleryReadingAndComparison() throws {
        guard ProcessInfo.processInfo.environment["QA95_ENABLE_REAL_VISION"] == "YES" else {
            throw XCTSkip("Explicit one-run owner-image/backend authorization flag required; never run paid vision by default")
        }
        let app = try ownedApp()
        XCUIDevice.shared.orientation = .portrait
        defer { XCUIDevice.shared.orientation = .portrait }
        app.launchArguments = []
        app.launch()
        open("Inicio", heading: "¿Qué quieres elegir?", app: app)
        open("Escanear", heading: "Escanear", app: app)
        let entry = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Carta de vinos")).firstMatch
        XCTAssertTrue(entry.exists, app.debugDescription)
        entry.tap()
        let upload = app.buttons["Subir archivo"]
        XCTAssertTrue(upload.waitForExistence(timeout: 10), app.debugDescription)
        upload.tap()
        let library = app.buttons["Photo Library"]
        XCTAssertTrue(library.waitForExistence(timeout: 5), app.debugDescription)
        library.tap()
        let collections = app.buttons.matching(NSPredicate(format: "label IN %@", ["Collections", "Colecciones"])).firstMatch
        XCTAssertTrue(collections.waitForExistence(timeout: 10), app.debugDescription)
        collections.tap()
        let recent = app.buttons.matching(NSPredicate(format: "label IN %@", ["Recently Saved", "Guardados recientemente"])).firstMatch
        XCTAssertTrue(recent.waitForExistence(timeout: 10), app.debugDescription)
        recent.tap()
        let back = app.buttons.matching(identifier: "BackButton").firstMatch
        XCTAssertTrue(back.waitForExistence(timeout: 10), app.debugDescription)
        let photo = app.images.matching(identifier: "PXGGridLayout-Info")
            .matching(NSPredicate(format: "label == %@", "Foto, 03 de agosto, 19:44")).firstMatch
        XCTAssertTrue(photo.waitForExistence(timeout: 10), app.debugDescription)
        // Album screenshot 6263DCC5 (R8) independently shows the first cell is
        // the imported original IMG_7548, not a screenshot or another fixture.
        XCTAssertLessThan(photo.frame.minX, 1)
        XCTAssertLessThan(photo.frame.minY, 150)
        XCTAssertGreaterThan(photo.frame.width, 140)
        XCTAssertGreaterThan(photo.frame.height, 140)
        XCTAssertGreaterThanOrEqual(photo.frame.minY, app.frame.minY)
        XCTAssertLessThanOrEqual(photo.frame.maxY, app.frame.maxY)
        capture("native95-real7548-before-select", app)
        let started = Date()
        // Photos exposes these visible grid cells as AX images without an
        // activation hit point. Use the independently reviewed cell centre.
        photo.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
        capture("native95-real7548-after-selection", app)
        let choose = app.buttons.matching(identifier: "PUOneUpBarButtonItemIdentifierAssetExplorerReviewScreenDone").firstMatch
        XCTAssertTrue(choose.waitForExistence(timeout: 10), app.debugDescription)
        capture("native95-real7548-photo-preview-before-confirmation", app)
        choose.tap()
        let cancel = app.buttons["Cancelar an\u{00e1}lisis"]
        XCTAssertTrue(cancel.waitForExistence(timeout: 15), app.debugDescription)
        capture("native95-real7548-reading-progress", app)
        let readings = app.otherElements.matching(NSPredicate(format: "label BEGINSWITH %@", "Lecturas de la carta (")).firstMatch
        XCTAssertTrue(readings.waitForExistence(timeout: 120), app.debugDescription)
        capture("native95-real7548-result", app)
        let receipt = XCTAttachment(string: "Original IMG_7548 from native Photos; actual hosted reading, no intercepted transport. Elapsed to result: \(Date().timeIntervalSince(started)) seconds. No Save/Confirm action is performed. Metrics and literal identities are preserved in AX attachments; not canonical identity or human taste certification.")
        receipt.name = "native95-real7548-execution-receipt"
        receipt.lifetime = .keepAlways
        add(receipt)
        inspectActualEightReadings(app)
    }

    @MainActor private func inspectActualEightReadings(_ app: XCUIApplication) {
        let rows = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Abrir vino "))
        XCTAssertEqual(rows.count, 8, "Compare actual output with the eight complete references, never silently alter this oracle")
        let first = rows.firstMatch
        reveal(first, app: app)
        first.tap()
        for index in 1...8 {
            XCTAssertTrue(app.buttons["Cerrar detalle"].waitForExistence(timeout: 5), app.debugDescription)
            capture("native95-real7548-detail-\(index)", app)
            if index == 1 {
                XCUIDevice.shared.orientation = .landscapeLeft
                capture("native95-real7548-detail-landscape", app)
                XCUIDevice.shared.orientation = .portrait
            }
            if index < 8 { app.buttons["Siguiente"].tap() }
            else { XCTAssertFalse(app.buttons["Siguiente"].isEnabled) }
        }
        app.buttons["Cerrar detalle"].tap()
        let compare = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Comparar 2")).firstMatch
        reveal(compare, app: app)
        compare.tap()
        let choices = app.switches.matching(NSPredicate(format: "label BEGINSWITH %@", "Comparar "))
        XCTAssertEqual(choices.count, 8, app.debugDescription)
        for index in 0..<choices.count {
            let selected = choices.allElementsBoundByIndex.filter { ($0.value as? String) == "1" }.count
            if selected == 5 { break }
            let choice = choices.element(boundBy: index)
            if (choice.value as? String) != "1" { reveal(choice, app: app); choice.tap() }
        }
        XCTAssertEqual(choices.allElementsBoundByIndex.filter { ($0.value as? String) == "1" }.count, 5)
        for choice in choices.allElementsBoundByIndex where (choice.value as? String) != "1" {
            XCTAssertFalse(choice.isEnabled)
        }
        capture("native95-real7548-comparison-five", app)
        XCUIDevice.shared.orientation = .landscapeLeft
        let landscape = NSPredicate { _, _ in app.frame.width > app.frame.height }
        XCTAssertEqual(XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: landscape, object: nil)], timeout: 10), .completed)
        reveal(choices.firstMatch, app: app)
        XCTAssertEqual(choices.allElementsBoundByIndex.filter { ($0.value as? String) == "1" }.count, 5)
        capture("native95-real7548-comparison-landscape", app)
    }

    @MainActor func test11ResumeActual7548ResultsWithoutAnotherRead() throws {
        guard ProcessInfo.processInfo.environment["QA95_ENABLE_REAL_VISION"] == "YES" else {
            throw XCTSkip("Explicit continuation of the already completed real read only")
        }
        let app = try ownedApp()
        XCTAssertEqual(app.state, .runningForeground, "Never relaunch or replace a real result for this continuation")
        XCTAssertTrue(app.otherElements["Lecturas de la carta (8)"].firstMatch.exists, app.debugDescription)
        XCTAssertTrue(app.buttons["Abrir vino 1: Laurent Perrier La Cuvee"].exists, app.debugDescription)
        capture("native95-real7548-resumed-existing-result-no-new-read", app)
        let receipt = XCTAttachment(string: "Read-only continuation of the actual native08 result in the same running app. Native08 completed three hosted reading requests and eight rows, then failed a harness AX query: the count belongs to Other, not its StaticText child. No new upload, Analyze, Retry, Save or Confirm action is performed here. The original failed xcresult is preserved separately.")
        receipt.name = "native95-real7548-read-only-continuation-receipt"
        receipt.lifetime = .keepAlways
        add(receipt)
        defer { XCUIDevice.shared.orientation = .portrait }
        inspectActualEightReadings(app)
    }

    @MainActor func test09OneRealAiRimConversationWithoutSaving() throws {
        guard ProcessInfo.processInfo.environment["QA95_ENABLE_REAL_CHAT"] == "YES" else {
            throw XCTSkip("One explicit hosted chat canary only; no default provider calls")
        }
        let app = try ownedApp()
        XCUIDevice.shared.orientation = .portrait
        app.launchArguments = []
        app.launch()
        open("aiRIM", heading: "¿Qué necesitas decidir?", app: app)
        let question = "Tengo lubina a la plancha y prefiero vinos secos. Sin carta del restaurante, ¿qué información falta para elegir una botella concreta?"
        let quick = app.textFields["Pregunta para aiRIM"]
        XCTAssertTrue(quick.isHittable, app.debugDescription)
        quick.tap()
        quick.typeText(question)
        app.buttons["Abrir conversación"].tap()
        XCTAssertTrue(app.staticTexts["Decide con contexto"].waitForExistence(timeout: 10), app.debugDescription)
        let send = app.buttons["Enviar pregunta"]
        let ready = NSPredicate { _, _ in send.exists && send.isEnabled }
        XCTAssertEqual(XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: ready, object: nil)], timeout: 20), .completed, app.debugDescription)
        reveal(send, app: app)
        capture("native95-real-aiRim-before-one-request", app)
        let began = Date()
        send.tap()
        let loading = app.buttons["Cancelar consulta"]
        XCTAssertTrue(loading.waitForExistence(timeout: 10), app.debugDescription)
        capture("native95-real-aiRim-request-in-progress", app)
        let input = app.textViews["Pregunta para aiRIM"]
        let finished = NSPredicate { _, _ in !loading.exists && input.exists }
        XCTAssertEqual(XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: finished, object: nil)], timeout: 100), .completed, app.debugDescription)
        XCTAssertFalse(app.staticTexts["aiRIM no está disponible ahora. Tu pregunta no se ha perdido."].exists, app.debugDescription)
        XCTAssertTrue(input.exists, app.debugDescription)
        let value = input.value as? String
        XCTAssertTrue(value == "" || value == "Ej. Tengo lubina, 25 € por botella y prefiero vinos frescos", "Successful send leaves the field empty, optionally exposing its placeholder, rather than restoring a failed question")
        capture("native95-real-aiRim-completed", app)
        let receipt = XCTAttachment(string: "Exactly one explicit send action to ai-wine-chat; actual hosted transport, no mock, no direct test DB write; ordinary authenticated backend may log question. Elapsed: \(Date().timeIntervalSince(began)) seconds. Answer quality must be reviewed from the preserved UI, not inferred from transport completion.")
        receipt.name = "native95-real-aiRim-one-request-receipt"
        receipt.lifetime = .keepAlways
        add(receipt)
    }

    @MainActor func test10ManualEntryKeyboardAndCancelWithoutSaving() throws {
        let app = try ownedApp()
        defer {
            XCUIDevice.shared.orientation = .portrait
            app.launchArguments = []
        }
        for large in [false, true] {
            XCUIDevice.shared.orientation = .portrait
            app.launchArguments = ["-UIPreferredContentSizeCategoryName", large ? "UICTContentSizeCategoryAccessibilityXXXL" : "UICTContentSizeCategoryL"]
            app.launch()
            let cellar = app.links.matching(identifier: "Bodega").firstMatch
            XCTAssertTrue(cellar.waitForExistence(timeout: 20), app.debugDescription)
            XCTAssertTrue(cellar.isHittable)
            XCTAssertGreaterThanOrEqual(cellar.frame.width, 43.5)
            XCTAssertGreaterThanOrEqual(cellar.frame.height, 43.5)
            XCTAssertLessThanOrEqual(cellar.frame.maxY, app.frame.maxY + 1)
            // Standard AX activation is required; retain any failure as evidence.
            cellar.tap()
            XCTAssertTrue(app.staticTexts["Mis Vinos"].firstMatch.waitForExistence(timeout: 20), app.debugDescription)
            let manual = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Añadir manualmente")).firstMatch
            reveal(manual, app: app)
            manual.tap()
            let name = app.textFields["Nombre del Vino *"]
            XCTAssertTrue(name.waitForExistence(timeout: 10), app.debugDescription)
            reveal(name, app: app)
            name.tap()
            // Two characters stay below the existing three-character lookup
            // threshold: keyboard QA must not spend a model request or save.
            name.typeText("QA")
            let keyboard = app.keyboards.firstMatch
            XCTAssertTrue(keyboard.waitForExistence(timeout: 10), app.debugDescription)
            for landscape in [false, true] {
                XCUIDevice.shared.orientation = landscape ? .landscapeLeft : .portrait
                let settled = NSPredicate { _, _ in (app.frame.width > app.frame.height) == landscape }
                XCTAssertEqual(XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: settled, object: nil)], timeout: 10), .completed)
                let fieldVisible = NSPredicate { _, _ in
                    let viewport = app.webViews.firstMatch.frame
                    return name.frame.minY >= viewport.minY && name.frame.maxY <= viewport.maxY + 1
                }
                XCTAssertEqual(XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: fieldVisible, object: nil)], timeout: 10), .completed, app.debugDescription)
                XCTAssertTrue(name.isHittable, app.debugDescription)
                XCTAssertEqual(name.value as? String, "QA")
                XCTAssertGreaterThanOrEqual(name.frame.minY, app.frame.minY)
                XCTAssertLessThanOrEqual(name.frame.maxX, app.frame.maxX)
                XCTAssertLessThanOrEqual(name.frame.maxY, keyboard.frame.minY + 1)
                let close = app.buttons["Close"].firstMatch
                XCTAssertTrue(close.isHittable, app.debugDescription)
                XCTAssertGreaterThanOrEqual(close.frame.width, 43.5)
                XCTAssertGreaterThanOrEqual(close.frame.height, 43.5)
                XCTAssertGreaterThanOrEqual(close.frame.minY, app.frame.minY)
                XCTAssertLessThanOrEqual(close.frame.maxX, app.frame.maxX)
                XCTAssertLessThanOrEqual(close.frame.maxY, keyboard.frame.minY + 1)
                capture("native95-manual-keyboard-\(large ? "max" : "normal")-\(landscape ? "landscape" : "portrait")", app)
            }
            app.buttons["Close"].firstMatch.tap()
            XCTAssertFalse(name.exists, "Closing the draft must remove the unsaved editor")
            XCTAssertFalse(app.keyboards.firstMatch.exists)
            capture("native95-manual-draft-dismissed-without-save-\(large)", app)
            app.terminate()
        }
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

    @MainActor func test13HomeMaxBodyAXActionsAndUnbrokenBrand() throws {
        let app = try ownedApp()
        defer {
            XCUIDevice.shared.orientation = .portrait
            app.launchArguments = []
            app.terminate()
        }
        app.launchArguments = ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"]
        XCUIDevice.shared.orientation = .portrait
        app.launch()
        try homeOrientation(false, app: app)
        open("Inicio", heading: "¿Qué quieres elegir?", app: app)
        try homeBrand("native96-home-max-portrait", app: app)
        for landscape in [false, true] {
            try homeOrientation(landscape, app: app)
            let tag = "native96-home-max-" + (landscape ? "landscape" : "portrait")
            capture(tag + "-initial", app)
            for (name, heading) in [("Botellas", "Etiqueta de vino"), ("Carta", "Carta de vinos")] {
                try homeBodyAction(name, destination: heading, tag: tag + "-" + name, app: app)
                open("Inicio", heading: "¿Qué quieres elegir?", app: app)
            }
        }
    }

    @MainActor private func scanner14Record(_ name: String, _ value: [String: Any]) throws {
        let data = try JSONSerialization.data(withJSONObject: value, options: [.sortedKeys])
        let evidence = XCTAttachment(data: data, uniformTypeIdentifier: "public.json")
        evidence.name = name; evidence.lifetime = .keepAlways; add(evidence)
    }

    @MainActor private func scanner14Reveal(_ element: XCUIElement, tag: String, requiresTarget44: Bool = true,
                                            app: XCUIApplication) throws -> CGRect {
        try homeRequire(element.waitForExistence(timeout: 12), "QA14_LAYOUT missing named control " + tag)
        var rows: [[String: Any]] = []
        var ready = false
        for attempt in 0...12 {
            let clip = try homeClip(app), frame = element.frame
            ready = clip.contains(frame) && frame.width >= (requiresTarget44 ? 44 : 1) && frame.height >= (requiresTarget44 ? 44 : 1)
            rows.append(["attempt": attempt, "frame": NSCoder.string(for: frame),
                         "clip": NSCoder.string(for: clip), "wholeVisible44": ready])
            if ready { break }
            if attempt < 12 {
                if frame.midY < clip.midY { app.swipeDown() }
                else { app.swipeUp() }
            }
        }
        try scanner14Record(tag + "-reveal", ["observations": rows, "interactiveTarget44Required": requiresTarget44])
        capture(tag + "-revealed", app)
        try homeRequire(ready, "QA14_LAYOUT named scanner content lacks whole visible bounds or required44pt target: " + tag)
        return try homeClip(app)
    }

    @MainActor private func scanner14TextWidth(_ tag: String, app: XCUIApplication) throws {
        let clip = try homeClip(app)
        var rows: [[String: Any]] = []
        var overflow: [String] = []
        for text in app.staticTexts.allElementsBoundByIndex where text.exists && !text.label.isEmpty {
            let frame = text.frame
            if frame.width <= 0 || frame.height <= 0 { continue }
            let fits = frame.minX >= clip.minX && frame.maxX <= clip.maxX
            rows.append(["label": text.label, "frame": NSCoder.string(for: frame), "fitsWidth": fits])
            if !fits { overflow.append(text.label) }
        }
        try scanner14Record(tag + "-all-text-width", ["clip": NSCoder.string(for: clip), "texts": rows, "overflow": overflow])
        try homeRequire(overflow.isEmpty, "QA14_LAYOUT scanner text exceeds physical viewport width: " + overflow.joined(separator: "; "))
    }

    @MainActor private func scanner14Pixels(_ app: XCUIApplication) throws -> CGImage {
        let screenshot = XCUIScreen.main.screenshot().image
        guard let raw = screenshot.cgImage else { throw NSError(domain: "QA14_HARNESS_PIXELS", code: 1) }
        let scale = CGFloat(min(raw.width, raw.height)) / min(app.frame.width, app.frame.height)
        let longScale = CGFloat(max(raw.width, raw.height)) / max(app.frame.width, app.frame.height)
        try homeRequire(abs(scale - longScale) < 0.01, "QA14_HARNESS screenshot/app aspect ratios differ")
        // UIImage.draw applies the native screenshot orientation before AX crops.
        let format = UIGraphicsImageRendererFormat(); format.scale = scale; format.opaque = true
        let image = UIGraphicsImageRenderer(size: app.frame.size, format: format).image { _ in
            screenshot.draw(in: CGRect(origin: .zero, size: app.frame.size))
        }
        guard let pixels = image.cgImage else { throw NSError(domain: "QA14_HARNESS_PIXELS", code: 2) }
        return pixels
    }

    @MainActor private func scanner14Words(_ heading: XCUIElement, expected: String,
                                          tag: String, app: XCUIApplication) throws {
        let clip = try homeClip(app), frame = heading.frame
        capture(tag + "-heading", app)
        try scanner14Record(tag + "-heading-bounds", ["label": heading.label,
            "frame": NSCoder.string(for: frame), "clip": NSCoder.string(for: clip),
            "minimumWidthPt": min(200, clip.width / 2)])
        try homeRequire(clip.contains(frame) && frame.width >= min(200, clip.width / 2),
                        "QA14_LAYOUT heading must be wholly visible and not a syllable-width column: " + expected)
        let pixels = try scanner14Pixels(app)
        let sx = CGFloat(pixels.width) / app.frame.width, sy = CGFloat(pixels.height) / app.frame.height
        let area = CGRect(x: (frame.minX - app.frame.minX) * sx, y: (frame.minY - app.frame.minY) * sy,
                          width: frame.width * sx, height: frame.height * sy).integral
        guard let crop = pixels.cropping(to: area) else { try homeRequire(false, "QA14_HARNESS heading crop outside screenshot"); return }
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate; request.usesLanguageCorrection = false
        request.recognitionLanguages = ["es-ES", "en-US"]
        try VNImageRequestHandler(cgImage: crop, options: [:]).perform([request])
        let observations = (request.results ?? []).sorted {
            if abs($0.boundingBox.midY - $1.boundingBox.midY) > 0.02 { return $0.boundingBox.midY > $1.boundingBox.midY }
            return $0.boundingBox.minX < $1.boundingBox.minX
        }
        func tokens(_ text: String) -> [String] {
            text.components(separatedBy: CharacterSet.letters.inverted).filter { !$0.isEmpty }.map {
                $0.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: Locale(identifier: "es_ES"))
            }
        }
        let rows = observations.map { ["text": $0.topCandidates(1).first?.string ?? "",
                                      "bounds": NSCoder.string(for: $0.boundingBox)] }
        // Each token is already a whole OCR word in one row. Never concatenate
        // letters or syllables across rows to reconstruct a missing word.
        let words = observations.flatMap { tokens($0.topCandidates(1).first?.string ?? "") }
        let expectedWords = tokens(expected)
        try scanner14Record(tag + "-whole-word-OCR", ["rows": rows, "observedWholeWords": words,
            "expectedWholeWords": expectedWords, "caseAccentFoldOnly": true, "joinFragments": false])
        try homeRequire(words == expectedWords, "QA14_OCR_OBSERVATION whole words missing/split; inspect actual pixels before product classification: " + expected)
    }

    private func scanner14TintBounds(_ rgba: [UInt8], width: Int, height: Int) -> [CGRect] {
        precondition(rgba.count == width * height * 4)
        var seen = [Bool](repeating: false, count: width * height)
        var rectangles: [CGRect] = []
        func tinted(_ index: Int) -> Bool {
            let p = index * 4, r = Int(rgba[p]), g = Int(rgba[p + 1]), b = Int(rgba[p + 2])
            return rgba[p + 3] >= 250 && ((r >= 245 && (225...247).contains(g) && (225...247).contains(b) && r - g >= 6)
                || (g >= 245 && (225...247).contains(r) && (235...251).contains(b) && g - r >= 7))
        }
        for seed in 0..<(width * height) where !seen[seed] {
            seen[seed] = true
            if !tinted(seed) { continue }
            var queue = [seed], cursor = 0
            var left = seed % width, right = left, top = seed / width, bottom = top
            while cursor < queue.count {
                let item = queue[cursor]; cursor += 1
                let x = item % width, y = item / width
                left = min(left, x); right = max(right, x); top = min(top, y); bottom = max(bottom, y)
                let adjacent = [(x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)]
                for (nx, ny) in adjacent where nx >= 0 && nx < width && ny >= 0 && ny < height {
                    let next = ny * width + nx
                    if seen[next] { continue }
                    seen[next] = true
                    if tinted(next) { queue.append(next) }
                }
            }
            if queue.count >= 9 { rectangles.append(CGRect(x: left, y: top, width: right - left + 1, height: bottom - top + 1)) }
        }
        // Dark outline glyphs can enclose smaller islands of the same tint.
        return rectangles.filter { candidate in !rectangles.contains { $0 != candidate && $0.contains(candidate) } }
    }

    @MainActor private func scanner14Decoration(_ photoHeading: XCUIElement, tag: String,
                                               app: XCUIApplication) throws {
        let clip = try homeClip(app), frame = photoHeading.frame
        let y = max(clip.minY, frame.minY - 64)
        let region = CGRect(x: clip.minX, y: y, width: clip.width, height: min(clip.maxY, frame.maxY + 8) - y)
        let pixels = try scanner14Pixels(app)
        let sx = CGFloat(pixels.width) / app.frame.width, sy = CGFloat(pixels.height) / app.frame.height
        let pixelRect = CGRect(x: (region.minX - app.frame.minX) * sx, y: (region.minY - app.frame.minY) * sy,
                               width: region.width * sx, height: region.height * sy).integral
        guard let crop = pixels.cropping(to: pixelRect) else { try homeRequire(false, "QA14_HARNESS decoration crop unavailable"); return }
        var rgba = [UInt8](repeating: 0, count: crop.width * crop.height * 4)
        let drawn = rgba.withUnsafeMutableBytes { storage -> Bool in
            guard let context = CGContext(data: storage.baseAddress, width: crop.width, height: crop.height,
                bitsPerComponent: 8, bytesPerRow: crop.width * 4, space: CGColorSpaceCreateDeviceRGB(),
                bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue | CGBitmapInfo.byteOrder32Big.rawValue) else { return false }
            context.draw(crop, in: CGRect(x: 0, y: 0, width: crop.width, height: crop.height)); return true
        }
        try homeRequire(drawn, "QA14_HARNESS decoration pixel format could not be normalized")
        let bounds = scanner14TintBounds(rgba, width: crop.width, height: crop.height).filter { $0.width / sx >= 4 && $0.height / sy >= 4 }
        let measured = bounds.map { ["cropLocalPixelBounds": NSCoder.string(for: $0), "widthPt": $0.width / sx, "heightPt": $0.height / sy] as [String: Any] }
        capture(tag + "-decoration", app)
        try scanner14Record(tag + "-decoration-physical", ["regionPt": NSCoder.string(for: region), "components": measured,
            "palette": "Existing empty scanner red50/emerald50 tint; icon is absent from AX. No DOM/JS measurement.",
            "maximumPhysicalPt": 44, "ambiguousOrMissingIsHarnessObservationNotProductDiagnosis": true])
        try homeRequire(bounds.count == 1, "QA14_HARNESS decoration tint absent/ambiguous; parent native pixel review required")
        try homeRequire(bounds[0].minX > 0 && bounds[0].minY > 0 && bounds[0].maxX < CGFloat(crop.width)
                        && bounds[0].maxY < CGFloat(crop.height), "QA14_HARNESS decoration touches crop edge; full physical size is not proven")
        try homeRequire(bounds[0].width / sx <= 44 && bounds[0].height / sy <= 44,
                        "QA14_LAYOUT decorative scanner icon container exceeds physical44pt")
    }

    @MainActor private func scanner14GalleryCancel(_ label: String, photoHeading: String,
                                                  tag: String, app: XCUIApplication) throws {
        let upload = app.buttons[label].firstMatch
        _ = try scanner14Reveal(upload, tag: tag + "-gallery-control", app: app)
        try homeRequire(upload.isHittable, "QA14_LAYOUT gallery control standard AX unreachable")
        upload.tap()
        let library = app.buttons.matching(NSPredicate(format: "label IN %@", ["Photo Library", "Fototeca", "Biblioteca de fotos"])).firstMatch
        capture(tag + "-platform-file-actions", app)
        try homeRequire(library.waitForExistence(timeout: 10), "QA14_PLATFORM file-action Photo Library unavailable; inspect permission/system UI, do not grant permissions or pick a file")
        let libraryFrame = library.frame, libraryViewport = app.frame
        try scanner14Record(tag + "-platform-photo-library-bounds", ["label": library.label,
            "identifier": library.identifier, "frame": NSCoder.string(for: libraryFrame),
            "viewport": NSCoder.string(for: libraryViewport), "systemOwnedControl": true,
            "effective44ptClaim": false])
        try homeRequire(libraryFrame.width > 0 && libraryFrame.height > 0 && libraryViewport.contains(libraryFrame),
                        "QA14_PLATFORM actual Photo Library option lacks positive onscreen bounds")
        try homeRequire(library.isHittable, "QA14_PLATFORM Photo Library AX not reachable")
        library.tap()
        let cancel = app.buttons.matching(NSPredicate(format: "label IN %@", ["Cancel", "Cancelar"])).firstMatch
        let visible = cancel.waitForExistence(timeout: 12)
        capture(tag + "-actual-photos-no-selection", app)
        try homeRequire(visible, "QA14_PLATFORM Photos Cancel absent; permission/picker state not an app-layout diagnosis")
        let photosNavigation = app.navigationBars.matching(NSPredicate(format: "identifier IN %@ OR label IN %@",
            ["Fotos", "Photos"], ["Fotos", "Photos"])).firstMatch
        try homeRequire(photosNavigation.exists, "QA14_PLATFORM named actual Photos picker navigation missing")
        let cancelFrame = cancel.frame, cancelViewport = app.frame
        try scanner14Record(tag + "-platform-photos-cancel-bounds", ["label": cancel.label,
            "identifier": cancel.identifier, "frame": NSCoder.string(for: cancelFrame),
            "viewport": NSCoder.string(for: cancelViewport), "systemOwnedControl": true,
            "effective44ptClaim": false])
        try homeRequire(cancelFrame.width > 0 && cancelFrame.height > 0 && cancelViewport.contains(cancelFrame),
                        "QA14_PLATFORM actual Photos Cancel lacks positive onscreen bounds")
        try homeRequire(cancel.isHittable, "QA14_PLATFORM Photos Cancel AX not reachable")
        cancel.tap()
        let pickerDismissed = NSPredicate { _, _ in
            let activeCancel = app.buttons.matching(NSPredicate(format: "identifier == %@ OR label IN %@",
                "Cancel", ["Cancel", "Cancelar"])).firstMatch
            let activePhotos = app.navigationBars.matching(NSPredicate(format: "identifier IN %@ OR label IN %@",
                ["Fotos", "Photos"], ["Fotos", "Photos"])).firstMatch
            return !activeCancel.exists && !activePhotos.exists
        }
        try homeRequire(XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: pickerDismissed, object: nil)], timeout: 12) == .completed,
                        "QA14_STATE actual Photos picker or OS Cancel did not disappear after standard Cancel tap")
        try homeRequire(app.staticTexts[photoHeading].firstMatch.waitForExistence(timeout: 12)
                        && upload.waitForExistence(timeout: 12), "QA14_STATE cancel did not return unchanged initial scanner")
        try homeRequire(!app.buttons["Cancelar an\u{00e1}lisis"].exists && !app.buttons["Revisar vinos"].exists
                        && !app.buttons["Quitar carta"].exists, "QA14_STATE cancelling Photos must not select/preview/analyze")
        try homeRequire(upload.label == label && upload.isHittable,
                        "QA14_STATE same empty scanner upload must regain standard AX reachability after Photos dismissal")
        let selectedSource = app.images.matching(NSPredicate(format: "label IN %@",
            ["Foto analizada con regiones numeradas", "Carta con vinos marcados mediante numeros"])).firstMatch
        try homeRequire(!selectedSource.exists, "QA14_STATE cancel must leave the scanner source empty, without a selected-image preview")
        try scanner14Record(tag + "-empty-source-return", ["sameUploadLabel": upload.label == label,
            "uploadHittable": upload.isHittable, "photosPickerAndOSCancelDisappearanceWaitPassed": true,
            "selectedSourcePreviewPresent": selectedSource.exists, "effectiveOS44ptClaim": false])
        capture(tag + "-photos-cancelled-empty-scanner", app)
    }

    @MainActor func test14InitialScannersMaxTextReadabilityAndGalleryCancel() throws {
        let app = try ownedApp()
        defer { XCUIDevice.shared.orientation = .portrait; app.launchArguments = []; app.terminate() }
        app.launchArguments = ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"]
        XCUIDevice.shared.orientation = .portrait
        app.launch()
        for landscape in [false, true] {
            try homeOrientation(landscape, app: app)
            for (body, title, photo, gallery) in [
                ("Botellas", "Etiqueta de vino", "Fotograf\u{00ed}a las botellas", "Elegir de galer\u{00ed}a"),
                ("Carta", "Carta de vinos", "Fotograf\u{00ed}a la carta", "Subir archivo")
            ] {
                open("Inicio", heading: "¿Qué quieres elegir?", app: app)
                let tag = "native96-scanner14-max-" + (landscape ? "landscape-" : "portrait-") + body
                try homeBodyAction(body, destination: title, tag: tag + "-Home", app: app)
                capture(tag + "-initial", app)
                let heading = app.staticTexts[title].firstMatch, photoHeading = app.staticTexts[photo].firstMatch
                try scanner14Words(heading, expected: title, tag: tag + "-title", app: app)
                try homeRequire(photoHeading.waitForExistence(timeout: 12), "QA14_LAYOUT photo heading missing")
                try scanner14Record(tag + "-initial-photo-position", ["frame": NSCoder.string(for: photoHeading.frame),
                    "initiallyWholeVisible": try homeClip(app).contains(photoHeading.frame), "verticalScrollAllowedButRecorded": true])
                _ = try scanner14Reveal(photoHeading, tag: tag + "-photo-heading", requiresTarget44: false, app: app)
                try scanner14Words(photoHeading, expected: photo, tag: tag + "-photo", app: app)
                try scanner14Decoration(photoHeading, tag: tag, app: app)
                try scanner14TextWidth(tag, app: app)
                for label in ["Volver a tipos de escaneo", "Hacer foto", gallery] {
                    let button = app.buttons[label].firstMatch
                    try homeRequire(button.exists, "QA14_LAYOUT named scanner action missing: " + label)
                    let clip = try homeClip(app), frame = button.frame
                    try scanner14Record(tag + "-target-" + label, ["label": label,
                        "frame": NSCoder.string(for: frame), "clip": NSCoder.string(for: clip)])
                    try homeRequire(frame.width >= 44 && frame.height >= 44 && frame.minX >= clip.minX && frame.maxX <= clip.maxX,
                                    "QA14_LAYOUT named initial scanner action must retain44pt: " + label)
                }
                try scanner14GalleryCancel(gallery, photoHeading: photo, tag: tag, app: app)
            }
        }
    }

    @MainActor func test12HomeLargeTextNavigationInBothOrientations() throws {
        let app = try ownedApp()
        defer {
            XCUIDevice.shared.orientation = .portrait
            app.launchArguments = []
            app.terminate()
            app.launch()
        }
        var normalHeadingHeight: CGFloat = 0
        for large in [false, true] {
            XCUIDevice.shared.orientation = .portrait
            app.launchArguments = ["-UIPreferredContentSizeCategoryName", large ? "UICTContentSizeCategoryAccessibilityXXXL" : "UICTContentSizeCategoryL"]
            app.launch()
            open("Inicio", heading: "¿Qué quieres elegir?", app: app)
            let heading = app.staticTexts["¿Qué quieres elegir?"].firstMatch
            if large { XCTAssertGreaterThan(heading.frame.height, normalHeadingHeight * 1.5) }
            else { normalHeadingHeight = heading.frame.height }
            for landscape in [false, true] {
                XCUIDevice.shared.orientation = landscape ? .landscapeLeft : .portrait
                let settled = NSPredicate { _, _ in (app.frame.width > app.frame.height) == landscape }
                XCTAssertEqual(XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: settled, object: nil)], timeout: 10), .completed)
                let navigationReady = NSPredicate { _, _ in
                    ["Inicio", "aiRIM", "Escanear", "Bodega", "Perfil"].allSatisfy { name in
                        let link = app.links.matching(identifier: name).firstMatch
                        return link.isHittable && link.frame.width >= 43.5 && link.frame.height >= 43.5
                            && link.frame.minX >= app.frame.minX - 1 && link.frame.maxX <= app.frame.maxX + 1
                            && link.frame.minY >= app.frame.minY - 1
                            && link.frame.maxY <= app.frame.maxY + 1
                    }
                }
                XCTAssertEqual(XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: navigationReady, object: nil)], timeout: 10), .completed, app.debugDescription)
                assertNavigation(app)
                capture("native95-home-\(large ? "max" : "normal")-\(landscape ? "landscape" : "portrait")", app)
                open("Escanear", heading: "Escanear", app: app)
                assertNavigation(app)
                open("Inicio", heading: "¿Qué quieres elegir?", app: app)
            }
            app.terminate()
        }
    }
}
