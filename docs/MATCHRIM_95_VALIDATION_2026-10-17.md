# Matchrim 95: Integrated Validation

Status after final R12 focused-nine execution: **HOLD. Candidate built, not signed or uploaded.** This checkpoint supersedes earlier95 working checkpoints only where stated. Original failures and audit baselines remain preserved.

## Source And Scope

- Answer-first native product fixes: `86df5feac04a6d33026c1ebc20cebab34ae4f3a4`; backend corrections: `7c35f18d3084a89b533bf7ec61aeff6a27f19ecb` and `31e060828d1b370b275cdcf6691052368916f39f`.
- Integrated menu/layout fixes: `ddba35c1836a76e676c51455096a16cd4e9f3f95`.
- Reviewed QA/build configuration: `2c2b90b4d06d1cb7f300c49375ea2f011b923556`.
- Clean candidate: `/private/tmp/Matchrim95-consumer-r12`, version1.0/build95,156 web resources.
- Published web unchanged. Mobile differences are native-gated; no web Publish, direct database/account mutations or physical-phone actions by the agent. Ordinary service-side effects are separate: `ai-wine-chat` can log authenticated queries in `liquid_intelligence_queries`. Persistence of the real chat canary was not independently read back; do not claim zero server writes globally. No query/history cleanup or account modification was performed.
- Two specifically authorized backend functions were deployed through Lovable, costing1.6 credits. Generated frontend drift was restored to the exact prior remote baseline without publishing the web. The additional Foodv10 correction is local only and requires a separate minimal deployment approval.
- The requested09:23:55-17:23:55UTC eight-hour window is complete. The existing continuation heartbeat is paused; the subsequent work closes already-active integration/build/QA rather than representing another authorized eight-hour window.

## Reproduction

Use a separate clean checkout of2c2b90b, the repository lockfile, existing public production client configuration and the installed Xcode26.0.1. Restaurant document controls additionally require the exact isolated test-only dependencies below; these are not bundled into the app. Choose new output directories: the runners reject existing evidence/candidate paths.

```bash
npm ci
npm install --prefix /tmp/matchrim-restaurant91-offline-deps --no-save parse5@7.3.0 ipaddr.js@2.2.0 http-parser-js@0.5.10
MATCHRIM_RESTAURANT91_TEST_DEPS=/tmp/matchrim-restaurant91-offline-deps node scripts/run-matchrim-consumer95-gates.mjs /private/tmp/matchrim95-gates-reproduction
node scripts/prepare-matchrim-release93.mjs /private/tmp/Matchrim95-reproduction --build=95 --ui-tests=consumer95
```

The two unsigned iOS builds use the prepared `production`/`live` workspaces, scheme `App`, `CODE_SIGNING_ALLOWED=NO`, separate DerivedData and the exact generic-iOS/owned-simulator destinations recorded in their xcresults. Signing/upload are deliberately separate, gated operations; do not use the synthetic QA wrapper as a distribution artifact.

## Corrections Implemented

1. Consumer-first wine decisions: one approximate affinity score when supported, useful reasons and a caution first. Detector/identity diagnostics and sensory arithmetic are secondary. Missing verified sensory evidence does not produce a fabricated score.
2. Explicit Winerim catalogue selection, original sensory zeroes/decimals and unknown vintages remain traceable. Manual identity edits clear obsolete affinity; selecting a fiche is not misrepresented as verification of the photograph or harvest.
3. Menu regional recovery reuses successful readings, retries failed regions and clears recovery state on cancellation, owner change or new image. Generic styles remain readable but cannot become canonical bottles by inference.
4. The captured mixed-format menu had13 serving observations; the old aggregation retained9 and lost four250ml options. Native aggregation now keeps literal row-bound volumes and complementary full/regional evidence. Equal rational ml/cl/L formats deduplicate, distinct formats do not. Unequal prices for the same format remain unconfirmed, including through repeated conflicting observations. These are client fixes on captured/synthetic observations, not a new provider-recognition claim.
5. Native Home landscape grid no longer forces a968px layout into an852px viewport at large text. PDF preview reserves a44px Close control. Finding Wine forms/results retain readable text and emergency wrapping of untrusted long tokens. Normal web JSX, request ownership/cancellation and form behavior are preserved.
6. Native quiz, authentication, passport, notices, Bodega keyboard layouts, current-profile recommendations and explicit learning opt-out received scoped fixes and regressions. No global learner formula was silently changed.
7. The build preparer projects exactly two public Supabase configuration fields, rejects invalid/null claims with a generic error, and keeps fixtures/analytics disabled. This is public configuration validation, not JWT signature verification.

