# Matchrim OpenAI routing 92 - 2026-10-16

## Scope and authorization

The owner saved the dedicated credential in Matchrim Lovable Cloud as `openai_matchrim` and requested that all Matchrim AI, including aiRIM, use it. The owner explicitly authorized one minimal-credit batch for the 29 AI Edge Functions, without publishing or modifying the web. No secret value is read, copied, logged or bundled. Maps, Supabase and Apple credentials are unrelated and unchanged.

This backend change is not iOS build 92. The preserved production-connected client candidate remains 1.0(91), source `3a464b7511df320ccb9052b91b556b8cfdc796e7`; it has not been uploaded. Earlier restaurant-only routing notes are historical and superseded by this broader authorization.

## Deployment isolation

- Production baseline: `67b9086366500b08bd80e5620571bdcade371d0a` in `goiko111/matchrim-wine-sense`.
- Lovable project: `7e9b6f66-d4ee-404a-8678-c9afab22de75`; backend: `cbjynrbvrhcmpaojmqdp`.
- The mobile integration branch contains additional QA89/90 recognition/learning changes. It is NOT merged into production for this migration.
- `scripts/prepare-matchrim-openai92-deployment.mjs` reconstructs exactly 29 entrypoints and their 41-file source closure from the production baseline, with two explicit reviewed shared-helper overrides. The generated manifest records source hashes, Git blobs, exact AST range edits and unchanged config/JWT provenance.
- Legacy gateway calls are mechanically redirected, without rewriting prompts, schemas, identity rules, SQL queries or affinity formulas. Four inherited generic-client type errors and two missing optional properties in one type annotation are repaired with runtime-erasure equivalence checks.
- `calculate-wine-affinity-v73` and `restaurant-import91` perform no model invocation and are excluded. No config, migrations, auth settings, accounts, client, iOS resources or lockfile changes are part of the batch.

## Provider contract

`_shared/matchrim-openai.ts` is the only credential/router. It prefers `openai_matchrim`, permits `OPENAI_API_KEY` as a compatibility alias, and never reads Anthropic/Lovable provider keys or routing switches. There is no fallback to those providers. All outgoing model requests use OpenAI with `store:false`; this does not assert zero retention.

Text uses the configured fast/quality tier; actual image/PDF attachments use the vision tier. Defaults are `gpt-6-luna` (fast, reasoning none) and `gpt-6-astra` (quality/vision, reasoning low), checked against current official OpenAI documentation. Account/model availability is a separate live gate. Backend-only model overrides are supported and validated. Reasoning models do not receive unsupported sampling settings.

Existing JSON/SSE consumers keep their contract. The legacy chat adapter bounds duration, validates complete JSON responses, refuses unsupported tools/remote image fetching and refuses image generation as a bottle-image evidence source. The Responses adapter rejects refusals/truncation; the v72 compatibility shim enforces completion before legacy consumers see text. Caller cancellation is preserved where supported. Provider error bodies are cancelled, not exposed in logs.

aiRIM no longer claims personal tasting experience in its prompt example. Its model metadata and credit-error wording reflect the actual provider. This is not evidence that recommendations are correct.

## Local verification before deployment

| Gate | Observed result | Interpretation |
| --- | --- | --- |
| Dedicated adapter | 59 checks PASS | Fixture-based actual helper transport/JSON/SSE/privacy/cancellation checks; no paid model calls |
| Legacy routing audit | 19 handlers / 23 calls PASS | AST checks on the local migrated callers |
| Restaurant suite | 22 session, 13 ranking, 170 workspace, 55 provider, 27 import groups PASS | Controlled/provider-fixture checks, including real local 50-page PDF rendering |
| Remediation89 | PASS, including 12 provider and 40 food robustness checks | Controlled regression, not fresh recognition accuracy |
| Cloud snapshot | PASS | 19 explicitly allowed caller migrations; other historical fingerprints preserved |
| Release suite | PASS | Catalog harness updated for the new helper import; no invented accuracy claim |
| Typecheck / lint / build | PASS / 0 errors, 106 inherited warnings / PASS | No frontend or native source delta |
| Production package Deno check | 29/29 PASS; parent rerun PASS with network denied | Checks the actual 41-file generated production closure, not only the local branch |

