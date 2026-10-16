import XCTest

final class Matchrim93ReleaseTests: XCTestCase {
    let bundle = "wine.matchrim.qa91live"

    @MainActor private func ownedApp() throws -> XCUIApplication {
        #if !targetEnvironment(simulator)
        throw XCTSkip("Owned simulator only")
        #endif
        XCTAssertEqual(ProcessInfo.processInfo.environment["SIMULATOR_UDID"], "B18822EF-BFBD-4A6A-89B2-33539BDE4127")
        continueAfterFailure = false
        return XCUIApplication(bundleIdentifier: bundle)
    }

    @MainActor private func capture(_ name: String, _ app: XCUIApplication) {
        let shot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        shot.name = name; shot.lifetime = .keepAlways; add(shot)
        let tree = XCTAttachment(string: app.debugDescription)
        tree.name = name + "-tree"; tree.lifetime = .keepAlways; add(tree)
    }

    @MainActor private func reveal(_ element: XCUIElement, in app: XCUIApplication) {
        for _ in 0..<12 {
            if element.exists && element.isHittable { return }
            if element.exists && element.frame.maxY < app.frame.midY { app.swipeDown() }
            else { app.swipeUp() }
        }
        XCTAssertTrue(element.isHittable, app.debugDescription)
    }

    @MainActor private func openRestaurant(_ app: XCUIApplication) {
        let scan = app.links.matching(identifier: "Escanear").firstMatch
        XCTAssertTrue(scan.waitForExistence(timeout: 15), app.debugDescription)
        scan.tap()
        let entry = app.buttons["Comida y vinos del restaurante"]
        XCTAssertTrue(entry.waitForExistence(timeout: 10), app.debugDescription)
        entry.tap()
        XCTAssertTrue(app.staticTexts["En el restaurante"].firstMatch.waitForExistence(timeout: 15), app.debugDescription)
        XCTAssertFalse(app.links["Iniciar sesi\u{00f3}n para analizar"].exists, "Preserved existing session is required; no credential copying/bypass")
    }

