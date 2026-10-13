# Matchrim: cloud integration and candidate82

## Result

The cloud patch is now integrated with the local menu-price/style work in commit `bda5241df3e0683990aa0371c95e3e955e539084`, branch `codex/matchrim82-cloud-integration-20261013`. Product source is retained in a reproducible, signed **1.0 (82)** candidate. **82 is not uploaded.** Published web and production backend deployments are unchanged; TestFlight81 is immutable.

The original patch and report were downloaded from the existing cloud conversation. The report ZIP's362 listed file hashes and sizes all match. Original cloud425 checks/600-cycle results are retained separately, not presented as this machine's rerun. The download event for the ZIP timed out, but the completed34MiB file was verified and safely extracted; no repeat download was needed.

Only the menu-scanner imports conflicted during the three-way integration. The local currency-aware formatter was retained while adding measured overlay grouping. Price review, identity/scoring/data helpers and save semantics remain protected against the local81 baseline. The original387 cloud fingerprints are still verified;381 unchanged paths plus the three additional local price/style modules are protected. No schema, canonical detector, scoring algorithm, provider endpoint, corpus or quota ledger was changed.

## Changes

| Before | After | Why |
| --- | --- | --- |
| Image reading/decoding could continue after cancel | AbortSignal and callback/listener cleanup across preparation/crops | Avoid stale previews and unnecessary subsequent client work |
| Menu used an additional unguarded FileReader | One preparation-owned read and preview | Prevent cancelled image completion from repopulating the view |
| Pin grouping used abstract geometry thresholds | Measured image/target sizes, resize/text/zoom observation | Keep touch targets disjoint while preserving every original region/row |
| Detail content not consistently keyboard reachable | Named scrollable region; bounded header/footer; Tab/End/Home checks | Make long descriptions and controls reachable |
| Cloud snapshot knew only pre-price source | Layered cloud/local81 guards and85 integration assertions | Preserve approved prices, similarity, identity editing and save behavior |
| Some cloud uploads bypassed visible controls | Visible gallery/upload file chooser with handle disposal | Verify the actual source-selection path |
| Final dynamic-overlay capture included a closing backdrop | Await backdrop removal;22-check focused rerun | Preserve stable visual evidence, not a transition frame |

The QA price component now exports its component, removing its extra Fast Refresh warning. Product modules and successful image/crop pixel behavior were not altered to reduce memory counters.

## Current Verification

| Gate | Actual |
| --- | --- |
| Combined client suite | 425/425 browser checks; all HTTP/WS intercepted, no live writes/accounts/provider calls |
| Stable overlay follow-up | 22/22; includes20 repeated grouping checks and2 new closed-backdrop assertions; not445 unique tests |
| Focused price review | 6 contexts,110/110 checks: glass/bottle, currency, comma, unknown service, narrow200% |
| Focused style/editing | 6 contexts,82/82 checks: ungrounded/provider-forged abstention, sequential typing,30-row list, price zoom |
| Integration contracts | 85/85 synthetic monetary/style and protected active save/edit/list/similarity initializers |
| Release / cloud / typecheck | PASS |
| Final full lint | 0 errors,106 warnings |
| Production web/native resources | 146 exact copied resources; no QA fixtures or synthetic model responses in the candidate |
| Browser retention | 30 completed varied cycles; post-GC node range4, listener range1; DOM after reset165 nodes throughout,0 images/canvas/dialogs/toasts |
| Browser/runtime | Chrome154.0.8037.98, Playwright Python1.55.0 on macOS; not the original Linux153/1.58 run |
| Final post-GC sample | 279 nodes,318 listeners, JS heap7,173,856 bytes; not iOS/native memory approval |
| iOS82 simulator | Compile/install and6/6 XCTest cases PASS,0 skipped; max five-sample cold launch2.949565s |
| iOS82 archive/export/signature | PASS;156/156 strict signature/profile/resource checks, SDKiphoneos26.0 |
| iOS82 physical | BLOCKED: paired-device listing is stale/inconsistent with device lookup and Xcode destinations; no physical installation or new physical-QA claim |

