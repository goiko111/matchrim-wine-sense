# Matchrim current state

Updated: 2026-09-29

## Candidate

- Version: Matchrim 1.0 (64), development-signed locally and uploaded to App Store Connect.
- The final grounded build was installed and launched on the paired iPhone 16 Pro Max `Goiko`.
- Simulator build and physical-device build both succeeded with Xcode 26.0.1.
- Dependencies and CocoaPods now resolve from this repository rather than an older checkout.
- No web or Supabase production deployment was performed.
- App Store Connect accepted the TestFlight upload at 10:38 CEST (`Upload succeeded`); Apple processing was still in progress at the last verified state.
- A readback was attempted again on 2026-09-28. App Store Connect redirected to `authResult=FAILED` before exposing the app list, so processing/tester availability remains unverified rather than assumed complete.
- The saved-wine and state-consistency fixes described below are a local post-upload delta. They are not part of the already uploaded build 64 and no replacement binary was uploaded in this pass.
- A detached rebuild proves that the archived build 64 web bundle is exactly source commit `1a54cda` (comparable tree SHA-256 `d6b9e4a5...027b`). Commits `8e546a2`, `182dd32` and the 2026-09-29 QA fixes are not in TestFlight.
- The current local candidate extends checkpoint `859241d` with recognition post-processing, a complete food-menu contract, calibrated learning confidence, a staged Bodega uniqueness migration and a guarded staging-load harness. None of this delta is deployed or in build 64.

## Product delivered

- Native bottom navigation: Inicio, aiRIM, Escanear, Bodega and Perfil.
- Inicio and Escanear are separate surfaces.
- Inicio shows up to three Winerim recommendations personalized with the learned profile. The local delta now excludes every saved identity without falling back to already saved wines, preserves a different vintage, and waits for cellar state owned by the active account.
- When all returned candidates are already saved, Inicio explains that state and opens Bodega; an empty catalog and a service failure retain distinct messages.
- aiRIM is prominent from Inicio and the persistent navigation, exposes its memory state and supports direct or guided decision flows.
- Bodega `wine-fit` and `similar-wine` intents now open a traceable contextual question instead of a broken route.
- Existing multi-label, menu/board, comparison and explainable-affinity work is preserved.

## Learning audit

The QA personas are deterministic in-memory fixtures. They do not create accounts or write production data.

| Persona | Before learning | After learning | Score | Samples | Confidence | Next after saving top |
| --- | --- | --- | ---: | ---: | ---: | --- |
| explorador-atlantico | blanco-redondo | rias-baixas-atlantico | 83 | 7 | 43 | tinto-frutal-ligero |
| clasico-estructurado | blanco-redondo | rioja-reserva-clasico | 81 | 3 | 25 | blanco-redondo |
| principiante-frutal | blanco-redondo | tinto-frutal-ligero | 85 | 3 | 22 | blanco-redondo |

All three profiles persist their own learned order and saved-wine exclusion after serialization. Assertions prevent one persona from inheriting another's order, verify that a saved 2020 does not hide 2021, and require a fully saved candidate set to return an explicit exhausted state. Database RLS independently restricts `quiz_results` and `user_wines` by `auth.uid() = user_id`.

## Real aiRIM response audit

The same anonymous question was sent to the real `ai-wine-chat` runtime for all three learned profiles: a wine for mushroom rice and roasted vegetables, up to EUR 30, with a main, safe and exploratory option. This path creates no account and performs no production database write.

| Persona | Main | Safe | Exploratory | Final latency | Missing evidence identified |
| --- | --- | --- | --- | ---: | --- |
| explorador-atlantico | Ribeiro white with restrained ageing | Godello | Light young Pinot Noir | 11.4 s | Mushroom type, seasoning and rice texture |
| clasico-estructurado | Rioja Reserva | Ribera del Duero Crianza | Penedes Pinot Noir with ageing | 9.2 s | Dish intensity, smoke and richness |
| principiante-frutal | Bierzo Mencia | Pinot Noir | Catalan orange wine | 9.0 s | Mushroom/vegetable type, intensity and cooking fat |

