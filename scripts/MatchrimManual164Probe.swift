import Foundation
import XCTest

// The host combines this with the retained161 helpers, selecting only this method.
// Manual input is explicit recovery after OCR, never evidence of automatic recognition.
final class MatchrimManual164Tests: MatchrimRescan161Tests {
    @MainActor func testExistingQAManualRecovery164() throws {
        continueAfterFailure = false
        let env = ProcessInfo.processInfo.environment
        try require(env["MATCHRIM161_INPUT_SHA256"] == "8d213ff13a2a9c79ce6131180afe7a599bcda88b94cecf1cf853d2c6658cc1f9"
            && UUID(uuidString: env["MATCHRIM161_RUN_ID"] ?? "") != nil,
            XCUIApplication(bundleIdentifier: "wine.matchrim.qa99review"), "Bound photo/run required")
        let app = XCUIApplication(bundleIdentifier: "wine.matchrim.qa99review")
        app.launch(); defer { audit(app, "manual164-final"); app.terminate() }
        try require(app.wait(for: .runningForeground, timeout: 15) && app.frame.height > app.frame.width, app, "Portrait foreground required")
        try tapUnique(app.links.matching(NSPredicate(format: "label == %@", "Perfil")), app)
        let owner = app.otherElements.matching(NSPredicate(format: "label == %@", "Correo de tu cuenta: info@winerim.com"))
        try require(owner.firstMatch.waitForExistence(timeout: 12) && owner.count == 1 && app.textFields.count == 0,
            app, "Existing QA session only; never authenticate")
        try genuine(app); audit(app, "manual164-owner"); emit("MANUAL164_OWNER")
        try tapUnique(app.links.matching(NSPredicate(format: "label == %@", "Escanear")), app)
        try tapUnique(app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Botellas")), app)
        let local = app.switches.matching(NSPredicate(format: "label == %@", "Una etiqueta"))
        try require(local.firstMatch.waitForExistence(timeout: 10) && local.count == 1
            && !app.staticTexts["Antes de analizar una imagen"].exists, app, "Previously acknowledged local mode required")
        if !selected(local.firstMatch) { try tap(local.firstMatch, app) }
        try require(selected(local.firstMatch), app, "Local mode only")
        try tapUnique(app.buttons.matching(NSPredicate(format: "label == %@", "Elegir de galer\u{00ed}a")), app)
        try photo(app)
        try require(app.buttons["Corregir identificaci\u{00f3}n"].waitForExistence(timeout: 40), app, "Local scan must finish")
        try genuine(app); audit(app, "manual164-after-real-local-reading"); emit("MANUAL164_REAL_LOCAL_READING")
        // No successful automatic identity is asserted. Literal manual input follows the visible UI.
        try tap(app.buttons["Ficha e identificaci\u{00f3}n"].firstMatch, app)
        try tapUnique(app.buttons.matching(NSPredicate(format: "label == %@", "Buscar otra referencia en Winerim")), app)
        let web = app.webViews.firstMatch
        let fields = web.textFields.matching(NSPredicate(format: "label == %@", "Nombre del vino o bodega"))
        try require(fields.firstMatch.waitForExistence(timeout: 8) && fields.count == 1, app, "Named manual catalogue field required")
        let field = fields.firstMatch
        try require((field.value as? String ?? "").isEmpty, app, "Unidentified sentinel must not prefill a manual search")
        try tap(field, app)
        field.typeText("Flor de Muga Blanco")
        try require(field.value as? String == "Flor de Muga Blanco", app, "Exact manual query required")
        audit(app, "manual164-explicit-query")
        try tapUnique(web.buttons.matching(NSPredicate(format: "label == %@", "Buscar")), app)
        let filters = web.popUpButtons.matching(NSPredicate(format: "label == %@", "Filtrar por a\u{00f1}ada"))
        let fallback = web.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Filtrar por a\u{00f1}ada"))
        try require(wait(25) { filters.count == 1 || fallback.count == 1 }, app, "Actual native vintage selector required")
        audit(app, "manual164-all-public-results")
        try tap(filters.count == 1 ? filters.firstMatch : fallback.firstMatch, app)
        let wheels = app.pickerWheels.allElementsBoundByIndex
        if wheels.count == 1 { wheels[0].adjust(toPickerWheelValue: "2022") }
        else {
            let choices = app.buttons.matching(NSPredicate(format: "label == %@", "2022"))
            try require(choices.count == 1, app, "Observed2022 native option required")
            try tap(choices.firstMatch, app)
        }
        let done = app.buttons.matching(NSPredicate(format: "label IN %@", ["Done", "OK", "Aceptar", "Listo"]))
            .allElementsBoundByIndex.filter { $0.isHittable }
        if done.count == 1 { try tap(done[0], app) }
        try require(wait(8) { web.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "tu a\u{00f1}ada se cambiar\u{00e1} a 2022")).count > 0 }, app, "Explicit vintage-change warning required")
        audit(app, "manual164-explicit-vintage"); emit("MANUAL164_EXPLICIT_VINTAGE")
        let confirm = web.buttons.matching(NSPredicate(format: "label == %@", "Esta es mi referencia"))
        try require(confirm.count >= 1 && confirm.count <= 3, app, "Bounded visible catalogue choices required")
        // Choice is manual, not an assertion of catalogue-ID equivalence between duplicates.
        try tap(confirm.firstMatch, app)
        let dialog = app.otherElements.matching(NSPredicate(format: "label == %@", "Flor de Muga Blanco \u{00b7} 2022, cuadro de di\u{00e1}logo de web"))
        try require(dialog.firstMatch.waitForExistence(timeout: 25) && dialog.count == 1, app, "Independent literal reference and2022 dialog required")
        let detail = dialog.firstMatch
        let title = detail.staticTexts["Tu valoraci\u{00f3}n: te encanta"]
        try require(title.waitForExistence(timeout: 25), app, "Previously saved love must remain primary after real fiche verification")
        try verdict(detail, app)
        let observedNames = Set(detail.staticTexts.matching(NSPredicate(format: "label == %@", "Flor de Muga Blanco")).allElementsBoundByIndex.map { $0.label })
        let producerLabels = detail.staticTexts.matching(NSPredicate(format: "label IN %@", ["Muga", "Muga \u{00b7} 2022"])).allElementsBoundByIndex.map { $0.label }
        let observedProducers = Set(producerLabels.map { $0.components(separatedBy: " \u{00b7} ")[0] })
        let yearLabels = detail.staticTexts.matching(NSPredicate(format: "label IN %@", ["2022", "Muga \u{00b7} 2022"])).allElementsBoundByIndex.map { $0.label }
        let observedYears = Set(yearLabels.compactMap { Int($0.components(separatedBy: " \u{00b7} ").last ?? "") })
        try require(observedNames == Set(["Flor de Muga Blanco"]) && observedProducers == Set(["Muga"])
            && observedYears == Set([2022]), app, "Literal independent name, producer and year must all be read from the current dialog")
        try require(detail.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "Fuente: ficha p\u{00fa}blica Winerim.")).count == 1
            && detail.links["Ver ficha original Winerim"].exists, app, "Independent public fiche required")
        let score = detail.otherElements.matching(NSPredicate(format: "label MATCHES %@", "^Afinidad orientativa: [0-9]{1,3} de 100$"))
        try require(score.count == 1, app, "Numeric style comparison required")
        let raw = score.firstMatch.label.replacingOccurrences(of: "Afinidad orientativa: ", with: "").replacingOccurrences(of: " de 100", with: "")
        try require(Int(raw).map { (0...100).contains($0) } ?? false, app, "Bounded score required")
        try tapUnique(detail.buttons.matching(NSPredicate(format: "label == %@", "Ver el detalle de afinidad")), app)
        let pattern = "^(potencia|acidez|dulzor|tanino|fruta): tu perfil ([0-9]+[.][0-9])/5; este vino ([0-9]+[.][0-9])/5$"
        let dimensions = detail.otherElements.matching(NSPredicate(format: "label MATCHES %@", pattern)).allElementsBoundByIndex.map { $0.label }
        try require(dimensions.count == 5 && dimensions.allSatisfy(validDimension)
            && Set(dimensions.map { String($0.split(separator: ":")[0]) }) == Set(["potencia", "acidez", "dulzor", "tanino", "fruta"]), app, "Five named bounded dimensions required")
        try reveal(title, app); audit(app, "manual164-saved-verdict")
        try genuine(app)
        var issues = 0
        try app.performAccessibilityAudit(for: [.contrast, .sufficientElementDescription, .textClipped, .trait]) { issue in
            issues += 1; self.attach(String(describing: issue), "manual164-accessibility-issue"); return false
        }
        try require(issues == 0, app, "Unfiltered accessibility issues remain in current viewport")
        attach("contrast/sufficientElementDescription/textClipped/trait: zero reported issues; none suppressed. Current viewport only, not all scrolling content or VoiceOver speech.", "manual164-accessibility")
        attach("Manual query Flor de Muga Blanco and explicit2022 selection after local-photo reading. Not automatic identity, photo-certified vintage, canonical-ID equivalence, a new save or learned-taste accuracy. Saved love read through actual app; numeric style comparison: \(raw). Five axes: \(dimensions.joined(separator: " | ")).", "manual164-readback")
        let record: [String: Any] = ["runId": env["MATCHRIM161_RUN_ID"]!, "inputSHA256": env["MATCHRIM161_INPUT_SHA256"]!,
            "name": observedNames.first!, "producer": observedProducers.first!, "vintage": observedYears.first!, "current": Int(raw)!,
            "personalRating": "love", "personalVerdictTitle": title.label, "dimensions": dimensions,
            "accessibilityIssues": issues,
            "selection": "manual-query-and-explicit-vintage", "photoCertifiedVintage": false,
            "automaticIdentityProven": false, "newSavePersistenceValidated": false, "selectedPublicId": NSNull()]
        let readback = XCTAttachment(data: try JSONSerialization.data(withJSONObject: record, options: [.sortedKeys]), uniformTypeIdentifier: "public.json")
        readback.name = "manual164-record"; readback.lifetime = .keepAlways; add(readback)
        emit("MANUAL164_SAVED_LOVE_AND_AFFINITY")
        emit("MANUAL164_COMPLETE")
    }
}
