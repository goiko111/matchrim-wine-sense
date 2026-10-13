# Human identity review is not model confidence

Hour blockB,2026-10-13; baseline6d9fcad4cf6aa4a936b6c50e056296e0c7b80bf1. Local only; no provider/native/release action.

| Before | After | Why |
| --- | --- | --- |
| Manual create/edit/confirmation displayed100% identity and100% reading in aiRIM | Detail says Por ti/Manual; aiRIM says Identidad revisada por ti | Human authority is not model probability |
| Manual row called Nombre leido | Identidad confirmada por ti | Do not claim OCR read what the user entered |
| Comparator shows human identity as100% confidence | Reviewed-by-user reason and table label | Trace recommendation inputs independently of affinity |
| Manual resolution increases automatic analyzed count | Separate current-outcome manual category | Deferred region identified by a person is not an OCR result |

Confirmation now assigns source manual (as create/edit already did). Backend normalization still rejects source manual claims by converting them to label: the review signal comes from local explicit UI action. Existing internal confidence1 remains an operational authority/ranking weight, not a calibrated statistic; no affinity, ranking, pricing or sensory calculation is changed. Human flag is optional and default paths remain unchanged. The partition is current region outcomes, not cumulative historical request throughput.

## QA / Evidence

Six create/confirm/edit routes x393x852/852x393. Before30/66, first after66/66, final72/72 with six actual-visible responsive-surface checks. Portrait uses the visible primary recommendation, landscape uses confidence matrix. One initial visual extension tried to scroll the intentionally hidden desktop table in portrait and had three harness exceptions; retained separately, not an app defect. No forced input/event/React mutation.

112/112 contracts: raw backend cannot forge manual source; actual confirmation/correction provenance;14 status/error partitions; plural/selected-candidate counters;30 aiRIM default-output parity vectors and human path;18 comparison default-output parity vectors and manual text/unchanged-order probe;42 protected sources. Complete core multiWineScan source equals baseline except one manual-source assignment in confirmation helper. No detector/dedup/OCR/crop/request/budget/retry/cancel/price changes.

App/tooling typecheck0; scoped lint0errors0warnings; local build0 Vite5.4.10/3635modules/6.45s/146 compiled hashes. Existing build warnings unchanged.1830 prior evidence entries/manifests intact. No unrelated green suites replayed.

Evidence /Users/GOIKO/2matchrim76-recognition-20261008/docs/qa-evidence/matchrim-manual-provenance-2026-10-13:109 SHA entries plus manifest,75 PNGs including initial/repeated runs,18 final captures. Before/after function-body and crop hashes identical:1profile/1detect/4analysis/3catalog per route. Zero real remote calls/writes/accounts/paid calls and unexpected console/runtime diagnostics.

![Human review in detail and aiRIM](/Users/GOIKO/2matchrim76-recognition-20261008/docs/qa-evidence/matchrim-manual-provenance-2026-10-13/manual-after-visual/confirm-portrait-manual-detail.png)

![Actual mobile comparison human provenance](/Users/GOIKO/2matchrim76-recognition-20261008/docs/qa-evidence/matchrim-manual-provenance-2026-10-13/manual-after-visual/manual-portrait-manual-comparison.png)

## Limits

Exact existing local vision contract and CC0 food-menu canary, null profile and empty catalog. Not a wine scene, real model precision, learned preference study or human validation. Detailed affinity component receives the review flag but these scanner routes retain insufficient-profile fallback; no positive learned profile/sensory dataset invented. Manual decision persists within current scan, not hosted storage/restart. Camera/permissions/native VoiceOver/Dynamic Type/provider/native/account release gates remain separate.
