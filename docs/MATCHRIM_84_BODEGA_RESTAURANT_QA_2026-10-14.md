# Matchrim84 native cellar and restaurant QA

Product source: `598dda8`, branch `codex/matchrim82-cloud-integration-20261013`. This block fixes native affinity history, feedback semantics and restaurant context. It does not approve recognition accuracy or human taste prediction. Production web/functions and the owner's installed82 remain unchanged.

## Cellar Behavior

| Previous risk | Implemented behavior |
| --- | --- |
| No affinity after manual/wishlist save | Resolve a complete canonical sensory sheet; record the initial estimate with actual time, profile and model |
| Old percentages treated as historical estimates | Never reconstruct an initial score from today's profile or an old numeric column |
| Only the rated wine appeared to evolve | Derive every visible current score and high-affinity filter from the fresh active profile |
| Home and scanner/cellar used different scorers | Native API recommendation results use the same local L2 model and original decimal profile; incomplete sheets are omitted |
| Inferred legacy attributes trained the palate | Native training requires confirmed catalog identity, a complete five-axis sheet and enabled feedback |
| Editing a rating re-enabled excluded feedback | Preserve explicit exclusion through edits, removal and re-rating; only explicit re-inclusion restores training |
| Rating decremented stock or assumed consumption today | Native rating does neither; rating time is recorded independently |
| Favorites/metadata made an old rating look recent | Learning uses `matchrim_rating_at`; unknown historical rating dates remain unknown |
| Mutable identity reused another wine's evidence | Identity and sensory signatures invalidate old provenance and initial scores; invalid new evidence cannot fall through to legacy menu evidence |
| Insert success hid missing sensory/history fields | Confirm owner-scoped readback of identity, sensory data and the exact historical trace |
| Native add form overflowed horizontally with keyboard | Fullscreen untransformed bounded grid, wrapped commands, safe-area padding and fixed44px close control |

The initial estimate is immutable while identity and sensory evidence remain the same. Legacy records can register a first verified estimate explicitly, dated now, not at the old creation date. Missing quiz or sensory sheet means pending, not a fabricated percentage. Five confirmed dimensions are supported; unavailable wood/intensity or other data are not invented. These client evidence signatures bind the saved fields; they are not cryptographic server attestations or approval to train a global model from user-edited metadata.

Native home, profile, conversation and guided pairing use the same verified training eligibility. This is not a claim that every historical anonymous/code-only server scoring path has been migrated. The public website keeps its existing layout and scorer.

## Restaurant Decision

Native aiRIM supports dish-to-wine, wine-to-dish and pairing review with optional restaurant, both supplied menu texts, explicit budget/currency and glass/bottle preference. Wine-menu and food-menu navigation carry bounded context scoped to the current account; owner changes discard it. Bodega adds the direct wine-to-dish action.

Detected menu text is an unverified transcription. Results separate names occurring in that text from outside-menu ideas. They contain qualitative hypotheses, not invented personal affinity, prices, stock, allergy guarantees or a compulsory three choices. Budget is intent, not price/availability proof. Cancelling prevents late UI updates; it does not certify remote billing cancellation.

Two initial real production anonymous text probes returned HTTP200: lubina to Albariño,4349ms; Muga Reserva to carrillera,2754ms. The second claimed personal tasting experience. The final prompt forbids that claim and the client rejects it. One final3672ms real canary returned two menu dishes, no personal-experience claim, and passed the new response contract. All three requests used explicitly fictional menus, no account/profile, and requested no data writes. These are culinary hypotheses, not tasted pairing validation.

## Real200 Image Benchmark

The restored quota allowed200/200 supplied images to complete against unchanged production vision72 and search75.493 new EdgePOSTs, all HTTP200, concurrency1, zero automatic retries;494 aggregate with the earlier preserved credit failure, within600. Helpers were frozen at33ef341, not reattributed to the new UI.

| Observation | Actual |
| --- | --- |
| Raw status classification |94recognized,96uncertain,9unrecognized,1deferred |
| Candidate absent |10 |
| Producer absent / marked inferred |72 /63 |
| Year absent |152 |
| Local canonical links / official fiche URLs |0 /0 in this three-function benchmark |
| End-to-end case latency |p50=9235ms; p95=16656ms; max=26061ms |
| Exact normalized pack-name agreement |40; this is not identity accuracy |
| Partial visual anchors |10/10 supported; two explicitly reviewed years correct |

