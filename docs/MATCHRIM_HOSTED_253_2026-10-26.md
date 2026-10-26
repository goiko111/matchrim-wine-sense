# Hosted253: secret saved by owner, QA authentication still blocked

## Resolution258: Same Six Reads Executed Successfully, 26-Oct08:25UTC

Historical authentication failures below remain failures. After the owner reset
their password and completed the masked Terminal255login, its local receipt
confirmed HTTP200, the original QA identity, fresh expiry and passwordStored:false.
New explicit --resume-reset-session258 validates that session and the unchanged
zero-catalogue baseline, without a new agent password/refresh submission. It then
reserves/executes exactly the SAME six authorized reads. Original RESULT.json and
RESULT-QA-LOGIN.json still contain the two400failures; the new result is separate
RESULT-RESET-SESSION.json. No quota reset, seventh request or retry.

| # | Expected | Actual26Oct | Result |
|---|---|---|---|
|1|Listed default search remains scoped, not global absence|HTTP200, Migratoria0results, valid empty page;1430ms|PASS scope/transport|
|2|Explicit opt-in includes canonical unlisted wine|HTTP200, La Migratoria / Bodegas Frontonio /217480, null publicID/storeURL;306ms|PASS opt-in|
|3|Canonical217480detail with honest missing data|HTTP200,0vintages,0sensoryrows;202ms|PASS schema, affinityHOLD|
|4|Listed canonical78397control|HTTP200, Anécdota / Altotinto,0vintages,1generic sensoryrow/sourceNULL;149ms|PASS schema, affinityHOLD|
|5|First opt-in Rioja page, declared metrics|HTTP200,total87,count50,pageCount2,19public-null rows;217ms|PASS partial page|
|6|Second page closes this search without duplication|HTTP200,total87,count37,17public-null;172ms;87distinct across both|PASS search pagination|

Bridge opt-in/access is now independently observed working through the hosted
function and ordinary QA JWT. The deployed source SHA/version was not queried in
this six-read allowance, so do not infer its exact deployment commit. This is
one complete Rioja search response, not an exported/full-master snapshot or proof
that every catalogue wine is searchable. Historical supplied216captures had81
rows/30public-null; preserved unchanged, current results87/36are a new capture.
All six observed latencies sum2476ms; these are transport timings, not scanner
OCR/vision latency or a production load/performance benchmark.

Bound redacted receipt: qa-fixtures/hosted258/RESULT.json. Original local business
responses/reservations/receipts remain under the existing253ledger. Wire SHA256
is the hash measured before JSON parsing; BODY.json is a serialized capture, not
claimed byte-identical to the wire. No token/key/password in the redacted receipt.

New scripts/check-matchrim-hosted258.ts replays only those retained actual
responses with external fetch disabled. Five focused groups PASS: actual results
and summaries, scoped empty vs opt-in canonical reference,87/36pagination,
missing/source-less sensory evidence excluded from score/learning, no reuse of the
consumed allowance and immutable local captures. Focused TypeScript/lint PASS.
No unrelated green suite, heavy render or native build repeated.

The actual data still cannot justify affinity:217480has no sensory row;78397has
one generic row with unknown origin and indistinguishable defaults. Both lack
declared vintages; neither attests2023. Existing native evidence transformation
correctly returns affinityAttributes:null, learningEligible:false. The prepared
195adapter remains inactive/listed-only; this turn does not activate it, change
product, grant photo identity, complete200recognitions or approve TestFlight.

Latest allowance now **6/6used**. Paid50requests/15EUR unchanged. No AI/images,
Lovablecredits, wine writes, Keychain, backend/main/web publication, phone,
ratings or TestFlight. Candidate124/source899bdf1unchanged. Own writer
ec6740a7-eec3-48b3-adae-1eeeac064f38/requestdf407de2, no desktop/heavy/simulator.
Remaining gates: safe native integration, genuine sensory/vintage evidence and
real photo-recognition/account/distribution validation, without inventing data.

## New Authorization And Actual Execution

The owner reports MATCHRIM_GOIKO_KEY saved in Lovable Cloud and explicitly
authorizes up to six additional authenticated free catalogue reads. This is a new
bounded tranche, not a reset of prior free or paid counters. No AI, photos,
Lovable credits, catalogue writes, backend/main/web publication or TestFlight.

The existing mode0600 QA session for info@winerim.com expired on21Oct23:56:35UTC.
One ordinary refresh submission to the same Supabase Auth project returned400.
No retry, password login, catalogue call or anonymous/admin substitution occurred.
The response's specific private Auth error code was not retained;400alone does
not establish password status, revocation cause or catalogue-secret validity.

