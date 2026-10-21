# Native Local-First Label Reading 109

## Implemented, Release Gates Remain Open

Candidate102 remains frozen at product commit78e3302, with its signed archive and recorded QA. The changes below target candidate103 or later and must not be attributed to102.

- Explicit native mode selector: existing cloud/multibottle mode stays the default. Choosing Una etiqueta uses Apple Vision on the selected photo, without image upload or an automatic cloud fallback.
- One full-image region is user-selected, not detected. Coverage is unknown, detectedObjects is0, and no multibottle count or inventory claim is made.
- Raw OCR is preserved. The interim candidate is Etiqueta por identificar with confidence0, unknown producer, no canonical record, no sensory attributes and no affinity. It cannot be confirmed/saved by whitespace, case, compatibility-character or producer-only edits.
- A bounded text-only public Winerim search starts from that explicit local intent. Suggestions remain unverified until an explicit choice and independent detail verification. No ground-truth dictionary, alias table or default sensory profile is added.
- Local retry/reanalysis stays local. Continuation cannot invoke the cloud pipeline. Failure, cancellation and obsolete controllers cannot silently publish over a newer scan.
- Recovery puts results before collapsed search controls, announces/focuses the results heading, retains the latest reread rather than restoring an older reading prop, and fails closed on overflowing year evidence.
- Foundation dates in Spanish/French/English/Italian/German and future dates cannot become wine vintages. The year bound uses current UTC year. Raw text remains available for review.
- Native privacy notice/keyv4 and native policy explain local versus OpenAI processing; native policy date is21 October. Web notice, keyv2 and rendered policy remain unchanged by regression checks. No web publication occurs.

## Checks So Far

-17 actual-source AST/VM handler groups, synthetic prepared images/profile/OCR only.
-10 pure local candidate groups, no image decoding or network.
-14 recovery-handler groups,14 year-role groups and10 privacy groups.
- Focused source lint passed; legacy source scope and web enrichment parity must be refreshed/checked at the final source revision.
- Independent review found and corrected three defects: whitespace-only placeholder promotion, year-occurrence overflow, and restoration of obsolete OCR after a fresh reread.
- The initial handler failure is retained at `qa-artifacts/night105-20261021/local-handler109-before.json`; it demonstrated stale reanalysis errors overwriting newer controller state before the fix.

These tests do not certify native gallery, WebView bridge, recognition accuracy or the200 labels. Full typecheck/build and visual QA await the shared heavy resource. A real-gallery XCTest probe is being prepared; it must use the explicit local mode before selecting an image and must not log in, create/rate/save wines or call a model.

## Gates

1. Freeze the candidate source; prepare103 with matching asset/source hashes.
2. Responsive local-first/recovery/privacy captures and native normal/max-text portrait regression.
3. Genuine simulator gallery to Apple Vision to public catalogue to explicit selection, preserving screenshots/debug tree and failed attempts. A mock bridge is not this gate.
4. Only then expand a bounded local OCR pilot. Do not regenerate the existing Mac200 corpus or claim a representative accuracy gain from selected cases.
5. Full administrative catalogue coverage and live200 recognition remain open; do not infer absence from the public store subset or reuse the limited TestFlight100 exception.

No new paid model calls, Lovable turns, backend deployment or web publication are authorized by this work. The accumulated50-start/EUR15 cap and unknown historical reservations remain unchanged.

## Genuine Gallery E2E, 20:39 UTC

`qa-artifacts/night105-20261021/gallery109-r6/RESULT.json` passes against the actual compiled103-r2 app, source8becf49. The anonymous native flow explicitly chooses Una etiqueta, opens the real Photos picker, selects the preserved img061, runs Apple Vision through the WebView bridge, retrieves public Winerim proposals and independently verifies an explicitly chosen fiche. No mock OCR/detector, account login, wine save or rating was used. Simulator video, screenshots and AX trees are retained.

The selected public fiche is Biógrafo del Vino2022 / Dominio del Bienamado. This is a user-selected catalogue year, not a claim that OCR proved2022 on the photographed bottle. Anonymous users are correctly offered their test instead of an invented affinity. The full administrative Mantalak connection,200-reference matching, maximum-text recognition result and physical-phone flow are not certified by this one case.

UI intervals including audits/polling: after picker to proposals7681ms; explicit choice to fiche/audit4424ms; gallery opening to proposals29646ms. They are not isolated OCR/network latency. The20-image actual Vision pilot measures343-1438ms per OCR call separately. No packet-count claim is made; zero-provider behavior is additionally supported by the local-mode source/handler contracts, not wire interception.

Five earlier harness failures are preserved. Fixes follow observed iOS26 AX structure: pressed controls are switches, Photos uses named image layouts, a visible image exposes a stable frame despite isHittable=false, and the one-up review requires its identified native Done button. The source never silently switches to cloud to make the test pass.
