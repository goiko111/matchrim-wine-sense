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

## 2026-09-28: saved recommendations never recycle silently

If every returned recommendation is already in Bodega, Inicio shows an exhausted state and links to Bodega instead of reintroducing saved wines. Identity requires the same normalized name, rejects conflicting producers and rejects conflicting vintages when both are known. Missing producer or vintage remains a conservative wildcard; one explicitly different vintage stays eligible.

## 2026-09-28: personalization state belongs to one active account

Recommendation calculation waits until loaded saved-wine state identifies the current user, or the explicit anonymous scope. A session transition cannot calculate against the previous account's cellar. Reproducible QA uses synthetic in-memory personas and intercepted responses only; authenticated staging, TestFlight processing and physical-camera validation stay separate external gates.

## 2026-09-29: integral QA precedes further distribution

No new TestFlight build is used as evidence of product correctness. The release gate now requires route/state coverage, ten authenticated longitudinal personas, real recognition thresholds, physical camera/accessibility evidence and authorized staging load. Local fixtures, real backend calls and physical tests are reported separately.

## 2026-09-29: build 64 is pinned to source commit 1a54cda

A clean detached rebuild of `1a54cda` matches every Vite file in the signed build 64 archive; Capacitor adds only `cordova.js` and `cordova_plugins.js`. The comparable tree hash is `d6b9e4a5bcbc3b6f566fa50fa45c4f35c6f4fc06c742cebc0718d0ca9e027b`. Later QA and personalization commits are not represented in TestFlight.

## 2026-09-29: synthetic scale claims stay narrow

The 1,000-user local cohort proves only deterministic in-process model isolation and speed. It is not backend concurrency, cost evidence or human validation. No mass production load or synthetic account creation is permitted without an isolated tenant, owned identities and explicit rate/cost approval.

## 2026-09-29: confidence is evidence quality, not a row counter

Learning confidence combines sample coverage, directional consistency and sensory diversity. Timestamps weight preference deltas toward recent explicit ratings. Repeated or contradictory rows cannot produce 100% confidence, and aiRIM receives the contradiction state so it can explain instability.

## 2026-09-29: Bodega uniqueness must not destroy history

The prepared canonical-identity migration enforces exact normalized name, producer and vintage per user, while the client can reconcile a temporarily unknown producer. Migration preflight aborts on existing duplicates rather than guessing how to merge notes, ratings, status or quantity. It remains unapplied until isolated staging exists.

## 2026-09-29: local replay cannot certify a backend fix

Food-menu row splitting and detection-box normalization may be replayed deterministically against recorded real responses. They are reported as local post-processing only. Recognition is certified only after candidate functions run on independent images in authorized staging and every category clears `0.90` precision and recall.
