# Active Carta List: Price / Service / Provenance

MATCHRIM-HOY-20261012-04, initially clean at `72854aff092bd39727a1f4df1705d49a857b40fb`. One local delta outside the comparator: the active list's service filter, price ordering/maximum, value decision and ambiguous manual-price presentation. No03 replay, new corpus, vision, native/Apple or production action.

## Source And Route

`/escanear/carta-vinos` -> `pages/Scan` -> `components/wine-import/ScanHub` -> `WineMenuScannerSession`. Real `#scan-service`, `#scan-sort`, `#scan-max-price`, list buttons, editor and value panel are exercised. The other `pages/ScanHub` and helper-only tests are not substitutes.

Frozen original first-menu fixture SHA256 `c5cc2a486254a38155ff88b6d5dad08b2328ba053034a28e8e0ea89f244ea6e3`,03 contract bank `f4f7fbbf6ce5d19868baf78ff3983f8ca585a7fb1a070ca2386175d308e19fe5`, existing IMG_7547 JPEG `2b1da6ac2ab548346df754cc67a76b6d7a25cc28efb893564d49b9f7508c4194`. Recorded version `scan-wine-menu-2026-10-05-no-placeholder-v9`, trace `1663ee58ffdbecbc6b058b11c563516212884d933bfa904f7d4916d54518fc44`. One scene,34 reading proposals/16 merged replay choices, not physical bottles or independently verified canonical references.

Original currency remains null. EUR/GBP in03 contracts are explicitly synthetic, not extracted from Spanish language. A new BOTH contract combines existing full:5 copa25 and bottom:1 botella25 for the same named Barbaresco row within03 units; its ambos availability and EUR are synthetic, not an actual merged replay result or independently corroborated extraction. No new amount, identity, year, profile or sensory sheet. Manual25/35 are amounts already present in the frozen responses.

An initial baseline incorrectly assumed the replay Barbaresco row retained ambos; rendered readback showed copa. That valid single-format row was not changed to satisfy a test. Initial receipts are preserved, excluded from final denominators; BOTH was made explicit as the synthetic contract above before product edits. Other recorded/partial/literal-duplicate data remain frozen.

## Before / After

| Before | After | Why |
| --- | --- | --- |
| List used generic `wine.precio` after filtering Copa/Botella. Known bottle25/35 with generic null did not display, descend or pass maximum30 correctly. | Effective explicit format prices drive display, asc/desc, maximum and value.03 `wineComparisonPrice` / `wineComparisonPriceFormat` reused. | No glass/bottle borrowing or new resolver/model. |
| Whole-menu currency disabled the eligible EUR copa subset because another bottle row had GBP. | Currency basis follows otherwise eligible rows and the chosen service. Mixed bottle EUR/GBP stay incompatible. | No conversion or invented common currency. |
| Todos enabled monetary operations despite mixed/unknown units; previous maximum could hide unknown rows and a disabled price order remained selected. | No monetary basis without common unit/currency; changed basis resets cap and unsupported order. Disabled cap is not displayed as active. | Unknown rows cannot be classified cheap/within budget by fallback. |
| Explicitly inferred copa service entered the list's availability filter. | Shared price-evidence adapter withholds inferred availability/format prices in both list and comparator. | Only the carried explicit service participates; absent/unflagged source validation is a separate real-data gate. |
| Ambiguous both/unknown/inferred manual amount had no provenance and could silently retain old per-service amount in comparison. | Manual origin plus pending-format flag; read service amounts retained internally, but withheld from monetary decisions while pending. Visible pending status in editor/list. | Do not assign a manual amount to both units or present old amount as applied correction. |
| Pure active value hook would accept a raw model score if it reached isolated state. Actual UI already had no winner because upstream evidence cleared scores. | Value requires catalog-sourced canonical affinity, calibrated flag, confirmed identity and common effective price basis. | Contract hardening, not a claimed new production/value false-positive incident or positive taste result. |
| Delayed smooth result scroll moved a dropdown outside viewport during two real UI journeys; cap reset also sampled a transient old amount. | Immediate result positioning, synchronous service-change cap reset and unavailable-cap display guard. | Controls remain reachable; no forced clicks or timing sleeps to obtain PASS. |
| Value fallback blamed price only when an explicit bottle-price context lacked accredited affinity. | Names missing affinity or comparable format/currency price. Singular list count corrected to1resultado. | Abstention describes the evidence gap rather than implying OCR-price failure. |

Modified three product files: `WineMenuScanner.tsx`, `scanWineEvidence.ts`, optional manual-price metadata in `wineMenuScan.ts`. Comparator workspace/helper, detector, OCR/matching, source corpus, learned-profile weights and backend untouched. Price adapter carries the same03 semantics and newly masks pending manual amounts. Identity-invalidating tail remains unchanged; no learning/write side effect is added.

## Expected / Actual

