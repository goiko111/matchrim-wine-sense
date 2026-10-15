# Matchrim 1.0 (85): video and QA87 remediation

Status: corrected beta1.0(85) uploaded successfully; Apple reports package
processing. Installable availability and tester-group assignment are not yet
verified. The scoped native regression is3/3PASS. This is
QA88 evidence, not build88. The owner's latest instruction explicitly authorizes
fixing the supplied videos and uploading the corrected TestFlight. No owner
phone, public web deployment or hosted-function deployment is part of this delta.

Product corrections: `e2a32d8`; native presentation delta: `bbdad72`.
Final production candidate and single-text-node counter source:
`c0fcfb33d1b50505d12a71078fb5641e02c98d99`.
Historical QA85/QA87 evidence and datasets are retained.
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
| Native question counter is fragmented in accessibility | WKWebView AX exports four separate labels: Pregunta,1,de,5 | One template-string text node retains the same visual text; native question/reset assertionsPASS |
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

After the native-only text/provenance delta, the browser, simulator and final
distribution snapshots match328 tracked application/public/shared files at
`bbdad72`:984/984 hash comparisons. Final browser application-tree fingerprint:
`b7e3487c700f026619166e4f8f0f734c4fe7ee46482442666a52d46d89caf92d`.
The two accounts selected for native QA also repeated their browser password UI
journeys on that presentation source:31/31 checksPASS, zero writes. This is a subset rerun, not52
different accounts or another50-account study.

| Gate | Result and boundary |
| --- | --- |
| Release/cloud contracts, typecheck and web build |PASS; source unchanged during the gate |
| Lint |0errors,106 inherited warnings; not warning-free |
| Focused contracts |Profile154/154, occasion33/33 including inert text/provenance and coherent counter, recorded-menu66/66PASS |
| Video UI |17/17PASS, portrait393x852, landscape852x393 and small320x700; controlled SSE, not fresh AI |
| Recorded images |Four unchanged input scenes, eight views,25 historical reply deliveries; no page errors/overflow, not fresh recognition |
| Simulator build |Isolated `wine.matchrim.qa85`1.0(85), staging schema; unsigned simulator buildPASS |
| Actual native UI |R4 three testsPASS, zero failures/skips; profile fractions/raw quiz zero, compact explanation and pending identity, occasion questions/back/reset, portrait/landscape and scoped AX dynamicType/textClipped audits |
| Production archive/export |`wine.matchrim.app`1.0(85), SDKiphoneos26.0, distribution exportPASS |
| Export verification |388/388 signature/profile/native-resource/production-config checksPASS; no staging host, fixture backend or privileged JWT |

Production IPA SHA256:
`4614e1e12a3515af8deaa177775aac81332b57afb7184490eeed9c3822aea0b6`.
Final native, browser and distribution snapshots at `c0fcfb3` match328 files:
984/984 comparisonsPASS. Browser application-tree fingerprint after the counter
fix: `532ab82ac9ca0e1b2e05497070a20280bef94985c515b785bc8cb1a0d08261c8`.
The final exported IPA is in private `candidate-final3`, not the earlier signed
candidate-final/final2 artifacts. All three archives remain unmodified evidence.
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
delta replays this unchanged response without another paid request:20/20 UI
checksPASS, including the three original suggestions and conclusion, cleaned
text, explicit source caveat and three viewport sizes. One earlier replay failed
because its question-loop variable overwrote the answer fixture with the budget;
that harness failure is preserved, not described as a product correction.

Four bounded harness attempts are kept separate: two stopped while the harness
awaited stream drain (request outcomes not captured), one prematurely selected
the always-present New query button and therefore only captured pending state,
and the fourth correctly waited for the answer region. At most four real chat
POSTs; only the last is complete UI evidence. No model retry loop was introduced.

Native r1 failed3/3 tests before reaching the intended assertions: incorrect
scroll direction and contaminated shared-clipboard credential entry. The runner
now uses simulator-local keyboard entry and validates email without printing it.
Native r2 then failed3/3 on a stale seeded-state assumption: it searched Wishlist
for an identity-pending wine that prior authorized rating journeys had already
moved to Tasted. Actual authenticated readback confirms `status=tasted` and the
same account-specific marker; no data reset or assertion removal is used.
R3 repeats the same three tests against the current persisted classification.
R3 reached the profile-value checks successfully but failed on a noninteractive
meter's hit-test requirement, an exact region label lacking iOS's spoken region
suffix, and the real fragmented question-counter AX text. Native R4 separates
visibility from clickability, binds the wine region with its native suffix, and
checks the corrected single-text-node counter. Every prior failure is retained.
No failed run is counted as productPASS or silently erased. R4 then completed
all three tests successfully on the owned simulator at10:27:14UTC, frozen source
`c0fcfb3`, build85. Ten exported native screenshots and AX attachments preserve
portrait/landscape profile, raw zero, compact explanation, identity abstention,
question5 and gift restart at1. The corrected counter is one accessible text.
Representative source-matched screenshots were visually inspected. Native test
duration includes runner setup, gestures, audits and waits; it is not app latency.

The native occasion test deliberately stops before the final budget, so it makes
no live AI submission. Native pending/empty/retry scenarios remain covered by
the separate controlled browser tests, and live production answer handling by
the anonymous canary; this does not certify every native network failure or
spoken VoiceOver. A successful archive/upload is not proof of those wider gates.

## Apple Delivery

Authorized upload completed2026-10-15 at12:28CEST/10:28UTC. Xcode reported
`Uploaded App`, `EXPORT SUCCEEDED`, `Uploaded package is processing` and
`Upload succeeded`; exit0. This used the validated final3 production archive,
not the staging simulator or earlier final/final2 IPA. Delivery receipt and log
are private `apple-upload-r1/receipt.json` and `apple-upload-r1/upload.log`.
The stored Xcode account authenticated successfully despite an expired web
session; no additional Apple login was necessary for the upload.

Apple processing completion, installation from TestFlight, internal automatic
group assignment and the historical external invitation/review are NOT_VERIFIED
here. Do not claim the external tester received a new invitation or that85 is
already installable. No public App Store submission, source push, web/backend
deployment or owner-phone operation occurred.

Nonblocking Apple warning: the current iOS14 minimum must become15 or later for
uploads starting April2027. No deployment-target change or device-support
removal was made just to silence this future requirement.

Final private evidence: `gates-r4-accessibility`, `profile-final-50-r1`,
`profile-visual-two-r2`, `occasion-accessibility-final-r4`, `image-final-r1`,
`menu-field-audit.json`, `cloud-full-r1`, `native-ui-r4/execution-r1`,
`source-parity-accessibility.json`, `candidate-final3` and `apple-upload-r1`.
