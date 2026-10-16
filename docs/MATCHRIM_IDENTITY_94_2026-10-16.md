# Matchrim: identity and sensory linkage94

## Scope And Distribution

Application source: `6f45254`, after `f66edd6` and `21aec97`, on
`codex/matchrim82-cloud-integration-20261013`. This is the next local development
revision, not an update to the immutable uploaded93. Published web, production
functions, schema, secrets, photos/corpora and accounts have not been changed.
No Lovable agent credits, paid model calls or new TestFlight upload in this block.

Apple accepted1.0(93) on2026-10-16 at11:25Madrid. Its upload receipt proves
acceptance/start of processing only. The owner now explicitly reports93 does
not appear in their TestFlight. Brave and Chrome App Store Connect remain stuck
at login; official credential-free altool read returns Authentication required22.
The exact remote processing/tester-group state remains unknown. Do not upload93
again or claim it is available. An ordinary authenticated Apple session is the
remaining access gate; no credentials were extracted or requested in chat.

## Corrections

- Native lookup reads the public Winerim Library resolver, a complete search page
  and the exact ID/slug detail. It does not turn the local wines-table UUID or AI
  suggestions into an original fiche. All reads omit credentials, images and
  personal taste profiles, have bounded bodies/deadlines, and are cancellable
  even when a transport ignores AbortSignal.
- Menu lookup no longer depends on an already-high OCR confidence. A medium
  signal can be independently resolved when the complete name/producer is in its
  literal source and identity fields are not inferred. Weak or missing source
  evidence triggers no automatic lookup. An original fiche does not certify the
  physical bottle: OCR signal remains unchanged and visible separately.
- Exact original details feed the active menu/label affinity, including after an
  explicit original-fiche lookup. Wrong producer, geography, vintage, inferred
  identity, ambiguous IDs or a mismatching detail cannot acquire a score. An
  absent vintage cannot borrow a year-specific sheet. No fuzzy/plural/brand
  expansion silently confirms an identity.
- Producer matching preserves distinctive letters and order, allowing only the
  existing legal wrappers. Distinct IDs or contradictory sensory records are
  ambiguous regardless of response order.
- Verified Winerim0..5 values preserve real zeros and decimals. Explicit
  `scale: winerim-0-5` uses model `scan-local-l2-0to5-v2`, equal five-axis weights,
  Euclidean range5 and the existing conservative score adjustment. Thus93 is the
  maximum identical-vector score, not93% probability of liking a wine. Unmarked
  legacy values keep their old normalization, range4 and modelv1.
- The same marker survives learning, explanation, menu save and Bodega reload.
  Evidence/signatures bind the exact axes and scale; changing0 to1 invalidates
  them. Initial affinity retains its original profile, timestamp and model;
  current affinity may evolve without rewriting that history. No stored data
  was migrated. New recommendation responses retain the same exact0..5 values
  on native; their score therefore agrees with scans for identical inputs.
- Cross-review caught the menu save path rounding exact values and discarding
  the marker. `21aec97` fixes that real defect; actual save/reload bodies are
  covered with in-memory persistence, not asserted as real production writes.

## Verification

Private evidence root:
`/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim94-identity-20261016`.

| Gate | Expected / Actual | Evidence And Scope |
| --- | --- | --- |
| Source regressions |11/11 groupsPASS; typecheck0errors; lint0errors,106inherited warnings; web buildPASS |`regressions-final-r3/report.json`, source6f45254, inputs unchanged |
| Identity/scale contracts |28groupsPASS, including50deterministic profiles and legacy baseline parity |`test-identity94.log`; not50real users or human recommendation accuracy |
| Bodega/menu persistence |20groupsPASS, original values/model/initial/current preserved; missing data abstains |Actual MyWines and menu save/normalizer bodies with local dependency doubles; no real database writes |
| Component lifetime |20groupsPASS, cancel/retry, stale identity/unmount, malformed URL, text200% |`original-component-ui/`, mocked outbound Library transport |
| Full scanner mobile |27/27 scenarios,189checksPASS on the final6f45254 production web resources; portrait/landscape/320px text200% |`ui-final-r3/report.json`, captured first-party fiche and synthetic OCR/profile; zero outbound requests |
| Native final |Simulator and generic iOS compilationPASS; actual installed1.0(94); two XCTest methodsPASS |`native-final-r3/owned-native-layout-navigation94.xcresult`, actual normal/AXXXL text, portrait/landscape and five navigation targets; not new vision, physical, full VoiceOver or distribution acceptance |

