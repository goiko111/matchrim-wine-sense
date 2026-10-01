# Matchrim affinity calibration gate - 2026-10-01

## Decision

The `confidence-v1` affinity calibration is implemented in the client and in the
`calculate-wine-affinity` Edge Function candidate. The function was deployed
only to isolated staging `qpbmqvfnunkylvtvnyyx`. It was not deployed to
production and does not reopen the TestFlight gate by itself.

The change addresses false precision in early profiles: a raw sensory score is
shrunk towards a neutral prior of `72` while profile-learning confidence is low.
At confidence `70` the calibrated score is the raw score. The transformation is
monotonic, so it cannot reorder a recommendation list.

```text
reliability = 0.62 + min(confidence, 70) / 70 * 0.38
affinity = round(72 + (raw_affinity - 72) * reliability)
```

## Product contract

- The API/client result carries `affinity`, `raw_affinity`,
  `affinity_confidence` and `affinity_model=confidence-v1`.
- Winerim API results preserve their original order and source; calibration is
  applied after result merging.
- Labels say `Afinidad orientativa`. When trace data exists, the UI exposes the
  raw sensory score and confidence of the learned profile.
- Saved scanner/import results retain the trace metadata in `place_details`.
- Existing rows without trace metadata remain readable and are not presented as
  calibrated evidence retroactively.
- Training now requires `use_for_profile_training = true` in Index, Profile and
  Edge paths. The database default is false; null or legacy rows are not learned
  from without explicit consent.

## Expected / actual

| Case | Expected | Actual | Gate |
| --- | --- | --- | --- |
| Raw `40`, confidence `0` | Conservative score near prior | `52` | PASS |
| Raw `40`, confidence `35` | Partial shrinkage | `46` | PASS |
| Raw `40`, confidence `70` | Preserve raw score | `40` | PASS |
| Raw `72`, any confidence | Stable neutral prior | `72` | PASS |
| Raw `92`, confidence `0/35/70` | `84/88/92` | `84/88/92` | PASS |
| Client / Edge matrix | Exact parity | Exact parity over score/confidence matrix | PASS |
| Invalid numeric input | Bounded deterministic output | Sanitized to prior/confidence zero | PASS |
| Ranking | No inversions | Monotonic for scores `0..100` at tested confidence levels | PASS |
| Consent | Only explicit opt-in trains profile | Exact `true` filter in all three paths | PASS |

## 10,000-user synthetic year

Reference evidence:
`docs/qa-evidence/matchrim-10000-user-year-2026-10-01/summary.json`.
This is a deterministic model audit, not a study with 10,000 human participants.

- `10,000` synthetic users, `365` days, `421,722` events and `287,675`
  explicit ratings.
- Ranking is unchanged: NDCG@5 `0.6990`, Hit@1 `0.7930`, mean regret `6.1399`.
- Affinity MAE improves from `10.8955` to `10.3749`.
- Calibration error improves from `0.0615` to `0.0487`.
- False-confidence rate improves from `0.0153` to `0.0143`.
- Full-run fingerprint:
  `4b823fcdc41dbeb202c97bf073a07c7bcd77a8cf65a74ff092c31683d640440c`.
- Adaptive recency remains rejected: drift recall was only `0.77%`.

## Verification completed

| Gate | Result |
| --- | --- |
| Learning/calibration contract | PASS, `npx tsx scripts/check-matchrim-learning.ts` |
| Full automated suite | PASS, `npm test` |
| TypeScript | PASS, `npm run typecheck` |
| ESLint | PASS, `npx eslint . --quiet` |
| Production web build | PASS, `npm run build` |
| Native visual regression | PASS, navigation, mutually exclusive scene/list/compare, four supplied menu fixtures portrait/landscape, aiRIM and auth |
| Manual screenshot review | PASS, no overlapping scores, readable pins/list and persistent bottom navigation |
| iOS simulator build | PASS with Xcode 26.0.1 and signing disabled |
| Local Edge runtime | NOT RUN: this host has neither Deno nor an available Docker daemon |
| Hosted Edge runtime | PASS in isolated staging; matrix `52/46/40/72/72/84/88/92` |
| JWT boundary | PASS; ephemeral user created, authenticated, invoked and deleted |
| Authenticated DB persistence | BLOCKED; staging Data API returns HTTP `503` while loading its schema cache |

Visual evidence and machine-readable results:
`docs/qa-evidence/matchrim-native-redesign/`.

The legacy `qa-matchrim-25-persona-ui.cjs` runner still expects the removed
`Que quieres elegir?` screen and is stale. It is not evidence of a product
failure. The current 25-persona functional checks remain covered by `npm test`;
the old selector runner should be replaced, not relaxed.

## Residual release gates

The current build is not eligible for a new TestFlight on recognition quality:

- Recorded multi-label identity remains precision `0.5000`, recall `0.8889`.
- Food-menu recall remains `0.2407`.
- The cabinet still lacks an exhaustive human-validated
  `box -> crop -> result -> identity` reconciliation.
- The hosted calibrator has run in isolated staging, but profile read/write has
  not: Auth is healthy while the Data API returns HTTP `503` for its root,
  `quiz_results` and `user_wines` probes.

## Next gate

Restore the Data API/schema cache in `qpbmqvfnunkylvtvnyyx` (or designate a
different isolated Matchrim staging project containing `quiz_results` and
`user_wines`). Then, with an authenticated consenting test user, verify the four
trace fields, database persistence and opt-out behavior. Hosted runtime parity
is already green. Afterwards rerun the real vision benchmark. TestFlight
requires the recognition thresholds already documented; this calibration
change does not waive them.

## Staging deployment record

- Project: `qpbmqvfnunkylvtvnyyx` (`winerim-middleware-staging`).
- Function: `calculate-wine-affinity`, version `1`, status `ACTIVE`, JWT required.
- Deployment time: `2026-10-01T12:37:19Z`.
- Bundle SHA-256:
  `297036f39c57fe5050f58b402acf4da0e9cacaca1a9f8a99127cac93234a3984`.
- The temporary runtime probe was deleted after the assertion.
- No production function, database row, secret or TestFlight build was changed.
- Machine-readable evidence:
  `docs/qa-evidence/matchrim-affinity-staging-2026-10-01/results.json`.
