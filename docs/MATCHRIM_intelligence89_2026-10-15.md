# Matchrim intelligence89: Offline Learning Evaluation

Scope: new sidecar scripts, synthetic fixtures, JSON template and this report only.
Starting repository HEAD: `ac6516c870a017c9cbdc907d4fd24fd1af0e29a0`.
Other agents are editing this checkout. No application, scoring, learner, shared
function, package script or pre-existing QA document was edited by this lane.
No commit, push, deploy, account access, human tasting or provider call was made.

## Finding: What 44/45 -> 33/45 Actually Measures

Read alongside `MATCHRIM_PRETESTFLIGHT_50_QA_2026-10-15.md` and
`MATCHRIM_85_50_ACCOUNT_QA_2026-10-14.md`, without replacing their findings.
The old private evidence is under the recovered task's
`artifacts/matchrim85-50users-qa-20261014/intelligence/`:
`baseline/harness.ts`, `baseline/metrics.json`, `catalog-fixture.json`,
`harness.ts`, and `after-main-final-r1/metrics.json`.
No private account data or credentials were copied into the new fixtures.

The old ranking has a concrete methodological defect: for each candidate, remove
its own rating, fit a different profile, score that candidate, then combine all
eight scores into one ranking. All 45 rankings mix three or four different
profiles. Absence of the target row in its own fold is true, but it does not make
that ranking one deployable recommendation state. The verifier only checked the
former condition. In addition, the oracle is a squared/asymmetric utility centered
on the quiz vector, and the three training wines/ratings are selected using the
oracle's ranking of the full eight-item catalog (ranks 0/3/7). Those are neither
independent outcomes nor an outcome-independent tasting sample.

The same 44 -> 33 diagnostic is present in the baseline and final-source metrics.
It compares cold versus learned states, not two source revisions. Reproduction
with the current, unmodified learner gives:

| Diagnostic | Before | After |
| --- | ---: | ---: |
| Historical mixed-profile top1 | 44/45 | 33/45 |
| Historical linear-gain NDCG@3 | 0.999498803373 | 0.997922889786 |
| Historical mean oracle regret, 0..100 utility | 0.022222222222 | 0.404444444444 |
| One shared profile, only five wines absent from all training | 40/45 | 41/45 |

The five-item result is a separate counterfactual, NOT a corrected replacement
for the old eight-item metric or evidence of improvement in real people.
Removing rejections in the old mixed-profile diagnostic gives 38/45 top1, not
33/45. This is an ablation explaining sensitivity, not a proposed model change.
Large positive utility offsets and linear gains also make NDCG stay near one
despite top1 changes. No weights were selected or tuned from these results.

No new concrete application/learner bug is established by this investigation.
The methodological defect was reported before adding this isolated sidecar.
The pure learners deliberately lack owner/catalog validation; caller boundaries
must supply it. The sidecar supplies a stricter evaluation boundary, not a claim
to have repaired all production callers. Existing presentation, food, identity
and catalog-coverage findings remain separate.

## Runnable Workflow

Run from the repository root with the installed dependencies. No installation,
database, browser, credentials, network, or paid service is needed.

```bash
node --import tsx scripts/check-matchrim-intelligence89.ts
./node_modules/.bin/tsc -p scripts/tsconfig.intelligence89.json
```

The checked-in `matchrim-intelligence89-plan-template.json` is intentionally empty
evidence: null base profile, unknown sensory sources, no consent and no ratings.
It can run, but must return insufficient evidence. To produce another template:

```bash
node --import tsx scripts/run-matchrim-intelligence89.ts template /tmp/study-intelligence89-plan.json
```

Prepare the plan BEFORE test outcomes exist. Use pseudonymous owner IDs and
opaque item IDs. Set a cutoff in the past and independently predeclare the panel,
minimum cohort and candidate selection. The defaults are 20 owners, at least
three eligible training wines and three test wines per owner; these operational
minimums are not a statistical power calculation or a release threshold.
Keep development/tuning owners and wine families out of this final panel. Do not
reuse the final panel after inspecting outcomes to choose weights or thresholds.

Populate each owner's original quiz vector, latest authoritative training rows,
and a disjoint test list. Training uses the existing explicit three-category
ratings, not favorites, quantities, consumption, model output or predicted scores.
Training `rated_at` is the actual rating time, not a later metadata-edit time.
Rows must be at/before `cutoff_at`. Do not supply append-only rating revisions:
duplicate row IDs fail closed. Resolve them against the authoritative latest
snapshot first, retaining unrated/withdrawn rows as non-training evidence.

For eligible features, copy the real catalog-linked wine's `sensory_attributes`
and `place_details.bodega_sensory_evidence` from a trusted export. Set
`feature_source: "catalog"` and `feature_reference` to its independent source
reference. Do not manufacture proof with `makeCellarCatalogEvidence` for real
data. Synthetic helpers in the fixture module are explicitly NOT real sheets.
The original identity and attribute signatures must still match.

`wine_group` must be a stable, curator-checked family key shared across aliases
and vintages. The evaluator also checks normalized name+producer and catalog ID.
Any match across train/test for one owner aborts the plan, even if the earlier
row is opted out or unsupported. Duplicate train/test identities also abort.
Different owners may taste the same wines: fits are independent per owner, with
no population model. JSON cannot prove that differently named owners are
different people or discover aliases missing from all supplied identity keys.

For a real collection use `evidence_kind: "independent_blind_human"` and
`rating_source: "independent_blind_human"` only for genuinely independent blind
training ratings. The evaluator excludes other label sources. It does not
authenticate the claim; independent human collection has NOT happened here.

Freeze predictions and make the ballot before the held-out tastings:

