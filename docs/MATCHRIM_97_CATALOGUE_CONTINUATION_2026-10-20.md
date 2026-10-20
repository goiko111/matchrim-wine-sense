# Matchrim97 Catalogue Continuation

Continues `db6a181` and the sealed97 candidate; it does not replace the earlier QA report or its failures. No web Publish, remote catalogue mutation, backend deployment or TestFlight upload.

## New Verified Finding

Read-only Winerim administration shows **217391 master Mantalak references**, versus1711 in the public Library previously queried. A recommendation universe of20530 is a third scope, not an exhaustive catalogue.

| Reported wine | Actual master record | Sensory data observed | Consequence |
|---|---|---|---|
| Vidure, Pago de Cirsus2020 | Mantalak201987; producer956 | Campos de IA has NV/reference-level and2018 options. NV axes5/3/1/4/4 (power/acidity/sweetness/tannin/fruit); research confidence58% | The reference exists. The observed NV/2018 data is not a verified2020 fiche |
| Chivite La Zorrera2015 | Mantalak180278; producer947 | A specific2015 option has axes4/3/0/3/4 | The exact vintage and sensory data exist in Winerim. The Library's279839/2019/null-sensory result is not the full source |

These are existing **generated Campos de IA**, not independently verified winemaker measurements. A future app response must retain that provenance. In particular, zero sweetness is a real stored value, not missing data. Neither admin URL is a public wine fiche; Mantalak IDs cannot be inserted into Library detail URLs.

Local browser evidence: `qa-artifacts/continuation97-20261020/master-catalogue/`. Selected-vintage screenshots and DOM observations are retained privately. The committed fixture projects only the wine data needed for regression, without browser identity, cookies, tokens or session material.

## App Access Boundary

The authenticated master administration is usable for diagnosis, not an application integration. Its observed AI editor reads `/admin/wine/{id}/ai-field/get` using an administrator session and has separate update/regenerate/propagate operations. None of those write operations was invoked. Administrator cookies must not be copied to Matchrim, embedded in a build or used as its backend credential.

The available middleware v2 contract lists a token's restaurant catalogue; it does not establish global master search, cross-namespace ID mapping or sensory provenance. It must not be invoked through its sync actions, which can mutate POS data. The installed GitHub repositories and targeted local clients did not identify the actual Symfony catalogue controller checkout. An obvious public documentation URL was inaccessible; no guessed endpoint grid was probed.

The remaining external dependency is the actual Symfony repository/read contract for `app.winerim.com`. The owner must provide or implement bounded read-only master search/detail by Mantalak ID with exact vintage, five numeric0-5 axes/nulls, generated-vs-source provenance, completeness/cursor and a real public fiche mapping when one exists. This request has been sent to the user; no new credentials or security grants were created.

## Regression and Release Gate

`node --import tsx scripts/check-matchrim-master-catalog97.ts` exercises the observed namespaces, literal identity admission,2015 versus2019/NV distinction, zero sweetness and50 deterministic synthetic-profile calculations. It does **not** turn an admin observation into a live app lookup, claim50 real users or certify taste prediction.

## Completed200-Image Local Diagnostic

All200 existing originals were decoded and SHA-verified, then processed sequentially with Apple Vision revision3 accurate OCR (Spanish/English/French, language correction, no supplied wine names). No original image, dataset, activation or paid ledger was changed. There were zero read/hash/OCR errors;198 images returned word text and2 returned none. Three multi-frame files used frame0 only.

| Text overlap with historical source metadata | First20 dataset images | All200 |
|---|---:|---:|
| Folded complete wine-name phrase |6|64|
| All distinct folded wine-name tokens |9|89|
| Folded complete winery phrase |7|96|
| Both complete folded phrases |3|38|

Median local per-image latency95.578ms; p95182.348ms. These figures are **OCR textual overlap**, not Matchrim/OpenAI identification accuracy, canonical precision/recall or affinity correctness. The first20 here are img001..020, not the paid pilot's selected20. Generic tokens can contribute overlap.

The diagnostic preserves1073 lines and2123 word boxes. A postprocessing check initially failed because one line and one word in img044 extend slightly beyond the image edge; raw coordinates and the failure are retained, with separate intersection-only display geometry. Apostrophe-subtoken comparison corrections are isolated in `ALL200-COMPARISON-r2.json` and `FIRST20-COMPARISON-r2.json`; original comparisons are retained. No OCR was repeated to obtain a better result.

Evidence: `qa-artifacts/continuation97-20261020/local-ocr-A/RESULT.md`, `REPORT.json`, `BOX-QA.json`, raw per-image receipts and `SHA256SUMS`. This is completed local analysis of200 originals, **not completed200-image end-to-end app QA**.

## Native Transparent-Image Defect Corrected

The existing PNG-to-JPEG preparation rendered transparent packshots onto black. A native-only `compositeOnWhite` option now fills white before drawing, quality sampling and JPEG encoding. The existing native limits object carries the option to label, wine-menu and food scanners. Default/empty/web options remain unchanged; restaurant workspace callers are not broadened by this patch.

Real Chromium controls on original img063 and img162 reproduce RGBA0/0/0/255 before and255/255/255/255 after, including region crops. Full web JPEG/quality results are byte-identical before/after for both originals; an opaque JPEG native control is also byte-identical. The actual image-preparation module processed all200 originals with identical dimensions,0 text-gate rejections before/after, and no new rejected inputs. This is input preparation, not a provider-recognition gain.

`scripts/check-matchrim-transparent-native97.mjs` preserves the before/after JPEGs and report under `qa-artifacts/continuation97-20261020/transparent-pixels97-r1/`. The extended lifecycle suite passes16 groups; the master-catalogue fixture suite passes5 groups/50 synthetic profiles. Typecheck and scoped lint pass. The first master-test launch had a syntax error in the new harness, corrected before its successful run; no product behavior or test oracle was changed to hide a failure.

The old97-r3 installed/archive packages do not contain this new patch and remain historical artifacts. New source preparation/build/visual validation is required; old paid prepared payloads remain on source-drift HOLD rather than being relabelled or silently reused.

The97 physical automation startup failure, paid200-image benchmark and full-catalogue application integration remain open. Keep TestFlight blocked until those actual gates are validated. Compilation alone is insufficient.
