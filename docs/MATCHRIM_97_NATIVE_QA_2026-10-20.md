# Matchrim 97: Native UX, Catalogue Admission and Physical QA

Internal candidate, 2026-10-20. Baseline `8327ee7e31fe73ab8edd90303de514147d13978d`; product commit `df601238a8e73ec126a9240341544c944bc7e89d`. A signed development build was installed by cable and a separate signed Release archive was generated. Neither was exported for App Store distribution or uploaded to TestFlight. No production web Publish, backend deployment or new Lovable turn was performed. Existing 95/96 reports remain the historical baseline.

## Product Changes

- Native label detail puts the actual wine and vintage first, then verified affinity or one reason it is unavailable. Photo, identification review and diagnostics are progressively disclosed. Existing identity and affinity authority are unchanged; no synthetic score replaces missing sensory data.
- Native label navigation resets its reading position. The header is bounded and scrollable for long names. Reanalysis requires explicit confirmation; declining dispatches no request.
- Automatic native catalogue lookup accepts literal, distinctive wine/producer evidence with finite confidence at least 0.72 and two distinct fragments. Glare or missing grape/alcohol information no longer prevents an otherwise eligible strict lookup. Lookup does not promote identity confidence, change the vintage or invent a sensory profile. Read-only catalogue lookup no longer spends a vision-request slot.
- Native Bodega uses a compact toolbar, five counted sections, an add menu and optional inline catalogue search. The wine list precedes the optional profile explanation. Existing wine mutations, rating storage and affinity formulas remain owned by existing code.
- Native search is catalogue-only, debounced, cancellable and protected against stale results or account changes. Manual-name validation is also catalogue-only on native; it previously could use the general search path per keystroke.
- Native photo consent now names Supabase and OpenAI and uses a new acknowledgement key. Old consent cannot silently accept the new notice. Web consent and legacy web presentation/request bodies are preserved by inverse-byte guards.

`supabase/functions/search-wines/index.ts`, quiz scoring, quiz images, backend sources and the web publishing channel were not changed.

## Expected / Actual

| Gate | Actual | Limit |
|---|---|---|
| Six focused 97 suites | 106 control groups PASS on final source | Offline component/contract evidence, not vision accuracy |
| Final ten-gate regression matrix | Typecheck, lint and eight npm suites PASS | Nine gates passed initially; Restaurant91 passed on a separate rerun of the same commit after restoring the existing offline dependency-prefix setting. Initial failure retained |
| Food profile / Moments intelligence | 103 groups across50 synthetic profiles plus46 handler controls and7 client/server groups PASS | Stubbed providers, zero live model calls; not50 humans or taste-validity evidence |
| Typecheck | PASS | Client only |
| ESLint | 0 errors, 129 warnings | Warnings remain; not a clean-warning claim |
| Native Bodega visual replay | 5 views, 121 checks PASS; 0 console/page errors | Actual candidate97-r3 web assets, synthetic local data and blocked external traffic |
| Landscape first wine | Title bottom318 before navigation limit322 | Earlier candidate clipped by4px; failure retained and toolbar spacing corrected |
| Font stress | CSS200 portrait/landscape PASS | Not UIKit Dynamic Type maximum or VoiceOver validation |
| Actual97 search browser interaction | 19 checks PASS; no JavaScript exceptions | Synthetic catalogue replies, stale/slow requests, debounce, explicit retry, route unmount and CSS200. One deliberately induced503 browser resource error retained |
| Private production client build | PASS, 157 resources | Real project configuration, fixture flag false; no published web changes |
| iOS development build/signature | 1.0(97), codesign verification PASS | Installed package |
| iOS Release archive/signature | 1.0(97), archive and codesign verification PASS |157 frontend resources byte-identical to the installed package. No App Store export, IPA upload or distribution approval |
| Physical installation/launch | PASS, production bundle `wine.matchrim.app` | Installed without uninstalling or clearing data |
| New97 physical screen walkthrough | BLOCKED on two bounded attempts | XCTest timed out enabling automation mode while iOS reported unlocked; no current screen was accepted as97 evidence |
| Existing real QA quiz | 20 UI answers, one saved result, five axes read back5/5 | Performed on installed95 before the97 update, not50 real users or a taste-validity study |
| QA account evolution | Not completed | No wines or ratings saved to this QA account in the verified block |
| Real image pilot | Five images, ten actual IA starts, ten HTTP200 responses | Not200 labels tested, not5/5 canonical identity approval |

The real quiz persona returned Riesling Jardin. Server values were body1, acidity4, sweetness2, tannin1 and fruit3, matching the20 observed answers. Result creation time was2026-10-20T14:09:27.545915Z. This verifies persistence and quiz mapping, not the user's genuine preferences or longitudinal recommendation quality. Personal-user ratings were not modified.

## Recognition and Catalogue Blocker