```bash
node --import tsx scripts/run-matchrim-intelligence89.ts freeze /tmp/study-intelligence89-plan.json /tmp/study-intelligence89-freeze.json /tmp/study-intelligence89-ballot.json
```

All output basenames must include `intelligence89`; existing files are never
overwritten and new outputs have mode 0600. The freeze is PRIVATE: it contains
features, training, profiles, evolution and predictions. Give raters only their
own ballot rows and the corresponding randomly ordered coded samples. The
coordinator can join `item_id` to the plan to pour the correct samples; keep that
identity key and all predictions away from raters. Merge the returned owner rows
into the complete ballot without changing its manifest IDs/codes.

Only fill `rating` with `love`, `ok` or `not_for_me` and `rated_at` with the true
ISO timestamp, strictly after freezing. Leave both null for missing outcomes.
Set `collected_without_predictions: true` only if that is actually true. Never
convert missing outcomes to rejection, invent dates or call synthetic values
human. No score or model-ranked choice is shown in the generated ballot.

```bash
node --import tsx scripts/run-matchrim-intelligence89.ts evaluate /tmp/study-intelligence89-freeze.json /tmp/study-intelligence89-ballot.json /tmp/study-intelligence89-result.json
```

The evaluator verifies the freeze checksum, plan and local source hashes, then
replays the TRAINING-ONLY fit to verify sealed predictions before it reads labels.
Test labels never enter a learner call. Freeze the source version too: evaluation
refuses source drift rather than silently comparing a different algorithm.
The SHA256 envelope detects accidental edits, not malicious resealing. Archive
the original freeze hash with an independent timestamp/witness before collection
when stronger audit provenance is required.

## Outputs And Abstention

- One final learned vector per owner scores EVERY held-out candidate. No ranking
  assembled from different leave-one-out fits.
- Evolution milestones 0/1/3/6/12/24/48/final use dated training prefixes and
  recompute from the original quiz, never recursively from a learned profile.
- Training exclusions carry reasons: no consent/rating, unsupported label or
  feature source, missing source reference, unbound/invalid sensory evidence.
- Missing quiz means no numeric prediction. Missing/unsupported test features,
  incomplete outcomes, too few eligible training/test items, or no rating
  contrast exclude the whole owner from effectiveness metrics. They are not
  dropped candidate-by-candidate to improve the ranking.
- `INSUFFICIENT_EVIDENCE` is returned for an inadequate independent-human panel.
  Per-owner reasons, denominators and null metrics remain visible. An unfilled
  human template gives zero eligible owners and `macro: null`.
- Synthetic runs always say `SYNTHETIC_ONLY_NOT_HUMAN_VALIDATION`. A sufficient
  claimed human panel still only says `DESCRIPTIVE_ONLY_NOT_RELEASE_VALIDATION`.
  These are evidence states, not a test-suite PASS or release decision.

Metrics are paired per-owner top1, NDCG@3 with ordinal gains 0/1/2, and non-tied
label pair concordance. Score ties get expected gain/top1 and half-credit pairs,
not an advantage from ID sorting. Equal labels have no ranking contrast, rather
than automatically getting perfect NDCG. Macro averages give each eligible owner
one vote. A fixed-seed 2,000-resample owner bootstrap reports a descriptive 95%
interval only once the predeclared owner minimum is met. It does not establish
independence, causality, probability calibration or external validity. Retain
excluded-owner counts; a complete-case result can still have missingness bias.

Affinity uses the current native local L2 scorer. Learner confidence is an
evidence heuristic, not a probability of enjoyment. The legacy learner rounds
sensory fractions and clamps sensory zero to one; the evaluator preserves and
tests that behavior. Therefore direction assertions use integer 1..5 sensory
points, not arbitrary fractional/zero taste assumptions. A single `ok` and a
single `love` produce the same normalized direction under this algorithm;
confidence need not increase monotonically when contradictory ratings arrive.

## Verification On 2026-10-15

- New sidecar: 76/76 assertions, scoped TypeScript check and scoped ESLint PASS.
- Existing `check-matchrim-qa85-intelligence.ts`: 63/63 PASS, including exact
  no-weight-change guards on both learner sources.
- Existing `check-matchrim-training-evidence.ts`: 28/28 PASS.
- Existing `check-matchrim-learning.ts`: PASS.
- CLI template -> freeze -> empty ballot evaluation: `INSUFFICIENT_EVIDENCE`,
  zero eligible owners, null aggregate. Refusal to overwrite is also checked.
- Tests include identity aliases/duplicate IDs, wrong owners and target mapping,
  post-cutoff leakage, test labels embedded in plans, unsupported/inferred/model
  training, stale feature bindings, consent withdrawal/rerating/removal,
  per-axis positive/adverse directions, contradictory evidence, recent reversal,
  deterministic seeded noise, no quiz/no training/no sensory/no ratings,
  cross-owner independence, frozen-label permutation, tampering and score ties.
- Test harness and CLI deny fetch and TCP/TLS/HTTP/UDP connections. Evaluation
  made zero network attempts; two deliberate fetch/TCP guard probes were blocked.
- The first local run had three harness failures (two fixture ID collisions and
  one invalid confidence comparator). They were corrected in NEW sidecar files;
  the unmodified learner was not tuned to make them pass.

Machine-readable checks, hashes, scenario outputs and historical reproduction:
`qa-evidence/matchrim-intelligence89-results.json`. This is synthetic evidence
only, not another 45 or 50 people. Full application, live catalog, hosted Edge,
UI, RLS, actual sensory fidelity, actual blinding and human usefulness were NOT
validated by this offline lane. No global suite/build or release approval is
claimed while other agents edit shared application files.
