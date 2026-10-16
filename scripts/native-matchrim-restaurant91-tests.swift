import XCTest

final class Matchrim91RestaurantSimulatorTests: XCTestCase {
    @MainActor func testRestaurantEntryAndAccessibleTabs() throws {
        #if !targetEnvironment(simulator)
        throw XCTSkip("Owned simulator only")
        #endif
        XCTAssertEqual(ProcessInfo.processInfo.environment["SIMULATOR_UDID"], "B18822EF-BFBD-4A6A-89B2-33539BDE4127")
        continueAfterFailure = false
        let app = XCUIApplication(bundleIdentifier: "wine.matchrim.qa91")
        var normalHeadingHeight: CGFloat = 0
        defer { XCUIDevice.shared.orientation = .portrait; app.terminate() }
        for large in [false, true] {
            XCUIDevice.shared.orientation = .portrait
            app.launchArguments = ["-UIPreferredContentSizeCategoryName", large ? "UICTContentSizeCategoryAccessibilityXXXL" : "UICTContentSizeCategoryL"]
            app.launch()
            if app.buttons["Saltar gu\u{00ed}a"].waitForExistence(timeout: 2) { app.buttons["Saltar gu\u{00ed}a"].tap() }
            XCTAssertTrue(app.links["Escanear"].waitForExistence(timeout: 15), app.debugDescription)
            app.links["Escanear"].tap()
            let entry = app.buttons["Comida y vinos del restaurante"]
            XCTAssertTrue(entry.waitForExistence(timeout: 10), app.debugDescription)
            entry.tap()
            let notice = app.buttons["Entiendo y continuar"]
            if notice.waitForExistence(timeout: 2) {
                let checkbox = app.descendants(matching: .any).matching(identifier: "He le\u{00ed}do el aviso de privacidad del esc\u{00e1}ner").firstMatch
                XCTAssertTrue(checkbox.exists, app.debugDescription)
                checkbox.tap()
                notice.tap()
            }
            let heading = app.staticTexts["En el restaurante"].firstMatch
            XCTAssertTrue(heading.waitForExistence(timeout: 10), app.debugDescription)
            if large {
                let grown = NSPredicate { _, _ in heading.frame.height >= normalHeadingHeight * 1.6 }
                XCTAssertEqual(XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: grown, object: nil)], timeout: 10), .completed)
            } else { normalHeadingHeight = heading.frame.height }
            let measurement = XCTAttachment(string: "category=\(large ? "AXXXL" : "L") headingHeight=\(heading.frame.height) normalHeight=\(normalHeadingHeight)")
            measurement.name = "restaurant91-native-type-metric"; measurement.lifetime = .keepAlways; add(measurement)
            for landscape in [false, true] {
                XCUIDevice.shared.orientation = landscape ? .landscapeLeft : .portrait
                let settled = NSPredicate { _, _ in (app.frame.width > app.frame.height) == landscape }
                XCTAssertEqual(XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: settled, object: nil)], timeout: 10), .completed)
                for name in ["Inicio", "aiRIM", "Escanear", "Bodega", "Perfil"] {
                    let item = try XCTUnwrap(app.links.matching(identifier: name).allElementsBoundByIndex.last)
                    XCTAssertTrue(item.isHittable, name + " unreachable: " + app.debugDescription)
                    XCTAssertGreaterThanOrEqual(item.frame.width, 43.5)
                    XCTAssertGreaterThanOrEqual(item.frame.height, 43.5)
                }
                let shot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
                shot.name = "restaurant91-\(large ? "max" : "normal")-\(landscape ? "landscape" : "portrait")"
                shot.lifetime = .keepAlways; add(shot)
                let tree = XCTAttachment(string: app.debugDescription)
                tree.name = "restaurant91-accessibility-tree"; tree.lifetime = .keepAlways; add(tree)
            }
            app.terminate()
        }
    }
}
