# Matchrim 1.0 (81): beta upload

The owner explicitly authorized uploading the current incomplete product to TestFlight and adding the previously requested external tester. This supersedes the administrative upload hold for this beta only, not the remaining recognition, personalized-recommendation, hosted-persistence or physical-QA findings. Public web and backend deployments remain unchanged.

## Distribution Receipt

- Apple accepted upload on 2026-10-13 at **13:49:44 Europe/Madrid** (11:49:44 UTC).
- `xcodebuild` exit 0: `Upload succeeded`, `Uploaded package is processing`, `EXPORT SUCCEEDED`.
- Version **1.0 (81)**, bundle `wine.matchrim.app`, Xcode 26.0.1, SDK `iphoneos26.0`.
- Application source: `54ffa3c3e48e7910cf60184709c582739b589c13`, based on `86418ed`. The additional commit reconciles a historical QA guard with the already reviewed currency fix; it does not change application behavior.
- Local exported IPA SHA256: `c78c52213ad16bd05b6dccc27b50ae0d26906675ae3649398128abb0215f01ef`. The upload re-exports the same signed archive; this hash identifies the retained local IPA, not a separately downloaded Apple-processed binary.
- Export explicitly sets `testFlightInternalTestingOnly=false` and disables automatic build-number changes. The beta is eligible for external distribution, not an App Store publication.
- Processing completion, group assignment and availability to individual testers are **not yet verified**: the browser still requires Apple sign-in.
- Requested external tester is recorded in the private local receipt. Invitation is **not sent**, and no App Store Connect internal/admin role was granted.

## Included Work

All accumulated local application changes through `86418ed` are included: multi-region scanning and identity uncertainty/correction, menu/pin/list/comparison flows, source-grounded affinity and similarity, owner/lifetime and save-confirmation guards, onboarding, native navigation with aiRIM, mobile reflow, explicit glass/bottle pricing, original-reading provenance and exact currency precision. Missing sensory evidence remains pending rather than generating an unsupported percentage.

The independent cloud patch `3845c72` is **not integrated** into this beta. Previous local80 and historical uploaded75 are preserved. Existing production routing remains catalog75 / affinity73 / vision72. No fixtures, QA user accounts or synthetic model responses are embedded in the production bundle.

## Verification Matrix

| Gate | Expected | Actual |
| --- | --- | --- |
| Release regression suite | Exit0 | PASS |
| Explicit menu-price contracts | All123 pass | 123/123 |
| Grounded style contracts | All94 pass, price-only guards reconciled | 94/94 |
| Currency precision contracts | All180 pass | 180/180 |
| Typecheck | No errors | PASS |
| Full lint | No errors; inherited warnings disclosed | 0 errors / 106 warnings |
| Production web build/native copy | No fixtures; exact resource hashes | 146/146 resources match |
| Simulator compile | Current source, build81 | PASS |
| Native installed-app tests | Navigation/aiRIM, scan modes, launch/safe areas, gallery return, rotation/background, basic accessibility | 6/6, 0 failures, 0 skipped |
| Cold launches | Below5s in this simulator | 5 samples; max2.936725s |
| Signed archive/local export | Existing valid distribution identity | PASS |
| Exported signature/profile/resources | Strict signature, distribution profile, correct identity/version, exact hashes | 156/156 |
| Apple upload | Accepted by Apple | PASS; processing |
| Tester invitation | Sent to the explicitly requested tester | BLOCKED by browser sign-in; not sent |
| Real vision/personalization/hosted writes/physical device | Separate evidence required | Not rerun or approved by this batch |

Native QA ran on a new iPhone16Pro simulator, iOS26.0.1, UUID `324C640D-203A-4695-81DD-9568DB7BEDDD`. No owner-phone binary, existing simulator account, photo library or production data was replaced. This is not spoken VoiceOver, physical camera/permission QA, authenticated CRUD, independent model accuracy or human-preference validation.

### Reproduced Preparation Failures

Historical style guards initially reported90/94 because they compared intentional currency changes with an older source baseline. Only the reviewed price-file guards and currency-aware parsing initializer were reconciled; behavioral assertions remain intact. Final94/94 passes.

The isolated source copy initially omitted shared frontend/backend utility files; the copy inventory was corrected without changing application source. CocoaPods initially retained old absolute source paths; `pod install --deployment` regenerated the scratch project without dependency/lockfile changes. Documents-based build outputs carried Finder/file-provider metadata rejected by signing. Derived data/archive moved to `/private/tmp`, and metadata cleanup was limited to the scratch copy. Earlier failed logs/results remain preserved.

The first executable native test run passed4/6. Gallery/rotation stopped at an obsolete, unaccented privacy locator. The harness now uses the current accessible name and handles the guide before cold-launch timing. Full rerun passes6/6; no permission/privacy product gate was bypassed to achieve this.

## Evidence And Reproduction

Private local evidence root:

`/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim81-testflight-20261013`

- `candidate.json`, `preparation-results.json`, retained earlier failure logs, release/typecheck/lint/contract logs.
- `native.cjs`, `prepare.cjs`, `verify-signature.cjs` and explicit local/upload export plists.
- `simulator-result.json`, `archive-result.json`, `export-result.json`, `qa-result.json`, `upload-result.json` and corresponding logs.
- `signature-verification.json`, `Matchrim-1.0-81-beta.ipa`.
- `native-qa-final.xcresult`, six exported native screenshots and `native-screens/manifest.json`.
- `RECEIPT.md`: private distribution/tester status, without storing Apple credentials.

The archive used for upload is `/private/tmp/Matchrim81-20261013-build/Matchrim-1.0-81.xcarchive`. The scratch source is `/private/tmp/Matchrim81-20261013-native`. Build with the production-candidate helper using only a validated anonymous production client key, regenerate local Pods with the existing lock, and override `CURRENT_PROJECT_VERSION=81`. Preserve the current assets/profile/evidence and select a fresh number before any future upload; **do not upload81 again**.

## Remaining Gates

1. Complete Apple browser sign-in, verify build81 processing, configure its test notes/group and invite the existing requested external tester. Do not treat upload success as delivery of an invitation.
2. Review/integrate the cloud patch against local scanner lifecycle, pins/comparison, price and editing changes; run combined regressions on a separate next candidate.
3. Independently validate real dense-image identity/coverage and catalog sensory coverage/personalization. No new paid provider calls, corpus regeneration or fabricated real-user study occurred here.
4. Verify authenticated hosted writes/ownership/ambiguity and physical permissions, Dynamic Type, spoken VoiceOver, constrained network and memory attribution separately.
5. Apple warns that the iOS14 target must be15+ for uploads from April2027. This beta was accepted; deployment-target migration is a later scoped change.

### Suggested Beta Notes (Not Yet Posted)

Prueba etiquetas individuales, varias botellas, cartas y pizarras; revisa los nombres dudosos antes de guardar. Comprueba comparacion de2-5 vinos, aiRIM en el menu inferior, edicion continua, precios por copa/botella y monedas. La afinidad o los parecidos pueden quedar pendientes si falta una ficha sensorial verificada. Las vitrinas densas aun pueden tener cobertura incompleta. Guardar no es puntuar ni entrenar el perfil. Envia captura, imagen original elegida y resultado esperado cuando detectes un error, sin personas ni datos sensibles.
