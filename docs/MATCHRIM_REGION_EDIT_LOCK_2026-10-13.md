# Matchrim: region decisions cannot race with batch analysis

Date2026-10-13; human local continuation; baseline`bc94dad29d05785e57b1b44af7f9e92b719c7e17`. No publication, push, native copy, Apple, TestFlight or invitation.

## Reproduced Defect / Fix

P1: the scanner allowed manual identity, candidate changes, confirmation/edit and discard while the batch was active. Each mapper can update its region and the final callback replaces the complete region array. A manual identity on deferred region5 disappeared at ready; uncertain region2 discarded while other regions waited for catalog reappeared. Both were reproduced via visible controls, in portrait and landscape, with the real client and existing local HTTP stubs.

Fix is limited to`MultiWineLabelScanner.tsx`: a derived`batchLocked || loading` UI lock, loading guards in five mutation handlers, eight disabled controls, three aiRIM action gates and a polite busy status. Inspection, navigation and closing remain available; cancel is reachable after closing the sheet. Edits reactivate at ready or canceled. Existing synchronous`batchRef` guards retained.

| Before | After | Why |
| --- | --- | --- |
| Manual identity accepted during a pending batch, then silently overwritten | Manual fields/submit wait for completion or cancellation | Do not accept a user decision the pending result can erase |
| Discarded region reappears when the final array is replaced | Discard disabled while loading and active after ready | Keep deletion and displayed state consistent |
| Candidate fields/buttons and aiRIM confirmation remain active during reading | Mutation controls gated; read/navigation/close still active | One consistent editing boundary, not silent no-op actions |
| No explanation for an edit lock | Polite analysis-in-progress status | Expose that identities are still changing |

No detector, matching, affinity, image/crop, status transition, budget, concurrency, retry, timing, cancellation, save, layout/CSS or account change. Full module normalized AST equal to baseline outside the exact delta; blank line created by removed notice ignored in comparison. The region progress counter from the previous commit is unchanged.

## Expected / Actual

| Case | Expected | Before | Final After |
| --- | --- | --- | --- |
| Deferred region5 manual identity while three catalog requests pending | Cannot submit an unstable mutation | Accepted, success notice, then erased at ready; both orientations | Fields/submit disabled; no unsafe mutation |
| Completed uncertain region2 discard while the rest is pending | Wait for stable result | Removed then reappeared at ready; both orientations | Disabled during reading; discard after ready stays removed |
| Manual correction at ready | Retain name/bodega through close/reopen; no invented affinity | Post-ready operation works | Works; manual provenance and pending sensory data visible |
| Cancel, then manually correct before catalog responds | Controls recover immediately; late canceled results cannot erase edit | Extension has no new pre-fix browser baseline | Both orientations pass; held responses released after correction |
| Sheet bounds/footer/scroll body | Fit393x852 and852x393, no horizontal expansion | Settled sheet fits | All measured checkpoints fit; body scrolls, footer stays separate |
| Profile/detect/analyze/catalog calls | 1GET/1/4/3 per context | Expected | Expected; complete function-body/crop hashes unchanged |
| Unexpected console/runtime/real writes/accounts/paid calls | Zero | Zero | Zero |

Corrected baseline44/60; first post-fix60/60. Final six-route suite94/94,6/6 contexts: manual, discard and cancel x two orientations. The four affected routes repeat once when adding two cancellation routes; not additional independent scenes/users. Initial baseline36/60 also retained:200ms captures sampled drawer entrance animation; after waiting for viewport bounds, all layout checks pass without any layout fix.

## Verification

-80 synthetic vectors execute the five actual source-extracted handlers with loading/batch/region/candidate presence combinations. Verify mutation, selection, notices and submit preventDefault behavior. The updater body is not invoked by these guard probes; UI tests exercise actual post-ready manual/discard outcomes. Not a human taste/profile study.
-3 extraction/normalized-AST/change-count checks and46 protected byte-identical sources. Total129/129.
-App and tooling typecheck exit0. Scoped lint including packaging script exit0, zero errors/warnings.
-Local`npm run build` exit0: Vite5.4.10,3634 modules,6.69s;146 compiled file hashes. Inherited Browserslist age/chunks>500kB warnings unchanged.
-1682 old evidence entries/manifests preserved. No unrelated old green suite rerun.
-AST harness diagnostics retained: ancestor selected instead of notice expression, then one JSX blank line remained after removal. Test corrected; no additional product or expected-result change.

## Evidence

`/Users/GOIKO/2matchrim76-recognition-20261008/docs/qa-evidence/matchrim-region-edit-lock-2026-10-13`:79 SHA entries plus manifest,54 PNGs including retained initial/repeated runs;18 PNGs from the final six-route run. Results, request/crop hashes, exact response payloads, code/source snapshots, commands, build hash list and previous-evidence verification included.

![Pending manual form, visibly locked](/Users/GOIKO/2matchrim76-recognition-20261008/docs/qa-evidence/matchrim-region-edit-lock-2026-10-13/after-final/manual-portrait-pending.png)

![Pending candidate inspection remains available](/Users/GOIKO/2matchrim76-recognition-20261008/docs/qa-evidence/matchrim-region-edit-lock-2026-10-13/after-final/discard-portrait-pending.png)

## Limits / Next Boundary

Same exact original CC0 food-menu canary (SHA`9980c5e6b9d5e52f1783e2f26d1a97e22c0c2e1556e9e72919dd26fc34ece9a9`) and existing response contract (SHA`f2aa2924e48c8c2f6f0cbe45011e6ef92bda3cb17be14a645659b70a0343ae40`). No corpus regeneration. The photo is NOT five bottles; local candidate names are contract data. Null profile, empty catalog, intercepted HTTP/WS and invalid isolated auth. Standard browser gallery FileChooser, not an iOS camera/permissions test.

This closes a local correction/discard race, not real provider accuracy, calibrated wine affinity, persistence/RLS, native memory, Dynamic Type, physical VoiceOver or release readiness. Manual decision persistence means current scan close/reopen, not hosted Bodega or app restart. Corrected-action captures include the existing transient success toast; no whole-app occlusion or physical accessibility certification is claimed.

Separate next candidate for reproduction: failed region requests can still be described as insufficient visual evidence because`selectedRegion.error` is stored but not rendered in the detail. Do not classify this source observation as browser-proven here. Existing provider/native/account/release gates and invitation status remain unchanged.
