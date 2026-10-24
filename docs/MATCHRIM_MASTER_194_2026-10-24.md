# Matchrim: forty live catalogue reads and isolated server bridge

24 October2026. Branch `codex/matchrim82-cloud-integration-20261013`.
Supersedes Master193's pending40-read question, not its historical receipts.
No web publication, main/backend mutation, paid analysis or TestFlight upload.

## Actual Live Results

Human approval: **"Sí, hasta40lecturas gratuitas"**. Exactly40GETs completed at
10:20:30.485UTC/12:20:30Europe/Madrid. Every request reserved before send, one
at a time, no retry. The corrected Keychain value was used only in process
memory and the fixed `X-Matchrim-Key` header to app.winerim.com. No key, token,
header dump or credential fingerprint was saved. No photo URL was fetched.

- HTTP200:40/40;53-432ms, median89ms, p95246ms;137105wire body bytes.
-34reads:17primary searches, followed by first-proposal detail or literal fallback.
-2reads: canonical details corresponding to the two earlier defective sources.
-4reads: AMARONE page1/limit2, page2/limit2, repeat page1, page1/limit4.
-40/40allowance exhausted. Prior6/6(one old401+five200) remains exhausted.
  The50paid-request/EUR15cap and old24public-GET allowance are not reset.
-0model calls, image uploads, Lovable turns, real account/rating writes or new
  paid cost. This latency is catalogue HTTP, NOT complete scanner latency.

Original evidence: `qa-artifacts/continuation194-20261024/live-forty-r1/`.
Every GET has RESERVED, RECEIPT and normalized BODY. Original RESULT retains
the parser failure below. Repository copies in `qa-fixtures/master194/responses/`
preserve the actual normalized bodies/receipts/authorization/RESULT, not mocks.
Receipt SHA256 is of original wire bytes, not normalized JSON file bytes.

Queries use ONLY literal observed OCR from continuation180. Name/producer role
assignments are hypotheses; the expected/ground-truth identity is never a query
input. Existing OCR is replayed; no new200-image vision benchmark was run.

## Expected / Actual Matrix

Expected for each scene: valid bounded retrieval, inspect canonical detail when
available, keep identity/affinity pending if ambiguous, contradictory or unverified.
Counts below are candidates, NOT recognized wines. Detail of the first result
is diagnostic inspection only; it is never automatically selected or confirmed.

| Image | Actual primary / fallback | Remaining evidence gap |
| --- | --- | --- |
|003 | SOLEA+VALDEBEBAS0; literal SOLEA12 | Producer/name role not resolved |
|013 | BAGANTE0; BIERZO8 | Broad regional fallback, not identity |
|017 | MIGRATORIA+FRONTONIO0; FRONTONIO26 | No exact label resolution |
|041 | KRIYA+VIGNAMADRE0; KRIYA1 | Returned Passerina; OCR contains TREBBIANO. One result is not proof |
|045 | PROTOS/Seleccion del Sumiller1; canonical217452detail200 | Single proposed reference, source:null; image identity not confirmed |
|054 | CONDE DE HARO3; first canonical11090detail200 | Brut vs Blanc de Blancs/Millesime qualifiers matter |
|060 | AMARONE+BERTANI4; canonical11435detail200 | Producer variants and cuvee ambiguity; matching a producer token is insufficient |
|067 | POUILLY-FUISSE EN SERVY+VAUPRE0; VAUPRE1 | Fallback has no independent detail in this tranche |
|069 | TRADITION+GUILLEMINOT1; canonical217428detail200 | No known vintage/source evidence for affinity |
|096 | BERGWEIN GROSS0; GROSS total57/page50 | Original schema rejection fixed offline;7rows still unloaded |
|118 | RESERVA ESPECIA+CAMPILLO0; Campillo15 | OCR qualifier/identity unresolved, no silent spelling correction |
|121 | PULIGNY-MONTRACHET+PIERRE GIRARDIN2; canonical200665detail200 | Les Folatieres vs Les Pucelles must not be mixed |
|151 | MEURSAULT LES GRANDS CHARRONS+PIERRE GIRARDIN, prefer2022:1 | Canonical217346detail lists only2024; must not borrow it for2022 |
|155 | TERA18; first Teran/Zidarich73309detail200 | Prefix collision; first row must not become label identity |
|163 | SIERRA CANTABRIA23; first CVC178133detail200 | Producer alone does not identify a wine |
|195 | ZERO PONT FIVE0; ZERO total98/page50 |48unloaded, OCR misspelling not automatically corrected/confirmed |
|198 | DA LUCA3; first Sparkling Rose198396detail200 | Rose/Prosecco and other-producer collisions remain |

