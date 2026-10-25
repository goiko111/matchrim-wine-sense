import Foundation
import XCTest

final class MatchrimOffline220Tests: XCTestCase {
    @MainActor func testLocalReanalysisRequiresReview() throws {
        continueAfterFailure = false
        let app = XCUIApplication(bundleIdentifier: "wine.matchrim.qa110offline220v1")
        app.terminate(); app.launch(); XCUIDevice.shared.orientation = .portrait
        let skip = app.buttons["Saltar guía"].firstMatch
        if skip.waitForExistence(timeout: 2) && skip.isHittable { skip.tap() }
        XCTAssertTrue(app.buttons["Buscar vino o bodega"].waitForExistence(timeout: 15))
        try tap(app.links["Escanear"].firstMatch, app)
        try tap(app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Botellas")).firstMatch, app)
        let checkbox = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "He leído el aviso de privacidad del escáner")).firstMatch
        if checkbox.waitForExistence(timeout: 3) { try tap(checkbox, app); try tap(app.buttons["Entiendo y continuar"].firstMatch, app) }
        try tap(app.switches["Una etiqueta"].firstMatch, app)
        try tap(app.buttons["QA220 cargar etiqueta local"].firstMatch, app)
        try tap(app.buttons["Corregir identificación"].firstMatch, app)
        try fill(app.textFields["Vino"].firstMatch, "Reescaneo QA220", app)
        try tap(app.buttons["Aplicar corrección"].firstMatch, app)
        let manual = app.otherElements.matching(NSPredicate(format: "label == %@", "Reescaneo QA220")).firstMatch
        XCTAssertTrue(manual.waitForExistence(timeout: 8))
        capture(app, "rescan-before-local-reading")
        try tap(app.buttons["Reanalizar"].firstMatch, app)
        XCTAssertTrue(app.buttons["Corregir identificación"].firstMatch.waitForExistence(timeout: 45))
        XCTAssertFalse(manual.exists, "New local OCR must not retain an old manual identity")
        XCTAssertTrue(app.staticTexts["Referencia propuesta"].firstMatch.exists)
        capture(app, "rescan-after-uncertain-no-invented-affinity")
        try tap(app.buttons["Cerrar"].firstMatch, app)
        XCTAssertFalse(app.buttons["Confirmar 1 referencia"].firstMatch.exists, "Reanalysis must not automatically reconfirm the old reference")
        capture(app, "rescan-still-requires-review")
    }

    @MainActor func testNativeCloseAndHubReturn() throws {
        continueAfterFailure = false
        let app = XCUIApplication(bundleIdentifier: "wine.matchrim.qa110offline220v1")
        app.terminate(); app.launch(); XCUIDevice.shared.orientation = .portrait
        let skip = app.buttons["Saltar guía"].firstMatch
        if skip.waitForExistence(timeout: 2) && skip.isHittable { skip.tap() }
        XCTAssertTrue(app.buttons["Buscar vino o bodega"].waitForExistence(timeout: 15))
        try tap(app.links["Escanear"].firstMatch, app)
        try tap(app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Botellas")).firstMatch, app)
        let checkbox = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "He leído el aviso de privacidad del escáner")).firstMatch
        if checkbox.waitForExistence(timeout: 3) { try tap(checkbox, app); try tap(app.buttons["Entiendo y continuar"].firstMatch, app) }
        try tap(app.switches["Una etiqueta"].firstMatch, app)
        try tap(app.buttons["QA220 cargar etiqueta local"].firstMatch, app)
        let correct = app.buttons["Corregir identificación"].firstMatch
        XCTAssertTrue(correct.waitForExistence(timeout: 45))
        capture(app, "close-control-before")
        try tap(app.buttons["Cerrar"].firstMatch, app)
        XCTAssertTrue(app.buttons["Revisar vinos"].firstMatch.waitForExistence(timeout: 8))
        try tap(app.buttons["Volver a tipos de escaneo"].firstMatch, app)
        XCTAssertTrue(app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Botellas")).firstMatch.waitForExistence(timeout: 8))
        capture(app, "close-return-hub")
    }

    @MainActor func testAnonymousBodegaBack() throws {
        continueAfterFailure = false
        let app = XCUIApplication(bundleIdentifier: "wine.matchrim.qa110offline220v1")
        app.terminate(); app.launch()
        XCUIDevice.shared.orientation = .portrait
        let skip = app.buttons["Saltar guía"].firstMatch
        if skip.waitForExistence(timeout: 2) && skip.isHittable { skip.tap() }
        XCTAssertTrue(app.buttons["Buscar vino o bodega"].waitForExistence(timeout: 15))
        try tap(app.links["Bodega"].firstMatch, app)
        XCTAssertTrue(app.secureTextFields["Contraseña"].firstMatch.waitForExistence(timeout: 10))
        capture(app, "bodega-anonymous-auth-boundary")
        try tap(app.buttons["Volver"].firstMatch, app)
        XCTAssertTrue(app.buttons["Buscar vino o bodega"].waitForExistence(timeout: 10), "Back from anonymous Bodega auth must not redirect to the same login again")
        capture(app, "bodega-back-home")
    }

    @MainActor func testNativeOfflineCorrectionAndAuthBoundary() throws {
        continueAfterFailure = false
        let app = XCUIApplication(bundleIdentifier: "wine.matchrim.qa110offline220v1")
        app.terminate(); app.launch()
        XCUIDevice.shared.orientation = .portrait
        defer { capture(app, "99-end") }
        let skip = app.buttons["Saltar guía"].firstMatch
        if skip.waitForExistence(timeout: 2) && skip.isHittable { skip.tap() }
        XCTAssertTrue(app.buttons["Buscar vino o bodega"].waitForExistence(timeout: 15))
        capture(app, "01-home")
        try tap(app.links["Escanear"].firstMatch, app)
        try tap(app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Botellas")).firstMatch, app)
        let checkbox = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "He leído el aviso de privacidad del escáner")).firstMatch
        if checkbox.waitForExistence(timeout: 3) {
            try tap(checkbox, app)
            try tap(app.buttons["Entiendo y continuar"].firstMatch, app)
        }
        let local = app.switches["Una etiqueta"].firstMatch
        XCTAssertTrue(local.waitForExistence(timeout: 10), "Never fall back to cloud")
        try tap(local, app)
        XCTAssertTrue(app.staticTexts["Fotografía una etiqueta"].waitForExistence(timeout: 5))
        capture(app, "02-local-mode-resident-injection-not-gallery")
        try tap(app.buttons["QA220 cargar etiqueta local"].firstMatch, app)
        let review = app.buttons["Revisar vinos"].firstMatch
        let correct = app.buttons["Corregir identificación"].firstMatch
        XCTAssertTrue(correct.waitForExistence(timeout: 45) || review.exists, "Actual offline native OCR must finish; no model or catalogue fallback")
        capture(app, "03-native-ocr-result-catalogue-blocked")
        if !correct.exists { try tap(review, app) }
        try tap(correct, app)
        let name = app.textFields["Vino"].firstMatch
        XCTAssertTrue(name.waitForExistence(timeout: 8))
        capture(app, "04-editor-focus")
        try fill(name, "Control QA220", app)
        capture(app, "04b-name-draft-filled")
        try fill(app.textFields["Bodega"].firstMatch, "Productor QA220", app)
        try fill(app.textFields["Añada (opcional)"].firstMatch, "2023", app)
        capture(app, "05-year-keyboard")
        XCTAssertTrue(app.staticTexts["Cambios sin aplicar"].exists)
        try tap(app.buttons["Descartar cambios"].firstMatch, app)
        XCTAssertFalse(app.staticTexts["Cambios sin aplicar"].exists)
        try fill(app.textFields["Vino"].firstMatch, "Control QA220", app)
        try fill(app.textFields["Bodega"].firstMatch, "Productor QA220", app)
        try fill(app.textFields["Añada (opcional)"].firstMatch, "2023", app)
        try tap(app.buttons["Aplicar corrección"].firstMatch, app)
        XCTAssertTrue(app.otherElements.matching(NSPredicate(format: "label == %@", "Control QA220 · 2023")).firstMatch.waitForExistence(timeout: 8))
        XCTAssertFalse(app.staticTexts["Cambios sin aplicar"].exists)
        capture(app, "06-manual-correction-no-invented-score")
        try tap(app.buttons["Cerrar"].firstMatch, app)
        try tap(app.buttons["Revisar vinos"].firstMatch, app)
        XCTAssertTrue(app.otherElements.matching(NSPredicate(format: "label == %@", "Control QA220 · 2023")).firstMatch.waitForExistence(timeout: 8), "Correction must survive closing/reopening the current batch")
        capture(app, "07-correction-retained-current-batch")
        try tap(app.buttons["Cerrar"].firstMatch, app)
        try tap(app.buttons["Confirmar 1 referencia"].firstMatch, app)
        XCTAssertTrue(app.secureTextFields["Contraseña"].firstMatch.waitForExistence(timeout: 10), "Anonymous save must require authentication, never claim a remote save")
        capture(app, "08-save-auth-boundary-no-credentials")
    }

    @MainActor private func fill(_ field: XCUIElement, _ value: String, _ app: XCUIApplication) throws {
        try tap(field, app)
        let current = field.value as? String ?? ""
        if !current.isEmpty {
            // XCTest's installed iOS26 headers explicitly support this keyboard
            // modifier API; selection must not depend on the existing caret.
            field.typeKey("a", modifierFlags: .command)
        }
        field.typeText(value)
        XCTAssertEqual(field.value as? String, value)
    }
    @MainActor private func tap(_ element: XCUIElement, _ app: XCUIApplication) throws {
        XCTAssertTrue(element.waitForExistence(timeout: 10))
        // MAX content can place the correction over 2,000pt below the viewport.
        for _ in 0..<24 {
            let body = app.otherElements.matching(NSPredicate(format: "label BEGINSWITH %@", "Contenido de la región ")).firstMatch
            let clippedControl = element.elementType == .textField || ["Aplicar corrección", "Descartar cambios", "Corregir identificación"].contains(element.label)
            let frame = element.frame
            let fits = !body.exists || !clippedControl || (frame.minY >= body.frame.minY && frame.maxY <= body.frame.maxY)
            if element.isHittable && fits { break }
            if body.exists && body.frame.height > 60 {
                // Vaul skips the scrollable target itself in getScrollParent;
                // start on its content, not its padding, without a text long-press.
                let top = body.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.2))
                let bottom = body.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.8))
                if frame.minY < body.frame.minY { top.press(forDuration: 0.01, thenDragTo: bottom) }
                else { bottom.press(forDuration: 0.01, thenDragTo: top) }
            }
            else { app.swipeUp() }
        }
        XCTAssertTrue(element.isHittable, element.debugDescription)
        let body = app.otherElements.matching(NSPredicate(format: "label BEGINSWITH %@", "Contenido de la región ")).firstMatch
        if body.exists && (element.elementType == .textField || ["Aplicar corrección", "Descartar cambios", "Corregir identificación"].contains(element.label)) {
            XCTAssertGreaterThanOrEqual(element.frame.minY, body.frame.minY - 1, "Control above visible sheet content")
            XCTAssertLessThanOrEqual(element.frame.maxY, body.frame.maxY + 1, "Control hidden behind the fixed footer")
        }
        XCTAssertGreaterThanOrEqual(element.frame.height, 43)
        XCTAssertGreaterThanOrEqual(element.frame.width, 43)
        element.tap()
    }
    @MainActor private func capture(_ app: XCUIApplication, _ name: String) {
        let picture = XCTAttachment(screenshot: XCUIScreen.main.screenshot()); picture.name = name; picture.lifetime = .keepAlways; add(picture)
        let tree = XCTAttachment(string: app.debugDescription); tree.name = name + "-AX"; tree.lifetime = .keepAlways; add(tree)
    }
}
