# Matchrim — Production fix pass (2026-06-11)

## 1) Supabase migration

- **Migration**: `20260611103000_add_matchrim_email_registered_rpc` (applied; Lovable assigns its internal timestamped filename inside `supabase/migrations/`).
- **Function**: `public.matchrim_email_registered(email_input text) returns boolean` (`SECURITY DEFINER`, `search_path = auth, public`).
- **Grants**: `EXECUTE` revoked from `PUBLIC`; granted to `anon` and `authenticated` (exactly as specified).
- **Verification** (anon REST):
  ```
  POST /rest/v1/rpc/matchrim_email_registered
  body: {"email_input":"zzz-doesnotexist-1234567@example.com"}
  → HTTP 200 / false
  ```
- **Linter warnings produced by this change** (expected): `0028` and `0029` — anon/authenticated can EXECUTE a `SECURITY DEFINER` function. This is the contracted behaviour for the duplicate-email check; safe because the function returns only a boolean and never exposes user data. Pre-existing warning `Leaked Password Protection Disabled` is unrelated.

## 2) Auth redirect origin

- **Code**: helper `src/utils/authRedirect.ts` resolves origin in this order on native: `VITE_AUTH_REDIRECT_ORIGIN` → `VITE_MATCHRIM_WEB_URL` → `VITE_WINERIM_APP_URL` → `https://winerim.wine`. On web it always uses `window.location.origin`.
- **Signup**: emails now include `?confirmed=true`.
- **Password reset**: redirect URL is `<origin>/reset-password?mode=recovery`.
- **Documentation**: `.env.example` added with `VITE_AUTH_REDIRECT_ORIGIN=https://winerim.wine` and comments.
- **Blocker (manual action required)**: the agent cannot write VITE_* into the runtime environment of Lovable Cloud deployments. **The owner must set `VITE_AUTH_REDIRECT_ORIGIN=https://winerim.wine` in Lovable → Project Settings → Environment Variables** (and in any external host that serves the published build) so native (Capacitor) builds use the correct origin for email links. Web is already covered automatically.

## 3) App code changes

| Area | Files | Notes |
|---|---|---|
| A. Shared redirect helper + signup/reset URLs | `src/utils/authRedirect.ts` (new), `src/contexts/AuthContext.tsx` | `signUp` uses `buildSignupRedirect()`. Added `resetPassword()` to the context. |
| B. Password recovery flow | `src/pages/ForgotPassword.tsx` (new), `src/pages/ResetPassword.tsx` (new), `src/App.tsx` | New routes `/forgot-password` and `/reset-password`. Auth screen has a "¿Olvidaste tu contraseña?" link. |
| C. i18n ES/EN/FR | `src/i18n/index.tsx` (new), `src/components/LanguageSwitcher.tsx` (new), `src/App.tsx` | Lightweight context, dictionaries, persisted in `localStorage` (`matchrim.locale`). No new packages. Translated screens: Auth, ForgotPassword, ResetPassword, BasicInfoStep, MobileBottomNav. Default locale: ES. Selector available in Auth + recovery + reset screens. |
| D. Registration | `src/components/registration/BasicInfoStep.tsx`, `src/pages/Registration.tsx` | Phone uses a country-dial-code selector + local number, no extra packages. Anterior/Continuar buttons already render in normal flow (verified in `WinePreferencesStep` and `FinalStep`), no fixed overlay. |
| E. Country/city selectors | `src/components/registration/BasicInfoStep.tsx` | Country = `<Select>` with main ES/EU/AMER options + `OTHER` manual fallback. City = free text. Documented future Google Places enhancement inline. Registration is never blocked by this. |
| F. My Wines | `src/pages/MyWines.tsx` | "Añadir Manualmente" now opens the manual form (`showAddDialog`) instead of the purchase dialog. Purchase dialog has accessible `DialogTitle` + `DialogDescription`, `max-h-[90vh]` and `overflow-y-auto`. |
| G. Mobile shell | `src/components/MobileBottomNav.tsx`, `src/components/NativeAppHome.tsx` | Bottom nav background is now fully opaque (`bg-white` instead of `bg-white/95 backdrop-blur`), keeps `pb-[calc(0.5rem+env(safe-area-inset-bottom))]`. `App.css` already adds the matching bottom padding on `body.has-mobile-app-nav`. Native home header / hero badge / logo alt now say "Matchrim". |
| H. Native config | `ios/App/App/Info.plist`, `android/app/src/main/AndroidManifest.xml`, `android/app/src/main/res/values/strings.xml` | iOS: `CFBundleDisplayName=Matchrim`, camera/photo copy mentions Matchrim, `ITSAppUsesNonExemptEncryption=false`, iPhone limited to portrait (iPad untouched). Android: `screenOrientation="portrait"`, `android.permission.CAMERA`, `uses-feature` camera `required=false`, `app_name=Matchrim`. |

