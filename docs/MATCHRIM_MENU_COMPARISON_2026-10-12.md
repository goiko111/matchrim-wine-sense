# Active Wine-List Comparator

MATCHRIM-HOY-20261012-03, baseline `b8f0999f7c7b70b9836fb5f071870771bf05f5ba`, initially clean. Bounded local remediation; no repeat of02, corpus download, provider call, native diagnosis/build or distribution action.

## Active Route And Source

`App.tsx` -> `/escanear/:mode` -> `pages/Scan.tsx` -> `components/wine-import/ScanHub.tsx` -> `WineMenuScannerSession` -> `WineComparisonWorkspace`. `pages/ScanHub.tsx` is not the active route. The active carta view has an image/pins, list, detail drawer and expandable editor, not Escena/Comparar tabs. These tests use real Para mi/Servicio transitions and editor/list return; they do not invent or certify a tab workflow.

Existing `qa/fixtures/menu-food-evidence-oct8.json`, first case, retains34 reading instances over full/bottom/top/right-focus responses from `scan-wine-menu-2026-10-05-no-placeholder-v9`. Fixture SHA256 `c5cc2a486254a38155ff88b6d5dad08b2328ba053034a28e8e0ea89f244ea6e3`; original trace SHA256 `1663ee58ffdbecbc6b058b11c563516212884d933bfa904f7d4916d54518fc44`. Existing IMG_7547 JPEG SHA256 `2b1da6ac2ab548346df754cc67a76b6d7a25cc28efb893564d49b9f7508c4194`. No new image or copied owner original.

One recorded replay and three main synthetic contract variants all use that same image. Recorded currency is null; it is NOT inferred as EUR from Spanish text. Synthetic EUR/GBP assignments are contract inputs, never called extracted. Synthetic prices-only rows omit generic price but retain recorded per-service prices; no new amount, vintage, identity, sensory sheet or personal profile is invented. A fourth synthetic subset supports the focused two-row manual-price follow-up. Recorded service predictions disagree across crops; these readings are not independently verified extraction or canonical ground truth.

The replay retains16 comparison choices after merging reading proposals, not16 physical bottles or verified unique canonical references. The repeated literal Laurent Perriere Ultra is one comparison reference. Main synthetic cases have four rows. Price follow-up has two. No new precision/recall, calibrated confidence or taste outcome is measured.

## Before / After

| Before | After | Why |
| --- | --- | --- |
| Selected Barolo disappeared after changing its name; id included mutable name/producer. | Stable `menu-row-index` within the mounted scan batch. Edited row stays selected; four selections survive editor/list return. | The underlying scan array is not reordered by display sorting; editing a row must not change selection identity. This is not a cross-session canonical id. |
| Identity edits inherited the previous confidence, numerical affinity, attributes and canonical metadata. | Changed identity clears those fields and explicitly marks verification pending. Notes/price-only edits do not invalidate identity. | Manual text is not a newly verified catalog sheet. |
| Model-inferred sensory numbers appeared in the comparator with no trusted sheet. | Only catalog-sourced attributes on a confirmed menu identity enter comparison. | No fabricated ficha or personal percentage. Other full-card displays are not globally certified by this comparator test. |
| A recorded `servicio` explicitly marked inferred appeared as available by glass. | Inferred service and associated format prices are withheld at the comparator boundary. | Unknown availability cannot become confirmed just because a field contains a value. Missing inference flags still require real source review. |
| Any-format budget could treat copa/botella/unknown prices as equivalent; pure contract returned ready. | A shared explicit unit or chosen format is required for budget/value. Mixed-unit budget is unknown/provisional. No volume conversion. | There is no accredited glass-to-bottle normalization. |
| Per-bottle prices25/35 with absent generic price could not enable budget despite explicit bottle selection. | Currency/budget basis uses effective per-format prices. No bottle price is borrowed for glass, or vice versa. | Preserve the data already carried in `precios`. |
| Mejor valor remained selectable without affinity. | Disabled without affinity and compatible price basis. Mixed currencies remain unconverted and cannot establish a common value order. | A raw amount is not a verified affinity/price ratio. |
| Focused follow-up: entering25 in the editor still displayed old35 per bottle. | For an explicitly known single service, update that service price along with generic price. Unknown/inferred/multiple formats are not assigned a guessed amount. | The active comparison must respect a user's explicit correction without inventing a unit. |

## Matrix And Receipts

Native-shim mobile Chromium393x852 and852x393, touch enabled/reduced motion, isolated anonymous context, no profile/catalog sensory sheet. All nonlocal requests intercepted before navigation; service workers blocked and server analytics disabled. Remote-looking request paths are intercepted SDK intentions, not network calls. No tokens, request bodies, photo base64 or storage values are exported.

