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
- Final source `474c645`: nine release93/restaurant91/OpenAI92/remediation89/scene90/release/cloud/typecheck/lint groups PASS. Lint0errors/106inherited warnings. Production web resources build PASS; iOS simulator and distribution archive/export PASS.
- Native real IMG_7548 r1/r2 reading runs return eight lexical control references in72s,76s and49s, with three reading requests each. These are measured UI metrics, not a p95 or canonical/human accuracy estimate. OpenAI92 was only observed loading at65.678s and first observed complete at156.685s; its exact latency is unknown, so no precise percentage speedup is claimed. Final-source timing will be recorded separately after the coverage correction below.
- Existing real browser restaurant responses restore40raw food readings as38grouped dishes: the two dessert repetitions each preserve both original mentions and the literal price, without assuming USD from `$`. This is a real-response replay, not fresh OCR.
- A new live reverse pairing with Gaudensius produces two source-linked prawn hypotheses, states frictions/missing sensory data and does not invent a personal percentage. Restricting to bottle/50EUR abstains because literal service evidence is missing. The two menus come from different sources in a clearly marked technical draft, not a claim that one real restaurant sells all items.
- A browser console warning revealed missing correction/preview dialog descriptions; fixed in474c645, and `aria-describedby` now resolves to nonempty owned text. Native keyboard correction remains reachable without saving owner content. No publication of these client changes.
- Native portrait/landscape and actual AXXXL Dynamic Type, five navigation targets>=44pt, long food scrolling, keyboard editor, native photo-library selection, eight result sheets and cancellation/retry availability are recorded. Comparison of five, sixth-choice cap, service mode and landscape PASS after using the actual iOS Switch role for aria-pressed controls. Earlier exact-label/ARIA-role/timing failures are preserved as harness failures, not hidden product fixes.
- Broad replay caught a REAL r2 recall regression:14instead of16 references on the historical two-column IMG_7547 trace. The initial three-call budget had removed the narrow crop that recovered Costa/LaRosa. Fixed by including that crop in the parallel refinement batch and raising the hard cap to4, not by lowering expected16. New pure regression asserts all16 and both complementary names; complete8 still needs no refinement. R1/r2 artifacts are historical HOLD after this change.
- Public hosted catalog canaries: Muga200/two ID-bearing rows2094ms; negative control200/zero rows694ms; invalid flag400/176ms. No user JWT extraction or generated suggestions in these catalog-only requests.

Private evidence: `/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim93-release-20261016`.

## Candidate And Release Gate

- Signed production1.0(93), source474c645, passes190/190local artifact checks. All158web resources match the simulator source/preparation manifest; no live-reload server, QAfixtures, staging endpoint or private provider credentials. Export uses Apple Distribution, non-debug App Store provisioning and unchanged production bundle/team.
- Reproducible local preparation: `node scripts/prepare-matchrim-release93.mjs /private/tmp/Matchrim93-NEW`. The simulator runner template is now versioned in `scripts/native-matchrim-qa.xcodeproj`, not dependent on an earlier temporary build. Existing test login is preserved by updating the isolated bundle rather than erasing it. Required dependencies/Xcode and ordinary authorized login remain external prerequisites.
- HOLD for final browser/native comparison matrix reconciliation, then Apple upload/account/build-number acceptance. At this checkpoint no93upload has been attempted. Candidate r1 is historical and must not be uploaded after the dialog fix.

## Honest Residual

- Eight lexical references are not eight verified canonical identities. The Gaudensius reading still mixes a region token into the producer/candidate presentation; no canonical producer fix or independent identity approval is claimed here. Low/medium identity and missing sensory data remain visible.
- On this actual wine page, verified sensory sheets were unavailable, so affinity stays pending rather than displaying invented percentages. Coverage/enrichment and human taste validation are product P1 work, not a key or login blocker and not closed by controlled profile tests.
- Scanner reading is bounded, not instant: dense/partial pages can legitimately use all four calls.90s bounds reading operations; it is not a guaranteed full-session SLA including profile/catalog finalization, nor a reversal of provider charges after cancellation.
- Hardware camera capture, physical memory/thermal/network conditions and spoken VoiceOver navigation require a device pass after TestFlight. Simulator AX labels/targets and controlled network failures do not certify those physical conditions. This release does not invent50human users or an annual taste study.

Infrastructure plan: [own infra inventory and migration gates](MATCHRIM_OWN_INFRA_PLAN_2026-10-16.md). It does not authorize moving production or silently applying local schema/security candidates.
