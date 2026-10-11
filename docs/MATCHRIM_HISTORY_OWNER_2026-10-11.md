# Matchrim local history ownership

Assignment MATCHRIM-5H-20261011-09. Baseline `a8b3a0a850cd92ba3e734213c02f325ce0fc7b20`. Completed local checkpoint only, not a production incident finding or release approval.

## New Reproduction

The real `/escanear/encontrar-vino` flow used a held deterministic `analyze-shop-link` response in an isolated393x852 browser context. Every nonlocal request was intercepted, including function/auth/database/event requests. No provider, external catalog, private URL, camera, photo, OCR or model was contacted. Synthetic local acknowledgement is not owner consent.

Before edits:6/9 cases failed; the current-response control and both existing reader-cleanup controls passed. The critical trace is explicit: after A -> B, `matchrim.local_profile_owner.v1` is B and history is empty; releasing A's old response then inserts `Encontrar vino: QA tienda A`, renders A's result and emits `shop_link_analyzed`. Logout, A -> B -> A and an actual second-tab account change reproduce the same late continuation. Unmount appends history/emits success without a visible result. An old error after account change shows a stale notice.

This does not mean that ordinary pre-existing history always crosses accounts. `reconcileMatchrimLocalOwner` already clears it correctly. Its cleanup function is byte-identical to baseline after this change; the new trace concerns repopulation after cleanup.

## Reachability

- `App.tsx` routes `/escanear` and `/escanear/:mode` to `pages/Scan.tsx`, which uses the component ScanHub and the shop advisor/multi-label scanner.
- `WineLabelOCRImport` is imported only by `src/pages/ScanHub.tsx`; that page is not imported by the active router or another source module. No glob route loader was found. The legacy scanner and its deferred enrichment/update path were not reactivated, edited or remotely exercised.
- Two reachable history writers now use the explicit guarded contract: shop advisor and existing multi-label batch. The label save/owner/partial-result guards from08 are unchanged; only its history call adopts the shared context. One successful label-save regression was run, not its18-case suite.
- Both reachable readers, scan hub and NativeAppHome, now pass the active owner and refresh on owner changes as well as existing history/storage events.

## Remediation

Shop operations capture user ID and lifecycle generation before awaiting. The account-keyed session resets inputs/results on account change. Response, error and finally paths reject obsolete lifetimes or a different local cache owner. A synchronous pending guard prevents duplicate submission in the same session. A's old finally cannot clear B's new pending search.

`recordOwnedScanHistory` takes explicit captured owner/lifetime context and checks it before the existing writer. `getScanHistory(ownerId)` hides mismatched or unattributed cache without deleting it. The local owner marker is only a client cache consistency check, never authentication or server authorization.

No history schema/key/version migration, per-user archive, inferred legacy attribution, extra private-data deletion or backend synchronization. The existing eight-item retention, anonymous/current history behavior, signout/change cleanup and non-personal settings are retained. The old unguarded record/update API remains for the unrouted legacy scanner; reactivating it requires a separate lifetime review.

| Before | After | Why |
| --- | --- | --- |
| A's response could append after B's cleanup | Captured owner and active generation checked after await | Do not repopulate another session's local history |
| Old errors/finally ran after leaving the view | Obsolete continuations return without side effects | Protect current results, notices and B's pending state |
| Completed shop fields/results persisted across owner changes | Account-keyed session | A's query/result is not displayed to B |
| History readers depended only on storage/events | Explicit owner read plus owner-dependent refresh | Hide cache belonging to a different local context |
| Existing owner cleanup worked | Cleanup function preserved exactly | Fix the late writer, not retention policy |

No new design, text, animation or navigation was introduced. Captures record state behavior, not a new visual/accessibility certification.

## QA Matrix

13 unique new browser scenarios PASS. The initial9-case after-run is a repeated subset, not additional unique users. Fixtures are not13 real accounts or wine-quality judgments.

