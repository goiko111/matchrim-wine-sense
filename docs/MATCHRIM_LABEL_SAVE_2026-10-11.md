# Matchrim label-save confirmation

Assignment MATCHRIM-5H-20261011-08. Baseline `9a2b22861b8697f29fc9d19cd4a9397552f6348d`. Local source-only checkpoint, not a release approval.

## Reproduction

The actual `Scan.handleExtractComplete -> ScanHub -> MultiWineLabelScanner.confirmBatch` path was exercised in Chromium at393x852 with the existing native-platform shim. Before edits,4/5 targeted scenarios failed:403 and null responses still created batch-success history; a double click started duplicate inserts; a held response after A -> B continued the old owner's second insert. The success control passed.

The scanner was already keyed by user ID. Its visible state reset correctly; the defect was the surviving asynchronous continuation and the swallowed void callback outcome, not absence of an account reset.

All nonlocal requests, including auth, database, analytics and home recommendations, were intercepted. Synthetic sessions/privacy acknowledgement stayed in isolated browser contexts. The existing public Commons menu fixture only drives image preprocessing; existing deterministic label fixtures produce two confirmable references (Muga grouped twice and Pazo), one doubtful candidate and one deferred region. This is not OCR, canonical-identity, affinity-accuracy, real-account or physical-iPhone evidence. No private user photo was read or sent.

## Save Contract

