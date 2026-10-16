# Matchrim Restaurant91

Date:2026-10-16. Baseline:`981d7887b95ec50102562d39c0886af23cfc6a0a`.
Frozen product:`83e159c856f9ef4e41a30870e6ff394e2e3524f8`.
That commit remains the UI/native QA baseline; the no-credit follow-up below
changes only the server provider policy and local deployment/test tooling.
User authorizes the multi-source, two-card restaurant flow and TestFlight only
after completion. This report does not certify a deployed or uploaded release.
Private evidence is under the recovered task's
`artifacts/matchrim91-restaurant-20261016/`.

## Product

New route:`/restaurante`, with native entries in Escanear and aiRIM:
**Comida + vinos del restaurante**. The published web remains untouched; existing
web navigation, quiz, scorer, learner, old scanner routes and original images are
preserved. This is an additional workflow, not a replacement for prior QA gates.

- Food and wine documents are separate inputs within one restaurant session.
- Multiple files/photos, repeated camera additions, PDF pages and URL documents
  have independent, visible reading status and original source provenance.
-20files/session,25MiB/file,50pages/PDF,100pages/session. Overflow rejects visibly;
  no first-page-only conversion, hidden prefix or silent file/page truncation.
- Pages render sequentially, with one analysis in flight, explicit confirmation
  for more than four pending pages, cancellation and manual failed-page retry.
- Read rows retain document/page origins. Only exact normalized readings group;
  producer, vintage, price and service conflicts remain distinct.
- Manual correction/discard preserves the original reading. A correction is a
  user assertion, not canonical identity, verified OCR, stock or dietary safety.
- One selected dish -> wines actually read from this wine card; one selected
  wine -> dishes read from this food card; both selected -> that pair only.
- A manually entered wine is explicitly not verified as sold by the restaurant.
- Comparison covers every selected input in bounded120x120blocks, at most32
  explicitly approved jobs. Larger combinations ask for a dish/wine focus rather
  than dropping references. Qualitative bands across blocks are not a calibrated
  global score or proof of the mathematically best pair.
- Price/currency/service constraints are source-grounded and enforced before AI
  and again on returned IDs. Unknown prices/formats cannot satisfy a budget.
- Known non-wine names remain in raw readings but are excluded from wine pairing;
  fortified/dessert wines and wine rows with adjacent spirit mentions remain usable.
- Pair explanations show positives, frictions, missing information and both
  source readings. No personal or pairing percentage is fabricated by the model.
- Personal affinity remains separate: exact original Winerim detail lookup plus
  the existing current quiz/learned-profile loader and unchanged affinity helper.
  Missing/ambiguous identity, sensory attributes or profile means pending affinity.

## Architecture And Privacy

`Restaurant.tsx` orchestrates the session. `restaurantSession91.ts` contains
provenance, page lifecycle, exact-read grouping and owner-scoped IndexedDB.
Database version2 stores original File objects once, separately from lightweight
metadata. Writes are immediate and ordered; a visible saving/error state prevents
claiming a saved draft prematurely. Deleting the session removes its local files
without deleting another owner's files. Reopen resets interrupted reads and
clears cached pair results whose selection filters are not persisted.

`restaurantDocuments91.ts` inspects signatures/hashes, plans every PDF page,
serializes rendering and imports validated URL payloads. PDF.js uses its Vite
worker asset, disables eval and releases tasks/canvases. Unsupported/encrypted/
oversized documents fail explicitly; Chrome HEIC support is not asserted.

`restaurantRanking91.ts` plans all bounded blocks, stops on error/cancel and does
not introduce automatic paid retries. A cancelled upstream request may finish
at the provider; cancellation prevents publishing its late result or starting
additional jobs, not a guarantee of reversing a charge.

New JWT-authenticated Edge Functions, not yet deployed:
-`restaurant-workspace91`: strict page extraction and source-ID-only pairing.
-`restaurant-import91`: bounded public HTTPS import, inert HTML5 parsing and
 same-domain menu-link discovery. No scripts, credentials or browser cookies.

The shared contract rejects unknown IDs, invented fields, unsupported source
identity, year-as-price ambiguity, invalid vintage, dietary guarantees and
personal score claims. Model counts and OCR source text are still model readings,
not independent image truth.60rows/page forces partial coverage. No database
migration, service key in client, new account or restaurant outreach is introduced.

URL import uses a literal validated public IP for TCP, checks the peer, then wraps
that same connection in TLS with the original hostname for SNI/certificate
verification BEFORE writing HTTP. Redirects repeat validation; there is no native
fetch, alternate-hostname or operator-flag fallback. HTTP framing uses pinned
http-parser-js, not an ad hoc response parser. Missing runtime TCP/TLS/DNS support
fails closed. The earlier egress-attestation draft is superseded, not enabled.

Offline tests cover cancellation, mismatched peers/certificates, HTTP framing,
redirects, size limits and DNS rebinding separation. Local Deno2.1.4 typechecking
passes. One benign transport GET to example.com returned200/577bytes, and a
trusted local CA with the wrong hostname was rejected before HTTP. This is not
verification of the deployed Supabase runtime; that remains a real hosted gate.

