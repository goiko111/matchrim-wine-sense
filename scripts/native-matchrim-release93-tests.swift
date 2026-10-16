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
            app.swipeUp()
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
}
