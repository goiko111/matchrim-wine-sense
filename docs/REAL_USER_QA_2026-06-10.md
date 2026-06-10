# Real User QA - Winerim App

Checked on 2026-06-10 against the local app at `http://127.0.0.1:5173`, using the configured Supabase/Winerim environment.

## Summary

- Public landing, mobile navigation, full Matchrim quiz, Winerim API filtering, scanner login gate, protected route redirects, registration, invalid login, aiRIM menu, wine styles, privacy, terms and account deletion pages were exercised with browser automation.
- One UX issue was found and fixed during QA: when Supabase requires email confirmation, registration now stays on a clear `Revisa tu email` confirmation screen instead of sending the user back to auth.
- Winerim API filtering works from the UI with the configured restaurant UUID and returned 10 matching wines in the final pass.
- Full authenticated user journeys that require a confirmed account remain blocked until a confirmed QA user is available.

## Test Users Created

These test signups were created through the public registration flow and appear to require email confirmation:

- `qa-codex-20260610065319@example.com`
- `qa-codex-fix-20260610065832@example.com`

Recommended cleanup: remove these QA users from Supabase Auth/admin after review.

## Passed Scenarios

- Public web home loads and primary CTA opens `/matchrim`.
- Mobile web/app navigation shows five bottom tabs with no horizontal overflow at 390 px.
- Anonymous user completes all 20 Matchrim questions.
- Matchrim result is persisted in localStorage for anonymous users.
- Matchrim result with `returnTo` shows the restaurant return CTA.
- `/usar-matchrim` with local Matchrim profile renders the restaurant workflow.
- Winerim API filtering returns 10 compatible wines from the configured API/restaurant.
- Scanner flow for anonymous users gates behind auth and preserves restaurant/mode in redirect.
- `/my-wines` and `/profile` redirect anonymous users to auth with return path.
- `/account/delete` renders for anonymous users and offers verified login/delete flow.
- Registration wizard validates all steps and submits to Supabase.
- Email-confirmation registration now shows `Revisa tu email` without losing context.
- Invalid login shows the translated error and preserves `redirect=/profile`.
- aiRIM opens and exposes all four assistant modes.
- Wine styles page renders.
- Privacy, terms and account deletion pages render.
- `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run build`, `npx cap sync android` and `npx cap copy ios` completed.

## Evidence Artifacts

Local screenshots from the QA run:

- `/tmp/winerim-real-user-mobile-home.png`
- `/tmp/winerim-real-user-quiz-results.png`
- `/tmp/winerim-real-user-registration-result.png`
- `/tmp/winerim-real-user-registration-confirmation-fixed.png`
- `/tmp/winerim-real-user-winerim-api-success.png`

Raw automation summaries:

- `/tmp/winerim-real-user-e2e-results.json`
- `/tmp/winerim-real-user-e2e-rerun-results.json`
- `/tmp/winerim-real-user-e2e-final-rerun-results.json`

## Blocked / Not Fully Covered

- Authenticated `Mis Vinos` add/save/rate/edit/delete could not be completed because the QA account requires email confirmation.
- Profile learning from rated wines could not be completed without a confirmed user.
- Account deletion request creation could not be completed without a confirmed user.
- Admin privacy queue was not tested because it requires an admin session.
- Native simulator/device QA was not run in this environment; Capacitor assets were copied/synced, but Android Studio/Xcode runtime validation is still needed.

## Follow-Up Recommended

- Provide or create a confirmed QA user, preferably non-admin, for full authenticated app testing.
- Provide an admin QA user for account deletion queue and admin panel validation.
- Clean up the two unconfirmed QA signups listed above.
- Run the same scenario set in Android Studio and Xcode simulator once the release machine has JDK 17, Xcode and CocoaPods configured.
