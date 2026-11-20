import Foundation
import Capacitor
import MapKit

// 162 (owner's video of the 159: «¿Dónde lo tomaste?» took a typed word, «Narru», with no place behind it). Apple's
// own place search: free, no key, no account and no location permission. Only the typed text leaves the phone, to
// Apple, as in the Maps app. Returns names and addresses; nothing is stored here.
@objc(MatchrimPlacesPlugin162)
public final class MatchrimPlacesPlugin162: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "MatchrimPlacesPlugin162"
    public let jsName = "MatchrimPlaces"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "search", returnType: CAPPluginReturnPromise)
    ]
    private var current: MKLocalSearch?

    @objc func search(_ call: CAPPluginCall) {
        let query = (call.getString("query") ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard query.count >= 3, query.count <= 80 else { call.resolve(["places": []]); return }
        DispatchQueue.main.async {
            self.current?.cancel()
            let request = MKLocalSearch.Request()
            request.naturalLanguageQuery = query
            request.resultTypes = .pointOfInterest
            let search = MKLocalSearch(request: request)
            self.current = search
            search.start { response, _ in
                let places: [[String: Any]] = (response?.mapItems ?? []).prefix(8).compactMap { item in
                    guard let name = item.name, !name.isEmpty else { return nil }
                    let mark = item.placemark
                    let street = [mark.thoroughfare, mark.subThoroughfare].compactMap { $0 }.joined(separator: " ")
                    let address = [street, mark.locality, mark.country].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: ", ")
                    return ["name": String(name.prefix(120)), "address": String(address.prefix(160)),
                            "lat": mark.coordinate.latitude, "lng": mark.coordinate.longitude,
                            "category": item.pointOfInterestCategory?.rawValue ?? ""]
                }
                call.resolve(["places": places])
            }
        }
    }
}
