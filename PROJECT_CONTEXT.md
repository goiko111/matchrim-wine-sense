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
- User learning is derived only from the authenticated user's quiz profile and explicit ratings in `user_wines`.
- Recommendations exclude already saved wines and display learning confidence and sample count.
- aiRIM is a decision surface over the same profile, scan, comparison and recommendation capabilities. It is not a decorative avatar and does not claim memory when no authenticated evidence exists.

## Historical baseline

Build 63 introduced the native mobile navigation and remained the rollback point. Its report is `docs/MATCHRIM_BUILD63_MOBILE_APP_QA_2026-09-04.md`.
