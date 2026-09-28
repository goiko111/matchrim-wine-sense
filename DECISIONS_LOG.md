# Matchrim decisions log

## 2026-09-28: build 63 remains the rollback point

The pre-change commit `66c01a5` is tagged `matchrim-build63-baseline-20260928`. Build 64 is isolated on `codex/matchrim-learning-airim-qa-20260928`.

## 2026-09-28: app navigation replaces a web-style top menu

The persistent mobile information architecture is Inicio, aiRIM, Escanear, Bodega and Perfil. Escaneo remains the primary central action, while Inicio is the personalized decision dashboard.

## 2026-09-28: aiRIM must reveal memory and uncertainty

aiRIM shows whether it has no memory, only a base profile, or a profile reinforced by explicit ratings. Contextual questions are prefilled but never sent automatically. Missing evidence is stated instead of invented.

## 2026-09-28: learning uses explicit, user-owned evidence

Only the authenticated user's quiz profile and saved ratings influence the learned profile. Synthetic personas validate the transformation without creating production accounts or contaminating real data.

## 2026-09-28: distribution required an explicit gate

Local installation was allowed for QA while App Store and TestFlight remained blocked. The user subsequently authorized completion with `Hazlo`; the signed build and real aiRIM audit were green before upload. Supabase functions remain unchanged while management access returns 403.

## 2026-09-28: recommendation confidence must be qualitative unless calculated

The real aiRIM persona audit exposed invented recommendation-confidence percentages. Build 64 adds shared evidence guardrails: qualitative recommendation confidence with reasons, explicit data/inference/preference separation, no unsupported price or availability claims, and a named missing-data effect. The calculated learning-confidence percentage remains visible because it comes from the deterministic profile learner.

## 2026-09-28: build 64 distribution authorized

After the user authorized completion, the final grounded archive was signed and uploaded to App Store Connect. The web and Supabase functions were not deployed. `Upload succeeded` is recorded separately from Apple's later processing and tester availability.

## 2026-09-28: recognition evidence separated from UI fixtures

The canonical matrix now reports real-backend precision/recall separately from the
27/27 controlled UI suite. A real CC0 food-menu photograph was annotated and sent to
the deployed `scan-food-pairing` runtime without authentication or production writes.
It grounded all eight result cards but covered only 13/54 visible dish names and merged
six desserts, so food-menu recognition is not certified. Single-label and multi-label
independent metrics also remain below the 0.90 precision gate. No backend deploy or
build 65 is justified until those defects are corrected and rerun in staging.