| Variant | Contexts / assertions | Before | After |
| --- | --- | --- | --- |
| Recorded complete/partial rows and duplicate literal |2 /44 |12 failed assertions |44/44 PASS |
| Synthetic common EUR with mixed/unknown service |2 /50 |14 failed assertions |50/50 PASS |
| Synthetic EUR/GBP |2 /44 |10 failed assertions; currency guard already passed |44/44 PASS |
| Synthetic absent generic price, retained format prices |2 /52 |16 failed assertions |52/52 PASS |
| Focused manual35 ->25 bottle price |2 /8 |2 failed assertions |8/8 PASS |

Main baseline:0/8 complete contexts,138/190 assertions pass,52 failures. Main after:8/8,190/190. Focused price follow-up:0/2 before,2/2 after,8/8 assertions. Together10 distinct contexts/198 assertions, not ten users/scenes or a global app suite. The main eight were not repeated after the isolated price-edit branch changed; exact pre-follow-up source hashes are preserved and final17 pure checks include identity invariants. Only the new price boundary was rerun.

An initial six-context baseline attempt stopped its observation after the edited row vanished from the table; that was a harness lookup exception, not an app page error. Original artifacts remain untouched. The observation was made tolerant of missing rows and the complete eight-context baseline above was captured before product edits. This first attempt is not added to the final denominator.

Selection2/4, removal/reselection, real mode/editor transitions, stable corrected row, no inherited confidence/sensory/affinity, price/service abstention, literal duplicate and currency preservation all pass. Comparing/editing creates zero extra SDK requests, no REST mutations and no localStorage/learning-key change; all contexts have zero console/runtime errors and no horizontal page overflow. These checks do not prove hosted persistence/RLS/account isolation or physical accessibility.

New pure money-boundary baseline4/8 ->8/8. Final17 pure checks add manual identity/price evidence invariants. The16 existing comparator assertions alone were extracted with the TypeScript AST and pass; the old mixed-unit ready expectation was corrected. The unrelated long scanner suite was not rerun. No positive personalized value UI test is claimed: the frozen catalog responses have no trusted complete sensory sheet/profile, so the real client correctly abstains.

Main typecheck/lint/build exits0; lint0 errors/106 existing warnings; build6.474s. After the price-only source change: typecheck exit0, focused changed-source/test lint exit0, final web build exit0/6.210s. Test-script delta lint exit0. Both sets of actual command receipts/logs are preserved. No new iOS candidate or version number.

## Evidence And Reproduction

- [Portable before/after evidence and SHA256 manifest](qa-evidence/matchrim-menu-comparison-2026-10-12/)
- [Corrected identity portrait](qa-evidence/matchrim-menu-comparison-2026-10-12/after/units-portrait-corrected.png)
- [Mixed currency landscape](qa-evidence/matchrim-menu-comparison-2026-10-12/after/currencies-landscape-money.png)
- [Manual price landscape](qa-evidence/matchrim-menu-comparison-2026-10-12/price-edit-after/landscape.png)
- Main harness `scripts/qa-matchrim-menu-comparison-oct12.py`; focused harness `scripts/qa-matchrim-menu-price-edit-oct12.py`; pure checks `scripts/check-matchrim-menu-comparison-oct12.ts`.

79 evidence hashes verified,52 PNG captures,9 final source/fixture hashes and6 baseline source hashes. `after-eight-tested-source.json` preserves the exact five-file source snapshot for the main eight-context stage; the final source manifest distinguishes the subsequent manual-price-only branch. No baseline artifacts were rewritten.

Use the existing Python Playwright environment and server wrapper with analytics off:

```bash
python /Users/GOIKO/.codex/skills/webapp-testing/scripts/with_server.py \
  --server 'VITE_APP_ANALYTICS_ENABLED=false npm run dev -- --host 127.0.0.1 --port 4450' \
  --port 4450 -- python scripts/qa-matchrim-menu-comparison-oct12.py \
  --output /absolute/path/to/new-menu-comparison-receipt
```

Run the focused price-edit harness with the same wrapper and a separate output. Both consume existing local files; neither needs provider credentials. The original owner image is not copied into this new portable bundle; captures are comparator/component or comparator viewport, with no full original or private annotation export.

## Remaining Gates

Next concrete local gap: the list-level Precio menor/mayor and menu value/filter decision outside this comparator still use their own generic-price policy. They need a separately measured format/provenance boundary, including price edits where service is both/unknown. Do not call that broader price sorting approved by this block.

P0 release gates remain live canonical identity and price/service source association, independently reviewed rows/boxes/unreadable cases, trusted sensory coverage and human affinity outcomes, hosted account persistence/isolation and real physical accessibility/performance. P1 local residuals include ambiguous multi-format manual price editing and reconciliation of contradictory unflagged model service readings. No blind normalization or positive taste claim was added to fill these gaps.

Prior corpora/holdouts/ledgers/baselines, commons-355816 exclusion and28 historical calls are preserved. No new paid calls, accounts, writes, budgets, reset, native tooling, owner phone, Apple/invitation, push/deploy/publication/TestFlight action. Existing Apple handoff and native gate remain separate, with no repeated login request. This completes only03, not the whole product or release.
