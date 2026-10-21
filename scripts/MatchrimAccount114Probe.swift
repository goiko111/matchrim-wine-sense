import Foundation
import XCTest

final class MatchrimAccount114Tests: XCTestCase {
    private enum Stop: Error { case failed(String) }
    private var failureStage = "PRE_SUBMIT_UI"
    private var authSubmissions = 0

    @MainActor func testExistingQAAccountReadOnly114() throws {
        continueAfterFailure = false
        #if targetEnvironment(simulator)
        let env = ProcessInfo.processInfo.environment
        guard let email = env["MATCHRIM114_EMAIL"], email == "info@winerim.com",
              let password = env["MATCHRIM114_PASSWORD"], password.count > 12,
              password.rangeOfCharacter(from: .controlCharacters) == nil,
              let reservation = env["MATCHRIM114_RESERVATION_ID"], UUID(uuidString: reservation) != nil else {
            emit("ACCOUNT114_FAILURE_PRIVATE_ENVIRONMENT")
            XCTFail("Private QA test environment is unavailable; do not guess credentials")
            return
        }
        let app = XCUIApplication(bundleIdentifier: "wine.matchrim.qa99review")
        XCUIDevice.shared.orientation = .portrait
        app.terminate(); app.launch()
        let entry = app.buttons["Entrar en Matchrim"].firstMatch
        try require(entry.waitForExistence(timeout: 15), app, "Anonymous starting state required; no logout or account replacement")
        try reveal(entry, app); entry.tap()
        let secure = app.secureTextFields["Contrase\u{00f1}a"].firstMatch
        try require(secure.waitForExistence(timeout: 10), app, "Expected secure auth field")
        try require(app.textFields.count == 1, app, "Ambiguous auth email control")
        let field = app.textFields.firstMatch
        try reveal(field, app); field.tap()
        let old = field.value as? String ?? ""
        if !old.isEmpty && old != field.placeholderValue {
            field.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: old.count))
        }
        field.typeText(email)
        let previousPassword = secure.value as? String ?? ""
        try require(previousPassword.isEmpty || previousPassword == secure.placeholderValue, app,
                    "Password control must be empty; do not append to an autofilled credential")
        try reveal(secure, app); secure.tap(); secure.typeText(password)
        try require(field.value as? String == email, app, "Email input did not retain exact QA owner")
        let submits = app.buttons.matching(NSPredicate(format: "label == %@", "Iniciar Sesi\u{00f3}n"))
            .allElementsBoundByIndex.filter { $0.frame.minY >= secure.frame.maxY - 1 }
        try require(submits.count == 1, app, "Cannot identify the single form submit below password")
        try reveal(submits[0], app)
        try require(submits[0].isEnabled && authSubmissions == 0, app, "One enabled submit required")
        // The host has already durably consumed the budget, even if stdout is lost.
        authSubmissions += 1
        failureStage = "AUTH_OUTCOME_UNKNOWN"
        emit("ACCOUNT114_AUTH_SUBMITTED_ONCE")
        submits[0].tap()
        let profile = app.staticTexts["Mi Perfil"].firstMatch
        let deadline = Date().addingTimeInterval(30)
        while !profile.exists && Date() < deadline {
            let rejected = app.staticTexts["Credenciales incorrectas. Verifica tu email y contrase\u{00f1}a."].firstMatch.exists
                || app.staticTexts["Debes confirmar tu email antes de iniciar sesi\u{00f3}n. Revisa tu bandeja de entrada."].firstMatch.exists
            if rejected {
                failureStage = "AUTH_REJECTED"
                try require(false, app, "Authentication rejected; no retry, reset or account replacement")
            }
            RunLoop.current.run(until: Date().addingTimeInterval(0.25))
        }
        try require(profile.exists, app,
                    "QA sign-in did not reach profile; no retry or reset allowed")
        failureStage = "POST_LOGIN_ASSERTION"
        let sensoryTab = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Perfil Sensorial")).firstMatch
        try require(sensoryTab.waitForExistence(timeout: 15)
                    && !app.staticTexts["No hemos podido cargar tu test"].firstMatch.exists, app,
                    "Profile title alone is not a loaded sensory profile")
        audit(app, "01-real-qa-profile")
        let showsEmail = app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", email)).firstMatch.exists
        attach("Current account email visible: \(showsEmail). Missing identity presentation is a UX finding, not a second login authorization.", "02-account-visibility")
        let cellar = app.links["Bodega"].firstMatch
        try require(cellar.waitForExistence(timeout: 10), app, "Bodega navigation missing")
        try reveal(cellar, app); cellar.tap()
        let flor = app.buttons.matching(NSPredicate(format: "label BEGINSWITH[cd] %@", "Ver Flor de Muga")).firstMatch
        let gitana = app.buttons.matching(NSPredicate(format: "label BEGINSWITH[cd] %@", "Ver Manzanilla La Gitana")).firstMatch
        try require(flor.waitForExistence(timeout: 25) && gitana.exists, app, "Expected both existing QA collection wines; do not insert replacements")
        audit(app, "03-real-qa-cellar-list")
        try reveal(flor, app); flor.tap()
        try require(app.staticTexts["Ya sabes que te gusta"].firstMatch.waitForExistence(timeout: 10), app,
                    "Loved wine must prioritize the saved tasting over the predicted score")
        audit(app, "04-loved-wine-rating-first")
        let style = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Ver afinidad por estilo")).firstMatch
        try reveal(style, app); style.tap()
        try require(app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Al guardar")).firstMatch.waitForExistence(timeout: 10), app,
                    "Saved initial affinity must remain available")
        audit(app, "05-real-initial-current-affinity")
        let close = app.buttons["Cerrar vino"].firstMatch
        try reveal(close, app); close.tap()
        try reveal(gitana, app); gitana.tap()
        try require(app.staticTexts["Ya sabes que no te gusta"].firstMatch.waitForExistence(timeout: 10), app,
                    "Rejected wine must not lead with a positive prediction")
        audit(app, "06-rejected-wine-rating-first")
        try reveal(app.buttons["Cerrar vino"].firstMatch, app); app.buttons["Cerrar vino"].firstMatch.tap()
        attach("One existing QA account authenticated through real native UI. Read-only profile/collection/detail; no new wine, rating, quiz, stock, model call or logout. Session left only in isolated QA bundle.", "07-scope")
        try require(authSubmissions == 1, app, "Exactly one conservative UI submission required")
        emit("ACCOUNT114_REAL_NATIVE_READONLY_FLOW_COMPLETE_NO_WINE_MUTATIONS")
        #else
        emit("ACCOUNT114_FAILURE_PRIVATE_ENVIRONMENT")
        XCTFail("Dedicated simulator only")
        #endif
    }

    @MainActor private func reveal(_ element: XCUIElement, _ app: XCUIApplication) throws {
        if element.exists && element.isHittable { return }
        let surface = app.webViews.firstMatch
        for direction in 0..<2 {
            for _ in 0..<5 {
                if element.exists && element.isHittable { return }
                if direction == 0 { surface.swipeUp() } else { surface.swipeDown() }
            }
        }
        try require(element.exists && element.isHittable, app, "Expected named control is not reachable")
    }

    @MainActor private func require(_ condition: Bool, _ app: XCUIApplication, _ message: String) throws {
        guard condition else {
            emit("ACCOUNT114_FAILURE_" + failureStage)
            audit(app, "FAIL"); XCTFail(message); throw Stop.failed(message)
        }
    }

    @MainActor private func audit(_ app: XCUIApplication, _ name: String) {
        let shot = XCTAttachment(screenshot: XCUIScreen.main.screenshot()); shot.name = "account114-" + name
        shot.lifetime = .keepAlways; add(shot)
        attach(app.debugDescription, name + "-ax")
    }

    private func attach(_ value: String, _ name: String) {
        let item = XCTAttachment(string: value); item.name = "account114-" + name; item.lifetime = .keepAlways; add(item)
    }

    private func emit(_ marker: String) {
        FileHandle.standardOutput.write(Data((marker + "\n").utf8))
    }
}
