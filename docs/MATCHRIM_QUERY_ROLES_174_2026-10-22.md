# Native catalogue recovery 174

Release gate: **NO-GO**. Continued from `56025d6`; production change
`db0039411e9e624e522b524478df1c25af948069`. No web publication, main update,
backend deployment, paid model start, image upload or TestFlight upload.

## Implemented

- Automatic recovery prioritizes short balanced literal cuvee/climat text and
  literal same-line producer-role text. It does not infer aliases or identities.
- Explicit same-line appellation and spatially supported award context no longer
  consume identity-query slots. The original production year-role parser and raw
  geometry are passed through both the actual component and benchmark.
- A partial generic word cannot displace its fully read form (`CHAMPA` alongside
  `CHAMPAGNE`). Unknown proper-name suffix noise cannot erase a complete name.
- Pure Primitivo is automatic-search metadata; full named wines and manual
  varietal searches remain supported. Long producer prose is not prioritized.
- An unclosed quoted cru/climat still vetoes an unrelated proposed reference.
  The new RAMONET query initially exposed a Monthélie Premier Cru neighbour for
  the retained116 Chassagne/Les Cailleress reading. That proposal is now rejected;
  the original RED/cache-only r15 remains preserved.
- Two-query/80-row-per-query/160-ranking bounds, independent detail verification,
  explicit confirmation and vintage/sensory authority remain unchanged. Original
  evidence is never replaced by preferred search substrings.

## Measured Results

Source: `qa-artifacts/night105-20261021/native112-corpus200-r16/REPORT.json`.
All200 retained actual simulator Vision receipts replayed through production
functions. Expected metadata is loaded only after prediction freeze. It is a
filename-derived proxy, not expert ground truth or fresh200 gallery E2E.

| Metric | r14 baseline | r16 |
| --- | ---: | ---: |
| Evaluable retrieval scenes | 151 | 160 |
| Incomplete retrieval scenes | 49 | 40 |
| Partial-only scenes | 28 | 19 |
| HTTP-unavailable scenes | 19 | 19 |
| Schema / mixed schema-partial | 1 / 1 | 1 / 1 |
| Abstentions | 7 | 7 |
| Lists with proposals | 40 | 44 |
| Top1 / top3 expected-name proxy | 32 / 34 | 36 / 38 |
| Lists without expected-name proxy | 6 | 6 |

No previously complete retrieval became incomplete. These160 are NOT160
identified wines. Nine formerly partial scenes completed their bounded searches:

| Scene | Retrieval result | Recognition result |
| --- | --- | --- |
| 021 | La Roture / Beauregard complete | La Roture proposed, proxy hit |
| 023 | PICARD / DAVENAY complete | No safe proposal |
| 055 | B. MARTIN complete; redundant fragment removed | B. Martin Brut Reserve proposed, proxy hit |
| 066 | LES GRANDES PLANTES / BEAUREGARD complete | No safe proposal |
| 116 | RAMONET / NET NOEL ET complete | Unrelated climat rejected; no safe proposal |
| 119 | Morgeot / RAMONET complete | No safe proposal |
| 134 | Grand Fossil / literal property text complete | Grand Fossil Sancerre proposed, proxy hit |
| 184 | LA CUVEE LUCIEN / Remara complete | Muscadet La Cuvee Lucien proposed, proxy hit |
| 188 | Magliola complete; pure varietal removed | No safe proposal |

Four additional compatible proposal lists, not nine automatic identifications.
All still require explicit selection and independent detail. Zero canonical
identities created by the benchmark; no affinity or human taste-accuracy claim.

430 verified cache reads, zero cache misses, source integrity verified.17 new
public catalogue GETs; existing500 receipts were not retried. `BOUTISSE`, a newly
read literal producer query, also returned500 with the same135-byte generic JSON
body as the older failing queries. Both old and new failures remain in evidence.
Exit1/NO-GO is intentional, not hidden by the reporting wrapper.

## Tests and Visual QA

- Query174:9 synthetic groups; query125:11 checks; hygiene121:6 groups;
  query137:7; query169:7. Raw immutability, manual preservation, ambiguous/distant
  award geometry, producer prose and missing cru closing quote covered.
- Actual TSX handler recovery104:18 groups; proposals104:14; harness112:28.
  Production/benchmark parity has negative mutants for missing vintage hint and
  missing geometry. Partial/error/schema retrieval still cannot score as complete.
- Global103:17 groups including50 synthetic profiles; master102:14 including50
  synthetic profiles and unconfigured master fail-closed. These are not100 people.
- Designation173:6 groups. Scope guards global103:5 groups/14 rejected mutations;
  master102:9/22. Protected CSS and search function byte-identical to `db6a181`.
- App TypeScript and focused lint pass. Candidate105-r9 from clean `db00394`
  passes native-only production bundling and iOS Simulator compilation/install.
  Fixtures=false, masterConfigured=false. No archive, signing/export or upload.
- `continuation174-20261022/visual-r2`: actual recovery component, retained Vision
  and hash-verified catalogue-response replay, all network intercepted. Four
  scenes021/116/184/106 at375/440px and375px/root32:12 captures, no page errors,
  horizontal overflow or undersized/out-of-bounds buttons; zero auto-confirmations.
  Source photos are real retained local images; catalogue thumbnails are explicit
  controlled placeholders, not fetched catalogue-image evidence. Normal021,
  large-text184 and error106 captures visually inspected. This is Chromium, NOT
  UIKit, a new native gallery run, complete VoiceOver or fresh live recognition.
- Visual r1 stopped before scenes because the reused guard required an unneeded
  simulator lease after it was released. Kept as FAIL. r2 uses the existing
  heavy/writer/disk guard appropriate for isolated Chromium; no guard removed.
- Existing native manual164-r8 remains historical evidence only, not silently
  promoted to a new native E2E pass. Build105-r9 alone does not approve release.

## Remaining Gates

`qa-artifacts/continuation174-20261022/ANALYSIS.json` preserves the exact40-case
matrix, transitions,22 hash-verified cached error-query receipts and malformed IDs.
The local review is `native112-review-corpus200-r16/REVIEW.html` and `REVIEW.csv`.

-19 partial-only scenes still require grounded disambiguation/refinement or a
  proven server-side producer/appellation filter. Do not simply lift the80 limit,
  guess spellings or discard the unresolved second query after a convenient hit.
-19 unavailable scenes need the Winerim backend exception for the exact public
  text/store/page requests. The accessible global route is already integrated;
  another OpenAI key or the Matchrim frontend repository does not fix its500.
- Invalid empty slugs362891 (193) and363580 (200) need source-record repair. No
  slug is guessed and valid neighbours do not turn the whole retrieval complete.
- No accessible full administrative/private Mantalak master/sensory-vintage
  contract is newly proven. The public global route is not the partial Library,
  but publication coverage and exact vintage sensory authority remain separate.
- New native gallery recognition/reselection/affinity QA and physical release
  validation remain required after remaining recognition changes; do not upload.

## Spend and Resource Boundaries

New paid calls0, uploads0, Lovable agent turns0, production writes0.
Instrumented CLI public-catalogue total360 ->377, plus one earlier public image.
Conservative free reservation345 ->380/400;20 capacity remains. The unused part of
the35-GET reservation is NOT reclaimed. Paid ceiling remains50 requests/EUR15.
Ordinary app background reads are not packet-instrumented; no network-zero native
claim. Simulator build uses only own cooperative lease, no physical iPhone or
other app/task is interrupted.
