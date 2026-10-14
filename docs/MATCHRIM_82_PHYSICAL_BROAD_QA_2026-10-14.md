# Matchrim82: broad physical QA, 2026-10-14

## Scope and verdict

Actual installed TestFlight1.0(82), iPhone16ProMax/iOS26.6. Installed product source remains bda5241df3e0683990aa0371c95e3e955e539084. Agent drove the signed native QA runner, not simulated owner instructions. Only the runner changed; no owner-app replacement, public web/backend change, photo upload, new vision benchmark, wine/profile/rating/restaurant mutation or public evidence push.

13 distinct native product test methods completed successfully after instrument corrections. This is execution coverage, NOT13 defect-free workflows: the accessibility inventory handles findings, and aiRIM navigation needed a keyboard/scroll workaround. The known editor regression still fails.49 exported screenshots are private and include repeated views; they are not49 independent recognition cases or users.

Verdict: broader functional coverage established; physical/product QA NOT globally approved. No83 built/uploaded.

## Expected/actual matrix

| Area | Expected | Actual | Verdict |
| --- | --- | --- | --- |
| Existing dense result | Keep owner correction and reach compare | Pariente/manual retained;9 proposals,60 regions,48 deferred; compare reached after6 downward swipes | Navigation verified; dense accuracy gate remains |
| Compare2-5 | Minimum2, maximum5, sixth disabled | One-selection warning; five selected; sixth disabled; initial selection restored | PASS control contract |
| Service comparison | Do not invent unavailable scores | Service toggles; missing affinity remains explicit | PASS missing-data contract, not taste accuracy |
| Main navigation | All five destinations reachable,44pt minimum | Inicio/aiRIM/Escanear/Bodega/Perfil reachable and measured | PASS tested portrait controls |
| aiRIM | Draft, four decision forms, back | Draft preserved without sending; four forms open/back; keyboard displaces header | Functional pass with workaround; P1 UX FAIL |
| Profile memory | Use profile shown in Profile | Profile and existing learned-memory label load in aiRIM within30s readiness allowance | PASS context availability; no model-answer quality claim |
| Profile/history | Load actual data and change tabs | Sensory profile and history loaded, tabs exercised | PASS read-only contract |
| Cellar | Five lists accessible | Collection/wishlist/tasted/favorites/rejected views exercised with actual stored data | PASS read-only navigation; mutations not exercised |
| Scan hub | Open all five modes and return | Wine list/label/food menu/dish/shop intent open/back | PASS entry/navigation, not recognition |
| Gallery | Open system picker, cancel without upload | Actual Photo Library opens/cancels; scanner available again | PASS; no unrelated photo capture |
| Camera | Open/dismiss without capture | Two actual opens/dismissals, both Back Facing | PASS; one earlier Front Facing observation not reproduced |
| Lifecycle | Background/foreground and cold launch retain account | Three cold samples2.444068/2.382140/2.370177s; logged-in profile subsequently remains available | PASS tested state; no native RSS/energy claim |
| Restaurant/privacy | Optional commercial sharing off; privacy reachable | Restaurant opt-in0; no session saved; account menu/privacy/back reached | PASS read-only/consent contract |
| Accessibility | Inventory clipped text, size, contrast and targets | Three native audits,10 hit-region warnings on7 text labels/3 notification regions; no other reported audit categories | Review warnings, not global accessibility PASS |
| Landscape | Rotate actual device and inspect UI | Native orientation request did not produce a landscape app window | NOT VERIFIED; cause unknown, no device-setting change |

## Reproduced findings

| Priority | Finding | Evidence and next acceptance gate |
| --- | --- | --- |
| P1 | Manual editor moves focused wine input above display | Earlier actual field y590 ->-93, keyboard y655; native visibility regression FAILED. Explicit edit affordance and keyboard-safe layout must pass physical rerun |
| P1 | aiRIM keyboard moves back/header outside safe area and leaves displacement after Done | Back y-54 while typing/y-32 after dismissal; one tap computed at38,22 opened iOS return to TestFlight. Native screenshots confirm overlap. Done+scroll restores navigation; no product fix yet |
| P2 | Food menu/dish capture buttons below44pt | Four observed photo/file controls40pt. Profile catalog/map/new-test actions also include40pt targets. Increase native-only targets and rerun geometry/taps |
| P2 | Result tabs become remote from long pending-region list | Six swipes needed to return from deep list to compare. Keep result-mode navigation reachable without losing selection/scene context |
| P2 | Restaurant entry/return need native layout polish | Modo restaurante label y46-61 lies under safe top; returning to Profile preserved scroll with account action y-32. Heading itself is readable; scrolling restores actions |
| P3 | Singular learning copy | Visible profile-memory wording uses1 valoraciones. Fix grammar without implying increased learning confidence |

Dense coverage/canonical identity/sensory evidence limitations from the previous report remain unchanged:12 automatic analyses,48 deferred, top-sorted60-region cap risk, partial names and missing personalized scores. No new precision/recall result was generated in this block.

## Test validity and residuals

- First tree inspector used unstable indexed AX queries; revised to one immutable snapshot. Initial comparison scrolling direction was wrong. Both are harness defects, not product incidents.
- Camera cancellation is DismissImagePickerButton/Dismiss in this iOS version, not Cancel; account trigger is AX Other, not Button. Initial camera/restaurant/privacy failures from those selectors are superseded by verified reruns. The account action was never deleted.
- One combined orientation run lost its completion receipt across interruption; its gallery case passed in the log and was independently rerun successfully with a complete result bundle. Temporary scratch later disappeared; current runner/source is retained in the private artifact directory, with DerivedData outside synchronized Documents to avoid signing resource-fork errors.
- Actual aiRIM question was never sent. Four pure regression suites PASS: learning, three synthetic personas,23 recorded/synthetic identity-evidence contracts, scanner profile parity/fallback/cancellation/isolation. These are not new human users, vision accuracy or an online recommendation study.
- Spoken VoiceOver, complete large-type/orientation review, remaining approved real photographs, offline/slow-network/retry/cancellation, real saving/ratings/deletion and native memory remain separate gates. Owner data was not modified to exercise them.
- App-only passive capture has a gap: old status still said running, but both recorded PIDs were absent and raw logs ended09:04:28. Native diagnostics are not product bug counts; full JS/network console was not captured. Do not claim ongoing AI supervision or crash-free global QA.

## Evidence and release gate

Private evidence: recovered task `artifacts/matchrim82-testflight-liveqa-20261014/physical-control/broad-qa/`. `summary-final.json` contains13 method names, run histories/receipts, screenshot hashes, pure-suite results and cold samples. Native xcresults and per-screen AX JSON remain local. `BROAD_QA.md` links readable proof. No private media in public Git.

Next internal gate: correct the two P1 keyboard/editor defects without altering public web behavior, then rerun focused physical regressions and remaining recognition/intelligence cases.82 remains installed and already uploaded; do not upload it again. External tester invitation remains UNSENT pending the dedicated app-review account in Apple, unchanged by this QA block.
