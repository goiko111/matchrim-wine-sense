# Matchrim next steps

## Integral QA release gate

- Do not upload another TestFlight build as a substitute for QA. Use `docs/MATCHRIM_INTEGRAL_QA_2026-09-29.md` as the executable coverage and exit matrix.
- P0: correct recognition in an authorized staging backend until every supported category reaches precision and recall `>=0.90`, including food-menu coverage and segmentation.
- P0: complete a physical iPhone journey with camera/gallery, real multi-label, wine list, board and food menu plus VoiceOver/Dynamic Type evidence.
- P1: provision an isolated tenant and synthetic mailbox domain, then run all ten authenticated personas through Bodega CRUD, restart and account switching.
- P1: add canonical storage-level upsert/uniqueness so the same wine cannot be inserted twice while different vintages remain independent.
- P1: calibrate confidence for diversity, contradiction and recency, then rerun the weak/sustained preference reversal.
- P1: run the staged 10→50→200→1,000 virtual-user load plan only with rate and cost approval.

## TestFlight processing

1. Restore the App Store Connect browser session; the latest readback redirected to `authResult=FAILED`.
2. Confirm that build 64 appears as `Lista para enviar` and remains assigned to the internal `Testers Matchrim` group. Until that screen is visible, only the successful upload is certified.
3. On the already installed physical build, perform one human camera/gallery pass with a multi-bottle image and one menu or board while Apple processes the beta.

The current local personalization delta requires a new signed build only when the next native candidate is explicitly authorized. It has not replaced build 64 in TestFlight.

## Backend follow-up

- Restore Supabase management permission for project `cbjynrbvrhcmpaojmqdp` before any function deployment or version certification.
- Run authenticated staging accounts for the three behavioral personas when an isolated tenant or approved test-account path is available.
- With those accounts, verify account A to account B switching, saved-wine exclusion against actual `user_wines`, and the exhausted-catalog route to Bodega. The local fixture gate is green but deliberately does not claim authenticated E2E coverage.
- Keep runtime vision v3 unchanged until the independent real-image benchmark clears the production precision gate.
- Use `docs/MATCHRIM_RECOGNITION_MATRIX_2026-09-28.md` as the release baseline. Current P0 failures are single-label precision/recall, multi-label precision, `IMG_7547` recall and food-menu coverage/segmentation.
- For food menus, remove the hard eight-item completeness ambiguity: preserve sections, return individually segmented dishes, expose truncation explicitly and rerun `python3 scripts/qa-matchrim-food-menu.py` until precision and recall both reach `0.90` on independent scenes.
- Do not create build 65 for these findings alone. The demonstrated defects require a staged backend/contract correction and a fresh real-image gate first.

## Internal gates now closed

- Three deterministic personas learn different rankings, persist independently and promote the next coherent recommendation after saving the first.
- Saved-wine matching is producer-aware and vintage-aware, never recycles a fully saved result set, and cannot reuse cellar state across account ownership.
- Inicio, Escanear and aiRIM are separate routes with explicit active navigation; aiRIM keeps a failed question available for retry.
- Empty catalog and backend failure are distinct, recoverable states.

## Non-blocking engineering debt

- Split the largest Vite chunks, especially map and PDF code.
- Resolve the 107 existing lint warnings in a separate cleanup change.
- Remove the two unassigned splash children reported by Xcode asset compilation.
