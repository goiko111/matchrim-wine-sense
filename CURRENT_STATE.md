# Matchrim current state

Updated: 2026-09-28

## Candidate

- Version: Matchrim 1.0 (64), development-signed locally and uploaded to App Store Connect.
- The final grounded build was installed and launched on the paired iPhone 16 Pro Max `Goiko`.
- Simulator build and physical-device build both succeeded with Xcode 26.0.1.
- Dependencies and CocoaPods now resolve from this repository rather than an older checkout.
- No web or Supabase production deployment was performed.
- App Store Connect accepted the TestFlight upload at 10:38 CEST (`Upload succeeded`); Apple processing was still in progress at the last verified state.
- A readback was attempted again on 2026-09-28. App Store Connect redirected to `authResult=FAILED` before exposing the app list, so processing/tester availability remains unverified rather than assumed complete.

## Product delivered

- Native bottom navigation: Inicio, aiRIM, Escanear, Bodega and Perfil.
- Inicio and Escanear are separate surfaces.
- Inicio shows three Winerim recommendations personalized with the learned profile and excludes wines already saved by the user.
- aiRIM is prominent from Inicio and the persistent navigation, exposes its memory state and supports direct or guided decision flows.
- Bodega `wine-fit` and `similar-wine` intents now open a traceable contextual question instead of a broken route.
- Existing multi-label, menu/board, comparison and explainable-affinity work is preserved.

## Learning audit

The QA personas are deterministic in-memory fixtures. They do not create accounts or write production data.

| Persona | Before learning | After learning | Score | Samples | Confidence |
| --- | --- | --- | ---: | ---: | ---: |
| explorador-atlantico | blanco-redondo | rias-baixas-atlantico | 83 | 7 | 58 |
| clasico-estructurado | blanco-redondo | rioja-reserva-clasico | 81 | 3 | 25 |
| principiante-frutal | blanco-redondo | tinto-frutal-ligero | 85 | 3 | 25 |

All three profiles persist their own learned order after serialization, and the isolation assertion prevents one persona from inheriting another's recommendation order. Database RLS independently restricts `quiz_results` and `user_wines` by `auth.uid() = user_id`.

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

The simulator provides the reproducible visual gate. The physical-device gate covers signing, final installation, launch and a live process. Camera/gallery permissions and capture remain covered by the simulator/UI automation matrix; a human pass on the physical camera remains recommended while Apple processes the beta.

Apple returned one non-blocking warning: the current minimum target is iOS 14.0 and uploads must target iOS 15.0 or later starting in April 2027.
