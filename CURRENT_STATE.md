# Matchrim current state

Updated: 2026-09-29

## Release

- Latest uploaded version: Matchrim `1.0 (65)`.
- App Store Connect accepted the upload and reports the package as processing.
- Exact archive: `/private/tmp/Matchrim-1.0-65-final.xcarchive`.
- Bundle/team: `wine.matchrim.app` / `8X3XTD6XYX`.
- The Lovable/web line remains pinned to `08e12fb`; no web or Supabase deployment was performed.

## Product

- Native bottom navigation: Inicio, aiRIM, Escanear, Bodega and Perfil.
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
| Multi-bottle cabinet | PASS: 30 regions; identity precision not canonically annotated |
| Multi-label/menu visual suite | PASS 27/27 |
| TypeScript, unit/contracts, production build | PASS |
| ESLint | 0 errors, 105 existing warnings |
| iOS simulator build and Release archive | PASS with Xcode 26.0.1 |
| App Store Connect upload | PASS |

Runtime versions observed: `matchrim-region-detector-v3`, `matchrim-region-analysis-v3-grounded` and `scan-wine-menu-2026-08-26-grounded-v3`.

## Evidence

- `docs/MATCHRIM_BUILD65_CANDIDATE_2026-09-29.md`
- `docs/qa-evidence/matchrim-build65-mobile-2026-09-29/automated/real-five-release-summary.json`
- `docs/qa-evidence/matchrim-build65-mobile-2026-09-29/automated/ui-qa-results.json`

Private screenshots, raw OCR payloads, hashes and source-image paths remain local and uncommitted.

## Residual

- Apple processing/readback and assignment to the internal tester group.
- Human physical-iPhone pass for camera, photo permission and VoiceOver.
- Independent canonical annotation for every bottle in the cabinet scene.
- iOS deployment target must move from 14 to 15 before April 2027.
