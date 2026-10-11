# Bodega rating, training and deletion

Assignment MATCHRIM-5H-20261011-04. Baseline bda0c91. Source-only local remediation of three actions in `MyWines.tsx`; purchase and other modules are excluded.

## Reproduced baseline

Thirteen targeted cases all exposed at least one failed expectation. Delayed success/error could notify after A -> B or A -> B -> A for all three actions. A stale rating success also navigated and invoked affinity. Existing mounted read guards already suppressed some stale refreshes for training/delete; this report does not claim all their reads bypassed those guards.

Training/delete accepted duplicate pending actions (delete also prompted twice). Rating already suppressed its duplicate write, but its control remained enabled. All three announced success for an empty204 response. A rating without sensory data claimed it was used to refine the profile.

Baseline harness caveats: the rating-empty failure subsequently caused a missing-control timeout after the erroneous navigation; duplicate-delete subsequently hit a fixture `None` handling error. Both cases had independently recorded product failures before those harness errors. Fixture handling was corrected; these secondary harness failures are not additional product defects. Raw baseline results remain immutable.

## Changes

| Before | After | Reason |
| --- | --- | --- |
| Post-await global side effects outlived the account view | Same mounted lifetime/generation gate as the prior favorite fix | Old results cannot notify, navigate, invoke affinity or certify a new operation |
| Separate or absent pending guards | Shared per-wine lock for these three actions, disabled/busy controls | Prevent repeated/conflicting pending rating, training and deletion actions within the view |
| `error === null` treated as proof | Require a returned single row matching the ID and changed fields | No success on empty, array/no-match, unrelated ID or wrong field values |
| Wishlist rating claimed training regardless of attributes | Confirm rating/move separately and explicitly name missing sensory attributes | No fabricated training or sensory values |
| Enlarged landscape rating buttons overlapped | Locally responsive rating-button grid with wrapping text | Readable controls without changing the broader page design |

Changes: `src/pages/MyWines.tsx`, `src/utils/matchrimWineMutation.ts`. New contract check is included in `test:release`. The existing generation harness's training fixture now returns its submitted boolean as required by the new confirmation contract; previous evidence is not rewritten.

## Confirmation contract

- Locked and installed `@supabase/supabase-js` and `@supabase/postgrest-js`:2.107.0. No dependency change.
- Official documentation checked2026-10-11: [update](https://supabase.com/docs/reference/javascript/update), [delete](https://supabase.com/docs/reference/javascript/delete), [single](https://supabase.com/docs/reference/javascript/single). Updates/deletes can request affected rows with `select()`; `single()` requests one object. Installed transform source confirms `Prefer: return=representation` and the object Accept header. Changelog reviewed; no relevant change to these modifiers found. No API privileges were altered.
- Training requests `id,use_for_profile_training`; requires exact wine ID and requested boolean.
- Rating requests `id,rating,use_for_profile_training,status,quantity,consumption_date`; requires the exact ID and each submitted value. Timestamp comparison accepts equivalent UTC/timezone encodings, not a different instant. Existing migrations declare `consumption_date TIMESTAMPTZ`.
- Deletion requests `id`; requires the deleted row ID. Empty/unconfirmed results report that confirmation failed, not that the operation definitely did not happen.
- Requests still filter both owner and wine ID. Hosted RLS/representation behavior is not tested here and remains a release gate. Do not widen policies to force a passing response.

## Expected / actual matrix

All non-local application traffic intercepted; analytics disabled. Two fictitious identities, not real accounts or human preference outcomes.

| Case family | Expected | Actual after |
| --- | --- | --- |
| A -> B success/error, all three actions | No old notices/navigation/reads/affinity |6/6 PASS |
| A -> B -> A success/error, all three | Original operation remains obsolete |6/6 PASS |
| Logout success/error, all three | No stale side effects |6/6 PASS |
| Route unmount success/error, all three | No stale side effects |6/6 PASS |
| Return with a new operation pending | Old completion cannot clear or confirm it |3/3 PASS |
| Duplicate pending action | One request, one confirmation |3/3 PASS |
| Rejection followed by retry | No false success; control re-enabled |3/3 PASS |
| Empty204, no-match array, unrelated ID | No success/navigation/downstream request |9/9 PASS |
| Wrong rating/training field | No success despite matching ID |2/2 PASS |
| Collection quantity2 and quantity1 | Decrement once; last bottle moves to tasted with timestamp |2/2 PASS |
| Missing attributes: rating and training control | Save explicit rating without training claim; no training switch/write |2/2 PASS |
| Remove rating; disable training | Preserve existing value/consumption rules |2/2 PASS |
| Re-rate collection; explicit negative rating | No additional consumption; rejected destination retained |2/2 PASS |
| Cross-action pending; cancel delete | No competing write; cancelled confirmation sends no mutation |2/2 PASS |

Total:54 distinct new UI scenarios pass. The new-operation delete case releases an old rejection before confirming the new delete; rating/training release old successes. This does not model exactly-once server deletion or a concurrent restore.

Execution sets:44-case main run,7-case policy/landscape run (4 new scenarios plus3 variants),6 late-error cases,3 final landscape visual reruns and1 portrait visual rerun after button layout correction. One affected prior case, `same-owner-learning`, rerun and PASS. No wholesale replay of the prior23/25 suites.

Additional verification:
-18/18 new response-confirmation contracts. Existing learning checks and28/28 pure training-evidence checks PASS.
- Typecheck PASS. Lint0 errors/106 inherited warnings (one prior `any` removed). Final web build PASS,6.88seconds, inherited Browserslist/large-chunk warnings remain.
- No uncaught page exceptions in corrected UI runs. Synthetic403 responses and handled error logs are intentional; this is not a claim of zero console messages.
- Mobile portrait393x852 and selected landscape852x393 with135% CSS text. Final rating buttons and error/missing-attribute notices visually inspected. Not native Dynamic Type, VoiceOver or physical-device certification.

## Visual residual

The broader landscape/enlarged-text page still has clipped scan/search action labels, a clipped learning-panel CTA and cramped contextual aiRIM buttons. These were visible in the selected screenshots and are not covered by the rating-button fix. A passing page-width check does not certify those panels. This bounded milestone does not approve the whole Bodega layout.

## Evidence and boundaries

Raw evidence: `/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim-bodega-actions-20261011/`.
Portable results/captures/check logs and SHA256 manifest: `docs/qa-evidence/matchrim-bodega-actions-2026-10-11/`.

Reproduce through `with_server.py` with `VITE_APP_ANALYTICS_ENABLED=false npm run dev -- --host 127.0.0.1 --port 4439`, then `scripts/qa-matchrim-bodega-actions.py --url http://127.0.0.1:4439 --output <directory>`. `--cases action:scenario,...` restricts the set; `--landscape-text` enables the documented CSS-text variant.

The existing explicit-rating, quantity/consumption, training opt-in flag and learned formula are retained. No synthetic sensory values are added. Confirmation of a valid current rating retains the existing background affinity request policy; obsolete/unconfirmed completions cannot initiate it. No actual Edge call was made.

Client discard/locking does not cancel a server write already received, guarantee exactly-once between sessions or replace server concurrency controls. Purchase, manual add, favorites beyond their previous scope, and mutations in other modules are not certified. Live recognition/data, hosted ownership/persistence, physical accessibility and Apple distribution remain separate gates. Corpus/holdouts/ledgers and28 vision calls remain intact.

No push, deployment, production change, migration, native rebuild/version bump, TestFlight, invitation or Apple action. The existing unsigned simulator80 does not contain this or the prior source-only Bodega lifetime delta.
