# Matchrim: 50-account QA before TestFlight

Historical QA85 cycle, not the subsequently assembled production build85.
The later authorized remediation is documented in
[build85 remediation](MATCHRIM_85_VIDEO_REMEDIATION_2026-10-15.md); it preserves
the measurements and open recognition/human-outcome limits below.

**Release decision: HOLD.** Functional account coverage is complete in the tested
environment, but recognition, live staging dependencies and human preference
quality are not globally approved. No owner phone, TestFlight upload, production
deployment or public push occurred in this cycle.

Product correction commit: `2ea342f77b12f702c9bf78b6e0c4b74689647da6`.
Baseline product: `598dda8`; initial HEAD `0aade28` differed only in documentation.
QA85 names this evidence cycle, not an uploaded iOS build85. The isolated native
app remains `wine.matchrim.qa84`, version1.0(84), rebuilt with the new product
source. The older production IPA84 does not contain these fixes and is not the
next approved release.

## Accounts And Method

50 new technical accounts in staging `matchrim_qa`: ten archetypes with five
variants each. They are not 50 human testers or concurrent users. Four fictional
wine records per account give 200 real persisted rows, including one incomplete
identity each. Known synthetic wines carry explicitly synthetic catalog evidence;
their sensory values are not real wine sheets or human tastes.

45 quiz vectors were seeded and five accounts started without a quiz. One of the
latter completed the actual20-question UI and a retake:47 quiz rows for46 users,
with four users still correctly lacking a quiz. Admin-confirmed creation is not
email-signup verification. All UI logins use the password form; feedback uses
normal authenticated RLS, not injected auth or administrator writes.

The original100-account study and four QA84 accounts are preserved. Independent
SQL pre/post fingerprints are identical for6001 protected wines,103 quiz rows
and104 profiles. The new50 accounts are excluded from those protected counts.

## Confirmed Corrections

| Defect | Before | Fixed and verified |
| --- | --- | --- |
| English sensory keys lost on Bodega reload |135 initial-affinity failures across45 known-profile accounts |Native alias normalization preserves verified attributes and initial history; real browser and simulator checks |
| Eligible English attributes ignored by learner |Real `love` persisted, one verified row, but samples0 |Verified training boundary maps to learner keys without rewriting stored sensory objects; actual UI samples and cold reopen |
| Profile recommendation vector rounded differently |122/135 numeric disagreements, max11points |Native Profile uses continuous active vector;135/135 parity, max0; web and passport rounding unchanged |
| Local native profile rounded0.4 to1 |Home/local versus scanner disagreement |Native0..5 continuity retained; existing web behavior unchanged |
| Negative sensory values treated as valid |Invalid -1 could score62 and train |Client scoring and both local learner sources abstain; shared Edge source guard is NOT deployed |
| Unbound old sensory metadata reused |Legacy flag could survive identity edits |Native rows without bound identity/attributes remain pending until reverification; no historical-row rewrite |
| Nonfinite explanation values |NaN score/range or invalid confidence |Finite guards return null score/range and zero invalid identity confidence |
| Quiz result visible without saving state |Real insert pending with no busy/status feedback |Native pending/saved/unconfirmed UI follows actual promise; restart disabled while saving, no blind duplicate insert |

No quiz weights, active images, scoring formula or provider prompt were tuned to
make this study pass. An English-key database fixture was not rewritten to hide
the two distinct normalization/learning bugs.

## Functional Matrix

| Scope | Actual result |
| --- | --- |
| Initial immutable browser baseline |315PASS,135 genuine affinity FAIL; preserved unchanged |
| Final50 UI accounts |50 real logins/profiles and150 three-state list inspections; owner markers and missing identity checked |
| Feedback on every account |50/50 each for favorite, known-wine rating/readback, profile sample or abstention, reload, UI restoration and wishlist-state/initial checks |
| Wishlist transitions |40 first transitions in the final run;10 already completed by the preserved baseline, not reset through SQL to invent a new pass |
| Ten deeper representatives |Remove rating, exclude, edit while excluded, reinclude, negative/pending rating, immutable initial, reopen, navigation, cross-read and same-context account switch; focused retry receipts retained |
| Real quiz |20 radios/images, deliberate next/back, previous answer and exit; actual INSERT201 and account history1->2; final busy/saved UI verified |
| Account controls |Invalid login/signup/reset inputs, separate default-off terms/privacy/dietary controls, deletion inspection; no SMTP, submitted deletion or final signup |
| Mobile browser |360/393portrait and852x393landscape routes, actual image decode and navigation; authenticated redirect destinations recorded, not counted as distinct forms |
| Native first use |Six-step guide and privacy-before-media-access pass on the baseline; no gallery before consent |
| Native camera/gallery |Actual system picker open/cancel and camera-choice cancel; simulator has no real camera capture |
| Native source delta |Ten actual account/initial/explanation paths after the reload fix; two final-source learned-profile/cold-reopen checks PASS |
| Native orientation/accessibility |Actual window rotation and AX dynamicType/textClipped audits; final large text changes rendered geometry and keeps navigation accessible |
| Five native cold launches |2.841,2.882,3.104,2.877,2.906seconds on the baseline simulator, not a production-phone SLO |
| Controlled client regression |15/15 phase groups: lifecycle, menu/profile ownership, layout,200% text, pins, reading, invalid-image recovery, identity/correction and30 retention cycles |
| Source gates/builds |Release/cloud/tests/typecheck/web build PASS; lint0errors106 inherited warnings; final simulator and unsigned generic-device iOS build PASS |