Original live classification:7fallback proposals,3unique proposals,6ambiguous,
1fallback schema rejection. **After the narrow parser fix, preserved-response
replay:8fallback,3unique,6ambiguous,0schema rejections.** All17image identities
remain unconfirmed and no affinity/training was granted by this adapter. These
counts do not measure precision/recall or prove the remaining17are closed.

Two source-route defects are now independently narrowed:

| Public ID | Canonical ID | Actual canonical detail | Scope |
| --- | --- | --- | --- |
|362891 |215213 | Giacondi Montepulciano D'Abruzzo / Giacondi | HTTP200, parsed; image identity NOT confirmed |
|363580 |215439 | Anecdota Chenin Blanc / Altotinto | HTTP200, parsed; image identity NOT confirmed |

These complement193's observed ID mapping. No guessed public slug is needed
for the canonical detail lookup. Public links themselves were NOT opened.

Pagination actual IDs: page1 `[214921,202489]`, page2 `[50050,48483]`, repeated
page1 unchanged, limit4 exactly their concatenation; total149in all four reads.
This validates that window/repeat/changed-limit control, NOT all149rows or a
stable full-master snapshot. GROSS and ZERO partial pages remain explicit.

## Defect Corrected And Reproducibility

GROSS HTTP200 includes canonical181944 with name
`Jean-Pierre Grossot\tChablis Premier Cru`. The existing decoder rejected the
entire50-row page. `nativeMasterContract188.ts` now converts tabs in RESPONSE
names to spaces before strict label validation, matching the already observed
public-catalogue separator pattern. Query text, newline/CR/NUL/bidi controls,
producer IDs, vintages and sensory evidence guards are not relaxed.

Original failure retained in live RESULT and `gross-parser-red.log`. No new GET
was made after the fix. `OFFLINE-REEVALUATION-r1.json` replays original local
artifacts; r2 uses identical repository copies. Both preserve source hashes and
report externalRequests0/keychainReads0. Further output names must be new.

The live probe rejects a frozen corpus before Keychain/network, even in a fresh
clone. Default invocation is plan-only. It does not create a fresh40allowance.

```sh
node --import tsx scripts/check-matchrim-master194.ts
node --import tsx scripts/check-matchrim-master-bridge194.ts
node --import tsx scripts/replay-matchrim-master194.ts qa-artifacts/continuation194-20261024/OFFLINE-REPLAY-new.json
```

## Local Server Implementation

New isolated files:
`supabase/functions/_shared/matchrim-master194.ts` and
`supabase/functions/matchrim-master-catalog/index.ts`.
Explicit `verify_jwt=true` appended for this route in config only. Existing
search/scan functions and published frontend are unchanged.

POST JSON envelopes, unknown fields rejected:

```json
{"operation":"search","query":{"name":"Vidure","winery":"Pago de Cirsus","vintage":"2020","vintageMatch":"only","page":1,"limit":10}}
{"operation":"detail","mantalakWineId":201987}
{"operation":"ids","publicIds":[362891,363580]}
```

- Supabase `auth.getUser(token)` verifies the current user; missing/rejected/
  anonymous users never access the server secret or catalogue. No service role,
  user_metadata authorization, database writes or persisted sessions.
- `MATCHRIM_GOIKO_KEY` is server-only; no VITE/IPA/client environment setting.
  The local Keychain value has NOT been copied to a backend in this turn.
- Exactly one allowlisted catalogue GET per valid call, no pagination loop or
  automatic retry. No caller URL, image/model/profile input, cookies, redirects
  or arbitrary proxying. Query/ID bounds match the canonical contract.
-12swhole-operation deadline includes Auth, request body, fetch and response;
  cancellation aborts transport.12KiBrequest/256KiBresponse limits, JSON only.
- Safe errors only; no upstream error body/headers/secret echo.429preserves a
  bounded numeric Retry-After; no cache/cookie response. Canonical JSON returned
  unpromoted: existing188decoder still decides validity/evidence. This is not
  a semantic result validator or an abuse-resistant global quota service.

