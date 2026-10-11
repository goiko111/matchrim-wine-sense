# Menu and food evidence, 2026-10-11

Second local batch in MATCHRIM-5H-20261011-01, after dense gate07d522b. No remote calls, deployment, invitation or TestFlight action.

## Implemented

- Reproduced17 rows in the frozen first-menu trace. Two Laurent Perriere Ultra readings shared the literal source, producer and overlapping physical row but their centres differed slightly. Literal-source deduplication now also accepts strong two-axis box overlap. Different literal cuvees, disjoint rows, producers and vintages remain separate.
- Replay now yields16 rows, one literal `Laurent Perriere Ultra`, no invented `Brut`, and no provider affinity inherited from the disputed identity. This is client postprocessing, not new OCR accuracy.
- Food parser no longer promotes provider style/dish percentages to personal affinity. Legacy scores are validated then withheld; valid nulls stay null. The UI shows qualitative model hypotheses, missing evidence and coverage uncertainty instead of personal food preferences.
- The actual BBQ response claimed a preference for dry wine rules out sweet desserts. Its personalized summary/dish rationales are withheld. The eight returned dishes are retained unchanged; no missing dishes are fabricated.
- Optional coverage/source fields are no longer stripped by the client schema. A reported20 dishes /8 returned is visibly partial; absent coverage remains unverified.
- Saving a style suggestion cannot persist a made-up bottle affinity or sensory sheet. `use_for_profile_training=false` stays in force; evidence is marked `unverified_style_suggestion`.
- Local backend candidate prompt separates exhaustive extraction from wine preferences; it forbids dietary/preference inference and numeric style affinity. Normalization preserves missing sensory values instead of turning null into1; splitting a grouped dessert row no longer copies one aggregate recommendation to all dishes.

The backend source candidate is `scan-food-pairing-2026-10-11-evidence-candidate-v3`. It is NOT deployed. The client protection works with the recorded old response; extraction omissions require a separately approved live rerun.

## Validation

| Gate | Result |
| --- | --- |
| Recorded menu regression before | FAIL:17 vs16, reproduced before fix |
| Recorded menu after | PASS:16 rows, literal identity preserved |
| Negative cuvee/position/vintage/producer controls | PASS |
| Food legacy percentages, missing sensory and aggregate split | PASS |
| Recorded mobile + partial-coverage fixture |6/6, portrait/landscape,0 overflow/page exceptions |
| Existing food functional flows |10/10, including invalid images/responses, missing profile, anonymous save and aiRIM context |
| Full release contracts | PASS |
| Typecheck / focused lint / web build | PASS |
| New model accuracy, dietary safety, human preferences | NOT established |

The first UI harness used a name-text count across both comparison and result views, falsely flagging two visible occurrences as duplicate rows. It was corrected to assert actual list buttons; the final6-case rerun passes. Initial failure screenshots remain local.

## Evidence

- Fixture: `qa/fixtures/menu-food-evidence-oct8.json`, source trace hashes included.
- Regressions: `scripts/check-matchrim-menu-food-evidence.ts`, `scripts/check-matchrim-food-client.ts`, `scripts/check-matchrim-food-contract.ts`.
- Mobile runner: `scripts/qa-matchrim-menu-food-evidence.py`, fully intercepted requests on local4433.
- Portable screenshots/results: `docs/qa-evidence/matchrim-menu-food-evidence-2026-10-11/`.
- Full artifacts/logs: `/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim-menu-food-evidence-20261011/`.

## Residual

- BBQ extraction still returns8 recorded rows with omissions; no claim that prompt changes fix recall until deployed to an approved isolated runtime and measured.
- Qualitative pairing reasons are model hypotheses, not verified ingredients, personal food tastes or allergen advice. No clinical/dietary safety claim.
- Learned-profile input parity and catalog sensory provenance/coverage are next. Whole-product score calibration is not solved by removing unsupported percentages.
- Baseline78 simulator binary remains unchanged. Combined source still needs native build/physical gates before any release decision.