The first run exposed unsupported recommendation-confidence percentages such as 85% and 90%. Build 64 now sends shared evidence guardrails that require qualitative confidence, source separation, current-price verification and explicit missing data. The repeated real-runtime run used qualitative `alta/media/baja` confidence; the only remaining percentage is the separately calculated learning-confidence value.

## QA matrix

| Gate | Result |
| --- | --- |
| Unit and contract suite | PASS: classifier, learning, personas, multi-wine, 30 controlled scenes and 25 independent scenes |
| TypeScript | PASS |
| ESLint | PASS with 107 existing warnings and 0 errors |
| Production web build | PASS, 3,598 modules |
| Home and aiRIM Playwright | PASS 8/8 |
| Focused personalization/navigation Playwright | PASS 4/4: route separation, empty state, error state, aiRIM retry |
| Multi-label/menu mobile Playwright | PASS 27/27 |
| Portrait, landscape, Dynamic Type 125% | PASS |
| Basic accessible names and 44 px targets | PASS |
| Console errors | PASS, none |
| iOS simulator build and launch | PASS, 1.0 (64) |
| Signed physical build | PASS |
| Physical install, launch and process check | PASS, 1.0 (64) running |
| Real aiRIM persona responses | PASS 3/3 after confidence-grounding correction |
| Release archive identity and signature | PASS: `wine.matchrim.app`, 1.0 (64), exact web-bundle hash |
| App Store Connect upload | PASS: `Uploaded App` / `Upload succeeded` |
| TestFlight processing | In progress; browser session unavailable for the later readback |

The focused local rerun also passed TypeScript, targeted ESLint and a production Vite build (3,600 modules). Its synthetic 503s are expected error-state fixtures, not observed service incidents.

## Integral QA first lot

- 34/34 declared routes render locally at 430x932 with zero overflow, console errors or page errors after fixes. Authenticated routes only certify their anonymous guards.
- Ten deterministic personas cover cold state and 1/5/20 ratings. Seven sensory personas converge after 20; budget and occasion correctly do not mutate taste without ratings.
- Confidence now uses sample coverage, directional consistency and sensory diversity; timestamped profile deltas use recency. Four contradictory signals remain below 20% confidence instead of accumulating false certainty.
- Five consistent recent ratings move a changed preference into the top three at 60% confidence; sustained evidence makes it first at 73%.
- 1,000 local virtual model sessions remain isolated with p50 `0.0071 ms`, p95 `0.0190 ms`, p99 `0.0383 ms` and zero algorithm errors. This is not a staging/load result.
- Local fixes collapse duplicate recommendations, reject invalid wine UUIDs before Supabase, localize the 404 and restore Matchrim branding in account deletion.
- A storage-level canonical identity migration is prepared but intentionally unapplied; it aborts rather than merge ambiguous existing duplicates. Authenticated longitudinal E2E, actual staging load and physical iPhone camera/accessibility remain open.

## P0/P1 local remediation

- Food-menu source no longer caps output at eight. The candidate contract allows 60 rows, requires one dish per row, returns coverage/truncation metadata, deduplicates exact rows and conservatively splits the recorded six-dessert merge. The old response becomes 13 structured rows, but its real recall remains `0.2407` until a candidate deploy and new provider run.
- Independent detection-box replay improves precision from `0.6136` to `0.8438` while recall stays `0.9310`; fragment collapse is covered by regressions that preserve stacked bottles.
- Recorded independent identity remains below gate for multi-label: precision `0.5000`, recall `0.8889` in four identity-evaluable scenes. Printed lists (`0.9182/0.9439`) and boards (`0.9655/0.9655`) clear the aggregate threshold in that dataset.
- `scripts/load-matchrim-staging.ts` prepares the `10→50→200→1,000` ramp. Dry-run is the default; execution rejects production, requires preprovisioned staging users and never invokes paid AI.
- Current visual rerun: multi-label/menu `27/27`, route inventory `34/34`, zero overflow and zero console/page errors.

