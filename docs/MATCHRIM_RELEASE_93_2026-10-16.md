# Matchrim release 93 - 2026-10-16

## Scope

Owner requests completion of classic-scanner latency, restaurant duplicates and mobile QA, then a new TestFlight. A parallel own-infrastructure inventory is documentation only; no migration/provisioning is authorized or performed. Public web stays unchanged.

## Implemented Candidate

- Native classic scanner separates reported coverage gaps from identity doubts. A complete eight/30-row reading no longer causes whole-page refinements solely for count, low confidence or uncertain identity. Coverage gaps receive overlapping crops; a complementary narrow right column starts in that same parallel batch when broad left/right crops are absent. Existing web execution is preserved.
- Native reading is capped at four calls, 58 seconds per call and a 90-second reading budget. No automatic retry of a failed paid full-page call or later serial fourth pass. Cancellation settles even if transport/session lookup ignores the signal; late results cannot become success. These are UI/transport limits, not a promise that already-started provider charges reverse.
- Real phase/call counters and elapsed timing replace the native fake70%/30-60s estimate. Aggregate phase/request/outcome metrics exclude image, filename, profile, wine names and credentials. Unit timing is synthetic until a live native run supplies measurements.
- Native Winerim canonical lookup now asks only for catalog records, not generated suggestions without IDs that matching already discarded. Five-second timeout and cancellation apply; missing catalog/sensory data still withholds affinity. Existing web default search behavior and affinity/learning formulas remain unchanged.
- Food cross-section duplicate mentions group conservatively while retaining every original reading. Price, currency, service, preparation, portion and availability conflicts remain separate. Inactive/deleted/reanalyzed origins cannot retain stale prices. Manual/reviewed rows remain protected. Display preserves page/reading order rather than sorting generated IDs. Strict API requests whitelist wire fields and exclude local provenance.
- Candidate iOS version 1.0(93). Same isolated live simulator bundle `wine.matchrim.qa91live` preserves the existing test login and drafts; production distribution uses `wine.matchrim.app`. No owner-phone replacement or credential copying.

## Backend Execution

Exactly one additional function deployed: `search-wines-v75`, with optional boolean `catalogOnly`. Omitted/false preserves ordinary web behavior; true skips AI suggestions, not SQL or auth controls. The deployment package is based on exact production `c9d7b91`, not the mobile branch. It contains only two changed sources and the unchanged shared helper.

Manifest SHA256: `c1a57e33740be345730b1a5a17df0d29fb63b8bbba87402c12eb91db0de7e53b`. Actual generated source passes offline Deno; provider-fixture handler tests pass. Lovable reports deployment at `320152bf65baa5d32d8e944366d829563b204740`, cost1.3credits. No model canary was run by that agent.

Parent independently verifies3/3source hashes and unchanged config/JWT. Corrective main `61afb43b38a4d354c13960aa19371857c561a9d5` restores the two automatically generated web integration files to exact previous baseline. No Publish/Update, other backend deployment, migration, account/secret/data or permission change.

## Validation

