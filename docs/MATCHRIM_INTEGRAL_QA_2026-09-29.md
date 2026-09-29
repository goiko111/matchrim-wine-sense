# Matchrim integral QA program

Updated: 2026-09-29

## Executive decision

Release gate: **NO-GO for another TestFlight build**. Build 64 is a valid signed and uploaded artifact, but integral product behavior is not certified. Real recognition remains below the P0 thresholds, authenticated longitudinal QA has no authorized isolated tenant, physical camera/gallery evidence is incomplete, and no staging load run has occurred.

This first lot did not create accounts, contact third parties, mutate production or send load to Supabase. It delivered a full route inventory, ten longitudinal synthetic personas, 1,000 isolated local model sessions, exact build-64 parity and four safe local corrections.

## Build 64 versus local

| Surface | Build 64 TestFlight artifact | Local branch after build 64 |
| --- | --- | --- |
| Exact source | `1a54cda` | `182dd32` plus this QA lot |
| Proof | Clean detached rebuild matches every archived Vite file; comparable tree SHA-256 `d6b9e4a5...027b` | Git diff and reproducible local build |
| aiRIM grounding | Included | Preserved |
| Recognition evidence matrix | Not included as product code; produced later in `8e546a2` | Included as QA evidence |
| Strict saved-wine exclusion | Falls back to already saved candidates when all are saved | Fixed in `182dd32` |
| Account-switch cellar isolation | Not included | Fixed in `182dd32` |
| Canonical duplicate recommendation collapse | Not included | Fixed in this lot |
| Invalid wine UUID guard, Spanish 404, deletion branding | Not included | Fixed in this lot |
| TestFlight availability | Upload accepted; processing/tester state not verified | Not uploaded |

Evidence: `docs/qa-evidence/matchrim-integral-qa-2026-09-29/build64-parity.json`.

## Executable program

| Layer | Execution | Evidence | State |
| --- | --- | --- | --- |
| 1. Inventory and parity | Enumerate all routes, user jobs, guards, states and exact binary source | Route JSON, screenshots, archive comparison | First lot complete |
| 2. Longitudinal personas | Ten personas at 0, 1, 5 and 20 ratings; save, opposite feedback, changed opinion, vintage and duplicate invariants | `persona-longitudinal.json` | Local model complete; authenticated E2E blocked |
| 3. Full journeys | Auth/recovery, quiz, Home, aiRIM, all scan modes, comparison, Bodega CRUD, profile, privacy, offline/restart/account switch | Per-step finding records with screenshots/logs | Anonymous shell partial; auth and physical pending |
| 4. Real recognition/mobile | Keep fixtures separate from real backend; iPhone camera/gallery, portrait/landscape, Dynamic Type and VoiceOver | Existing matrix plus new device capture | Recognition P0 open; physical gate pending |
| 5. 1,000 virtual users | Local algorithm cohort first; then authorized staging ramp 10→50→200→1,000 with rate/cost stops | Percentiles, errors, duplicates, isolation and cost | Local algorithm complete; staging load blocked |
| 6. Product evaluation | Time to first value, comprehension, recurrence, false facts, privacy and useful aiRIM prominence | Moderated task rubric and analytics plan | Heuristic baseline started |

## Personas and longitudinal coverage

| Persona | Primary job | Cold top | Top after 20 | Confidence | Result |
| --- | --- | --- | --- | ---: | --- |
| Novato sin historial | Understand taste without jargon | Godello redondo | Godello redondo | 0 | Stable, but cold choice has no diversity rationale |
| Blanco atlántico | Fresh, saline whites | Godello redondo | Albariño atlántico | 100 | Converges |
| Tinto clásico | Structured familiar reds | Godello redondo | Rioja reserva | 100 | Converges |
| Experto explorador | High acid/tannin exploration | Godello redondo | Nebbiolo estructurado | 100 | Converges |
| Frutal suave | Fruit with low tannin | Godello redondo | Tinto frutal | 100 | Converges |
| Dulce aromático | Sweet aromatic styles | Godello redondo | Moscatel dulce | 100 | Converges |
| Baja acidez | Avoid tense profiles | Godello redondo | Blanco baja acidez | 100 | Converges |
| Presupuesto estricto | Stay below EUR 15 | Godello redondo | Godello redondo | 0 | Budget is not a learned dimension |
| Maridaje marisco | One-off pairing, not permanent taste | Godello redondo | Godello redondo | 0 | Occasion is contextual, not learned |
| Cambio de opinión | Move from Rioja to Atlantic white | Godello redondo | Rioja reserva, then reversal | 100 | Weak reversal picks collateral tinto; sustained reversal converges |

