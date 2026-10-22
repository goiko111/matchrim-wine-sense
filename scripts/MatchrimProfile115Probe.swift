import Foundation
import XCTest

final class MatchrimProfile115Tests: XCTestCase {
    private enum Stop: Error { case failed }

    @MainActor func testExistingQAProfileMaximumType115() throws {
        continueAfterFailure = false
        #if targetEnvironment(simulator)
        let app = XCUIApplication(bundleIdentifier: "wine.matchrim.qa99review")
        XCUIDevice.shared.orientation = .portrait
        app.launch()
        let profile = app.links["Perfil"].firstMatch
        try require(profile.waitForExistence(timeout: 20), app, "Existing authenticated bottom Perfil link required")
        try authenticated(app)
        try require(profile.isHittable, app, "Bottom Perfil link must be reachable")
        try insideVisibleBounds(profile, app, navigationControl: true)
        profile.tap()
        let email = app.otherElements.matching(NSPredicate(format: "label == %@", "Correo de tu cuenta: info@winerim.com")).firstMatch
        try require(email.waitForExistence(timeout: 20), app, "Literal existing QA email required; never authenticate here")
        try authenticated(app)
        let settings = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Ajustes de cuenta")).firstMatch
        try require(settings.waitForExistence(timeout: 5), app, "Account settings control missing")
        audit(app, "01-profile-maximum-type")
        try require(email.isHittable && settings.isHittable && settings.isEnabled, app, "Email and settings must be visible and reachable")
        try require(settings.frame.width >= 44 && settings.frame.height >= 44, app, "Settings target must be at least 44 points on both axes")
        try require(!email.frame.intersects(settings.frame), app, "Email collides with settings")
        try insideVisibleBounds(email, app)
        try insideVisibleBounds(settings, app)
        let sensory = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Perfil Sensorial")).firstMatch
        try require(sensory.waitForExistence(timeout: 15), app, "Sensory tab missing")
        try reveal(sensory, app)
        sensory.tap()
        let loaded = app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Tu perfil sensorial")).firstMatch
        try require(loaded.waitForExistence(timeout: 15), app, "Loaded sensory content required, not just Mi Perfil or a tab")
        try require(!app.staticTexts["No hemos podido cargar tu test"].firstMatch.exists, app, "Sensory profile load failed; no retry")
        try reveal(loaded, app)
        try insideVisibleBounds(loaded, app)
        try authenticated(app)
        audit(app, "02-loaded-sensory")
        attach("Existing QA account info@winerim.com only. Read-only Profile at host-selected maximum Dynamic Type. No authentication, account, wine, rating, quiz or stock writes; no provider/model starts. Frames are XCTest points. Status/navigation bounds checked when exposed; hidden iOS insets are not inferred.", "scope")
        emit("PROFILE115_EXISTING_QA_IDENTITY_VISIBLE")
        emit("PROFILE115_REAL_NATIVE_MAXIMUM_TYPE_PROFILE_COMPLETE")
        #else
        XCTFail("Dedicated simulator only")
        #endif
    }

    @MainActor private func authenticated(_ app: XCUIApplication) throws {
        try require(!app.buttons["Entrar en Matchrim"].firstMatch.exists
                    && !app.buttons["Iniciar Sesi\u{00f3}n"].firstMatch.exists
                    && app.secureTextFields.count == 0 && app.textFields.count == 0,
                    app, "Anonymous entry/auth form detected; stop without login")
    }

    @MainActor private func insideVisibleBounds(_ element: XCUIElement, _ app: XCUIApplication, navigationControl: Bool = false) throws {
        let frame = element.frame
        let window = app.windows.firstMatch.frame
        try require(!frame.isEmpty && window.contains(frame), app, "Visible element extends outside app window")
        let status = app.statusBars.firstMatch
        if status.exists && !status.frame.isEmpty {
            try require(frame.minY >= status.frame.maxY, app, "Element enters measurable top safe area")
        }
        let footer = app.links["Perfil"].firstMatch
        if footer.exists && footer.isHittable && !navigationControl {
            try require(frame.maxY <= footer.frame.minY, app, "Profile content enters bottom navigation band")
        }
        attach("\(element.label): \(frame); window: \(window); status: \(status.exists ? status.frame : .zero); footer: \(footer.exists ? footer.frame : .zero)", "geometry")
    }

    @MainActor private func reveal(_ element: XCUIElement, _ app: XCUIApplication) throws {
        for _ in 0..<5 {
            try authenticated(app)
            if element.exists && element.isHittable { return }
            app.webViews.firstMatch.swipeUp()
        }
        try require(element.exists && element.isHittable, app, "Sensory content not reachable")
    }

    @MainActor private func require(_ value: Bool, _ app: XCUIApplication, _ message: String) throws {
        guard value else {
            emit("PROFILE115_FAILURE")
            audit(app, "FAIL")
            XCTFail(message)
            throw Stop.failed
        }
    }

    @MainActor private func audit(_ app: XCUIApplication, _ name: String) {
        let shot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        shot.name = "profile115-" + name; shot.lifetime = .keepAlways; add(shot)
        attach(app.debugDescription, name + "-ax")
    }

    private func attach(_ value: String, _ name: String) {
        let item = XCTAttachment(string: value)
        item.name = "profile115-" + name; item.lifetime = .keepAlways; add(item)
    }

    private func emit(_ marker: String) {
        FileHandle.standardOutput.write(Data((marker + "\n").utf8))
    }
}
