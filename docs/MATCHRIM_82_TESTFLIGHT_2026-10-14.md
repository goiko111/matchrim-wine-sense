# Matchrim1.0(82): TestFlight upload and physical monitoring handoff

## Actual release

- Owner explicitly requested candidate82 upload on2026-10-14.
- Reused the signed2026-10-13 archive and reviewed production resources; no rebuild or deployment.
- Product source: bda5241df3e0683990aa0371c95e3e955e539084. Documentation/harness checkpoint:9aadf93.
- Version1.0(82), bundle wine.matchrim.app, team8X3XTD6XYX, Xcode26.0.1/iphoneos26.0.
- Local IPA SHA256:9d3f3b2947fb5c1109005829842877c07dfafe157487373aa7c3ceaac723bb96.
- Xcode export/upload exit0: Uploaded App, EXPORT SUCCEEDED, Upload succeeded, Uploaded package is processing.
- Apple acceptance receipt:2026-10-14T04:51:38.593Z,06:51:38 Europe/Madrid.
- Export is external-compatible (testFlightInternalTestingOnly=false), no public App Store submission.
- Processing completion, group availability and installation82 NOT yet verified. Do not upload82 again.
- Public web and backend versions unchanged; no source push, private media publication or provider benchmark.

Upload preflight had two local plist-parser failures before any upload began. Replaced whole-plist JSON conversion (archive includes a date) with structured raw extraction of required fields. Exactly one actual upload succeeded. Archive/version/hash/signature guards passed before it.

Apple warning: current deployment target14.0 will need15.0 or later for uploads starting April2027. Warning did not reject this upload; future scope only.

## Physical connection, not physical QA approval

- Owner iPhone16ProMax/iOS26.6 responds through USB/libimobiledevice.
- CoreDevice acquires tunnel but DDI mounting fails with12040/kAMDMobileImageMounterDeviceLocked. Phone must be unlocked.
- QuickTime screen source Goiko selected without recording or controlling the phone. Screen still black; no app content observed.
- Passive idevicesyslog process filter App connected. At handoff there were zero app lines/actions; no functional case passed.
- Bounded local capture started2026-10-14T04:52:12.273Z, expires06:52:12.274Z UTC (08:52:12 Europe/Madrid), or exits on USB disconnect.
- Logs are local private files with JWT/bearer/query-token/email redaction. Error signals require triage; zero signals is not a clean QA verdict.
- Log capture is not continuous AI screen review, not complete WebKit/network telemetry, not a native memory/leak test and not evidence of recommendation accuracy.
- No device app install/replacement, account reset, permission alteration, app launch/termination or automated UI taps.

## External invitation gate

The previously requested external tester is still UNSENT. Existing draft build81 review form has name/contact email/description, but lacks contact telephone and dedicated Matchrim reviewer username/password. Login-required stays checked because saved/learning workflows require a real account. Never use an Apple password as the app reviewer password.

Fresh Apple navigation on2026-10-14 redirected to sign-in: browser session expired. Left login and draft form open for the owner; no credentials read/exported. After authentication and reviewer fields, use latest82 flow and confirm actual invitation/review status. Do not claim individual creation from merely clicking Next. No internal/admin access or public link created.

## Owner-led test matrix

Prepared14 physical cases: installation/profile retention; primary navigation/aiRIM; single camera/gallery label;2-5 labels/duplicates; dense display; columnar wine list; handwritten board/glare; food menu; explanation/compare; identity and price correction/save; cancel/retry; connectivity/background; orientation/large type/VoiceOver; actual taste feedback.

All are pending actual owner execution. Record expected/actual identities, unknown/missed regions, evidence provenance, stale affinity invalidation, prices/units, latency, visual overlap and related logs. Existing client/simulator QA in the integration report remains valid but is not substituted for these physical tests or a human preference study.

## Private evidence location

Current task artifacts: `artifacts/matchrim82-testflight-liveqa-20261014/` in the recovered local task output directory (outside Git).

- upload82-result.json / upload82.log / upload82-started.json
- ExportOptions-upload.plist / upload82.cjs
- device-app.json / device-app-second.json: actual locked-device errors
- live-monitor-status.json / matchrim-device.log / matchrim-device-events.jsonl
- live-monitor.cjs / start-monitor.cjs: scoped two-hour passive capture
- MANUAL_QA.md: pending expected/actual table
- apple-login-pending.jpg: sign-in handoff, private

No existing Oct13 receipts overwritten. New Apple-processing/invitation/install/physical results must be appended with observation time.

## Minimal owner action

1. Unlock cable-connected iPhone and open Matchrim; install1.0(82) from TestFlight once available.
2. Authenticate App Store Connect directly in prepared Chrome tab.
3. Fill contact phone and dedicated Matchrim reviewer credentials directly in Apple, not in chat.
4. Signal readiness so live screen review and the14-case manual matrix can begin.
