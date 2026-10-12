# Explicit Non-Wine Contract Delta

Follow-up within MATCHRIM-HOY-20261012-01. Baseline240c2088b6df256cdf12cb5131ebd5ae9c7ae6e2. Original corpus, annotations,35 evidence hashes and first-block15-check/6-case results remain unchanged. No new scenes or paid calls.

New reproduced defect: `fallback.code=not_wine` with no candidates became `unknown`, causing Sin reconocer and generic insufficient-text guidance. This is distinct from the first block's candidate-name exclusion. Before:16/17 contracts PASS; both new intercepted portrait/landscape cases fail the expected state/explanation. No browser runtime exception; locator timeouts demonstrate missing expected text.

Minimal correction: allow the existing not_wine enum in fallback normalization and provide the same non-wine/no-affinity default explanation. Existing scanner Other beverage copy and guide condition now receive the correct tag. Unrecognized future codes remain unknown; no identity is supplied. No scoring, owner/history/save contract, geometry or native configuration change in this follow-up.

After:17/17 contracts PASS,2/2 new intercepted response-shape cases PASS; no runtime errors or horizontal expansion. Both require2 intercepted requests before/after; no catalog or percentage path. This adds a distinct response variant on the same public Aperol scene, not two new scenes/users. Across both commits:8 unique browser scene/response/orientation cases, with earlier copy-only repeats counted separately.

Typecheck/lint0errors106 inherited warnings/web build PASS with fixture flagfalse/analytics disabled. Only affected contract/UI cases rerun; no new pixel/native/earlier-suite replay. Public screenshot attribution: Friedrich Haag, [Aperol source](https://commons.wikimedia.org/wiki/File:Aperol_001_2025_06_08.jpg), [CC BY-SA4.0](https://creativecommons.org/licenses/by-sa/4.0/).

Evidence: `docs/qa-evidence/matchrim-explicit-negative-2026-10-12/`; private local parent corpus remains outside Git. Original [challenge report](MATCHRIM_CHALLENGE_2026-10-12.md) and [function matrix](MATCHRIM_CHALLENGE_COVERAGE_2026-10-12.md) explain model/native/human limits. Real vision/precision/recall, qualified canonical annotation, sensory/human affinity outcomes, hosted persistence, physical accessibility and Xcode eligibility remain pending.28 historical calls untouched; no production/push/deploy/TestFlight/invitation or new native app.
