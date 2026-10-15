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

## Next Block

Apply the same pixel-first review to the newer red cabinet before examining its
frozen detector outputs. Test the upper-shelf cap hypothesis there; do not assume
that a cap caused omissions in IMG_7605, where the baseline normalized count was60.
Production/public web, installed82, TestFlight85 and staging86 remain untouched.
