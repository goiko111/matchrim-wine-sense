# Matchrim decisions log

## 2026-11-10: 136 extreme QA, E2E battery, dislike-only learning

QA moved from flaky simulator taps to driving the WebView through the WebKit inspector with an
in-app fake backend, so every journey is repeatable and the web bundle can be retested in 30 s.
Dislike-only evidence no longer drives the v4 fit beyond three votes' worth and reports at most
40% confidence (simulation on 6283 real wines). An explicit insert rejection commits nothing, so
the batch continues past it; uncertain outcomes still stop. Legal links in registration open an
in-app sheet on iOS; the web keeps target=_blank. Own photos stay on device after sign-out
(deleting them would lose the only copy); left to the owner.

## 2026-11-09: 134/135 afternoon audit fixes

Five read-only audits plus a full check sweep found no regression but ~45 user-facing defects;
the verified ones were fixed natively (web paths unchanged or behaviour-identical). A full-page
spinner on every cellar reload was replaced by keeping the list mounted after the first load of a
section. Quiz halves now round down so even answers read medium. The learner pushes away from the
scale centre when a non-love rating sits exactly on the profile. Duplicate-bottle vintage merging was
left alone because cellar evidence signatures bind the vintage. window.confirm is replaced on iOS by
a native Spanish alert because Capacitor hard-codes English buttons. Historical byte-freeze checks
that fail on these intended edits are superseded by tarde134/batch135, not edited.

## 2026-11-09: 132 learner v4, relative quiz, unread-word ranking

A 6283-wine simulation showed the shipped v3 learner losing accuracy after ~20
ratings while its confidence rose; v4 fits the profile to the distance each
rating implies and keeps improving. The quiz read general food liking as wine
sweetness and power; native now reads each axis relative to the person's own
liking (web unchanged, integers as stored). Ranking subtracts a quarter of the
weight of identity words not read. All measured offline; no account created.

## 2026-11-08: 131 reads small labels twice; branch pushed

With the owner's OK to all: the native reading adds a second pass on an
enlarged crop only when the text found is small (<10% of the photo); measured
gains on low-light/table versions with the original unchanged. Six candidates
replace three when the first three share a producer. iOS 15 minimum. 131
uploaded; the working branch was pushed (main untouched). A test account was
not created: account creation is not allowed; the owner tests from his profile.


## 2026-10-29: build 130 uploaded for internal pilots

The owner replied "Sí, sube la 130" after the measurement and its unverified
parts were listed. Export and upload ran once from archive130-r1 (c6c084a);
Apple acknowledged. Processing and installability are separate facts.

## 2026-10-29: 130 for pilots ships the measured flow unchanged

The live carta measurement found no ranking defect worth changing: when the
name is read the right wine comes first and the single proposal never named
another wine. Failures are stylised-label reads, producer-only reads and
duplicated catalogue rows. 130 therefore adds only the pilot feedback mailto
(the app sends nothing itself) to 129. Feedback goes to hola@winerim.com unless
the owner chooses another address.

## 2026-10-29: build 129 uploaded as a private beta

The owner replied "Sí, sube la 129" after the nine known limitations were listed.
Export and upload ran once from archive129-r2 (3456e6c); Apple acknowledged the
upload. Processing and installability are separate, unconfirmed facts.

## 2026-10-28: unidentified labels become one-tap candidates; 129 supersedes 128

The strict 104 proposals required every distinctive word read exactly, which a
phone OCR rarely gives (38-45% top-1 on closed catalogues). Candidates286 ranks
the rows the public search returns by how much of each identity was read
(rare words weigh more, one/two-letter misreads and merged words tolerated) and
demotes, never hides, rows that contradict visible colour, appellation or
qualifier. A tap is always required: with real catalogue distractors the
single-proposal precision is 95%, not 99%, so no automatic confirmation. A pick
goes to the Winerim master reference first (0-5 taste values for that harvest),
else the verified public sheet. OCR crops under 1200 px are enlarged 2x with
Lanczos. Build 128 is never uploaded; 129 contains all of 128 plus this and the
accented quality notices, and is uploaded only with the owner's explicit
limited-beta authorization. The full-catalogue query plan (phase 3, 200-400
public searches) and real iPhone photos remain unmeasured.