| Case | Expected / Actual |
| --- | --- |
| Current response | One result/event/history item added; previous same-owner item retained; readable after hub navigation and reload |
| A response -> B | Prior history cleared before release; no late result, event or history; remains absent after reload |
| A response -> logout | No old result/history in anonymous context |
| A response -> unmount | No append or success event; existing A history preserved |
| A -> B -> A | Old generation remains obsolete; no resurrected history |
| Late error -> B | No old error notice or history |
| Hub reader + ordinary cleanup | Existing A entry disappears on B and remains absent after reload; passed before and after |
| Home reader + ordinary cleanup | Same existing cleanup behavior preserved; passed before and after |
| Two tabs + SDK account change | Second tab switches to B; first tab ignores held A response after cleanup |
| Hub + mismatched cache event | Synthetic second-tab B cache hidden from A without deleting it; visible after actual B context and reload |
| Home + mismatched cache event | Same owner-aware read behavior; no extra deletion |
| Completed response -> B | Previously visible A result and input cleared; history cleanup unchanged |
| A held, B starts new search | Releasing A does not clear B's loading state; only B's response becomes result/history/event and survives reload |

Additional affected checks:
-27 pure local ownership/retention checks PASS: absent owner, wrong owner, obsolete lifetime, anonymous-to-authenticated policy, same-owner retention, malformed/unavailable cache, no unexpected deletion and eight-item limit.
-Existing scan-profile/owner-policy contract regression PASS. Its cleanup assertions continue to pass.
-One existing multi-label success UI case PASS: verified batch still records history through the new wrapper. No rerun of08's full battery.
-Typecheck PASS; lint0 errors/106 inherited warnings; normal web build PASS6.79s, fixture flag explicitly false. Existing build chunk-size/Browserslist warnings remain.
-No uncaught browser exceptions. The pure malformed-cache case intentionally logs the existing parse warning; that negative test passes.

## SDK / Reproduction

Installed supabase-js/auth-js/functions-js2.107.0 checked. Public changelog index showed no applicable browser breaking change for this operation (the listed realtime Node<22 change is unrelated). Existing SDK invoke returns data/error after fetch; it does not track React owner lifetimes. [Invoke documentation](https://supabase.com/docs/reference/javascript/functions-invoke) and [auth-event documentation](https://supabase.com/docs/reference/javascript/auth-onauthstatechange) were consulted. No SDK/auth-provider changes, upgrades, CLI, remote query or advisors.

```bash
PY=/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim73-qa-20261007/.venv/bin/python
$PY /Users/GOIKO/.codex/skills/webapp-testing/scripts/with_server.py --server 'VITE_APP_ANALYTICS_ENABLED=true npm run dev -- --host 127.0.0.1 --port 4444' --port 4444 -- $PY scripts/qa-matchrim-history-owner.py --output /tmp/matchrim-history-owner
npx tsx scripts/check-matchrim-history-owner.ts
npx tsx scripts/check-matchrim-scan-profile.ts
npm run typecheck
npm run lint
VITE_MATCHRIM_QA_FIXTURES=false npm run build
```

The harness seeds localStorage once per isolated context, not on every reload, so persistence checks cannot be satisfied by reseeding. All nonlocal requests are mocked before navigation; test event assertions are local and do not change the analytics subsystem.

## Evidence / Gates

Portable: `docs/qa-evidence/matchrim-history-owner-2026-10-11/`.32 hashed evidence files, eight tested-source hashes, immutable before/final JSON and screenshots, single label regression, five check/build logs. Raw runs remain at `/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim-history-owner-20261011/`. Representative captures: `before/switch-failure.png`, `final/switch.png`, `final/current.png`, `final/switch-pending.png`. JSON contains the before-release empty B history and after-release state, which screenshots alone cannot prove.

Residual: this is local client isolation, not server authorization/RLS, atomic multi-tab storage transactions, provider cancellation, real intelligence accuracy or physical QA. Unattributed legacy storage is not migrated; any future retention/migration policy needs a separate decision. The old unrouted scanner cannot be treated as approved if reintroduced.

No native build/number, push/deploy, Apple/TestFlight/invitation, backend/SQL/schema/account/secret/paid call. Previous unsigned80 lacks03-09; all previous assignments/evidence/corpora/holdouts/ledgers and28 remaining vision calls are preserved. Stop at this completed bounded checkpoint.
