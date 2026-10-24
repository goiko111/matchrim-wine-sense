import XCTest

final class MatchrimPresentation206Tests: XCTestCase {
    @MainActor func testHomeMealEntryAndReturn() throws {
        continueAfterFailure = false
        let app = XCUIApplication(bundleIdentifier: "wine.matchrim.qa108presentation206v1")
        app.terminate()
        app.launch()
        XCUIDevice.shared.orientation = .portrait
        XCTAssertTrue(app.buttons["Buscar vino o bodega"].waitForExistence(timeout: 12))
        let meal = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Qué vas a comer")).firstMatch
        XCTAssertTrue(meal.waitForExistence(timeout: 5))
        capture("home108-portrait")
        try app.performAccessibilityAudit(for: [.contrast, .sufficientElementDescription, .textClipped, .trait])
        for _ in 0..<5 {
            if meal.isHittable { break }
            app.swipeUp()
        }
        XCTAssertTrue(meal.isHittable)
        XCTAssertGreaterThanOrEqual(meal.frame.height, 44)
        meal.tap()
        XCTAssertTrue(app.staticTexts["En el restaurante"].firstMatch.waitForExistence(timeout: 8))
        capture("home108-meal-destination")
        let home = app.links["Inicio"].firstMatch
        XCTAssertTrue(home.isHittable)
        home.tap()
        XCTAssertTrue(app.buttons["Buscar vino o bodega"].waitForExistence(timeout: 8))
        capture("home108-return")
    }

    @MainActor private func capture(_ name: String) {
        let image = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        image.name = name
        image.lifetime = .keepAlways
        add(image)
    }
}
