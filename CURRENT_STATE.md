# Matchrim current state

## Latest checkpoint: 2026-10-08, completed real77 benchmark

- Real production recognition through local77 mobile Chrome:40/40 journeys over29 files; no mocks. Additional authorized calls272/300; prior289/300 preserved; total561. No quota block.28 additional calls unused.
- Four original wine menus:67/69/69, name precision/recall97.10%; one Spanish food menu7/7; valid negatives14/15. These are NOT canonical identity or human recommendation metrics.
- Quality HOLD: non-wine drinks admitted/scored, same reference affinity varies up to12points across photos, aliases/count duplication, dense60-region/0-identity case, food omissions and misleading preference inference. No horizontal overflow does not certify uncluttered overlays.
- App source stayed402da5d; no deployment/upload/phone installation. Existing local77 candidate unchanged. Historical uploaded75 not reuploaded.
- Evidence: [MATCHRIM_77_REAL_BENCHMARK_2026-10-08.md](docs/MATCHRIM_77_REAL_BENCHMARK_2026-10-08.md). Earlier zero-call/budget-pending checkpoint below is historical and superseded for this batch.

## Latest checkpoint: 2026-10-08, additive challenge / local77

- Added 24 licensed public challenge files to the preserved60 baseline:84 public files, NOT84 independent scenes. Agent-reviewed annotations and provenance/hashes are committed; canonical independent validation remains open.
- Fixed food scanner crash on malformed responses, missing-profile coercion, impossible score display and corrupt-image submission. Error recovery is now visible and actionable; nullable sensory dimensions remain unknown.
- Final food functional QA10/10; scanner31/31; synthetic persona UI25/25; anonymous isolated routes34/34. These do NOT certify real OCR/identity or human recommendation quality.
- Local build77, no upload/deploy/owner-phone installation. Uploaded75 remains unchanged. Backend router remains catalog75/affinity73/vision72.
- New remote vision requests:0. Prior budget289/300; requested additional budget has not been approved in this batch.
- Evidence and residual feature matrix: [MATCHRIM_77_CHALLENGE_2026-10-08.md](docs/MATCHRIM_77_CHALLENGE_2026-10-08.md).

## Latest checkpoint: 2026-10-08, uploaded 75 / local remediation 76

- Explicit owner request superseded the earlier upload HOLD. Apple accepted **1.0 (75)** at 10:39:36 Europe/Madrid: `Upload succeeded`, `Uploaded package is processing`, exit 0. Internal TestFlight only; availability after processing is not verified because the ASC browser session needs login.
- Uploaded source remains `f5a37da968da202bd1dafd9eae05ae935d4939bc`. No web publication, no extra tester invitations, no further backend deployment.
- Build76 is a separate local candidate. It preserves successful regional detections after another tile fails, labels coverage partial, and resolves matching literal menu rows conservatively without inheriting a disputed affinity score.
- Recorded first-menu response replay: 17 rows -> 16 rows; this is offline postprocessing verification, NOT a fresh recognition benchmark or proof of canonical identity.
- Full functional UI suite: 31/31 using controlled backend responses. Release contracts, typecheck, lint and web build pass. Native QA and targeted recorded-menu UI evidence are documented in the remediation report.
- All unresolved independent-recognition and real-human recommendation gates below remain open. Upload authorization is not quality certification.
- Current report: [MATCHRIM_76_REMEDIATION_2026-10-08.md](docs/MATCHRIM_76_REMEDIATION_2026-10-08.md).

## Current checkpoint: 2026-10-08, candidate 75

The checkpoint immediately below is the historical pre-upload decision, superseded administratively by the owner's explicit request above. Its quality findings remain valid. Sections dated 2026-10-01 are older history.

