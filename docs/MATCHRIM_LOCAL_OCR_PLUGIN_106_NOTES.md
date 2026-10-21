# Matchrim Local OCR Plugin 106

## Integration Boundary

- New native class: `MatchrimOCRPlugin106: CAPPlugin, CAPBridgedPlugin`.
- Capacitor identifier: `MatchrimOCRPlugin106`; JavaScript name: `MatchrimOCR`.
- The parent must add the Swift file to the app target and call
  `bridge?.registerPluginInstance(MatchrimOCRPlugin106())` in its existing
  `MatchrimBridgeViewController.capacitorDidLoad()` integration.
- This change does not register the plugin or change AppDelegate, project files,
  TypeScript, UI, settings, permissions, or startup behavior. No OCR runs until
  `recognize` is explicitly called. Queue construction does not start OCR.
- Vision configuration follows `scripts/benchmark-matchrim-ocr100.swift`, without
  its filesystem, benchmark, hashes, leases, or logging machinery.

## Promise API

`recognize({ requestId: string, image: string })`

- `requestId` must be a 36-byte UUID string. It is echoed unchanged; cancellation
  compares the parsed UUID, so letter case is irrelevant.
- `image` must use exactly `data:image/jpeg;base64,` or
  `data:image/png;base64,`, followed by strict, padded standard base64. URLs,
  files, HEIC, MIME parameters, aliases, and multi-frame images are not accepted.
- Extra options are ignored. There is no caller-supplied lexicon, model,
  language, ground truth, filename, or network endpoint.

Successful result:

```ts
{
  source: 'apple-vision-device',
  requestId: string,
  width: number,
  height: number,
  totalMs: number,
  revision: number,
  customWords: [],
  lines: Array<{
    text: string,
    confidence: number,
    box: { x: number; y: number; width: number; height: number }
  }>
}
```

- Width and height describe the orientation-corrected thumbnail actually passed
  to Vision, not the original encoded image. Vision receives orientation `.up`.
- Boxes use normalized top-left coordinates relative to that thumbnail, clamped
  to its unit square. Confidence is finite and clamped to `[0, 1]`.
- Output contains at most the first 100 Vision observations with valid candidates
  and boxes. Lines are in Vision's order, not a guaranteed reading order. Each
  text is bounded to 1,000 UTF-16 code units without a dangling high surrogate.
- `totalMs` uses monotonic native elapsed time from method entry through result
  collection; it excludes bridge transport. Empty recognition resolves `lines: []`.

`cancel({ requestId: string })` resolves `{ requestId, cancelled: boolean }`.

- `true` means cancellation won settlement of a matching, still-pending job.
  That recognize promise rejects `CANCELLED`. If its deadline already passed,
  `TIMEOUT` takes priority and `cancelled` is false.
- Unknown, completed, already-cancelled, and mismatched UUIDs resolve false and
  cannot affect another job. Invalid UUIDs reject `INVALID_REQUEST_ID`.
- Cancellation covers queued work, base64 decoding, ImageIO decoding, and Vision.
  Checkpoints prevent subsequent stages after cancellation. An attached Vision
  request also receives `request.cancel()`.

## Bounds And Concurrency

- Entire data URL: at most 18 MiB of UTF-8; decoded data: at most 12 MiB.
  A pre-decode base64-length bound prevents allocating a larger decoded payload
  (12 MiB corresponds to 16 MiB of padded base64).
- Both a JPEG/PNG signature and the detected ImageIO container type must match
  the declared MIME type. Only a single frame is accepted.
- Metadata must contain positive integral dimensions, each at most 16,384 px,
  with at most 64,000,000 source pixels. Checks precede thumbnail decoding.
- ImageIO creates a fresh thumbnail with orientation transform, maximum edge
  2,400 px, no full-image cache, immediate thumbnail decode, and no float output.
  Thumbnail dimensions are checked again before Vision.
- One serial utility worker, one occupied job slot, and a separate deadline queue.
  Concurrent recognizes reject `BUSY`; there is no accumulating work backlog.
- A 20-second monotonic deadline starts at native method entry, covering queue
  wait and decoding as well as OCR. Timeout rejects `TIMEOUT` and cancels any
  attached Vision request. Settlement checks the clock even if the timer runs
  late; a result cannot win after cancellation or timeout settlement.
- State changes are lock-protected and settlement clears the call exactly once.
  Timer and worker callbacks identify the job object, not just its reusable UUID.
  Bridge callbacks and Vision cancellation occur outside the state lock.
- Cancellation/timeout settles the promise without waiting for decode/Vision to
  return. ImageIO and system Vision internals cannot be forcibly interrupted or
  given a hard memory ceiling. The slot remains `BUSY` until the original worker
  exits, preventing overlapping decode/OCR or abandoned-job accumulation.
  iOS suspension or scheduler stalls can delay timer and bridge delivery; this
  is not a real-time OS termination guarantee.

## Runtime Compatibility And Privacy

- Deployment target: iOS 14.0. Prefer revision 3 on iOS 16+, then revision 2 or 1,
  selecting only revisions in `supportedRevisions` at runtime.
- Use `.accurate`, language correction, no automatic language detection, CPU-only
  background processing, and `customWords = []`. Prefer runtime-supported members
  of `es-ES`, `en-US`, `fr-FR`; fall back to the first runtime-supported language
  only if none of those are supported. Languages are queried for the chosen
  accurate revision (instance API on iOS 15+, class API on iOS 14).
- No filesystem APIs, network calls, model acquisition, image persistence,
  telemetry, or logging in this plugin. Images/results remain in transient
  process memory and bridge payloads. Runtime frameworks can have internal
  allocations; the plugin does not control the parent's bridge logging policy.
- Errors contain only fixed messages and stable codes, never source OCR text,
  image data, filenames, or underlying system error descriptions.
- No canonical identity, affinity, product matching, or multi-bottle segmentation
  is performed or implied. OCR quality and language coverage vary by runtime.

## Error Codes

`INVALID_REQUEST_ID`, `INVALID_IMAGE`, `INVALID_BASE64`, `IMAGE_TOO_LARGE`,
`UNSUPPORTED_IMAGE_FORMAT`, `IMAGE_TYPE_MISMATCH`, `IMAGE_DIMENSION_LIMIT`,
`IMAGE_DECODE_FAILED`, `OCR_UNAVAILABLE`, `OCR_FAILED`, `BUSY`, `CANCELLED`, `TIMEOUT`.

Validation of required argument types precedes the occupied-slot check. With
valid argument types, an occupied worker takes precedence over image validation.
Deadline expiration takes priority over any pending terminal result or error.

## Verification Handoff

Only static source/header review was performed here. No Swift invocation,
Xcode/build, rendering, model runs, network access, or resource acquisition.
Parent owns registration, target membership, TypeScript orchestration, UX, tests,
and device/build verification. Suggested parent cases: JPEG/PNG success; all EXIF
orientations; revision/language selection on iOS 14/15/16+; empty OCR; malformed,
oversized, mismatched, animated, and extreme-dimension inputs; 100-line/text
limits; simultaneous recognizes; cancel before decode/during decode/during Vision;
wrong/reused UUIDs; repeat cancel; cancel/timeout/completion races; timeout with
late native completion; and successful retry after worker cleanup.
