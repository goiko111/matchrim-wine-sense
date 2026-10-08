# Matchrim 77: real image challenge, 2026-10-08

## Decision

Benchmark execution COMPLETE; product quality HOLD. Forty scenario/mode journeys completed over 29 image files (24 new public sources and the five original owner files). This is not 40 independent images, 40 human users, or complete application certification. No recognition mocks were used. No production code, backend function, published web, TestFlight distribution or owner-phone installation changed.

Application source remained `402da5db1a77067ee586e92672f099477bfc62b8`, branch `codex/matchrim77-challenge-20261008`. The existing local signed candidate is 1.0 (77); historical uploaded build75 remains unchanged. Current Apple processing/tester availability was not rechecked.

## Method and cost

- Real production endpoints were called through compiled local77 UI in Chrome, mobile viewport393x852, touch enabled, emulated native shell. This was NOT an iOS simulator or physical-iPhone run.
- A fixed synthetic anonymous profile was used: body4, acidity4, sweetness1, tannin3, fruit4. No actual user's account, ratings or saved wines were modified. Prior consent was explicitly authorized; onboarding/privacy UI was seeded for this benchmark and was not itself retested.
- Additional authorization300 Edge POST requests; consumed272; remaining28. Prior immutable ledger289/300; total tracked561. Catalog calls/retries are counted before transmission. Provider-internal fanout and billing are not observable.
- Final40-case traces contain271 calls (270HTTP200, one recovered HTTP500). One earlier interrupted attempt adds one detector HTTP200, explaining total272. No auth/quota stop occurred.
- The first run stalled because the QA harness failed to normalize the accented terminal message `Analisis incompleto`. The harness was corrected, completed cases preserved, and the same ledger resumed. This was not counted as an application timeout. The interrupted zero-region detection and resumed three-region/zero-identity output remain separate evidence of run variability.
- Only allowed scan/catalog POST endpoints and read-only REST access were permitted. No account, restaurant, favorites or rating writes were allowed.
- `backend-trace.json` preserves response, region request, crop data-URL hash and timing, without base64 photos. The legacy `image_bytes` field counts encoded characters, not decoded JPEG bytes; `image_sha256` hashes the encoded data URL. Actual source-file hashes are separate.

## Results and limitations

| Measure | Observed result | Interpretation |
| --- | --- | --- |
| Terminal journeys | 40/40:27 completed,13 abstained | Transport/UI completion, not40 correct results |
| Four original wine menus | 67 matched /69 displayed /69 expected | Name precision97.10%, recall97.10%; not canonical identity |
| One Spanish food menu | 7/7 named dishes | Only this seven-dish annotation is exhaustive |
| Valid negative cases | 14/15 abstain correctly | Non-wine bottle scene fails; one contaminated negative excluded |
| Horizontal overflow | 0/40 at393x852 | Does not imply overlays are visually uncluttered |
| UI elapsed p50 / p95 | 15.285s /73.766s | Includes navigation and4s stability wait; not inference-only latency |
| Console/backend errors | One HTTP500, recovered | Illustrated wine list recovered through regional calls |
| Canonical precision/recall | NOT CERTIFIED | No independent exhaustive bottle/identity ground truth |
| Personalized recommendation quality | NOT CERTIFIED | Synthetic profile, no human preference outcome study |

The previous75 original-menu report gave name precision97.14% and recall98.55% (68/70/69). This run does NOT demonstrate an overall improvement. Provider variability and changed intermediate responses prevent attributing this difference solely to client changes. Offline deduplication replay success did not guarantee fresh-model success.

| Original file | Matched/displayed/expected | Precision/recall | Actual discrepancy |
| --- | --- | --- | --- |
| IMG_7547 2.HEIC | 16/17/16 | 94.1%/100% | Laurent Perriere Ultra and Ultra Brut appear separately |
| IMG_7548 2.HEIC | 8/8/8 | 100%/100% | No named-row discrepancy in this run |
| IMG_7552 2.HEIC | 13/13/13 | 100%/100% | No named-row discrepancy in this run |
| IMG_7553 2.HEIC | 30/31/32 | 96.8%/93.8% | L'Arnaude absent; Percheron is partial, not full Percheron Chenin Blanc |
| IMG_7605 2.jpg | 24 regions,8 candidates | Identity metrics unavailable | 1 recognized,7 uncertain,16 unknown;3 affinity scores; partial coverage |

