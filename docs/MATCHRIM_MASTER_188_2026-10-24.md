# Matchrim 107: canonical API contract received

## Follow-Up Sent: 24 October, 11:14 Europe/Madrid

Direct human authorization: ask development to enable secure access, retain the
web/spend restrictions and upload107 only after validation. Sent one reply in
the existing Matchrim thread, from `goiko@winerim.com` to
`moa-winerim-b93a8ts9@agentmail.to`, no CC/attachments/secrets. Verified in Sent,
UID5557: recipient, timestamp11:14 and complete body. This supersedes the
"not sent" draft status below; no delivery/read/reply claim.

Asked for the existing authenticated server proxy/function, source revision and
input/output contract using `MATCHRIM_SEARCH_KEY`, or the exact secure server-only
key delivery step if none exists. Explicitly no credentials by email/frontend/IPA,
admin access, private-data permission changes, main/web changes, new Lovable
credits or other spend; stop and specify any such prerequisite. Requested only
existing deployment/acceptance receipts, not a new delegated paid validation run.

No new catalogue/model/image calls, account writes, deployment or TestFlight
upload. The contract/examples already passed offline checks; no green suite was
repeated while awaiting the server transport.17broad+2source cases stay OPEN.
The signed107archive and validation condition are unchanged.

Desktop lease `c270d592-a5d7-4b55-bb26-4790e8ae3955` was released immediately
after confirming Sent. Final writer `0200ef87-ac2a-4848-8e00-3917291c0148` held
only through this checkpoint/commit/push and released after completion. Foreign
coordination requests did not interrupt the send or authorize messaging back;
no foreign app/process/lease was changed.

Updated 24 October 2026, 11:06 Europe/Madrid. Branch
`codex/matchrim82-cloud-integration-20261013`. Contract adapter/tests: `443a2f8`.

## New Evidence

Read only the existing Matchrim conversation in Thunderbird, account
`goiko@winerim.com`, authorized sender `moa-winerim-b93a8ts9@agentmail.to`.
The mailbox received another Matchrim message while it was being reviewed.
No other project message was intentionally opened.

- 23 October 19:37, IMAP INBOX UID 88000: development reports that its direct
  Supabase channel also returns 403 and that Lovable needs credits/main.
- 23 October 19:47, UID 88001: development reports an owner-authorized minimal
  deployment of `ai-wine-chat` and `scan-food-pairing` at 17:41:21 UTC, through
  one Lovable message. It reports restoring two incidental generated web files.
  This is their reported deployment, not an action or spend authorized/performed
  by this continuation. It provides no deployed-source hash or live behavior test.
- 24 October 10:58, UID 88025: development supplies the attached release 827
  canonical API contract and reports production publication today. It requires
  `X-Matchrim-Key`; the separate Goiko key is NOT supplied in the message and
  must be delivered through an agreed secure channel. No anonymous probe made.

Saved attachment, unchanged:
`qa-fixtures/master188/CONTRATO-API-827-20261024.md`.
SHA256: `e7f7fcc910925283c99b7df6d8a99356c46349da91fad4def26527b8be4f9509`.
The JSON examples are developer-supplied production examples, NOT independent
Matchrim HTTP receipts or image recognition results.

## Independent Verification

Read-only `git fetch origin main --no-tags` confirms remote main
`6bc28b400c3777c9c5161508d749eaa1e2f48730`. Compared with prior `95aa750`,
its final content changes only `supabase/functions/_shared/matchrim-profile95.ts`
(3 insertions, 2 deletions). Its SHA256 is exactly our expected
`9339dc69de5fb72a38a7c1af46fa5dad4ff96f0eefce87724d608283a55f27e6`.
No merge, push or write to main performed here. This verifies repository content,
not the deployed function bytes or the absence of earlier preview side effects.

One scoped `get_edge_function(ai-wine-chat, cbjynrbvrhcmpaojmqdp)` returned:
`MCP -32600: You do not have permission to perform this action`,
structured `INVALID_ARGUMENT`. No retry loop or new Lovable turn.
The learning patch's status is now **deployment reported / source verified in
main / deployed readback and behavior unverified**, superseding "not deployed"
in the historical 186/187 checkpoints without rewriting those reports.

## Implementation And Tests

Added the release 827 wire adapter `src/utils/nativeMasterContract188.ts`:

- Validates independent name/winery/q filters, strict/preferred vintage, query
  bounds, explicit effective page size and total/page-count consistency.
- Separates canonical `mantalakWineId` from representative public row `id`.
  Checks public-link ID binding and allowed image/link origins.
- Accumulates stable pages with canonical-ID deduplication; rejects gaps,
  repeated IDs and changed totals. This does not promise snapshot isolation
  when a source changes while paging; the contract explicitly has no cursor.