## Actual QA Matrix

| Gate | Result | Evidence and limits |
| --- | --- | --- |
| Full final local regressions | **13/13 PASS** | `local-gates95-r9-reviewed/report.json`; clean2c2b90b,798 unchanged inputs,156 resources; consumer/backend/identity/release/cloud/scene/restaurant/provider/type/lint/build |
| Lint | **0 errors,105 warnings** | Exact final R9 log; warnings remain, not a zero-warning claim |
| Native serving units | **29/29 PASS** |888 observation orders /5148 batch evaluations; synthetic helper tests, no provider calls |
| Scoped web/native source protection | **14/14 PASS** | Exact five-source pairs, full web JSX/lifetime parity and negative controls; old119 menu integration controls retained,122 total |
| Build configuration controls | **16/16 PASS** | Synthetic configuration only; original prefix-filter failure retained; no real credential inspection |
| iOS Release arm64 | **BUILD SUCCEEDED** | `native95-r12-device.xcresult`; unsigned production bundle, not a signed archive or distribution approval |
| iOS simulator build | **BUILD SUCCEEDED** | `native95-r12-live-build.xcresult`; isolated `wine.matchrim.qa91live`, production-connected resources |
| Public bundle/resource policy | **6/6 copies PASS** |156/156 hashes equal R9 in prepared web/production/live, actual R9 output and both built apps;138 policy checks per copy; no fixtures, staging or private credentials detected |
| Final R12 native focused9 | **9/9 PASS** | Actual XCTest263.734s,0 failed/skipped; navigation, real Dynamic Type, orientations, Photos open/cancel, accessibility and keyboard cancellation;30 exported screenshots. Provider methods08/09/11 excluded, no photo selection/analyze/chat-send/Save actions; background hosted reads were not independently intercepted |
| Final R12 Label27 | **27/27 PASS** | Fresh exact-resource controlled Chromium scenarios; synthetic OCR/catalogue/profile,0 external calls; original failures preserved, no new recognition claim |
| Final R12 memory100 | **100/100 PASS** |386.509s Chromium lifecycle run, original budgets; post-warm231 DOM nodes/316 listeners stable, maximum post-GC heap growth646,948 bytes vs8,388,608 budget; browser closed,0 external calls. Not native RSS/GPU, phone endurance or leak-free certification |
| Fifty native synthetic journeys | **50 actual Passed methods on31e only** |50 synthetic accounts,34 distinct quiz vectors,1000 actual quiz answers; no external forwarding. These results do not automatically approve changed R12 resources |

Old R8 remains12/13 FAIL at the obsolete source pin. The R9 PASS is a fresh run after an exact, behavior-checked guard amendment, not an edited historical result. The separately executed legacy web price oracle remains FAIL by design of the unchanged historical web behavior; native conflict handling passes. Neither fact is hidden by the green local regression suite.

Do not package repository `dist`: its older158-file output does not match this candidate. That audit failure is retained. The actual R9 build explicitly targeted its private `web` directory; only the exact R12 prepared/built resources above are the candidate.

Native evidence: `A95/native95-r12-focused9-D-r1/focused9-report.json` and its hash-bound XCTest activities/attachments. Parent independently opened the actual maximum-text Home landscape and manual-entry portrait/landscape captures. Focused9 proves the bottom navigation and focused-field/Close controls remain visible and usable. The original reviewed static-heading hit-region exclusion is unchanged; this is not spoken VoiceOver certification.

**Additional Home follow-up is not green.** Two actual XCTest attempts, each after six controlled scroll gestures, failed on the Botellas AX activation point. Both failures/xcresults and the short interaction video remain intact. One separately observed physical-point touch on the visible Botellas image opened the actual `Etiqueta de vino` destination; it is not an XCTest pass or proof that AX/VoiceOver works. Carta body reachability was not exercised. At maximum accessibility text, landscape initially shows the header rather than the decision, and portrait wraps the Matchrim name into Ma/tch/rim. These are retained accessibility/presentation findings, not erased by9/9. See `A95/native95-r12-focused9-D-r1/home-visual-followup-report.json`; no app code was changed to hide the result.