## Backend observation

Runtime preflight returned HTTP 200 for `detect-wine-regions`, `analyze-wine-region`, `scan-wine-menu`, `ai-wine-chat` and `matchrim-recommendations`. The recommendation runtime returned 12 home and 30 detail candidates. Supabase management access still returns 403, so deployed function versions were not changed or falsely certified.

## Canonical recognition gate

The real-backend matrix is now separated from controlled UI fixtures in
`docs/MATCHRIM_RECOGNITION_MATRIX_2026-09-28.md`.

| Category | Precision | Recall | State |
| --- | ---: | ---: | --- |
| Single label, 11 independent scenes | 0.7692 | 0.9091 | FAIL precision |
| Multi-label, 6 independent scenes (4 identity-evaluable) | 0.5714 | 0.8889 | FAIL; two scenes are count/grounding only |
| Supplied printed wine lists, 2 scenes | 1.0000 | 0.7083 | FAIL recall |
| Supplied dense boards, 2 scenes | 1.0000 | 1.0000 | PASS limited |
| Real photographed food menu, 1 scene | 1.0000 grounded results | 0.2407 | FAIL recall/segmentation |

The food-menu runtime returned HTTP 200 in `22.907 s`, with 13 of 54 visible dish
names covered in eight result cards and no ungrounded card. One result incorrectly
merged six desserts. The deployed runtime identifies itself as
`scan-food-pairing-2026-06-30-client-profile-v1`. No account or production write was
used.

## Evidence

- `qa-artifacts/2026-09-28-learning-airim/native-simulator-home.png`
- `qa-artifacts/2026-09-28-learning-airim/home-airim-qa-results.json`
- `qa-artifacts/2026-09-28-learning-airim/ui-qa-results.json`
- `qa-artifacts/2026-09-28-learning-airim/xcodebuild-simulator-workspace.log`
- `qa-artifacts/2026-09-28-learning-airim/xcodebuild-device-local.log`
- `qa-artifacts/2026-09-28-build64-testflight/airim-persona-responses-before-grounding.json`
- `qa-artifacts/2026-09-28-build64-testflight/airim-persona-responses.json`
- `qa-artifacts/2026-09-28-build64-testflight/Matchrim-64-final.xcarchive`
- `qa-artifacts/2026-09-28-build64-testflight/xcodebuild-archive-final.log`
- `qa-artifacts/2026-09-28-build64-testflight/xcodebuild-upload.log`
- `docs/MATCHRIM_RECOGNITION_MATRIX_2026-09-28.md`
- `docs/qa-evidence/matchrim-build64-recognition-2026-09-28/food-menu-real-backend.json`
- `docs/qa-evidence/matchrim-build64-personalization-2026-09-28/persona-simulation.json`
- `docs/qa-evidence/matchrim-build64-personalization-2026-09-28/ui-navigation-state-results.json`
- `docs/MATCHRIM_INTEGRAL_QA_2026-09-29.md`
- `docs/qa-evidence/matchrim-integral-qa-2026-09-29/build64-parity.json`
- `docs/qa-evidence/matchrim-integral-qa-2026-09-29/persona-longitudinal.json`
- `docs/qa-evidence/matchrim-integral-qa-2026-09-29/routes/route-inventory.json`

The simulator provides the reproducible visual gate. The physical-device gate covers signing, final installation, launch and a live process. Camera/gallery permissions and capture remain covered by the simulator/UI automation matrix; a human pass on the physical camera remains recommended while Apple processes the beta.

Apple returned one non-blocking warning: the current minimum target is iOS 14.0 and uploads must target iOS 15.0 or later starting in April 2027.