Initial production-package Deno verification exposed 11 inherited TypeScript errors. These are retained in the private evidence history and are not model/API failures. Five audited type-only edits resolve them without changing emitted runtime code. A parent verification attempt used an unsupported Deno CLI flag; the subsequent network-denied full check passed and is the valid result.

## Live gates and evidence

Preparation status was HOLD; the subsequent deployment and real tests below supersede that preparation checkpoint. Release remains HOLD, not provider access.

The earlier two-function deployment used 1.7 Lovable credits and passed 8/8 hosted CORS/auth checks; this is not an OpenAI OCR/pairing pass. Published web was restored to exact baseline after incidental platform-generated frontend changes. The same readback/preservation check is required for this batch.

Private evidence root: `/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim92-openai-20261016`.

## Deployment Result

- Final manifest SHA256: `272d02770af700970996846829f68981381f2d7feaf60391c8a0ec55fec1244d`; clean reviewed local commit `b27011ba03e58bb72fa4929fe870e798bcbe6c73`.
- The first non-Max turn stopped before writing/deploying (0/29): the platform had automatically changed its two managed frontend files before the agent ran. Cost 1.1 credits; source d36bf6f. This is retained as a failed deployment attempt, not a successful batch.
- The continuation applied the exact 41 manifest sources and reports 29/29 successful function deployments in ONE backend batch at `40f6f979114dc1a11c74449a58ad436448e4c16b`. Cost 1.8 credits. Total additional Lovable spend: 2.9 credits. No further paid turn was used for verification.
- Parent independently verified all 41 remote Git source hashes, the shared helper through the Lovable read-file connector, and exact unchanged config/JWT. The deployment channel does not return a deployed version ID; the code commit and source hashes are provenance, not invented runtime version IDs.
- Corrective main `c9d7b91b8aeb913978ccaab0df8b80f505a7b099` restores only previewAuthStorage.ts/types.ts to exact67b9086 using an isolated Git index. All source outside the backend scope now matches the baseline. No current worktree reset/merge, second backend batch, web Publish/Update, schema/auth/account/secret update or native change.
- 29/29 actual hosted OPTIONS checks and missing/malformed restaurant JWT checks pass: 31/31, without model calls or images. These verify reachability/auth boundaries, not 29 semantic inference outcomes.
- Evidence: `openai92-deployment-final.json`, `predeploy-parent-verification.json`, `deployment-source-readback.json`, `lovable-deployment-receipt.json`, `web-preservation-receipt.json`, `hosted-cors-auth.json`.

## Real Authenticated QA

One existing account was used, not 50 independent users or a taste study. The owner signed in normally in both Brave and the isolated simulator; no token/password copying, account creation, profile training or wine mutation was used. Ordinary app telemetry/query logging may occur through the normal UI. Original/public fixture attribution is retained in the earlier corpus reports; no new dataset was downloaded or regenerated.

| Real scenario | Expected | Actual | Gate |
| --- | --- | --- | --- |
| Native first login/navigation/gallery | Existing production account; separate food/wine pages | Verified in `wine.matchrim.qa91live`, isolated iPhone simulator; food board and IMG_7548 imported using iOS Photo Library | PASS for observed steps |
| Native food-board OCR | Actual provider result, not fixtures | 12 unconfirmed readings, 1/1 pages processed; source/missing-price disclosures visible | Transport/read PASS; not exhaustive OCR precision |
| Native IMG_7548 | Eight readable wine references | Eight readings, 1/1 page processed | Count PASS; individual native identity audit not completed |
| Native pairing | Request, progress and inspectable explanations | Request/progress/return to idle observed; long result details not inspected | PARTIAL, not full native E2E approval |
| Browser food board + dense BBQ | Preserve separate sources; four BBQ control terms | 40 readings (12 board, 28 BBQ); brisket, ribs, mac and cheese, potato salad all present; coming-soon rows explicitly excluded from pairing | 4/4 control terms, NOT overall precision/recall |
| Browser IMG_7548 | Eight specified references | 8/8 lexical controls; uncertain spelling/canonical identity still requires review; two source price columns not collapsed into invented unit/currency | Controlled reference coverage PASS, canonical gate HOLD |
| Dish to wines | Only submitted wine IDs, explicit uncertainty | Brisket -> one uncertain Laurent Perrier hypothesis with preparation/sensory/stock gaps disclosed | Contract PASS; useful superiority not established |
| Wine to dishes | Only submitted food IDs, unavailable rows excluded | Gaudensius -> two uncertain hypotheses (garlic prawns/prawns); two restricted rows excluded, no asserted stock or personal score | Contract PASS; sommelier outcome not certified |
| Budget/service | Unknown price/service must not become eligible | Selected wine with 50 EUR/bottle returns no eligible pairs and explicit service-evidence warning | PASS; server preflight returns before inference |
| aiRIM real SSE | Complete answer; no invented reference/price/affinity | Answer distinguishes supplied fact, inference, one-rating memory limitation and low confidence; no invented bottle/price | PASS for this canary, not all AI functions |
| Classic wine-menu scanner | Actual v72 flow with eight controls and legible list | Eight final results, comparison/list present, affinity withheld without verified sensory data; no captured warning/error messages | Recognition transport/list PASS; performance and canonical audit HOLD |