- Execution107checks, catalog-contract155checks and actual catalog-handler17cases PASS; no remote calls in these tests.
- Dedup46focused groups, session22, ranking13, workspace170 and provider55 PASS. These are controlled fixtures, not measured recognition/human accuracy.
- Cloud regression PASS; protected parser delta is guarded by default-behavior/SQL-filter AST parity, not a blind snapshot exemption.
- Final source `2b91577`: nine release93/restaurant91/OpenAI92/remediation89/scene90/release/cloud/typecheck/lint groups PASS. Lint0errors/106inherited warnings. Production web resources build PASS; iOS simulator and distribution archive/export PASS.
- Native real IMG_7548 r1/r2 reading runs return eight lexical control references in72s,76s and49s, with three reading requests each. These are measured UI metrics, not a p95 or canonical/human accuracy estimate. OpenAI92 was only observed loading at65.678s and first observed complete at156.685s; its exact latency is unknown, so no precise percentage speedup is claimed. Final-source timing will be recorded separately after the coverage correction below.
- Existing real browser restaurant responses restore40raw food readings as38grouped dishes: the two dessert repetitions each preserve both original mentions and the literal price, without assuming USD from `$`. This is a real-response replay, not fresh OCR.
- A new live reverse pairing with Gaudensius produces two source-linked prawn hypotheses, states frictions/missing sensory data and does not invent a personal percentage. Restricting to bottle/50EUR abstains because literal service evidence is missing. The two menus come from different sources in a clearly marked technical draft, not a claim that one real restaurant sells all items.
- A browser console warning revealed missing correction/preview dialog descriptions; fixed in474c645, and `aria-describedby` now resolves to nonempty owned text. Native keyboard correction remains reachable without saving owner content. No publication of these client changes.
- Native portrait/landscape and actual AXXXL Dynamic Type, five navigation targets>=44pt, long food scrolling, keyboard editor, native photo-library selection, eight result sheets and cancellation/retry availability are recorded. Comparison of five, sixth-choice cap, service mode and landscape PASS after using the actual iOS Switch role for aria-pressed controls. Earlier exact-label/ARIA-role/timing failures are preserved as harness failures, not hidden product fixes.
- Broad replay caught a REAL r2 recall regression:14instead of16 references on the historical two-column IMG_7547 trace. The initial three-call budget had removed the narrow crop that recovered Costa/LaRosa. Fixed by including that crop in the parallel refinement batch and raising the hard cap to4, not by lowering expected16. New pure regression asserts all16 and both complementary names; complete8 still needs no refinement. R1/r2 artifacts are historical HOLD after this change.
- Final source real native IMG_7548:72s/3reading requests,8lexical references. Six native methods PASS on r3: type/orientation, keyboard correction, gallery, live result/detail, eight sheets/five-wine comparison/service, main navigation. Actual cancel/retry availability PASS on r2; unchanged cancellation implementation additionally passes final-source unit and controlled UI reruns.
- Final-source focused browser23scenarios PASS: four comparison/coverage variants, ten honest missing-profile explanations, four cancellation/retry journeys and five Restaurant91 sizes. Partial recorded columns retain16including Costa/LaRosa with exactly4OCR requests; all3refinements reach a barrier before any response is released. Complete-eight uses1request. These are controlled UI tests, not fresh recognition.
- Public hosted catalog canaries: Muga200/two ID-bearing rows2094ms; negative control200/zero rows694ms; invalid flag400/176ms. No user JWT extraction or generated suggestions in these catalog-only requests.

Private evidence: `/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim93-release-20261016`.

## Candidate And Release Gate

- Signed production1.0(93), source2b91577, passes190/190local artifact checks. All158web resources match the simulator source/preparation manifest; no live-reload server, QAfixtures, staging endpoint or private provider credentials. Export uses Apple Distribution, non-debug App Store provisioning and unchanged production bundle/team. IPA SHA256:`422bbde93f455a51a319393d279e6cb7bc8c9f6864c2cae8909ea0851dca83ee`.
- Reproducible local preparation: `node scripts/prepare-matchrim-release93.mjs /private/tmp/Matchrim93-NEW`. The simulator runner template is now versioned in `scripts/native-matchrim-qa.xcodeproj`, not dependent on an earlier temporary build. Existing test login is preserved by updating the isolated bundle rather than erasing it. Required dependencies/Xcode and ordinary authorized login remain external prerequisites.
- Internal gate `PASS_BETA_UPLOAD_ONLY` recorded at09:23:32UTC. Exactly one Xcode upload succeeded: start11:23:32Madrid, finish11:25:08Madrid, exit0, `Uploaded App` / `Upload succeeded` / `Uploaded package is processing`. Apple accepted the package and began processing; installable TestFlight status and tester-group/external invitation are NOT independently confirmed. No retry or build-number rewrite. This does not authorize an App Store release, public web publication or infrastructure migration. Only r3 was uploaded; r1/r2 remain historical.
- Raw evidence: `upload93.log`, SHA256`6dd4b5bfbddce4b7a023c71d97bb525c1683a771a241db3356e8ad0dc393c893`, and `upload93.json`. App Store Connect in Brave remains on a failed web-login/loading state; that is separate from the valid Xcode upload channel, not a key blocker or proof of a failed upload. No credentials were read/exported and no additional login was requested for the upload.

