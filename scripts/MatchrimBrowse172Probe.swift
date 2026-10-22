import Foundation
import XCTest

final class MatchrimManual164Tests: MatchrimRescan161Tests {
    @MainActor func testExistingQABrowse172() throws {
        continueAfterFailure = false
        let app = XCUIApplication(bundleIdentifier: "wine.matchrim.qa99review")
        app.launch(); defer { audit(app, "browse172-final"); app.terminate() }
        try require(app.wait(for: .runningForeground, timeout: 15) && app.frame.height > app.frame.width, app, "Portrait app required")
        try tapUnique(app.links.matching(NSPredicate(format: "label == %@", "Perfil")), app)
        let owner = app.otherElements.matching(NSPredicate(format: "label == %@", "Correo de tu cuenta: info@winerim.com"))
        try require(owner.firstMatch.waitForExistence(timeout: 12) && owner.count == 1 && app.textFields.count == 0, app, "Resident QA account only")
        try genuine(app); audit(app, "browse172-owner"); emit("BROWSE172_OWNER")
        try tapUnique(app.links.matching(NSPredicate(format: "label == %@", "Escanear")), app)
        try tapUnique(app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Botellas")), app)
        let local = app.switches.matching(NSPredicate(format: "label == %@", "Una etiqueta"))
        try require(local.firstMatch.waitForExistence(timeout: 10) && local.count == 1
            && !app.staticTexts["Antes de analizar una imagen"].exists, app, "Previously accepted local mode required")
        if !selected(local.firstMatch) { try tap(local.firstMatch, app) }
        try require(selected(local.firstMatch), app, "No model analysis permitted")
        try tapUnique(app.buttons.matching(NSPredicate(format: "label == %@", "Elegir de galer\u{00ed}a")), app)
        try photo(app)
        try require(app.buttons["Corregir identificaci\u{00f3}n"].waitForExistence(timeout: 40), app, "Local photo reading must finish")
        try genuine(app); audit(app, "browse172-local"); emit("BROWSE172_LOCAL")
        try tap(app.buttons["Ficha e identificaci\u{00f3}n"].firstMatch, app)
        try tapUnique(app.buttons.matching(NSPredicate(format: "label == %@", "Buscar otra referencia en Winerim")), app)
        let web = app.webViews.firstMatch
        let fields = web.textFields.matching(NSPredicate(format: "label == %@", "Nombre del vino o bodega"))
        try require(fields.firstMatch.waitForExistence(timeout: 8) && fields.count == 1
            && (fields.firstMatch.value as? String ?? "").isEmpty, app, "Named empty manual query required")
        try tap(fields.firstMatch, app); fields.firstMatch.typeText("Campillo")
        try require(fields.firstMatch.value as? String == "Campillo", app, "Literal explicit manual query required")
        try tapUnique(web.buttons.matching(NSPredicate(format: "label == %@", "Buscar")), app)
        let tail = "referencias cargadas. El filtro de a\u{00f1}ada solo incluye las cargadas."
        // WKWebView exposes React text nodes separately; scope all four literal
        // fragments to their direct paragraph parent instead of guessing a label.
        func counters(_ amount: String) -> [XCUIElement] {
            web.otherElements.containing(.staticText, identifier: tail).allElementsBoundByIndex.filter { element in
                element.children(matching: .staticText).allElementsBoundByIndex.map { $0.label.trimmingCharacters(in: .whitespacesAndNewlines) }
                    == [amount, "de", "112", tail]
            }
        }
        try require(wait(25) { counters("20").count == 1 } && wait(5) { app.keyboards.count == 0 }, app, "Actual partial page and dismissed keyboard required")
        audit(app, "browse172-first20"); emit("BROWSE172_FIRST20")
        let load = web.buttons.matching(NSPredicate(format: "label == %@", "Cargar m\u{00e1}s referencias de Winerim"))
        try tapUnique(load, app)
        try require(wait(25) { counters("40").count == 1 }, app, "A real second server page must append, not replace or auto-confirm")
        try reveal(counters("40")[0], app); audit(app, "browse172-next40"); emit("BROWSE172_NEXT40")
        let choices = web.buttons.matching(NSPredicate(format: "label == %@", "Esta es mi referencia"))
        try require(choices.count >= 1 && choices.count <= 3, app, "Explicit confirmation still required")
        try require(load.count == 1, app, "Further pagination remains explicit")
        try genuine(app)
        var issues = 0
        try app.performAccessibilityAudit(for: [.contrast, .sufficientElementDescription, .textClipped, .trait]) { issue in
            issues += 1; self.attach(String(describing: issue), "browse172-accessibility-issue"); return false
        }
        try require(issues == 0, app, "Current viewport accessibility audit must not be suppressed")
        attach("Manual Campillo query after an attested local photo;20 then40 of112 public references. No reference confirmed, no save/rating/auth/model action. Not automatic recognition or expert wine accuracy.", "browse172-readback")
        emit("BROWSE172_COMPLETE")
    }
}
