# Matchrim Night225: User Goal And Verified Deltas

## Human Scope

Active Goal independently read: work until04:00 Madrid on the five agreed blocks (new-user journey, retained200image results, affinity/learning coherence, mobile visual QA, reproducible candidate), correct demonstrated defects, preserve evidence, and follow development. No web/main/backend publication, new spend or inference of catalogue/model/Keychain/account permissions. Existing monitor remains PAUSED; the actual native Goal is now ACTIVE, not the old BLOCKED objective. Finite time does not justify repeated green suites or artificial activity.

##225 Concrete Home Defects

Actual Index controller replay with in-memory auth/database transports reproduces: signed-in account with no server quiz receives the local cached vector and triggers recommendations. Initial regression failed with the full unrelated local vector instead of null. Previous140checks only inspected pre-effect return props, so they did not detect this post-effect fallback. This is a controller isolation/correctness failure; it does not demonstrate a deployed RLS leak. No real accounts were read or altered.

Native-only correction:

- A signed-in Home does not use or overwrite anonymous quiz storage. Anonymous local quiz behavior and legacy web fallback retained.
- Profile/wine-history errors block personal recommendations and provide a retry; an incomplete/out-of-range profile is not usable.
- Native combined account reads have an8second deadline, abort the transport on timeout/unmount and do not display a cached profile as a successful read.
- Account transition gates also protect quiz code, learning summary and profile-status props; leaving an old pending recommendation clears its spinner.

| Before | After | Why |
| --- | --- | --- |
| Failed/missing account profile could recommend from local cache | Native signed-in account waits for its own valid server result | Prevent misleading personalization and cross-lifetime cache reuse |
| Read error looked like an ordinary empty recommendation list | Explicit profile/bodega failure with Reintentar carga | Recover without asking the user to repeat a saved test |
| Unbounded read or abandoned recommendation could keep loading | Bounded native account read and cleared stale recommendation loading | Make offline/failure recovery finite |
| Error fallback's Mis gustos route could become Conocer mis gustos | Error keeps the existing profile review route | Do not imply a failed read means the user has no test |

## Tests So Far

- New225actual controller replay:10groups PASS, including50post-effect synthetic owner transitions, exact invalid vectors, retry recovery, held read timeout and no borrowed profile/recommendation. Database/auth/learning/recommendation transports synthetic, not50human users.
- Affected140pre-effect owner regression:6groups PASS; its pre-effect scope and assertions retained, only new prop harness bindings supplied.
- Focused lint PASS. Current full web Home JSX return equals priorfeaa229 verbatim; controller before/after behavior matches for missing/success/profile-error/wine-error cases in web mode.
- Candidate118preparation/typecheck/compile and actual visual225error view are pending.117previous Discard-only visual PASS remains valid for that code, not new225native coverage. No TestFlight-ready claim.

###225 Validation Delta

Own atomic heavy52f6725d/writer25dd6d3a claimed after queued offer, volume15,537,808KiB. Isolated Chromium225visual-r1 passes4cases (profile/history read errors at320normal and393with200%text), all retry/profile-route/reachable-touch-target/no-horizontal-overflow assertions, no console/page/external requests. Profile320 and history393captures personally inspected. This is actual component rendering with synthetic error props/inert nav/search leaves, not native UIKit/account persistence.

First118preparationr1 stops at TS2339: installed Supabase builder does not expose abortSignal after maybeSingle. Failure retained unchanged. Moved native abort binding before maybeSingle, matching the installed service pattern; no new SDK, backend or query. New clean-source118r2preparation/compile still pending at this checkpoint. No earlier failure relabelled PASS.

## Remaining Five-Block Coverage

| Block | Current evidence | Next independent delta |
| --- | --- | --- |
| New user | Prior native correction/auth-boundary;225Home recovery controller | Actual native anonymous quiz completion and return; no real account save implied |
|200labels | Retained local OCR and catalogue query evidence; no new recognition calls | Audit residual categories using existing per-image rows only, preserve unknown identities |
| Learning/affinity | Existing model and provenance gates retained | New combined lifetime/score scenarios using synthetic isolated profiles, not taste accuracy |
| Visual mobile |117actual MAX Discard closed |225profile/bodega error and retry view at narrow/large text, then affected native route |
| Candidate |117compiled;225product delta unbuilt | Clean118reproducible local build and bound receipts |

Development thread last refreshed in224, latest visible16:14Madrid. No new reply claimed by this225local work. Global catalogue bridge/secret/authenticated validation, sensory-evidence implementation, real200canonical recognition and authenticated persistence remain distinct gates. No automatic approval/deploy/spend inferred from development mail.

## Resources

Volume measured19,534,156KiB free before work. Own writer-matchrim-native99/dbfba30f acquired only for bounded edits/tests/checkpoint. Heavy-local foreign-owned; no heavyweight process/browser/OCR/build started under that lease. Queue will request the complete own heavy+writer set after releasing this writer; never hold partials or steal an expired foreign lease. No foreign apps/processes/caches changed. This file records progress, not completion of all five blocks.