The main425-check gate completed before the added pure integration script and diagnostic-component export; no application source changed afterwards. Final release/cloud/typecheck/lint receipts cover those tooling changes. The focused stable-overlay follow-up is preserved in a separate directory. Historical source-byte guards from earlier scoped reports are not silently reclassified as current integration gates.

The pixel canary is an existing public **food menu**, with frozen wine-response contracts and empty catalog/profile in the client gate. It is not a new wine-recognition result or independent taste study. No additional scenes, recognition precision/recall, real users or year-long preference outcomes are asserted. Native XCTest is basic navigation/accessibility/picker/orientation, not spoken VoiceOver, physical camera, authenticated CRUD or recognition intelligence. Native RSS/allocations remain unresolved; Linux process-memory instrumentation is unavailable on this Mac.

## Apple Follow-Up

Authenticated App Store Connect readback confirms81 processed and assigned to the internal group. Its tester table reports **1.0(81) installed on the owner's iPhone16ProMax, iOS26.6,13October**. This is Apple's installation report, not a new direct device inspection. The426 sessions shown in that group row are aggregate tester/group data, not426 sessions of81 or426 users.

Honest Spanish build81 test notes were saved and the UI confirmed Guardado. Adding the requested external tester reached the mandatory review-information form. Existing app-review contact and demo-account fields were blank. Verified contact name/email and a limited beta description are prepared, but phone and a dedicated Matchrim review-account login remain for the owner to complete directly in Apple. **External invitation is not sent; review is not submitted.** No admin/internal role, public link, external group or unrelated app was created. No credentials are retained in this report.

Separate physical checks: CoreDevice listed the paired phone, then lookup by both CoreDevice UUID and UDID returned error1000/device not found. Xcode's destination list contains no actual physical phone. No device reset, trust/privacy change, provisioning-device registration or owner-app replacement was attempted.

## Reproducible Candidate

- Application commit: `bda5241df3e0683990aa0371c95e3e955e539084`.
- Local IPA: `artifacts/matchrim82-cloud-integration-20261013/Matchrim-1.0-82-candidate.ipa` in this task's private output directory.
- IPA SHA256: `9d3f3b2947fb5c1109005829842877c07dfafe157487373aa7c3ceaac723bb96`.
- Archive: `/private/tmp/Matchrim82-20261013-build/Matchrim82.xcarchive`.
- Scratch source: `/private/tmp/Matchrim82-20261013-native`.
- `native82.cjs`: prepare, simulator, qa, archive, export; **upload deliberately unavailable**.
- Same production contract: catalog75 / affinity73 / vision72; only a verified anonymous client key is used for packaging.

Evidence root:

`/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim82-cloud-integration-20261013`

Contains original cloud report/hashes; combined-gate matrices/captures; menu-price/style and overlay-stable evidence; final validation logs; native82 result bundle, six native screenshots, candidate/resource/signature JSON and IPA. Private Apple screenshots/form status are separately under `artifacts/matchrim81-apple-followup-20261013`, outside Git.

Local preview: `http://127.0.0.1:4482/`, reserved.invalid backends and no real recognition/authentication service. It is not an iOS installation or production web update.

## Remaining Gates

1. Complete the prepared Apple review phone and dedicated Matchrim account fields, submit the external beta review if the next screen permits it, then verify the invitation's actual state. Do not substitute Apple-account credentials or invent contact details.
2. Restore a real eligible physical-device connection and test the installed81/intended next candidate without replacing owner data; camera/permissions, physical text/VoiceOver/network/memory remain separate.
3. Continue independent real dense identity/coverage and source-grounded sensory/personalization validation under an explicit current provider-call budget. Historical28 unused calls were not consumed or reset here.
4. Validate authenticated hosted ownership/write ambiguity independently. The intercepted client gate cannot certify RLS or true server persistence.
5. Before any next TestFlight upload, use the appropriate owner quality/distribution gate and a current Apple-number readback. This continuation did not authorize another automatic upload or web/backend deploy.

No source push was made: the local parent history still contains evidence/private media that must not be pushed to the public repository wholesale. A reviewed code-only snapshot is required for any later transfer.
