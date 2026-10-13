# Matchrim: truthful region progress

Date: 2026-10-13. Baseline `cdcbbc472c88353768d5a1490038a266bcc9a986`.
Scope: local human-approved continuation, no publication/TestFlight/push/invitation.

## Result

The old `regions.length - summary.pending` counted deferred and failed regions as completed. The replacement derives a display-only partition from existing statuses: analyzed outcomes, active, queued, failed, deferred and discarded. Analyzed does NOT mean successfully identified or recommended.

Only scanner import, derived memo and counter JSX change. The counter remains visible when ready. Existing shared summary, scoring, percent bar, quality/detection/refinement, crops, request budget/concurrency/retry, catalog, cancellation, saving, CSS and status transitions are unchanged.

| Before | After | Why |
| --- | --- | --- |
| Queue: 1 de 5 regiones, 3 en paralelo | 0 analizadas, 3 en curso, 1 en espera, 1 sin analizar | Deferred is not completed; distinguish active work from queue and concurrency capacity |
| Catalog held: 2 de 5 regiones | 1 analizada, 3 en curso, 1 sin analizar | Only one outcome is complete |
| Ready: no progress partition | 4 analizadas, 1 sin analizar | Partial analysis stays visible after completion |
| Terminal request error inflates completed count | Separate con error category | Do not imply a failed request produced an analysis |

## Expected / Actual

The exact same existing response contract and original image are used before/after in two fresh private browser contexts, portrait393x852 and landscape852x393. Synthetic local authentication is not a real account.

| Checkpoint | Expected | Before Actual | After Actual |
| --- | --- | --- | --- |
| Three analyses held, one queued, one quality-deferred | 0 analyzed / 3 active / 1 queued / 1 deferred | 1/5 displayed | Exact expected partition in both orientations |
| Three catalog requests held, ambiguous outcome complete | 1 analyzed / 3 active / 1 deferred | 2/5 displayed | Exact expected partition in both orientations |
| Ready | 4 analyzed / 1 deferred | Counter absent | Exact expected partition in both orientations |
| Mobile bounds / wrapping | No horizontal overflow; status text inside viewport | Existing analyzing text fits, ready counter absent | All three checkpoints fit |
| State semantics | Polite status, completed requests distinct from identified wines | Ready status absent | Status present at each checkpoint |
| Calls per context | 1 profile GET, 1 detect, 4 analyze, 3 catalog | Expected | Expected, payload/crop hashes identical |
| Errors / remote writes / accounts / paid calls | Zero | Zero | Zero |

Before16/26 checks; after26/26, 2/2 contexts. Six captures per run. Real Tab/Enter reaches gallery in portrait; real tap in landscape; the browser FileChooser selects the original file once per context. No forced input/reset/events or React state mutation.

## Automated Verification

- 27 pure state vectors, 81 checks: all statuses, unknown identity, terminal errors, stale nonterminal errors, singular/plural, empty, queue/held/ready, all deferred/failed/discarded, reanalysis, discard, mixed categories, sum invariant and no mutation.
- Complete scanner AST outside the exact counter normalizes to baseline after removing one import/memo; 2 checks. All45 protected source files byte-identical. Total128/128.
- App `npm run typecheck`: exit0. Targeted tooling TypeScript: exit0. Scoped lint including packaging script: exit0, zero errors/warnings.
- `npm run build`: exit0, Vite5.4.10, 3634 modules, 6.85s. Hash manifest of146 compiled files. Existing warnings: Browserslist data age and chunks>500kB. No dependency upgrade or native copy.
- All1649 prior evidence entries verified against unchanged manifests. No old green suites rerun.
- Two initial AST harness checks were127/128: cross-source print positions, then selecting the nested subtraction rather than the outer conditional. Corrected test only; both diagnostic receipts retained. No additional app defect or changed expected counts.

## Evidence

Directory: `/Users/GOIKO/2matchrim76-recognition-20261008/docs/qa-evidence/matchrim-region-counter-2026-10-13`.
Manifest: 33 SHA256 entries plus manifest, including12 PNGs, before/after results, original response payloads, 27 vectors, command receipts, source snapshots, protected-source/evidence checks and web-build hashes.

![Before: two completed claimed, local stubs only](/Users/GOIKO/2matchrim76-recognition-20261008/docs/qa-evidence/matchrim-region-counter-2026-10-13/before/portrait-catalog.png)

![After: one analyzed, three active, one deferred](/Users/GOIKO/2matchrim76-recognition-20261008/docs/qa-evidence/matchrim-region-counter-2026-10-13/after/portrait-catalog.png)

![After ready: four analyzed, one deferred](/Users/GOIKO/2matchrim76-recognition-20261008/docs/qa-evidence/matchrim-region-counter-2026-10-13/after/portrait-ready.png)

## Limits / Residual

This is real client preprocessing, gallery, cropping, orchestration and DOM rendering against intercepted HTTP responses, not real vision recognition. The original CC0 food-menu image is a lifecycle canary, NOT a five-bottle scene. No dataset regeneration, recognition precision/recall, provider latency, 100/10,000 real users, native permissions, Dynamic Type or VoiceOver certification is claimed. Null profile and empty catalog remain; no learned profile or affinity score is invented.

Original image SHA256 `9980c5e6b9d5e52f1783e2f26d1a97e22c0c2e1556e9e72919dd26fc34ece9a9`. Existing `scripts/qa-multi-wine-ui.py` response contract SHA256 `f2aa2924e48c8c2f6f0cbe45011e6ef92bda3cb17be14a645659b70a0343ae40`; exact payload/crop hashes unchanged.

Global progress bar still says estimated and reaches100 when the batch pipeline ends even if a region is deferred; the new adjacent partition makes that incomplete coverage explicit. No attempted redesign of that separate progress contract.

Local counter gate is closed. Real provider benchmark, native/hardware QA and release/account gates remain separate prior work, not satisfied by this check. TestFlight and invitation status unchanged; no owner/session recheck or transmission.
