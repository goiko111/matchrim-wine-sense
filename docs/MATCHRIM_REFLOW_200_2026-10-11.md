# Bodega and scan hub reflow at200%

Assignment MATCHRIM-5H-20261011-07. Baseline0e54f9b. The original06 results17/19, screenshots and16 hashes remain immutable. This is new delta evidence, not a rewritten full-suite PASS.

## Measured causes

Before product edits, the existing harness was instrumented with inner dimensions, visualViewport, document client/scroll dimensions and per-element bounds/computed grid tracks, minimum width, whitespace, overflow and font properties. Both original contexts retained Chromium mobile emulation,320x852,root32px,native platform simulation,bottom34px,identical synthetic session/data and remote interceptor.

| Measurement | Bodega before | Scan hub before | Both after |
| --- | --- | --- | --- |
| innerWidth / innerHeight |459 /1223 |437 /1164 |320 /852 |
| document clientWidth / clientHeight |320 /852 |320 /852 |320 /852 |
| document scrollWidth |459 |437 |320 |
| visualViewport width / height / scale |320 /852 /1 |320 /852 /1 |320 /852 /1 |
| Root font size |32px |32px |32px |
| Navigation width / bottom |459 /1223 |437 /1164 |320 /852 |

The dominant Bodega overflow is the section-summary grid, not just the suspected tabs. Its available width is190px but its implicit track becomes393.922px; the child ends at458.922px, matching the459px document extent. Child minimum widths, side-by-side icon/text and nowrap action labels contribute. Tabs are an additional independent problem: two120px tracks but the Quiero Probar text ends at362.156px. Smaller contained overflows were also measured in titles, catalog input padding, learning text and the wine header/stock row.

The scan hub's implicit primary track becomes405.453px inside256px. Its buttons end at437.453px, matching the437px document extent. Fixed nonshrinking icons/arrows, padding and gaps leave too little useful width for the text's minimum content. Secondary descriptions were explicitly truncated; their visible spans were88px wide while full text required430-603px on one line. The64px Escanear heading needed272px inside256px, an own-box overflow even though it was not the dominant document extent.

These are measured browser layout defects, not a physical-device/backend incident. No viewport, zoom, scale, root font or fixture was changed to make them pass.

## Before / After / Why

| Before | After | Why |
| --- | --- | --- |
| Bodega320/200 expands to459px; implicit tracks and nowrap controls overflow | Local zero-minimum tracks, wrapping actions, useful-width auto-fit tabs, wrapping section/wine headers and stock rows | Keep complete labels and controls inside the narrow page |
| Repeated nested padding consumes most of the catalog/header width | Local small-screen padding adjustments; catalog input reserves enough space for its own icon padding | Preserve usable inner width without changing the global theme or input component |
| Scan hub320/200 expands to437px and secondary descriptions ellipsize | Explicit one-column minimum track; option content reflows by useful width; descriptions and title wrap | Retain all five modalities and explanations without hiding or shrinking text |
| Navigation follows expanded page extent | Correct underlying content constraints; existing measured reserve stays186.188px and bar ends at852px | Bottom controls remain reachable at document end |
| Filtros is36px high at100% | Local44px minimum | Match the target requirement without changing filter behavior |
| At web200%, scanner circle overlaps an aiRIM hit-test point | Circle constrained to its own column with a bounded glyph | Preserve scanner identity and five independent touch targets |

No global overflow-x hiding/clipping, transformed content, font reduction, viewport-meta change, removed action or new animation. No shared ui/tabs changes. Existing text, routes, mode selection, privacy gate, guards, pending actions, rating, quantities and confirmations remain unchanged. Bodega and ScanHub changes are classes only. The additional two-class web navigation fix was driven by a measured hit-test failure on these routes; native navigation logic/reserve is unchanged.

## QA

**14 unique controlled variants approved**, assembled from the latest applicable run for each case, not14 people or14 distinct features. `summary.json` records each source run. Original before run fails2/2. First full content test had harness-only errors: it expected `/rejected` instead of existing `/no-repetir`, and an unanchored Plato selector matched the food-menu description. These were corrected without changing product routes. The next regression run exposed the real36px filter target and web scanner overlap, then affected cases were rerun after those fixes.

