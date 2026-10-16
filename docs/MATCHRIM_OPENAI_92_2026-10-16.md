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

Status at preparation: HOLD. The 29-function batch has not yet been executed and no OpenAI call has succeeded in the hosted environment. The owner has an authenticated Brave session at `http://127.0.0.1:4597/restaurante`; imported food-board/BBQ and authorized IMG_7548 wine-card files are queued, with an unrelated example.com transport control excluded from AI.

The earlier two-function deployment used 1.7 Lovable credits and passed 8/8 hosted CORS/auth checks; this is not an OpenAI OCR/pairing pass. Published web was restored to exact baseline after incidental platform-generated frontend changes. The same readback/preservation check is required for this batch.

Private evidence root: `/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim92-openai-20261016`.

## Known residuals

- Legacy search prompts that mention internet verification have no actual web-search tool; generated URLs/suggestions must not be reported as independently verified discovery.
- Generated bottle-image fallback is deliberately refused; nullable fallback remains, not an invented bottle photo.
- Recognition recall, canonical identity and human taste validation are not certified by a provider migration or synthetic persona results. Historical recognition metrics are not fresh reruns.
- Brave login does not authenticate the isolated iOS WKWebView. Native authenticated E2E needs an ordinary existing-account sign-in, not copied tokens or an auth bypass.
- Native build 91 remains HOLD until hosted real tests, authenticated mobile QA and Apple availability/signature gates are satisfied. No TestFlight upload or public web publish is authorized by passing fixture tests alone.
