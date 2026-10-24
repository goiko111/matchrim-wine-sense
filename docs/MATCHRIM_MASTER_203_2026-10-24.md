# Master203: nine diagnostic IDs resolved, search coverage gap demonstrated

## Authorization and limits

Human answer to call_fb98e207954b46d081970df0def43e34: "Sí, hasta 12 lecturas gratuitas". Executed exactly nine canonical-detail diagnostics plus three literal search controls, all GET to the existing Winerim API, all HTTP200. No retry, model, image upload, SQL, Lovable, data write, deployment or additional expenditure. New allowance12/12 exhausted; prior6+40 authenticated,24 public and50 paid/EUR15 limits remain unchanged, not renewed. Key read only from the previously authorized Keychain service in memory; no value/header persisted or emitted.

Single-use ledger, exact plan, reservations, receipt timestamps/latencies, upstream wire digests and decoded bodies: `qa-fixtures/master203/responses/`. The stored pretty JSON is not the raw wire representation; receipt wire hashes are not falsely recomputed from it. Offline replay verifies plan/source hashes, receipt/report agreement, decoded result consistency and API schema. The old readers remain frozen.

## Expected / Actual

These are export-hint diagnostics against previously observed photos, not new recognition, blind ground truth or automatic confirmation. No filename ID enters the recognizer, affinity or learning.

| Image / hinted ID | Actual canonical detail | Public row | Sensory data / restriction |
| --- | --- | --- | --- |
|003 /217494|Valdebebas Soleá Vendimia Seleccionada / Bodegas de Occidente|None|No rows; visible producer role remains unproved|
|013 /217482|Bagante Mencía / Bodega La Serrana|None|No rows; producer not legible in photo|
|017 /217480|La Migratoria / Bodegas Frontonio|None|No rows; literal search still total0|
|041 /217456|Kriya Trebbiano / Vigna Madre|None|Generic row, origin unrecorded; not Kriya Passerina|
|118 /217379|Campillo Reserva Especial / Campillo|None|No rows or known1995; award2004 is not vintage|
|121 /217376|Puligny-Montrachet / Pierre Girardin|None|Generic row, origin unrecorded; do not substitute named climats|
|198 /217299|Da Luca Pinot Grigio / Da Luca|None|Generic row, origin unrecorded; Pinot Grigio not legible in photo|
|193 /217304|Bossanova Montepulciano d'Abruzzo / Bossanova|375605|Only2022 row, origin unrecorded; no visible vintage, no generic|
|200 /217297|Scattola Selección / Altotinto|375541|No rows; photo says Altotinto Selección2021, alias/identity unresolved|

Search controls, one complete page each:

- Bossanova Montepulciano: total1, canonical217304. Literal retrieval now yields the relevant reference rather than Giacondi, but does not prove recognition quality or bottle vintage.
- Seleccion + Altotinto: total2,217297 Scattola Selección and79032 Altotinto Selección Red Blend.79032 lists2021,2020,2022; no detail read for79032. Do not use the filename or year alone to select it.
- Migratoria + Frontonio: total0 despite successful detail217480 La Migratoria/Bodegas Frontonio. **Demonstrated search/detail coverage inconsistency**. Seven details without public rows suggest a scope/filter explanation, but the exact server cause is not verified; no claim of full-catalogue absence.

All nine details parse successfully. Seven have no public row/link; five have no sensory row; three have generic rows/source:null; Bossanova only2022/source:null. None provides recorded row origin, human-tasting proof or per-axis default provenance. No affinity authorized from these data. API latencies:67–513ms, median132.5ms, nearest-rank p95513ms (12calls). These are catalogue GET times, NOT scanner/model/E2E latency.

## Implementation / Tests

- New fixed-plan, single-use12-cap diagnostic, with atomic reservations before calls, closed URLs, whole-operation deadline, byte bound, strict JSON/contract parsing, secret-echo rejection, and halt on access/rate/transport/schema errors. Exact contract404 `not_found` would continue only for a diagnostic detail; no404 occurred live.
- Corrected the **inactive native195 adapter** to attach `catalogueAbsenceConfirmed:false` and `lookupScope:search-response-only` to empty-search outcomes. This prevents a consumer interpreting its `not-found` status as proof the master lacks the wine. No active app import was added and no hosted activation is claimed.
- New reader controlled safety tests:7groups PASS,0network/Keychain/cap consumed. Retained real-response replay:9details+3searches PASS; known-existing Migratoria empty-search regression PASS; Bossanova reference-only/no-sensory-borrow replay PASS.
- Affected adapter regression:11/11groups PASS offline. Focused TypeScript and ESLint PASS, diff-check PASS. Initial test fixture mistakenly used a search page as detail and a TSunion narrowing error were corrected before live calls; first failures were not live/backend failures.
- No full green suites/build/UI/iPhone work repeated for this inactive adapter/diagnostic delta. Signed107/source617e59c unchanged, not newly compiled or uploaded.

## Mail

Acquired desktop after other live owner completed; verified increasing idle12→16→20s, no native runners, then refreshed only goiko@winerim.com via verified account-specific Get Messages. Matchrim subject filter returned6messages, latest24Oct13:06; no new response found in that refreshed Inbox. This does not prove server-wide/spam completeness. Restored original filter toggles/empty text/GugoInbox/scroll, no other draft/body modified.

Sent the new bounded diagnostic to authorized moa-winerim-b93a8ts9@agentmail.to in the existing thread at **15:43:31 Madrid**, from goiko@winerim.com. SentUID5562, message83eddda0-3b3a-4e9a-9636-d0acfb86f81d@winerim.com, replying to the developer13:06message. Before send, all2005normalized characters matched the prepared text after splitting a long paragraph for AXtruncation. Independent bounded MIME read of exactly this Sent message verifies matching body, sole recipient, noCC/BCC/attachments. Sending proved, NOT delivery/read/new answer. [Exact request](MATCHRIM_DEVELOPMENT_REQUEST_203_2026-10-24.txt).

Requests existing-code explanation and proposed master search contract for unlisted verified wines, Scattola semantics, versioned sensory evidence and verified zero-extra-cost bridge channel. Explicitly delegates no additional reads/SQL/models/exports/data changes/deployments/credits. Desktop leases a81a0975 and97f0d536 released; own writer leases only, no foreign lease/process changed.

## Remaining Gate

Nine previously unseen IDs are no longer unknown at the **detail existence** level. This does not close nine photo identities or all17broad-search cases. Full search coverage, exact vintage/source/default evidence, hosted authenticated bridge and real scanner-to-affinity E2E still require verification. The9diagnostic results do not validate the200-label benchmark. Do not invent a completion percentage, source aliases, sensory values or URLs.

107 remains **HOLD**. No web/main/backend changes, deployment, publication or additional spend. Development must supply a scoped full-master search contract and a verified no-extra-cost deployment route; sensory proposal must become a versioned actual contract before use. Current remaining read allowance0; do not rerun this live probe or silently expand other caps.
