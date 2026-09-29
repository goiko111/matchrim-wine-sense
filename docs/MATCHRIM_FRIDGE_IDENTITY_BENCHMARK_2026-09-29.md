# Matchrim cabinet identity trace audit

Date: 2026-09-29

## Decision

The build-65 client completed the multi-bottle flow, but the authorized production report cannot support bottle-level identity precision/recall. The apparent `29 detector boxes / 30 analyses` mismatch came from the QA runner recording only the last detector-tile response while the client merged all successful tile responses before analysis.

The earlier provisional `0.000 / 0.000` result is withdrawn. It compared candidate results with the wrong spatial box set. Real cabinet identity metrics are **not computable** until an isolated staging run records the final merged box and crop fingerprint for every `region_id`.

No production function, web deployment, tester group or TestFlight distribution setting was changed.

## What the legacy run proves

- Fixture: `IMG_7605 2.jpg`; SHA-256 `778d4dcbbdb0c29127795f03d56afd87de9762326543a14e38be5b26d408e11f`.
- Real authorized run with no request interception or mocks.
- Runtime: `matchrim-region-detector-v3` and `matchrim-region-analysis-v3-grounded`.
- The client completed 30 region analyses and rendered independent region controls.
- The backend returned 20 named candidates and 10 abstentions.
- Several names are malformed or weakly grounded (`Akripta Bayanul`, `Grande Cloute`, `Hato Blanc`), so false-positive rejection remains a P0 concern.
- The report does **not** prove which visible bottle produced each name because it lacks final merged region boxes and crop fingerprints.

## Root cause of 29 versus 30

The old runner selected the last successful `detect-wine-regions` response:

1. the client requests `full` detection;
2. when refinement is needed, it requests overlapping `left/right` or `top/bottom` tiles;
3. the client maps tile-local boxes into full-image coordinates, deduplicates them and caps the merged set at 30;
4. the old report kept boxes from only the last network response, not the merged client set;
5. analysis calls therefore legitimately outnumbered the boxes in that report.

This is an observability defect in the benchmark runner. It is not evidence by itself of an extra phantom region in the product.

## Instrumentation added

Every analysis request now carries QA-safe trace metadata:

- `region_id`;
- `region_index`;
- final merged `region_box` in full-image percentages;
- the runner records a SHA-256 fingerprint and byte length of the crop, never the crop image itself;
- detector calls are listed by tile and response count;
- `detected_boxes` in new reports are reconstructed from the exact analysis requests.

The scorer refuses to emit precision/recall unless the ground-truth mapping is marked validated and every analyzed region has a final box plus crop fingerprint.

## Local alignment regression

Case `multietiqueta_traza_region_crop_resultado` uses three intentionally unsorted boxes. Expected and actual:

| Region | Expected x | Actual x | Crop | Result |
| --- | ---: | ---: | --- | --- |
| `region-1` | 8 | 8 | unique SHA-256 | Botella izquierda |
| `region-2` | 37 | 37 | unique SHA-256 | Botella central |
| `region-3` | 66 | 66 | unique SHA-256 | Botella derecha |

Result: PASS. The client sorts regions spatially, creates three different crops and attaches each response to the same region. No neighboring-result swap was reproduced locally.

The pure runner contract also proves that a last detector tile containing 2 boxes can correctly produce 3 final traced regions after merge. This prevents the old 29/30 reporting error.

The contract now emits a complete machine-readable report from the real cabinet image with mocked detector/analyzer responses. The scorer validates the source-image fingerprint, a one-to-one region set, exact final boxes and unique crop fingerprints before computing. Its local contract result is precision/recall/F1 `1.000 / 1.000 / 1.000` over 3/3 synthetic identities. These values measure trace alignment only; they are not OCR, canonical identity or provider-quality metrics.

Negative scorer regressions are also PASS: a different source-image hash, shifted box, duplicated crop hash or unexpected region makes the result `not_computable`.

## Isolated staging readback

Read-only Supabase CLI checks on 2026-09-29 confirmed project `qpbmqvfnunkylvtvnyyx` has these functions active at version 1:

- `detect-wine-regions`;
- `analyze-wine-region`;
- `scan-wine-menu`.

The same readback confirmed `LOVABLE_API_KEY` is absent. Both region functions explicitly require that secret, so no fixture was sent: a request could only exercise the known 500 path and would not measure vision. No secret, function, database row or deployment was changed.

## Recovery regression

Case `multietiqueta_recuperacion_compuesta` remains PASS on a 393x852 viewport:

- editing a candidate invalidates inherited affinity;
- discarding removes the region outline and pin;
- reanalysis calls only the selected region a second time;
- the new result replaces the prior correction;
- no console errors or horizontal overflow.

## Printed-list no-regression gate

No menu/OCR production code changed in this checkpoint. The last certified four-list gate remains:

| Fixture | Precision | Recall |
| --- | ---: | ---: |
| `IMG_7547 2.HEIC` | 1.000 | 0.938 |
| `IMG_7548 2.HEIC` | 1.000 | 1.000 |
| `IMG_7552 2.HEIC` | 1.000 | 1.000 |
| `IMG_7553 2.HEIC` | 1.000 | 0.969 |

The trace-only changes pass TypeScript and do not modify menu recognition, deduplication or grounding.

## Evidence

- Provisional annotation, explicitly invalidated for scoring: `qa/ground-truth/matchrim-fridge-identity-v1.json`.
- Refusal result: `docs/qa-evidence/matchrim-build65-mobile-2026-09-29/automated/fridge-identity-score.json`.
- Trace UI result: `docs/qa-evidence/matchrim-build65-mobile-2026-09-29/automated/region-trace-alignment-results.json`.
- Trace UI screenshot: `docs/qa-evidence/matchrim-build65-mobile-2026-09-29/automated/multi-label-region-trace-alignment-mobile.png`.
- Local trace ground truth: `qa/ground-truth/matchrim-fridge-trace-contract-v1.json`.
- Local trace report: `docs/qa-evidence/matchrim-build65-mobile-2026-09-29/automated/fridge-trace-contract-report.json`.
- Local trace score: `docs/qa-evidence/matchrim-build65-mobile-2026-09-29/automated/fridge-trace-contract-score.json`.
- Recovery result and screenshot remain in the same evidence directory.

## Reproduce locally

```bash
python3 scripts/check-matchrim-e2e-trace.py
python3 scripts/check-matchrim-fridge-scorer.py
npm run typecheck
```

The focused Playwright modes are `MATCHRIM_QA_ONLY=region-trace-alignment` and `MATCHRIM_QA_ONLY=identity-recovery-actions`.

## Hypotheses and next gate

1. **H1, confirmed:** 29/30 was caused by the runner observing one detector tile instead of the merged set.
2. **H2, not reproduced locally:** the client swaps neighboring results. The deterministic trace regression is green.
3. **H3, still open:** dense-scene crops are too broad, reflective or occluded, causing the vision provider to combine neighboring label text.
4. **H4, still open:** confidence calibration accepts named candidates without enough crop-local evidence.

Next action: configure `LOVABLE_API_KEY` in isolated staging, then run the instrumented build there, store only final boxes/crop hashes/results, manually reconcile them to bottle slots and compute real identity precision/recall. Only after that should a staged backend candidate be considered. Production, TestFlight and tester assignment remain untouched.

## App Store Connect readback

The build `1.0 (65)` upload remains proven by the Transporter success log. A read-only browser check could not refresh processing status because both available contexts returned `authResult=FAILED`. No login or distribution action was attempted.
