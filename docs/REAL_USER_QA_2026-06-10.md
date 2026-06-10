# Real User QA - Winerim App

Checked on 2026-06-10 against the local app at `http://127.0.0.1:5173`, using the configured Supabase/Winerim environment.

## Summary

- Public landing, mobile navigation, full Matchrim quiz, Winerim API filtering, scanner login gate, protected route redirects, registration, confirmed login, `Mis Vinos`, profile learning, invalid login, aiRIM menu, wine styles, privacy, terms and account deletion pages were exercised with browser automation.
- One UX issue was found and fixed during QA: when Supabase requires email confirmation, registration now stays on a clear `Revisa tu email` confirmation screen instead of sending the user back to auth.
- One authenticated profile crash was found and fixed during QA: after rating a Winerim wine, the learned Matchrim profile could contain decimal attributes and crash the profile page when generating Winerim styles.
- Winerim API filtering works from the UI with the configured restaurant UUID and returned 10 matching wines before and after profile learning.
- Account deletion request creation is correctly diagnosed but still needs the new database migration applied in Supabase before it can pass in production.

## Test Users Created

These test signups were created through the public registration flow and appear to require email confirmation:

- `qa-codex-20260610065319@example.com`
- `qa-codex-fix-20260610065832@example.com`

This confirmed temp-mail QA user was created through the public registration flow and used for authenticated testing:

- `winerimqa20260610083736@web-library.net`

Recommended cleanup: remove these QA users from Supabase Auth/admin after review. The confirmed user has a Matchrim result, one saved/rated wine, Winerim restaurant session records and a failed account deletion attempt in browser logs.

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
- Temp-mail confirmation works end to end through Supabase email confirmation.
- Confirmed user can sign in and lands on `/profile` with the redirect preserved.
- Authenticated user completes all 20 Matchrim questions and can use the resulting code.
- Authenticated `/usar-matchrim` loads 10 Winerim wines and can save a recommendation to `Quiero Probar`.
- Saved Winerim wine appears in `/my-wines` under `Quiero Probar`.
- Rating the saved wine as `Me encanta` moves it to `Ya Probados`.
- Profile learning now renders after rating and shows `Perfil aprendido activo` with `1 vino puntuado`.
- Learned profile can still filter the Winerim API and returns 10 wines.
- Mobile authenticated bottom nav at 390 x 844 shows `Inicio`, `Test`, `Código`, `Vinos`, `Perfil` and navigates correctly.
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
- `/tmp/winerim-real-user-profile-learned-fixed.png`
- `/tmp/winerim-real-user-mobile-bottom-nav-auth.png`

Raw automation summaries:

- `/tmp/winerim-real-user-e2e-results.json`
- `/tmp/winerim-real-user-e2e-rerun-results.json`
- `/tmp/winerim-real-user-e2e-final-rerun-results.json`

## Blocked / Not Fully Covered

- Account deletion request creation still fails in the current Supabase database until `supabase/migrations/20260610104500_fix_account_deletion_request_policies.sql` is applied. Direct REST diagnostic returned `403 permission denied for function has_role`, caused by an old `account_deletion_requests` admin policy calling `public.has_role`.
- Admin privacy queue was not tested because it requires an admin session.
- Native simulator/device QA was not run in this environment; Capacitor assets were copied/synced, but Android Studio/Xcode runtime validation is still needed.

## Follow-Up Recommended

- Apply `supabase/migrations/20260610104500_fix_account_deletion_request_policies.sql` to Supabase, then rerun `/account/delete` with the temp user or a fresh QA user.
- Provide an admin QA user for account deletion queue and admin panel validation.
- Clean up the QA signups listed above.
- Run the same scenario set in Android Studio and Xcode simulator once the release machine has JDK 17, Xcode and CocoaPods configured.
