# Matchrim 96: Food and Keyboard QA

Internal remediation milestone, 2026-10-20. Candidate client source `7935959051cea49c2183511276b27eff856bbe3f`; production Food version `scan-food-pairing-2026-10-20-profile95-v11`. No TestFlight upload, production web Publish or physical-phone operation in this block.

## Changes

- `bf094e5`: native menu scans generate a shared pairing-style dictionary instead of repeating full recommendations for every dish. Strict reference expansion preserves the existing API response, source text, positions, prices and coverage. Generic styles never acquire personal scores or sensory attributes. Native timeout errors are explicit and actionable, without automatic retries.
- `bf094e5`: cancel stale keyboard scroll-restoration frames after a new show event or route change. No forced focus or keyboard reopening after intentional dismissal. A bounded native-only trace stores event state and dimensions, never field values or identity.
- `966a139`, `7935959`: narrow regression-oracle updates for the authorized backend changes and two new test commands, retaining exact legacy inverses and negative mutation controls.
- `b1b693a`: explicitly guard style lookups to satisfy deployment-channel rules without non-null assertions.

The provider, model selection, token ceilings, 55-second provider deadline, authentication, learning rules and protected `search-wines/index.ts` are unchanged. Legacy menu/dish and native dish provider requests remain byte-identical to the shipped95 behavior. Native menu pairing suggestions are a new shared repertoire, not lossless preservation of every historical per-dish recommendation.

## Expected / Actual

| Gate | Actual Result | Qualification |
|---|---|---|
| Full automated regression | 16 groups PASS: 11 executed on B1, then 5 on7935959 | Composite matrix; only a QA guard changed between runs, product bytes exact. Not a fresh single16-group run |
| Typecheck, lint, private production web build | PASS; lint0 errors/106 inherited warnings | Private Vite config, envDir:false, no published web changes |
| Food profile suite | 103 groups/50 synthetic profiles PASS | Not50 humans, production accounts or a new50-person UIKit study |
| Food handler/adapter | 30 controls PASS plus8 independent controls | Fake provider; inventories1/15/30/60, strict IDs, cancellation/errors and legacy compatibility |
| Keyboard event-loop regression | 14/14 PASS | Reproduces and fixes stale-scroll races, not the original OS disappearance itself |
| Food visual replay | 4 views,300/300 controls PASS;0 browser errors | Recorded F06/F07 + synthetic504. Portrait/landscape and CSS200 stress; not UIKit Dynamic Type |
| iOS simulator candidate1.0(96) | Build/install PASS | Isolated QA bundle, Xcode26.0.1/iOS26.0.1/iPhone16ProMax; no production archive/export claimed |
| Fixed MAX rotation test16 | PASS:3 cycles/6 transitions, no retap rescue | Field retained, keyboard present, cancellation without saving |
| Keyboard observation test15 | PASS | Separate diagnostic, not an estimate of failure frequency |
| First-run privacy test17 | PASS via real checkbox and Continue controls | No seeded acceptance flag or bypass; persisted acknowledgement used by the next suite |
| Native safe11 after first-run consent | 11/11 PASS, approximately403s | Navigation, orientations, actual Dynamic Type, Photos/cancel, accessibility audit, contrast, manual editing and scanner entry |
| Food FULL real | HTTP200,54.385s,15 rows,7/7 checks | Original F08 request; before:502/55.867s |
| Food TOP real | HTTP200,39.832s,11 rows,7/7 checks | Original F06 crop; before:200/49.942s;20.2% lower observed latency, one sample each |

Both real responses report v11 and client-only profile context. Three distinct literal controls and their prices56/66/46zl are retained. Caesar's four variants remain unresolved without invented pairings; FULL includes Chlodnik42zl, while TOP correctly lacks that cropped-edge price. Full precision/recall and restaurant-pairing correctness cannot be inferred from these checks. Recorded TOP/BOTTOM UI replay still merges19 readings into15 rows/four deduplications; it is not a new live two-crop UI analysis.

## Preserved Failures

Original95 Food502 and intermittent MAX keyboard failure remain immutable. Current successful checks do not erase them or establish a causal repair of every OS keyboard disappearance.

This run also preserves: the original old-package test-oracle failure, resource preflight holds, an SDK monitor false alarm on transient logical file size, and the first native safe11 failure. That last failure was test03 waiting for Upload before accepting the fresh-install privacy notice; the application correctly withheld scanning. A separate real-UI consent test then preceded an unchanged original11-method suite. No original assertion was weakened to obtain the later PASS.

## Deployment and Spend

The first authorized Lovable turn stopped on prohibited TypeScript assertions, spending1.2credits with no backend deployment. A separately authorized minimum corrective turn deployed only Foodv11, spending1.9credits. Total reported Lovable spend3.1credits; no more turns authorized. Both source files were read back and matched the tested code byte-for-byte. Runtime version confirmed by both real calls; operation UUID was not exposed.

Lovable automatically modified two integration files despite the backend-only instruction. With explicit owner authorization, commits01377c7 and278cf882 restored them exactly without force. GitHub comparison130dcee...278cf882 contains only `supabase/functions/scan-food-pairing/{index,contract}.ts`. No Publish was executed. Source edit9218b4df, merge73338db2, final remote main278cf882. Working client branch remains separate.

The new real-call window is closed at2/2,0 retries/0 remaining. Historical95 window20/20 is untouched. No new users, account writes, secret reads, roles or invitations were created. Simulator external forwarding was disabled.

## Evidence and Reproduction

Evidence root: `/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim96-food-keyboard-20261020`.

- Automated matrix/logs: `full-regression/HANDOFF-FINAL.md`.
- Browser captures/traces: `food-ui/HANDOFF-966-793.md`, including portrait result and MAX timeout/retry.
- Real source receipt: `deployment/ACTUAL-DEPLOYMENT.json`; actual response bodies, fixed inputs and independent review: `evaluation-E/food-v11-two-canaries-r1/RESULTADOS-REALES.md` and `runs/`.
- Native cycles/test15: `native-D/runtime96-r2/`; consent and complete safe11: `native-D/runtime96-r3/`. Official summaries, AX trees, PNG, recordings, build commands and cleanup receipts are retained. Simulator/App/server processes terminated; no new provider call is permitted by replay scripts.
- Local focused checks: `npm run test:food-latency96`, `npm run test:keyboard-rotation96`, `npm run test:backend95`. Full matrix commands/configuration are preserved in the automated report. iOS preparation/build recipes remain private artifacts with explicit public configuration, not a default unchecked project build.

## Residual Gate

FULL now succeeds but takes54.385s against a55s provider deadline: only0.615s observed margin. This is not robust latency approval; two successful canaries do not estimate production reliability. Wider real measurements or further output reduction require a new explicit spend authorization. The original keyboard disappearance has not recurred in the current bounded tests, but physical iPhone/real VoiceOver experience and long-run frequency remain unverified. Accessibility audit is not equivalent to a VoiceOver user study. Production canonical/sensory coverage and human taste accuracy are not established here. Production96 signing/export/TestFlight distribution were not performed in this block.
