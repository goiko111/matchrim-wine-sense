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

## Final Native Candidate and Regression, 17:15 UTC

Product source is `ccf87ec8cbe88c3e54393a08afda44942909b804`; the subsequent QA-only HEAD `13216e52f7697905606360e2e9c7de429f144457` preserves its product fingerprints. New candidate `candidate97-r10` supersedes the earlier installed r3 package for local validation only. It contains157 production resources, fixture mode false and no development server URL. The Release archive is signed and its packaged resources are byte-verified. It has **not** been exported or uploaded to Apple, and the phone has not received this r10 package.

| Check on current product | Actual | Scope / remaining limit |
|---|---|---|
| Final regression matrix |12/12 command gates PASS | Image lifecycle, observed master contract, typecheck, lint, closure96, consumer95, cloud, backend95, identity94, release93, restaurant91, scene90 |
| ESLint |0 errors;129 inherited warnings across593 files | Not warning-free |
| Production build |PASS |157 resources; isolated local output, no web Publish |
| iOS simulator build |PASS | Isolated QA bundle, not the production phone installation |
| Signed Release archive |1.0(97), PASS | No distribution export, upload or TestFlight availability claim |
| Current gallery replay |11/11 cases,381 assertions PASS | Actual production client, synthetic recognition/profile replies and cached original public fiches;0 external requests forwarded |
| UIKit maximum Dynamic Type |PASS after corrections | Actual simulator keyboard present and entire focused input visible through portrait/landscape/portrait; field value retained |
| Anonymous native navigation |PASS | Home, label entry, scan hub, privacy and auth; no account submission or analysis |
| iOS automated accessibility audit |Four audit types PASS on four screens | Contrast, descriptions, clipped text and traits; not VoiceOver use or an unfiltered hit-region pass |
| Public master integration |BLOCKED | Administrative observation is not a safe app API |
|200-label live recognition |NOT RUN | Local OCR/preparation is not model or canonical E2E validation |

Failures remain in their original output directories. The first regression attempts caught over-broad Auth/CSS freeze changes; the product fix was localized to native Auth hooks and `src/index.css` restored byte-exact to `db6a181`. Both protected Auth loops now use bounded whole-file inverse checks rather than dropping old hash assertions. `supabase/functions/search-wines/index.ts` also remains byte-identical to the baseline.

### Additional Defects Actually Reproduced and Corrected

- At native maximum Dynamic Type, login tabs overlapped. Native tabs now stack without changing the web branch.
- With the keyboard open, rotating could leave the focused Auth input above the visible WebView. A bounded iOS-only viewport correction keeps that existing input visible without changing focus, reading values or opening/closing the keyboard. Unrelated fields and Android behavior are unchanged.
- Following the actual scanner privacy link placed the policy's back link under the status area. The native policy layout now respects safe areas and bottom navigation, preserving the entire original web/legal tree.

The initial privacy-link accessibility hypothesis was **not** accepted as a fix: changing inline-flex did not improve Apple's18-point text-glyph AX bounds and was reverted. The actual padded touch area opens the policy when tapped outside those glyph bounds. The unfiltered audit's inert-paragraph hit-region finding and the narrower control-geometry checks are retained separately, not silently reported as a complete hit-region pass. Earlier `app.screenshot()` landscape captures clipped incorrectly; final settled UIKit evidence uses `XCUIScreen.main.screenshot()` plus keyboard/input geometry assertions.

The simulator's original text size was restored to `large`; no other simulator or personal account was reset.

### Current Evidence

Root: `/Users/GOIKO/2matchrim76-recognition-20261008/qa-artifacts/continuation97-20261020`.

- `final-matrix97-r5/report.json`:12 final exit codes, timestamps and output hashes. Earlier failing matrices are preserved.
- `gallery97-production-r9/report.json`: current11-case/381-assertion client replay and screenshots, explicitly controlled recognition rather than provider accuracy.
- `native-max97-r9/PROCESS-RESULT.json`, `result.xcresult`, `attachments-all/`: actual maximum-text keyboard/orientation test. Committed reproduction source: `scripts/native-matchrim97-max-auth-tests.swift`.
- `native-audit97-r6/PROCESS-RESULT.json`, `result.xcresult`, `attachments-all/`: actual anonymous navigation/accessibility and policy safe-area assertions. Reproduction source: `scripts/native-matchrim97-accessibility-tests.swift`.
- `simulator97-r2/screens/`: preserved before images for overlapping tabs, hidden email and policy back link under the status area.
- `candidate97-r10/preparation.json`, `ARCHIVE97-RELEASE-RESULT.json`, `Matchrim97-release.xcarchive`: frozen local production build, signed1.0(97),157 verified packaged resources; not a distribution receipt.

## Paid Pilot: New Pixels Prepared, No New Dispatch

The existing selected20 originals have a new, separate current-source native preparation under `pilot-current-preparation-C/generation-r1/reviewed-r3/`. Parent verified all20 actual JPEG/payload hashes and correspondence to the all200 native preparation. Input names/expected identities were not supplied to rendering. Historical black-matte payloads, source bindings, ledgers and failed preparation attempts remain unchanged; the old executable adapter stays on source-drift HOLD.