Native QA of 129 changed two things. A master reference that scores now stays
visible beneath the affinity (harvest of the taste values, original sheet), as
the public reference already did (60243c2). The planned MAX header change is
reverted (3456e6c): nativeLabelSheet102.css bounds that header on purpose so
enlarged form controls keep room, and lifting only its clip painted the title
over the content. The second title line at MAX still scrolls inside the header.

## 2026-10-15: QA89 Fixes Require Evidence, Not Synthetic Approval

User asks to resolve pending points. Implement bounded per-region continuation,
strict complete-provider JSON, separate technical failures, bounded real food
crops and identity-bound original public Library reads in isolated staging.
Keep production/public web and uploaded85 intact. Central crop on wide food
photos solves a demonstrated clipped-panel case, not general learned layout.
Never sum overlapping model counts or promote missing identities/sensory data.
Keep historical metrics/data unchanged; freeze one profile per blind ranking and
require independent consented outcomes for human taste claims. Use full-screen
native captures after proving app-only landscape capture is corrupt in this
XCTest environment. See QA89 report for exact accepted and residual evidence.

## 2026-10-15: latest instruction postpones phone and release; QA87 preserves failures

Continue simulator/browser QA using existing50 isolated technical staging accounts,
not the owner's phone and not another50 human testers. Preserve source/evidence;
the QA delta does not authorize a production change or TestFlight upload. Actual
UI/readback produced31visible-profile/score discrepancies and138missing-data
disclosures; retain them as release failures, not redefine the oracle to get green.
Only a subsequent bounded correction should change the native presentation.

Real single-image simulator execution, historical response replay, independent
visible-score arithmetic and human taste outcomes are separate evidence classes.
The native canary is1uncertain region/0confirmed, not recognition approval. The
old staging alias blocker is not reasserted as a fresh failed network probe:
unversioned staging vision is not equivalent to productionv72 without evidence.

## 2026-10-15: QA86 is an audit, not a release or remediation authorization

Use the connected physical iPhone and installed82 as found. Recover the independent
UI runner only, never substitute local84/QA85 or reset the owner's app/session.
Read a redacted account/profile/cellar baseline before data actions. Existing QA
profiles are preferred; changing an owner login or editing original values needs
an explicit restoration/scope agreement. No remote SQL/API writes, catalog edits,
communications, purchases, account deletion or new budget.

Record61 bounded route/state cases as PASS/FAIL/BLOCKED/NOT_RUN. Physical UI,
backend results, controlled fixtures and human taste quality remain distinct.
An ordinary app canary precedes new scans; a credit/auth/provider block stops
that branch without loops or quota reset. Preserve all QA85 recognitionP1 issues.
No source-product fix, deployment, TestFlight upload or public push is implied.

## 2026-09-28: build 63 remains the rollback point

The pre-change commit `66c01a5` is tagged `matchrim-build63-baseline-20260928`. Build 64 is isolated on `codex/matchrim-learning-airim-qa-20260928`.

## 2026-09-28: app navigation replaces a web-style top menu

The persistent mobile information architecture is Inicio, aiRIM, Escanear, Bodega and Perfil. Escaneo remains the primary central action, while Inicio is the personalized decision dashboard.

## 2026-09-28: aiRIM must reveal memory and uncertainty

aiRIM shows whether it has no memory, only a base profile, or a profile reinforced by explicit ratings. Contextual questions are prefilled but never sent automatically. Missing evidence is stated instead of invented.

## 2026-09-28: learning uses explicit, user-owned evidence

Only the authenticated user's quiz profile and saved ratings influence the learned profile. Synthetic personas validate the transformation without creating production accounts or contaminating real data.

## 2026-09-28: distribution required an explicit gate

Local installation was allowed for QA while App Store and TestFlight remained blocked. The user subsequently authorized completion with `Hazlo`; the signed build and real aiRIM audit were green before upload. Supabase functions remain unchanged while management access returns 403.

## 2026-09-28: recommendation confidence must be qualitative unless calculated

The real aiRIM persona audit exposed invented recommendation-confidence percentages. Build 64 adds shared evidence guardrails: qualitative recommendation confidence with reasons, explicit data/inference/preference separation, no unsupported price or availability claims, and a named missing-data effect. The calculated learning-confidence percentage remains visible because it comes from the deterministic profile learner.

