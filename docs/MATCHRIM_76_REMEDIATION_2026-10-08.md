# Matchrim: uploaded75 and separate remediation76

## Release facts

The owner explicitly requested upload75 plus bug fixes. Apple accepted Matchrim1.0(75) on 2026-10-08 at10:39:36 Europe/Madrid. xcodebuild returned0 with Upload succeeded / Uploaded package is processing / EXPORT SUCCEEDED. Internal testing only. Browser login is required to verify processing completion or tester availability. No public App Store submission, additional tester invitations, web publication or backend deployment occurred in this batch.

Uploaded source: f5a37da968da202bd1dafd9eae05ae935d4939bc.
Local candidate75 IPA SHA256: b919ded2d72fe476c6a53a1cd39cef6270222f7a25d5630cfb899fefdc51c4d6.
Upload log/receipt: `/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim75-testflight-20261008`.

All changes below are separate build76 work, NOT changes to the uploaded75 binary. Versioned backend routing stays catalog75 / affinity73 / vision72; native build numbering is independent of that contract.

## Defects Fixed

| Case | Before | After | Evidence |
| --- | --- | --- | --- |
| One regional detector tile fails after retry | All successful tile detections discarded; only original full-image results retained | Successful tiles retained with full-image detections; coverage partial, unknown estimated total and confidence | Contract tests and mobile functional QA |
| All regional tiles fail | Could leave an unqualified complete-looking result | Keep full-image results, mark partial, do not claim regional refinement | Contract test |
| Same literal menu row, model expands name | Duplicate Laurent Perriere Ultra / Laurent Perrier Ultra Brut | Merge only with matching literal heading, producer, nearby position, compatible vintage/type; keep literal spelling, lower confidence and clear affinity/sensory inference | Recorded response replay 17 -> 16 entries; no new model request |
| False merges | Risk of merging distinct references by winery | Different producer, vintage, source heading or distant position remain separate | Negative contract tests |

The literal heading is still OCR, not canonical catalog confirmation. Missing/ambiguous identity remains visible and must not be converted into a certain recommendation.

## Verification

Evidence root: `/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim76-remediation-20261008`.

- `verification.json`: release contracts, typecheck, lint, production web build PASS. Lint exits0 with107 existing warnings,0 errors; this is not a warning-free codebase. Build uses public anonymous production client configuration, no embedded fixtures. No web deploy.
- `ui/ui-qa-results.json`: 31/31 functional checks PASS, including privacy/safe areas, comparison2-5, identity correction, per-region tracing, partial-tile recovery, retry/cancellation, currencies, four menu images, landscape, accessible names/targets,125% text and offline retry. Model/backend responses are controlled fixtures.
- `ui/multi-label-partial-region-recovery-mobile.png`: successful areas remain available and partial coverage warning is visible.
- `menu-replay.json`: existing real-provider trace passed through baseline75 and corrected76 merge logic.17 ->16 rows. It does not establish new aggregate precision/recall or new provider latency.
- Native and recorded-response UI gates: see final addendum below.

## Final Addendum

- Native simulator: 6/6 PASS,0 failures,93.27s suite duration. Navigation/aiRIM, scan modes, cold launch/safe area, rotation/background, photo-picker return and basic accessibility. It is not an authenticated recognition E2E test or spoken VoiceOver session.
- `native-results.json`: simulator build/install/QA, signed Release archive and local IPA export all exit0. Archived CFBundleVersion verified76. Candidate76 has NOT been uploaded and the owner's physical phone has not been replaced with76.
- Local76 IPA SHA256: `7cd3d127c364a421213732b89d14f67ab8c0f3be2511b9f2644e26497d2e13fc`.
- `simulator-screens/98647865-A739-46DD-AEB7-4F8B1FBC000C.png`: aiRIM main-menu speech-bubble icon. Portrait and landscape screenshots visually reviewed.
- `recorded-ui/ui-qa-results.json`: targeted recorded-provider UI replay PASS.16 entries, disputed name remains literal, no inherited affinity in its detail. First attempt failed due to hardcoded row number in the test; corrected to the exact wine name and rerun successfully. The injected original HTTP500 is expected; this is not a new live failure.
- Functional screenshots and the recorded menu detail visually reviewed. No new horizontal overflow or overlapping result labels observed in these scoped cases; this is not proof for every device/text setting.

## Residual Gates

- Build75 was uploaded at explicit owner request despite the documented recognition quality hold. No claim that all product defects are fixed.
- Independent25 live benchmark remains the earlier intermediate75 result: precision77.25%, recall82.69%; not rerun on76. No new vision calls; original budget289/300 retained.
- Dense cabinet recognition remains partial; model-level OCR/identity recall is not fixed by client deduplication alone.
- Independent canonical annotations and human preference/ranking validation remain pending. Synthetic personas or a simulated year are not100/10000 actual users or their feedback.
- Full physical camera/fresh permissions, authenticated persistence, spoken VoiceOver and constrained-network/memory validation remain separate gates. Browser125% text is not full iOS Dynamic Type coverage.
- Apple warning: iOS14 deployment target will need to become15+ for uploads startingApril2027. No broad deployment-target change in this scoped remediation.

## Reproduce

Use `npm run test:release`, `npm run typecheck`, `npm run lint`, and `node scripts/build-matchrim-production-candidate.cjs <verified-public-client.env>`.
Use `scripts/replay-matchrim-menu-trace.ts <recorded-trace.json> [baseline-wineMenuScan.ts]` for offline comparison.
Functional UI runner is `scripts/qa-multi-wine-ui.py` against a local preview with `MATCHRIM_QA_EDGE_RELEASE=75`. For the recorded-response UI case set `MATCHRIM_QA_ONLY=recorded-menu` and `MATCHRIM_QA_MENU_TRACE=<trace.json>`.
Native build/export/QA commands and logs are in evidence-root `native.cjs`; export is local only, not upload.
