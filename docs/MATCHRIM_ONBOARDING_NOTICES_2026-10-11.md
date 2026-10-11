# First use, tutorial and visible notices

Assignment `MATCHRIM-5H-20261011-02`. Baseline `648c879` and unsigned79 preserved. Local-only implementation/QA; no real account, vision, production, deployment, push, invitation or Apple action. The28 unused vision calls and all frozen corpora/ledgers remain untouched.

## Before / After

| Before | After | Why |
| --- | --- | --- |
| Any authenticated user bypassed the guide | Wait for owner-scoped experience; quiz, saved wines or own recent scans count, authentication alone does not | A new account is not an experienced user |
| Any global storage value suppressed first use | Owner-specific state/events; validate known version and skipped/completed result | Corruption and another account's choice must not count |
| Global v1 preference had no provable owner | Preserve it untouched, do not attribute it to a new account | No silent cross-account migration or deletion |
| Tutorial omitted new scan/food/save limits | Explain12 automatic regions, deferrals, detection versus identity, missing sensory percentage, food hypotheses and save confirmation | Guide matches the actual candidate |
| Sonner calls had no presenter | One account-aware Sonner host alongside existing legacy host | Important scan validation and Bodega mutation failures become visible |
| Persistent errors would also become toast duplicates | Keep scanner/Bodega persistent errors; omit redundant toast for those errors | One error presentation per action |
| Guide retained entrance/size motion under reduced motion; focus did not reliably return | Scoped reduced-motion override, no incidental size transitions, return focus to Help | Keyboard and orientation stability |
| Bodega load could wait indefinitely and fail after logout |10second deadline, abort on owner/route transition, ignore obsolete load results | Visible retry, no late prior-account notice |
| Favourite update did not request row confirmation | Owner/id-filtered update with returned id; suppress stale-owner completion | No success when the mutation is unconfirmed |

No redesign, mandatory tutorial, bulk toast migration, SQL/RLS change or sensory data fabrication.

## State Rules

- `matchrim.onboarding.v2:<owner>` and `matchrim.onboarding.local-events.v2:<owner>`; anonymous is a separate owner. Events are local-only and bounded to30.
- Existing valid scoped versions1-2 with skipped/completed are respected without rewrite. Corrupt, incomplete or future-version state does not certify completion.
- Unattributed global v1 keys remain intact and unused. A legacy-only user without other verified experience can see the optional guide once again; Skip and Help remain available. This is deliberate conservative handling, not proven account migration.
- Account changes remount guide state. A returning user's own Skip survives switching away and back. Help remains available while experience is loading or local storage is unavailable.
- Example name/confirmation stay component-local. Controlled tutorial flows make no recognition requests, user_wines writes or profile-training changes.

## Verification Matrix

| Suite / case group | Expected | Actual |
| --- | --- | --- |
| New authenticated / anonymous | Guide offered | Pass |
| Returning quiz / saved wines without quiz | No automatic interruption, Help available | Pass |
| Own skip, other owner, corrupt/global/future/old scoped version | Respect only verified own decision | Pass |
| Anonymous to account, account A to B and back, logout | Independent choices and correct first use | Pass |
| Skip, reopen, edit/confirm example, six steps | No persistent wine/profile mutation | Pass |
| Bottle, carta/pizarra, aiRIM and profile destinations | Reach real local routes | Pass |
| Keyboard Tab / Escape | Focus stays in dialog, returns to Help | Pass |
| Portrait393x852 / landscape852x393;135% CSS text / reduced motion | Scrollable content, reachable controls, no overflow | Pass; captures inspected |
| Invalid scanner input | One visible notice, no vision call | Pass |
| Bodega favourite rejected then retried | Error visible; success after confirmed response | Pass |
| Held Bodega load | Bounded timeout, persistent retry above real nav bounds, no duplicate toast | Pass |
| Logout during Bodega load / with existing notice | No obsolete-account notice | Pass |
| Food save error / held save / logout during scan | Persistent error only, no early success, no stale response |3/3 affected regressions pass |

Final main UI suite **25/25**, food-notice regressions **3/3**, built-preview smoke **5/5** (subset of the main flows, not five extra independent users). All final page-exception checks pass. These are intercepted local fixtures, not real accounts, RLS verification, human feedback, native VoiceOver or physical Dynamic Type.

Storage contracts **15/15** plus preserved integral contracts pass. Full `npm run test:release`, typecheck and web build pass. Full lint has0 errors and107 inherited warnings. No previous39-case recognition/client suite was blindly repeated; only affected food-notice cases were rerun.

## Evidence and Test Repairs

- Initial baseline UI:3/9 passed, six demonstrated omissions/notice failures. Initial owner-storage contracts:9/15 passed.
- Intermediate expanded QA also exposed timeout/late-account notices and reduced-motion/layout issues; fixed with targeted reruns.
- Two transition tests initially used a malformed synthetic JWT and raced the closing dialog. Fixture token encoding and transition waits were corrected; this is not counted as a product fix.
- An arbitrary740px alert threshold falsely flagged an alert ending above the actual775px nav. The final assertion compares actual alert and navigation bounds, not a guessed pixel line.
- A first dev dependency warm-up run reported a transient React context error; it did not recur in the subsequent full clean-context run or the compiled-preview smoke. Final evidence is from those passing runs, not that warm-up.
- Portable evidence: `docs/qa-evidence/matchrim-onboarding-notices-2026-10-11/` with before/after JSON, screenshots and SHA256 manifest.
- Full artifacts: `/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim-onboarding-notices-20261011/`.

## Candidate / Reproduction

Unsigned Debug simulator **80** compiled successfully with `CURRENT_PROJECT_VERSION=80` override; source release-number metadata unchanged. Native guide explicitly enabled for this build; analytics disabled. Not installed, launched, signed, reserved in Apple or uploaded. Local79 and78 binaries untouched.

```bash
npm run test:onboarding
npm run test:release
npm run typecheck
npm run lint
VITE_MATCHRIM_NATIVE_GUIDE_ENABLED=true VITE_APP_ANALYTICS_ENABLED=false npm run build
```

Run `scripts/qa-matchrim-onboarding-notices.py --help` for UI arguments. The suite uses a locally served app, synthetic account seeds and an interceptor for every non-local request. Set `VITE_MATCHRIM_NATIVE_GUIDE_ENABLED=true` on the dev server. `--cases` narrows the affected cases; compiled-preview smoke excludes dev-only dynamic-auth imports. The exact xcodebuild invocation and successful log are in `ios-build80.log`; binary is under `DerivedData80/Build/Products/Debug-iphonesimulator/App.app` in the full artifact directory.

## Remaining Gates

This local milestone is complete. Live recognition/canonical sensory coverage, real-account persistence/RLS, human recommendation outcomes, physical accessibility and signed TestFlight distribution remain separate unapproved gates from lote01. The requested tester invitation remains unsent; no repeat Apple login attempt. Broader unrelated asynchronous toast producers were not exhaustively audited. No further artificial activity or production action is authorized by this checkpoint.
