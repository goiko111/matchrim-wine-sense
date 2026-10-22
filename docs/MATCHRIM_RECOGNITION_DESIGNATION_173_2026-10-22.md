# Native recognition designation regression 173

## Real defect found during172 review

The retained Apple Vision receipt for `img-060` reads `BERTANI`, `AMARONE`, and
`DELLA VALPOLICELLA`. In a deliberately MANUAL expanded-page review, the existing
ranker proposed public ID236950, `Bertani Valpolicella`, despite omitting Amarone.
The row is preserved in `public-browse172-r1/REQUESTS.json` and its hash-verified
body. It was outside the initial twenty rows, not a scored automatic112 success.

Expanded browsing also makes ID376594, `Amarone della Valpolicella Classico
Riserva`,2015 accessible on Bertani page4. This does NOT identify the photographed
bottle: Classico/Riserva and2015 were not established by that photo. The existing
ranker still abstains from that more specific identity. No detail confirmed or
wine saved during this inspection; expected filenames were never query inputs.

## Fix

Extend the existing native visible-qualifier gate for complete standalone lines
`Amarone`, `Recioto` and `Ripasso`, including their explicit Valpolicella forms.
The proposed reference must preserve the observed designation and any observed
Classico/Superiore/Riserva qualifier. DOC/DOCG typography and the connector
`della` do not create a name mismatch. No fuzzy spelling or added vintage.
Brand/prose lines such as `Amarone Cellars`, partial words and mixed/slash lists
are not silently promoted to designation evidence. Existing cru/climat checks
stay intact. No wine-name or fixture-identity dictionary.

These are distinct wine categories in the
[Consorzio's primary classification](https://www.consorziovalpolicella.it/en/types-of-wines/).
The guard is a retrieval safety constraint, not legal or sensory certification.

## Verification and boundaries

- New five-group test first failed against the original gate, then passes,
  including hash-verified real060/236950 regression.
- Existing proposals10414 groups, global10317 groups/50 synthetic profiles,
  master10214 groups/50 synthetic profiles, appellation1206 groups PASS.
- Source change is native-only `nativeWineQualifier102.ts`, already shared by
  native ranking, lookup and native scanner admission. No web deployment.
- Full200 replay and fresh final build/native saved-affinity check pending at
  this product checkpoint; results will be appended rather than inferred.

##172 native verification (product `c863a52`)

`browse172-r4` PASS on actual installed candidate105-r7. Resident QA account,
attested gallery image/local Vision, literal manual Campillo query,20 ->40/112
through the actual server-page button; no selection, auth, save, rating or model
controls requested. Apple contrast/description/clipping/trait audit: zero issues
in current viewport, none suppressed. Next40 PNG and AX manually reviewed.
Not all112 browsed in this native test; the separate public retrieval trace did.

Original failed harness runs retained: r1 omitted child AbortSignal; r2 had a
Swift XCUIElement-vs-query compile error; neither reached the app test. r3 reached
the actual first20 but expected a combined AX string; WKWebView exposes four text
nodes. r4 checks those exact four nodes under the same direct paragraph parent,
not a guessed combined label. Original failure screenshot also inspected.

Conservative free reservations:295 ->335/400 (four10-GET native reservations,
including failures; none reclaimed). CLI360 plus one earlier public image remains
the instrumented count; app ordinary/public background reads are not packet-level
instrumented. Paid50-request/EUR15 cap unchanged; no model controls requested,
no Lovable agent turns, no web/main publication, no TestFlight.

## Final173 verification

Product freeze: `3b0d5002e38fc1eba5f81b2094011da41fc32a87`. No product changes
after this commit. Added a sixth test group proving an omitted designation is
rejected before any public GET, while a correspondingly qualified control can
query. All six groups PASS, focused lint PASS. No expert precision claim.

Full200 r14: source integrity true,443 retained cache reads,0 misses/newGET/models
or uploads; unchanged151 evaluable,49 incomplete,7 abstentions,40 proposal lists,
32 top1/34 top3 proxy hits,6 lists without expected. No scene predictions changed
from r13: the newly caught false proposal was in expanded manual browsing, outside
the unchanged automatic first-page bound. No recognition gain is manufactured.

`candidate105-r8/preparation.json`: clean3b0d500, app typecheck and native asset
bundle PASS. `uikit105-r8/RESULT.json`: compile/install PASS07:38:29UTC, simulator
settings restored, fixtures=false, masterConfigured=false. No archive/sign/export
or upload. Identical Swift executable is expected; JS/plist/config fingerprints
and installed production asset bytes independently verified.

`continuation161-20261022/manual164-r8/RESULT.json`: current candidate PASS at
07:40:31UTC. Actual attested gallery photo/local Vision -> explicitly MANUAL
Flor de Muga Blanco query ->2022 selection -> independent fiche -> resident saved
`love` primary and69/100 style comparison. Five named profile/wine axes read back;
current-viewport Apple accessibility issues0, none suppressed. Final
`21D5E15F-FE6B-42AC-8B51-3B0772E8989B.png` visually inspected. This is not
automatic identity, photographed vintage, canonical-ID equivalence, new-save
persistence or taste-accuracy validation. No auth/save/rating/model controls.

Original EUR15/50 paid-request ceiling unchanged. Instrumented public GET count
CLI360 + one earlier public image; no further CLI catalogue probes after172.
Conservative free ledger345/400,55 remaining, including a10-GET reservation for
final native manual check; app public/background traffic is not packet-instrumented.
Additional read-only code searches in bridge-to-winerim/winerim-flow returned no
indexed contract; that does not prove an absent backend. No new API/model key is
needed for the already-working public catalogue.

## Remaining gate

The49 automatic incomplete scenes remain28 broad,19 unavailable and2 involving
malformed rows. Do not subtract four fully browsed query sequences from49. The
catalogue error needs a server-side diagnosis of the demonstrated Braida request
and its exception, plus valid slugs for IDs362891/363580; the public API currently
does not expose enough diagnostics to repair those rows from this native client.
Never replace a500 with no-match or repair a slug by guesswork.

Internal work remains on grounded automatic query allocation and recognition;
manual browse/refinement does not close that gate. No TestFlight. Protected CSS
and search-wines remain byte-identical todb6a181; no web/main or backend deploy.