- Candidate `1.0 (75)` is built/signed, installed directly as a development build on the connected iPhone, and **not uploaded to TestFlight**. Last historical upload receipt available is 73; current ASC readback was not performed.
- Native main menu contains aiRIM with a speech-bubble icon. Six-step guide, safe-area/privacy and honest identity/affinity states are integrated.
- Functional scanner suite passes 31/31 with mocks; independent real 25-scene benchmark is below gate (name precision 77.25%, recall 82.69%, before final fixes). Original four menus yield 97.14%/98.55%; dense cabinet remains partial.
- New isolated production catalog endpoint `search-wines-v75` deployed through Lovable at source commit `d84018d9ffa5ba44cbdb1abc0609d41fd130652e`; vision v72 and affinity v73 unchanged. Web not republished.
- Release decision is HOLD for recognition/validation quality, not an assumed Apple agreement or exhausted provider quota. Do not relabel mocks or synthetic users as human evidence.
- Authoritative batch report: [MATCHRIM_75_QA_2026-10-08.md](docs/MATCHRIM_75_QA_2026-10-08.md).
- Final cuvee-merge correction preserves distinct wines from one winery. A targeted real rerun of the first original menu reaches 16/16 names (one duplicate remains; one recovered vision HTTP500). Final native QA6/6 on each device and mocked scanner31/31 passed; this is not a full final25 recognition pass.

## Historical checkpoint

Updated: 2026-10-01

## Release

- Latest uploaded version: Matchrim `1.0 (66)`. App Store Connect accepted the package on 2026-10-01 at 06:00 CEST and reported it as processing.
- Preserved archive: `~/Library/Developer/Xcode/Archives/2026-09-30/Matchrim 1.0 (66).xcarchive`.
- The upload channel was authenticated through Xcode. Browser readback still requires a fresh App Store Connect login.
- Bundle/team: `wine.matchrim.app` / `8X3XTD6XYX`.
- The Lovable/web line remains pinned to `08e12fb`; no web or Supabase deployment was performed.

## Product

- Native bottom navigation candidate 67: Inicio, Explora, Bodega and Perfil, with Escanear as the separate primary action. The web navigation remains unchanged.
- Multi-label capture detects independent regions, supports correction, discard, retry and per-wine affinity.
- Wine lists and boards use numbered pins plus a synchronized list instead of overlaying text.
- Comparison supports 2-5 wines with personal/service modes, budget and glass/bottle context.
- Affinity explains positive and negative factors, confidence, missing evidence and alternatives.
- Saved-wine exclusion, profile learning and account-state isolation remain covered by deterministic tests.

## Final QA

| Gate | Result |
| --- | --- |
| Authorized five-image real E2E | PASS 5/5 |
| Four printed wine-list precision | 1.000 in every final case |
| Four printed wine-list recall | 0.938 / 1.000 / 1.000 / 0.969 |
| Multi-bottle cabinet transport/UI | PASS: 30 analyses and per-region recovery controls |
| Local final-box/crop/result alignment contract | PASS 3/3; scorer rejects shifted boxes, duplicate crops and extra regions |
| Multi-bottle cabinet canonical identity | BLOCKED: legacy report lacks final box/crop mapping; prior 0/0 withdrawn |
| Multi-label/menu visual suite | PASS 27/27 certified + focused recovery regression PASS |
| TypeScript, unit/contracts, production build | PASS |
| ESLint | 0 errors, 105 existing warnings |
| iOS simulator build and Release archive | PASS with Xcode 26.0.1 |
| App Store Connect upload | PASS |

## Physical iPhone QA (build 65)

- Device: iPhone 16 Pro Max, iOS 26.6; the installed TestFlight binary is `1.0 (65)`.
- Five cold launches passed (mean `2.374 s`, max `2.389 s`); the earlier isolated black screen did not reproduce.
- Camera, Photo Library, background/foreground, portrait/landscape, native bottom navigation and read-only Bodega/Profile history passed.
- Session and learned state persisted: one rated wine, `8%` learning confidence, two favorites and two sensory tests.
- **P0 physical regression:** Bodega and Profile headings enter the status-bar/Dynamic-Island area (`y=30/31 pt`).
- **P1 accessibility:** eight directly measured visible controls are below 44 pt. XCTest emitted 33 raw hit-region alerts including nested WebView elements; no Dynamic Type, clipping or missing-description alert.
- **P2 copy:** Home displays `1 valoraciones`.
- No production write, image upload, backend/web deployment or TestFlight change occurred.
- Evidence: `docs/MATCHRIM_BUILD65_PHYSICAL_DEEP_QA_2026-09-30.md`.

## Build 66 remediation candidate