The original fridge took39.4s in-app (44.5s observed UI). Its35-bottle estimate is model output, not ground truth. Previous75 had28 regions,8 candidates and4 scores; neither run certifies coverage or identity. Fuzzy one-to-one name comparison is not validation of producer, vintage, denomination, grape, price or sensory attributes. An unmatched partial name is not automatically a hallucination.

## Confirmed defects

| Priority / case | Expected | Actual and evidence |
| --- | --- | --- |
| P0 domain classification: commons-93111644-etiqueta | Exclude non-grape alcoholic drinks from wine recommendations | Sake, tequila and Baileys shown under Wines(3); provisional identity55%, sake affinity approximately67%. Confidence disclaimers do not fix category leakage. |
| P0 recommendation consistency: repeated original-menu names | Same canonical wine and profile should share grounded sensory data | Amontillado El Contrabandista and Vina AB vary57 to69 across photos; Oloroso Don Nuno and Bertola Palo Cortado vary11points. Different inferred attributes may explain this; not a fixed-input scorer determinism test. |
| P1 duplicates/count: commons-159930620-etiqueta | Reconcile aliases and each physical region once | Three front-readable La Quinta Mamba labels become MAMBA(2 bottles) and La Quinta Mamba(2), affinity79%/76%. Background/edge objects remain unannotated; do not turn this into exhaustive box precision. |
| P1 food coverage: commons-148324546-menu-comida | Extract all readable dishes before ranking | Only8 items from a dense six-panel board; visible Turkey, Pulled Pork, Mac & Cheese and other items omitted. Raw summary uses low wine-sweetness preference to reject sugary desserts, which is not evidence of food preference. |
| P1 food structure: commons-177500191-menu-comida | Preserve alternatives and independent dish rows | Poisson-Poulet braise fused, side/sauce structure flattened. |
| P1 dense-scene efficiency: commons-7893320-etiqueta | Gate crop readability; useful partial results at bounded cost | 60 regions,0 identities,63calls,50.0s in-app. Dense red rectangles and clusters obscure inspection despite no horizontal overflow. |
| P1 dense coverage: commons-94131711-etiqueta | Canonical aliases grouped, legible references resolved | 39regions,20candidate rows,68.9s in-app, alias splits including TA_KU/Takuku. Estimated44objects is not independent truth. |
| P1 physical vs printed: commons-7478133-etiqueta | Distinguish illustrated references from physical inventory | Printed wine-list illustrations described as3 of approximately4 visible bottles. |
| P1 recovery: commons-7478133-carta-vinos | Four readable references without excessive-document failure | Initial500 says list too extensive; two regional calls recover4rows. Recovery works but backend failure remains. |
| P1 missing-data explanation: commons-78354929-carta-vinos | Explain missing wine attributes separately from missing profile | Five references, no affinity; UI requests completion of a taste test although the synthetic profile is present. |
| P2 copy / historical list | Preserve language, service units and currency uncertainty | English source copy remains in Spanish detail; historical list yields34rows requiring service/price-unit review. Repeated names here are not automatically duplicate wines. |

Manual findings supplement the automated issue counters; an empty `issues` array is NOT a case approval. No test-generated data has been represented as user feedback.

## Runtime observed, not deployment certification

Response metadata reports Lovable / `google/gemini-2.5-flash`, not an independent Anthropic route. Management-plane versions and configuration were not changed or independently certified.

| Endpoint | Final40-case calls | Response-reported version |
| --- | --- | --- |
| detect-wine-regions-v72 | 21 | matchrim-region-detector-v4-candidate |
| analyze-wine-region-v72 | 150 | matchrim-region-analysis-v8-partial-name |
| scan-wine-menu-v72 | 66 | scan-wine-menu-2026-10-05-no-placeholder-v9 |
| search-wines-v75 | 26 | No self-version |
| scan-food-pairing | 8 | scan-food-pairing-2026-06-30-client-profile-v1 |