## Expected / Actual

| Case | Expected | Measured boundary |
| --- | --- | --- |
| Image + two-page PDF | Three page jobs, explicit failure and one-page retry | Controlled browser:3initial attempts+1retry, no reread of successful pages |
| Same source assigned to other card | Allowed, without mixing food/wine rows | Controlled browserPASS |
| Exact duplicate readings | One row, all three source pages retained | Controlled browser and session contractsPASS |
| Focus in either direction | Output IDs belong to both input cards and selected focus | UI and strict handler contractsPASS |
| Manual Roda-style wine | No claim that restaurant sells it | UI and contractPASS; no actual Roda tasting/outcome evidence |
| Budget/currency/copa-botella | Unknown or incompatible evidence excluded | Pure handler/client checksPASS, no stock/price-currentness approval |
| URL with50-page PDF | All50queued, no inference on import | Browser with intercepted URL responsePASS; not hosted URL import |
| Cancel50-page job | Stop after the in-flight request; resume all pending pages | BrowserPASS,56total controlled page attempts including one cancelled and one error |
| Every PDF page | Page50 renders, no prefix omission | Real installed PDF.js/Node canvas and browser workerPASS; synthetic QA PDF, not50real menu pages |
| Reopen | New document survives only after explicit saved state | Real Chromium IndexedDBPASS after eager-write correction |
| Owner isolation/delete | Independent local keys/files; clear only own originals | Six Chromium storage checksPASS; synthetic keys, not six created accounts |
| Portrait/narrow/landscape/200%/312% | Reachable controls, no horizontal overflow | Five frozen-source controlled full journeys,98checksPASS |
| Native entry/type/orientation | Correct route, AX tree and five44pt nav targets | One actual XCTest/fourviewsPASS; preferred-size heading25->148pt frame in final presentation |
| Provider and production | Fresh valid OCR/pairing against deployed new functions | BLOCKED; all new read/rank UI responses are controlled, no new paid/model call |

Focused tests:22session checks,13ranking checks (all3000wine references retained),
170workspace contract/handler checks,27document/import groups including real
PDF.js50-page rendering. Six release/cloud/remediation89/scene90/type/lint suites
PASS. Existing106lint warnings remain; no claim of warning-free lint.

The five-case controlled browser uses the unchanged user image IMG_7605 plus
synthetic QA PDFs and stubbed extraction/pairing. It proves transport/UI behavior,
not recognition correctness of the pictured cabinet or human pairing usefulness.

## Defects Found And Corrected

- Large text exposed137px icon columns and unreachable correction targets;
  physical44px icon buttons, fixed-pixel SVGs and wrapping actions correct this.
- Native maximum type exposed a compressed restaurant-name column; accessible
  layouts stack the header, imports and budget controls. Tab-bar chrome stays
  compact while restaurant content respects full user text size.
- Debounced persistence lost a just-added document on immediate reopen. Eager
  serialized metadata plus once-only File storage and saved-state feedback fix it.
- Selection edits and failed comparisons could retain an older result; source/
  selection invalidation and clearing results at submit remove that stale state.
- Vintage tokens could be misread as prices; strict monetary evidence now rejects
  that ambiguity rather than granting a false budget match.
- Native harness failures were selector ambiguity, not successful native QA.
  Earlier xcresults and browser failures remain preserved separately.

## Release Gate

Candidate source build number is1.0(91), not evidence of an Apple upload.
The isolated native app is`wine.matchrim.qa91`, invalid-only backend, no fixtures;
it must NEVER be exported/uploaded as the production app.

1. **Lovable Cloud deployment channel (corrected2026-10-16):** direct Supabase
   CLI/MCP inventory403 was observed, but the earlier conclusion that the owner
   must reconnect Supabase with deployment privileges was incorrect. The Lovable
   project7e9b6f66-d4ee-404a-8678-c9afab22de75 has its managed Cloud Database,
   Users and Edge functions UI available; get_database_status reports enabled
   Supabase stack, and its config matches cbjynrbvrhcmpaojmqdp. The observed
   Cloud inventory lists active v72/v73/v75 functions, with prior scoped Lovable
   deployments in the project history. The two new restaurant91 functions are
   not listed. Use that established Lovable backend deployment channel, not a
   direct personal Supabase account; no owner reconnection or migration is
   justified by this403. No new deployment was attempted during this read-only
   diagnosis. Hosted runtime/provider checks below are still required.
   **Latest owner constraint: no Lovable credits.** The available Lovable MCP
   has no backend-only deployment method; deploy_project publishes web hosting
   and is not an acceptable substitute. The observed Cloud function list/detail
   has monitoring, logs and View code, with no create/deploy action. Official
   Edge functions documentation directs creation/deployment to project chat,
   whose agent work uses credits. No agent message, publish, branch sync or
   undocumented/private API was invoked to bypass this constraint. Therefore
   the established paid-agent channel is known, but a supported zero-credit
   backend deployment channel has NOT been established with current access.
