# Native catalogue proposals pagination111

## Defect And Correction

The public catalogue returns at most20 rows per page. Recovery previously ranked only the first page, so a matching reference on a later page was invisible. Automatic strict identity lookup remains unchanged.

The explicit native proposal flow now reads up to three pages when a query has21-60 results, under the same12-second operation deadline and262144-byte limit per response. Queries above60 remain partial and must be refined. Counts, page numbers, expected page lengths and unique IDs are checked across the whole operation. An inconsistent or failed page never returns a successful-looking partial shortlist.

Selection still requires independent detail verification. NV records do not become exact-vintage identity or trainable sensory evidence. No web caller uses the new `searchProposals` method.

## Evidence And Limits

- Eight synthetic pagination groups pass, including second/third page, legacy behavior, malformed data, duplicate IDs, cancellation and independent selection verification.
- Existing17 catalogue groups and14 actual recovery-handler groups pass without removing old assertions.
- A text-only public acquisition collected52 later pages for the frozen200 OCR queries, allHTTP200. No photos, credentials, model calls or production writes were involved. Earlier first-page receipts are retained; replay must reject changed counts rather than claim a fully current catalogue snapshot.
- One additional CHACAYES page2 GET also returned200; neither it nor FLICHMAN page2 supplies the expected Single Parcel Chacayes. Pagination is a concrete retrieval fix, not proof that the public namespace equals the administrative Mantalak master.
- The first collector invocation rejected a cached detail URL before sending a request. It now explicitly skips detail receipts and accepts only the observed search endpoint; no permissions or URL bounds were relaxed.
- Dataset replay and responsive/native validation remain pending the shared heavy resource. Do not claim recognition accuracy from transport success.

Evidence: `qa-artifacts/night105-20261021/public-pages111-r1`, `public-page111-r1`.
