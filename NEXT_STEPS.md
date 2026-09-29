# Matchrim next steps

## Integral QA release gate

- Do not upload another TestFlight build as a substitute for QA. Use `docs/MATCHRIM_INTEGRAL_QA_2026-09-29.md` as the executable coverage and exit matrix.
- P0: correct recognition in an authorized staging backend until every supported category reaches precision and recall `>=0.90`, including food-menu coverage and segmentation.
- P0: complete a physical iPhone journey with camera/gallery, real multi-label, wine list, board and food menu plus VoiceOver/Dynamic Type evidence.
- P1: provision an isolated tenant and synthetic mailbox domain, then run all ten authenticated personas through Bodega CRUD, restart and account switching.
- P1 local code complete: confidence now accounts for diversity, contradiction and recency; keep the authenticated staging rerun open.
- P1 migration prepared: apply `20260929040430_matchrim_user_wines_canonical_identity.sql` only in isolated staging after its duplicate preflight passes. Do not merge user rows automatically.
- P1 harness prepared: run `npm run qa:staging:load` first in dry-run, then the `10→50→200→1,000` ramp only with a non-production project ref, preprovisioned users and rate/cost approval.

## TestFlight processing

1. Restore the App Store Connect browser session; the latest readback redirected to `authResult=FAILED`.
2. Confirm that build 64 appears as `Lista para enviar` and remains assigned to the internal `Testers Matchrim` group. Until that screen is visible, only the successful upload is certified.
3. On the already installed physical build, perform one human camera/gallery pass with a multi-bottle image and one menu or board while Apple processes the beta.

Build 65 now exists as a signed local archive and has not replaced build 64 in TestFlight. Before upload, obtain explicit authorization to transmit the five named QA images to the production Matchrim vision path, run the reproducible real-image benchmark and require the recognition thresholds to pass.

## Backend follow-up

- Restore Supabase management permission for project `cbjynrbvrhcmpaojmqdp` before any function deployment or version certification.
- Run authenticated staging accounts for the three behavioral personas when an isolated tenant or approved test-account path is available.
- With those accounts, verify account A to account B switching, saved-wine exclusion against actual `user_wines`, and the exhausted-catalog route to Bodega. The local fixture gate is green but deliberately does not claim authenticated E2E coverage.
- Keep runtime vision v3 unchanged until the independent real-image benchmark clears the production precision gate.
- Use `docs/MATCHRIM_RECOGNITION_MATRIX_2026-09-28.md` as the release baseline. Current P0 failures are single-label precision/recall, multi-label precision, `IMG_7547` recall and food-menu coverage/segmentation.
- Food-menu source correction is ready locally: 60-row limit, independent rows, dedupe and explicit coverage/truncation. Deploy the candidate to isolated staging, then rerun `python3 scripts/qa-matchrim-food-menu.py`; recorded real recall remains `0.2407` and is not closed by local replay.
- Rerun the current multi-label detector/analyzer source on the 25-scene independent set. Local box normalization is `0.8438` precision / `0.9310` recall, while recorded multi-label identity remains `0.5000` / `0.8889`.
- Do not upload build 65 for these findings alone. The demonstrated defects require an authorized fresh real-image gate and, if still failing, a staged backend/contract correction first.

## Internal gates now closed

- Three deterministic personas learn different rankings, persist independently and promote the next coherent recommendation after saving the first.
- Saved-wine matching is producer-aware and vintage-aware, never recycles a fully saved result set, and cannot reuse cellar state across account ownership.
- Inicio, Escanear and aiRIM are separate routes with explicit active navigation; aiRIM keeps a failed question available for retry.
- Empty catalog and backend failure are distinct, recoverable states.
- Confidence no longer reaches 100% from repeated or contradictory rows; five recent changed-preference signals reach the top three and sustained evidence reaches first.
- Food-menu merged-row correction, Bodega canonical identity checks, load dry-run, 27/27 scan UI and 34/34 route smoke are reproducible locally.

## Non-blocking engineering debt

- Split the largest Vite chunks, especially map and PDF code.
- Resolve the 107 existing lint warnings in a separate cleanup change.
- Remove the two unassigned splash children reported by Xcode asset compilation.
