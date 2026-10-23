# Native107: learning correction and release gate186

Updated23October2026,18:42Europe/Madrid. Branch `codex/matchrim82-cloud-integration-20261013`.
Product/server-source correction `58e90559560df88bd59d9db166ae9ab66232a144`.
This is a local native-tag-only correction, NOT a deployed backend or a new recognition result.

## Findings and correction

The101retained failures are1031historical checks, not101distinct currently selected native defects:

| Group | Retained failures | Actual target and disposition |
| --- | ---: | --- |
| D1 |45|43old-client/generic-Edge comparisons plus2anchors. Current native-v2 client/profile95 is tested separately; old generic learner unchanged. |
| D2 |51|50web evidence-bypass controls and1old generic Edge control. Web unchanged by owner request. |
| D3 |4|Generic Edge scale/coercion controls. Selected native profile95 already rejects these values. |
| D4 |1|Actual v2 floating-point tie:24.5 becomes24.499999999999993, rounds24instead of25. Still OPEN. |

The original `qa185-persona-r3/results.json`, its930PASS/101FAIL, frozen outcomes,
and `check-matchrim-consumer95-personas.ts` were not rewritten. No claim that all101
are fixed or that50human users were tested.

A different real P1 was reproduced: client184 excludes `winerim-public-store:`
sensory evidence, but profile95 in native-tagged aiRIM/Food accepted it. With a
base vector1and public vector3rated LOVE, the server incorrectly returned1.6,
1sample and8confidence while the native client kept1,0samples,0confidence.
Development184already confirmed missing public sensory data may be default3.

The three bounded hunks in `_shared/matchrim-profile95.ts` pass the exact
native-v2 selection into row validation and reject that public canonical prefix
there. Rejection occurs before learning, without skipping latest/conflicting-row
resolution. Valid non-public bound evidence, strict numeric zeros, rating-date
weighting and owner-only database reads remain. Default/web/unknown model tags
retain their pre186outputs. No formula or historical score was changed.

This fixes the server-side counterexample locally; it does not repair source
sensory data, connect the master API or prove a current deployment is fixed.

## Verification

Local evidence root: `qa-artifacts/continuation186-20261023/`.

| Verification | Result | Receipt |
| --- | --- | --- |
| Before patch counterexample | RED0PASS/1FAIL; preserved | `red-r1/RESULT.json` |
| Current native learner |556PASS/0FAIL,50distinct synthetic profiles | `current-r1/RESULT.json` |
| Complete Food handler |104groups PASS;50profile prompts and50public-quarantine cases;0outbound | `food-r1/food-profile95-results.json` |
| Complete aiRIM handler |47/47PASS;50owners x ordinary/guided/special prompts;0outbound | `airim-r1/report.json` |
| Compatibility inverses |3exact whole-file restorations/7negative mutations; prior1853originals/9negative mutations PASS | `check-matchrim-native-compat186.mjs`, `check-matchrim-native-profile185.mjs` |
| Release/Food regression |Both selected suites PASS, external Node transports denied | `../continuation185-20261023/native186-regression-r1/RESULT.json` |
| Focused lint / diff check |0errors / PASS |9changed or new186scripts/helper; `git diff --check` |
| Clean-source native preparation |TypeScript/build PASS; fixtures=false, masterConfigured=false | `candidate107-r3/preparation.json` |
| Existing107artifact equivalence |164production resources,227isolated iOS files and all source fingerprints identical; signature reverified | `package-equivalence-r1.json` |

The compatibility adapters restore only exact, hashed historical source for old
source oracles. They fail closed on unrelated edits; new186tests execute the
actual changed helper independently. They do not change historical test outcomes.

Current checks cover eligible/ineligible bound evidence, decimals/zero/invalid
values, LOVE/OK/rejection, exclusion and foreign-owner attempts, immutable inputs,
mixed public/trusted rows, default-tag byte equivalence and server latest-rejected
revision behavior. They are offline synthetic handler transports, not a live
catalogue/vision run, a human preference study or new authenticated physical QA.

