import XCTest

final class MatchrimCandidateUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
        XCUIDevice.shared.orientation = .portrait
    }

    @MainActor
    private func launch() -> XCUIApplication {
        let app = XCUIApplication(bundleIdentifier: "wine.matchrim.app")
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 20))
        if app.buttons["Saltar guía"].waitForExistence(timeout: 3) {
            app.buttons["Saltar guía"].tap()
        }
        XCTAssertTrue(app.links["Inicio"].waitForExistence(timeout: 15))
        app.links["Inicio"].tap()
        return app
    }

    @MainActor
    private func capture(_ name: String) {
        let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    @MainActor
    private func closeSystemKeyboardIntroduction(_ app: XCUIApplication) {
        let message = app.staticTexts["Type español e inglés"].firstMatch
        if message.waitForExistence(timeout: 2) && app.buttons["Continue"].exists {
            app.buttons["Continue"].tap()
        }
    }

    @MainActor
    private func waitForStableViewport(_ app: XCUIApplication, landscape: Bool) -> Bool {
        let deadline = Date().addingTimeInterval(10)
        var previous = CGRect.null
        var stableSince: Date?
        // Window bounds change before WebKit commits its rotated hit-testing coordinates.
        while Date() < deadline {
            let window = app.frame
            let viewport = app.webViews.firstMatch.frame
            let correctOrientation = (window.width > window.height) == landscape
            let fillsWindow = abs(viewport.width - window.width) < 2
                && abs(viewport.height - window.height) < 2
            if correctOrientation && fillsWindow && viewport == previous {
                if let stableSince, Date().timeIntervalSince(stableSince) >= 0.75 { return true }
            } else {
                stableSince = Date()
            }
            previous = viewport
            RunLoop.current.run(until: Date().addingTimeInterval(0.1))
        }
        return false
    }

    @MainActor
    private func labelSources(_ app: XCUIApplication) {
        app.links["Escanear"].tap()
        let mode = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Etiqueta de vino")).firstMatch
        XCTAssertTrue(mode.waitForExistence(timeout: 10))
        mode.tap()
        let consent = app.switches["He leído el aviso de privacidad del escáner"]
        if consent.waitForExistence(timeout: 2) {
            if consent.value as? String == "0" { consent.tap() }
            app.buttons["Entiendo y continuar"].tap()
        }
        XCTAssertTrue(app.buttons["Hacer foto"].waitForExistence(timeout: 10))
    }

    @MainActor
    func testPrimaryNavigationAndAiRim() throws {
        let app = launch()
        for title in ["Inicio", "aiRIM", "Escanear", "Bodega", "Perfil"] {
            let link = app.links[title].firstMatch
            XCTAssertTrue(link.exists)
            XCTAssertTrue(link.isHittable)
            XCTAssertGreaterThanOrEqual(link.frame.height, 44)
        }
        app.links["aiRIM"].tap()
        let heading = app.staticTexts["¿Qué necesitas decidir?"].firstMatch
        XCTAssertTrue(heading.waitForExistence(timeout: 10))
        XCTAssertGreaterThanOrEqual(heading.frame.minY, 55)
        capture("candidate-airim-main-menu")
    }

    @MainActor
    func testScanModes() throws {
        let app = launch()
        app.links["Escanear"].tap()
        for title in ["Carta de vinos", "Etiqueta de vino", "Menú de comida", "Plato", "Encontrar vino"] {
            let button = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", title)).firstMatch
            XCTAssertTrue(button.waitForExistence(timeout: 10))
            for _ in 0..<4 {
                if button.isHittable { break }
                app.swipeUp()
            }
            XCTAssertTrue(button.isHittable)
        }
        capture("candidate-scan-modes")
    }

    @MainActor
    func testColdLaunchesAndSafeArea() throws {
        let firstUse = launch()
        firstUse.terminate()
        var maximum = 0.0
        var samples: [Double] = []
        for _ in 0..<5 {
            let app = XCUIApplication(bundleIdentifier: "wine.matchrim.app")
            app.terminate()
            let start = Date()
            app.launch()
            let heading = app.staticTexts["¿Qué quieres elegir?"].firstMatch
            XCTAssertTrue(heading.waitForExistence(timeout: 10))
            XCTAssertGreaterThanOrEqual(heading.frame.minY, 55)
            let elapsed = Date().timeIntervalSince(start)
            samples.append(elapsed)
            maximum = max(maximum, elapsed)
            app.terminate()
        }
        print("MATCHRIM_73_COLD_LAUNCH_SAMPLES=\(samples)")
        print("MATCHRIM_CANDIDATE_COLD_LAUNCH_MAX=\(maximum)")
        XCTAssertLessThan(maximum, 5)
    }

    @MainActor
    func testScannerRotationAndBackground() throws {
        let app = launch()
        labelSources(app)
        XCUIDevice.shared.press(.home)
        app.activate()
        XCTAssertTrue(app.buttons["Hacer foto"].waitForExistence(timeout: 15))
        XCUIDevice.shared.orientation = .landscapeLeft
        XCTAssertTrue(waitForStableViewport(app, landscape: true))
        XCTAssertGreaterThan(app.frame.width, app.frame.height)
        capture("candidate-scanner-landscape")
        XCTAssertTrue(app.buttons["Hacer foto"].isHittable)
        XCTAssertTrue(app.buttons["Elegir de galería"].isHittable)
        XCUIDevice.shared.orientation = .portrait
        XCTAssertTrue(waitForStableViewport(app, landscape: false))
        XCTAssertGreaterThan(app.frame.height, app.frame.width)
        capture("candidate-scanner-portrait")
    }

    @MainActor
    func testPhotoPickerReturn() throws {
        let app = launch()
        labelSources(app)
        app.buttons["Elegir de galería"].tap()
        let library = app.buttons["Photo Library"]
        XCTAssertTrue(library.waitForExistence(timeout: 10))
        library.tap()
        // Do not retain screenshots of the owner's unrelated photo thumbnails.
        XCUIDevice.shared.press(.home)
        app.activate()
        XCTAssertTrue(app.buttons["Elegir de galería"].waitForExistence(timeout: 15))
    }

    @MainActor
    func testCoreAccessibility() throws {
        let app = launch()
        try app.performAccessibilityAudit(for: [.dynamicType, .textClipped])
        capture("candidate-home-accessibility")
        app.links["aiRIM"].tap()
        XCTAssertTrue(app.staticTexts["¿Qué necesitas decidir?"].waitForExistence(timeout: 10))
        try app.performAccessibilityAudit(for: [.dynamicType, .textClipped])
        capture("candidate-airim-accessibility")
    }

    @MainActor
    func testAiRimKeyboardRecovery() throws {
        let app = launch()
        app.links["aiRIM"].tap()
        let heading = app.staticTexts["¿Qué necesitas decidir?"].firstMatch
        let question = app.textFields["Pregunta para aiRIM"].firstMatch
        XCTAssertTrue(question.waitForExistence(timeout: 10))
        question.tap()
        closeSystemKeyboardIntroduction(app)
        question.typeText("QA de teclado sin enviar")
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 10))
        capture("83-airim-keyboard-visible")
        print("MATCHRIM83_AIRIM_KEYBOARD heading=\(heading.frame) input=\(question.frame) keyboard=\(app.keyboards.firstMatch.frame)")
        XCTAssertGreaterThanOrEqual(question.frame.minY, 55)
        XCTAssertLessThanOrEqual(question.frame.maxY, app.keyboards.firstMatch.frame.minY + 1)
        let dismiss = app.toolbars.buttons.matching(NSPredicate(format: "label IN %@", ["Done", "Listo", "OK", "Hecho", "selected"])).firstMatch
        if dismiss.exists { dismiss.tap() } else { heading.tap() }
        XCTAssertTrue(app.keyboards.firstMatch.waitForNonExistence(timeout: 10))
        capture("83-airim-after-keyboard")
        XCTAssertGreaterThanOrEqual(heading.frame.minY, 55)
        XCTAssertTrue(app.links["Inicio"].isHittable)
        app.links["Inicio"].tap()
    }

    @MainActor
    func testFixtureManualEditorKeyboard() throws {
        let app = launch()
        labelSources(app)
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "QA local:")).firstMatch.exists,
            "This test must run only against the isolated fixture binary, never the owner's TestFlight app")
        app.buttons["Elegir de galería"].tap()
        XCTAssertTrue(app.buttons["Photo Library"].waitForExistence(timeout: 10))
        app.buttons["Photo Library"].tap()
        let photo = app.images.matching(NSPredicate(format: "identifier == %@ AND (label BEGINSWITH %@ OR label BEGINSWITH %@)", "PXGGridLayout-Info", "Photo,", "Foto,")).firstMatch
        XCTAssertTrue(photo.waitForExistence(timeout: 15), app.debugDescription)
        capture("83-fixture-picker-before-selection")
        photo.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
        let choose = app.buttons["PUOneUpBarButtonItemIdentifierAssetExplorerReviewScreenDone"]
        XCTAssertTrue(choose.waitForExistence(timeout: 10))
        choose.tap()
        let ready = app.staticTexts["Lote listo para revisar"].firstMatch
        XCTAssertTrue(ready.waitForExistence(timeout: 45))
        let wines = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Vinos (")).firstMatch
        for _ in 0..<5 { if wines.isHittable { break }; app.swipeUp() }
        XCTAssertTrue(wines.exists, app.debugDescription)
        wines.tap()
        let detail = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Abrir detalle de")).firstMatch
        for _ in 0..<5 { if detail.isHittable { break }; app.swipeUp() }
        XCTAssertTrue(detail.waitForExistence(timeout: 10))
        detail.tap()
        let edit = app.buttons["Corregir identificación"].firstMatch
        XCTAssertTrue(edit.waitForExistence(timeout: 10))
        for _ in 0..<5 { if edit.isHittable { break }; app.swipeUp() }
        edit.tap()
        closeSystemKeyboardIntroduction(app)
        let field = app.textFields["Vino"].firstMatch
        XCTAssertTrue(field.waitForExistence(timeout: 10), app.debugDescription)
        field.typeText(" QA")
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 10))
        capture("83-manual-editor-keyboard-visible")
        print("MATCHRIM83_EDITOR_KEYBOARD input=\(field.frame) keyboard=\(app.keyboards.firstMatch.frame)")
        XCTAssertGreaterThanOrEqual(field.frame.minY, 55)
        XCTAssertLessThanOrEqual(field.frame.maxY, app.keyboards.firstMatch.frame.minY + 1)
        let dismiss = app.toolbars.buttons.matching(NSPredicate(format: "label IN %@", ["Done", "Listo", "OK", "Hecho", "selected"])).firstMatch
        if dismiss.exists { dismiss.tap() } else { app.buttons["Corregir identificación"].tap() }
        XCTAssertTrue(app.keyboards.firstMatch.waitForNonExistence(timeout: 10))
        capture("83-manual-editor-after-keyboard")
        let close = app.buttons["Cerrar"].firstMatch
        XCTAssertTrue(close.isHittable)
        close.tap()
        app.links["Inicio"].tap()
    }
}
