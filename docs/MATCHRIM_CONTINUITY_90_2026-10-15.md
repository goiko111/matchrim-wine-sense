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

## Block3: Food Availability / Large-Text Recovery

Facts and corrected behavior:
- Original BBQ pixels (SHA256`15a82f5bbaace92067533e1820ba3428b362561216de93cdaba4bbaa64cfff6a`)
  explicitly show COMING SOON, unavailable Sundays, weekends only and ASK US.
  The frozen real35-row response retains these text markers, but the old client
  offered the same pairing/bottle actions for every row.
- New pure source-text policy preserves every returned row. Two COMING SOON
  rows and one ASK US row do not offer pairing/save/aiRIM actions or seed carried
  dish context. A fourth row contains only`LG (1.5-1.75 LB)=$38`; its model-expanded
  Beef Ribs identity is not validated by that line and also needs clarification.
- Explicit day restrictions remain conditional, not an invented current-day
  stock decision. All other rows remain availabilityunknown, never available by
  default. Ordinary dish choices remain actionable as hypotheses, not verified
  in-stock dishes. Only source_text supplies markers; a generated name cannot.
- Summary/toast now count readings, not confirmed dishes. A menu with no eligible
  row cannot seed a dead dish-for-wine shortcut or carry an earlier menu by truthy
  fallback. General wine-menu scanning remains possible without a selected dish.

Visual finding and actual fix:
-200%text exposed an existing long nowrap button. It enlarged the mobile layout
  viewport487px while the visible width stayed393px, placing Profile offscreen.
  The old scrollWidth<=innerWidth check falsely passed this condition.
- Mobile food controls now grow/wrap within their container. The regression
  compares against document.clientWidth and measures all five44px navigation
  targets. No global navigation redesign or unrelated web styling change.
- Native-surface text200 now keeps all five links visible. Long nav labels wrap;
  exact iOS Dynamic Type/VoiceOver still needs native/physical verification.

Verification:
-68pure policy assertionsPASS, existing food client contractsPASS,
 20crop-orchestration testsPASS,40food robustness testsPASS, application types
  and scoped lintPASS. No taste weights, dietary claims or model prompt changed.
- `food-ui-r3`:8/8scenarios,124assertionsPASS. Original BBQ photo through the real
  upload controls; frozen real replies plus an explicit all-blocked fixture;
 320x568,393x852,852x393 and200%text. Full35rows preserved, unavailable actions
  absent, restrictions visible in the AX tree, source context filtered, all five
  nav targets fit, zero horizontal overflow/page exceptions/remote traffic.
- Preserve r1 and diagnostic failures: default local build attempted telemetry;
  all attempts were intercepted/blocked before remote writes. Safe r2/r3 use an
  invalid-only backend/key/catalog and analyticsfalse. No API/account/SQL mutation
  occurred. No earlier failure is relabeledPASS; r2preceded the final portion-line
  guard and r3covers final source.

Limitations:
- This is a conservative literal-marker safety net, not a semantic menu engine,
  exhaustive dish inventory, stock/date validation or new OCR result. Missing
  markers, inherited section restrictions and compound alternatives still need
  independent source review. The original board and model replies are unchanged.
- Canonical wine precision, real taste usefulness and physical device gates stay
  open. Production/public web, installed82, TestFlight85 and staging86 are untouched.

## Block4: Public Catalog Coverage / Nontransitive Deduplication

Free bounded public evidence:
- Exactly7GET200reads: one observed Library resolver and six unchanged literal
  queries from the red annotation. No credentials, images, SQL/model calls,
  retries or pagination. Private`library-coverage-r1.json` preserves responses,
  hashes, timing and source/review/plan binding.
- AVAN returns2Avancia wines (not AVAN). Muga returns2Flor de Muga wines, not a
  validated identity for the photographed red. WHISBA returns0records in this
  source, not proof of nonexistence. Bosque de Matasnos/Pago de Carraovejas/Corimbo
  return5/3/2records including distinct cuvees/vintages.
- All14returned records have structurally valid sensory fields, but none is
  independently bound to the photographed producer/vintage here. No original
  detail GET, canonical link or affinity was asserted. Unknown photo vintages
  cannot borrow2022merely because that is the catalog's year.

Concrete local defect and fix:
- Duplicate groups retained only their strongest representative. An incomplete
  high-confidence candidate could replace it and bridge conflicting known
  vintages/producers/canonical IDs later. Low-confidence first rows could also
  be absorbed by later eligible rows despite their own grouping ineligibility.
