# Matchrim: simulator-first 50-account QA delta

**Decision: HOLD.** This is QA87 evidence, not an iOS build87 or 50 human testers.
The latest owner instruction explicitly postpones the phone and TestFlight.
No physical-device operation, product edit, production deployment, push, tester
invitation or TestFlight upload occurred in this delta.

Product remains `2ea342f`; application/shared/function source is unchanged from
that commit. The existing private staging build matches its application-source
hashes. Native testing uses only `wine.matchrim.qa84`1.0(84), simulator
`B18822EF-BFBD-4A6A-89B2-33539BDE4127`; this is not a new production candidate.
QA85 and the earlier physical QA86 observations remain historical evidence.

## New Measured Results

The same50 existing isolated technical staging accounts were reused, not another
50 created or 50 independent humans. Every login used the actual password form;
no token injection. Each account's four wine records and quiz history have equal
authenticated before/after fingerprints. All50 completed UI logout. REST writes
were denied; actual data mutations0,92 bounded catalog reads,0 guard blocks and
0 page exceptions. The new finite check set has510PASS/169FAIL, not169 bugs.

| Check | Expected | Actual |
| --- | --- | --- |
| Profile-to-cellar numeric explanation | Same visible vector reconstructs current score |107/138 match;31 differences across12 accounts, maximum9points |
| Missing quiz or identity | No invented numeric affinity |62/62 abstain |
| Historical initial score | Existing snapshot rendered; no rewrite |All existing snapshots checked;50/50 account datasets unchanged |
| Detailed cellar explanation | Available axes, caveats, match/friction and adventure |138/138 show five scored axes and explicit non-probability caveat |
| Missing explanation data | Say wood/intensity data are absent |138/138 compact explanations hide that disclosure |
| Existing image client replay | Same input pixels/responses, usable portrait/landscape |Four scenes/eight views;0 horizontal overflow/page exceptions;25 recorded reply deliveries |
| New manual menu field audit | Do not price cropped-out rows |10/10 readable left names/amounts correct;6 unsupported amounts among8 right-side output rows |
| Actual simulator gallery canary | Real system picker, image preparation and terminal |One region/11.1s,0 recognized/1 uncertain; no identity-accuracy approval |

The31 numeric discrepancies and138 missing-data failures account for all169
failed assertions. They are two systematic product findings, not169 unique bugs.
Browser-native emulation is separate from actual XCTest simulator evidence.

## Findings

### P1: visible profile contradicts the score

The Profile chart still applies `Math.max(1, ...)` to each rendered axis, although
native scoring now accepts0..5. A real staging account has base/active dulzor0
but the accessible/visible chart reports1. Its sweet QA wine shows41%; an
independent reconstruction from the displayed chart gives50%. Other affected
archetypes include sparkling and contradictory profiles. The scorer itself is not
proven wrong by this test: the discrepancy is between its inputs and the graph.

Root: `src/pages/Profile.tsx:855`. The prior QA85 numeric callsite checks used the
continuous query vector, not the finally rendered chart; its135/135 result does
not close this new presentation defect. Preserve both results, not replace one.

### P1: prices leak across cropped menu columns

The supplied IMG_7547 scene visibly contains ten left-page name/amount pairs.
The right-page price column is outside the photograph. Current product resolution
still exposes six amounts for those right rows, including12/13/18/25 copied or
inferred from elsewhere. The same values reproduce in the current client with
historical real responses. Currency remains pending and value-ranking abstains,
which is useful but does not make unsupported amounts acceptable.

Manual annotation is non-blinded: previous outputs were known. This is a new
pixel-backed field audit, not new OCR, a fresh holdout or canonical precision.
Rose/Rosado and truncated Costa duplicates remain the earlier open P1.

### P2: compact explanations hide missing data

The underlying explanation computes missing wood/intensity data, but
`AffinityExplanation` hides its data-and-limits section when `compact` is true;
Bodega always uses that variant. All138 available explanations omit those limits.
Five known axes are appropriate; the defect is absent disclosure, not a demand
to fabricate two extra values. The displayed default identity signal also reads
approximately65% on verified synthetic catalog fixtures because Bodega omits an
explicit identification-confidence prop. It is not a measured OCR confidence.

Roots: `src/components/CellarWineAffinity.tsx:54`,
`src/components/AffinityExplanation.tsx:217`. No source fix was made in this audit.

## Coverage And Limits

