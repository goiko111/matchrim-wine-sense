# Matchrim next steps

## Immediate release follow-up

1. Keep Matchrim `1.0 (65)` unexpanded in TestFlight while the cabinet identity gate is red.
2. In isolated staging, use the new trace to capture final merged box, crop hash and result for every region. The old 29/30 mismatch is already explained as a runner-observability defect.
3. Reconcile traced regions to the manual bottle slots, mark the mapping validated, then rerun `scripts/score-matchrim-fridge-identity.py`. Do not accept invented precision/recall when the trace is incomplete.
4. Once App Store Connect authentication is available, verify processing read-only. Do not assign testers until the identity gate is accepted.
5. After the backend gate, run the physical-iPhone pass for first launch, camera/photo permissions, one multi-bottle image, one menu and VoiceOver.

## P1

- After valid spatial reconciliation, improve cabinet OCR/canonical matching and calibrate confidence against the versioned bottle-level annotation.
- Run authenticated staging accounts for the three behavioral personas and verify Bodega CRUD, restart and account switching.
- Apply `20260929040430_matchrim_user_wines_canonical_identity.sql` only in isolated staging after its duplicate preflight passes.
- Run the `10 -> 50 -> 200 -> 1,000` staging load ramp only with a non-production project, preprovisioned users and cost approval.

## Backend

- Restore Supabase management permission for `cbjynrbvrhcmpaojmqdp` before any future function deployment or version certification.
- Keep production vision functions unchanged until a staged candidate demonstrates a measurable gain on the independent 25-scene set.
- Food-menu segmentation remains a separate P0: deploy its local contract correction only to isolated staging and rerun the 54-dish fixture.

## Engineering debt

- Raise the iOS deployment target to 15 before April 2027.
- Split the largest Vite map/PDF chunks.
- Resolve the 105 existing lint warnings in a separate cleanup change.
