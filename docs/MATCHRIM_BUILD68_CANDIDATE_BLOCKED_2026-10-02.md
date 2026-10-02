# Matchrim build 68 candidate gate - 2026-10-02

## Candidate

- Bundle: `wine.matchrim.app`
- Version: `1.0 (68)`
- Source branch: `codex/matchrim-learning-airim-qa-20260928`
- Reviewed vision baseline: commit `ee769be`
- Preserved archive: `/Users/GOIKO/Library/Developer/Xcode/Archives/2026-10-02/Matchrim 2026-10-02, 1.0 (68).xcarchive`
- Archive app signature: valid, arm64, team `8X3XTD6XYX`
- Device: iPhone 16 Pro Max `Goiko`, iOS physical build installed and launched by USB

The archived client contains no staging project reference, QA fixture switch or `matchrim_qa` schema marker. The public web deployment was not changed.

## Physical iPhone QA

| Scenario | Actual | Gate |
| --- | --- | --- |
| Primary navigation | `Inicio`, `aiRIM`, `Escanear`, `Bodega`, `Perfil` | Pass |
| aiRIM placement | Visible in the main five-item navigation | Pass |
| Touch targets | No undersized visible interactive control | Pass |
| Cold launch | 5/5 launches; maximum observed 2.463 s | Pass |
| Landscape scanner | 956 x 440; camera and gallery actions visible and hittable | Pass |
| Photo picker | Opens, exposes at least five photos, background/return remains stable | Pass |
| Scan modes | Five modes present and hittable | Pass |
| Authentication entry | Login and registration fields available | Pass |
| Accessibility audit | Completed; eight warnings limited to static navigation text labels | Pass with P1 warning |

Seven current-contract physical scenarios are green. The first aggregate run contained one obsolete build-67 selector that expected `Explora` and no aiRIM tab. The corrected build-68 scenario was rerun independently and passed. This is recorded as a test-maintenance correction, not hidden as an application failure.

The accessibility audit warnings concern the hit-area calculation of static text nodes (`Inicio` x4, `aiRIM` x1 and `Escanear` x3). The corresponding controls are hittable and the independent control inventory found `UNDERSIZED=[]`. No clipping or Dynamic Type failure was reported in this run.

## Automated regression

| Check | Result |
| --- | --- |
| `npm run typecheck` | Pass |
| `npx eslint . --quiet` | Pass |
| `npm run build` | Pass |
| `npm test` | Pass |
| Classifier and learning contracts | Pass |
| Persona isolation and saved-wine exclusion | Pass |
| Deterministic year simulation contract | Pass, 3,673 events |
| Multi-wine and E2E trace contracts | Pass |
| Ground truth manifest | Pass, 30 scenes |
| Independent ground truth | Pass, 25 distinct sources |
| Xcode 26.0.1 Release archive | Pass |

Non-blocking build warnings remain for large web chunks, stale Browserslist data, two unassigned splash-image children and a CocoaPods script without output declarations. The iOS deployment target remains 14.0 and must be raised before Apple's April 2027 requirement.

## Vision backend

The isolated staging project `qpbmqvfnunkylvtvnyyx` remains active with the independently configured provider:

| Function | Staging version | Status |
| --- | ---: | --- |
| `detect-wine-regions` | 4 | Active |
| `analyze-wine-region` | 4 | Active |
| `scan-wine-menu` | 4 | Active |
| `calculate-wine-affinity` | 5 | Active |

The five authorized real-image benchmark and its accuracy/latency results remain documented in `docs/MATCHRIM_INDEPENDENT_VISION_GATE_2026-10-01.md`.

## Production blocker

Production project `cbjynrbvrhcmpaojmqdp` still returns HTTP 403 to the authenticated Supabase CLI account:

```text
Your account does not have the necessary privileges to access this endpoint.
```

Therefore the reviewed four Edge Functions and encrypted provider configuration cannot be verified or deployed safely to production from this account. TestFlight build 68 was intentionally not uploaded: uploading it now would point the candidate at an incomplete older production backend and would invalidate the real E2E gate.

No production function, secret, database, web deployment or TestFlight build was changed during this gate.

## Single owner action

Grant the currently authenticated Supabase account Owner or Administrator access to project `cbjynrbvrhcmpaojmqdp`, or have an existing Owner perform the same controlled deployment from commit `ee769be`:

1. Store encrypted production secrets `ANTHROPIC_API_KEY`, `MATCHRIM_AI_PROVIDER=anthropic` and `MATCHRIM_ANTHROPIC_MODEL=claude-sonnet-4-6`.
2. Deploy exactly `detect-wine-regions`, `analyze-wine-region`, `scan-wine-menu` and `calculate-wine-affinity` from the reviewed commit.
3. Run the production provider smoke and one physical-iPhone real-image E2E.
4. Upload build 68 to TestFlight only when those checks are green.

No credential value is stored in this repository or report.