### Real Public Catalog Controls

The final bounded probe makes10GETs and no mutations, files or paid model calls.
Each positive uses search plus independently read original detail. These are
explicit catalog controls, NOT identification of a bottle in one of the owner's
photos. The taste profile is synthetic: power2/acidity4/sweetness1/tannin0/fruit1.

| Control | Expected / Actual | Label / Menu Score | End-To-End Lookup Time |
| --- | --- | --- | --- |
| Manzanilla La Gitana, Bodegas Hidalgo La Gitana, NV |Verified original278688 / verified |93 /93 |777ms |
| Whispering Angel Rosé, Château d'Esclans,2024 |Verified original279207 / verified |74 /74 |520ms |
| Same Whispering Angel without scanned vintage |No borrowed2024 sheet / not-found |Pending /pending |194ms |
| La Gitana with a different producer |No identity match / not-found |Pending /pending |174ms |

Evidence: `live-final/live-catalog94.json`. These four controls are not global
precision/recall, p95 latency, wine-quality ratings or predicted human taste.

### Preserved Failed Attempts

- `regressions-r1`: two historical source-freeze assertions correctly detected
  the intentional later client-scale change; one test lacked its already-local
  offline parser dependency prefix. The migration's historical source protection
  remains verified, the reviewed new client source is separately fingerprinted,
  and unmarked legacy behavior is compared against the old actual functions.
  No assertions of real recognition accuracy were weakened.
- UIr1 lacked the Python Playwright path. UIr2 intercepted analytics writes from
  dev defaults and failed its no-write-attempt oracle; no requests reached
  production. Subsequent runs use analytics-disabled candidate configuration.
- UIr5 had a dev optimizer cold-load race and an early drawer-animation capture.
  Production preview plus settled geometry checks fixes the harness; failures
  remain preserved. UIr6 and the final-production-resource rerun both pass all27scenarios.
- Native preparationr1/r2 predate subsequent fixes and stay historical HOLD.

## Remaining Gates

1. Recover ordinary App Store Connect access, inspect93 processing and assignment
   to the owner's tester/group, and verify installability. The owner currently
   cannot see93. No external invitation or remote readiness is asserted.
2. Expand independently verified catalog identity/vintage coverage for the real
   photo controls. The earlier eight lexical IMG_7548 reads are not eight
   canonical matches. Gaudensius was observed with Sicily in the producer field;
   no unseen winery has been substituted. Lookup misses do not prove global
   nonexistence in Winerim.
3. Full paid vision rerun of the five images/200-image corpus and independently
   reviewed identity labels remains separate. This block makes no new OCR,
   exhaustive scene precision/recall, human tasting,50account or10000user claim.
4. Restaurant workspace identity/pairing coverage and actual production save/
   reopen across accounts remain separate E2E gates. Existing recommendation
   saves without bound fiche evidence still require Bodega verification; merely
   preserving their raw sensory marker does not invent an initial snapshot.
5. Final native/signed distribution/physical checks are required before a new
   TestFlight upload; local compilation is not release approval.

## Reproduction

`npm run test:identity94`

`MATCHRIM_RESTAURANT91_TEST_DEPS=/tmp/matchrim-restaurant91-offline-deps node scripts/run-matchrim-identity94-gates.mjs /absolute/private/evidence-directory`

`node --import tsx scripts/probe-matchrim-identity94.ts --live --output=/absolute/private/directory`
runs the four public controls. Without `--live` it performs no network access.

`node scripts/prepare-matchrim-release93.mjs /private/tmp/Matchrim94-NEW --build=94`
prepares isolated production/native-QA clones without changing the shipped93
project or published web. Original93 preparation remains the default.
