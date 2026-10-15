# Matchrim QA90: Local Continuity

Window14:36Z-16:36Z, baseline`8f52291`. In progress, not product acceptance.
Independent assignment ledger: `docs/assignments/MATCHRIM-CONTINUIDAD-DOS-HORAS-20261015-90.md`.

## Block1: Independent Label Slots / Cross-Shelf Merge

Facts:
- The immutable white cabinet original is1320x1239, SHA256
  `778d4dcbbdb0c29127795f03d56afd87de9762326543a14e38be5b26d408e11f`.
  It is not the newer1600x1200 red cabinet. Legacy detector-ID annotation remains
  invalidated and unmodified; existing dataset and model ledgers are preserved.
- New private review defines37 front-facing label slots on original pixels,
  with shelf/label bounds/literal fragments and canonicalnull. Background necks
  and clipped/unbounded slivers are outside scope. This is agent pixel review,
  NOT an exhaustive physical inventory, blinded annotation or human validation.
- Seven actual Canvas contact sheets retain source-pixel evidence; zero remote
  requests. A hash-bound review overlay withdraws unsupported LADOUYS and01
  transcriptions. Enlarging the image does not create missing characters.
- Frozen QA89 real detector responses yield33/37 reviewed label slots at>=70%
  containment. Eight proposals contain multiple reviewed label slots. These are
  geometry observations, not identity precision/recall or false-positive rates.

Reproduced product defect:
- Two explicit bottle boxes from the recorded scene, one atx22.96/y10/w6.72/h57,
  one atx21/y73/w8/h25, merge into one88%-height crop. The vertical-gap fragment
  heuristic incorrectly treats separate bottle proposals as a detached label.
- New regression fails on8f52291 (one region versus two). The fix retains typed
  bottle membership and refuses merging a cluster containing vertically disjoint
  explicit bottle members. Explicit label fragments and overlapping tile pieces
  retain their established behavior; unknown legacy object types are unchanged.

Recorded-response delta, no new recognition:
-75 mapped proposals: normalization60->61, retained cap60unchanged.
-33/37 label slots remain covered; no slot-coverage gain is claimed.
- Two three-shelf merges become two-shelf proposals; zero three-shelf merges
  remain. All eight multi-label proposals still need review, including raw model
  boxes already crossing shelves. This fix does not solve the detector itself.
- No new canonical link, affinity percentage, physical bottle count or global
  precision/recall is certified. New source has not run paid inference or shipped.

Verification:
-10 typed geometry regressionsPASS,40 evidence/schema refusal checksPASS,
  existing multi-wine checksPASS, application typecheck and new QA-script typecheck
  PASS. QA scripts inherit existing application compiler policy, not a new global
  strict-null migration. The first extra-strict experiment exposed pre-existing
  OriginalSheet type refinements; production typing policy was not weakened.
- The first negative-contract run was slow in Node20 assertion source extraction.
  A trace-sigint diagnostic confirmed Acorn parsing assertion source, not an app
  loop or provider request. Explicit assertion messages remove that overhead;
 40 checks now finish promptly. Only the owned diagnostic process was interrupted.

Reproduction (private image/evidence paths are intentionally outside Git):

```bash
npm run test:scene90
node --import tsx scripts/audit-matchrim-scene90.ts --annotation ANNOTATION.json --review REVIEW.json --trace TRACE.json --run-results RESULTS.json --case multibottle-fridge-etiqueta --compare-baseline --output NEW_REPORT.json
MATCHRIM_PLAYWRIGHT_MODULE=PLAYWRIGHT_MODULE node --import tsx scripts/render-matchrim-annotation90.mjs --image ORIGINAL.jpg --annotation ANNOTATION.json --review REVIEW.json --output NEW_DIRECTORY --browser CHROMIUM
```

Private artifacts: recovered task
`artifacts/matchrim90-continuity-20261015/`:
`fridge-white-slots-r1.json`, `fridge-white-review-r2.json`, `white-contact-r1/`,
`white-contact-r2/`, `white-spatial-baseline.json`, `white-spatial-after-cluster.json`,
`white-spatial-comparison-r1.json`. Every audited source/review/trace has hashes.

## Block2: Red Cabinet / Spatial Batch Selection

Facts:
- The red cabinet original1600x1200 has SHA256
  `a7c4dba8e642bceb7fc9a97cc24f6165c5aff05f0e6dc8d087cec11ab9afbbb6`.
  Its68 selected bounded label surfaces span four heights, including three wine
  cartons. Neither68bottles nor an exhaustive scene inventory is claimed.
- Fourteen contact sheets were inspected before individual detector proposals.
  A hash-bound same-agent review withdraws unsupported cuvees/vintages/names,
  including Reserva,2022,PINTIA,TRITON and a neighboring HERAS CORDON attribution.
  Unknown fragments remain unknown. All canonical values remainnull.
- Contact-sheet rendering now resets the document and waits two paint frames;
  this fixes stale heading-prefix painting in the diagnostic browser. Actual
  crops and earlier sheets remain preserved. New14sheets have zero remote calls.

Reproduced product defect and decision:
- With the existing shelf-merge fix, frozen real replies normalize to78proposals.
  The reading-order prefix keeps60 and discards all useful lower-shelf proposals.
- Retain the same60limit, but round-robin occupied4x4spatial cells. Prefer detector
  confidence then legibility within each cell; restore reading order and compact
  IDs afterward. No box, confidence, candidate, analysis limit or API budget is
  manufactured/increased. Uncapped scenes are unchanged.

Expected/actual (>=70% reviewed-label containment, geometry only):

| Source / shelf | Before cap | Old prefix60 | Spatial60 |
| --- | ---: | ---: | ---: |
| Red top |10/13|10/13|8/13|
| Red middle |19/21|19/21|16/21|
| Red lower |12/20|0/20|12/20|
| Red bottom |0/14|0/14|0/14|
| Red total |41/68|29/68|36/68|
| White total |33/37|33/37|33/37|

This is a bounded allocation tradeoff, not identity precision/recall or a new
recognition run. Five upper labels lose coverage while12lower labels gain it;
seven net slots recover. The model did not propose covering boxes for the bottom
row at all: client allocation cannot recover absent evidence. Mixed-label
proposals remain (red2,white8), and canonical/sensory approval stays blocked.

Verification:322spatial-selection assertionsPASS, existing multi-wine checksPASS;
full targeted/type/lint verification is recorded in the delta receipt. Preserved
private red drafts/review/contact-r1/r2 and before/after selection audits are in
the QA90 artifact directory. No new model calls, catalog reads or device actions.

## Next Block

Audit food-menu availability/source-row semantics against the frozen BBQ result
and original pixels. Keep actual dish identity, availability, alternatives and
operational signage distinct. Production/public web, installed82, TestFlight85
and staging86 remain untouched; neither source-only correction is in binary86.
