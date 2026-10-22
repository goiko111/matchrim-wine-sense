# Native catalogue recovery 175

Final release status: **NO-GO**. This follows174, it does not replace the original
49 failures or claim that completed retrieval means correct identification.

## Shipped To The Local Candidate

`nativeStackedQueries175.ts` constructs query-only phrases from2-3 high-confidence
raw words on contiguous centered lines. It preserves spelling/case/order and
records source indices with `canonicalIdentityEvidence=false`. It rejects
malformed geometry, rotated neck text, competing/overlapping observations,
columns, missing/low confidence, dates and metadata. It neither merges arbitrary
producer/appellation fields nor corrects OCR spelling.

The automatic planner can replace its two slots only when BOTH original queries
are constituents of the same unique stack. One constituent remains as fallback.
A separate producer or failed query cannot disappear behind a convenient later
phrase. Grounded names, explicit producer roles and quoted cuvees retain priority.
Two-query/80-per-query/160-ranking bounds and all identity/year guards remain.

Read-only sidecar Turing reviewed only raw readings, queries, pages and contracts;
no per-case expected identity was used to design the change. It performed no
edits, network or browser/build work and is CLOSED. No other task was messaged.

## Results

Final report: `qa-artifacts/night105-20261021/native112-corpus200-r17/REPORT.json`.

| Metric | Original r14 | Roles174 r16 | Stacks175 r17 |
| --- | ---: | ---: | ---: |
| Retained Vision scenes | 200 | 200 | 200 |
| Evaluable retrieval | 151 | 160 | 162 |
| Incomplete retrieval | 49 | 40 | 38 |
| Partial-only | 28 | 19 | 17 |
| HTTP unavailable | 19 | 19 | 19 |
| Schema / mixed | 1 / 1 | 1 / 1 | 1 / 1 |
| Abstentions | 7 | 7 | 7 |
| Lists with proposals | 40 | 44 | 44 |
| Top1 / top3 expected-name proxy | 32 / 34 | 36 / 38 | 36 / 38 |
| Lists without expected proxy | 6 | 6 | 6 |

The second block completes002 (`BARON DAUVERGNE` / `DAUVERGNE`) and089
(`hateau HENRI BONNAUD`, exact accent preserved on the wire / `BONNAUD`). Both
still have NO safe proposal. They are NOT additional wines identified. Across
both blocks11 searches completed, four additional compatible proposals appeared,
and no previously complete retrieval became incomplete. This is not162 identities,
expert precision/recall, new gallery E2E or a human taste study.

Literal `ZERO PONT FIVE` is not silently corrected to `POINT`. Its broad ZERO
fallback remains partial, so195 stays incomplete. HAJSZAN's cached500 is retained
despite the new compound query;098's independent producer query is not dropped.
The two bad-slug records362891 and363580 remain incomplete, not repaired locally.

R17 uses437 verified cache reads, zero cache misses,10 fresh public GETs, source
integrity verified, zero models/uploads/writes. Predictions were frozen before
expected-name metadata was loaded. Exit1 is preserved. R15's earlier cache-only
misses/false-neighbour exposure remain historical and are not hidden by r16/r17.

## QA

- Stacked175:5 groups including provenance/immutability, alignment, invalid box,
  low confidence, ambiguous neighbour, metadata and independent producer retention.
- Existing query174:9 groups pass. Benchmark harness112:28 groups pass with an
  additional actual component/benchmark stacked-geometry parity sample and a
  missing-fifth-argument mutant. Existing partial/error/schema fail-closed tests
  remain in place; no old assertion or denominator gate was removed.
- TypeScript app check and focused lint pass after the product change.
- `continuation174-20261022/visual-stacked-r1`: actual native recovery TSX under
  isolated Chromium, retained Vision/catalogue response replay.002/089/195 at
  375/440px and375px/root32 produce9 passing captures. Zero page errors, horizontal
  overflow, undersized/out-of-bounds controls or automatic confirmations.002
  large-text and195 normal captures visually inspected. No external requests;
  catalogue thumbnails are controlled placeholders, original inputs are retained
  local images. This is not fresh native gallery recognition or physical QA.
- Earlier174 visual-r2 has12 passing captures for021/116/184/106. It remains
  phase-specific evidence, not a whole-app or physical-device certification.

Source is frozen at product `cbe27e3`; QA harness/report follow-up `18f1c4f`.
Final native preparation/build results are appended after completion below.

Final build105-r10 from clean `18f1c4f`: native-only production bundle and app
TypeScript PASS; iOS Simulator compile/install PASS at08:59:28UTC. Fixtures=false,
masterConfigured=false, settings restored. Resource/plist fingerprints verified
against preparation; the Swift executable is unchanged while JS resources include
both174/175. No archive, signing/export or upload. This is build-only, not a new
native gallery or physical QA pass. Final18 handler groups and both native-only
scope suites pass; protected CSS/search function still byte-identical to`db6a181`.

## Access, Budget And Next Gate

Exact38-case matrix and cached public server reproduction receipts:
`qa-artifacts/continuation174-20261022/ANALYSIS175.json`.
Local all200 review: `native112-review-corpus200-r17/REVIEW.html` / `REVIEW.csv`.
No screenshots, raw OCR or identity evidence were regenerated from expected data.

There is no demonstrated safe client-only closure for the remaining17 broad
scenes under the observed substring-only contract. Some lack a narrower legible
identity; others have legitimate broad producer/appellation names. Truncated
intersection or early acceptance cannot prove completeness. Retain uncertainty.

The19 HTTP-unavailable cases require the Symfony backend exception logs for the
exact public GET text/store/page, and the two invalid slugs require source repair.
No accessible master filter/vintage/sensory contract or backend-maintenance route
has been newly proven. Public global access already works; this is not an API-key
block and not solved by deploying the Matchrim frontend or changing the web.

Two immutable free reservations:35 GET then20 GET; actual usage17 then10.
CLI catalogue387 cumulative plus one earlier public image. Conservative free
reservation400/400, zero remaining capacity; unused reservation portions are NOT
reclaimed. Paid ceiling50 requests/EUR15 unchanged; no new model calls or Lovable
agent turns. No further live requests start without new authorization, which is
not requested here because the user explicitly kept the limit unchanged.

TestFlight stays blocked. No production web/main publication, backend deployment,
account creation, rating/save mutation or iPhone control occurred in these blocks.
