# Matchrim1.0(82): TestFlight upload and physical monitoring handoff

## Follow-up07:37-07:46: actual82 and first owner-led dense case

- Apple login restored.82 processed, assigned Testers Matchrim internal group; physical CoreDevice and TestFlight screen both confirm installed1.0(82). No app replacement by agent.82 testing instructions saved, official UI Guardado.
- Owner selected dense display photo in gallery and performed analysis. Actual screen:1.9MP,brightness80,contrast68;60 regions in48.3s,12 analyzed/48 deferred,9 grouped proposals. Not60 verified bottles or9 canonical wines.
- Portrait clustering is readable without per-bottle score cards, but pins concentrate in top two shelves. First four visible proposals have no affinity (Sin datos); Mon Pariente75% and Jóvenes73% remain partial/uncertain and require crop verification. No recognition/recommendation QA approval or precision/recall claim.
- Internal policy deliberately caps automatic analyses12. Separate source risk: normalized top-to-bottom regions are capped to first60, potentially biasing lower-shelf coverage; raw payload/ground truth needed for causal attribution. No budget increase/new benchmark/app-source edit during live tests.
- Logs now contain actual app activity. Collector counter originally missed App(Category)[pid]; raw-log recount6009headers/17native Error headers/36untriaged signals, not product-bug counts. Helper correction13/13utility tests, not13 app cases. New bounded session after USB disconnect; recording is not continuous AI supervision.
- External invitation still UNSENT: latest82 flow prepared, contact phone/dedicated Matchrim review account missing, Next disabled. Owner asked to fill directly in Apple. Previous81 draft tab closed, no credentials recovered/copied.
- Private REAL_QA_82.md includes expected/actual, actual screenshots, source risks and remaining cases. Snapshot/diagnostic evidence outside Git; pending detail/correction next, not full physical QA green.

## Follow-up after owner readiness,07:23-07:28 Europe/Madrid

- Original passive capture exited normally on USB disconnect at05:21:18.680Z (07:21 local), with zero app lines. Do not describe it as still running.
- Fresh CoreDevice scoped app query succeeds. Installed Matchrim is1.0(81), not82. No replacement/launch or reset performed.
- Device lockState reports passcodeRequired=false, unlockedSinceBoot=true. DDI reports isUsable=true/contentIsCompatible=true, buildUpdate17A400.
- New passive App-process capture is connected, private subdirectory `session-ready-0724`, started05:24:19.087Z; maximum until07:24:19.088Z UTC (09:24 local) or disconnect. Still zero app lines/actions when reviewed.
- QuickTime screen selection still black; legacy idevicescreenshot cannot start screenshotr (Invalid service). Neither is working video evidence.
- Xcode26.0.1 Devices -> Goiko -> Take Screenshot DOES capture actual iPhone pixels. Captures07:26:19/07:27:50 show the owner home screen, not Matchrim/TestFlight. Do not include unrelated home-screen images in public repository evidence.
- Monitoring can use actual Xcode snapshots and passive logs during active owner testing. This is sampled visual observation, not a continuous video stream or background AI supervision after turn end.
- App Store Connect remains at password sign-in. Draft review Next disabled. No new invitation sent, no Apple-processing availability observation, no physical functional test passed yet.
- Owner asked to open TestFlight/Matchrim and install82 if available, then authenticate prepared Apple tab. Actual82 tests remain pending;81 observations must be separately labeled.

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
