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
