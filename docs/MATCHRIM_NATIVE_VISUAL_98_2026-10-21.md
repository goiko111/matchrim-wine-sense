# Matchrim Native Visual98

Product commit: `ec13656d5d0f3fd0e16feadc4c63b8f09fb9b7c0`. Scope approved: the first native-only visual block, portrait. This is not a new full-product, catalogue, taste-accuracy or TestFlight approval.

## Implemented

| Before | After | Why |
| --- | --- | --- |
| Home mainly presented feature shortcuts and explanations | Bottle-first recommendations, one search, recent activity and a link to tastes | Choose a wine instead of deciphering the app |
| Native recommendation detail omitted the bottle photo and opened an external fiche | Bottle, identity, one affinity answer, optional inline original fiche and explicit save | Keep the decision in one coherent screen |
| Bodega displayed every large management card in the list | Compact photo rows, En bodega / Por probar / Probados, detail on tap | Scan a collection without reading every control |
| Adding from a recommendation required repeating identity text | Owner-bound name, producer and vintage draft reaches the existing confirmation form | Fewer steps without promoting a draft to catalogue evidence |
| Exact original-fiche enrichment dropped its photo | Safe optional detail photo survives the verified contract and fills only a missing saved photo | Reuse Winerim imagery without overwriting an owner's image |

No identity thresholds, sensory scale, zeros/decimals, affinity weights, learning formula or stock/rating semantics were relaxed. A photo cannot grant sensory authority. Missing affinity is neutral, not a green positive recommendation. The five existing bottom navigation destinations remain; broader Escanear/aiRIM simplification is a later block.

Old saved rows can resolve a missing photo through the existing strict name/producer/vintage detail lookup: first four list rows initially, later rows when opened. This bounded UI hydration is not a master-catalogue sync and is not an automatic database migration. Enrichment saves a missing photo only after the existing explicit action/verification and exact mutation readback. Existing owner raster captures remain displayable but never become catalogue evidence.

## Verification

Private evidence root: `/Users/GOIKO/2matchrim76-recognition-20261008/qa-artifacts/native98-20261021/`.

| Check | Result | Evidence / Boundary |
| --- | --- | --- |
| `npm run test:release` | PASS | `release-regression.log`; deterministic existing unit/fixture suites, not live users |
| `npm run test:consumer95` | PASS | `consumer95-r2.log`; initial frozen photo-source oracle failure retained in `consumer95.log` |
| Actual current Home/detail owner/profile binding and complete legacy web render comparisons | 49/49 PASS | `recommendation49.log`; real components, controlled offline dependencies |
| Strict original-detail photo, identity/vintage, sensory and cancellation contracts | 15/15 PASS | `scripts/check-matchrim-wine-image98.ts`; no network |
| Safe draft, owner separation and owned raster boundary | 7/7 PASS | `scripts/check-matchrim-native-draft98.ts` |
| Actual cellar enrichment closure / photo readback | 6/6 PASS | `scripts/check-matchrim-cellar-photo98.ts`; controlled identity/sensory dependencies, no database write |
| Reviewed98-to97 source inverse and negative mutations | 53/53 PASS | `scripts/check-matchrim-native-visual98-scope.mjs`; original frozen hashes retained, no blanket oracle replacement |
| TypeScript / lint | PASS / 0 errors, 129 warnings | `typecheck.log`, `lint.log`; no assertion that all warnings are new or fixed |
| Production frontend build | PASS | Clean `candidate98-r1`; fixtures disabled, no automatic .env loading |
| iOS98 simulator build | PASS | `simulator-r2/BUILD-RESULT.json`; isolated unsigned `wine.matchrim.qa98review`, not distribution bundle approval |
| Current resources in compiled iOS shell | 163 exact resources | `simulator-r2/CURRENT-RESOURCES-r4.json` |
| Portrait browser visual flow | 9 captures PASS | `visual-r5/report.json`: 320/393/440pt, CSS200%, detail, prefilled save form, list/detail/tasted filter; 0 runtime/console errors |
| Actual UIKit anonymous flow | PASS normal and final MAX | `native-audit-r1`, `native-audit-r3-max-corrected`: Home/search/scanner/auth, 44pt controls, automated contrast/description/text/trait audit |
| Clean source binds tested resources | 385 source files / 163 resources identical | `CLEAN-SOURCE-BINDING.json`; clean ec13656 matches reviewed preview-r4 |

The browser uses synthetic users/catalogue responses and four of the supplied real bottle images. Its producers, vintages and sensory vectors are controlled UI fixtures, NOT recognized identities or recommendations for real people. No real account or wine was created, rated or changed in this block.

## Findings Retained And Corrected

The initial browser harness assumed four Home recommendations, a different label case and the wrong tasted semantics. Those failed attempts are retained (`visual-r1` through `r3`); the actual existing three-result limit and the rule that a rated collection wine also appears in Probados were preserved, not changed to satisfy a test.

Actual defects found: uneven image alignment within a row; insufficient name width with CSS200%; misleading positive color for pending affinity; and an iOS MAX brand/search overflow that automated accessibility audits did not detect. Final source aligns tiles at the top, reflows accessible grids, uses neutral pending copy, preserves a compact brand and gives search text an explicit wrapping span. The established native stable-scroll shell is reused. Final MAX adds actual brand-fit/profile-hittability assertions and retains four UIKit screenshots. MAX settings were restored to Large afterwards.

The first copied UIKit runner receipt retained an obsolete hard-coded source-commit label. Do not use that label for provenance. The separately retained current-resource receipt and final corrected MAX runner bind actual resources to preview-r4/ec13656; the old receipt was not rewritten. Both old automated PASS and its adverse visual finding remain visible.

## Distribution And Remaining Gates

No web Publish, production deployment, Lovable turn, model request, image upload, physical-phone operation, Apple upload or tester invitation occurred. `src/index.css` and protected `supabase/functions/search-wines/index.ts` remain byte-identical to `db6a181`. Changes are on the existing feature branch, not production main.

The two supplied archives and 200 image/hash inventory remain preserved under `/Users/GOIKO/Documents/Playground/Matchrim-inputs/2026-10-21/`. The supplied source export was not executed or overlaid on this branch. The prior single exact Flor de Muga Blanco2022 Library control proves that specific API fiche has sensory data/photo, not full-master coverage. See its private `LIBRARY-CHECK.json`.

98 is a reproducible clean local frontend plus an unsigned simulator build, NOT an archived/signed/uploaded TestFlight build. Published TestFlight95 does not contain this design. Remaining: native authenticated persistence and photo hydration against real current fiches, camera/gallery and VoiceOver speech, full catalogue search/detail access and unresolved real recognition/sensory coverage. Portrait only; no new horizontal testing was performed.

The 200-label paid expansion is still unapproved. The earlier 20-label / 50-paid-start / 15EUR ceiling was not expanded or reset. Existing offline OCR, this UI fixture exercise and a real200-label recognition benchmark are different evidence. Do not upload a mock-dependent build or call this a50-user taste study.

Reproduction: run the three new TypeScript checks with `node --import tsx scripts/<name>.ts`, the source-inverse check with Node, the existing release/consumer commands above, then `npm run typecheck` and `npm run lint`. The private `prepare98.mjs` produces isolated native resources; build with Xcode26.0.1 and explicit `CURRENT_PROJECT_VERSION=98`, without `cap copy` into the shared checkout. The candidate receipt records source/resource hashes and public configuration, not private credentials.
