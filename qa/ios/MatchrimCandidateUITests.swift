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
    private func labelSources(_ app: XCUIApplication) {
        app.links["Escanear"].tap()
        let mode = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Etiqueta de vino")).firstMatch
        XCTAssertTrue(mode.waitForExistence(timeout: 10))
        mode.tap()
        let consent = app.switches["He leido el aviso de privacidad del escaner"]
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
        var maximum = 0.0
        for _ in 0..<5 {
            let start = Date()
            let app = launch()
            let heading = app.staticTexts["¿Qué quieres elegir?"].firstMatch
            XCTAssertTrue(heading.waitForExistence(timeout: 10))
            XCTAssertGreaterThanOrEqual(heading.frame.minY, 55)
            maximum = max(maximum, Date().timeIntervalSince(start))
            app.terminate()
        }
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
        let landscapeDeadline = Date().addingTimeInterval(10)
        while app.frame.width <= app.frame.height && Date() < landscapeDeadline {
            RunLoop.current.run(until: Date().addingTimeInterval(0.25))
        }
        XCTAssertGreaterThan(app.frame.width, app.frame.height)
        XCTAssertTrue(app.buttons["Hacer foto"].isHittable)
        XCTAssertTrue(app.buttons["Elegir de galería"].isHittable)
        capture("candidate-scanner-landscape")
        XCUIDevice.shared.orientation = .portrait
        let portraitDeadline = Date().addingTimeInterval(10)
        while app.frame.height <= app.frame.width && Date() < portraitDeadline {
            RunLoop.current.run(until: Date().addingTimeInterval(0.25))
        }
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
        capture("candidate-private-photo-picker")
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
}
