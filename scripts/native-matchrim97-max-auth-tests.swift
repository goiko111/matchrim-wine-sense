// Isolated QA bundle; set the simulator to accessibility-extra-extra-extra-large before running.
import XCTest

final class Native97MaximumTextTests: XCTestCase {
    func testMaximumTextAuthAndSettledKeyboardRotation() throws {
        continueAfterFailure = false
        let app = XCUIApplication(bundleIdentifier: "wine.matchrim.qa97review")
        app.activate()
        XCUIDevice.shared.orientation = .portrait
        let email = app.textFields.firstMatch
        if !email.exists {
            let profile = app.links["Perfil"].firstMatch
            XCTAssertTrue(profile.waitForExistence(timeout: 8))
            profile.tap()
        }
        XCTAssertTrue(email.waitForExistence(timeout: 10))
        settle(app, landscape: false)
        let login = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Iniciar Sesión")).firstMatch
        let signup = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Registrarse")).firstMatch
        XCTAssertTrue(login.exists)
        XCTAssertTrue(signup.exists)
        XCTAssertFalse(login.frame.intersects(signup.frame), "MAX auth tabs must not overlap")
        XCTAssertGreaterThanOrEqual(signup.frame.minY, login.frame.maxY, "MAX portrait tabs must stack")
        attach(app, "01-maximum-auth-tabs-portrait")
        email.tap()
        if !app.keyboards.firstMatch.waitForExistence(timeout: 2) {
            XCTAssertTrue(email.isHittable)
            email.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
        }
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5))
        let value = email.value as? String ?? ""
        let original = value == email.placeholderValue ? "" : value
        if original != "layout-qa@example.invalid" {
            if !original.isEmpty {
                email.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: original.count))
            }
            email.typeText("layout-qa@example.invalid")
        }
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5))
        settle(app, landscape: false)
        attach(app, "02-maximum-auth-keyboard-portrait")
        assertInputVisible(app, email)
        print("N97_MAX_PORTRAIT app=\(app.frame) web=\(app.webViews.firstMatch.frame) email=\(email.frame) keyboard=\(app.keyboards.firstMatch.frame)")
        XCTAssertTrue(email.isHittable)
        XCUIDevice.shared.orientation = .landscapeLeft
        settle(app, landscape: true)
        XCTAssertTrue(email.exists)
        attach(app, "03-maximum-auth-keyboard-landscape-settled")
        assertInputVisible(app, email)
        XCTAssertTrue(email.isHittable)
        XCTAssertEqual(email.value as? String, "layout-qa@example.invalid")
        print("N97_MAX_LANDSCAPE app=\(app.frame) web=\(app.webViews.firstMatch.frame) email=\(email.frame) keyboard=\(app.keyboards.firstMatch.frame)")
        XCUIDevice.shared.orientation = .portrait
        settle(app, landscape: false)
        XCTAssertEqual(email.value as? String, "layout-qa@example.invalid")
        XCTAssertTrue(email.isHittable)
        attach(app, "04-maximum-auth-keyboard-return-settled")
        assertInputVisible(app, email)
        print("N97_MAX_NATIVE_COMPLETED_NO_SUBMISSION_NO_IMAGE_ANALYSIS")
    }

    private func assertInputVisible(_ app: XCUIApplication, _ input: XCUIElement) {
        XCTAssertTrue(app.keyboards.firstMatch.exists, "Rotation must not dismiss the keyboard")
        let viewport = app.webViews.firstMatch.frame
        XCTAssertGreaterThanOrEqual(input.frame.minY, viewport.minY)
        XCTAssertLessThanOrEqual(input.frame.maxY, viewport.maxY + 1)
        XCTAssertGreaterThanOrEqual(input.frame.minX, viewport.minX)
        XCTAssertLessThanOrEqual(input.frame.maxX, viewport.maxX + 1)
    }

    private func settle(_ app: XCUIApplication, landscape: Bool) {
        let expectation = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in
            let frame = app.frame
            let web = app.webViews.firstMatch.frame
            return (frame.width > frame.height) == landscape
                && web.width > frame.width * 0.85
                && web.minX >= -1 && web.minY >= -1
                && web.maxX <= frame.width + 1 && web.maxY <= frame.height + 1
        }, object: app)
        XCTAssertEqual(XCTWaiter.wait(for: [expectation], timeout: 10), .completed, "Wait for actual native viewport to settle")
        let before = app.webViews.firstMatch.frame
        RunLoop.current.run(until: Date().addingTimeInterval(0.6))
        XCTAssertEqual(app.webViews.firstMatch.frame, before, "Capture only a stable viewport")
    }

    private func attach(_ app: XCUIApplication, _ name: String) {
        let screenshot = XCUIScreen.main.screenshot()
        print("N97_CAPTURE \(name) pixels=\(screenshot.image.size) orientation=\(screenshot.image.imageOrientation.rawValue)")
        let evidence = XCTAttachment(screenshot: screenshot)
        evidence.name = name
        evidence.lifetime = .keepAlways
        add(evidence)
    }
}