2. Verify the implemented pinned URL transport in the deployed runtime, along
   with body/rate limits. Do not restore native fetch or an attestation bypass.
3. Deploy only the two new functions and their reviewed imports, JWT verification
   on. Verify runtime provider/channel and perform a bounded authorized real
   read/pairing canary; mocks do not satisfy this gate.
4. Build a fresh signed`wine.matchrim.app` production archive with the intended
   existing v72/v73/v75 channel plus these endpoints; verify resources/config and
   unused Apple build number, then upload once and confirm processing/availability.

No production mutation, deploy, push, new TestFlight, owner-phone operation or new
account occurred. Last evidenced uploaded TestFlight remains85. Older recognition,
independent truth/calibration, human taste, physical permission/VoiceOver and
thermal gates from QA89/90 remain open, not waived by this restaurant implementation.

## Reproduce

```bash
MATCHRIM_RESTAURANT91_TEST_DEPS=/tmp/matchrim-restaurant91-offline-deps npm run test:restaurant91
node scripts/run-matchrim-local-gates90.mjs NEW_PRIVATE_OUTPUT
```

The optional temporary test prefix contains pinned parse5@7.3.0,ipaddr.js@2.2.0,
http-parser-js@0.5.10,
and the installed canvas/PDF.js test dependencies; it is not production client
configuration. Browser scripts accept only explicit loopback URLs, original input
paths and new output directories. The native preparer requires isolated temporary
directories and creates an offline QA bundle, never a release archive.

Final evidence paths: `gates-final-frozen/results.json`, `restaurant-frozen.log`,
`ui-frozen-final/results.json`, `storage-frozen-final/results.json`,
`web-frozen-r7.log`, `native-{sim,device}-frozen.log` and
`native-ui-frozen.xcresult`. The native preparer records the exact frozen commit
and13input hashes. Prior native/browser/layout and harness failures remain intact.
`final-receipt.json` verifies every tested source hash, all13native input hashes,
the isolated installed bundle/build and the exact QA receipts. Parent Deno check
exit0 is retained in`deno-import-check.log`; the delegate's benign transport GET
and wrong-hostname observations were tool outputs, not separate saved receipts.

The final repeated CLI inventory read still returns403; raw error is preserved in
`supabase-list-final.err`. No function inventory, deployed-version claim, archive,
Apple build-number availability or new processing/installation status is invented.

Transport implementation references:
[Supabase node HTTP restrictions](https://github.com/supabase/edge-runtime/blob/main/ext/node/polyfills/http.ts),
[Deno TLS resource wrapping](https://github.com/denoland/deno/blob/v2.1.4/ext/net/ops_tls.rs).

## No-Credit Deployment Follow-Up

The owner explicitly requests deploying both functions and releasing TestFlight
only after real validation, while forbidding Lovable credit spending. No Lovable
agent turn or hosted function/model invocation was made in this follow-up. The
documentation also associates Cloud/AI gateway operation with run credits; a
blanket zero-credit guarantee cannot be inferred for real hosted tests either.

- Restaurant91 always passes allowLovable=false to the shared provider. Missing
  independent key, an explicit Lovable/unknown provider or independent provider
  failure cannot fall back to Lovable AI. Existing callers keep their prior policy.
-23 new actual-adapter cases with stub HTTP pass, including zero requests for
  forbidden configuration and no retry/fallback for402/429/500. The existing12
  provider completion contracts and170workspace handler contracts also pass.
- Restaurant suite22session/13ranking/170workspace/23provider/27import groups
  passes locally, with real50-page PDF.js rendering but stub AI/hosted transport.
  Six local release/cloud/remediation89/scene90/type/lint groups pass in
  no-credit-gates-r2; the first run correctly caught a protected config snapshot.
  The temporary local config addition was removed, not repinned or bypassed.
  JWT enablement is an additive deployment patch, preserving remote config.
- Both Edge entrypoints pass Deno check; the web build passes. No new signed
  archive, simulator/physical run or TestFlight upload is claimed for this delta.
- prepare-matchrim-restaurant-deployment91.mjs generates a six-file exact source
  closure with SHA256, additive verify_jwt=true sections for only these functions,
  Git provenance and deploymentPerformed=false. It never sends or deploys it.
  This package is preparation, not evidence of a supported free deploy channel.
- Prior UI/native evidence and final-receipt.json remain baseline evidence,
  not a receipt for the new provider policy. Real OCR/pairing/runtime checks and
  Apple signing/upload stay pending behind a permissible deployment channel.

Primary documentation checked2026-10-16:
[Edge functions: project-chat deployment and monitoring-only view](https://docs.lovable.dev/features/edge-functions),
[Code editing is free; project-chat agent work uses credits](https://docs.lovable.dev/features/code-mode),
[Cloud and AI gateway run credit usage](https://docs.lovable.dev/features/cloud).