This continuation started **zero paid model calls**. Existing authority remains20 pilot labels,50 starts and15EUR, with10 reconciled API starts plus24 unknown SDK slots conservatively reserved:34 committed starts /10.20EUR provisional reservation, not invoiced spend. A new20-image preparation is not a larger-budget grant or proof that the earlier SDK client is quiescent. A renewed safe executor requires positively established old-client quiescence and new payload binding. The requested cumulative500-start/150EUR expansion has not been answered; it is not assumed. Neither that expansion nor extra model calls would supply the missing full-master API.

## Real QA Account Boundary

The existing confirmed `info@winerim.com` account was authenticated once at17:07 UTC; identity matched the previously created QA account and its quiz. No new user was created, no personal user's ratings were touched, and no model/vision call was made by authentication. Credentials and full sessions remain mode0600 local private files, excluded from repository and report.

The normal catalogue-only Bodega test is currently gated: a fresh read of deployed `search-wines-v75` is denied by the Supabase management connection. Historical release93 proves a deployed catalogue-only parser/handler, but its handler hash is different from the current local source; that is not falsely attested as a matching current deployment. A separately bounded manual-recovery test can block all Edge requests, independently verify original public Library details, and exercise actual UI additions/ratings on this QA owner only. Its outcome must be recorded separately before claiming account evolution.

## Remaining Release Decisions

1. Supply the actual Winerim Symfony master read contract/repository. Preserve Mantalak versus Library namespaces, exact vintage,0 values, generated/source provenance and bounded completeness. Do not embed admin cookies or copy two observed records as a substitute for the full catalogue.
2. Close paid execution authority/instrumentation and run the requested real image benchmark; report canonical identity precision/recall separately from OCR text overlap. Existing20-label authority is not approval for200 paid labels.
3. Complete current-build physical navigation, consent, camera/gallery, network recovery and VoiceOver checks in a fresh exclusive phone window. Earlier expired availability and two automation-mode startup failures are not current phone approval.
4. Only after these gates pass, export/distribute the validated97 build and verify processing/availability in TestFlight. No web Publish is part of this work.

## Actual QA Account Evolution, 17:34 UTC

The bounded manual-recovery exercise is now complete against the real QA account and real production `user_wines` rows. Original Library fiches were freshly read and checked; all Edge requests were blocked, not fake-fulfilled. The client ran its native branch in isolated Chromium, not UIKit. The normal catalogue search and image recognition remain explicitly unvalidated by this test.

| Wine | Initial | After synthetic Flor `love` | After synthetic Gitana `not_for_me` |
|---|---:|---:|---:|
| Flor de Muga Blanco2022 / original279035 |68|76|71|
| Manzanilla La Gitana NV / original278688 |72|75|71|

The actual source-derived active profile changed from `[1,4,2,1,3]` to `[1.4,4,2,1.1,3.3]`. Both original saved scores remained68/72 and their initial-history objects were unchanged after ratings. Both wines still have quantity1/status collection; the quiz row/axes are unchanged. No profile-table update, consumption/stock decrement, model call, personal-user rating or duplicate insertion occurred. These are deliberate **synthetic QA ratings**, not genuine tasting opinions or validation of predictive taste accuracy. The entries remain available in `info@winerim.com` with explicit synthetic notes.

Two instrumentation defects were preserved and repaired before this result: a foreign-VM array prototype failed strict expected-body equality despite identical JSON; then the transport rejected PostgREST's valid `application/vnd.pgrst.object+json` response. The latter attempt did create the first wine. An independent owner-only read verified it, and a separate exact-state resume used the existing row rather than inserting it again. Combined actual writes:2 inserts,2 verified sensory/initial-affinity enrichments and2 synthetic ratings,6 total. Earlier attempts/locks were not deleted or reset.

Evidence: `live-account-parent/READBACK-AFTER-MANUAL-r2.json`, `SINGLE-JSON-READBACK-r2.json`, `MANUAL-ROUNDTRIP-PROVENANCE-r2.json`, `MANUAL-RESUME-PROVENANCE-r3.json`; final `live-account-D/attempt-manual-resume-r3/125-final.json`, expected/actual profile records, all mutation readbacks, ARIA and screenshots. The successful resume performed82 bounded reads/writes,12 public fiche GETs and5 additional mutations after the independently verified first insert. Session material is excluded from these reports.

### New Consumer UX Finding

The actual screenshot shows a rejected wine still leading with71/100, the same final coarse style score as a loved wine. The formula did respond to feedback, but making that score the primary message contradicts the user's known experience. A native-only presentation correction now prioritizes the saved rating ("Ya sabes que no te gusta", "Ya sabes que te gusta", or "Te parecio correcto") and keeps the unchanged numerical calculation/history behind an initially closed "Ver afinidad por estilo" disclosure. It explicitly distinguishes style comparison from the user's own tasting. No taste probabilities, stored scores, training weights or recommendation-backend exclusions are invented. Unrated wines retain their previous view.

`scripts/check-matchrim-cellar-rating97.mjs` exercises the actual TSX with controlled score input:10 groups, including closed disclosures, unrated/unknown ratings, missing sensory scores and native-only call-site confinement. Product regression, new build and visual evidence for this presentation change must be recorded separately; the r10 evidence above predates it.