## 2026-09-28: build 64 distribution authorized

After the user authorized completion, the final grounded archive was signed and uploaded to App Store Connect. The web and Supabase functions were not deployed. `Upload succeeded` is recorded separately from Apple's later processing and tester availability.

## 2026-09-28: recognition evidence separated from UI fixtures

The canonical matrix now reports real-backend precision/recall separately from the
27/27 controlled UI suite. A real CC0 food-menu photograph was annotated and sent to
the deployed `scan-food-pairing` runtime without authentication or production writes.
It grounded all eight result cards but covered only 13/54 visible dish names and merged
six desserts, so food-menu recognition is not certified. Single-label and multi-label
independent metrics also remain below the 0.90 precision gate. No backend deploy or
build 65 is justified until those defects are corrected and rerun in staging.

## 2026-09-28: saved recommendations never recycle silently

If every returned recommendation is already in Bodega, Inicio shows an exhausted state and links to Bodega instead of reintroducing saved wines. Identity requires the same normalized name, rejects conflicting producers and rejects conflicting vintages when both are known. Missing producer or vintage remains a conservative wildcard; one explicitly different vintage stays eligible.

## 2026-09-28: personalization state belongs to one active account

Recommendation calculation waits until loaded saved-wine state identifies the current user, or the explicit anonymous scope. A session transition cannot calculate against the previous account's cellar. Reproducible QA uses synthetic in-memory personas and intercepted responses only; authenticated staging, TestFlight processing and physical-camera validation stay separate external gates.

## 2026-09-29: integral QA precedes further distribution

No new TestFlight build is used as evidence of product correctness. The release gate now requires route/state coverage, ten authenticated longitudinal personas, real recognition thresholds, physical camera/accessibility evidence and authorized staging load. Local fixtures, real backend calls and physical tests are reported separately.

## 2026-09-29: build 64 is pinned to source commit 1a54cda

A clean detached rebuild of `1a54cda` matches every Vite file in the signed build 64 archive; Capacitor adds only `cordova.js` and `cordova_plugins.js`. The comparable tree hash is `d6b9e4a5bcbc3b6f566fa50fa45c4f35c6f4fc06c742cebc0718d0ca9e027b`. Later QA and personalization commits are not represented in TestFlight.

## 2026-09-29: synthetic scale claims stay narrow

The 1,000-user local cohort proves only deterministic in-process model isolation and speed. It is not backend concurrency, cost evidence or human validation. No mass production load or synthetic account creation is permitted without an isolated tenant, owned identities and explicit rate/cost approval.

## 2026-09-29: confidence is evidence quality, not a row counter

Learning confidence combines sample coverage, directional consistency and sensory diversity. Timestamps weight preference deltas toward recent explicit ratings. Repeated or contradictory rows cannot produce 100% confidence, and aiRIM receives the contradiction state so it can explain instability.

## 2026-09-29: Bodega uniqueness must not destroy history

The prepared canonical-identity migration enforces exact normalized name, producer and vintage per user, while the client can reconcile a temporarily unknown producer. Migration preflight aborts on existing duplicates rather than guessing how to merge notes, ratings, status or quantity. It remains unapplied until isolated staging exists.

## 2026-09-29: local replay cannot certify a backend fix

Food-menu row splitting and detection-box normalization may be replayed deterministically against recorded real responses. They are reported as local post-processing only. Recognition is certified only after candidate functions run on independent images in authorized staging and every category clears `0.90` precision and recall.

- 2026-11-10: Build 136 (620a2a3, archive136-r4) uploaded to TestFlight after the owner replied "Sí, sube la 136"; HUMAN-AUTHORIZATION quotes it. Private beta only; known limitations listed there.

- 2026-11-10: 137 usability pass on the owner's request ("ponte en la piel de los usuarios… las puedes modificar y luego me dices"). Changed presentation and flow only; registration length, search-to-sheet, tab name and verdict wording left as owner decisions. The native gate probe follows the renamed controls.

