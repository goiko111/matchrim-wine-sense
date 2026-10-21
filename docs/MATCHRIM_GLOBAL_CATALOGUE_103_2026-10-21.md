# Native global catalogue integration, 21 October 2026

## Scope and release boundary

Implemented on `codex/matchrim82-cloud-integration-20261013`, after `1ead749`.
The uploaded build100 remains immutable. This source prepares candidate101; it
has not been uploaded or installed on the user's phone. No web publication,
backend deployment, Lovable agent turn, new AI image upload or paid model start.

The observed public Matchrim store exposes approximately182,400 references
(182,399 in the preceding saved probe). This is the global **public** catalogue,
not proof that every administrative Mantalak master record is published there.
Public store IDs, Library IDs and administrative Mantalak IDs are different
namespaces; they are never converted by name or numeric coincidence.

## Implemented

- Native single/multiple-label enrichment searches the public global store before
  the existing strict Library fallback. Default web dispatch remains unchanged.
- Every link requires name/producer matching and an independent ID/slug detail
  GET. Incomplete pages, conflicting rows, visible omitted qualifiers and
  mismatching vintages cannot certify a wine. Broad name queries can be narrowed
  by the literal producer, without weakening the subsequent identity check.
- A winery prefix may be removed from the search substring, never from identity
  evidence. There is no invented Chivite/Chivite Family Estates alias.
- Exact affinity requires an explicit matching year, five valid0..5 sensory
  axes and the current palate profile. Two missing years are NOT an exact vintage
  binding. Zero-valued attributes are preserved.
- A verified public reference without a year has a separate style estimate,
  bottle photo, human-readable matches/frictions, source warning and original
  public fiche. This estimate is not written as the bottle's verified affinity.
- Native manual search now covers the public global catalogue, shows up to three
  proposals and independently verifies the user's selection. Selecting an NV
  record preserves the photographed year; choosing a different explicit year
  warns before confirmation. Selection is guarded against owner, profile, row
  and input changes; correction invalidates the old global evidence.
- Exact-vintage saves carry the public namespace, original URL, unknown sensory
  provenance, initial-affinity evidence and safe catalogue photo. No production
  account/wine mutations were needed for these tests.

## Actual source examples

| Input | Public source | Result |
| --- | --- | --- |
| Vidure2020, Pago de Cirsus | store364050, vintage null, sensory5/3/1/4/4 | Reference and separate style estimate; no2020 sensory certification |
| La Zorrera2015, Chivite | store336808, vintage null, sensory4/3/1/3/4 | Reference only; no transfer of NV sweetness1 to the2015 administrative sheet |
| La Zorrera, Chivite Family Estates | Public producer Chivite | Not auto-linked through an invented alias; explicit user selection is available |
| Synthetic exact2020 detail | Controlled transport fixture only | Exact-vintage affinity path tested; NOT claimed as a real2020 fiche |

The public API does not specify whether these attributes come from a tasting,
an original producer sheet or generation. The UI and saved metadata preserve
that uncertainty. Related recommendations, prices and unnormalised alcohol are
not identity or sensory authority.

## Validation

| Check | Result | Evidence |
| --- | --- | --- |
| Global transport, authority, cancellation, selected-ID and current scanner dispatch |17 groups pass;50 synthetic profiles | `scripts/check-matchrim-global103.ts`, `qa-artifacts/global103-20261021/UNIT17-FINAL.json` |
| New exact scope/inverse and mutation negatives |5 files;14 rejected mutants | `scripts/check-matchrim-global103-scope.mjs` |
| Previous opt-in master contract |14 groups pass, isolated synthetic transport | `scripts/check-matchrim-native-master102.ts` |
| Legacy catalogue bridge |13 groups;120 web-parity cases pass | `scripts/check-matchrim-native-catalog-bridge97.ts` |
| Label presentation regression |20 groups pass | `scripts/check-matchrim-label-answer97.ts` |
| Candidate101 isolated assets/typecheck before final producer guard |PASS; source/resource fingerprints | `qa-artifacts/global103-20261021/candidate101-r3/preparation.json` |
| Current native-branch responsive UI, exact/NV/manual flows |8 captures pass, no console/page errors, photo decoded | `qa-artifacts/global103-20261021/visual-r5/report.json` |

Visual viewports:393x852 and320x568, plus200% root text. Footer remains reachable
and controls retain44px minimums. Final capture uses desktop Chromium responsive
viewports with the actual native Capacitor CSS branch and touch. It is **not**
UIKit, VoiceOver or an iPhone approval. Mobile-emulation capturesr3 showed a
Chromium fixed-layer screenshot artefact at200%; r4 captured browser chrome.
Neither is the final visual evidence. R5 removes that capture artefact without
changing product CSS. Prior native100 XCTest remains evidence for100, not101.