##107binary and visual evidence

Fresh clean-source107-r3 was built from58e9055. All164resources are byte-identical
to107-r2/d12ff0e; all227isolated iOS input files also match, including native config
and the generated build107project. The prior signed archive was reverified with
codesign and its bundle/build/resource bytes checked. It was not rebuilt/exported
or uploaded. The server implementation is tree-shaken from the client bundle;
the archive does NOT contain or activate the server patch.

Existing applicable evidence is retained, not falsely described as a new run:
UIKit normal/MAX2/2PASS and10inspected captures in
`../continuation184-20261023/uikit107-r1/RESULT.json`; production controlled
portrait320/393/root200flow and10inspected final captures in
`../continuation185-20261023/visual107-r3/report.json`.
Earlier r1/r2capture failures remain preserved. No unrelated green UI suite or
new phone session was repeated for identical native product bytes.

## Development reply and contract

At approximately18:32Europe/Madrid, actually refreshed only `goiko@winerim.com`
using Thunderbird's account-specific receive action. Matchrim subject and the
exact authorized sender `moa-winerim-b93a8ts9@agentmail.to` still show the12:43
Matchrim reply, with no newer API contract. Unrelated project messages were not
opened; Matchrim subject filter restored. No new email was sent this turn.

[Development184](MATCHRIM_DEVELOPMENT_REPLY_184_2026-10-23.md) and the13:08follow-up
remain authoritative: canonical API in development/unpublished, no committed
delivery date or examples; public IDs are restaurant/vintage rows, pagination
unstable and default sensory3/not-applicable0cannot establish measured attributes.
Reported312slug repairs are not independently revalidated here.17broad cases and
2malformed/mixed source cases remain OPEN. No new200-label benchmark was run.

## Minimal server delivery gate

Direct management metadata read `list_edge_functions` for project
`cbjynrbvrhcmpaojmqdp` was denied: MCP-32600, "You do not have permission to perform
this action", structured INVALID_ARGUMENT. This was not a new HTTP403receipt.
No deploy was attempted through a paid Lovable turn.

Only two entrypoints import the changed helper: `ai-wine-chat` and
`scan-food-pairing`. Minimal delivery is to read back and compare their deployed
sources first, then redeploy those two functions including the reviewed shared
file, without replacing unrelated files, changing config/secrets/database or
publishing the web. Do not assume repository entrypoints equal current deployed
entrypoints while readback is denied.

Shared-file before SHA256:
`d1d3ec837920db9ccdd72993e5020bb2dba1ca07c7ca61f4ad8271092c3acfe0`.
After SHA256:
`9339dc69de5fb72a38a7c1af46fa5dad4ff96f0eefce87724d608283a55f27e6`.
The exact rollback is the three-hunk inverse to a0bf1c5, not a whole-function
rollback over unknown remote changes. Deployment/version readback and affected
live checks remain required; the user has not granted fresh paid checks here.

## Residual and release decision

1. Native-v2 server sensory quarantine: locally corrected, deployment/live proof pending.
2. D4one-point v2tie: open internal task. A future native-only versioned scorer and
   corresponding initial-score validator must retain v1/v2history; changing
   Math.round globally would change web behavior and invalidate stored score24.
3.17broad+2malformed/mixed source cases, exact vintages, stable paging and per-axis
   sensory evidence: blocked on actual API contract and source validation.
4. Historical default/web/generic-Edge failures remain untouched, not green.

107release stays HOLD under the latest conditional authorization. A local signed
archive, identical UI bytes or synthetic green checks cannot substitute for these
gates. No TestFlight upload, main/public-web publication or deployed-backend
mutation occurred. Paid cap50starts/EUR15and the earlier24public-GET tranche are
not reset or expanded:0new model/photo/catalogue calls,0Lovable turns,0account or
rating writes this turn. Resource leases were owned/cooperative; no foreign
process/cache/app was stopped or deleted.