- Groups now retain private member evidence and reject known conflict with ANY
  member. Distinct canonical IDs cannot merge even with the same name/producer.
  Ineligible rows cannot become eligible through input order. Existing supported
  producer/name aliases remain allowed when evidence does not conflict.
-18synthetic order permutations reproduce14known-conflict joins before and0after.
  This is deterministic regression evidence, not14real misidentifications or a
  new precision/recall metric.174checksPASS, including actual observed public
  substring/qualifier refusal cases. Existing23scan-evidence checks and multi-wine
  checksPASS. Types and scoped lintPASS; scorer/learner remain unchanged.
- Preserve the intermediate over-strict experiment: requiring every member pair
  to independently prove an alias split the recorded Mamba group (2versus1).
  The existing test caught it. Final guard checks known contradictions while the
  established representative alias matcher still supplies positive equivalence;
  the old regression expectation was not weakened or relabeled.

Reproduction: `scripts/audit-matchrim-library90.ts` requires explicit`--live`,
reviewed literal indices and a new private output. It refuses completed fragments
and has a hard7GET/45sbudget. Do not rerun it by default; preserve this observation.
Local private`audit-dedup-delta.mjs` replays the frozen8ac13a4source and current
source with hashes, no network. No product catalog threshold was relaxed.

## Block5: Native Type / Dense Review

Reproduced and implemented:
- The iOS bridge capped every accessibility preference at135%. The new bridge
  keeps the existing WebKit text-adjust mechanism but removes the upper cap and
  pins the root declaration to100%, with safe-area updates unchanged. User type
  preference, not viewport width, controls the scale.
- A private copied-app diagnostic confirmed WebKit's rem line-height inflation:
  at312%, root49.92px, one paragraph43.68pxfont/194.688pxlineheight, another
 46.8pxfont/233.626pxlineheight. This is measured, not an assumed renderer bug.
  Accessibility layout now uses unitless line heights. The diagnostic captured
  style numbers only, no user text; final native inputs remove this instrumentation.
- Native navigation uses stable physical targets/icons/padding, with labels free
  to grow/wrap. Web navigation and every non-native CSS rule retain exact AST/CSS
  equivalence to8f52291. Native scan headings are compact and redundant feature
  prose is omitted; the public web remains unpublished and unchanged.
- At extreme text size, sticky result tabs intercepted region60. They become
  non-sticky in accessibility layout. The region drawer previously left actions
  below the viewport; its complete content can now scroll. Native footer tools
  use icons with preserved accessible names/tooltips. Number pins stay44px with
  stable12px marker text, backed by the fully scaled accessible list.
- Manual correction buttons wrap; footers and markers no longer inherit expanding
  rem spacing. No candidate, score, consent, OCR result or request budget changes.

Evidence boundaries:
- Intermediate actual native tests pass navigation/normal-max type in portrait
  and landscape, but screenshots exposed poor spacing that the test assertions
  alone did not catch. Those binaries/screenshots are NOT final visual approval.
- Red and white original-pixel client flows each pass5layouts/65checks at r9:
 320portrait,393portrait,852landscape,200%and312%root-font stress. Recorded real
  detector replies are reused; analyses are deliberately empty controlled replies.
  No historical identity is rebound to changed region geometry. These are client
  allocation/manual-review/continuation tests, not fresh OCR or accuracy metrics.
- The first drawer-boundary check sampled the entrance animation too early;
  the oracle now waits for an actually settled viewport-bound sheet. The later
  sticky-tab and inaccessible-footer failures were genuine product defects and
  were corrected. All prior failures remain in private r1/r2 outputs.
- Final implementation also makes the full review scroll region named/focusable
  for keyboard access. End reaches its footer at200/312%. Native model confidence
  is explicitly an uncalibrated signal; no threshold or calibration claim changed.

## Final Verification

Source baseline141a01c plus the reviewed native/accessibility delta, no paid run.
Final browser assets:`web-final-r13`. All earlier outputs remain preserved.