| New flow | Contexts / main assertions | Baseline | Final |
| --- | --- | --- | --- |
| Recorded null currency, partial/literal duplicate, Copa/Botella |2 /26 | Inferred service admitted,2 failed assertions |26/26 PASS |
|03 prices-only contract, mixed Todos, asc/desc/max and return |2 /36 | Generic price losses and stale monetary state,12 failures |36/36 PASS |
|03 EUR/GBP, eligible EUR copa vs mixed bottle subset |2 /26 | Whole-menu currency blocks eligible copa,2 failures |26/26 PASS |
| Synthetic BOTH manual35 |2 /24 | Missing provenance and old amount used,6 failures |24/24 PASS |
|03 unknown service manual25 |2 /24 | Missing provenance,4 failures |24/24 PASS |
| Recorded inferred service manual25 |2 /24 | Missing provenance,4 failures |24/24 PASS |

Complete baseline0/12 contexts,130/160 assertions pass,30 failures. Final main12/12,160/160. The first after run9/12 exposed two dropdown action timeouts (not app crashes) and one transient-cap assertion. Changed shared controls affected all twelve flows, so only this new04 matrix was rerun after that local control fix. Earlier03/other green suites were not rerun.

Two final DOM-focused value-panel contexts at an explicit bottle-price basis add6 assertions: no winner button, honest missing-affinity/comparable-price message, no errors/writes. Copy baseline0/2 with two wrong-cause failures; final2/2. Total final14 unique flow/viewport contexts and166 assertions, not14 sources, users or live OCR outcomes. A preliminary all-format panel inspection is separately retained and not added to denominator. The main matrix's broad no-score check is not presented as full value-panel verification; the focused card DOM assertions provide that evidence.

15 complementary contracts use TypeScript AST extraction of the actual active list/value hook factories:4/15 baseline ->15/15 after. Position projection is deliberately ignored in these pure tests. The model71% recorded score is a negative input, never a fabricated catalog-positive fiche. No positive personalized value UI result is claimed without a trusted sheet/profile. Comparator/display base ordering and row indexes remain stable; filtering/sorting does not reorder the original scan array or alter selected references.

393x852 portrait and852x393 landscape, anonymous isolated Chromium/native shim, reduced motion/touch, service workers blocked, analytics disabled. Interception installed before navigation; SDK-looking paths are locally fulfilled intentions, not remote calls. No extra requests from main filtering/editing, unchanged storage/learning hash, no REST mutations or console/page errors; no horizontal page expansion. Role/status and readable wrapping are browser evidence, not physical VoiceOver/Dynamic Type certification. Fixed navigation can appear in component captures; they are not a global unoccluded-native-screen approval.

## Build And Evidence

Initial typecheck/full lint/build exit0; lint0 errors/106 existing warnings, build6.991s. Control-follow-up contracts/typecheck/focused lint/build exit0,6.611s. Final render-copy-only delta: changed-source lint/build exit0,6.426s; focused panel2/2. Source snapshots distinguish first-after, final-main-before-copy and final source. No native version/build/install.

- [Versioned before/final receipts, captures and SHA256 manifest](qa-evidence/matchrim-menu-list-2026-10-12/)
- [Bottle maximum30: known25 row](qa-evidence/matchrim-menu-list-2026-10-12/final/prices-portrait-bottle-max-list.png)
- [Ambiguous manual amount](qa-evidence/matchrim-menu-list-2026-10-12/final/both-landscape-manual-pending-list.png)
- [Honest value abstention](qa-evidence/matchrim-menu-list-2026-10-12/value-cause-final/portrait.png)
- Main `scripts/qa-matchrim-menu-list-oct12.py`; focused `scripts/qa-matchrim-menu-value-panel-oct12.py`; pure `scripts/check-matchrim-menu-list-oct12.ts`.

104 evidence hashes verified,76 PNGs,9 final source/input hashes and6 baselines. Five-file snapshots identify the first-after and final-main stages; the last product change is render copy only, verified by the focused panel. TypeScript AST comparison confirms the03 identity-invalidating tail byte-identical to baseline. Raw command output retains its original whitespace.

Use the existing Playwright Python environment and server wrapper with `VITE_APP_ANALYTICS_ENABLED=false`, port4451, main harness and a new output path. Source hashes are checked before navigation; do not regenerate03 bank/image. Focused harness uses the same bank and explicit bottle filter. No provider key or remote permission needed. Original owner image/private annotation is not copied into this new portable bundle.

## Remaining Boundary

Next concrete local gap: manual price/unit provenance leaving this volatile scan state through `saveScannedWine`/Bodega, plus a user action to resolve pending manual units. The current save boundary still has its own generic EUR-price payload; this block performs no writes and does not approve persistence or price-source retention. Keep that distinct from the completed list/comparator decision gate. Invalid/extreme numeric entry, broader filter combinations and physical accessibility are not exhaustively covered here.

Live OCR/canonical identity, qualified price/service/column ground truth, verified sensory coverage, human recommendation outcomes, hosted owner isolation/idempotency and physical/native/distribution gates remain. No global percentage or release approval. Prior baselines/corpora/holdouts/ledgers, commons-355816 exclusion and28 historic calls unchanged. No provider/app remote calls, budget/reset, account/secret, native/global SDK/phone/Apple/invite/TestFlight, push/deploy/production action. Previous Apple handoff is unchanged and not re-asked. Only04 completed.
