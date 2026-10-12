# Active Comparator: Frozen Hugel Regression

Assignment MATCHRIM-HOY-20261012-02. Baseline `93ac4f8f2eb8b4fe55ee9d322d0f626ee3305be8`, clean before edits. Active route `/escanear/etiqueta` -> `MultiWineLabelScanner` -> `WineComparisonWorkspace`; no helper-only substitution.

## Findings And Changes

| Before | After | Why |
| --- | --- | --- |
| P1: editing down to one wine correctly showed abstention, but Escena -> Comparar silently selected three again in all five contexts. | Preserve the user's edited selection, including fewer than two items. Removed/unavailable ids are still filtered and the five-item cap remains. | A parent render supplies a new array; it must not undo a manual decision or replace abstention. |
| P1: the full `Gewurztraminer Vendange Tardive Hugel` choice clipped in all three portrait contexts (273px client width / 276px scroll width). | Choice name and producer wrap; portrait client/scroll widths are both273px. | Different Hugel references must remain distinguishable without selecting them first. |
| Partial readings were distinguishable through decision cautions only after selection. | Both partial choices show `Referencia por confirmar` and expose it via each checkbox's accessible description. | Identification confidence is not canonical confirmation or personal affinity. |

Only the active comparator component changed. No detector, grouping, matching, scoring weights, profile learning, saving, persistence or native configuration changes in this delta.

## Denominators And Isolation

One already frozen public scene contains four physical labels, not five or six photographed wines. Source: [Four Hugel bottle labels](https://commons.wikimedia.org/wiki/File:Four_Hugel_bottle_labels.jpg), Tomas er, [CC BY-SA3.0](https://creativecommons.org/licenses/by-sa/3.0/). Source SHA256 `e75177af42a27bfcb280fde79b43037bb98dcfff006a2a9ed099427a4debace2`; annotation-file SHA256 `257587d96322e7b7a93fcef3543338ee9b3ce15c8c87eadcb6813620c6be5808`. No download, new dataset, owner-media copy or remote image submission.

Three explicit synthetic response variants use the same frozen input: four literal references; those four plus an exact duplicate; those four plus two incomplete readings of existing literals. The duplicate/partial variants use synthetic grid proposals, not vision detections or additional ground-truth bottles. The90%/55% identity confidence values are injected test inputs, not calibrated model results. No catalog sensory sheet, personal profile, harvest year, price or service format is supplied.

Five isolated mobile browser contexts:393x852 portrait and852x393 landscape, native platform shim, touch enabled, reduced motion. Nonlocal requests are intercepted before navigation, service workers blocked, analytics disabled. Camera permissions, physical VoiceOver/Dynamic Type, real iPhone and actual network/provider behavior are not tested. All captures here are comparator-component screenshots, not full native screen captures.

## Expected / Actual

| Case | Expected | Before | After |
| --- | --- | --- | --- |
| Basic portrait, four references | Select2/4; edited1 survives tabs; longest name readable | FAIL: selection reset and clipping | PASS,16 checks |
| Basic landscape, four references | Same flow plus Servicio with no invented prices/scores | FAIL: selection reset | PASS,16 checks |
| Exact duplicate portrait | Four comparison choices; one group retains two regions | FAIL: selection reset and clipping; grouping already correct | PASS,17 checks |
| Six-proposal boundary portrait | Select5, sixth disabled; removal frees slot; partial-only provisional | FAIL: selection reset and clipping; limit/abstention already correct | PASS,23 checks |
| Six-proposal boundary landscape | Same boundary without clipping/overflow | FAIL: selection reset | PASS,23 checks |

Before:0/5 complete contexts,73/81 assertions pass, eight failures from two defects. After:5/5 complete contexts,95/95 assertions pass. The original81 assertions pass;14 added assertions check tile touch/minimum44px target and partial visible/accessibility descriptions. These are five test contexts, not five users, scenes or live recognition passes.

Same producer with four different names stays distinct. Exact duplicate remains one reference with region count2. Affinity cells stay unavailable; Mayor afinidad is disabled. Selecting only partial references displays provisional cautions, no final affinity recommendation. Comparing sends zero additional requests, performs no REST writes, and leaves localStorage keys/values hash unchanged. No runtime or console errors in any context. This proves the tested local comparator is non-mutating; it does not certify hosted learning/account isolation.

Typecheck log: no diagnostics. Lint:0 errors,106 existing warnings. Web build:exit0,6.341s, analytics disabled. No unchanged release suites, native compilation, publication, push, version increment or TestFlight upload in this local block.

## Evidence And Reproduction

- [Before/after JSON,24 captures, receipts and SHA256 manifest](qa-evidence/matchrim-comparison-2026-10-12/)
- [Five-reference portrait](qa-evidence/matchrim-comparison-2026-10-12/after/boundary-portrait-five.png)
- [Partial-only portrait](qa-evidence/matchrim-comparison-2026-10-12/after/boundary-portrait-final.png)
- [Servicio landscape](qa-evidence/matchrim-comparison-2026-10-12/after/basic-landscape-final.png)
- Harness: `scripts/qa-matchrim-comparison-oct12.py`; source hashes and manifests keep evidence separate from later code.

Run the harness with the existing frozen corpus, not a regenerated dataset:

```bash
python /Users/GOIKO/.codex/skills/webapp-testing/scripts/with_server.py \
  --server 'VITE_APP_ANALYTICS_ENABLED=false npm run dev -- --host 127.0.0.1 --port 4449' \
  --port 4449 -- python scripts/qa-matchrim-comparison-oct12.py \
  --corpus /absolute/path/to/matchrim-challenge-20261012 \
  --output /absolute/path/to/new-comparison-receipt
```

Use the existing QA Playwright environment. The corpus SHA check happens before navigation. No new provider key/call is needed.

## Remaining Gates

Next local gap: the active wine-list comparator with complete/partial rows, preserved price currency and copa/botella/unknown format, including selection after manual identity correction. This label-only block has no price/format data and cannot close that decision boundary.

Live canonical precision/recall, independently reviewed identity/count ground truth, verified catalog sensory coverage, human affinity outcomes, hosted persistence and physical accessibility remain open. Prior28 call allowance/ledgers/corpora/holdouts and commons-355816 exclusion are untouched. Native destination eligibility is still the previously documented blocker; unsigned80 is not an integrated current build. No global percentage or product/release approval follows from this local PASS.

Separately, the human-requested tester invitation was checked through the existing App Store Connect tab on Oct12. The session still requires Apple login; invitation NOT sent and latest eligible build NOT read back. Historical upload75 is not proof of current external availability. Owner completion of that existing login is the minimum next action; do not grant internal/admin access or invite to an unverified build. Apple login evidence stays in private local artifacts, outside portable public QA evidence.
