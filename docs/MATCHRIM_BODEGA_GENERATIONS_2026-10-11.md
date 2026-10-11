# Bodega account lifetimes and late responses

Assignment: MATCHRIM-5H-20261011-03. Baseline: 474d496. Local source change only; no remote writes, production, RLS/schema, vision, Apple action, push or native rebuild.

## Reproduction and correction

On baseline, delayed section-count and learning requests could replace the new account's visible values. Previously loaded A counters/preferences survived a failed B load. A pending favorite could also toast and refresh after A -> B -> A, or after leaving Bodega. A double click issued two intercepted updates. These are reproduced client-lifecycle defects, not a demonstrated production authorization vulnerability.

| Before | After | Why |
| --- | --- | --- |
| Account state persisted across owner changes | Account-keyed Bodega subtree resets list, learning, counts and dialogs together | No previous-owner state while the next owner is loading or fails |
| Count/learning responses had no freshness guard | Per-loader controllers, current-request checks and cleanup | Older same-owner results cannot replace a fresh refresh |
| Favorite checked owner ID only | Mounted lifetime/generation captured by each operation | Returning to A does not reactivate the previous A operation |
| Repeated favorite clicks issued repeated writes | Synchronous per-wine pending guard, disabled/busy button | One in-flight operation per wine in this mounted view |

Source: `src/pages/MyWines.tsx`. Reproducible harness: `scripts/qa-matchrim-bodega-generations.py`.

## Expected / actual

All browser tests use two synthetic accounts and intercept every non-local network request. No real user was created or tested. Screenshots are mobile Chrome at393x852 with native layout enabled, not physical iPhone or VoiceOver certification.

| Scenario | Expected | Baseline | Corrected |
| --- | --- | --- | --- |
| Held A counters released after B success | B count2 remains | A count7 replaces B | PASS |
| Held A learning released after B success | Only B preferences | A preferences visible | PASS |
| Loaded A -> slow B | No visible A values | Initial test selector incorrectly expected a visible count while spinner active; not a product finding | PASS with corrected assertion |
| Loaded A -> failed B | No A counts, preferences or list | A count7/preferences remain | PASS |
| Same owner: second count refresh then first response | New count2 remains | Old count7 restored | PASS |
| Same owner: training change then old learning response | New learning remains | Old learning restored | PASS |
| Favorite success after A -> B -> A | No stale notice or refresh | Stale notice and refresh | PASS |
| Favorite error after A -> B -> A | No stale notice | Stale error notice | PASS |
| Favorite response after leaving Bodega | No stale notice or refresh | Stale notice and refresh | PASS |
| Favorite response after logout | No stale notice or refresh | PASS | PASS |
| Duplicate pending favorite click | One write and one confirmation | Two writes/confirmations | PASS |
| New favorite retry on returning A, then old response | New operation remains pending until its own response | Added after reproduction | PASS |
| Held reads after logout | No old data or new side effects | Added after reproduction | PASS |
| Held reads after route unmount | No old data or new side effects | Added after reproduction | PASS |
| Held A reads released after failed B | No A data or counts | Added after reproduction | PASS |

- Initial baseline:9 reproducible failing cases,1 passing case,1 harness-selector error. Do not count the harness error as a product defect.
- Corrected:15/15 focused cases, zero page exceptions.
- Additional transport variant:5/5 affected read cases with fetch cancellation deliberately ignored. Freshness checks still prevent old state updates. These are variants, not5 additional users.
- Existing affected regressions:3/3 (favorite rejection/retry,10second main-list timeout/retry, logout with pending main load). No wholesale rerun of unrelated completed suites.
- Bodega identity contracts and learning checks PASS. `npm run typecheck` PASS. ESLint0 errors/107 inherited warnings after resolving the new ref-cleanup warning. Web build PASS,7.00seconds; inherited Browserslist/chunk-size warnings remain.
- No additional native build: simulator80 remains the previous unsigned binary and does NOT include this source delta. No new version number or TestFlight upload claimed.

## Evidence and reproduction

Raw local results and screenshots:
`/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim-bodega-generations-20261011/`

Portable selected before/after screenshots, result JSON and SHA256 manifest: `docs/qa-evidence/matchrim-bodega-generations-2026-10-11/`.

Run the harness through the existing `with_server.py` helper with `VITE_APP_ANALYTICS_ENABLED=false npm run dev -- --host 127.0.0.1 --port 4438`. Harness arguments: `--url http://127.0.0.1:4438 --output <evidence-directory>`. Optional `--cases` is a comma-separated subset. For the uncancellable variant add `--ignore-read-abort --cases late-counts,late-learning,same-owner-counts,same-owner-learning,late-reads-to-error`.

## Residual and boundary

This closes the specified reads/favorite lifetime scope, not every mutation in Bodega. Rating, training, purchase and delete mutation lifecycles have not been audited as part of this assignment. Client discard/abort does not prove server-write cancellation, cross-session idempotency or exactly-once persistence. The pending favorite guard covers this mounted view only; a write already received by a server may still finish after navigation. Hosted ownership/RLS and concurrent server-write verification remain separate gates.

The error screen shows cleared initial counters plus a load failure, not verified empty remote holdings. This work adds no recognition precision/recall or real preference outcome evidence. Existing corpora, holdouts, ledgers and28 unused vision calls are unchanged. Apple session/invitation, live canonical sensory coverage, independent recognition and physical QA remain unchanged external gates. Do not rerun Apple or consume vision calls for this checkpoint.