- 2026-11-11: Build 137 uploaded after the owner replied "sube la 137 y todo esto lo hacemos"; the same message approved the eight proposals of the 137 report, built as 138. Store sensory vectors (kept null in nativeGlobalCatalogue103 since clarification184) are now used only as a labelled estimate in the search sheet and in restaurant pairings, after discarding filler-like vectors (611 sampled store rows on 2026-11-11: none flat, zeros only as tannin of non-red wines); the scanner, verified sheets and profile learning are unchanged. The scanner notice keeps naming OpenAI in its short form (App Store 5.1.2).

- 2026-11-11: Build 138 (d06d66f, archive138-r1) uploaded to TestFlight after the owner replied "Sí, sube la 138"; HUMAN-AUTHORIZATION quotes it. Private beta only; known limitations listed there.

- 2026-11-11: After testing 138 on his iPhone the owner said "si, hazlo todo" to the 139 plan (list verdicts from the store, auto-link of clear labels, store search, recents, notes, aiRIM visibility, waiting facts, cleanup) and to preparing backend changes for review. The prudence rule «never link an identity without a tap» is relaxed only for a label whose read text contains both the wine name and the winery of exactly one candidate. Store-based verdicts stay labelled estimates and out of profile learning. Backend changes are patches under docs/backend-proposals/, not applied.

- 2026-11-11: Build 139 (1a49a28, archive139-r2) uploaded to TestFlight after the owner replied "Sí, sube la 139"; HUMAN-AUTHORIZATION quotes it. Private beta only; known limitations listed there.

- 2026-11-11: After trying 139 the owner said the Winerim sheet must not open outside the app ("eso no puede ser") and asked for any improvement that fits the app's purpose. 140 removes every iOS control that leaves for web.winerim.com (check-matchrim-original-library89-ui now asserts the absence), uses the list price to name the likely wine of a winery, and stops discarding «3, 3, 1, 3, 3» store vectors as filler.

- 2026-11-11: Build 140 (c6c8b39, archive140-r1) uploaded to TestFlight after the owner replied "Sí, sube la 140"; HUMAN-AUTHORIZATION quotes it. Private beta only; known limitations listed there.

- 2026-11-11: After 140 the owner asked for Winerim's real sheet framed inside the app (not a text summary), several photos per wine list, and found the 140 vintage fix wrong on the device (1927). 141 frames web.winerim.com in a sandboxed iframe (scripts, same-origin, forms; no popups or top navigation), saves a searched wine directly as «Por probar» without sensory data, and never takes an unmarked year older than forty years as a scanned bottle's vintage.

- 2026-11-11: Build 141 (62dfa8f, archive141-r1) uploaded to TestFlight after the owner replied "Sí, sube la 141"; HUMAN-AUTHORIZATION quotes it. The first upload attempt stopped before exporting because the authorization file carried a mistyped commit hash; corrected and rerun. Private beta only.

- 2026-11-11: Owner: take Vivino's interface language (not its content), build the wine sheet from Winerim's own data, let a searched wine be saved as tasted or at home, and do not frame Winerim's web (it leads to the whole store). He authorised driving his iPhone with a test runner to look at Vivino ("De meter un runner a mi iPhone y conectarte"); only viewing and scrolling were done. 142 is the first delivery ("Sí, constrúyela").

- 2026-11-11: Build 142 (c0116df, archive142-r1) uploaded to TestFlight. The owner's reply was the single word "Si" to «¿La subo ahora?»; HUMAN-AUTHORIZATION quotes it with the question, and distribute-matchrim142 accepts a short reply only in that form. He then asked for the second delivery of the redesign ("Y luego haz la segunda entrega").

- 2026-11-11: Build 143 (c67c53e, archive143-r1) uploaded to TestFlight after the owner answered "Si" to «¿Subo la 143 a TestFlight?»; HUMAN-AUTHORIZATION quotes the word with the question. Private beta only; known limitations listed there (on-device list OCR unseen on a real phone).

