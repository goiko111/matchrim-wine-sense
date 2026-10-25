# Matchrim207: cursive-label regression and sensory contract review

## Scope

Continue the native-only work without web/main/backend changes or extra spend.
Product remains the previously verified local candidate108, sourceccff399; no new
IPA, publication or TestFlight upload. This block changes QA tools/fixtures only.

## New supplied photo

- Exact private local copy: `qa-artifacts/example207-20261025/source/user-label.jpeg`.
- 113628bytes; SHA256 `109348469c88dbdc7c7cfdc3cd00c435e53d887687d6460548dcc6f8468f66a0`.
- Photo stays outside Git. It includes a bystander/domestic background; no external
  upload is authorized or performed. Only text observations/hashes enter fixtures.
- Human visual observation: clearly `Pinot Noir` and `2023`; cursive name possibly
  `Les Quatre Piliers`, NOT confirmed. Producer/region/canonical ID/sensory/affinity
  unknown. Do not add an alias, producer or catalogue ID from this observation.

## Actual Pixel OCR: Partial, Not Recognition PASS

Apple Vision revision3 accurate on macOS, CPU-only, es/en/fr, no custom dictionary.
All compiler/OCR processes ran inside a network-denying sandbox. The input sent to
the worker contains only the exact photo path/hash and processing options, not the
human expected strings. This is NOT execution of the iPhone plugin/UI.

| Run | Input | Actual cursive reading | OCR confidence | Pinot Noir /2023 | OCR time |
|---|---|---|---|---|---|
| r1 | Whole original899x1599 | Le Quatre Putes | 1.0 | Both read | 520ms |
| r2 | Manually selected label352x369 | Le Quate Pies | 1.0 | Both read | 346ms |
| r3 | Same manual region, language correction off | L Quete Ptes | 0.30 | Both read | 220ms |

The crop is an explicit manual region, NOT a newly validated detector. None of the
three names is accepted as canonical. `REPORT.passed` covers only the two clear
literal checks, NOT the cursive name or overall wine recognition. r2/r3 explicitly
state `recognitionGate: partial-reading-only`; r1's narrower scope remains intact.
OCR confidence1.0 is demonstrably not proof of correct spelling or identity.

Raw outputs/receipts retained under `qa-artifacts/example207-20261025/ocr-r1..r3`.
Their hashes, original receipt source hashes and exact OCR data are committed in
`qa-fixtures/example207/OBSERVED.json`; intake/acceptance in `ACCEPTANCE.json`.

## Contract Regression

`node --import tsx scripts/check-matchrim-example207.ts`: 7/7groups PASS.
Tests separate simulated text from actual macOS OCR replay, preserve literal
observations, reject stale scores/IDs, keep unknown producer and prevent catalogue
invocations/affinity. Device-shaped replay is explicitly injected test data, not
an assertion that an iPhone executed OCR. Original photo/hash verified unchanged.

The first six-group run passed. The first seven-group run failed because the test
incorrectly assumed all three OCR variants had confidence1.0; r3 is0.30. Corrected
the assertion to target r1 only; failure log retained as `CONTRACT_TESTS_FINAL.log`,
final passing run `CONTRACT_TESTS_FINAL-r2.log`. No product defect concealed.

No recognizer setting promoted from this one-photo experiment. Need independent
canonical identity evidence and representative recognition QA before such a change.

## Actual Development Reply

Found a previously unread cached reply dated24Oct2026,21:06Madrid, to the verified
18:59review. UID157ED/message010001a16f4e4211-f258c2f3-584e-47d3-b22c-4763d2dbdcc3.
This is NOT a fresh server refresh/completeness claim. Primary body and five genuine
attachments retained with hashes in `qa-fixtures/master207/DEVELOPMENT_REPLY.json`.
Reviewed attached `validate.py` as source; did not execute attachment code.

Development reports backendrelease829/includeUnlisted deployed, no `listed` field,
nullable public IDs/URL, no preserved full response envelopes. Their implementation
and deployment remain attributed, not independently re-read. Sensoryrev2 is proposed,
NOT deployed. Safe bridge still needs explicitly authorized main/secret/Lovable
steps; no permission inferred from this reply or the user's new photo.

Independent Ajv6.12.6draft07 + local X1-X7 replay:
`node scripts/check-matchrim-sensory207.mjs`: 8provided valid examples accepted,
20schema negatives rejected,10cross-field negatives rejected; 38provided cases pass.
Two additional counterexamples also reproduce, so 40test checks PASS while the
CONTRACT REVIEW IS NOT APPROVED:

- R207-1/P0: in `zorrera_2015`, change exact row.vintage and requested to `2023`
  without changing knownVintages/vintages `[2019,2015]`. Schema AND supplied cross
  rules accept a sensory harvest absent from both declared vintage lists.
- R207-2/P1: recorded AI origin.confidence=-10 is accepted by both layers. Existing
  local188source parser requires0..1. Specify scale and enforce finite bounds.

Prepared reply: `docs/MATCHRIM_DEVELOPMENT_REVIEW_207_2026-10-25.txt`. NOT SENT:
desktop idle samples remained below1second; no GUI focus, mailbox mutation or
interference with human/other work. No mac-desktop lease requested/claimed.

## Resources And Remaining Gate

- Disk above31GiB at intake and31.76GiB before OCR; no cleanup/foreign process stop.
- heavy-local initiallyBUSY; later explicitlyACQUIRED8c023ed0 before OCR, released
  after its three processes completed. Writer9914805a held only for this branch's
  changes; preceding intake writera8c239f2 released before ordered reacquisition.
- Focused ESLint PASS. No repeated green app suites/build/mobile sessions for a
  QA-only delta. No automatic consent/login/ratings or retained-profile app launch.
- Zero new catalogue GET/SQL/model/image-provider/Lovable/Keychain calls; caps and
  existing allowances unchanged. No secrets in fixtures, photo untracked.
- Still open: robust cursive identity, full hosted bridge/search contract,
  vintage/per-axis sensory evidence, representative200recognition and affected
  real app QA. Native108UI evidence from206 is not evidence those gates pass.

Next: send the prepared scoped contract counterexamples when desktop is safely
available; review corrected existing material. No new paid or free-read allowance
is created by this checkpoint. TestFlight remains HOLD.
