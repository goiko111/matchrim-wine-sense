# Matchrim decisions log

## 2026-09-28: build 63 remains the rollback point

The pre-change commit `66c01a5` is tagged `matchrim-build63-baseline-20260928`. Build 64 is isolated on `codex/matchrim-learning-airim-qa-20260928`.

## 2026-09-28: app navigation replaces a web-style top menu

The persistent mobile information architecture is Inicio, aiRIM, Escanear, Bodega and Perfil. Escaneo remains the primary central action, while Inicio is the personalized decision dashboard.

## 2026-09-28: aiRIM must reveal memory and uncertainty

aiRIM shows whether it has no memory, only a base profile, or a profile reinforced by explicit ratings. Contextual questions are prefilled but never sent automatically. Missing evidence is stated instead of invented.

## 2026-09-28: learning uses explicit, user-owned evidence

Only the authenticated user's quiz profile and saved ratings influence the learned profile. Synthetic personas validate the transformation without creating production accounts or contaminating real data.

## 2026-09-28: no release without the distribution gate

Local installation is allowed for QA. Production, App Store and TestFlight remain blocked until the user authorizes distribution after the physical camera/gallery acceptance pass. Supabase functions remain unchanged while management access returns 403.