**Not deployed, not native-active.** Eight offline groups execute the actual
entrypoint with a controlled SDK and exercise bridge-to-decoder on all40saved
responses, plus mapping. They do NOT validate a hosted Supabase session, bundled
Deno dependencies, real app transport or a deployed function. Upstream's shared
300/minute limit is not per-user durable admission control; deployment review
must address abuse/quota policy without creating database writes here.

Consulted current Supabase changelog and Auth header/getUser docs24Oct. Relevant
CBC-TLS deprecation starts10Nov2026at earliest; no API pattern change needed for
the server runtime. SDK pin follows existing2.7.1functions, not an unpinned new
dependency or an SDK-wide upgrade. Hosted runtime check remains a gate.

## Focused QA, Not A Repeated Full Green Suite

| Check | Result / evidence |
| --- | --- |
|194probe/plan/cap/parser tests |6/6PASS, offline-tests-final-r3.log |
|188affected decoder regression |7/7PASS, retained earlier focused run |
|193real-payload regression |5/5PASS, retained earlier focused run |
|194server bridge/actual entrypoint/all40body replay |8/8PASS, bridge-offline-tests-final-r3.log |
| Strict TypeScript on shared handler, decoder, probe/replay/tests | PASS, focused-types-final-r3.log; hosted/Deno imports not typechecked here |
| Focused ESLint | PASS0errors, focused-lint-final-r3.log; initial two control-regex lint issues fixed with codepoint checks |
| Frozen live probe | Expected exit1 before Keychain/network, frozen-live-refusal-r1.log |
| New image recognition /50real users / full native E2E | NOT RUN; no budget extension or account changes |
| New native build/screenshots | NOT RUN: new decoder/route inactive, signed107product unchanged |

Final fixture/CLI guards included in the focused checks before commit. No
need to rerun unrelated green suites or recreate the signed107archive for an
inactive bridge. Previous mobile evidence remains scoped to candidate617e59c.

## Development Handoff / Remaining Release Gate

Routine technical recipient remains `moa-winerim-b93a8ts9@agentmail.to` in the
existing Matchrim thread. No new email was sent in this block; no claim of a
new development reply. Final read-only capacity check finds mac-desktop leased
by another task and HID idle about2.5seconds, so no mailbox focus/filter/send
operation is attempted. Previous11:14secure-transport request remains the last
verified sent follow-up. New evidence changes its access diagnosis: Goiko's key
NOW WORKS for direct canonical API reads; the missing part is app/server wiring,
not another frontend key or guessed Symfony repository.

Send this compact technical delta when desktop access is safe:

> Release827verified with40/40HTTP200GETs. Public362891->215213and363580->215439
> canonical details now work; bounded AMARONE pagination/repeat works. Need a
> verified no-extra-cost deployment channel for isolated matchrim-master-catalog,
> user-JWT protected, MATCHRIM_GOIKO_KEY server-only; no main/web publication.
> Local implementation and8offline groups are ready, but no hosted/app validation.
> Please provide per-axis status/provenance distinguishing measured/curated,
> inferred, missing, not-applicable and fallback/default3. Current source:null
> and even AI-row provenance cannot make those axes reliable affinity inputs.
> Preserve exact vs generic vintage: Vidure2020unrecorded(2018known), LaZorrera
>2015known(source:null), Meursault Les Grands Charrons217346returns2024only
> although the image OCR asks2022. No invented vintage rows or silent borrowing.
> GROSS response tab now normalized narrowly; source data cleanup is optional,
> not a reason to relabel the original failed run. Keep full label/producer/
> cuvee qualifiers; prefix candidates are not verified identity. Do not spend
> Lovable/model credits or change backend data under this request.

Next sequence: verified free deploy/secret channel and readback; native-only
transport integration with recorded fixtures; affected portrait/MAX/native E2E;
then newly authorized live transport checks if required (current40is exhausted).
Recognition/sensory cases must remain visible until validated. Only after that
does the standing conditional107TestFlight authorization apply. No limited-beta
waiver is inferred, no upload attempted, no main merge, no published web change.

Resources: writer-matchrim-native99 lease f7893039-1217-4974-bbb6-57d8ef5c89d6,
renewed for local work; mac-desktop9c4dc3c8-dc96-4414-92a9-819a032bfd56released
after initial probe use. No heavy/simulator/iPhone lease/job, foreign process
termination, cache removal or resource stealing. Writer released after commit.