- 2026-11-12: 144 keeps both affinity formulas as they are. The owner's recording showed the same white at ≈74 (scan, catalogue comparison, tannin 0 counted) and 82 (sheet opened from Home, store estimate, tannin 0 left out since 139). Applying the store rule inside buildConsumerAffinity was tried and withdrawn: earlier oracles protect the original zero in the catalogue comparison (consumer95-*, presentation206 formulaChanged:false). Instead the sheet Home opens for a scanned wine uses the scan's comparison (catalogueRule). Full unification is the owner's decision.
- 2026-11-12: Build 144 (d8ac905, archive144-r3) uploaded to TestFlight after the owner answered «Sí, sube la 144» to «¿Subo la 144 a TestFlight?»; HUMAN-AUTHORIZATION quotes the words. Private beta only; known limitations listed there.
- 2026-11-12: Owner set the Matchrim goal («si construyela y hacemos todo esto tambien … pontelo como un goal») and with it decided that a tannin of 0 is not compared anywhere (whites, rosés, sparkling). Implemented in 145 as a display rule in buildConsumerAffinity (saved scores and the affinity formula untouched); oracles consumer95-*, presentation206, first20-283 and the native probe (≈85→≈93) updated to it. Branch pushed to origin (not main) at his request.
- 2026-11-12: Build 145 (1307231, archive145-r1) uploaded to TestFlight after the owner answered «Sí, sube la 145» to «¿Subo la 145 a TestFlight?»; HUMAN-AUTHORIZATION quotes the words. Private beta only.
- 2026-11-12: Build 146 (827c5f3, archive146-r1) uploaded to TestFlight after the owner answered «Sí, sube la 146» to «¿Subo la 146 a TestFlight?»; HUMAN-AUTHORIZATION quotes the words. Private beta only.
- 2026-11-12: Owner approved the wine facts («curiosidades estan biien, mete muchas mas») and that a wine can be tasted and at home at once; asked the Winerim request to go by AgentMail (not available to this session; prepared for Codex).
- 2026-11-12: Build 147 (78361cd, archive147-r1) uploaded to TestFlight after the owner answered «Sí, sube la 147» to «¿Subo la 147 a TestFlight?»; HUMAN-AUTHORIZATION quotes the words. Private beta only.
- 2026-11-12: Build 148 (a0f4a30, archive148-r1) uploaded to TestFlight after the owner answered «Sí, sube la 148» to «¿Subo la 148 a TestFlight? Sí o aún no.»; HUMAN-AUTHORIZATION quotes the words. Private beta only.
- 2026-11-12: Owner chose «B, ilustraciones» for the taste test images (flat illustrations drawn in the app, over uniform photos or no images). Built in 149, iOS only.
- 2026-11-12: Build 149 (19f7d1d, archive149-r1) uploaded to TestFlight after the owner answered «Sí, sube la 149» to «¿Subo la 149 a TestFlight?»; HUMAN-AUTHORIZATION quotes the words. Private beta only.
- 2026-11-12: 150 gives the iOS screens visual layers after a tester said everything looked at the same level; score tags use the verdict cuts (80/65/45). A label read poorly upright is read turned; a normal photo is still read once.
- 2026-11-12: Build 150 uploaded to TestFlight with the owner's explicit yes.
- 2026-11-13: 151 keeps the three ratings the database accepts. The intermediate «Me gusta» asked by a tester needs a server change (check constraint and learning weights) and waits for the owner's decision; it is not emulated in the app.
- 2026-11-13: Build 151 (9970439, archive151-r1) uploaded to TestFlight after the owner answered «Sí, sube la 151» to «¿Subo la 151 a TestFlight?»; HUMAN-AUTHORIZATION quotes the words. Private beta only. Owner: «deja anotado todo lo pendiente para mas adelante»; list in docs/MATCHRIM_PENDIENTES_2026-11-13.md.
- 2026-11-13: «Pegar foto» reads the system pasteboard from native code (152). The web clipboard API inside the app returned nothing on the phone; it stays only as a fallback for shells without the method.
- 2026-11-13: Build 152 (15e920f, archive152-r1) uploaded to TestFlight after the owner answered «Sí, sube la 152» to «¿Subo la 152 a TestFlight?»; HUMAN-AUTHORIZATION quotes the words. Private beta only.
- 2026-11-14: Build 153 (5efafbd, archive153-r1) uploaded to TestFlight after the owner answered «Sí, sube la 153» to «¿Subo la 153 a TestFlight?»; HUMAN-AUTHORIZATION quotes the words. Private beta only.
