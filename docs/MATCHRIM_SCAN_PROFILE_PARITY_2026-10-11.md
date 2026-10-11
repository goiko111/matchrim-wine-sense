# Scan profile parity and catalog coverage

Local assignment MATCHRIM-5H-20261011-01, batch3. No remote requests, deployment, upload or Apple action. All UI account/catalog responses are synthetic; catalog coverage uses frozen October8 responses.

## Corrections

- Label and wine-menu scans now load one owner-scoped profile snapshot: account quiz plus explicitly opted-in rated wines through the existing learning function. Both scoring and detailed explanation receive the same unrounded snapshot.
- Authenticated failures never reuse an anonymous/stale cached quiz. Missing training falls back to the freshly loaded account quiz with a visible warning; missing quiz means no numerical affinity. A five-second profile-load deadline avoids blocking recognition indefinitely.
- Account change/sign-out remounts scan state, cancels scan work and clears locally stored dimension feedback. Feedback is owner-scoped, including immediate state isolation before effects run.
- Displayed weights now match the existing calculation: five equally weighted core axes. Wood/intensity are additional information with zero scoring weight. Global scoring was not changed. The displayed range is explicitly not a statistical confidence interval or probability.

## Expected / Actual

| Controlled case | Expected | Actual |
| --- | --- | --- |
| Learned profile, same catalog wine in label/menu | Identical score and dimension inputs | 89% / 89%, identical five rows |
| Training unavailable, valid account quiz | Explicit quiz fallback in both modes | 57% / 57%, fallback note |
| Quiz unavailable, stale local quiz present | No stale affinity | No percentage in both modes |
| Profile request never resolves | Bounded wait, continue without affinity | Approximately5.5seconds including local image preparation |
| Sign-out after detail feedback | Results and owner feedback removed | Pass in8 scenarios |
| Portrait393x852; landscape852x393 at135% CSS text | Scrollable detail, no horizontal overflow | Pass; inspected screenshots |

8/8 controlled UI scenarios passed with zero page exceptions and zero external calls. CSS text scaling is not native Dynamic Type; browser checks are not VoiceOver certification or real account/RLS integration. Scores are controlled examples, not real-user preference accuracy.

## Recorded catalog gate

Across26 historical search-wines responses:138 rows,60 with an id, **zero with complete usable sensory attributes**. Rows can repeat; this is response coverage, not a census of the production catalog. Consequently, canonical sensory data/provenance remains an external data-contract gate. Do not fill missing attributes from the image model merely to display a percentage.

## Verification / Candidate

- New profile/learning/isolation/weight contracts and full `npm run test:release`: PASS.
- Typecheck: PASS. Full lint: zero errors,107 pre-existing warnings. Web build: PASS.
- Unsigned Debug iOS simulator candidate79 compiled successfully; CFBundleVersion verified79. Source build-number metadata is unchanged;79 is a local command-line override, not a reserved Apple number. Not installed/launched or submitted. Baseline78 preserved.
- Portable evidence: `docs/qa-evidence/matchrim-scan-profile-2026-10-11/`.
- Full logs, screenshots and DerivedData79: `/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim-scan-profile-20261011/`.

## Residuals

Live catalog coverage/canonical provenance, independent OCR identity/recall, human preference calibration, physical accessibility and signed distribution remain unapproved. Prepared food backend changes are still local. No new recognition performance claim follows from these replay/synthetic tests. Tester invitation remains unsent pending the already identified owner Apple intervention; no repeat login attempt.
