# Matchrim next steps

## TestFlight processing

1. Restore the App Store Connect browser session; the latest readback redirected to `authResult=FAILED`.
2. Confirm that build 64 appears as `Lista para enviar` and remains assigned to the internal `Testers Matchrim` group. Until that screen is visible, only the successful upload is certified.
3. On the already installed physical build, perform one human camera/gallery pass with a multi-bottle image and one menu or board while Apple processes the beta.

## Backend follow-up

- Restore Supabase management permission for project `cbjynrbvrhcmpaojmqdp` before any function deployment or version certification.
- Run authenticated staging accounts for the three behavioral personas when an isolated tenant or approved test-account path is available.
- Keep runtime vision v3 unchanged until the independent real-image benchmark clears the production precision gate.
- Use `docs/MATCHRIM_RECOGNITION_MATRIX_2026-09-28.md` as the release baseline. Current P0 failures are single-label precision/recall, multi-label precision, `IMG_7547` recall and food-menu coverage/segmentation.
- For food menus, remove the hard eight-item completeness ambiguity: preserve sections, return individually segmented dishes, expose truncation explicitly and rerun `python3 scripts/qa-matchrim-food-menu.py` until precision and recall both reach `0.90` on independent scenes.
- Do not create build 65 for these findings alone. The demonstrated defects require a staged backend/contract correction and a fresh real-image gate first.

## Non-blocking engineering debt

- Split the largest Vite chunks, especially map and PDF code.
- Resolve the 107 existing lint warnings in a separate cleanup change.
- Remove the two unassigned splash children reported by Xcode asset compilation.
