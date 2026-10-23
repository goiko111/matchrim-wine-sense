# Matchrim107: versioned native affinity187

Updated23October2026,19:31Europe/Madrid.
Branch: `codex/matchrim82-cloud-integration-20261013`.
Product: `1b137ae`, corrected visible copy `d820c9d`, persistence compatibility
`04569dc` and default native readback `617e59c`.
Extended current-model tests: `eb14faf` plus617e59c. Same branch, no main merge.

## What Changed

The actual D4rounding defect is now closed for the selected native calculation.
Marked0-5attributes use `scan-local-rms-0to5-v3` on native platforms, resolved at
call time. Its equivalent expression is `round(92.5 - 17 * sqrt(sumSquared / 5))`.
The retained all0profile/all4wine case now gives25, while explicit historical v2
still gives24. No arbitrary epsilon or broad near-half snapping was introduced.

- Web/default marked inputs remain v2; unmarked inputs remain v1. The actual
  complete service's web output was compared to the pre187source for50profiles.
- Initial v1/v2snapshots validate with their own stored model and retain their
  original value/date/profile. New marked native saves record version3/modelv3.
  JSON roundtrip, wrong-model/wrong-score and edited-identity controls pass.
  The later compatibility patch retains a v2snapshot in the original key and
  adds the v3snapshot in `matchrim_affinity_initial_v3`. They must bind the exact
  same identity, attributes, profile, date and phase. Actual pre187reader/writer
  preserves both keys even after another profile update; it does not delete the
  native history as an unknown format. Invalid/missing/divergent v3companions
  cannot be acknowledged as a successful native save.
- Cross-model deltas are suppressed: an initial24/current25 does not become a
  claimed taste-learning improvement of+1. Native Bodega explains in plain
  language that the calculation changed and the initial score is preserved.
- The score resolver is shared by scanner, menu, catalogue, restaurant and
  recommendation consumers. The recommendation service stamps the matching
  model; native recommendations reject stale model/score combinations.
- Public sensory quarantine is retained when reading, learning or creating
  native affinity snapshots. Reference-style-v1validation remains explicitly
  legacy and its public-data quarantine is not relaxed.

NativeAppHome was deliberately left unchanged: its old label expression is in
the nonnative return after the early native98return. No web UI, CSS, main branch,
database, secret, backend deployment or publication was changed.

The historical930PASS/101FAIL report remains immutable. This fixes the selected
native D4path; it does not rewrite the old D4result or repair the default web and
generic-Edge modules intentionally outside this native-only change. The local
server-learning correction58e9055from186still needs deployment separately.

## Executed Tests

Evidence root: `qa-artifacts/continuation187-20261023/`.

| Gate | Actual Result | Evidence |
| --- | --- | --- |
| Current scorer and persistence |13groups PASS,7,776integer vectors against an independent squared-threshold oracle,300decimal vectors against an exact hundredths oracle,12near-half controls, actual old-reader/writer compatibility and default native companion readback | `scorer-r9/RESULT.json` |
| Native profile workflows |50distinct synthetic profiles: recommendations, label, menu, save and reprofile consistent; zero real accounts/writes | Same receipt |
| Complete current recommendation pipeline |50native profiles x3raw-score/order variants;50exact web comparisons against prior source; typed-ID tie order and current models preserved | Same receipt,200comparisons; only in-memory transport |
| Historical ordering oracle |Exact hashed v2projection, frozen assertions retained; new v3tested independently with its actual platform dependency | `scripts/native-affinity187-scope.mjs` and same receipt's mutation controls |
| Release/consumer regression |Both PASS again on final617e59csource | `../continuation185-20261023/native187-regression-r4/RESULT.json` |
| Closure regression |PASS on d820c9d; unchanged UI/navigation source not rerun for the later persistence-only follow-up | `../continuation185-20261023/native187-regression-r2/RESULT.json` |
| Bodega production-bundle visual |Final617e59c3/3PASS:393/320portrait and200%root text; current25, original24, explanation, no false+1;0page/console errors/unexpected calls/writes; personally inspected | `visual-affinity-r3/RESULT.json` |
| Scanner production-bundle visual |d820c9d10captures PASS, personally inspected: privacy, gallery replay, uncertainty/no invented affinity, photo, correction, footer,320/393andMAX. Unchanged screen/selection logic, not rerun for persistence-only follow-up | `visual-scanner-r1/report.json` |
| TypeScript/native bundle |PASS, final clean-source617e59c,164production resources; fixtures=false/masterConfigured=false | `candidate107-r6/preparation.json` |
| Actual iOS compile/install |Final617e59cbuild/install PASS,164resources checked/settings restored; build-only, no new navigation claim | `uikit107-r3/RESULT.json` |
| UIKit normal/MAX smoke |d820c9d2/2PASS;10captures personally inspected/settings restored; same native executable/config fingerprints in final617e59c. Not an authenticated persistence E2E | `uikit107-r2/RESULT.json` |
| Signed Release archive |Final617e59cPASS19:28:55Europe/Madrid, codesign verified,164resources; no export/upload | `archive107-r3/ARCHIVE-RESULT.json` |
| Focused lint/diff |0errors/PASS | Changed187files, ESLint and `git diff --check` |