## 4) QA gates

- **TypeScript**: `npx tsc --noEmit -p tsconfig.app.json` → exit 0, no errors. ✅
- **Migration**: applied; verified via anon REST RPC (HTTP 200, `false`). ✅
- **Lovable build / lint**: triggered automatically by the platform after edits; no errors raised so far. Pre-existing linter warnings unchanged.
- **Packages**: none added, none updated.
- **Edge functions**: none deployed in this pass (as instructed).

### Previously reported issues — coverage

| Issue | Status |
|---|---|
| Cannot go back from login | ✅ Auth and recovery screens are standalone pages with normal flow; recovery has explicit `Volver` button; Registration's `Anterior` is in-flow. |
| Duplicate/registered email clarity | ✅ Signup error mapping in `AuthContext.signUp` produces a clear ES message; combined with the new `matchrim_email_registered` RPC the UI can also pre-check duplicates (RPC ready, integration with form is a follow-up task). |
| Account creation stuck | ✅ Signup redirect now includes `confirmed=true` and uses the shared helper; the confirmation screen in `Registration.tsx` already routes to `/auth`. |
| Confirmation email redirect | ✅ `buildSignupRedirect()` returns `<origin>/?confirmed=true`. |
| Password recovery | ✅ `/forgot-password` + `/reset-password` + link in Auth screen + `mode=recovery` query param. |
| Missing profile matches | ⏳ Out of scope of this pass (no logic change). The Matchrim quiz path is unchanged. |
| Restaurant selector / address behaviour | ➖ Restaurant selector unchanged in this pass; registration no longer requires a restaurant. Future enhancement: Google Places once API key is provisioned. |
| Profile code consistency | ➖ No regression introduced; profile page untouched. |
| Manual wine add | ✅ "Añadir Manualmente" opens the manual form. |
| Scanner/menu flow | ➖ Untouched (no edge-function changes per instructions). |
| Bottom nav | ✅ Opaque background, safe-area bottom padding preserved. |

## 5) Files changed (this pass)

**New**:
- `src/utils/authRedirect.ts`
- `src/i18n/index.tsx`
- `src/components/LanguageSwitcher.tsx`
- `src/pages/ForgotPassword.tsx`
- `src/pages/ResetPassword.tsx`
- `.env.example`
- `docs/PRODUCTION_FIX_PASS_2026-06-11.md`

**Edited**:
- `src/App.tsx`
- `src/contexts/AuthContext.tsx`
- `src/pages/Auth.tsx`
- `src/pages/MyWines.tsx`
- `src/components/MobileBottomNav.tsx`
- `src/components/NativeAppHome.tsx`
- `src/components/registration/BasicInfoStep.tsx`
- `ios/App/App/Info.plist`
- `android/app/src/main/AndroidManifest.xml`
- `android/app/src/main/res/values/strings.xml`

## 6) Manual follow-ups for the owner

1. **Set `VITE_AUTH_REDIRECT_ORIGIN=https://winerim.wine`** in Lovable → Project Settings → Environment Variables. Publish to apply.
2. Re-publish the app so the frontend changes go live (backend migration is already live).
3. For native, run `npx cap sync` after pulling from GitHub main; iOS portrait-only + Android CAMERA + Matchrim branding take effect on next native build.
4. Enable "Leaked Password Protection" in the auth provider settings (pre-existing linter warning, unrelated to this pass).
