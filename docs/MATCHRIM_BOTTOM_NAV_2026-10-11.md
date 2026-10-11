# Bottom navigation: labels, order and content reserve

Assignment MATCHRIM-5H-20261011-06. Baseline97b13a1. Local source and intercepted Chromium QA only. Five destinations, scanner central, icons, labels, auth return targets and active-route semantics preserved. No backend, native build, Apple or distribution action.

## Before / After / Why

| Before | After | Why |
| --- | --- | --- |
| Native fixed4.5rem scanner column compressed adjacent truncated labels at320px/135% | Proportional columns, scanner1.2 shares, full wrapping labels without reducing font | All five labels fit on one line in the reported320px/135% case; larger text can wrap |
| Native DOM order put scanner last although it appeared third | Shared five-link definition rendered in visual order | Tab order is Inicio, aiRIM, Escanear, Bodega, Perfil |
| Fixed bar/landscape grid heights and estimated content padding | Minimum grid heights; ResizeObserver reserves measured border-box height; cleanup removes reservation | Text and safe-area changes cannot silently leave stale bottom padding |
| Native horizontal padding reused left inset on both sides | Separate left/right insets | Asymmetric landscape safe areas remain respected |
| Web Bodega bottom navigation was nested in a backdrop-filter header | Bottom navigation is a sibling, matching the existing Header pattern | Fixed position remains anchored to the viewport while scrolling, not the header's containing block |

Accessible names already existed before this work. This is not a missing-name fix or proof of a real VoiceOver defect. No new animation, branding, destination, auth policy or dependency introduced. Web10px label font remains unchanged; CSS root scaling does not enlarge that fixed-pixel font.

## Evidence and matrix

Baseline targeted run:1/6 passed. Native320/135 reproduced ellipsis/clipped letters, Bodega text outside its target and native DOM/visual order mismatch. Native320/200 and rotated asymmetric-safe-area cases also failed. Web320/135 exposed the misplaced bar at document end; anonymous web scan passed. An early intermediate layout wrapped Escanear unnecessarily; the final proportional scanner column preserves its single line at320/135.

Final unfiltered run: **17/19 variants pass; two200% narrow-page stress cases remain failed**. The harness deliberately exits1 for the full run. Do not call this global accessibility approval.

| Cases | Result |
| --- | --- |
| Native320x852,393x852,852x393 at100% and135% CSS text |6/6 PASS |
| Web same dimensions/scales, including hidden bottom bar and zero reserve at852px desktop breakpoint |6/6 PASS |
| Native393/135 with34px bottom inset | PASS |
| Native852x393/135 with left44/right16/bottom21; rotate to393x852 | PASS |
| Native852x393/200, same asymmetric safe areas | PASS |
| Anonymous native and web320/135; no real login |2/2 PASS |
| Native320x852/200 Bodega | FAIL: layout viewport459px, bar follows expanded viewport |
| Native320x852/200 anonymous scan | FAIL: layout viewport437px, bar follows expanded viewport |

In the17 passing variants:75 initial link rectangles, plus5 after rotation, checked for complete text Range bounds, clipping, intersections, three hit-test points and44px minimum targets. DOM order and keyboard traversal match the visual sequence.26 destination/active-route checks:20 Enter activations across authenticated/anonymous native/web fixtures, plus6 nested-route checks. Protected links retain `/auth?redirect=%2Fmy-wines` and `/auth?redirect=%2Fprofile`; auth removes the bar, body class and measured CSS variable. No login submitted.

All passing visible variants compare actual height with content reserve within1px. At native320/135, nav105.375px, reserve105.375px; ordinary columns55.31px, scanner66.39px, every label one text line. Native safe landscape bar113.234px; landscape200 bar157.188px. The last Bodega `No va` control remains above navigation at maximum scroll and passes a center hit-test. Portrait/landscape screenshots are actual viewport captures, not full-page composites.

All remote requests are intercepted with local synthetic data. No `user_wines` write or Edge request is initiated by these workflows. Zero uncaught page exceptions. These are viewport/account-state variants, not people, real production sessions, live identity accuracy or real preference outcomes. Native platform and safe areas are browser emulations; CSS enlargement is not physical Dynamic Type or spoken VoiceOver.

Pixels inspected: final narrow native labels; web Bodega document end; native safe landscape; native200 landscape document end. Narrow200 failures are retained rather than hidden. Their page-wide overflow needs a separate scoped investigation; this checkpoint does not fix every page at arbitrary enlargement.

## Verification

- Typecheck PASS.
- Lint PASS,0 errors/106 inherited warnings.
-14/14 navigation redirect contracts PASS.
- Web build PASS,7.17seconds; inherited chunk-size/Browserslist warnings remain.
- Prior mutation, recognition and learning suites not rerun: no changes to those contracts. No physical QA, native compilation or TestFlight upload in this scope.

Harness: `scripts/qa-matchrim-bottom-nav.py --url http://127.0.0.1:4441 --output <directory>`, through the existing webapp-testing `with_server.py`, using `VITE_APP_ANALYTICS_ENABLED=false npm run dev -- --host 127.0.0.1 --port 4441`. Optional `--cases` selects variants; default includes both known stress failures.

Raw results: `/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim-bottom-nav-20261011/`. Final directory `verified`; baseline `before`; intermediate runs retained separately. Portable results/screens/logs and hashes: `docs/qa-evidence/matchrim-bottom-nav-2026-10-11/`.

## Residual and gate

The reported320px/135% bottom-navigation defect is closed locally.320px/200% whole-page viewport expansion remains unapproved. Catalog placeholder/backend, live recognition/canonical data, hosted persistence/RLS and physical accessibility remain separate existing gates.

No native number or candidate rebuilt. Previous unsigned80 does not contain source-only assignments03 through06. No push, deploy, production request, vision call, secrets, Apple session or invitation. Remaining28 vision calls and all prior corpora/holdouts/ledgers preserved. The requested TestFlight invitation remains unsent pending its separate Apple/distribution gate. Stop this bounded checkpoint without manufacturing additional work.
