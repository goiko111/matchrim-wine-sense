import XCTest

final class Matchrim90TypeSimulatorTests: XCTestCase {
    @MainActor func testUserTextSizeAndNavigation() throws {
        #if !targetEnvironment(simulator)
        throw XCTSkip("Owned simulator only")
        #endif
        XCTAssertEqual(ProcessInfo.processInfo.environment["SIMULATOR_UDID"], "B18822EF-BFBD-4A6A-89B2-33539BDE4127")
        continueAfterFailure = false
        let app = XCUIApplication(bundleIdentifier: "wine.matchrim.qa90")
        var normalHeadingHeight: CGFloat = 0
        defer { XCUIDevice.shared.orientation = .portrait; app.terminate() }
        for large in [false, true] {
            XCUIDevice.shared.orientation = .portrait
            app.launchArguments = ["-UIPreferredContentSizeCategoryName", large ? "UICTContentSizeCategoryAccessibilityXXXL" : "UICTContentSizeCategoryL"]
            app.launch()
            let skip = app.buttons["Saltar gu\u{00ed}a"]
            if skip.waitForExistence(timeout: 2) { skip.tap() }
            XCTAssertTrue(app.links["Escanear"].waitForExistence(timeout: 12), app.debugDescription)
            app.links["Escanear"].tap()
            let title = app.staticTexts["Escanear"].firstMatch
            XCTAssertTrue(title.waitForExistence(timeout: 8), app.debugDescription)
            if large {
                let grown = NSPredicate { _, _ in title.frame.height >= normalHeadingHeight * 1.7 }
                XCTAssertEqual(XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: grown, object: nil)], timeout: 10), .completed,
                               "Large accessibility type did not grow beyond the old135%cap")
            } else {
                normalHeadingHeight = title.frame.height
                XCTAssertGreaterThan(normalHeadingHeight, 20)
            }
            let metric = XCTAttachment(string: "category=\(large ? "AXXXL" : "L") headingHeight=\(title.frame.height) normalHeadingHeight=\(normalHeadingHeight)")
            metric.name = "qa90-native-type-measurement"; metric.lifetime = .keepAlways; add(metric)
            for landscape in [false, true] {
                XCUIDevice.shared.orientation = landscape ? .landscapeLeft : .portrait
                let settled = NSPredicate { _, _ in (app.frame.width > app.frame.height) == landscape }
                XCTAssertEqual(XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: settled, object: nil)], timeout: 10), .completed)
                for name in ["Inicio", "aiRIM", "Escanear", "Bodega", "Perfil"] {
                    let link = app.links[name]
                    XCTAssertTrue(link.isHittable, name + " unreachable: " + app.debugDescription)
                    XCTAssertGreaterThanOrEqual(link.frame.width, 43.5)
                    XCTAssertGreaterThanOrEqual(link.frame.height, 43.5)
                    XCTAssertGreaterThanOrEqual(link.frame.minX, app.frame.minX - 1)
                    XCTAssertLessThanOrEqual(link.frame.maxX, app.frame.maxX + 1)
                }
                let shot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
                shot.name = "qa90-\(large ? "max-type" : "normal-type")-\(landscape ? "landscape" : "portrait")"
                shot.lifetime = .keepAlways; add(shot)
            }
            app.terminate()
        }
    }
}