- Checks exact-detail ID, unique sensory rows, scale and vintage membership.
  Keeps generic evidence separate from exact-year evidence, never another year.
- Validates public-to-canonical mapping coverage, order, unknown IDs and links.
- Does NOT turn default-bearing sensory estimates into affinity/training
  authority. Raw zeros remain visible as "not applicable", not low preference.

`scripts/check-matchrim-master188.ts`: **7/7 groups PASS**, external Node fetch,
net and TLS blocked. Uses the attached examples plus explicitly synthetic
negative mutations. Focused strict TypeScript PASS; focused ESLint 0 errors;
`git diff --check` PASS. Initial ESLint rejected a control-character regex;
rewritten using the repo's explicit code-point validation, then passed.
Test log: `qa-artifacts/continuation188-20261024/contract-tests.log`.

This adapter is deliberately **not activated/imported by the running app**.
The old 102 opt-in endpoint is a different proposed contract; it must not be
enabled with release 827's URL or mistaken for the new API. Never put the shared
catalogue key in `VITE_*`, browser storage, an IPA or a frontend header.
An authenticated, server-side transport and its deployment need verification
before wiring this format to the scanner. No secret was requested over email.

## What The Contract Actually Resolves

| Case | Supplied evidence | Still required |
| --- | --- | --- |
| Chivite La Zorrera 2015 | Canonical ID 180278; known 2015; generic + exact sensory rows | Authenticated readback and safe sensory provenance |
| Pago de Cirsus Vidure 2020 | Canonical ID 201987; only 2018 recorded | Do not manufacture 2020 or borrow 2018; source repair/explicit unknown |
| Public 362891 | Mapping to canonical 215213 + supplied real link | Independent readback, not proof of img-193 identity |
| Public 363580 | Mapping to canonical 215439 + supplied real link | Independent readback, not proof of img-200 identity |
| 17 broad cases | Independent filters/stable ID tie-break/total now documented | Execute within remaining authority after server access exists |
| Sensory defaults | Per-axis 3 can still be an indistinguishable fallback | Source cleanup/status/provenance; do not treat default 3 as a cata |

No new 200-label accuracy/recall/affinity metric. The historical 181-evaluable/
19-incomplete retrieval replay is unchanged, not upgraded by documentation.

## Exact Next Gate

Development must identify the already deployed server-side integration (function
name, source revision, request/response contract) and whether its existing
`MATCHRIM_SEARCH_KEY` can serve the authenticated native request. Otherwise agree
with Goiko on secure server-only delivery of the separate key; never email/chat
the value or ship it in the app. Readback/source evidence and an authorized
bounded live validation remain required. Do not start another paid deployment.

Suggested technical reply, **not sent in this continuation** (desktop became
BUSY under another owner's lease after reading):

> Recibido el contrato de release 827. Hemos añadido adaptador y siete grupos de
> pruebas offline; no lo damos por validación de producción. Confirmamos en main
> 6bc28b4 el hash esperado del parche de aprendizaje; el readback Supabase sigue
> denegado. Para conectar sin exponer claves, indicad qué función/proxy de
> servidor usa ya MATCHRIM_SEARCH_KEY, su revisión y contrato accesible desde la
> app autenticada. Si no existe, acordad con Goiko el canal seguro para la clave
> de servidor; no la enviéis por correo ni la metáis en frontend. No despleguéis
> nada nuevo con coste ni cambiéis main/web por esta consulta. Necesitamos
> también distinguir valores sensoriales por defecto antes de usarlos para
> aprender o presentar afinidad. Vidure 2020 queda desconocida, no se sustituye
> por 2018. Gracias.

107 stays **HOLD** under the user's conditional authorization. Signed archive
remains `continuation187-20261023/archive107-r3/Matchrim107.xcarchive`, source
617e59c, not exported/uploaded. New adapter is inactive and changes no bundled
dependency, so no repeat build/visual claim. Heavy resource is held by another
owner; no heavy operation attempted or process stopped.

Own new paid/model/image/catalogue/Lovable calls: **0**. One denied management
read and read-only Git metadata/fetch. No real account writes/iPhone operations.
50 paid requests / EUR15 and the prior 24-public-GET reservation unchanged.
No public web/backend/main mutation or publication by this continuation.

Resources: desktop `e3873e3f-ff17-4502-9f28-f7ae216892d9` released after reading;
writer `eb271121-ad97-4866-8477-5fa098d9f744` released after code/test commit;
subsequent desktop acquisition BUSY, no UI actions taken; final writer
`1a250c21-767f-4a60-9f7a-3c4d352355a7` only for this checkpoint/commit/push,
released after completion. No foreign leases released or expired.