The native binary uses bundle `wine.matchrim.app`, version1.0(107), team
`8X3XTD6XYX`. Simulator installation is isolated as `wine.matchrim.qa99review`.
The final archive is `archive107-r3/Matchrim107.xcarchive`, source617e59c.
The earlier185archive and187archive-r2are retained intermediate products, NOT
the final compatibility candidate. The server-learning patch still requires its
own deployment; no local archive activates it.

The50profiles are synthetic, not50people or confirmed preference accuracy. All
new service/database/model boundaries in profile and browser tests are controlled
in memory. The photo is an already stored local image shown under an explicitly
synthetic test identity, not a newly recognized wine. UIKit tests are anonymous
navigation/keyboard/scanner smoke, not authenticated cellar saves or live vision.
No new200-image recognition metric, physical-phone or spoken VoiceOver approval.

## Retained Failures and Visual Review

- Regression-r1consumer/closure failed because the old whole-source oracle saw
  the new model metadata. The ordering reader now projects only two exactly
  hashed files to pre187bytes; mutations fail closed. All original ordering
  assertions remain, and actual v3runs separately. The web-only Home label edit
  was unnecessary and removed before the final product.
- `visual-affinity-r1` mechanically passed but personal screenshot review caught
  literal `\\u00e1` in JSX visible text. That run is NOT accepted visual evidence.
  d820c9dcorrects it; r2also asserts the actual accented word and absence of
  escaped Unicode in rendered text. All3corrected captures personally inspected.
- `scorer-r4` failed because the added synthetic recommendation omitted its
  required0-5scale marker. The positive fixture now includes the marker, just as
  the actual recommendation normalizer does; missing-scale rejection remains.
  Final r9includes all expanded tests and backward-reader/writer compatibility;
  earlier receipts are retained unchanged.
- The initial single-keyv3prototype would have been unreadable to older clients.
  The two-key patch retains their v2snapshot and binds the v3companion to the same
  original event. A later readback correction makes default native MyWines
  comparisons reject a dropped companion; malformed companion acknowledgements
  also fail closed. Both defects were found before release, no real user writes.

## Contract and Deployment Follow-Up

Scoped Thunderbird refresh at approximately18:54and19:30Europe/Madrid: only
`goiko@winerim.com` refreshed. Matchrim subject and the exact authorized developer
sender still show the12:43reply, no new canonical API contract. Sender subject
filter restored; no inference that the API is already published.

One direct Supabase management list read again returned MCP-32600permission
denied for `cbjynrbvrhcmpaojmqdp`; no deployment attempted through Lovable and no
credits consumed. This is not a newly measured HTTP403or proof that every possible
owner channel is unavailable.

At19:16Europe/Madrid, replied in the existing Matchrim development email thread,
from `goiko@winerim.com` to `moa-winerim-b93a8ts9@agentmail.to`. Verified in Sent:
recipient, subject, timestamp and body. Sent the shared-file commit58e9055,
before/after SHA256, the two importing functions (`ai-wine-chat`,
`scan-food-pairing`) and asked for an already authorized free readback/deployment
channel. Explicitly no Lovable credits, configuration/secrets/database/main/web
changes, paid checks or account writes; stop if cost/foreign overwrites required.
No images, credentials or raw private logs attached. No delivery/read/reply claim.
Inbox returned to the Matchrim filter; final19:30check of the exact sender and
Matchrim subject still shows12:43as latest received reply. No new contract or
deployment receipt has arrived.

## Remaining Release Gate

1. Obtain deployed-source readback and deliver the186native-only learning patch
   through a valid free channel, then verify affected versions/behavior within
   authorization. Local green source is not a live backend correction.
2. Receive the actual canonical API contract/examples and validate exact vintages,
   paging and per-axis sensory provenance.17broad+2malformed/mixed cases remain
   open, despite the developer's unverified report of repaired source slugs.
3. Close affected live integration/recognition gates before uploading107under the
   current conditional authorization. No limited-beta waiver was inferred.

No TestFlight upload. No paid/model/photo/catalogue request, Lovable turn, iPhone
operation, real-account/rating write or main/public-web publication this turn.
The50request/EUR15cap and prior24public-GETreservation are unchanged, not reset.
No source slugs, canonical identities, vintages or sensory data were invented.

Resource leases used cooperatively: heavy `24334d98-393c-499a-ab06-6eb61ead5a21`,
simulator `d22d9be6-8456-4ffd-924d-10b49e331d17`; writer first
`055824f5-a669-49d1-8779-fb761c26bb9b`, then
`b95aa7d5-eca6-4062-ada8-88c7b025aebc`; desktop
`e38165bf-919a-46dd-a3ce-32b73fad3155` and
`cb2ec138-d792-45ea-9e58-2afaae350183`. All heavy/desktop/simulator leases released
after own operations; final writer `5a24eb0b-a1d5-491a-8bb0-9b3790a24a4d` only
for this checkpoint. No foreign lease/process/app/cache was stopped or removed.
Persistence follow-up used heavy `df1650d5-49d7-4c6a-87d2-52be0d093182`, simulator
`6816e950-5da5-4c96-b7af-f7d18f10bf3c`, writers
`eb1a8293-bf92-440e-b4a3-b505684a15da` then
`ce7c2308-558c-4004-a66a-a01e8828746f`, and final mail-check desktop
`1ab29a06-edf3-4012-a19a-e2a6132ea92c`; all released after own operations. Final
checkpoint writer is `cfb1c8fe-e9e6-44e7-9e37-46d08e947bda`, held only through
documentation/commit/push. No active build/render/test sessions remain.