Verified invariants: saving without rating does not train; incomplete sensory attributes do not silently train; different vintages remain distinct; displayed canonical duplicates collapse; 1,000 serialized virtual sessions remain isolated.

Important limitation: confidence reaches 100% from sample count alone after twelve valid ratings. It does not measure diversity, contradiction, recency or predictive accuracy.

## Route coverage matrix

Legend: PASS means the specified local/anonymous state only. PARTIAL means meaningful authenticated, backend or physical states remain. FAIL is a demonstrated release blocker. EXCLUDED is intentionally outside the consumer product.

| Route | User objective | States and evidence | Result |
| --- | --- | --- | --- |
| `/` | Choose the next wine task | Cold render, empty/error recommendation states, aiRIM and Scan separation; authenticated saved-state pending | PARTIAL |
| `/auth` | Sign in or begin registration | Login/register UI and redirect target render; real login/error/session expiry pending | PARTIAL |
| `/forgot-password` | Request recovery | Empty form renders; authorized email delivery not exercised | PARTIAL |
| `/reset-password` | Set new password | Invalid/expired-link state renders; valid recovery session pending | PARTIAL |
| `/registration` | Create account with consent | Three-step shell renders; no synthetic account created without isolated tenant | PARTIAL |
| `/matchrim` | Complete quiz and obtain profile | Intro/local persistence available; full comprehension run per persona pending | PARTIAL |
| `/usar-matchrim` | Use profile against Winerim recommendations/carta | No-profile state renders; authenticated save/session behavior pending | PARTIAL |
| `/escanear` | Select capture type | Five modes visible, no overflow | PASS shell |
| `/escanear/etiqueta` | Scan one or several bottles | 27/27 fixture UI; real multi-label precision `0.5714` | FAIL P0 |
| `/escanear/carta-vinos` | Scan printed list/board/PDF | Dual layout fixture UI; real printed-list recall `0.7083` | FAIL P0 |
| `/escanear/menu-comida` | Turn dishes into wine choices | Shell passes; real menu covers 13/54 dishes and merges six desserts | FAIL P0 |
| `/escanear/plato` | Recommend from a photographed dish | Shell passes; independent real-image benchmark incomplete | PARTIAL |
| `/escanear/encontrar-vino` | Search by budget/occasion/store | Shell passes; factual price/availability and recurrence pending | PARTIAL |
| `/inteligencia-liquida` | Ask aiRIM or use guided decisions | Anonymous real responses 3/3 grounded; authenticated memory and longitudinal consistency pending | PARTIAL |
| `/wine-styles` | Discover styles | Anonymous render passes | PARTIAL product comprehension |
| `/wine-styles/:slug` | Understand one style | Valid-style render passes | PARTIAL product comprehension |
| `/wines/:id/:slug?` | Inspect a canonical wine | Invalid UUID now handled locally with no backend 400; valid real record pending | PARTIAL |
| `/my-wines` | Manage personal cellar | Anonymous guard redirects to Auth | PARTIAL, authenticated E2E blocked |
| `/my-wines/collection` | Inventory and quantity | Anonymous guard only | PARTIAL |
| `/my-wines/wishlist` | Save candidates | Anonymous guard only; duplicate persistence risk open | PARTIAL P1 |
| `/my-wines/tasted` | Rate and train profile | Anonymous guard only; local model invariant proves ratings are required | PARTIAL |
| `/my-wines/favorites` | Revisit favorites | Anonymous guard only | PARTIAL |
| `/my-wines/rejected` | Revisit negative feedback | Anonymous guard only | PARTIAL |
| `/my-wines/add` | Add manually | Anonymous guard only | PARTIAL |
| `/profile` | Understand profile and learning | Anonymous guard only; confidence calibration issue open | PARTIAL P1 |
| `/privacy` | Understand image/data treatment | Mobile render captured; consent and retention backend audit pending | PARTIAL |
| `/terms` | Read terms | Mobile render passes | PASS render |
| `/account/delete` | Request deletion | Guest state passes; branding fixed locally; authenticated request/completion pending | PARTIAL |
| `/admin` | Administration | Anonymous/non-admin redirects Home | EXCLUDED/pass guard |
| `/import-csv` | Admin import | Anonymous/non-admin redirects Home | EXCLUDED/pass guard |
| `/data-viewer` | Admin data viewer | Anonymous/non-admin redirects Home | EXCLUDED/pass guard |
| `/wine-search` | Admin search | Anonymous/non-admin redirects Home | EXCLUDED/pass guard |
| `/wine-import` | Admin import | Anonymous/non-admin redirects Home | EXCLUDED/pass guard |
| `*` | Recover from unknown URL | Spanish 404, no console error, Home recovery | PASS local |

