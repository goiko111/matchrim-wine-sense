# Matchrim scan evidence remediation, 2026-10-11

## Outcome

Implemented the next classification, identity and affinity-evidence block on top of `d63e6c9`, preserving the Oct8 real benchmark as baseline. No backend deployment, published-web change, additional vision call or TestFlight upload. Current code is a local candidate, not production certification.

The requested additional tester invitation is NOT sent. App Store Connect in the existing Brave tab redirects to login with authResult=FAILED. The owner was asked once to sign in; the tab remains available. Historical uploaded75 is the latest upload verified locally, NOT a fresh verification of current tester availability. Do not invent an invitation link or give a tester administrative Apple access. After login, inspect the latest eligible build and existing external-testing group, invite only the requested address, and verify invited status. Any required beta-review gate remains separate from successful binary upload.

## Implemented

- Shared category guard before label candidates, menu results and canonical matching: sake/junmai/ginjo, tequila/mezcal, Irish cream and other explicit non-wine categories no longer receive wine affinity. Classification checks identity/type fields, not prose tasting notes. A rejected region explains that the read reference is another beverage. This is a bounded lexical guard, not a universal beverage classifier.
- Vision responses cannot label themselves catalog-verified or provide a numerical affinity. The raw inferred sensory attributes remain available as explicitly inferred explanatory evidence, but overall affinity is pending until a separately matched catalog record supplies complete attributes.
- A shared deterministic calculation now uses the same profile and catalog sensory values for label and menu scans. No hosted model override can replace that result in the multi-label flow. Missing data or mismatched/unknown vintage suppress the percentage; user identity confirmation alone does not manufacture a sensory sheet.
- Catalog lookup preserves explicit tasting attributes when present, rejects non-wine results, and refuses ambiguous compatible matches from different wineries/vintages rather than selecting the first row. Missing attributes remain missing. Existing search endpoint/API contracts were not deployed or modified.
- Producer tokens split between name and winery reconcile conservative aliases such as MAMBA / La Quinta Mamba. Cuvee qualifiers, different vintages and contradictory producers stay separate. The prior regression that allowed a low-confidence contradictory producer to merge was deliberately corrected.
- A grouped row opens the region supplying its displayed candidate. Visual QA caught the previous mismatch where a76% catalog-backed summary opened an unrelated55%-confidence partial region.
- Counts now say grouped regions, not confirmed bottles. Coverage estimates are not presented as physical inventory. This does not fix the underlying detector's box/count accuracy.
- When a taste profile exists but sensory sheets do not, the menu now explains missing wine data instead of asking the user to repeat the quiz. Catalog resolution is reflected in the ranking progress phase.

## Verification

| Gate | Result | Scope |
| --- | --- | --- |
| New evidence regressions | 23/23 | Recorded Oct8 responses plus synthetic catalog controls |
| Full `npm run test:release` | PASS | Existing classifier, learning, identity, trace, food and release contracts |
| Typecheck | PASS | Final source |
| ESLint | 0 errors;107 inherited warnings | Final quiet rerun also passes |
| Web build | PASS | Existing large-chunk/Browserslist warnings remain |
| Mobile UI regression | 8/8 | Four scenarios x portrait393x852 / landscape852x393, Chrome emulated native shell |
| Mobile horizontal overflow | 0/8 | Not a universal layout/accessibility certification |
| UI page exceptions | 0/8 | Fully intercepted external requests |
| iOS simulator build | PASS | Debug, no signing, build override78 |
| Simulator install/launch | PASS | Matchrim QA iPhone16Pro / iOS26.0; home screenshot inspected |
| Physical device / TestFlight | NOT RUN | Not implied by simulator build or Chrome replay |

The first iOS build failed because this checkout lacked Pods. `pod install --deployment` restored locked Capacitor7.6.9 dependencies without changing the lockfile; subsequent build passed. Existing Splash unassigned-child and embed-framework-output warnings remain. Initial mobile QA failed because summary/detail pointed at different regions; the application was fixed and the final suite rerun. Earlier failure artifacts are preserved, not overwritten.

## Recorded before/after

