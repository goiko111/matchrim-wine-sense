# Matchrim release 93 - 2026-10-16

## Scope

Owner requests completion of classic-scanner latency, restaurant duplicates and mobile QA, then a new TestFlight. A parallel own-infrastructure inventory is documentation only; no migration/provisioning is authorized or performed. Public web stays unchanged.

## Implemented Candidate

- Native classic scanner separates reported coverage gaps from identity doubts. A complete eight/30-row reading no longer causes whole-page refinements solely for count, low confidence or uncertain identity. Coverage gaps still receive up to two overlapping crops; no fourth right-column call is appended in native. Existing web execution is preserved.
- Native reading is capped at three calls, 58 seconds per call and a 90-second reading budget. No automatic retry of a failed paid full-page call. Cancellation settles even if transport/session lookup ignores the signal; late results cannot become success. These are UI/transport limits, not a promise that already-started provider charges reverse.
- Real phase/call counters and elapsed timing replace the native fake70%/30-60s estimate. Aggregate phase/request/outcome metrics exclude image, filename, profile, wine names and credentials. Unit timing is synthetic until a live native run supplies measurements.
- Native Winerim canonical lookup now asks only for catalog records, not generated suggestions without IDs that matching already discarded. Five-second timeout and cancellation apply; missing catalog/sensory data still withholds affinity. Existing web default search behavior and affinity/learning formulas remain unchanged.
- Food cross-section duplicate mentions group conservatively while retaining every original reading. Price, currency, service, preparation, portion and availability conflicts remain separate. Inactive/deleted/reanalyzed origins cannot retain stale prices. Manual/reviewed rows remain protected. Display preserves page/reading order rather than sorting generated IDs. Strict API requests whitelist wire fields and exclude local provenance.
- Candidate iOS version 1.0(93). Same isolated live simulator bundle `wine.matchrim.qa91live` preserves the existing test login and drafts; production distribution uses `wine.matchrim.app`. No owner-phone replacement or credential copying.

## Backend Execution

Exactly one additional function deployed: `search-wines-v75`, with optional boolean `catalogOnly`. Omitted/false preserves ordinary web behavior; true skips AI suggestions, not SQL or auth controls. The deployment package is based on exact production `c9d7b91`, not the mobile branch. It contains only two changed sources and the unchanged shared helper.

Manifest SHA256: `c1a57e33740be345730b1a5a17df0d29fb63b8bbba87402c12eb91db0de7e53b`. Actual generated source passes offline Deno; provider-fixture handler tests pass. Lovable reports deployment at `320152bf65baa5d32d8e944366d829563b204740`, cost1.3credits. No model canary was run by that agent.

Parent independently verifies3/3source hashes and unchanged config/JWT. Corrective main `61afb43b38a4d354c13960aa19371857c561a9d5` restores the two automatically generated web integration files to exact previous baseline. No Publish/Update, other backend deployment, migration, account/secret/data or permission change.

## Validation Checkpoint

- Execution95checks, catalog-contract155checks and actual catalog-handler17cases PASS; no remote calls in these tests.
- Dedup46focused groups, session22, ranking13, workspace170 and provider55 PASS. These are controlled fixtures, not measured recognition/human accuracy.
- Cloud regression PASS; protected parser delta is guarded by default-behavior/SQL-filter AST parity, not a blind snapshot exemption.
- Typecheck PASS; lint0errors/106inherited warnings. Final source regression/build and live native matrix still pending at this checkpoint.
- Previous OpenAI92 real results remain baseline, not relabeled93 outcomes. No claimed live improvement before measured native rerun.

Private evidence: `/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim93-release-20261016`.

## Release Gate

HOLD until new-source native build, real classic-scanner timing/identity controls, restaurant long results/correction/duplicates, orientation/text/accessibility, failure/cancel/retry and final regressions are recorded. Apple upload/account/build-number acceptance is a separate gate. At this checkpoint no TestFlight93 has been uploaded.

Infrastructure plan: [own infra inventory and migration gates](MATCHRIM_OWN_INFRA_PLAN_2026-10-16.md). It does not authorize moving production or silently applying local schema/security candidates.