Timing is observation-bounded, not an instrumented provider benchmark. The classic scanner was still reading at65.678s and was first observed complete at156.685s; actual completion lies between those observations. Its advertised30-60s range was exceeded. Exact provider request count, per-call latency, p50/p95, token usage and cost were not captured and must not be invented. The legacy path can refine regions/retry; one UI action is not necessarily one model call.

The first food DOM counter included three document entries (43). The corrected row-specific selector gives40. Both artifacts are retained; this was a QA selector issue, not three extra dishes.

Mobile browser restaurant and classic-list snapshots are393x852 with scroll width393. aiRIM landscape852x393 exposes a pre-existing web account-menu overflow to912px. Native header is a different component and is not certified defective by that browser result. aiRIM and classic-scanner console capture is empty; the restaurant tab has two asynchronous browser message-channel errors of unestablished origin, not silently reported as zero app errors.

Real defects/residuals found: duplicate dessert mentions across menu sections; compound preparation/side rows needing review; overly weak pairing evidence without grounded sensory/catalog enrichment; classic scan latency; raw Markdown markers in aiRIM text rendering; existing landscape web header overflow. No speculative production hotfix was added to the narrowly authorized provider migration.

Evidence: `live-qa-summary.json`, `native-*.png`, `browser-real-food-rows-scoped.json`, `browser-real-*-results.txt`, `browser-*-pairing-result.txt`, `browser-reverse-pairing-mobile.png`, `browser-budget-service-abstention.txt`, `airim-real-*`, `classic-*`, console receipts. An optional query for this exact QA marker in liquid_intelligence_queries returned no row; no broader user-data query or runtime-model audit claim follows from that.

## Final Regression And Release Gate

Post-commit rerun: OpenAI92, Restaurant91, Remediation89, cloud, release, typecheck, lint and web build all exit0. Lint remains0errors/106inherited warnings. Logs and durations are in `final-regressions.json`; these commands made zero real model calls. Native/client source is unchanged from the preserved91 candidate, and no iOS build/version was fabricated from a backend-only revision.

Provider/config/deployment gates are now closed. No quota/key-access blocker was observed in these canaries. Remaining work is internal: instrument classic scan phases/request bounds, finish the original-material/canonical identity rerun and independent benchmark, inspect long native pairing results/cancellation/accessibility, and address the food/reference and useful-evidence gaps. Current live tests do not certify the five-original-image E2E, human taste accuracy or an all-function semantic pass.

TestFlight91 remains NOT UPLOADED. Do not upload merely because all functions compile and a few canaries succeed. Finish the internal gates above, then recheck Apple account/signature/build-number availability and the final physical gate. The owner has already provided both sessions; do not ask them to repeat those logins as an explanation for unfinished internal QA.

## Known residuals

- Legacy search prompts that mention internet verification have no actual web-search tool; generated URLs/suggestions must not be reported as independently verified discovery.
- Generated bottle-image fallback is deliberately refused; nullable fallback remains, not an invented bottle photo.
- Recognition recall, canonical identity and human taste validation are not certified by a provider migration or synthetic persona results. Historical recognition metrics are not fresh reruns.
- Brave login does not authenticate the isolated iOS WKWebView. Both normal sign-ins are now verified; the remaining native gate is inspection/coverage, not missing credentials.
- Native build 91 remains HOLD until hosted real tests, authenticated mobile QA and Apple availability/signature gates are satisfied. No TestFlight upload or public web publish is authorized by passing fixture tests alone.
