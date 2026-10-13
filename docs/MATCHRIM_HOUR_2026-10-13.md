# One-hour continuation: corrections and sustained client QA

Human request: work continuously for one hour. Start2026-10-13T05:00:37Z, target06:00:37Z. Local repository /Users/GOIKO/2matchrim76-recognition-20261008, branch codex/matchrim77-challenge-20261008. Baseline485a2dc; no production/push/TestFlight/native/Apple/invitation activity.

## Delivered

| Before | After | Why |
| --- | --- | --- |
| Region service failure presented as insufficient visual evidence | Safe cause, error status, visible message before crop, region-only recovery | Request failure is not illegibility |
| Failed reanalysis silently shows previous candidate; stale failure survives edit | Previous result identified as not updated; explicit correction clears failure | Trace which attempt supplied the data |
| Human correction/confirmation shown as100% reader confidence | Human provenance in detail/list/aiRIM/comparison and separate current-outcome counter | Operational human authority is not model probability |
| Main core regression expects obsolete aiRIM copy | Stronger assertions about no bottle/vintage verification and candidate comparison | Align tests with the already-existing cautious contract, not weaken it |

Implementation commits6d9fcad (safe region failures) and f05cab3 (manual provenance). This final evidence/core-test commit leaves app sources unchanged from f05cab3.

-[Failure gate](/Users/GOIKO/2matchrim76-recognition-20261008/docs/MATCHRIM_REGION_FAILURE_2026-10-13.md): final112/112 UI,98/98 contracts/protection;8 routes,400/429/transport and recovery, portrait/landscape.
-[Human provenance gate](/Users/GOIKO/2matchrim76-recognition-20261008/docs/MATCHRIM_MANUAL_PROVENANCE_2026-10-13.md): final72/72 UI,112/112 contracts/default parity;6 routes, create/confirm/edit in detail/list/actual responsive comparison.
-App/tooling typecheck, scoped lint and web build pass. Last build Vite5.4.10/3635modules/6.45s,146 compiled hash entries. Inherited build warnings remain. No new native build/version.

## Sustained QA

900-second same-page/same-account-context run on immutable f05cab3 app sources:358 completed cycles,179 portrait/179 landscape.120 bounded429+region-retry cycles;119 cancel/manual/late-result cycles;119 confirmation cycles. Standard visible gallery/FileChooser selects the same original file after real reset; actual preprocessing/crops/client pipeline runs. No event/controller/file-buffer injection.

Requests intercepted locally:358 profileGET,358 detector,1792 region-analysis and1074 catalog calls. Zero actual remote/provider/paid calls, hosted writes or real accounts. No unexpected console/page errors; intentional429 diagnostics retained. Same exact existing vision responses and CC0 food-menu canary, NOT358 users, scenes, wines or independent recognition tests. No learned-profile/positive wine data added.

After-reset browser JS heap13.71-50.04MiB; one Document throughout. Node count1145->38372; listener counters also grow. Functional assertions pass, but this is NOT a memory-leak PASS. Counts include detached/collectible nodes; no forcedGC, retainer snapshots, liveDOM census or native RSS analysis was performed. Investigate retention and repeat on actual WKWebView/iPhone before claiming memory stability. Cycle duration includes local image work, animations and deliberate retry waits, not provider/model latency.

Core multi-wine scan checks pass after correcting two stale copy expectations and adding explicit human-source provenance. Scoped core/packager lint0errors0warnings. Default aiRIM/decision outputs were independently compared with the pre-change implementation. No unrelated old green suite replay.

Evidence /Users/GOIKO/2matchrim76-recognition-20261008/docs/qa-evidence/matchrim-hour-resilience-2026-10-13:32 SHA entries plus manifest,18 periodic screenshots,358-cycle log, summaries, executed script/current and baseline core checks, frozen app sources. All1939 prior evidence entries/manifests verified intact.

## Residual / Release Gate

P0 remains real recognition/identity precision and calibrated affinity with independent human outcomes; native/device/accessibility and account/signing gates are separate. Hosted persistence/RLS and physical camera/gallery permissions are not certified by intercepted client QA. Existing TestFlight invitation status unchanged. These corrections do not approve publication.

P1 observed: node/listener retention requires controlled postGC/native follow-up. Additional source-only follow-ups, not browser-proven in this hour: manual detail copy always says affinity pending even though explicit confirmation can preserve an existing score; image decode failure before preview may leave no visible global error. No speculative product edits were made to close these without reproduction.