The Library actually queried contains1711 references, not the full Winerim universe. Bounded read-only checks found no Vidure/Pago de Cirsus record. Chivite La Zorrera was available only as2019, while the supplied bottle is2015; the available2019 record also had no sensory attributes. Borrowing those fields or silently changing the vintage is not an acceptable fix.

The remaining integration needs an authoritative global search/detail contract, including canonical namespace/ID, vintage, original-sheet URL mapping and documented sensory scale/provenance. Available recommendation lists are not an exhaustive catalogue. Global IDs/slugs must not be routed to incompatible Library detail endpoints. This is not an API-key or quota blocker, and new model calls alone cannot repair it.

First-five pilot coverage: producer populated2/5, vintage populated0/5, literal evidence13/15 spans (two punctuation variants). There is no complete independent ground truth for canonical precision/recall or affinity correctness, so those metrics remain N/A. The existing200-image dataset was not regenerated.

## Spend and Privacy

The authorized pilot remains capped at20 labels,50 paid starts and15EUR. Ten paid starts are reconciled;24 SDK slots remain reserved but unclosed. Estimated reserved amounts are not invoiced spend. No new vision call was made during the recovery/install window. No further paid dispatch is permitted until the outstanding reservation and relocated manifest bindings are reconciled. The remaining180 images and larger120EUR/500-call proposal are not authorized.

QA login is `info@winerim.com`. Its independently generated password remains only in the local mode0600 private access file, never in this repository or report. Authentication tokens and private XCTest authentication logs must not be published. Historical20-answer evidence is local; the current authenticated quiz schema does not persist the raw answers themselves.

## Evidence

Current root: `/Users/GOIKO/2matchrim76-recognition-20261008/qa-artifacts/recovery97-20261020`.

- `PHONE97-WINDOW.json`, `INSTALL97-RESULT.json`, `installed97-app.json`: actual installation and two physical-controller failures.
- `candidate97-r3/preparation.json`: explicit production configuration, source fingerprints,157 output hashes and isolated build recipe. `candidate97-r3/derived/Build/Products/Debug-iphoneos/App.app` is the installed97 package.
- `candidate97-r3/COMMIT-BINDING.json`:378 source files checked against product commit `df60123`, with157 installed frontend resource hashes and original dirty preparation receipt retained.
- `candidate97-r3/ARCHIVE97-RELEASE-RESULT.json` and `Matchrim97-release.xcarchive`: successful bounded Release archive, signature and frontend-resource verification. No App Store export or upload.
- `ui-regression/cellar97-actual-ui-r4/report.json`: five-view visual matrix. The preceding r3 visual failure and earlier candidate attempts are retained separately.
- `ui-regression/search97-actual-ui/report.json`:19 current browser controls; screenshots/ARIA and all intercepted catalogue request bodies. Browser/context closed, no external forwarding. Python Playwright was unavailable, so the existing JavaScript runtime was used without installing dependencies.
- `unit-source-freeze/report.json`, `source-freeze-matrix/report.json`, `restaurant91-source-freeze-r2/report.json`: final committed-source evidence, preserved initial dependency-prefix failure and corrected rerun. Final lint has0 errors/129 warnings across590 files.
- `qa-profile-readback/RESULT.json`: actual read-only server verification of the UI-created profile. The adjacent private session file is not shareable evidence.
- `settings-control-r2/private-control/`: real physical Vivino/Matchrim95 screenshots, observed quiz interactions and stopped97 initialization attempts. Stale95 pointers were not used as new97 screen evidence; a host timestamp guard now rejects them.

Earlier complete pilot/catalogue artifacts are resident under `/Users/GOIKO/Library/Mobile Documents/com~apple~CloudDocs/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim97-physical-20261020`, including `catalog-E/GLOBAL-CONTRACT-HANDOFF-r2.md` and `dataset-A/pilot20`. Original manifests remain immutable; their old Documents paths require explicit relocation bindings before another paid run.

The earlier native-label gallery replay in that root, `ux-C/gallery2400-ui-r1/report.json`, passed11 cases/381 controls using the complete frontend, actual gallery preparation/cropping and a1800x2400 request JPEG. Identities/profiles were synthetic and public detail responses recorded: it is not a recognition claim about that transport image. Its presentation matches the reviewed label-view component, but the replay predates the latest catalogue-admission wiring and must not be relabelled as its new live runtime validation. Earlier failures and source bindings remain intact.

## Residual Gate

Do not label97 fully validated or upload it on the strength of compilation or stale screenshots. Still required: working physical automation and a real97 navigation/keyboard/consent pass, authoritative global Winerim matching/sensory coverage, reconciled paid instrumentation, real wine additions and rating evolution, and the remaining image/profile scenarios. Actual VoiceOver use and native maximum text remain unverified for97. Profile icon semantics, sign-out onboarding friction and stale authentication document title remain residual findings.

Auto-Lock was previously observed first at30seconds and later atNever; automation did not claim to have changed it. Its current value could not be checked after the97 automation-mode failures, so restoration is not claimed. Both97 runners terminated; Matchrim97 was left launched and the iPhone lease was released early to its owner.