| Case | Oct8 observed output | Fixed-client replay |
| --- | --- | --- |
| Non-wine bottles | Sake, tequila, Baileys shown as3 wines; sake approx67% | 0 wine candidates; explicit non-wine fallback |
| La Quinta Mamba | 2 reference groups with inconsistent76%/79%;4 purported bottles | 1 candidate group,4 regions requiring physical review; no percentage without catalog sensory evidence |
| Same wine / different image attributes | Original-menu names differed up to12 affinity points | Synthetic fixed catalog record yields identical score despite opposite image-inferred attributes |
| No verified sensory sheet | Photo/provider percentage retained | Percentage withheld; missing-data explanation |
| Menu with existing user profile | Asked to complete test despite available profile | Explains that wine sensory sheets are missing |
| Group summary/detail | Better representative displayed, first uncertain region opened | Opens the actual displayed representative |

These are deterministic postprocessing/UI results, NOT a new recognition benchmark. Oct8 name precision/recall remains97.10%/97.10% on four original menus; no new global accuracy figure is claimed. Provider request budget remains272/300 additional calls, plus historical289; zero new vision/catalog requests in the regression suite. The simulator home launch is a smoke check, not a network-intercepted end-to-end scan.

## Evidence

Local artifact root:

`/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim-evidence-fix-20261011`

- `final-v3/results.json`: final8-case matrix.
- `final-v3/aliases-catalog-portrait-detail.png`: separately supplied SYNTHETIC catalog sheet and corresponding detailed explanation. This is not a verified real Mamba tasting profile.
- `final-v3/aliases-pending-portrait-detail.png`: pending affinity without a sensory sheet.
- `final-v3/non-wine-portrait.png`: rejected non-wine references.
- `final-v3/menu-pending-landscape.png`: existing profile / missing wine-data explanation. Uses a controlled menu response, not recognition of the background photo.
- `simulator-launch.png`: native home only, safe-area visual smoke.
- `release-tests.log`, `lint.log`, `web-build.log`, `ios-build.log`: validation logs.
- `failure.txt`, `aliases-catalog-portrait-failure.png`: initial summary/detail mismatch.

Portable UI result/hashes are in `docs/qa-evidence/matchrim-evidence-fix-2026-10-11/`. Recorded response fixtures, including source-trace hashes, are in `qa/fixtures/scan-evidence-oct8.json`. No source photos are added to Git.

## Reproduce

```bash
npm run test:release
npm run typecheck
npm run lint
npm run build
npx cap copy ios
cd ios/App
pod install --deployment
```

From repository root, simulator build:

```bash
xcodebuild -workspace ios/App/App.xcworkspace -scheme App -configuration Debug -sdk iphonesimulator -destination 'platform=iOS Simulator,id=83282D15-477D-45F7-A3B5-82CB2B89B52D' -derivedDataPath /absolute/output/DerivedData build CODE_SIGNING_ALLOWED=NO CURRENT_PROJECT_VERSION=78
```

The project file still preserves77;78 is a command-line override for this unsigned simulator artifact, not a distributable IPA or Apple-reserved build number. The prior signed77 artifact is untouched. For UI replay, use the existing QA Python virtualenv with Playwright, the `with_server.py` helper and `scripts/qa-matchrim-scan-evidence.py --corpus <Oct8 new-sources> --output <new output>`. Port4431 is local-only and the helper shuts down after tests.

## Residual gates

1. Real catalog sensory coverage/provenance must be validated. Production search may return no sensory attributes; in that case fewer or no scan percentages is expected and intentional, not a claim that canonical recommendation coverage is solved. Full learned-profile/hosted-score parity remains outside this block.
2. Repeat affected real cases after approving an isolated runtime. No evidence yet of improved model OCR recall, calibrated identity confidence, or independent human recommendation outcomes. No extra budget consumed to relabel recorded replays as live recognition.
3. Dense-scene crop quality/cost, overlapping detections and exhaustive physical counts remain open. Four grouped regions is not proof of four bottles.
4. Laurent Perrier partial/full menu duplication, food omissions/options and food-vs-wine preference separation remain open from the baseline. This block does not silently claim those fixed.
5. Physical camera/photos, spoken VoiceOver, Dynamic Type, authenticated save/rate/account isolation, restaurant workflows and full production E2E remain separate release gates. The added tester can receive an already eligible TestFlight build after login; this local candidate is not uploaded on compilation alone.

Supabase invocation compatibility was checked against official documentation; no SDK upgrade or API change was introduced: https://supabase.com/docs/reference/javascript/functions-invoke