| Functional area | Evidence and verdict |
| --- | --- |
| Guide, consent before gallery |QA85 actual simulator PASS; QA87 system picker confirms selected-item access |
| Login/session/logout and account separation |QA85 plus50 new read-only UI journeys PASS |
| Quiz20 questions, back/retake/save feedback |QA85 actual quiz INSERT/readback PASS; missing/unfamiliar-answer P2 remains |
| Five Bodega states, favorite/rating/stock/consumption separation |QA85 persisted UI mutation/restoration PASS; QA87 adds unchanged datasets |
| Exclusion, rerating, reinclude, cold reopen |QA85 deeper representatives/native checks retained; not50 new mutation journeys |
| Initial/current affinity and explanation |Initial history/abstention PASS; rendered-profile parity FAIL as above |
| Learning and recommendation usefulness |Deterministic consistency is not human taste accuracy; independent human outcomes NOT_VALIDATED |
| Single/multiple labels and dense cabinet |QA85 real responses retained; QA87 one actual gallery canary and dense replay, not global identity PASS |
| Printed wine menus and boards |Earlier real22journeys/18files retained; duplicates/prices/partial identity remain FAIL/PARTIAL |
| Food menus and dish recommendations |French fusion/omission and BBQ omissions reproduce in replay; food preferences inferred from wine quiz remain P1 |
| Compare2-5, confidence, service/currency budgets |Prior controlled client PASS; complete real canonical/sensory coverage remains BLOCKED |
| aiRIM, memory and four decision forms |Prior routes/state PASS; new live answers and human pairing outcomes NOT_RUN here |
| Food-to-wine/wine-to-food restaurant flow |Prior36 controlled UI checks retained; actual restaurant/menu/canonical E2E not globally approved |
| Winerim original fiche |Canonical/source/public-fiche coverage remains BLOCKED; no fabricated link |
| Cancellation, retry, stale replies, invalid images |QA85 lifecycle/client groups retained; no new live retry batch |
| Portrait/landscape, touch, safe areas and text |Prior actual simulator rotation/AX and scoped large text retained; new eight replay views reviewed; no whole-app no-overlap claim |
| Full OS large text, spoken VoiceOver, native RAM/thermal and real camera |NOT_RUN/deferred hardware limits, not green from browser checks |
| Privacy deletion/signup email/delivery |No destructive account deletion or SMTP test; inspection is not E2E approval |

Native gallery selection required its actual iOS26 review OK button. Earlier
runner failures selected/previewed the image without confirming it and therefore
did not upload it. One final confirmation completed the real11.1s pipeline. The
observed result is one uncertain region, not a confirmed wine. Installed assets
target staging `qpbmqvfnunkylvtvnyyx`; qa84 selects unversioned vision names,
not production's v72 aliases. Response versions, full backend traffic and paid
provider request count were not independently captured. Do not infer production
vision parity or zero provider calls from the native terminal.

Four image replays used IMG_7547, the French menu, BBQ menu and owner cabinet.
They selected actual authorized files and exercised Canvas/client logic while
all external traffic was intercepted. The initial dense replay selected the wrong
mode in the harness; its failure remains and a correctly routed delta succeeded.
No replay result counts as fresh recognition. Raw selector/oracle development
failures and two stopped preliminary runs remain separate from the final50 run.

## Next Gate

1. Correct native graph0..5 continuity and make compact missing-data/provenance
   disclosure visible; rerun the12 affected accounts and preserve initial scores.
2. Correct price-row/column grounding, duplicate identity and retained food/parser
   cases using the existing images and field annotations; do not tune taste
   weights merely to improve a synthetic oracle.
3. Establish version-equivalent safe live staging vision/chat/food coverage,
   measure real canonical/sensory matches and rerun bounded real images. The
   single native canary is not that approval.
4. Build a new reproducible production-only candidate after those deltas. Then
   use the owner's phone for the explicitly later hardware gate, followed by a
   separate TestFlight decision. No phone action is needed for the next internal fix.

Private evidence root under the recovered task:
`artifacts/matchrim87-simulator-50-delta-20261015`.
See `SUMMARY.json`, `PER_ACCOUNT.md`, `oracle-final-50-r6/results.json`,
`low-range-diagnosis-r7`, `menu-field-audit.json`, `image-replay-r1`,
`image-replay-dense-r2`, and `native-confirm-photo-r5/attachments`.
Private images, account inputs, binaries and responses are not committed.
