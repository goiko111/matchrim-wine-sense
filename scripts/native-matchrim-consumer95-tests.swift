import XCTest

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
        let receipt = XCTAttachment(string: "Exactly one explicit send action to ai-wine-chat; actual hosted transport, no mock or stored-account mutation. Elapsed: \(Date().timeIntervalSince(began)) seconds. Answer quality must be reviewed from the preserved UI, not inferred from transport completion.")
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
            // Use the visible tab centre: Simulator's default AX activation
            // point missed this link, while the same centre touch opened it.
            cellar.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
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
}