| Route/context | Variants approved |
| --- | --- |
| Native authenticated Bodega |320/200 bottom34;393/100;320/135;852x393/100;852x393/135;852x393/135 with left44/right16/bottom21 and rotation |
| Web authenticated Bodega |320/135;320/200 bottom34 |
| Native anonymous scan hub |320/200 bottom34;320/100;393/135;852x393/100;852x393/135 with asymmetric safe areas |
| Web anonymous scan hub |320/200 bottom34 |

-230 content-control measurements and643 visible text-node measurements across repeated viewport variants. Text Range bounds, clipping ancestors, target size and three-point elementFromPoint checks pass. No remaining diagnostic overflow elements in the initial tested page states.
-70 read-only content destinations: five Bodega tabs or five scan options per variant. Existing `/my-wines/no-repetir` preserved. Scan destinations remain etiqueta/carta-vinos/menu-comida/plato/encontrar-vino.
-29 additional navigation destination/active-route checks, including authenticated/anonymous auth return targets. Five navigation names, DOM/keyboard order and central scanner preserved.75 nav link measurements including the rotated case.
-Both original200% cases now have320px scroll/inner width,852px inner height,scale1,complete content text and matching186.188px navigation reservation. Last Bodega No va remains above the bar at maximum document scroll and passes hit testing.
-Scan option keyboard order is checked in the enlarged native case and affected scan regressions. Enter opens the correct route. The privacy title remains present, continuation stays disabled and acknowledgement remains absent. No camera, file selector, PDF, upload, OCR, analysis or save is activated.
-All non-local traffic is intercepted. No user_wines mutation or Edge invocation. Zero uncaught page exceptions. Pairwise content-control overlap checks pass in the final affected reruns, including both original200% cases.
-Viewport pixels inspected: enlarged Bodega section control, tabs and document end; enlarged label/shop options; normal scan hub; corrected web scanner glyph. Captures show the selected target in its viewport, not full-page composites. Adjacent content may scroll beneath navigation normally; target-specific screenshots and hit tests establish reachability.

Typecheck PASS; lint0 errors/106 inherited warnings; final web build PASS in6.65s with inherited bundle/Browserslist warnings. Final affected reruns7/7, then3/3 filter-height regressions and3/3 web glyph checks; these overlap the14-case union and are not added as new variants. Unrelated19/54/23/25 suites were not rerun wholesale.

## Reproduce and evidence

`scripts/qa-matchrim-bottom-nav.py --url http://127.0.0.1:4442 --cases native-320-200,native-scan-200 --layout-diagnostics --reflow-content --output <directory>` using the existing webapp-testing `with_server.py` and `VITE_APP_ANALYTICS_ENABLED=false npm run dev -- --host 127.0.0.1 --port 4442`.

Content checks: `scripts/qa_matchrim_reflow.py`. All fixtures/session/interception remain in the original harness. Additional named variants support the scoped regressions; old evidence is not overwritten.

Raw: `/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim-reflow-200-20261011/`. Portable selected screenshots, raw result summaries, logs and SHA256 hashes: `docs/qa-evidence/matchrim-reflow-200-2026-10-11/`.

## Limits and stop

This closes the two specified initial-route overflow defects and their affected regressions. It does not certify every Bodega data combination, open dialogs/filter menus, scan history, selected scanner/privacy-screen layout, other routes or the whole app at200%. Normal single-line input scrolling/placeholder behavior is unchanged. Web labels retain their existing10px font, which root-font scaling does not enlarge. CSS200% is not physical Dynamic Type or spoken VoiceOver.

No native build/number, push, deploy, TestFlight, Apple session or invitation. Previous unsigned80 lacks source deltas03-07. No SDK/DB/RLS/vision/permission/account changes;28 vision calls and all corpora/holdouts/ledgers preserved. Live intelligence/persistence, physical QA and Apple distribution remain separate gates. Stop at this bounded checkpoint without artificial activity.
