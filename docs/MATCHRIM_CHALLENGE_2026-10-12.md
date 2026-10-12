# October12 Challenge: First Local Remediation Block

Assignment `MATCHRIM-HOY-20261012-01`, baseline61a91f356e6d9d30b14827c4a1fc7e0190138bd7. First block delivers frozen inputs, reproduced client defects, local corrections and coverage boundaries. Product intelligence and native integration are not certified by this checkpoint.

## Corpus And Denominators

- Five new independent scenes: one privately supplied shelf photograph and four public photographs. One historical wine-list source reused, not counted as new. Four public originals downloaded:3,157,055 bytes, within12-scenes/30MB cap.
- Deduplicated against114 prior manifest entries/89 unique hashes, plus source page identity to avoid counting a different resolution as a new scene. Initial Node transport returned429; bounded curl transfers succeeded. Public page metadata subsequently confirmed page IDs/licenses. No Matchrim/provider request, account or paid call.
- Original owner SHA256 and full annotation freeze unchanged. Physical shelf count28 with rows10/7/6/5; five lower bottles truncated. Exact canonical unique-reference count remains unknown. Producer-only/partial names, ambiguous label letters and brand-history dates are not complete identities or harvest years.
- Annotation is agent visual review before app result, not independent qualified human ground truth. Approximate boxes have6px contour uncertainty. The dense public shop has only two named-bottle annotations; total count unresolved. Empty menu proposals mean structural-only annotation, not zero wine rows.
- Crops, resized images and orientation runs are variants, never additional independent scenes. Owner photograph/annotations/captures remain in private local artifacts and outside Git/bundle. `commons-355816` remains excluded from remote processing. Historic28 provider-call remainder untouched; current cap required before paid execution.

