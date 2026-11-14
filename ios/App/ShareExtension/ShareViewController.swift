import UIKit
import UniformTypeIdentifiers

// 155: «Compartir → Matchrim». A photo of a bottle shared from Fotos, WhatsApp or the browser is left for the app in
// the folder both share (the app group) and the app is opened; the scanner picks it up there. Nothing is sent
// anywhere from here: the extension only resizes the photo and writes one file on the phone.
final class ShareViewController: UIViewController {
    static let group = "group.wine.matchrim.app"
    static let fileName = "shared-photo155.jpg"
    private static let maxDimension: CGFloat = 3_000
    private let message = UILabel()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor.black.withAlphaComponent(0.35)
        let card = UIView()
        card.backgroundColor = UIColor(red: 0.27, green: 0.04, blue: 0.04, alpha: 1)
        card.layer.cornerRadius = 20
        card.translatesAutoresizingMaskIntoConstraints = false
        message.text = "Enviando la foto a Matchrim…"
        message.textColor = .white
        message.font = .preferredFont(forTextStyle: .headline)
        message.adjustsFontForContentSizeCategory = true
        message.numberOfLines = 0
        message.textAlignment = .center
        message.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(message)
        view.addSubview(card)
        NSLayoutConstraint.activate([
            card.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            card.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 32),
            card.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -32),
            message.topAnchor.constraint(equalTo: card.topAnchor, constant: 24),
            message.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -24),
            message.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 20),
            message.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -20)
        ])
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        let providers = (extensionContext?.inputItems as? [NSExtensionItem] ?? []).flatMap { $0.attachments ?? [] }
        guard let provider = providers.first(where: { $0.hasItemConformingToTypeIdentifier(UTType.image.identifier) }) else {
            finish("Matchrim solo puede leer fotos.", open: false); return
        }
        provider.loadItem(forTypeIdentifier: UTType.image.identifier, options: nil) { [weak self] item, _ in
            let image: UIImage? = (item as? UIImage)
                ?? (item as? URL).flatMap { try? Data(contentsOf: $0) }.flatMap { UIImage(data: $0) }
                ?? (item as? Data).flatMap { UIImage(data: $0) }
            let saved = image.flatMap(Self.jpeg).map(Self.store) ?? false
            DispatchQueue.main.async {
                self?.finish(saved ? "Foto enviada. Abre Matchrim para ver el vino." : "No se ha podido leer esa foto.", open: saved)
            }
        }
    }

    // Drawing applies the photo's orientation, so the app always receives it upright (as from its own camera).
    private static func jpeg(_ image: UIImage) -> Data? {
        let longest = max(image.size.width, image.size.height)
        guard longest > 0 else { return nil }
        let scale = min(1, maxDimension / longest)
        let size = CGSize(width: floor(image.size.width * scale), height: floor(image.size.height * scale))
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        format.opaque = true
        return UIGraphicsImageRenderer(size: size, format: format).image { _ in image.draw(in: CGRect(origin: .zero, size: size)) }.jpegData(compressionQuality: 0.88)
    }

    private static func store(_ data: Data) -> Bool {
        guard let folder = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group) else { return false }
        return (try? data.write(to: folder.appendingPathComponent(fileName), options: .atomic)) != nil
    }

    private func finish(_ text: String, open: Bool) {
        message.text = text
        // An extension may not open its app directly; asking the application object up the responder chain is the
        // way share extensions do it. When iOS declines, the message tells the person to open Matchrim.
        if open, let url = URL(string: "matchrim://shared") {
            var responder: UIResponder? = self
            while let current = responder {
                if let application = current as? UIApplication { application.open(url, options: [:], completionHandler: nil); break }
                responder = current.next
            }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + (open ? 0.9 : 1.8)) { [weak self] in
            self?.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
        }
    }
}