Raw browser failures are not erased: an isolated login timeout, a readback timeout
and strict network-guard image blocks have separate successful bounded reruns.
Three observed Winerim image URLs returned real200 and decoded after an exact
GET-only allowlist; no image upload or paid call was enabled. Browser page
exceptions were0. Missing staging tables/functions remain separate blockers.

The native runner also retained a macOS file-coordination stall before execution
and a wrong-scroll-direction harness failure. A local temporary runner and
explicit navigation fixed the instrumentation; neither is called a product fix.
327 product/public/shared source hashes match the final simulator snapshot.

## Real Image Benchmark

22 mode journeys over18 existing authorized files, not22 independent scenes or
50 user uploads. Includes the five originals, the owner's dense cabinet and
12 frozen public challenge files. No new downloads or dataset regeneration.
Real anonymous production responses, not recognition mocks:138/180 reserved
POSTs,136 HTTP200,1 HTTP500 and1 interrupted request with unknown response.
Transport concurrency1; quota/auth guards and unused42 calls were preserved.

| Observation | Measured result and limit |
| --- | --- |
| Four original wine menus |69/71 fuzzy matched names:97.18% lexical precision,100% lexical recall; not canonical identity, exact vintage/producer or price accuracy |
| Spanish food menu |7/7 names against its exhaustive seven-dish annotation |
| Negative scenes |6/6 tested cases abstain; not general category certification |
| Owner dense cabinet |60 proposed regions,12 analysed,48 deferred;9 candidate groups,0 recognized/10 uncertain/2 unknown analysed regions |
| Original fridge |53 regions,11 analysed successfully,1 error,41 deferred;7 candidate groups |
| Timing |UI p50=28.284s,p95=110.459s,max128.840s; Edge roundtrip p50=4.285s,p95=23.911s |
| UI health |22/22 no page exception or393px horizontal overflow; separate20/20 lifecycle replay checks, zero new live POST |

Response metadata observed vision72 detector-v4/analysis-v8/menu-v9, search75
and live food-v1. These are response observations, not independently certified
management-plane deployments. The earlier200 supplied-image benchmark remains
unchanged and is not counted again as200 newly recognized images here.

## Intelligence And Residual

Final-source deterministic50-persona harness:1637/1638 checks; the retained
P2 missing-answer quiz check intentionally fails. Independent Python verifier:
1401/1401,135 numeric score reconstructions and zero surface disagreement.
Incomplete identities/sheets abstain50/50. The pure cohort remains45 vectors
plus five nulls; it is not relabeled after the separate live UI quiz.

The eight-wine synthetic heldout diagnostic worsens: oracle-best top1 goes
44/45 ->33/45 and NDCG@3 .999499 ->.997923. Its oracle is anchored to the same
base profile, so this is a limited model diagnostic, not evidence of human taste
accuracy or a reason to tune production weights without independent taste data.

**Open P1 recognition:** Rose/Rosado and truncated-reference duplicates; unbacked
price/service associations in cropped menu columns; malformed model JSON500;
French fish/chicken/side fusion and omissions; dense BBQ omissions; live food
preference inference from a wine quiz. The client withholds unsupported personal
food percentages but the live backend semantics are not approved. A private
10-check colour-deduplication draft was not applied or deployed.

**Open environment/E2E:** staging lacks live production-v72 aliases,
`ai-wine-chat` and `scan-food-pairing`; catalog-detail/deletion schemas have gaps.
Their answers/deletion are BLOCKED, not fabricated or certified by UI shell
tests. Original Winerim public-fiche coverage and reliable canonical sensory
links remain incomplete. No per-user real vision/AI write study was performed.

**Open P2/product:** quiz missing/unfamiliar answers; potency/tannin weights equal
in19/20questions; seven explanation dimensions exist, with five scored and two
correctly unknown; alignment bars are not an additive score decomposition.
Bodega has a long pre-list introduction and dense scans a long deferred list.
These are usability improvements to measure, not another unbounded redesign.

**Deferred hardware:** spoken VoiceOver, real camera/photo permissions, native
RAM/thermal behavior and real-device network interruption. Dynamic Type scales
up to the existing135% cap, not the full unconstrained OS accessibility size.
Only the owned isolated simulator was manipulated and its text setting restored.

## Next Gate

Correct and rerun the recorded recognition/price/food cases first; align a safe
live staging E2E channel without production mutation; then assemble a new
production-only candidate from the corrected source. Require observed canonical
and sensory coverage, explicit remaining limitations and the owner's subsequent
physical QA/release authorization. Do not upload the staging app or reuse the
older production84 IPA as if it contained these fixes.

Private evidence root: recovered task
`artifacts/matchrim85-50users-qa-20261014`. See `accounts`, `browser`,
`recognition/expected-actual.md`, `intelligence/after-main-final-r1`,
`client-regression`, and `native/r7-final-learning-navigation` / `r8-final-large-type`.
Photos, account credentials, responses, videos and binaries stay outside Git.