The200 corpus comprises197catalog single-bottle images and3real single-label photos, without dense-display/menu/board/negative coverage. Pack labels are expectedSource, not full independent identity truth. Three tentative name proposals in two cases lacked visible support; one pack reference contradicted the visible product. No complete precision, recall or false-positive rate is claimed. Real wine affinities cannot be certified without canonical sensory links and a known profile. Original-fiche lookup is a separate partial API contract; no public URL is invented.

## QA Matrix

| Gate | Result and exact scope |
| --- | --- |
| Release/cloud/typecheck/lint/web build |PASS; lint0errors and106inherited warnings |
| New cellar contracts |10PASS, including no native invented consumption timestamp |
| Source/body integration and helper review |30/30 and12/12PASS; synthetic in-memory mutations, not SQL or human taste |
| Native API score parity |2/2PASS: original decimal profile and incomplete-sheet abstention |
| Browser regression |15/15phase groupsPASS, including overlays, list/profile lifecycle, reading, invalid-image recovery and30retention cycles; all app traffic intercepted |
| Restaurant mobile/web UI |36checksPASS in393x852,852x393 and1280x900; synthetic replies, no runtime errors/overflow |
| Real technical accounts |4new nonadmin accounts;195Auth/RLS checksPASS, existing100historical accounts preserved |
| Actual UI logins |All four real password logins, separate empty Bodegas and seeded profiles passed in the isolated native simulator |
| Real UI save |One synthetic catalog wine saved through the form; initial69 confirmed in SQL and screenshot |
| Actual UI evolution |Focused XCTest PASS:76 after rating,69 on removal/exclusion, rating edits preserve exclusion,76 on re-inclusion; cold reopen76/current and69/initial |
| Independent SQL readback |One frutal wine, one active sample, current76/initial69; other three Bodegas empty |
| iOS builds |Isolated native84 simulator and signed generic-device development buildsPASS; production archive/export and385signature/profile/resource checksPASS |
| Physical device |Read-only82 Bodega/Profile baselinePASS after cold launch; device went offline before QA84 installation |

The four accounts are synthetic technical personas: no quiz, frutal, structured and high-acidity. They are not four human testers. Admin-confirmed seed creation is not email-signup/terms acceptance QA. The existing100-person365-day study remains synthetic and was not repeated or relabelled as live use.

The first mixed UI run passed four-account navigation but failed the add-form workflow. Early login-tab/menu selectors and paragraph text-node assumptions were harness defects; receipts are preserved. Form overflow and transformed keyboard coordinates were real reproduced layout defects. A staging DATE column also exposed an implicit consumption-date write; native feedback now leaves that date alone. The final focused evolution command exited0. Production DB metadata access was denied; no schema was altered to disguise the staging difference.

## Build And Release Gate

`wine.matchrim.qa84`, display name Matchrim QA84, uses staging `qpbmqvfnunkylvtvnyyx`, schema `matchrim_qa`, real Auth and an isolated five-row synthetic catalog. Mocks and analytics are disabled. New `search-wines-qa84` v3 is cohort-restricted, SELECT-only, preserves synthetic metadata and calls no vision/LLM. Its33local and16compatibility checks passed. No existing function or historical account was replaced.

The physical owner's `wine.matchrim.app`82 was not replaced or logged out. Xcode/CoreDevice now report it offline. The staging app must never be uploaded to TestFlight. No public source push, hosted-web deploy, production schema/function change or new TestFlight upload occurred in this block.

Production candidate1.0(84) was separately built from clean product598dda8, archived and distribution-exported for `wine.matchrim.app`, SDKiphoneos26.0.385/385checks confirm signature, team, distribution profile, resource equality and anonymous production-only client configuration; no staging host, privileged JWT or fixture backend. IPA SHA256: `7ee6bac87d5fe5ffad3de5ecc9de9c06303b4bc91b1b7419d786c6890f28ca03`. It is not uploaded or physically QA-approved. The staged simulator binary is a different app/environment, not this production distribution IPA.

Next gates: reconnect/unlock the iPhone for focused candidate keyboard/Bodega/restaurant/camera/network/accessibility QA; adjudicate independent complete identities and dense/menu/negative scenes; establish reliable canonical sensory and original-fiche coverage; validate preferences on unseen actually tasted wines. External TestFlight invitation remains pending the existing external-review app credentials, not the owner's Apple password. No percentage of global product completion or human predictive accuracy is inferred from these checks.

Private evidence root: recovered task `artifacts/matchrim84-bodega-realqa-20261014`. Key folders: `benchmark-resumed`, `accounts`, `review`, `restaurant`, `cloud-browser-r1`, `gates-final-r3`, `native-qa-r8`, `candidate-final`, `physical/accounts84-sim-r9/attachments`. Credentials, supplied photos, raw responses and archives stay outside Git.