| Public source | Author / verified license | Role |
| --- | --- | --- |
|[Wine shop](https://commons.wikimedia.org/wiki/File:Wine_shop.jpg) | Matt Pourney / Public domain | Dark dense shelf, incomplete text |
|[Sainte Magdeleine label](https://commons.wikimedia.org/wiki/File:Wine_Label_-_Front_of_Bottle_-_Sainte_Magdeleine_-_Cotes_de_Provence_-_2018.jpg) | Wiki.cullin / [CC BY-SA4.0](https://creativecommons.org/licenses/by-sa/4.0/) | Curved/cut label,2018, literal producer |
|[Four Hugel labels](https://commons.wikimedia.org/wiki/File:Four_Hugel_bottle_labels.jpg) | Tomas er / [CC BY-SA3.0](https://creativecommons.org/licenses/by-sa/3.0/) | Same producer, four distinct literal references |
|[Laminated wine list](https://commons.wikimedia.org/wiki/File:Laminated_Wine_List.jpg) | Chris Cohen / [CC BY-SA2.0](https://creativecommons.org/licenses/by-sa/2.0/) | Reused historical menu; spirits/currency separation |
|[Aperol bottle](https://commons.wikimedia.org/wiki/File:Aperol_001_2025_06_08.jpg) | Friedrich Haag / [CC BY-SA4.0](https://creativecommons.org/licenses/by-sa/4.0/) | One physical bottle, zero grape wines |

Public originals and metadata retained locally. Screenshots depict these licensed public inputs; corresponding author/license attribution above applies to their image content. No owner-image publication.

## Before / After / Why

| Before | After | Why |
| --- | --- | --- |
| Aperol/aperitivo accepted as a wine candidate and sent to catalog matching. Four category-contract failures; both intercepted UI orientations fail. | Explicit word-boundary Aperol exclusion; no candidate, catalog lookup or wine-affinity slot. Three intercepted requests ->two. | Visible negative identity must not enter wine scoring. Generic wine-as-aperitif descriptions remain allowed. |
| Negative drawer gives generic aiRIM advice that text is insufficient, despite explicit Aperol evidence. | Region reads Otra bebida and shows its non-wine explanation; misleading generic guide omitted. | Explain exclusion rather than claim the label is unreadable. Manual correction remains available. |
| Percentage cutoff silently removes the smallest explicitly proposed edge bottle:28 annotations ->27 retained. | Keep explicitly typed boundary bottles with positive clipped area;28 ->28. Small region deferred by64px floor. | Preserve visible incomplete objects without spending OCR calls or fabricating identity. Unknown/label slivers and tiny interior proposals keep existing exclusions. |

## Expected / Actual

| Scene | Frozen expectation | Actual local result / limit |
| --- | --- | --- |
|Private shelf |28 physical bottles; exact identities/unique references unknown | Annotation-fed normalizer27 ->28. Policy12 automatic/16 deferred:11 automatic cap,2 legibility,3 resolution. Intercepted browser13 requests/orientation, unchanged. No live detection or OCR. |
|Hugel |4 physical cropped bottles;4 distinct literal references; years unproven | Four normalized/grouped injected references retained in both orientations. Identical-reference duplicate contract produces one group/count2. Affinity remains without verified sensory data. |
|Aperol |1 bottle/0 grape wines;1919 not a vintage | Four failing assertions corrected; candidate excluded, matching avoided, explicit explanation. No numeric affinity was calculated before either: baseline assertion labelled an affinity slot as shown; it was a placeholder, not a percentage. |
|Sainte label |1 cropped bottle,2018/literal producer; full name cut | Real pixels prepared2400x2371; one annotation-fed region retained. OCR/canonical outcome pending; file caption never used as visible-text answer. |
|Wine shop |Dense darkness;two readable duplicate references only | Pixel warning for brightness40; two annotated proposals retained. Total physical count and detection recall remain unknown. |
|Historical list |Document, no physical bottles; mixed wine/spirits/currency | Reused1920x2560 input prepared1800x2400. Real pixel preparation only; no new OCR result or row-accuracy claim. |

## Verification And Evidence

-15 new contracts PASS; affected existing dense-gate and multi-scan checks PASS. Six unique intercepted browser cases: three scenes x portrait393x852/landscape852x393; final negative-copy two cases replace their previous captures, not extra independent tests. No runtime errors or measured horizontal expansion. Pixel preparation/crop quality exercised on all six inputs. App requests intercepted before navigation; fixture flag not enabled.
- Typecheck/lint0errors106 inherited warnings/web build PASS with `VITE_MATCHRIM_QA_FIXTURES=false` and analytics disabled. Existing Browserslist/chunk warnings remain. No unrelated completed suite replay.
- First baseline UI harness used button instead of tab role and timed out; preserved as harness-invalid. Corrected baseline2/2 failures is `before-v2`. Category-only intermediate screenshot exposed the aiRIM contradiction and pixel-policy loss; final source closes both. Prior artifacts unchanged.
- Scope of visual review: public negative sheet and Hugel list plus private dense-scene captures in both orientations. Browser/native shim is not physical iOS, spoken VoiceOver, OS Dynamic Type, live backend or human recommendation feedback. Short fixture latency is not model latency; memory/network/physical gates remain.
- Coverage matrix: [MATCHRIM_CHALLENGE_COVERAGE_2026-10-12.md](MATCHRIM_CHALLENGE_COVERAGE_2026-10-12.md). Portable evidence: `docs/qa-evidence/matchrim-challenge-2026-10-12/`. Frozen public-source provenance: `qa/ground-truth/matchrim-oct12-challenge-sources.json`.
- Full private artifacts/corpus/freeze: `/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim-challenge-20261012/`.

## Native Gate And Residual

One bounded `simctl --set <QA>/qa-device-set list runtimes --json` under IP-denied sandbox/isolated HOME exits0:18.6 and26.0.1 available. No QA state files after that query. Client read/write to real user Library denied; out-of-process service cache initialization is not certified by client sandbox and was not inspected.

One scheme `xcodebuild -showdestinations` using unchanged copied native configuration also exits0, but returns no eligible Simulator destination and again reports iOS18.5 missing. No real-HOME use reported in logs. Runtime availability is now evidenced; Xcode eligibility remains unresolved. No qualifying destination, therefore no integrated build attempt, install, launch, boot, signing or number change. Earlier80 still lacks03-10 and today's corrections.

Remaining P0: live detection/identity/false positives and calibrated coverage on frozen sources; qualified canonical annotation; verified sensory coverage and human affinity outcomes; authenticated persistence/RLS and physical accessibility. Remaining P1: ambiguous label/brand years, unknown category brands, count/box quality and full-document comparisons need live evidence; broader workflow and performance cases remain in the matrix. No global completion percentage is justified by a client-only block. No push/deploy/Apple/TestFlight/invitation or production changes.