| Gate | Actual | Boundary |
| --- | --- | --- |
| Release, cloud contracts, remediation89, scene90, app types, lint |6/6PASS at`gates-r5-final`; source fingerprints unchanged during execution |106inherited warnings,0errors; no hosted benchmark |
| Scene90 |40provenance +10shelf +322selection +68food +174dedup checks,10native source contractsPASS |Synthetic invariants/frozen source, not human accuracy |
| Food final |10scenarios,165checksPASS |Original BBQ upload, frozen real3-crop replies and controlled all-blocked case; no fresh OCR |
| Red dense final |5layouts,77checksPASS |Original pixels + frozen detection; deliberately empty controlled analyses |
| White dense final |5layouts,77checksPASS |Same explicit boundary; old identity replies never rebound to changed boxes |
| Detail/comparator/web keyboard |10layouts,130checksPASS |Existing intercepted payloads, not recognition |
| Profile lifecycle |7controlled scenarios,42checksPASS |No new accounts or remote mutations; not7people |
| Native actual UI |1XCTest method,4normal/max-type portrait/landscape viewsPASS |Owned iPhone16ProMax simulator only, anonymous offline app; named five44pt targets |
| Native type pixels |Heading29->92pt frame height, max-type glyphs/spacing visually inspected |Not a font-size probability or full spoken VoiceOver audit |
| iOS build |Simulator Debug + generic-device ReleasePASS, final r13assets |Unsigned`wine.matchrim.qa90`1.0(86), invalid-only backend; not TestFlight |

The final controlled browser matrix is37scenarios/491checksPASS, source stable.
New food/dense cases explicitly check console errors as well as page exceptions,
no unhandled remote operations, horizontal overflow, manual correction, discard,
bounded continuation,44px nonoverlapping pin targets and keyboard footer access.
No identities, dietary suitability, stock or score usefulness are certified by
these controlled responses. No claim is made to have retested all50live accounts.

Native UI was executed on r11. Final r13changes only region-review accessibility
metadata and uncalibrated-signal wording beyond it. `native90-release-inputs-r2.json`
verifies exact source parity for AppDelegate,Scan,MobileBottomNav,index.css and the
XCTest method exercised in native UI. Final r13simulator/generic builds separately
PASS; the region-review flow itself is validated in the controlled mobile browser,
not falsely relabeled a native gallery/keyboard E2E.

Private final records:
-`ui-final/gate.json` and its food/red/white/layout/profile outputs;
-`gates-r5-final/results.json` and full logs/source hashes;
-`native90-final-ui.xcresult`, `native90-final-attachments/`;
-`native90-release-inputs-r2.json`, `native90-release-sim-r2.json`,
 `native90-release-device-r2.json` and compiler logs;
- all earlier r1/r2 failures, root-font experiment and private style diagnostics.

Existing channels are not replaced: previously documented physical82, uploaded
TestFlight85 and staging86 stay separate. The new offline QA90app uses its own
bundle ID and is deliberately NOT a distribution candidate. No phone control,
paid/model call, new account/key/service, SQL write, migration, deployment,
publication, push, external message or TestFlight upload occurred in this window.
Only7explicit free public catalog GETs were performed, with credentials/images
omitted. All original images, corpus, quiz, scorer and learner are unchanged.

## Remaining Gates

1. **Recognition release HOLD:** a new approved real-source run is needed on the
   current geometry/selection source and intended catalog channel. No fresh paid
   inference was authorized in this window; no provider-quota outage is inferred.
   The frozen red trace still lacks any covering proposal for14bottom label slots,
   and red2/white8mixed-label proposals remain. A client fix cannot invent these.
2. **Independent truth/calibration:** validate the existing corpus and two pixel
   reviews independently, including canonical name/producer/vintage and exact
   price/availability rows. Same-agent literal slots are not human ground truth.
   Canonical precision/recall and confidence calibration remain null/unapproved.
3. **Taste effectiveness:** independent blinded outcomes remain0. Technical
   accounts and simulated years do not establish that a person likes a wine.
   The existing intelligence89freeze/ballot/evaluator workflow stays unchanged.
4. **Physical gate:** real camera/photos permissions, native region keyboard,
   spoken VoiceOver, network interruption and memory/thermal need the later
   coordinated device lane. No current phone version/readback is asserted here.
5. **Distribution:** after recognition/data and physical gates, approve the exact
   production function/data channel, sign/export a real-backend candidate and
   verify Apple processing. Do not upload this offline QA90bundle or claim85/86
   already contains these new source changes.

No arbitrary completion percentage or full-product acceptance is justified.
Remaining recognition/human/physical/distribution gates are explicit, not waived.

## Reproduce

```bash
node scripts/run-matchrim-local-gates90.mjs NEW_PRIVATE_DIRECTORY
npm run test:scene90
```

Food/dense UI scripts require explicit loopback URL, original image/SHA, trace,
browser and new output directory. The private `run-ui-final.mjs` records the exact
five-command sequence against immutable r13assets, with no remote app traffic.
Native preparation copies iOS into an isolated directory, changes only its bundle
ID/display name, embeds the invalid-only preview, and uses existing dependencies
with Xcode26.0.1. Compiler logs preserve exact simulator/generic commands, signing
disabled. No installation, secret, deployment or account setup is needed to rerun
the local contracts. Native source and tested-view parity are hash-bound.