## The200-image exercise

The benchmark uses the200 preserved Apple Vision OCR receipts, no custom GT
words, no fresh detector/model calls and no administrative ID lookup. Up to two
queries per image are selected from visible OCR prominence. Ground-truth names
are loaded only after retrieval, for evaluation. Public GET receipts are bounded,
sequential, cached and saved with hashes. Candidate proposals, catalogue
availability, exact vintage binding and affinity are separate outputs.

The acquisition `ocr200-r1` started before the missing-year binding fix. Its raw
GET receipts are immutable; its early `exact` classifications are not final.
Final evaluation must replay those receipts through the corrected reader, with
only standalone/explicit vintage OCR lines eligible as years (not bottle counts).
Missing cached requests remain unavailable, rather than being invented.

### Completed200 results

-200 scenes exercised;198 nonempty preserved OCR receipts,2 empty.
-388 saved public GET receipts, no image uploads, paid starts or production
  writes. Subsequent replays use cached bodies only, never a new provider call.
-69/200 expected references appear within the pages retrieved by OCR-derived
  queries. This is positive availability evidence, not proof that the other131
  are absent from the full catalogue.
-Corrected replayr2:15 automatic proposals,14 compatible with expected metadata,
  one disputed producer association; only1 explicit exact-year binding,14 NV
  references. Missing-year equality no longer creates an exact affinity.
-Final replayr4 adds independent winery-evidence admission:13 compatible
  proposals/13 returned (observed metadata precision13/13, recall13/200=6.5%).
  Of those,1 has an explicit matching year,12 are style references. The other187
  remain unresolved:185 no strict link,1 ambiguous,1 missing cached narrowed
  lookup. No extra network call was made to fill that missing receipt.
-The one exact-year case is `img-092`, Marie Josephine Passito2024, public376398.
  Its affinity54/100 uses a synthetic test profile, not the user's tastes.
-The disputed `img-177` photo visibly says Foral de Melgaco Old Vines Alvarinho,
  whereas its supplied metadata says Foral Alvarinho/Quinta do Regueiro.
  `img-180` shows the same brand/cuvee with the different expected producer
  Foral de Melgaco. This is an unresolved source/label discrepancy, NOT a proven
  OCR hallucination or permission to silently rewrite the truth set.
-Both brand-only producer cases are now held for explicit selection. The gate
  does not blacklist a wine or use GT IDs: if a proposed producer is embedded in
  the cuvee, it needs a separate full fragment or an explicit winery role across
  adjacent OCR lines. Finca/Domaine split-line positives remain eligible.

This intentionally loses the previously compatible `img-180` automatic proposal
alongside the disputed177; the before/after is retained rather than hiding that
recall cost. No claim of100% product accuracy follows from the13 returned cases.
The low automatic recall is a failed broad-recognition gate, not a passed E2E.
This exercise is NOT a new paid vision run or200 expert-confirmed identities.

Final evidence:

- `qa-artifacts/global103-20261021/ocr200-r1/REPORT.json`: acquisition,22-minute
  observed wall time and raw hashed replies; its pre-fix classifications are not final.
- `qa-artifacts/global103-20261021/ocr200-current-replay-r2/REPORT.json`: before
  producer admission,15 proposals and one metadata disagreement.
- `qa-artifacts/global103-20261021/ocr200-current-replay-r4/REPORT.json`: final
  corrected reader, no network, expected/actual per image and13 compatible proposals.
- `qa-artifacts/global103-20261021/COVERAGE-200.json`:69 positive catalogue
  availability cases, evaluated after retrieval, administrative/public IDs separate.

## Remaining release gates

The public global reader is implemented, not the speculative authenticated
`/api/v1/matchrim/catalogue` contract. Administrative-only/unpublished rows and
year-specific sensory sheets still require an application-safe source contract;
admin session cookies will never be embedded in Matchrim. A new provider vision
benchmark remains subject to the existing50-start/15EUR cap and unreconciled
reservations. No budget expansion or TestFlight upload is implicit here.

The final producer-admission patch passed the current17-group runtime suite and
the reviewed scope check. Its fresh full typecheck/bundle/native build has not
run: `heavy-local` is held by another authorised task (BUSY receipt21 October
17:00UTC; no lease stolen or process interrupted). Candidate101-r3 and visualr5
validate the preceding compiled presentation, not a binary containing this final
guard. Final release remains NO_GO until that rebuild/regression window and the
recognition/data gates above close. No new TestFlight has been uploaded.
