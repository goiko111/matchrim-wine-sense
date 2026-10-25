# Native210: explain why affinity is unavailable

## Implemented Delta

Native scanner list and selected-label detail now consume a structured reason,
not just an unexplained pending state. Existing score/identity/vintage authority,
formula, saving, personal ratings, lookup transport and web UI remain unchanged.

| Before | After | Why |
|---|---|---|
| Same pending label for different failures | Six explicit reasons: identity, fiche link, vintage, profile, sensory data, stale/unbacked score | Explain the actual missing prerequisite |
| No reason in the native wine list | One short cause beneath affinity status | Make the outcome understandable before opening details |
| A linked fiche can look like an unidentified wine | Explicitly says wine was found, but sensory evidence is missing | Catalogue presence and data quality are different |
| Existing but incomplete profile has no test action | Test action also follows the structured profile reason | A truthy profile object need not be complete |
| Stale calculation asks to reconsult without a direct control | Review-fiche action delegates to the existing details handler | Do not promise a calculation or external search that is not connected |

No new automatic catalogue reads, consent, photo transmission or external research.
No visual recognition engine has been implemented by changing these messages.
The actual 207photo still has an unreliable cursive reading; its replay remains
unidentified and without affinity. Its source pixels stay private/outside Git.

## Focused QA

- `check-matchrim-affinity-gap210.ts`: 12checks PASS including actual207macOS OCR
  replay (explicitly adapted, not device execution), manual/linked/missing sensory,
  injected unsupported vector, missing/partial profile, stale score, original zero,
  retained public vintage cases and immutable inputs. All network transports are
  injected retained responses; global live fetch throws.
- Same test validates complete scanner AST projection with native disabled against
  3edb136 and LabelAnalysisView's exact legacy early return. No web behavior change.
- Affected confirmed-catalog adapter regression: 8groups PASS. Full application
  TypeScript and focused ESLint PASS before final isolated candidate preparation.
- Mobile Chromium actual LabelAnalysisView: visual-r1 10checks, visual-r2 6checks,
  visual-r3 2checks; zero console/page/outbound-request errors. Width320 normal and
  width393 at root200%; touch targets, horizontal bounds, reachable controls,
  correction delegation, fiche action delegation, profile route and private photo
  rendering checked. Browser/server closed after each run.
- Personally inspected r1all normal views and unchanged link/profile MAX, r2all6
  action views, r3both identity views. r1identity's manual-source fixture caption is
  superseded by r3's actual label-source caption; no product identity was promoted.
  r2supersedes sensory/score actions and checks truthy partial-profile navigation.
- This is not full scanner E2E, UIKit, VoiceOver, real account/rating evolution,
  image-to-canonical recognition or TestFlight readiness.

Failure history is not reclassified: first unit global fixture had confidence0
and correctly failed catalogue admission; fixed the fixture, not admission.
UNIT-r2 showed an AST test difference from a newly inserted false JSX child, not
a web render regression; projection now removes nonrendering false/whitespace
children. UNIT-r3/r4 PASS, prior logs retained in qa-artifacts/affinity210-20261025.

## Development Rev3 Received And Replayed

Cached authorized reply dated25Oct09:35:30Madrid, UID15803, message
010001a172335bec-9919f2c4-8a1c-4588-8df4-b4b0420efa64, directly answers our verified
09:30mail. Primary text/five exact MIME attachments/hashes preserved in
qa-fixtures/master211. No fresh-server completeness claim and no attachment code
executed. The developer explicitly says proposal only, NOT deployed.

`check-matchrim-sensory211.mjs`: 46provided cases PASS in Ajv6draft07 and independent
X1-X8:9valid,23schema negatives,11cross-field negatives,3positive mutations. Checks
the specified error keyword/path for confidence bounds and exact cross-rule code.
R207-1 undeclared vintage now rejected by X8; R207-2 confidence-10 rejected with
minimum at the correct path.0/1confidence boundary positives accepted. First run
miscompared slash paths to dot paths in our harness; corrected, both logs retained.

Shared pure review functions are exported from207; direct-execution guard prevents
rerunning its old green suite when211imports them. No app/backend adapter uses
this proposed sensory contract. Passing supplied cases does NOT approve the full
contract, stored production confidence ranges, per-axis origin or numerical affinity.
Developer says old stored confidence range remains unchecked; no new reads allowed.

## Next Recognition / External-Facts Contract

Requested user behavior is still open, not silently replaced by this UI delta:

1. OCR is one signal. Narrow catalogue candidates using independently observed or
   user-confirmed producer/region/name/grape/vintage, never a guessed origin from
   PinotNoir2023. Complete/partial candidate retrieval must be explicit; taking the
   first15rows from a broad search is not proof of absence.
2. Visual comparison needs actual catalogue label images bound to canonical IDs,
   image revision/hash, vintage scope and source. A candidate must belong to the
   retrieved pool. Similarity is not calibrated identity confidence; ambiguity,
   duplicate label designs and absent candidates require abstention/human review.
3. Crop bottle/label locally before any separately authorized provider upload;
   do not send the bystander/background. No new image/provider call is authorized.
4. If Winerim lacks sufficient sensory facts, research can use external sources,
   preferably producer/technical sheet, with exact reference/harvest, source URL,
   extraction time, original units and per-axis evidence. A label match does not
   authorize a generic grape/region vector or default3values.
5. Keep verified fit, supported estimate and insufficient evidence distinct.
   Map qualitative descriptions only by a versioned, tested rule and mark them
   inferred; retain missing fields and conflicts. Never advertise a precise
   probability of liking from OCR/provider confidence. Existing user ratings stay
   separate and owner-bound; no synthetic scores/ratings in a real account.
6. Existing catalogue/image/credit caps remain exhausted/unchanged. Need verified
   backend contracts, catalogue-image coverage and an authorized deployment/read
   channel before activating these stages. No dummy endpoint, first15shortcut,
   proxy bypass, mock-backed TestFlight or web/main mutation.

These capabilities must be requested from development as existing contracts/
coverage only; no implied permission for new service deployment or paid indexing.

## Build And Release Gate

New local native candidate109preparation is the next step after the source commit.
108and signed107remain unchanged. No TestFlight upload or production/web/backend
deployment authorized/performed in this block. No API/model/Lovable/Keychain calls.
