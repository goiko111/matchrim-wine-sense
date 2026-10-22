# Catalogue continuation 172 - 2026-10-22

## Scope and release gate

Continuation from `078d2ae`, not a new recognition baseline. The 49 incomplete
scenes remain: 28 partial-only, 19 HTTP-unavailable, one schema-only and one mixed
schema/partial. No web/main publication, deployment, Lovable agent turn, paid model
request, image upload, production data mutation or TestFlight upload.

## Implemented

- Native manual picker can now load actual server pages after a search exceeds
  80 results. Previously its arrows only traversed the first 20 local rows.
- One public GET per explicit load action; client-owned, query-bound, single-use
  continuation. No automatic prefetch. Automatic recognition remains at 80 rows
  per query and 160 rows for ranking; no denominator or identity rule relaxed.
- Manual browsing stops at 20 pages/400 observations and asks for a narrower
  name. Server count, page length/order, duplicate IDs, per-row schema, 12-second
  deadline, 256-KiB response bound, cancellation and independent detail remain
  enforced. Unknown filters, guessed slugs, admin credentials and aliases are not
  used. Malformed valid-neighbor rows remain explicitly incomplete, not repaired.
- Loaded/total counts explain that the vintage selector filters only loaded rows.
  An optional selector copies literal OCR text into the search field for human
  refinement. It never invents words, submits implicitly or confirms an identity.
- Query, owner, saved-snapshot and cancellation guards discard late responses.
  Independent detail verification is still required for a row from any page.

## Live public retrieval

Evidence: `qa-artifacts/night105-20261021/public-browse172-r1/REPORT.json`.
Four queries were selected from existing partial results whose declared counts
were 81..120, without feeding expected wine identities into the query generator.
The first page was hash-verified retained evidence; subsequent pages were live.

| Query | Before accessible rows | Retrieved rows | Final page | Duplicate IDs |
| --- | ---: | ---: | ---: | ---: |
| SOLEA (accent preserved in request) | 20 | 96 | 5 | 0 |
| BERTANI | 20 | 88 | 5 | 0 |
| Campillo | 20 | 112 | 6 | 0 |
| PIERRE GIRARDIN | 20 | 97 | 5 | 0 |

These are complete manual retrieval sequences, NOT four automatically identified
wines or closed recognition scenes. 393 rows were accessible instead of 80.

Two demonstrated `store` variants for `Braida` (omitted and `0`) both still return
HTTP500 and the same HTML error body. This is distinct from earlier JSON500
receipts; all headers/body hashes are retained. No fallback namespace is assumed.
Existing 19 failed scenes remain excluded. No proven server-side producer/year
filter or accessible Symfony maintenance contract was found in existing evidence.

Budget: 19 new free public GETs (17 page fetches and two error diagnostics), four
cache reads; cumulative CLI360 plus one earlier public image. Conservative corpus
reservation increases 269 -> 295/400, leaving105. The original 50 paid requests /
EUR15 ceiling is unchanged, with zero new paid calls or Lovable spending here.

## Verification

- `check-matchrim-browse172.ts`: 9 groups pass (96-row explicit browsing,
  cursor forgery/reuse/cross-client/query, envelope drift, schema damage,
  duplicates, 400 bound, abort, HTTP/body/deadline and independent selection).
- Actual picker handler regression: 17 groups pass, including refinement without
  implicit query, later-page load and stale query/owner protection.
- Existing pagination160: 10; incomplete171: 13; recovery104: 18; benchmark
  harness112: 28 groups pass. Focused lint and app typecheck pass.
- Full200 replay r13: source integrity true; 443 cache reads, no misses or live
  GETs. Same 151 evaluable /49 incomplete, 7 abstentions, 40 proposal lists,
  32 top1 /34 top3 expected-name proxy hits, 6 lists without expected.
  NO-GO retained. Manual pagination is not fed into automatic recognition metrics.
- Isolated real native-only picker TSX, controlled transport broad172-r1: five
  list pages/96 rows, explicit vintage filter, independent detail, no pageerrors,
  375/440px and root32px captures PASS. Large-text capture visually inspected.
  This is Chromium, not UIKit or a live recognition success.
- Additional partial-state captures and fresh native build/QA: pending at this
  product checkpoint; final evidence will be appended rather than overwriting it.

Protected `src/index.css` and `supabase/functions/search-wines/index.ts` remain
byte-identical to `db6a181`. No full-catalogue sensory/vintage completeness claim.
TestFlight remains blocked until remaining recognition and native QA gates close.
