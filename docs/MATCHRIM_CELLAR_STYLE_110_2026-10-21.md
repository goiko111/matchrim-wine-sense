# Native Bodega reference-style continuity 110

## Product Change

When a user explicitly selects an independently verified public Winerim reference without a vintage, Bodega can retain a separate style estimate and the initial profile snapshot. Current style is recalculated from the current validated profile. This does not turn the NV fiche into evidence for the bottle's vintage.

- Native scanner saves identity-bound `matchrim_reference_style110` alongside the public reference107.
- Readback must return the exact validated metadata before save is acknowledged. JSONB key reordering is allowed; dropped/changed identity, scale, attributes, initial score or profile is rejected.
- Bodega detail shows a concise style score, up to two matching dimensions and one friction, then the saved initial score and change. Source and limits remain available.
- Exact-vintage affinity takes precedence. Reference style never writes canonical identity, sensory training attributes or exact affinity evidence. A personal rejection takes precedence over the high-affinity recommendation filter.
- Existing wines without the new metadata are not silently backfilled. No production database mutation or schema migration was executed.
- The bottle photo has fixed native dimensions so maximum text size does not double its height. The web branch retains its former image layout and filtering behavior.

## Tests And Gates

`node --import tsx scripts/check-matchrim-cellar-style110.ts` passes ten contract groups, including 50 distinct synthetic profiles, serialization, invalid data, save acknowledgment and rejected-wine filtering. These are mathematical consistency checks, not 50 real users or evidence of prediction accuracy.

A read-only independent review reproduced two defects before compilation. Both are fixed: a catalogue attribute revision can no longer reset the saved initial record (including an absent initial profile), and loading/profile-read failures no longer ask a user to repeat an existing test. The current comparison deliberately retains the originally saved catalogue snapshot; catalogue refresh/version migration is not silently performed. `TSX_TSCONFIG_PATH=tsconfig.app.json node --import tsx scripts/check-matchrim-cellar-style110-ui.tsx` passes six actual React presentation groups for loading, retry, missing/invalid and scored states. The first harness invocation used the root tsconfig's classic JSX transform and failed with `React is not defined`; the app-specific JSX configuration resolves that test setup issue without changing production imports.

Focused lint, existing cellar scale and reload tests pass. Full typecheck, production-mode bundle, responsive visual regression, genuine simulator gallery flow and native accessibility are pending a new candidate103; frozen102 receipts do not certify110.

No backend deploy, paid model start, Lovable turn, published web change or TestFlight upload is part of this change.
