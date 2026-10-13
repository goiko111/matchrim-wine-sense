# Region failures: transparent cause and safe recovery

Hour blockA, 2026-10-13; baseline485a2dc7fa0ea457cd026ba796796c4e58309d5a. Local only, no release/native/remote provider action.

| Before | After | Why |
| --- | --- | --- |
| HTTP failure is described as insufficient visual evidence | Error de analisis, safe service/transport/auth/quota message | A failed request does not prove illegibility |
| Failed reanalysis shows old candidates without explaining their age | Previous result retained, explicitly not updated by this attempt | Preserve useful information without claiming a new result |
| Editing a previous candidate leaves stale error in the counter | Explicit select/confirm/edit clears error/fallback | Keep user decision and displayed state consistent |
| Previous-result failure message is below crop in landscape | Error explanation before crop, fully visible without scrolling | Recovery needs a visible cause at first glance |
| Rendering a raw provider error would reveal internal detail | Typed safe message, no raw error/message/status text echoed | Keep debugging internals out of user-facing output |

## Reproduction / Expected Actual

Eight routes: initial400, initial429, reanalysis400 and reanalysis transport abort x393x852/852x393. Same existing local vision response contract and CC0 food-menu preprocessing canary. Protocol faults are deliberately intercepted; not real provider failures or wine accuracy evidence. Null profile/empty catalog/invalid local auth; all external HTTP/WS blocked before navigation.

-Baseline76/104. First correction104/104; visual review then exposed error text below crop in landscape. Final112/112 includes8 added first-viewport message assertions; initial post-fix run retained, not extra independent scenes/users.
-400 has no automatic retry;429/transport stop at3 attempts. Existing budgets, retry timings and request bodies/crops unchanged. Final per-route calls:1profile/1detect/3catalog,5analysis for400 routes,7 for429/transport routes, including explicit retry where applicable.
-Initial failed region reanalysis resolves only that region to the original uncertain candidate; no new whole-image detection. Failed reanalysis keeps previous data. Explicit manual edit removes stale failure and leaves affinity pending; close/reopen retains recovery.
-No page errors. Browser400/429/net::ERR_INTERNET_DISCONNECTED diagnostics are expected and retained. Zero unexpected console errors, real writes/accounts/paid calls. Transport abort is not an OS/iPhone offline test.

## Verification

98/98:34 typed safe-message vectors (offline overrides, TypeError, EdgeFunctionError400/401/403/404/408/425/429/500/503/504, malformed/unknown errors);8 unchanged pipeline/action bodies;1 error-assignment-only pipeline comparison;3 clear-fields-only updater comparisons;6 actual source updater guard/recovery probes;46 protected source bytes. No candidate purge, detector/scoring/request/cancel/save/CSS changes.

App/tooling typecheck0, scoped lint0errors0warnings, final web build0 (Vite5.4.10,3635modules,6.33s,146 compiled hashes). Existing Browserslist/chunk warnings unchanged. All1761 prior evidence entries/manifests preserved. No unrelated old green suite replay.

Evidence: /Users/GOIKO/2matchrim76-recognition-20261008/docs/qa-evidence/matchrim-region-failure-2026-10-13:69 SHA entries plus manifest,48 PNGs (16 final), code/source snapshots, before/after request hashes, exact original response payloads, command receipts and build hash list.

![Failure, not illegible identity](/Users/GOIKO/2matchrim76-recognition-20261008/docs/qa-evidence/matchrim-region-failure-2026-10-13/failure-after/initial-400-portrait-failure.png)

![Landscape cause appears before crop](/Users/GOIKO/2matchrim76-recognition-20261008/docs/qa-evidence/matchrim-region-failure-2026-10-13/failure-after/reanalysis-400-landscape-failure.png)

## Limits / Next

No real vision precision/recall, learned-personalization calibration, human feedback, hosted persistence/RLS, native device/VoiceOver/Dynamic Type, provider latency or release readiness claimed. Prior native/account/TestFlight/invitation gates unchanged. Safe helper controls region errors only; unrelated global detection error formatting untouched.

Next observed provenance boundary: source manual is still displayed as100% identity and included in analyzed-region count. Human confirmation must not masquerade as a model confidence or OCR result. Separate next gate; not changed here.