## Expected / Actual Matrix

| Surface | Expected | Actual / evidence scope |
| --- | --- | --- |
| Complete-eight document | Do not add crops just because identity is uncertain | 1OCR in portrait/landscape controlled runs; no invented confidence upgrade |
| Partial two-column document | Preserve16references and recover the right column | 16/16replay, not14; Costa/LaRosa retained,4requests,3parallel refinements |
| Real native wine page | Eight visible wine references, measured time/calls | 8/8lexical controls,72s/3calls on r3; canonical approval withheld |
| Dessert repetitions | One dish per same reference, keep all readings | 40raw->38visible from saved real replies,2origins per repeated dessert mention |
| Corrections and source pages | Original remains, reader description resolves | Five controlled sizes PASS; native keyboard and reachable save PASS without saving owner content |
| Food->wine and wine->food | Only supplied IDs, explain inference/missing data | Controlled both directions PASS; new real reverse run returns two exploratory pairs |
| Bottle and budget | Do not presume a price/service or stock | Real50EUR/bottle run abstains when literal bottle evidence is missing |
| Missing sensory/profile | No zero-score rejection or invented percentage | Ten controlled scenarios PASS, actual page explicitly says affinity pending |
| Long input / URL | Admit multiple files and every PDF page, explicit retries | Real PDF.js50pages rendered in controlled reader; SSRF/TLS/byte/cancel27groups PASS offline |
| Dense overlays | Numbered accessible controls, list and no text-covering panels | Red/white frozen detections154assertions PASS, no new vision-accuracy claim |
| Accessibility / layout | Portrait/landscape, AXXXL, reachable navigation/editor | Native r3 actual type/orientation/keyboard PASS; controlled320/393/852and200/312%text PASS |
| Cancellation / offline | No late success, bounded retry, no duplicate completed work | Actual native cancellation plus final controlled error/cancel/network lifecycle PASS |
| Main navigation | Home/aiRIM/cellar/profile/scan without account reset | Actual native r3 five destinations PASS; no user/logout/rating mutation |
| Distribution integrity | Same resources/config as tested, valid Store signature | 158/158resources and190/190checks PASS, no fixtures/staging/private keys |

Broad browser baseline, failed attempts, triage and final focused source manifests are retained in `browser-regression/`; native screenshots/AX trees in `native-r3.xcresult` and `native-real-r3.xcresult`; video `native93-final-r3-review.mp4`. The smaller matrix above is a scope summary, not a second accuracy benchmark.

Final focused report: `browser-regression/focused-r4-2b91577/REPORT.md`,23/23cases and421/421assertions PASS. Its427app/config files match the frozen source. The earlier broad baseline remains1077PASS/16FAIL at its old source; the2real recall failures are fixed and rerun, and the14stale copy/count assertions were corrected explicitly. No historical red is rewritten as a fresh green.

## Honest Residual

- Eight lexical references are not eight verified canonical identities. The Gaudensius reading still mixes a region token into the producer/candidate presentation; no canonical producer fix or independent identity approval is claimed here. Low/medium identity and missing sensory data remain visible.
- On this actual wine page, verified sensory sheets were unavailable, so affinity stays pending rather than displaying invented percentages. Coverage/enrichment and human taste validation are product P1 work, not a key or login blocker and not closed by controlled profile tests.
- Scanner reading is bounded, not instant: dense/partial pages can legitimately use all four calls.90s bounds reading operations; it is not a guaranteed full-session SLA including profile/catalog finalization, nor a reversal of provider charges after cancellation.
- Hardware camera capture, physical memory/thermal/network conditions and spoken VoiceOver navigation require a device pass after TestFlight. Simulator AX labels/targets and controlled network failures do not certify those physical conditions. This release does not invent50human users or an annual taste study.

Infrastructure plan: [own infra inventory and migration gates](MATCHRIM_OWN_INFRA_PLAN_2026-10-16.md). It does not authorize moving production or silently applying local schema/security candidates.