- Bodega and Profile now reserve the native top safe area through a shared page class.
- The eight directly measured undersized controls now meet the `44 pt` minimum in compiled-layout QA.
- Home renders `1 valoración afina`; learned decimal profiles are normalized before the integer-only Winerim classifier.
- Compiled-layout QA passed `14/14` with zero console errors in portrait/landscape, preserved the prior web spacing and used no production traffic.
- Native simulator smoke passed Home -> Scan -> Home, rotation and the `124x44 pt` Home target.
- TypeScript, full contracts, production build, iOS simulator build and signed Release archive passed. ESLint remains at 0 errors and 105 inherited warnings.
- App Store Connect upload passed through Xcode 26.0.1. TestFlight processing/readback and physical-device confirmation remain open.
- The same build 66 binary was installed directly on the connected iPhone 16 Pro Max and launched successfully at 06:07 CEST; this confirms installation and startup only, not the pending hands-on workflow QA.
- Evidence: `docs/MATCHRIM_BUILD66_CANDIDATE_2026-09-30.md`.

Runtime versions observed: `matchrim-region-detector-v3`, `matchrim-region-analysis-v3-grounded` and `scan-wine-menu-2026-08-26-grounded-v3`.

## Build 67 native design candidate

- Local candidate only; it has not been uploaded to TestFlight or deployed to the web.
- A development-signed build 67 was installed directly on the connected iPhone 16 Pro Max and launched successfully. `devicectl` confirmed bundle `wine.matchrim.app`, version `1.0`, build `67`, and a live process. This replaces the local installed binary only; it is not a TestFlight upload.
- Native results now separate Scene, Wines and Compare. The web keeps its previous continuous layout.
- aiRIM uses a sensory-compass mark and acts as contextual help instead of a native top-level tab.
- Native Home, Auth and special-occasion flows share the neutral/burgundy system; recent work moves higher on Home.
- Real iOS Dynamic Type now drives a bounded 94-135% scale through the existing bridge. Accessibility sizes switch the main scan actions to one column.
- Simulator portrait, landscape and accessibility-extra-extra-extra-large passed without horizontal overflow.
- Remote physical-device rotation is not supported by `devicectl` on this iPhone, so build 67 landscape remains Simulator-validated and requires a manual physical gesture before release.
- Native visual regression passed on all five supplied materials with embedded deterministic responses. This validates layout and interaction, not OCR accuracy.
- The 25 isolated QA personas passed 25/25. Route inventory passed 34/34 with zero overflow, page errors or console errors.
- Evidence and exact residual gate: `docs/MATCHRIM_BUILD67_DESIGN_QA_2026-10-01.md`.

## Evidence

- `docs/MATCHRIM_BUILD65_CANDIDATE_2026-09-29.md`
- `docs/MATCHRIM_BUILD66_CANDIDATE_2026-09-30.md`
- `docs/MATCHRIM_FRIDGE_IDENTITY_BENCHMARK_2026-09-29.md`
- `docs/qa-evidence/matchrim-build65-mobile-2026-09-29/automated/real-five-release-summary.json`
- `docs/qa-evidence/matchrim-build65-mobile-2026-09-29/automated/ui-qa-results.json`
- `docs/qa-evidence/matchrim-build65-mobile-2026-09-29/automated/fridge-identity-score.json`
- `docs/qa-evidence/matchrim-build65-mobile-2026-09-29/automated/fridge-trace-contract-report.json`
- `docs/qa-evidence/matchrim-build65-mobile-2026-09-29/automated/fridge-trace-contract-score.json`

Selected redacted physical-QA screenshots are versioned under `docs/qa-evidence/matchrim-build65-physical-2026-09-30/`. Raw/private screenshots, complete `.xcresult` bundles, OCR payloads, hashes and source-image paths remain local and uncommitted.

## Residual

- Apple processing/readback; the browser session requires a fresh App Store Connect login.
- Build 65 should not be assigned more widely until cabinet identity is measured with the corrected trace in isolated staging.
- Physical camera and Photo Library open/return are covered. Fresh permission allow/deny and spoken VoiceOver remain open because the existing user state was not reset.
- Build 66 fixes the Bodega/Profile safe area and eight undersized controls in simulator/layout QA; Apple accepted its upload and physical-device confirmation remains required before wider rollout.
- Isolated staging has the three required functions active at version 1, but lacks `LOVABLE_API_KEY`; no fixture was sent to a known failing path.
- After that secret is configured: traced staging reconciliation of final box/crop/result, then OCR/canonical resolution and confidence calibration for cabinet scenes.
- iOS deployment target must move from 14 to 15 before April 2027.
