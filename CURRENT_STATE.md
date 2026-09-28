# Matchrim current state

Updated: 2026-09-28

## Candidate

- Version: Matchrim 1.0 (64), development-signed.
- Installed and launched on the paired iPhone 16 Pro Max `Goiko`.
- Simulator build and physical-device build both succeeded with Xcode 26.0.1.
- Dependencies and CocoaPods now resolve from this repository rather than an older checkout.
- No production deployment, App Store upload or TestFlight upload was performed.

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

## Backend observation

Runtime preflight returned HTTP 200 for `detect-wine-regions`, `analyze-wine-region`, `scan-wine-menu`, `ai-wine-chat` and `matchrim-recommendations`. The recommendation runtime returned 12 home and 30 detail candidates. Supabase management access still returns 403, so deployed function versions were not changed or falsely certified.

## Evidence

- `qa-artifacts/2026-09-28-learning-airim/native-simulator-home.png`
- `qa-artifacts/2026-09-28-learning-airim/home-airim-qa-results.json`
- `qa-artifacts/2026-09-28-learning-airim/ui-qa-results.json`
- `qa-artifacts/2026-09-28-learning-airim/xcodebuild-simulator-workspace.log`
- `qa-artifacts/2026-09-28-learning-airim/xcodebuild-device-local.log`

The simulator provides the reproducible visual gate. The physical-device gate covers signing, installation, launch and a live process; a hands-on camera/gallery pass on that device remains a human acceptance step before distribution.
