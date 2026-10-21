import Foundation
import XCTest

final class MatchrimMedia134Tests: XCTestCase {
    @MainActor func testInspectPickerOrder134() throws {
        continueAfterFailure = false
        let app = XCUIApplication(bundleIdentifier: "wine.matchrim.qa99review")
        app.terminate(); app.launch()
        defer { app.terminate() }
        let scan = app.links["Escanear"].firstMatch
        XCTAssertTrue(scan.waitForExistence(timeout: 15)); scan.tap()
        let bottles = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Botellas")).firstMatch
        XCTAssertTrue(bottles.waitForExistence(timeout: 10)); bottles.tap()
        let local = app.switches["Una etiqueta"].firstMatch
        XCTAssertTrue(local.waitForExistence(timeout: 10)); local.tap()
        XCTAssertTrue(app.staticTexts["Fotograf\u{00ed}a una etiqueta"].waitForExistence(timeout: 8))
        let gallery = app.buttons["Elegir de galer\u{00ed}a"].firstMatch
        XCTAssertTrue(gallery.waitForExistence(timeout: 8)); gallery.tap()
        let library = app.buttons["Photo Library"].firstMatch
        XCTAssertTrue(library.waitForExistence(timeout: 8) && library.isHittable)
        library.tap()
        let sort = app.buttons.matching(identifier: "Sort and Filter").firstMatch
        XCTAssertTrue(sort.waitForExistence(timeout: 15))
        audit(app, "01-before-sort")
        sort.tap()
        let added = app.buttons["Ordenar por fecha de adici\u{00f3}n"].firstMatch
        XCTAssertTrue(added.waitForExistence(timeout: 8))
        audit(app, "02-sort-menu")
        added.tap()
        XCTAssertTrue(sort.waitForExistence(timeout: 8))
        audit(app, "03-added-order-no-selection")
        sort.tap()
        XCTAssertTrue(added.waitForExistence(timeout: 8) && added.isSelected)
        audit(app, "04-added-order-selected")
        FileHandle.standardOutput.write(Data("MEDIA134_SORT_MENU_INSPECTED_NO_IMAGE_SELECTED\n".utf8))
    }

    @MainActor private func audit(_ app: XCUIApplication, _ name: String) {
        let image = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        image.name = "media134-" + name; image.lifetime = .keepAlways; add(image)
        let tree = XCTAttachment(string: app.debugDescription)
        tree.name = "media134-" + name + "-ax"; tree.lifetime = .keepAlways; add(tree)
    }
}
