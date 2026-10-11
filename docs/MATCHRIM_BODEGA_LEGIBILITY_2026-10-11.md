# Bodega control legibility

Assignment MATCHRIM-5H-20261011-05. Baseline6476b5a. Local CSS/layout and decorative pointer-event changes only. Existing owner/lifetime/pending/confirmation guards and all rating, quantity, training and route semantics are untouched.

## Before / After / Why

| Before | After | Why |
| --- | --- | --- |
| Four fixed desktop-breakpoint columns compressed label/menu/manual/catalog actions | Auto-fit columns with a14rem useful minimum capped by available width; complete wrapping labels/descriptions and nonshrinking icons | Users can distinguish and choose each action without eliding or shrinking its label |
| Four narrow learning cells let the CTA spill beyond its own panel | Learning cells use the same useful-width grid; CTA wraps within its panel and has a44px minimum height | The existing wishlist action remains readable and reachable |
| Two aiRIM columns inside an already narrow wine card made text overlap | Content-width-based columns, wrapping labels and44px minimum height | Fit and similar remain separate, ordered, accessible actions |
| Catalog magnifier could intercept touches inside the input | Decorative magnifier/loading icons do not capture pointer events | Tapping the icon area reaches the input rather than a noninteractive sibling |

Only17 class-line replacements in `src/pages/MyWines.tsx` and2 decorative icon class replacements in `src/components/wine-import/WineSearchBar.tsx`. No animation added, route/label changed, helper modified, sensory value invented or dependency updated.

## Baseline evidence

Initial matrix:1/6 variants passed all assertions,5/6 did not. Portrait135 already worked and is preserved. At100% text, learning/aiRIM targets were36px high. Landscape100 clipped the manual-action text. Landscape135 top-action text exceeded button bounds and aiRIM text exceeded its own controls. The learning CTA visibly extended outside its yellow panel; this fixture showed panel overflow rather than clipped CTA letters. A320px/135% catalog click also timed out in the baseline. Do not interpret these controlled browser results as a physical-device or production incident.

After the first layout patch,5/6 variants passed; the remaining narrow-case hit-test landed on the catalog magnifier instead of the input. The final icon pointer-event fix closes that specific control obstruction.

Measured landscape852x393 at135% CSS text:
- Top label action:167.97px wide before,352.13px after; its full title/description now fit inside.
- aiRIM fit action:149.91px wide before,310.63px after. Final fit/similar each59.39px high and stack when needed.
- Learning CTA:235.08px wide inside a362.92px panel after;59.39px high. No label reduction or ellipsis.

## QA matrix

Seven control workflows: label destination, wine-menu destination, manual-add destination, catalog focus, wishlist CTA, aiRIM fit and aiRIM similar. Repeated viewport/content variants are not additional users or independent product scenarios.

| Variant | Fixture | Before | Final |
| --- | --- | --- | --- |
|393x852,100% CSS text | Long name and two wines, one without sensory attributes | Undersized learning/aiRIM targets | PASS |
|393x852,135% CSS text | Same | PASS | PASS |
|852x393,100% CSS text | Same | Manual label overflow; undersized targets | PASS |
|852x393,135% CSS text | Same | Top/aiRIM text overflow; catalog icon hit; CTA panel spill visible | PASS |
|320x852,135% CSS text | Same | Catalog click timeout; page/control width issue | PASS |
|852x393,135% CSS text | Empty Bodega | Top-action overflow/catalog hit | PASS |

Final primary run:6/6 variants,46 measured targets (including6 catalog headings),34 real route activations. Additional2 affected variants verify keyboard Enter on the wishlist CTA and both aiRIM destinations on the no-sensory wine,12 more route activations including repeated controls. These2 are supplemental variants, not2 more users. All results have zero uncaught page exceptions.

Assertions use text-node Range rectangles, own-control bounds, containing-panel bounds, clipping ancestors, actual viewport width, pairwise aiRIM control intersections, three hit-test points per target, safe-top/bottom-navigation bounds,44px interactive targets, focus order and unchanged accessible control names. The final tests explicitly verify:
- `/escanear/etiqueta`, `/escanear/carta-vinos`, `/my-wines/add`, `/my-wines/wishlist`.
- `/inteligencia-liquida?function=wine-fit` and `function=similar-wine`, preserving the full wine/producer context despite long names.
- Keyboard Tab order across label/menu/manual/catalog and between aiRIM actions; Enter activates the existing wishlist destination.
- Reduced-motion controls do not move/animate. No new motion introduced.
- No non-local request escapes the interceptor; no `user_wines` mutation or Edge invocation is triggered by destination tests. Catalog is focused, not submitted; photos/prompts/manual content are not submitted.

Screenshots are viewport-only at each target's centered scroll position, not full-page composites. A neighboring control may be partially beneath fixed navigation in another target's screenshot; its own screenshot/bounds/hit-test and actual activation establish reachability. This avoids treating a full-page fixed-nav artifact as proof of obstruction.

Inspected pixels include baseline landscape learning/fit, final landscape top actions/learning/both aiRIM controls, and final narrow manual/catalog panel. Safe-area values are simulated20px. These are CSS browser checks, not physical Dynamic Type, VoiceOver or camera tests.

Typecheck PASS. Lint0 errors/106 inherited warnings. Web build PASS in6.95seconds, inherited large-chunk/Browserslist warnings retained. Prior54 mutation scenarios and23/25 suites were not rerun: no behavioral code changed, and affected routing/focus is covered above.

## Residual and gate

At320px/135%, the global bottom navigation still abbreviates some labels (visible in `final-narrow-135-manual.png`); the catalog's native single-line placeholder is also only partially visible, while the full `Buscar catalogo` heading remains readable and focus works. These are not hidden by this report. Global navigation is unchanged and outside this three-area layout fix. Catalog search results/backend and other page panels are not certified by focus-only QA.

No new native build or number: the previous unsigned80 lacks the recent source-only Bodega deltas. No push, deploy, production, account/permission/SQL/schema/RLS change, vision/payment, Apple action or invitation. Preserve28 remaining vision calls, all previous commits/evidence, corpora, holdouts and ledgers. Live data/recognition, hosted persistence, physical accessibility and distribution remain separate gates.

Raw evidence: `/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim-bodega-legibility-20261011/`.
Portable evidence and SHA256 manifest: `docs/qa-evidence/matchrim-bodega-legibility-2026-10-11/`.
Harness: `scripts/qa-matchrim-bodega-legibility.py --url http://127.0.0.1:4440 --output <directory>` through `with_server.py` and `VITE_APP_ANALYTICS_ENABLED=false npm run dev -- --host 127.0.0.1 --port 4440`. Optional `--cases` selects named variants.
