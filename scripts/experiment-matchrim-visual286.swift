// Offline experiment: can Apple Vision image feature prints (on-device, free) match a degraded
// "phone-like" copy of a bottle photo back to the catalogue packshot it came from?
// Usage: swiftc -O scripts/experiment-matchrim-visual286.swift -o <bin> && <bin> <photosDir> <out.json>
import Foundation
import Vision
import CoreImage
import AppKit

let args = CommandLine.arguments
let dir = URL(fileURLWithPath: args[1]), outURL = URL(fileURLWithPath: args[2])
let files = try FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil)
  .filter { ["png", "jpg", "jpeg"].contains($0.pathExtension.lowercased()) }.sorted { $0.lastPathComponent < $1.lastPathComponent }
let context = CIContext(options: [.useSoftwareRenderer: true])

func featurePrint(_ image: CGImage) throws -> VNFeaturePrintObservation {
  let request = VNGenerateImageFeaturePrintRequest()
  request.usesCPUOnly = true
  try VNImageRequestHandler(cgImage: image, options: [:]).perform([request])
  return request.results!.first as! VNFeaturePrintObservation
}
// Phone-like degradation: tilt, off-centre crop, exposure, blur, busy background, lower resolution.
func degrade(_ input: CIImage, tilt: Double, crop: Double, ev: Double, blur: Double, background: CIColor, scale: Double) -> CGImage {
  let extent = input.extent
  let flat = CIImage(color: CIColor(red: 1, green: 1, blue: 1)).cropped(to: extent)
  var image = input.composited(over: flat)
  let w = extent.width * crop, h = extent.height * crop
  image = image.cropped(to: CGRect(x: extent.minX + (extent.width - w) * 0.3, y: extent.minY + (extent.height - h) * 0.6, width: w, height: h))
  image = image.transformed(by: CGAffineTransform(rotationAngle: tilt * .pi / 180))
  image = image.applyingFilter("CIExposureAdjust", parameters: [kCIInputEVKey: ev])
  image = image.applyingGaussianBlur(sigma: blur)
  let box = image.extent.insetBy(dx: -image.extent.width * 0.35, dy: -image.extent.height * 0.12)
  let backdrop = CIImage(color: background).cropped(to: box)
    .applyingFilter("CICheckerboardGenerator", parameters: ["inputColor0": background, "inputColor1": CIColor(red: 0.45, green: 0.38, blue: 0.3), "inputWidth": 37])
    .cropped(to: box).applyingGaussianBlur(sigma: 6).cropped(to: box)
  image = image.composited(over: backdrop).cropped(to: box)
  image = image.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
  let cg = context.createCGImage(image, from: image.extent)!
  // JPEG round trip, as a camera/gallery would hand it over.
  let data = NSBitmapImageRep(cgImage: cg).representation(using: .jpeg, properties: [.compressionFactor: 0.55])!
  return NSBitmapImageRep(data: data)!.cgImage!
}

var originals: [(String, VNFeaturePrintObservation)] = []
var inputs: [(String, CIImage)] = []
for file in files {
  guard let ci = CIImage(contentsOf: file), let cg = context.createCGImage(ci, from: ci.extent) else { continue }
  let id = file.deletingPathExtension().lastPathComponent
  originals.append((id, try featurePrint(cg))); inputs.append((id, ci))
}
let variants: [(String, Double, Double, Double, Double, CIColor, Double)] = [
  ("tilt6-crop85-dark-blur1.5", 6, 0.85, -0.6, 1.5, CIColor(red: 0.15, green: 0.12, blue: 0.1), 0.8),
  ("tilt-4-crop90-bright-blur3", -4, 0.90, 0.5, 3.0, CIColor(red: 0.8, green: 0.75, blue: 0.7), 0.6),
  ("tilt10-crop75-blur2-small", 10, 0.75, -0.2, 2.0, CIColor(red: 0.3, green: 0.35, blue: 0.4), 0.45),
]
var report: [String: Any] = ["scope": "Apple Vision VNGenerateImageFeaturePrintRequest on CPU; synthetic degradations of the catalogue photo, not real phone photos.",
  "catalogue": originals.count]
var perVariant: [[String: Any]] = []
for (name, tilt, crop, ev, blur, background, scale) in variants {
  var top1 = 0, top3 = 0, misses: [[String: Any]] = []
  for (id, ci) in inputs {
    let query = try featurePrint(degrade(ci, tilt: tilt, crop: crop, ev: ev, blur: blur, background: background, scale: scale))
    let ranked = try originals.map { (other, print) -> (String, Float) in
      var distance: Float = 0; try query.computeDistance(&distance, to: print); return (other, distance) }.sorted { $0.1 < $1.1 }
    let rank = ranked.firstIndex { $0.0 == id } ?? 999
    if rank == 0 { top1 += 1 }; if rank < 3 { top3 += 1 }
    if rank != 0 { misses.append(["id": id, "rank": rank + 1, "top": ranked.prefix(3).map { $0.0 }]) }
  }
  perVariant.append(["variant": name, "top1": top1, "top3": top3, "images": inputs.count, "misses": misses])
  print("\(name): top1 \(top1)/\(inputs.count), top3 \(top3)/\(inputs.count)")
}
report["variants"] = perVariant
try JSONSerialization.data(withJSONObject: report, options: [.prettyPrinted, .sortedKeys]).write(to: outURL)