An additional detector call belongs to the interrupted attempt. No calculate-wine-affinity-v73 call was observed; client fallback/inferred attributes must not be mistaken for verified canonical sensory data. The locally prepared food backend changes are not this production endpoint.

## Annotation and provenance exceptions

- `commons-55328769-carta-vinos` was labeled a wine-club welcome-sign negative, but full-size post-run inspection showed a foreground tasting menu. The baseline is preserved and a review addendum excludes it from negative accuracy. Its five returned ice wines/vintages are NOT retroactively accepted as ground truth. The correction was agent review after seeing results, not blinded human annotation.
- The earlier source manifest marked `commons-355816` local-QA-only until author attribution was clarified. It was nevertheless processed privately by the provider in two modes (four calls) in this run. This is recorded as an execution/provenance exception, not silently rewritten. Commons credits uploader Branddobbe and CC BY-SA3/GFDL; uploader is not independently verified author. Do not redistribute this image or include it in further remote runs pending attribution review. No image is included in the committed evidence bundle. Source: https://commons.wikimedia.org/wiki/File:Chalkboard.jpg
- Partial bottle annotations yield visible-subset observations only, never exhaustive false-positive/precision claims. Ingredient tags are not individual food dishes. Error responses cannot pass a negative-abstention test.

## Evidence and reproducibility

Portable scored results, request ledger, a40-row expected/actual index and hashes are under `docs/qa-evidence/matchrim77-live-2026-10-08/`. Original local captures/raw traces are preserved in:

`/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim77-live-20261008`

Each case contains result.json, backend-trace.json and UI captures. Highlights: `commons-93111644-etiqueta/results.png` (non-wine leak), `commons-7893320-etiqueta/scene.png` (dense overlay), `commons-159930620-etiqueta/results.png` (aliases). The interrupted evidence is separately retained under `commons-80448425-etiqueta-interrupted-attempt1`, with `harness-interruption.json` and the pre-resume snapshot.

Offline rescoring, no backend calls:

```bash
QA_PYTHON=/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim73-qa-20261007/.venv/bin/python
"$QA_PYTHON" scripts/score-matchrim-challenge-live.py --run /absolute/path/to/matchrim77-live-20261008
"$QA_PYTHON" scripts/check-matchrim-live-scoring.py
"$QA_PYTHON" scripts/check-matchrim-name-scoring.py
```

The scorer imports the existing Playwright harness, so use the QA virtualenv with Playwright installed. The system Xcode Python lacks that dependency and its scorer invocation failed; the configured QA virtualenv passes both checks without network traffic.

The live runner is bounded/resumable and exclusively locks its ledger. Do not launch against a fresh output directory to reset budget. Source attributions and current authorization must be rechecked before any new execution. A post-run safeguard now refuses fresh commons-355816 cases; preserved results can still be resumed/read. Reuse immutable fixtures; do not regenerate easier examples to improve scores.

QA tooling safeguards pass offline. Application source did not change this turn, so prior77 release-contract/typecheck/web/native results remain historical evidence, not newly executed tests. Existing mocked scanner31/31, food10/10, synthetic persona UI25/25 and anonymous route34/34 suites do not certify recognition.

## Remaining application gates

This run covers image upload, real recognition, partial/negative states, result lists and first-result details in mobile Chrome. It does not close authenticated multiuser save/rate/restart/isolation, restaurant availability and consent, real recommendation outcomes, sharing/privacy deletion, payment, camera permissions, spoken VoiceOver, Dynamic Type, orientation, physical memory or offline/cancellation workflows. See the existing77 feature matrix; these remain separate gates rather than implied passes.

Next implementation sequence: (1) non-wine classification and source-grounded canonical identity; (2) canonical sensory provenance and stable affinity; (3) region/alias reconciliation and readable-crop budgeting; (4) food extraction/option structure before personalization; (5) repeat affected frozen cases in isolated staging and mobile visual QA. Keep web unchanged. Do not upload local77 just because the run completed or compilation passed. No more remote calls are needed to establish these defects.