Automated result: 34/34 routes rendered, 0 horizontal overflow, 0 page errors and 0 console errors after local fixes. Bodega/Profile routes only certify the anonymous guard.

## Findings

### F-01 — P0: real recognition is not release-ready

- Persona/build: casual buyer and sommelier, build 64 backend runtime.
- Steps: run independent single-label, multi-label, printed-list, board and food-menu scenes.
- Expected: precision and recall at least `0.90` in every supported category; no merged menu rows.
- Observed: single-label precision `0.7692`; multi-label precision `0.5714`; printed-list recall `0.7083`; food-menu recall `0.2407` with six desserts merged.
- Evidence: `docs/MATCHRIM_RECOGNITION_MATRIX_2026-09-28.md`.
- Likely cause/fix: deployed detection, segmentation and OCR contract; correct and deploy only in staging, then rerun independent images.
- Retest: blocked by Supabase management 403; UI fixtures do not close this finding.

### F-02 — P1: change-of-opinion confidence is misleading

- Persona/build: `cambio-de-opinion`, local model based on build-64 learner.
- Steps: replace current evidence with 15 Rioja rejections plus five Atlantic-white likes.
- Expected: new target should lead or uncertainty should drop.
- Observed: tinto frutal leads while confidence remains 100%; a stronger 15-like/5-reject reversal converges.
- Evidence: `persona-longitudinal.json`.
- Likely cause/fix: confidence uses sample count only and the signed average has no recency, contradiction or target-coherence calibration. Add evidence diversity/recency and expose conflicting preference state.
- Retest: deterministic harness ready.

### F-03 — P1: duplicate wine rows remain possible in Bodega

- Persona/build: returning authenticated user, build 64 and local.
- Steps: save the same Winerim/scan reference again after restart or from another surface.
- Expected: canonical reference updates or prompts for quantity/status.
- Observed: direct inserts and no canonical uniqueness constraint permit duplicate rows; in-session Winerim guard only remembers IDs in memory.
- Evidence: `src/pages/UseMatchrim.tsx`, `src/pages/Scan.tsx`, migrations.
- Likely cause/fix: add a canonical identity column/index or transactional upsert in staging, preserving separate vintages. Local recommendation display deduplication is fixed but does not repair storage.
- Retest: requires isolated authenticated tenant.

### F-04 — P1: budget and occasion are not learned preferences