Final controlled browser evidence: `label95-ui/r12-final-qa-2c2b90b-r1/label27/report.json` and `memory-owned-upload100/report.json`. Parent independently opened new pending-identity, large-text multibottle and landscape-edit captures. These reproduce client states using synthetic recognition/catalogue responses, not the actual Pago photograph or a fresh vision evaluation. The unchanged memory harness uses the reviewed owned/disposed upload handles and original sampling/settling budgets.

## Real Recognition And Recommendation Findings

| Material | Observed result | Acceptance still missing |
| --- | --- | --- |
| Original IMG_7548 |8 returned UI rows,3 hosted requests, clean native Photos/details/compare-five E2E on the earlier R11 payload | Not8 independently validated literal transcriptions, canonical wines or affinities |
| Original IMG_7547 |12 UI readings | Earlier strict expected-reference failure retained |
| Original IMG_7552 |13 mixed-format readings | Serving/price client correction tested separately; no fresh hosted accuracy rerun |
| Original IMG_7553 | Full-image timeout; column crops24/30 strict references and0/38 price cells | R2 crops excluded the price column, so0/38 is missing coverage, not a comparable full-price OCR benchmark. R3 quadrants:10/30 references,10/38 prices; all services remain unverified |
| Original IMG_7605 |6 identity proposals,22 deferred regions | Partial dense-scene coverage, not a confirmed inventory or measured full-scene recall |
| Two ZIP controls |9/9 sealed literal spans,2/2 vintages on fresh hosted runs | Both identities remain proposed/affinity-pending; not an independent200-image benchmark |
| Explicit La Gitana catalogue choice | Original fiche278688 and exact sensory2/4/1/0/1; score59 for synthetic profile3/3/3/3/3 | Catalogue user choice, not photograph/vintage verification |
| Special moments hosted canary | HTTP200,6.365s, conditional general advice without fake personal probability | One hosted control, not broad recommendation accuracy |
| Food hosted v9 canary | **FAIL**: supplied public profile became unavailable;55.594s | Foodv10 local correction passes offline controls but is not deployed or hosted-validated |

The parent's63 hosted Edge POST attempts out of its self-imposed64 ceiling are not evidence of an exhausted provider quota. Public catalogue GETs are separate. The200-image ZIP corpus has historical Edge traces; upstream provider/model linkage was not independently verified. They are not200 fresh independent ground-truth evaluations.

The10,000-person/year run uses artificial parameters and520,000 rating events, not humans. It produced4,516,031 passing assertions and one retained historical floating-tie failure. It checks deterministic learning/evolution behavior, not whether real people will enjoy the recommended wine.

The earlier intelligence audit also retains930 passing checks and101 classified legacy failures across four defect families (45/51/4/1). Scoped native guards mitigate selected paths; this is not proof that the shared historical learner is corrected globally. Regression commands accepting explicitly classified legacy behavior must not be read as zero remaining intelligence defects.

## Release Hold

- Deploy the prepared Foodv10 correction only after the requested additional Food-only permission, verify exact remote source/config and execute the bounded real profile canary. Do not infer approval from the earlier two-function deployment.
- Complete current-payload native/visual checks and the release-required new full50 journey run. Earlier50 provenance stays31e.
- Close genuine identity/catalogue/coverage/latency and price/service P1 findings before upload; zero open P1 is the gate. Native same-format conflict safeguards do not certify every printed price, currency or serving. A refusal to invent a score is necessary but does not establish useful recognition or calibrated preference prediction. No scope change or legacy classification is a release waiver.
- Actual authenticated restaurant bidirectional availability, all native input modes, real account/RLS/email delivery, physical camera and spoken VoiceOver remain incomplete coverage. No claim of full-app E2E or human taste validation.
- Home maximum-text AX activation and brand wrapping remain open. A successful physical touch is useful diagnostic evidence, not accessibility approval; do not count the two failed follow-ups as passes or declare the complete mobile QA green.
- R6 worst-case128-row Node resolver median617.33ms is improved from the feature's prior10.34s but remains synchronous stress cost; it is not an iPhone latency/memory approval.
- Fresh App Store Connect readback at approximately19:25UTC confirms the session and build94/group assignment. Build95 is absent. Prior agreement-banner observations are not represented as a newly demonstrated upload rejection; no agreement was accepted by the agent.

Private raw evidence is under the root declared in `MATCHRIM_CONSUMER_95_2026-10-17.md`. No private images, tester email, credentials or account data are committed here. No signed95, Apple upload, new invitation or web publication is claimed.
