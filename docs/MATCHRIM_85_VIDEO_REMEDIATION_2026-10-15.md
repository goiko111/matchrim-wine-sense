# Matchrim 1.0 (85): video and QA87 remediation

Status: product corrections committed and distribution candidate verified;
native regression and Apple upload receipts are still pending below. This is
QA88 evidence, not build88. The owner's latest instruction explicitly authorizes
fixing the supplied videos and uploading the corrected TestFlight. No owner
phone, public web deployment or hosted-function deployment is part of this delta.

Product source: `e2a32d8`. Historical QA85/QA87 evidence and datasets are retained.
Private evidence root in the recovered task:
`artifacts/matchrim88-remediation-testflight-20261015`.
Raw videos, images, account credentials, responses and binaries are not in Git.

## Corrections

| Finding | Before | Correction and measured after |
| --- | --- | --- |
| Occasion result appears empty | Supplied video1; baseline renders an empty success card during a pending request | Accessible pending/error states, explicit retry and nonempty plain-text fallback; controlled video regression17/17PASS |
| Back leaves an old loading state and question index | Supplied video2; baseline gift opens at question5 with the previous loading state | Request generation, AbortController, owner/route lifetime and full reset; new occasion starts at1 and stale response is ignored |
| Stream errors look like success | Empty/truncated/error responses can leave an unusable result | Bounded90s operation, SSE framing and completion validation;31 transport/state contractsPASS, no automatic paid retries |
| Real generated answer reads as raw Markdown and implies verified data | Live production response contains heading/bold markers and unverified reference/price claims | Native-only inert text cleanup and explicit AI/catalog caveat; no HTML, active generated links, remote images or new dependency |
| Native Profile contradicts current affinity |31/138 scores disagree with reconstruction from the visible graph; max9points | Actual rendered chart preserves0..5 and decimals;138/138 numeric reconstructions agree,62/62 unavailable cases abstain |
| Compact Bodega hides missing data |138 missing-data assertions fail; default65% identity appears without measured identity confidence | Sources and missing wood/intensity are visible; linked catalog identity is qualitative, not invented OCR confidence;138/138 disclosure checksPASS |
| Cropped menu rows inherit unsupported prices | Six unsupported amounts among eight right-column rows | Conservative price grounding with visible uncertainty;0 unsupported amounts among six retained right rows;10/10 readable left pairs retained |
| Duplicate partial menu readings | Rose/Rosado and Costa prefix readings become separate rows | Same-region/source duplicate grouping with conflict guards;18->16 rows in the unchanged recorded case, no upgrade to canonical identity |

No taste weights, quiz images, scoring formula, provider prompt, catalog or
hosted function changed. Menu source text is a model assertion, not independent
pixel proof. Conservative price filtering can withhold a real unlabelled amount;
manual correction remains necessary. Uncertain duplicate grouping clears any
canonical identity, sensory attributes and derived affinity rather than inventing
certainty.

## Verification

The same50 isolated staging technical accounts are not50 humans. All use the
real password form and existing records; no auth injection or new accounts.
The independent browser oracle reconstructs affinity from the rendered profile,
not an internal helper. Final679PASS/0FAIL versus baseline510PASS/169FAIL:
50 logins,50 visible profiles,200 current/abstention checks,138 detailed
explanations,138 missing-data disclosures,50 unchanged wine/quiz datasets,
50 logouts and three source/runtime/scope guards. There were93 bounded catalog
reads, zero data mutations and zero page exceptions.

The browser snapshot was frozen before the product commit; its runtime files
are the corrected working tree, not the unmodified base `1f116d2`. Source-tree
fingerprint `76cf87663a7be1a9151ca0bee24e2f50bcd0ac3e049f1cad1205ce8364b28f51`
is retained in the snapshot manifest. The distribution source is the clean
product commit above.

| Gate | Result and boundary |
| --- | --- |
| Release/cloud contracts, typecheck and web build |PASS; source unchanged during the gate |
| Lint |0errors,106 inherited warnings; not warning-free |
| Focused contracts |Profile154/154, occasion32/32 including inert text/provenance, recorded-menu66/66PASS |
| Video UI |17/17PASS, portrait393x852, landscape852x393 and small320x700; controlled SSE, not fresh AI |
| Recorded images |Four unchanged input scenes, eight views,25 historical reply deliveries; no page errors/overflow, not fresh recognition |
| Simulator build |Isolated `wine.matchrim.qa85`1.0(85), staging schema; unsigned simulator buildPASS |
| Production archive/export |`wine.matchrim.app`1.0(85), SDKiphoneos26.0, distribution exportPASS |
| Export verification |388/388 signature/profile/native-resource/production-config checksPASS; no staging host, fixture backend or privileged JWT |

Production IPA SHA256:
`fcc4ebb3e587c36c52c284e465a873993768dafa09247cd3c71fdfbce6ebd45b`.
Production backend remains `cbjynrbvrhcmpaojmqdp`, existing vision72/catalog75/
affinity73 aliases. Staging is a distinct app/environment, not the exported IPA.

The active cloud source guard explicitly recognizes these reviewed client
changes while continuing to verify the historical manifest and unaffected
sources. Three optional historical Oct13 frozen-scope scripts still report
source mismatches because the reviewed menu resolver was deliberately changed;
their functional assertions pass. Their old evidence is not rewritten or called
green. They are not the active release/cloud gate.

## Residual And Release Boundary

This is a corrected beta, not certification of recognition or human taste
accuracy. Existing canonical/sensory/original-fiche gaps, deferred dense-scene
regions, model malformed-JSON500, food-menu fusion/omissions and independent
human taste outcomes remain open. No formula was tuned against synthetic tastes.
Full spoken VoiceOver, real camera, native RAM/thermal and physical network
interruption remain a later owner-device gate. Existing actual simulator/quiz/
learning evidence stays historical; this delta does not claim50 new mutation or
image-upload journeys.

The full controlled15-phase suite passed, including30 retention cycles and its
regression guard. The real anonymous production occasion canary completed with
HTTP200/SSE, three suggestions, no page exception or horizontal overflow,
28.650s until the visible answer. It is one general occasion, not personalized
human taste validation or verified Winerim inventory. The later presentation
delta will replay this unchanged response without another paid request.

Four bounded harness attempts are kept separate: two stopped while the harness
awaited stream drain (request outcomes not captured), one prematurely selected
the always-present New query button and therefore only captured pending state,
and the fourth correctly waited for the answer region. At most four real chat
POSTs; only the last is complete UI evidence. No model retry loop was introduced.

Native r1 failed3/3 tests on navigation/reachability/session assumptions and is
under triage; it is not counted as productPASS or silently erased. Final native
regression and exact Apple receipt will be appended after completion. Do not interpret a successful archive
or an upload attempt as TestFlight availability or external tester approval.