- Catalogue attempts: **0/6**; all six remain available, not approved or executed.
- Existing-session refresh: **1/1**, HTTP400, failed and preserved.
- Private credential-file metadata/read preflight did not complete in roughly
  one minute. Only that own Node process66327was terminated (exit143), not another
  app or process. No password was returned, printed, submitted or changed.
- A bounded second preflight reached the file read but timed out; ownNode67882
  terminatedexit143. Exact `ls -lO`/`stat -f %Sf` confirm a mode0600,271byte
  `compressed,dataless` iCloud placeholder, not locally available credential data.
- Read-only CUA surface inventory timed out after30seconds/kernel reset. A later
  targeted Brave observation succeeded: correct Matchrim project Secrets table
  contains MATCHRIM_GOIKO_KEY, created26Oct. No value revealed or edited. This
  independently confirms the secret name exists, not its value/runtime validity.
  No browser navigation/login, mouse/keyboard action or global resource claim.
- Keychain reads:0; hosted secret correctness/runtime remains unverified.

Ledger and failure: `qa-artifacts/master253-20261026/hosted-six-r1`.
AUTHORIZATION, AUTH-REFRESH-RESERVED and RESULT are exclusive, fsynced receipts;
rerunning the probe refuses this existing directory. Never delete it or relabel
the authentication failure as a completed catalogue check.

## Prepared Six Checks

| # | Exact operation | Purpose |
|---|---|---|
|1|Migratoria search, listed default, page1/limit10|Baseline, no false absence claim|
|2|Same search with explicit includeUnlisted:true|Verify hosted opt-in patch and canonical217480|
|3|Detail217480|Actual vintage/sensory availability, no invented attributes|
|4|Detail78397|Listed canonical control and provenance distinction|
|5|Rioja opt-in page1/limit50|Canonical IDs, public-null rows, declared metrics|
|6|Rioja opt-in page2/limit50|Distinct IDs, consistent total, completeness within this search|

Every attempted catalogue request is reserved before network;HTTPerrors halt
without retry. Each hostedPOSTis a read-only operation to the bridge, whose
backend catalogue operation isGET. Six maximum excludes the separately disclosed
one session-refreshPOST; neither operation invokes a model.

Local eight-group checks PASS using only previously retained master216captures. They
verify strict decoding, incomplete run rejection, pagination drift/duplicate/gap,
wrong ID/year and unlisted rows rejected without explicit opt-in. These are
offline harness checks, not six live calls or photo-recognition evidence. Focused
TypeScript and ESLint PASS, no repeated whole-app suite or build.
The first resume-mode lint pass rejected a control-character regex; replaced
with explicit character-code checks and reran focused lint/typecheck/tests PASS.

## Affinity And Product Gate

Do not connect the inactive native master path or grant new affinity based on
owner confirmation alone. Even a successful transport is not canonical photo
identity or sensory evidence. Historical217480has no sensory rows;78397has a
generic row without source. Current data must be measured after authenticated
access returns; do not pretend those old observations are today's responses.

Next necessary step: download the existing private access file from iCloud in
Finder (its parent folder is linked in the user response), without sending its
contents. CLI brctl/fileproviderctl help exposes no direct download command here;
none invented or executed. Cooperative desktop conflicts prevent a safe Finder
action now; no foreign app/process interrupted. No diagnosis dump/account sweep.

Prepared `--resume-qa-login` refuses the dataless placeholder before reading. Once
available, it permits at most one routine password sign-in to the same account
and same Supabase project, validates the previously bound QA owner, saves tokens
mode0600 locally, then uses the SAME six-read allowance/ledger. It refuses prior
catalogue reservations, a prior login reservation or prior resume result. Original
HTTP400receipt is never overwritten; resume has its own RESULT-QA-LOGIN.json.
This mode has not been executed. No repeat refresh against the failed token,
new account, password change, ratings, administrative/anonymous substitution or
credential disclosure. After the file is local, use the canonical writer lease.
The six checks, full catalogue/200-label recognition and TestFlight remain HOLD.
Candidate124and compiled source899bdf1are unchanged; web and spend unchanged.

## Resource Ownership

Canonical writer-matchrim-native99ACQUIRED by exact thread
019f9da7-ae96-7c60-a1b4-fafb75b04d6d, lease
2a49cb41-5fcd-46d3-b163-f0326c80b47e, request
f333f465-cfdf-4d48-bf32-d144ac7dd731; renewed for evidence/commit, released after
completion. No desktop/heavy/simulator/phone lease or action. Foreign Chrome
scope/queued desktop work was respected; no apps closed or other tasks changed.
