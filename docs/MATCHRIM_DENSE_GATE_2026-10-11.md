# Dense scene gate, 2026-10-11

Local remediation on baseline5431cff / simulator candidate78. No new vision request, deployment, TestFlight action or source-photo ingestion. The Oct8 benchmark and its call ledgers remain unchanged.

## Changes

- Bounding boxes intersect their original extent with the photo. A negative origin no longer shifts/expands a box onto its neighbour. Missing/empty numeric fields are rejected.
- Crops clip all four edges before pixel rounding. Recognition uses padding of8% of the narrow box dimension, capped at1% of the image, instead of adding2% of the entire scene on every side. The actual crop box/pixel extent accompanies the original detection box in the request.
- Regions below64 native prepared-image pixels on the short side are deferred before OCR. Upscaling or manual retry cannot bypass this floor. Detector-reported poor legibility defers automatic analysis but can be reviewed and explicitly retried. Extreme brightness/contrast is checked on the crop before recognition.
- Up to12 regions are selected automatically by existing legibility/confidence ordering. Every detected region remains accessible. Unprocessed regions have a distinct `deferred` state and reason; they are not recognition failures, identities or bottle counts.
- A per-scan cap of24 Edge POST attempts includes detector refinements, recognition retries and catalog lookups. Explicit single-region retries have a separate cap of4. This bounds client Edge requests, not hidden provider fan-out or currency cost. No provider pricing claim.
- Only the selected outline is drawn; clustered numbered pins remain. The list also exposes all unrecognized/deferred regions. Long detector notes are behind a disclosure. Manual retry cancellation no longer rejects an unhandled promise.

These thresholds are operational safety defaults, not calibrated readability probabilities. Deferring48 regions reduces automatic recall/coverage until the user reviews or supplies closer photos; it must not be advertised as better recognition accuracy.

## Before/after evidence

| Case | Before | Local result |
| --- | --- | --- |
| Negative box x=-5,y=-3,w=10,h=8 | Incorrect0,0,10,8 | Correct intersection0,0,5,5; red test reproduced first |
| Left/top crop10% with2% padding |14% width/height |12%, no shifted padding |
| Ontario dense scene |60 recognition calls +3 detectors;0 identities |12 recognition +3 detectors;48 explicitly deferred |
| Second dense scene |39 regional recognition calls |12 recognition calls,27 deferred;21 total intercepted calls including catalog |
| Tiny region |No native-pixel preflight |0 OCR calls; manual retry also0 |
| Poor detector legibility |Automatically sent |0 automatic OCR;1 after explicit review in UI fixture |
| Repeated HTTP503 |Unbounded per-scan total |Stops at24 attempts including detector; remaining regions deferred |
| Cancellation |Manual retry could leak an abort rejection |Cancelled UI stays cancelled;0 page exceptions |

The dense response fixtures were recorded on Oct8. Their old OCR outputs are replayed against changed client crops solely to exercise UI/contracts. They do NOT establish what a model would recognize from the new crops. New precision/recall and exhaustive physical count are deliberately unreported.

## Verification

- Focused boundary/crop/policy/budget/deduplication regressions PASS. Existing multi-wine normalization checks PASS;47 identity,58 routing and23 evidence checks PASS.
- Mobile8/8:2 recorded scenes x portrait393x852 / landscape852x393; synthetic tiny-region, poor-legibility, repeated503 and cancellation cases.0 horizontal overflow,0 page exceptions,0 outgoing remote requests.
- Selected screenshots visually inspected: numbered clusters without60 overlapping rectangles, scrollable bottom sheet and accessible pending list. This is mobile Chrome with the native shell flag, not iOS VoiceOver/camera certification.
- Typecheck PASS; focused ESLint0 warnings/errors; web build PASS with inherited chunk-size/Browserslist warnings.
- Native binary unchanged in this batch. Candidate78 baseline remains preserved; a subsequent combined candidate needs a fresh iOS build and device gates.

## Reproduce and artifacts

```bash
npx tsx scripts/check-matchrim-dense-gate.ts
npx tsx scripts/check-multi-wine-scan.ts
npx tsx scripts/replay-matchrim-dense-policy.ts
npm run test:identity
npm run typecheck
npm run build
```

Mobile runner: `scripts/qa-matchrim-dense-policy.py --corpus <matchrim-challenge-20261008> --output <new directory>`, local port4432 managed by the webapp-testing `with_server.py` helper. All external requests are intercepted. Fixture provenance: `qa/fixtures/dense-scan-oct8.json`, original response SHA256s retained. Source images/rights remain in the existing challenge manifest; no photos added to Git.

Portable results/screenshots: `docs/qa-evidence/matchrim-dense-gate-2026-10-11/`.
Full local artifacts: `/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim-dense-gate-20261011/ui-final`.

## Residual gates

- New crop recognition, independent physical box/identity annotation and calibrated quality thresholds require an approved isolated live benchmark; no remaining vision budget consumed here.
- Detection union/physical-count accuracy is not newly certified by the conservative boundary fix or synthetic overlap tests.
- Server-side quota enforcement/provider fan-out and latency/memory on physical iOS remain unmeasured. Local intercepted timings must not be called provider latency.
- Dense-scene automatic cap is a local product tradeoff pending real recall/utility validation, not release approval.
- Apple invitation remains owner intervention. No login attempt, invitation or upload in this assignment.
