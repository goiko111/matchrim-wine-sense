// Isolated 440x956 QA simulator at Large text. Not a physical-device or full VoiceOver certificate.
import XCTest

final class Native97AnonymousAccessibilityTests: XCTestCase {
    @MainActor func testHomeScanAndAuthWithoutSubmission() throws {
        continueAfterFailure = false
        let app = XCUIApplication(bundleIdentifier: "wine.matchrim.qa97review")
        app.terminate()
        app.launch()
        XCUIDevice.shared.orientation = .portrait
        let bottles = app.buttons.matching(NSPredicate(format: "label CONTAINS[cd] %@", "Botellas")).firstMatch
        XCTAssertTrue(bottles.waitForExistence(timeout: 10))
        try audit(app, "01-home")
        bottles.tap()
        XCTAssertTrue(app.staticTexts["Etiqueta de vino"].waitForExistence(timeout: 8))
        try audit(app, "02-label-entry")
        let policy = app.links["política de privacidad"].firstMatch
        XCTAssertTrue(policy.exists)
        print("N97_INLINE_POLICY_TEXT_FRAME \(policy.frame)")
        policy.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 1.4)).tap()
        XCTAssertTrue(app.staticTexts["Politica de privacidad"].waitForExistence(timeout: 8))
        let returnHome = app.links["Volver a Matchrim"].firstMatch
        XCTAssertTrue(returnHome.isHittable)
        XCTAssertGreaterThanOrEqual(returnHome.frame.minY, 62, "Back link must clear the tested iPhone's safe top")
        attach("02-policy-safe-area")
        returnHome.tap()
        XCTAssertTrue(bottles.waitForExistence(timeout: 8))
        bottles.tap()
        XCTAssertTrue(app.staticTexts["Etiqueta de vino"].waitForExistence(timeout: 8))
        let back = app.buttons["Volver a tipos de escaneo"].firstMatch
        XCTAssertTrue(back.waitForExistence(timeout: 5))
        back.tap()
        try audit(app, "03-scan-hub")
        let profile = app.links["Perfil"].firstMatch
        XCTAssertTrue(profile.waitForExistence(timeout: 5))
        profile.tap()
        XCTAssertTrue(app.textFields["Email"].firstMatch.waitForExistence(timeout: 8))
        try audit(app, "04-auth")
        print("N97_ANONYMOUS_AUDIT_COMPLETED_NO_SUBMISSION_NO_IMAGE_ANALYSIS")
    }

    @MainActor private func audit(_ app: XCUIApplication, _ name: String) throws {
        attach(name)
        // Apple's WKWebView hit audit flagged the inert home paragraph as a control.
        // Measure buttons/main-nav targets; exercise the inline policy padding separately.
        // Retain the unfiltered R1 failure and do not claim a full VoiceOver pass.
        let navigation = Set(["Inicio", "aiRIM", "Escanear", "Bodega", "Perfil"])
        let controls = app.buttons.allElementsBoundByIndex + app.links.allElementsBoundByIndex.filter { navigation.contains($0.label) }
        let visible = controls.filter { $0.isHittable }
        XCTAssertFalse(visible.isEmpty)
        for control in visible {
            XCTAssertGreaterThanOrEqual(control.frame.width, 43.5, control.label)
            XCTAssertGreaterThanOrEqual(control.frame.height, 43.5, control.label)
        }
        print("N97_NATIVE_INTERACTIVE_HIT_TARGETS \(name) count=\(visible.count)")
        try app.performAccessibilityAudit(for: [.contrast, .sufficientElementDescription, .textClipped, .trait]) { issue in
            let evidence = XCTAttachment(string: String(describing: issue))
            evidence.name = name + "-accessibility-issue"
            evidence.lifetime = .keepAlways
            self.add(evidence)
            return false
        }
    }

    @MainActor private func attach(_ name: String) {
        let screen = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        screen.name = name
        screen.lifetime = .keepAlways
        add(screen)
    }
}