- Persona/build: `presupuesto-estricto` and `maridaje-marisco`, local model.
- Steps: save 1/5/20 unscored decisions described only by budget or occasion.
- Expected: no false claim that permanent taste learned; constraints still influence the current decision.
- Observed: profile correctly stays unchanged, but the learner has no persistent budget/occasion dimension.
- Evidence: longitudinal JSON and five-axis model source.
- Fix: keep these as explicit situational constraints and explain that they do not alter taste until rated sensory evidence exists.

### F-05 — P2: invalid detail/404/deletion trust defects

- Persona/build: anonymous mobile-web probe, local pre-fix.
- Steps: open invalid wine ID, unknown route and deletion page.
- Observed: Supabase 400 plus admin back-link; English 404 logged as error; Winerim account branding inside Matchrim.
- Fix/retest: UUID guard, consumer back-link, Spanish 404 and Matchrim wording implemented; 34-route rerun is clean.

### F-06 — external gate: authenticated and physical E2E unavailable

- Supabase CLI `2.105.0` still returns 403 for function management. No isolated tenant or authorized synthetic mailbox path is available, so no QA accounts were created.
- Build 64 was installed/launched previously, but this lot did not certify physical camera/gallery, VoiceOver or account switching.
- App Store Connect processing remains unverified because readback returned `authResult=FAILED`.

## Virtual cohort and load plan

The local 1,000-user cohort measures only in-process learning plus ranking of eight candidates: p50 `0.0060 ms`, p95 `0.0127 ms`, p99 `0.0285 ms`, 0 errors and 1,000 isolated serialized states. It is neither staging load nor 1,000 humans.

Authorized staging execution must ramp 10→50→200→1,000 virtual sessions, hold each stage five minutes, use synthetic addresses owned by the project, and stop on any account leak, write outside the QA tenant, error rate above 1%, p95 doubling for two stages, provider rate-limit response above 2% or forecast cost above the approved cap. Measure Auth, CRUD, recommendations, aiRIM and scan separately; do not send 1,000 concurrent vision/LLM requests as one burst.

## Prioritized backlog

| Priority | Work | Acceptance |
| --- | --- | --- |
| P0 | Recognition segmentation/OCR/matching in staging | Precision and recall `>=0.90` per category; food coverage `>=0.90`; zero merged rows |
| P0 | Physical iPhone camera/gallery and accessibility journey | Real evidence for one/multi-label, carta, board and menu; no overlap; basic VoiceOver/Dynamic Type pass |
| P1 | Isolated authenticated persona tenant | Ten personas complete auth, quiz, Bodega CRUD, restart and account switching with zero leakage |
| P1 | Canonical Bodega upsert | Same identity cannot duplicate; different vintage remains independent; quantity/status correction works |
| P1 | Confidence and preference reversal | Confidence reflects diversity/conflict; changed preference reaches top three after five consistent new ratings |
| P1 | Staging 1,000-user harness | p50/p95/p99, error/rate/cost and isolation report under approved limits |
| P2 | Mobile-web navigation/design consistency | Remove duplicate guest chrome without changing the preserved public desktop web; align Auth/legal visual language |
| P2 | Bundle performance | Lazy-load map/PDF/admin chunks and define mobile startup budget |

## Exit gate

No new TestFlight until: all P0 findings are closed; every consumer route has success/empty/error/offline/cancel coverage where applicable; ten authenticated personas pass baseline, 1/5/20, reversal, duplicate, vintage, correction, restart and account switch with zero leakage; recognition meets `0.90` precision/recall; staging load has `<1%` errors with approved cost and no duplicates; mobile has no critical accessibility or overlap defect; and build parity identifies one immutable commit with complete evidence.

## Evidence

- `docs/qa-evidence/matchrim-integral-qa-2026-09-29/build64-parity.json`
- `docs/qa-evidence/matchrim-integral-qa-2026-09-29/persona-longitudinal.json`
- `docs/qa-evidence/matchrim-integral-qa-2026-09-29/routes/route-inventory.json`
- Representative route screenshots in `docs/qa-evidence/matchrim-integral-qa-2026-09-29/routes/`
- `docs/MATCHRIM_RECOGNITION_MATRIX_2026-09-28.md`
