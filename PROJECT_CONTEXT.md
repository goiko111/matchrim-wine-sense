# Matchrim project context

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