    @MainActor func test01AuthenticatedMobileLayoutAndDynamicType() throws {
        let app = try ownedApp()
        defer { XCUIDevice.shared.orientation = .portrait; app.launchArguments = []; app.terminate(); app.launch() }
        var normalHeight: CGFloat = 0
        for large in [false, true] {
            XCUIDevice.shared.orientation = .portrait
            app.launchArguments = ["-UIPreferredContentSizeCategoryName", large ? "UICTContentSizeCategoryAccessibilityXXXL" : "UICTContentSizeCategoryL"]
            app.launch()
            openRestaurant(app)
            let heading = app.staticTexts["En el restaurante"].firstMatch
            if large { XCTAssertGreaterThan(heading.frame.height, normalHeight * 1.5) }
            else { normalHeight = heading.frame.height }
            for landscape in [false, true] {
                XCUIDevice.shared.orientation = landscape ? .landscapeLeft : .portrait
                let settled = NSPredicate { _, _ in (app.frame.width > app.frame.height) == landscape }
                XCTAssertEqual(XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: settled, object: nil)], timeout: 10), .completed)
                for label in ["Inicio", "aiRIM", "Escanear", "Bodega", "Perfil"] {
                    let link = app.links.matching(identifier: label).firstMatch
                    XCTAssertTrue(link.isHittable, label + " unreachable")
                    XCTAssertGreaterThanOrEqual(link.frame.width, 43.5)
                    XCTAssertGreaterThanOrEqual(link.frame.height, 43.5)
                    XCTAssertLessThanOrEqual(link.frame.maxX, app.frame.maxX + 1)
                }
                capture("native93-\(large ? "max" : "normal")-\(landscape ? "landscape" : "portrait")", app)
            }
            app.terminate()
        }
    }

    @MainActor func test02LongReadingsAndCorrectionKeyboard() throws {
        let app = try ownedApp()
        XCUIDevice.shared.orientation = .portrait
        app.launchArguments = []
        app.launch()
        openRestaurant(app)
        let food = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Comida")).firstMatch
        XCTAssertTrue(food.exists, app.debugDescription)
        food.tap()
        let correct = app.buttons["Corregir Gambas"]
        reveal(correct, in: app)
        capture("native93-food-readings-scroll", app)
        correct.tap()
        XCTAssertTrue(app.staticTexts["Corregir lectura"].firstMatch.waitForExistence(timeout: 5), app.debugDescription)
        let name = app.textFields["Nombre"]
        XCTAssertTrue(name.exists, app.debugDescription)
        name.tap()
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5))
        capture("native93-correction-keyboard", app)
        let save = app.buttons["Guardar correcci\u{00f3}n"]
        reveal(save, in: app)
        XCTAssertTrue(save.isHittable, app.debugDescription)
        XCTAssertGreaterThanOrEqual(save.frame.height, 43.5)
        capture("native93-correction-actions-reachable", app)
        let close = app.buttons["Close"]
        XCTAssertTrue(close.exists, app.debugDescription)
        close.tap()
        XCTAssertFalse(app.staticTexts["Corregir lectura"].firstMatch.exists)
        capture("native93-correction-dismissed-without-save", app)
    }

    @MainActor func test03ClassicGalleryInspection() throws {
        let app = try ownedApp()
        XCUIDevice.shared.orientation = .portrait
        app.launchArguments = []
        app.launch()
        let scan = app.links.matching(identifier: "Escanear").firstMatch
        XCTAssertTrue(scan.waitForExistence(timeout: 15)); scan.tap()
        let menu = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Carta de vinos")).firstMatch
        XCTAssertTrue(menu.exists, app.debugDescription); menu.tap()
        let upload = app.buttons["Subir archivo"]
        XCTAssertTrue(upload.waitForExistence(timeout: 10), app.debugDescription); upload.tap()
        let library = app.buttons["Photo Library"]
        XCTAssertTrue(library.waitForExistence(timeout: 5), app.debugDescription); library.tap()
        capture("native93-classic-photo-picker-inspection-no-analysis", app)
    }

    @MainActor func test04ObserveRealClassicResult() throws {
        let app = try ownedApp()
        XCTAssertEqual(app.state, .runningForeground, "Attach to the manually selected real IMG_7548 run; do not fabricate a session")
        if app.buttons["Cerrar detalle"].exists { app.buttons["Cerrar detalle"].tap() }
        let results = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "Vinos Detectados (")).firstMatch
        XCTAssertTrue(results.waitForExistence(timeout: 110), app.debugDescription)
        capture("native93-classic-real-7548-results", app)
        XCTAssertTrue(app.otherElements.matching(NSPredicate(format: "label == %@", "Vinos Detectados (8)")).firstMatch.exists, app.debugDescription)
        let first = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Abrir vino 1:")).firstMatch
        reveal(first, in: app)
        first.tap()
        XCTAssertTrue(app.otherElements.matching(NSPredicate(format: "label BEGINSWITH %@", "Contenido del vino")).firstMatch.waitForExistence(timeout: 5), app.debugDescription)
        capture("native93-classic-real-detail", app)
        XCUIDevice.shared.orientation = .landscapeLeft
        capture("native93-classic-detail-landscape", app)
        XCUIDevice.shared.orientation = .portrait
        let close = app.buttons["Cerrar detalle"]
        XCTAssertTrue(close.isHittable, app.debugDescription); close.tap()
        capture("native93-classic-real-detail-dismissed", app)
    }

    @MainActor func test05ReviewAllEightAndCompareFive() throws {
        let app = try ownedApp()
        XCTAssertEqual(app.state, .runningForeground)
        let first = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Abrir vino 1:")).firstMatch
        reveal(first, in: app); first.tap()
        for index in 1...8 {
            XCTAssertTrue(app.buttons["Cerrar detalle"].waitForExistence(timeout: 5), app.debugDescription)
            capture("native93-real-7548-reference-\(index)", app)
            if index < 8 { app.buttons["Siguiente"].tap() }
            else { XCTAssertFalse(app.buttons["Siguiente"].isEnabled) }
        }
        app.buttons["Cerrar detalle"].tap()
        let choices = app.switches.matching(NSPredicate(format: "label BEGINSWITH %@", "Comparar "))
        let settledChoices = NSPredicate { _, _ in choices.count == 8 }
        XCTAssertEqual(XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: settledChoices, object: nil)], timeout: 5), .completed, app.debugDescription)
        for index in [3, 4] {
            let choice = choices.element(boundBy: index)
            reveal(choice, in: app); choice.tap()
        }
        XCTAssertFalse(choices.element(boundBy: 5).isEnabled)
        capture("native93-real-comparison-five-selected", app)
        let service = app.buttons["Servicio"]
        reveal(service, in: app); service.tap()
        capture("native93-real-comparison-service", app)
        XCUIDevice.shared.orientation = .landscapeLeft
        let settled = NSPredicate { _, _ in app.frame.width > app.frame.height }
        XCTAssertEqual(XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: settled, object: nil)], timeout: 10), .completed)
        capture("native93-real-comparison-landscape", app)
        XCUIDevice.shared.orientation = .portrait
    }

    @MainActor func test06MainNavigationPreservesAccount() throws {
        let app = try ownedApp()
        app.launchArguments = []; app.launch()
        for name in ["Inicio", "aiRIM", "Bodega", "Perfil", "Escanear"] {
            let link = app.links.matching(identifier: name).firstMatch
            XCTAssertTrue(link.waitForExistence(timeout: 15), app.debugDescription)
            XCTAssertTrue(link.isHittable)
            link.tap()
            capture("native93-navigation-\(name)", app)
        }
    }

    @MainActor func test07ObserveAndCancelClassicReading() throws {
        let app = try ownedApp()
        XCTAssertEqual(app.state, .runningForeground)
        let cancel = app.buttons["Cancelar an\u{00e1}lisis"]
        XCTAssertTrue(cancel.waitForExistence(timeout: 15), app.debugDescription)
        let began = Date()
        cancel.tap()
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "Análisis cancelado.")).firstMatch.waitForExistence(timeout: 5), app.debugDescription)
        XCTAssertLessThan(Date().timeIntervalSince(began), 6)
        XCTAssertTrue(app.buttons["Reintentar foto"].exists)
        capture("native93-classic-cancelled-retry-available", app)
    }
}
