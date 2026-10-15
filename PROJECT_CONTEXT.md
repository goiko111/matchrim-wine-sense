# Matchrim project context

## Active source reconciliation: 2026-10-15

Current local repository is `/Users/GOIKO/2matchrim76-recognition-20261008`, branch
`codex/matchrim82-cloud-integration-20261013`, product2ea342f / QA docs9900201.
The older repository/branch listed below describe the September baseline, not the
current checkout. Current source and an installed binary are separate facts.

Latest owner instruction supersedes the phone lane: QA87 uses only the existing
isolated simulator and50 technical staging accounts, before TestFlight. No product
source changed. Final50-account audit found31rendered-profile/score differences
and138missing-data disclosures, despite correct prior scorer-callsite checks.
See docs/MATCHRIM_PRETESTFLIGHT_50_QA_2026-10-15.md; release remains HOLD.
The following QA86 phone scope is historical, not the current work instruction.

New QA86 is a user-journey audit only: actual connected iPhone16ProMax/iOS26.6
has Matchrim1.0(82) read back by CoreDevice on15Oct. No app replacement, new
TestFlight, production deployment or source-product remediation is authorized by
this audit. QA85's50 technical accounts and22 recognition journeys are not50
humans, an installed85 or global product approval. See CURRENT_STATE/NEXT_STEPS.

## Product boundary

Matchrim is the consumer and sommelier decision app for Winerim data. Its core jobs are to scan one or several bottles, labels, printed menus, boards or PDFs; preserve uncertainty; compare wines; and explain affinity without presenting inferred data as fact.

Cellar administration and Winerim backoffice work remain outside this product. The public web experience is not part of the build 64 redesign.

## Source of truth

- Repository: `/Users/GOIKO/2matchrim-release-integration-20260902`
- Baseline: commit `66c01a5`, tagged `matchrim-build63-baseline-20260928`
- Active branch: `codex/matchrim-learning-airim-qa-20260928`
- iOS bundle: `wine.matchrim.app`
- Supabase project: `cbjynrbvrhcmpaojmqdp`

## Architecture

- React/Vite client packaged with Capacitor for iOS.
- Supabase Auth, database and Edge Functions.
- User learning is derived only from the authenticated user's quiz profile and explicit ratings in `user_wines`. Confidence measures coverage, directional consistency and sensory diversity; timestamped evidence receives a bounded recency weight.
- Recommendations exclude already saved wines and display learning confidence and sample count. Identity comparison uses name plus producer and, when both sides provide it, vintage; saving one vintage does not hide another.
- Saved-wine state is bound to the active account before recommendations run, preventing a session switch from briefly reusing another user's cellar state.
- aiRIM is a decision surface over the same profile, scan, comparison and recommendation capabilities. It is not a decorative avatar and does not claim memory when no authenticated evidence exists.
- Food-menu scanning has a pure normalization contract under `supabase/functions/scan-food-pairing/contract.ts`: one dish per row, exact-row dedupe, conservative merged-row splitting and explicit coverage/truncation.
- The prepared Bodega migration adds an exact canonical name/producer/vintage identity and unique per-user index. It is a staging candidate, not current production schema.

## QA data boundary

Persona and navigation regressions use deterministic local fixtures and intercepted network responses. They never create production users or write ratings, saved wines or scan results. Real authenticated behavior remains a separate staging/physical-device gate.

Integral QA is tracked in `docs/MATCHRIM_INTEGRAL_QA_2026-09-29.md`. A local cohort may model 1,000 isolated users, but it must never be described as 1,000 human users or as backend load. Load, synthetic account creation and destructive privacy flows require an authorized isolated tenant.

`scripts/load-matchrim-staging.ts` is dry-run by default and rejects the production URL/project. Execution requires existing isolated staging identities; it does not create accounts or call paid AI.

## Historical baseline

Build 63 introduced the native mobile navigation and remained the rollback point. Its report is `docs/MATCHRIM_BUILD63_MOBILE_APP_QA_2026-09-04.md`.
