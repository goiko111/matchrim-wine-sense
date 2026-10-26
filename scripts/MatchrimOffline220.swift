import Foundation
import XCTest

final class MatchrimOffline220Tests: XCTestCase {
    @MainActor func testNativeMasterCatalogue259() throws {
        continueAfterFailure = false
        let app = XCUIApplication(bundleIdentifier: "wine.matchrim.qa110offline220v1")
        app.terminate(); app.launch(); XCUIDevice.shared.orientation = .portrait
        defer { capture(app, "master259-end") }
        let skip = app.buttons["Saltar guía"].firstMatch
        if skip.waitForExistence(timeout: 2) && skip.isHittable { skip.tap() }
        XCTAssertTrue(app.buttons["Buscar vino o bodega"].waitForExistence(timeout: 15))
        try tap(app.links["Escanear"].firstMatch, app)
        try tap(app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Botellas")).firstMatch, app)
        let privacy = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "He leído el aviso de privacidad del escáner")).firstMatch
        if privacy.waitForExistence(timeout: 3) { try tap(privacy, app); try tap(app.buttons["Entiendo y continuar"].firstMatch, app) }
        try tap(app.switches["Una etiqueta"].firstMatch, app)
        try tap(app.buttons["QA220 cargar etiqueta local"].firstMatch, app)
        let correct = app.buttons["Corregir identificación"].firstMatch
        XCTAssertTrue(correct.waitForExistence(timeout: 45) || app.buttons["Revisar vinos"].firstMatch.exists)
        if !correct.exists { try tap(app.buttons["Revisar vinos"].firstMatch, app) }
        try tap(correct, app)
        try fill(app.textFields["Vino"].firstMatch, "La Migratoria", app)
        try fill(app.textFields["Bodega"].firstMatch, "Bodegas Frontonio", app)
        try fill(app.textFields["Añada (opcional)"].firstMatch, "2023", app)
        try tap(app.buttons["Aplicar corrección"].firstMatch, app)
        XCTAssertTrue(app.staticTexts["QA259 consultas locales: 0"].firstMatch.exists, "No automatic master lookup")
        let search = app.buttons["Buscar este vino en Winerim"].firstMatch
        try tap(search, app, activate: false)
        capture(app, "master259-before-explicit-search")
        try tap(search, app)
        let choose = app.buttons["Esta es mi referencia"].firstMatch
        XCTAssertTrue(choose.waitForExistence(timeout: 10))
        XCTAssertTrue(app.staticTexts["QA259 consultas locales: 2"].firstMatch.exists)
        try tap(choose, app, activate: false)
        capture(app, "master259-proposal-not-yet-confirmed")
        try tap(choose, app)
        XCTAssertFalse(choose.exists, "Only explicit choice applies the reference")
        let title = app.staticTexts["Vino encontrado; faltan datos para compararlo contigo"].firstMatch
        try tap(title, app, activate: false)
        capture(app, "master259-linked-no-invented-affinity")
        XCTAssertFalse(app.links["Ver ficha original Winerim"].firstMatch.exists, "Unlisted canonical ID must not become a fake public URL")
        try tap(app.buttons["Cerrar"].firstMatch, app)
        XCTAssertTrue(app.staticTexts["Sin calcular"].firstMatch.waitForExistence(timeout: 8))
        capture(app, "master259-batch-honest-gap")
        try tap(app.buttons["Revisar vinos"].firstMatch, app)
        try tap(app.buttons["Corregir identificación"].firstMatch, app)
        try fill(app.textFields["Añada (opcional)"].firstMatch, "2024", app)
        try tap(app.buttons["Aplicar corrección"].firstMatch, app)
        try tap(app.buttons["Buscar este vino en Winerim"].firstMatch, app, activate: false)
        XCTAssertFalse(title.exists, "Changing harvest invalidates the linked reference")
        XCTAssertTrue(app.staticTexts["QA259 consultas locales: 2"].firstMatch.exists, "Correction must not retry lookup")
        capture(app, "master259-vintage-edit-invalidates-link")
    }

    @MainActor func testNativeGalleryPickerCancellation() throws {
        continueAfterFailure = false
        let app = XCUIApplication(bundleIdentifier: "wine.matchrim.qa110offline220v1")
        app.terminate(); app.launch(); XCUIDevice.shared.orientation = .portrait
        defer { capture(app, "gallery252-end") }
        let skip = app.buttons["Saltar guía"].firstMatch
        if skip.waitForExistence(timeout: 2) && skip.isHittable { skip.tap() }
        XCTAssertTrue(app.buttons["Buscar vino o bodega"].waitForExistence(timeout: 15))
        try tap(app.links["Escanear"].firstMatch, app)
        try tap(app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Botellas")).firstMatch, app)
        let checkbox = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "He leído el aviso de privacidad del escáner")).firstMatch
        if checkbox.waitForExistence(timeout: 3) {
            try tap(checkbox, app); try tap(app.buttons["Entiendo y continuar"].firstMatch, app)
        }
        try tap(app.switches["Una etiqueta"].firstMatch, app)
        for attempt in 1...2 {
            try tap(app.buttons["Elegir de galería"].firstMatch, app)
            capture(app, "gallery252-native-source-menu-\(attempt)")
            let library = app.buttons["Photo Library"].firstMatch
            XCTAssertTrue(library.waitForExistence(timeout: 8) && library.isHittable)
            // This is the observed42pt system menu item, not an app touch target.
            library.tap()
            let cancel = app.buttons.matching(NSPredicate(format: "label IN %@", ["Cancel", "Cancelar"])).firstMatch
            XCTAssertTrue(cancel.waitForExistence(timeout: 8), "Inspect real picker AX if the native cancellation label differs")
            XCTAssertTrue(cancel.isHittable)
            capture(app, "gallery252-photos-picker-open-\(attempt)")
            cancel.tap()
            XCTAssertTrue(app.buttons["Elegir de galería"].firstMatch.waitForExistence(timeout: 8))
            XCTAssertTrue(app.staticTexts["Fotografía una etiqueta"].firstMatch.exists)
            XCTAssertFalse(app.buttons["Revisar vinos"].firstMatch.exists, "Cancelling must not create an analysis or result")
            capture(app, "gallery252-cancelled-no-selection-\(attempt)")
        }
    }

    @MainActor func testRetainedQuizResultActions() throws {
        continueAfterFailure = false
        let app = XCUIApplication(bundleIdentifier: "wine.matchrim.qa110offline220v1")
        app.terminate(); app.launch(); XCUIDevice.shared.orientation = .portrait
        defer { capture(app, "result248-end") }
        XCTAssertTrue(app.buttons["Mis gustos"].waitForExistence(timeout: 15), "Use only a retained, actually completed own QA quiz")
        try tap(app.buttons["Mis gustos"].firstMatch, app)
        try tap(app.buttons["Escanear un vino"].firstMatch, app)
        XCTAssertTrue(app.staticTexts["Etiqueta de vino"].firstMatch.waitForExistence(timeout: 10))
        XCTAssertTrue(app.staticTexts["Antes de analizar una imagen"].firstMatch.exists, "Opening a command must not acknowledge privacy automatically")
        capture(app, "result248-scan-destination-privacy-unaccepted")
        try tap(app.links["Inicio"].firstMatch, app)
        try tap(app.buttons["Mis gustos"].firstMatch, app)
        try tap(app.buttons["Elegir vino para mi comida"].firstMatch, app)
        XCTAssertTrue(app.staticTexts["En el restaurante"].firstMatch.waitForExistence(timeout: 10))
        XCTAssertTrue(app.staticTexts["Antes de analizar una imagen"].firstMatch.exists)
        capture(app, "result248-restaurant-destination-privacy-unaccepted")
        try tap(app.links["Inicio"].firstMatch, app)
        try tap(app.buttons["Mis gustos"].firstMatch, app)
        XCTAssertFalse(app.staticTexts["Tu código Matchrim"].firstMatch.exists, "Passport must remain secondary and collapsed")
        let disclosure = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Mi código y compartir")).firstMatch
        try tap(disclosure, app)
        XCTAssertTrue(app.staticTexts["Tu código Matchrim"].firstMatch.waitForExistence(timeout: 8))
        let qr = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Ver mi QR")).firstMatch
        try tap(qr, app)
        let image = app.images.matching(NSPredicate(format: "label BEGINSWITH %@", "QR del pasaporte Matchrim ")).firstMatch
        try tap(image, app, activate: false)
        capture(app, "result248-local-qr-no-share-or-copy")
        try tap(app.links["Inicio"].firstMatch, app)
        try tap(app.buttons["Mis gustos"].firstMatch, app)
        let restart = app.buttons["Repetir el test"].firstMatch
        try tap(restart, app, activate: false)
        capture(app, "result248-restart-control-tail")
        try tap(restart, app)
        XCTAssertTrue(app.buttons["Comenzar el test"].firstMatch.waitForExistence(timeout: 10))
        try tap(app.links["Inicio"].firstMatch, app)
        XCTAssertTrue(app.buttons["Conocer mis gustos"].firstMatch.waitForExistence(timeout: 10))
        XCTAssertFalse(app.buttons["Mis gustos"].firstMatch.exists)
        app.terminate(); app.launch()
        XCTAssertTrue(app.buttons["Conocer mis gustos"].firstMatch.waitForExistence(timeout: 15))
        capture(app, "result248-restart-remains-reset-after-relaunch")
    }

    @MainActor func testAnonymousQuizAndHome() throws {
        continueAfterFailure = false
        let app = XCUIApplication(bundleIdentifier: "wine.matchrim.qa110offline220v1")
        app.terminate(); app.launch(); XCUIDevice.shared.orientation = .portrait
        defer { capture(app, "quiz225-end") }
        let skip = app.buttons["Saltar guía"].firstMatch
        if skip.waitForExistence(timeout: 2) && skip.isHittable { skip.tap() }
        XCTAssertTrue(app.buttons["Buscar vino o bodega"].waitForExistence(timeout: 15))
        capture(app, "quiz225-home-before")
        try tap(app.buttons["Conocer mis gustos"].firstMatch, app)
        try tap(app.buttons["Comenzar el test"].firstMatch, app)
        for index in 0..<20 {
            try assertQuizQuestion(index + 1, app)
            let label = ["Me gusta", "Me da igual", "No me gusta"][index % 3]
            let answer = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", label)).firstMatch
            XCTAssertTrue(answer.waitForExistence(timeout: 8))
            for _ in 0..<8 {
                if answer.isHittable && answer.frame.minY >= 0 && answer.frame.maxY <= app.frame.height { break }
                swipeContent(app)
            }
            if !answer.isHittable { capture(app, "quiz240-answer-\(index + 1)-unreachable") }
            XCTAssertTrue(answer.isHittable)
            XCTAssertGreaterThanOrEqual(answer.frame.minY, 0)
            XCTAssertLessThanOrEqual(answer.frame.maxY, app.frame.height)
            answer.tap()
            if index == 0 || index == 19 { capture(app, "quiz225-question-\(index + 1)") }
            try tap(app.buttons[index == 19 ? "Ver mi perfil" : "Siguiente"].firstMatch, app)
        }
        XCTAssertTrue(app.staticTexts["Tu perfil"].firstMatch.waitForExistence(timeout: 10))
        XCTAssertTrue(app.staticTexts["Tus preferencias"].firstMatch.waitForExistence(timeout: 8))
        for label in ["Cuerpo", "Frescura", "Dulzor", "Taninos", "Fruta"] {
            XCTAssertTrue(app.staticTexts[label].firstMatch.exists)
        }
        let resultTitle = app.staticTexts["Tu perfil"].firstMatch
        XCTAssertGreaterThanOrEqual(resultTitle.frame.minY, 0, "Results must not inherit the last question's scroll offset")
        XCTAssertLessThanOrEqual(resultTitle.frame.maxY, app.frame.height)
        capture(app, "quiz240-results-initial")
        if app.staticTexts["Cuerpo"].firstMatch.frame.height > 35 {
            for (label, value) in [("Cuerpo", "Ligero"), ("Frescura", "Equilibrada"), ("Dulzor", "Un toque dulce"), ("Taninos", "Suaves"), ("Fruta", "Presente")] {
                try tap(app.staticTexts[label].firstMatch, app, activate: false)
                try tap(app.staticTexts[value].firstMatch, app, activate: false)
                capture(app, "quiz242-preference-\(label)")
            }
        }
        try tap(app.buttons["Escanear un vino"].firstMatch, app, activate: false)
        capture(app, "quiz225-results")
        try tap(app.links["Inicio"].firstMatch, app)
        XCTAssertTrue(app.buttons["Mis gustos"].firstMatch.waitForExistence(timeout: 10))
        XCTAssertFalse(app.buttons["Conocer mis gustos"].firstMatch.exists)
        capture(app, "quiz225-home-local-profile")
        app.terminate(); app.launch()
        XCTAssertTrue(app.buttons["Buscar vino o bodega"].waitForExistence(timeout: 15))
        XCTAssertTrue(app.buttons["Mis gustos"].firstMatch.waitForExistence(timeout: 10))
        capture(app, "quiz225-home-reopened-local-profile")
        try tap(app.buttons["Mis gustos"].firstMatch, app)
        XCTAssertTrue(app.staticTexts["Tu perfil"].firstMatch.waitForExistence(timeout: 10), "Anonymous local tastes must reopen without requiring account sign-in")
        capture(app, "quiz245-local-tastes-reopened-without-account")
    }

    @MainActor private func assertQuizQuestion(_ number: Int, _ app: XCUIApplication) throws {
        // WKWebView may expose the interpolated counter as four text nodes.
        let prefix = app.staticTexts["Pregunta"].firstMatch
        let combined = app.staticTexts["Pregunta \(number) de 20"].firstMatch
        for _ in 0..<40 {
            if combined.exists && combined.frame.minY >= 0 && combined.frame.maxY <= app.frame.height { return }
            if prefix.exists {
                let start = prefix.frame
                let current = app.staticTexts.matching(NSPredicate(format: "label == %@", String(number)))
                    .allElementsBoundByIndex.first { element in
                        abs(element.frame.minY - start.minY) < 3
                            && abs(element.frame.minX - start.maxX) < 6
                    }
                if let current {
                    let totals = app.staticTexts.matching(NSPredicate(format: "label == %@", "20")).allElementsBoundByIndex
                    let total = totals.contains { element in
                        abs(element.frame.minY - start.minY) < 3 && element.frame.minX > current.frame.maxX + 8
                    }
                    if total { return }
                }
            }
            Thread.sleep(forTimeInterval: 0.2)
        }
        capture(app, "quiz225-counter-\(number)-unresolved")
        XCTFail("Expected visible quiz counter \(number) of20, combined or aligned WK text nodes")
        throw NSError(domain: "MatchrimQuizCounter", code: number)
    }

    @MainActor func testMaxDiscardVisualCoverage() throws {
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
        try fill(app.textFields["Vino"].firstMatch, "Control visual QA223", app)
        let discard = app.buttons["Descartar cambios"].firstMatch
        try tap(discard, app, activate: false)
        capture(app, "max-discard-visible-before-activation-review-glyphs")
        try tap(discard, app)
        XCTAssertFalse(app.staticTexts["Cambios sin aplicar"].exists)
        try tap(app.buttons["Cerrar"].firstMatch, app)
        capture(app, "max-discard-return-no-save")
    }

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
    @MainActor private func tap(_ element: XCUIElement, _ app: XCUIApplication, activate: Bool = true) throws {
        XCTAssertTrue(element.waitForExistence(timeout: 10))
        // MAX content can place the correction over 2,000pt below the viewport.
        for _ in 0..<24 {
            let body = app.otherElements.matching(NSPredicate(format: "label BEGINSWITH %@", "Contenido de la región ")).firstMatch
            let clippedControl = element.elementType == .textField || ["Aplicar corrección", "Descartar cambios", "Corregir identificación"].contains(element.label)
            let frame = element.frame
            let fits = !body.exists || !clippedControl || (frame.minY >= body.frame.minY && frame.maxY <= body.frame.maxY)
            if element.isHittable && fits && frame.minY >= 0 && frame.maxY <= contentBottom(app, for: element) { break }
            if body.exists && body.frame.height > 60 {
                // Vaul skips the scrollable target itself in getScrollParent;
                // start on its content, not its padding, without a text long-press.
                let downward = frame.minY < body.frame.minY
                let missing = downward ? body.frame.minY - frame.minY + 8 : frame.maxY - body.frame.maxY + 8
                let fraction = min(0.55, max(18, missing) / body.frame.height)
                let start = downward ? 0.2 : 0.8
                let from = body.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: start))
                let to = body.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: start + (downward ? fraction : -fraction)))
                from.press(forDuration: 0.01, thenDragTo: to, withVelocity: .slow, thenHoldForDuration: 0.2)
            }
            else { swipeContent(app) }
        }
        XCTAssertTrue(element.isHittable, element.debugDescription)
        XCTAssertGreaterThanOrEqual(element.frame.minY, 0, "Control is above the viewport")
        XCTAssertLessThanOrEqual(element.frame.maxY, contentBottom(app, for: element) + 1, "Control is covered by the fixed tab bar")
        let body = app.otherElements.matching(NSPredicate(format: "label BEGINSWITH %@", "Contenido de la región ")).firstMatch
        if body.exists && (element.elementType == .textField || ["Aplicar corrección", "Descartar cambios", "Corregir identificación"].contains(element.label)) {
            XCTAssertGreaterThanOrEqual(element.frame.minY, body.frame.minY - 1, "Control above visible sheet content")
            XCTAssertLessThanOrEqual(element.frame.maxY, body.frame.maxY + 1, "Control hidden behind the fixed footer")
        }
        XCTAssertGreaterThanOrEqual(element.frame.height, 43)
        XCTAssertGreaterThanOrEqual(element.frame.width, 43)
        if activate { element.tap() }
    }
    @MainActor private func contentBottom(_ app: XCUIApplication, for element: XCUIElement) -> CGFloat {
        let navigation = app.otherElements.matching(NSPredicate(format: "label BEGINSWITH %@", "Navegación principal")).firstMatch
        let home = app.links["Inicio"].firstMatch
        if navigation.exists && home.exists && home.isHittable {
            if element.elementType == .link && navigation.frame.contains(element.frame) { return app.frame.maxY }
            return navigation.frame.minY
        }
        return app.frame.maxY
    }
    @MainActor private func swipeContent(_ app: XCUIApplication) {
        // AX main can include offscreen content. Anchor to the actual viewport,
        // otherwise MAX pages can turn a content drag into a system-edge gesture.
        let from = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.65))
        let to = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.25))
        from.press(forDuration: 0.01, thenDragTo: to, withVelocity: .slow, thenHoldForDuration: 0.2)
    }
    @MainActor private func capture(_ app: XCUIApplication, _ name: String) {
        let picture = XCTAttachment(screenshot: XCUIScreen.main.screenshot()); picture.name = name; picture.lifetime = .keepAlways; add(picture)
        let tree = XCTAttachment(string: app.debugDescription); tree.name = name + "-AX"; tree.lifetime = .keepAlways; add(tree)
    }
}