A normal Supabase insert returns no representation unless `.select()` is requested; `data: null` does not prove zero writes. See [insert documentation](https://supabase.com/docs/reference/javascript/insert) and [returning modified rows](https://supabase.com/docs/reference/javascript/using-modifiers-select). Installed supabase-js/postgrest-js2.107.0 agree: select adds `Prefer: return=representation`; single requests one JSON object. The installed builder does not automatically retry POST transport failures. No SDK upgrade was made.

- Shared typed callback returns saved/rejected/ambiguous/auth-required/obsolete, never void-as-success. The legacy unrelated `WineLabelOCRImport` contract is untouched.
- Insert requests only `id,user_id,name,producer,vintage,status,is_favorite,use_for_profile_training`, then `.single()`. Existing mutation-field confirmation is reused; nonempty row ID, owner and expected fields must match.
- Missing/wrong representation, permission/RLS errors, cardinality errors and transport failures are ambiguous, not proof of no write. They stop the batch and expose no reinsertion action. Only explicit input/constraint rejection23502/23503/23514/22P02 permits a deliberate retry. No automatic retry was added.
- Parent owner/route generation and child owner/lifetime generation are checked after await. Logout, A -> B, A -> B -> A, unmount and same-page context change cannot continue old groups or report success. Ignoring an old response does not cancel a server commit already in flight.
- Synchronous pending lock prevents double activation. A frozen per-batch ledger retains confirmed groups; retry skips them. Candidate editing/reanalysis/discard is disabled after the batch starts so its saved identity cannot silently change. Closing is disabled while saving. A genuinely new scan starts a new ledger, not global name deduplication.
- Only verified/current rows emit their individual success notice/event. History, complete-batch notice and confirmed state require every group to be verified/current. Partial success is explicitly per reference and counted, not presented as complete.
- Wishlist status, optional favorite and label-scanner provenance are preserved. `use_for_profile_training=false`: saving is not tasting or learning feedback.

## UI Review

| Before | After | Why |
| --- | --- | --- |
| Active confirm button during insertion | Disabled “Guardando lote”, synchronous lock, busy/status semantics | Prevent duplicate writes and communicate pending work |
| Failed save could still show “Lote confirmado” | Persistent alert and “Guardado sin confirmar” | Do not imply persistence without evidence |
| Partial completion was not visible | Per-reference state and saved/total count | User knows which reference remains unresolved |
| A retry could repeat an already saved group | Explicit “Reintentar pendientes” only after rejection | Preserve partial progress within this batch |
| Confirmation text assumed one line | Auto height, wrapping,48px minimum at the tested size | Keep the action legible and touchable |

Viewport captures were inspected for pending, partial rejection and ambiguity. After normal scrolling to the confirmation section, the tested button is361x48 atx16, bottom621.5; bottom navigation starts773.656px. Document width remains393px. Error messages are persistent and separate from transient individual-wine toasts. `role=status`, `role=alert`, `aria-busy`, native disabled controls and reduced-motion spinner behavior are present. This is one controlled mobile size, not VoiceOver/Dynamic Type certification or a whole-app layout approval.

## Expected / Actual

All rows below PASS after remediation. Counts are intercepted label inserts and successful `wine_saved` events, not remote writes or users.

| Scenario | Expected | Actual |
| --- | --- | --- |
|403 denied | Stop, uncertain, no complete history/event |1 insert attempt;0 success events; blocked reinsertion |
|Null representation | Do not infer failure or success |1 attempt;0 success events; uncertain alert |
|Two verified rows | Complete only after both |2 attempts;2 events;1 complete history item |
|Double activation with first request held | One pending request |1 while held,2 total; pending/close controls disabled |
|First saved, second explicitly rejected | Retain first, retry second only |3 total attempts;2 events; history only after retry success |
|First saved, second ambiguous | Stop without repeating second |2 attempts;1 event; no complete history |
|Anonymous + auth return | Redirect back, no implicit save |0 attempts/events/history; gallery available after auth return |
|A -> B with held response | Ignore old completion |1 attempt; no next group/history/success event |
|Logout with held response | Ignore old completion |1 attempt; no next group/history/success event |
|Unmount to Home | Ignore old completion |1 attempt; no next group/history/success event |
|Back to scan hub | Child unmount invalidates batch |1 attempt; no next group/history/success event |
|Query/context change, child retained | Parent invalidates; no retry of uncertain request |1 attempt; no event/history; disabled uncertain state |
|A -> B -> A | Old generation remains obsolete |1 attempt; no next group/history/success event |
|Transport rejection | Ambiguous, no automatic POST retry |1 attempt;0 events/history |
|Wrong returned owner | Reject success interpretation |1 attempt;0 events/history |
|Wrong status/training fields | Reject success interpretation |1 attempt;0 events/history |
|PGRST116 cardinality error | Ambiguous, not zero-write proof |1 attempt;0 events/history |
|New scan after complete batch | New ledger, no global name suppression |4 attempts/4 events across two confirmed batches |

Final full run17/17; final lifetime-focused run7/7 includes one additional scenario (query change).18 unique scenarios, not24 unique cases. The latter followed a ref-cleanup lint adjustment. Baseline and final runs remain separate. Intermediate harness issues were an overbroad vision assertion matching the intercepted Home recommendation request and a drawer transition during HMR; raw intermediate evidence is retained outside the portable final set. Neither produced a remote request.

Verification:
-53 pure label-save/ledger checks, including callback rejection, absent/malformed result, wrong owner, favorite preservation, partial retry, ambiguous replay block and obsolete result: PASS.
-18 existing mutation confirmation checks and existing multi-wine scanner checks: PASS.
-Typecheck: PASS. Lint:0 errors,106 inherited warnings (no added warnings).
-Normal web build with deterministic fixture flag explicitly false: PASS,6.67s. Existing chunk-size/Browserslist warnings remain. No native compilation or version bump.
-No uncaught browser exceptions. Four intentional browser resource errors correspond to intercepted403,400,406 and connection reset; these are expected negative-test evidence, not hidden console failures.

## Reproduce Locally

Use the established Playwright Python environment and managed-server helper. From the repository:

```bash
PY=/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim73-qa-20261007/.venv/bin/python
$PY /Users/GOIKO/.codex/skills/webapp-testing/scripts/with_server.py --server 'VITE_APP_ANALYTICS_ENABLED=true VITE_MATCHRIM_QA_FIXTURES=true npm run dev -- --host 127.0.0.1 --port 4443' --port 4443 -- $PY scripts/qa-matchrim-label-save.py --analytics --output /tmp/matchrim-label-save-check
npx tsx scripts/check-matchrim-label-save.ts
npx tsx scripts/check-matchrim-wine-mutation.ts
npx tsx scripts/check-multi-wine-scan.ts
npm run typecheck
npm run lint
VITE_MATCHRIM_QA_FIXTURES=false npm run build
```

The harness intercepts every nonlocal request before navigation, even when local analytics is enabled for assertion. Do not use this fixture mode as a recognition benchmark.

## Evidence / Residual

Portable evidence: `docs/qa-evidence/matchrim-label-save-2026-10-11/`,42 SHA256-verified files including baseline, final/lifetime screenshots, JSON traces, executed-source hashes and build/check logs. Representative captures: `final/pending-double-pending.png`, `final/partial-rejected-partial.png`, `final/partial-ambiguous.png`; reproduced baseline `before/denied-failure.png`.

Raw runs: `/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim-label-save-20261011/`.

Remaining separate gates: actual hosted insert/returned-row/RLS behavior, cross-session/server idempotency and ambiguous-write reconciliation; real vision/canonical sensory evidence; physical accessibility and signed distribution. This in-memory ledger is lost on a new scan/reload and does not offer server exactly-once. Existing local history storage policy is unchanged; no global history-isolation claim is made.

No database/schema/SQL/backend/account change, secret access, paid/vision call, native build/number, push/deploy, Apple action, TestFlight upload or invitation. Previous unsigned80 and all corpora/ledgers are preserved;80 does not include source deltas03-08.28 vision calls remain unused. Stop this bounded scope at the completed local checkpoint, not a claim that every product/release gate is complete.
