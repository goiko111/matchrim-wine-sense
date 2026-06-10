# Full Feature Audit - Winerim

Audited on 2026-06-10 against local `main` at `http://127.0.0.1:5173`, using the configured Supabase and Winerim API environment.

## Executive Summary

The core consumer promise works: a user can create/confirm an account, complete Matchrim, use the code against Winerim, save a recommended wine, rate it, and see the profile learn from that rating.

The scanner promise also works at the AI/function level: a generated image of a restaurant wine list was sent to `scan-wine-menu`; the function returned 5 detected wines, Matchrim compatibility, sensory attributes and explanations in about 10 seconds.

The main remaining production blocker is account deletion request creation until `20260610104500_fix_account_deletion_request_policies.sql` is applied to Supabase. Store/device QA is still not complete until the app runs on real Android/iOS devices or simulators.

## Coverage Matrix

| Area | Status | Evidence / Notes |
| --- | --- | --- |
| Public landing | Passed | CTA, navigation and content render. |
| Registration | Passed | Real temp-mail signup and email confirmation completed. |
| Login / redirects | Passed | Confirmed user reaches `/profile`; auth redirects preserve context. |
| Matchrim quiz | Passed | 20 questions completed; profile/code created. |
| Winerim API filtering | Passed | Returned 10 wines before and after learned profile. |
| Scanner UI entry | Partial pass | `/usar-matchrim?mode=scanner` renders restaurant fields and scanner CTA. `Mis Vinos > Scanner` renders camera/upload controls. Browser automation could not type into restaurant fields because of local clipboard limitation, but code path is reviewed. |
| Scanner AI/function | Passed | Synthetic wine-list PNG returned 5 wines with attributes and compatibility. Artifact: `/tmp/winerim-scanner-menu-synthetic.png`. |
| Save Winerim wine | Passed | Saved to `Quiero Probar`. |
| Save scanned wine | Function/UI code reviewed | Uses same `user_wines` path as Winerim save; needs file-picker/device E2E for final proof. |
| Rate wine | Passed | `Me encanta` moves wine to `Ya Probados`. |
| Learned profile | Passed after fix | `Perfil aprendido activo` renders with 1 rated wine. |
| Profile page | Passed | Crash from decimal learned profile fixed. |
| Mis Vinos filters | Partial pass | Wishlist/tasted path passed. Manual add/edit/delete need deeper UI E2E. |
| aiRIM | Smoke passed | Entry and modes render. Needs response-quality and failure-mode QA. |
| Wine styles | Smoke passed | Page renders. Style classifier covered by tests. |
| Wine detail/search/import | Partial / admin-gated | Routes render or redirect. Admin importer/search need admin QA account. |
| Privacy / terms | Passed | Pages render. |
| Account deletion | Blocked in DB | Current DB returns `403 permission denied for function has_role`; migration exists but was not deployable from this environment. |
| Admin dashboard | Partial | Non-admin redirects away. Admin queue needs admin credentials. |
| Native app shell | Partial | Capacitor sync/copy OK; mobile web nav OK. Real simulator/device build still needed. |

## Scanner Findings

### What Works

- The user journey is conceptually correct: if the restaurant does not have Winerim, the app asks where the user is, saves that demand signal, then opens the scanner.
- `scan-wine-menu` accepts a data URL image with an authenticated user, loads the user's latest Matchrim profile, incorporates learned ratings, and asks Gemini to extract up to 15 wines.
- The returned JSON includes `nombre`, `productor`, `anada`, `region`, `pais`, `precio`, `tipo`, `uvas`, `descripcion`, `atributos`, `compatibilidad` and `razon`.
- The synthetic test returned these 5 wines: Viña Pomal Reserva, Pago de Carraovejas Crianza, La Montesa, Pazo Señorans Albariño and Gramona Imperial Brut.

### Gaps / Improvements

- Done: split scanner controls into `Hacer foto` and `Subir archivo`; the camera input uses `capture="environment"` and the upload input keeps image/PDF support.
- P1: Add photo guidance before upload: good light, full page, avoid reflections, one section at a time, keep prices visible.
- P1: Support multi-page PDFs or clearly state that only the first page is analyzed. Current UI converts only page 1.
- P1: Add result confidence and edit-before-save. OCR/AI will occasionally misread price, vintage or producer; the user should be able to correct a card before saving.
- P1: For restaurants without Winerim, show a stronger commercial loop: "X personas han intentado usar Winerim aquí" once enough demand exists.
- P2: Preserve the scanned image/session in storage for admin review only if privacy policy/retention is finalized. Otherwise keep no image, only extracted structured data.
- P2: Add retry with smaller-section suggestion when the function returns truncated JSON or too many wines.
- P2: Sort scanned wines by compatibility by default, with filters for type and price.

## Product Improvements By Area

### Matchrim / Code

- P1: Explain the code name better immediately after the quiz: "uva + carácter" makes the result more memorable and shareable.
- P1: Add "Use in restaurant now" as the dominant result CTA on mobile, above broader education.
- P2: Add a share card image for the Matchrim code, suitable for WhatsApp/Instagram.
- P2: Let users retake the test while keeping previous codes in history, with "current active code" clearly marked.

### Winerim Restaurant Flow

- P1: QR URLs should prefill restaurant id/name and land directly on the correct tab.
- P1: When Winerim API returns wines, add filters for by-the-glass, bottle, price range and wine type.
- P1: Add "why this wine fits me" compact explanation on each Winerim result, not only percentage.
- P2: Track a conversion event when a user saves a wine from a restaurant. This is one of the strongest sales signals.

### Non-Winerim / Evangelization

- P1: After scanning, show a restaurant-facing prompt: "Tell this restaurant you wanted Winerim here" with a shareable/emailable one-tap message.
- P1: Ask permission to remember the restaurant and aggregate demand. Make the value exchange explicit.
- P2: Build an admin view that ranks non-Winerim restaurants by scanned menus, unique users and repeat demand.
- P2: Let users add "I asked the waiter" / "They were interested" as a lightweight commercial signal.

### Mis Vinos

- P1: Add edit-before-rating for scanned/API wines so users can correct attributes that will train their profile.
- P1: Add a clearer "training impact" state: which wines are training the profile and whether rating them changed the code.
- P2: Add notes: occasion, dish, people, photo, and "would order again".
- P2: Add duplicate detection when saving the same Winerim wine from API/scanner/manual.
- P2: Add export/delete controls for user data once privacy workflow is finalized.

### Profile Learning

- P1: Show a before/after radar when ratings have modified the base Matchrim profile.
- P1: Explain confidence: "1 wine = early signal, 12+ wines = strong personalization".
- P2: Let users exclude a rating from training after saving.
- P2: Add "what to try next" recommendations based on weak/unknown profile areas.

### aiRIM

- P1: Tie aiRIM answers to the user's Matchrim profile when authenticated.
- P1: Add structured cards and save actions to aiRIM outputs, not only generated prose.
- P2: Add examples/chips for common restaurant contexts: spicy food, tasting menu, seafood, dessert.
- P2: Log response quality feedback: helpful / not helpful.

### Native App / Stores

- P0: Apply account deletion RLS migration before store submission, then verify `/account/delete` end to end.
- P1: Run Android and iOS simulator/device QA with camera/gallery/PDF upload, login redirect, safe areas, keyboard, and offline/poor network.
- P1: Decide final bundle id. Current `wine.winerim.app` is marked provisional.
- P1: Prepare store screenshots around the actual app workflow: code, scanner, Winerim filtered carta, Mis Vinos, profile learning.
- P2: Consider native camera plugin only if the HTML file input experience is not good enough on real devices.

### Admin / Operations

- P1: Test admin dashboard with an admin QA account.
- P1: Add operational statuses for restaurant demand: new, contacted, demo scheduled, converted, rejected.
- P1: Add privacy queue SLA and audit trail for account deletion.
- P2: Add CSV/export for restaurant demand leads.

### Performance / Reliability

- P1: Add automated E2E for scanner function with a fixed image fixture. Mock AI if needed for CI, run live AI in scheduled QA.
- P1: Add error boundary to avoid blank pages if a component throws.
- P2: Reduce or lazy-load large chunks further: `pdf.worker`, `RegionMap`, Mapbox and admin bundles.
- P2: Update Browserslist data regularly.

## Tested Artifacts

- Synthetic scanner image: `/tmp/winerim-scanner-menu-synthetic.png`
- Learned profile screenshot: `/tmp/winerim-real-user-profile-learned-fixed.png`
- Authenticated mobile nav screenshot: `/tmp/winerim-real-user-mobile-bottom-nav-auth.png`

## Next Recommended Sprint

1. Apply the account deletion migration to Supabase and rerun deletion request plus admin privacy queue.
2. Improve scanner UX: split camera/upload actions, add scan guidance, and clarify first-page PDF behavior.
3. Add edit-before-save for scanned wines.
4. Build the restaurant demand dashboard into a sales pipeline view.
5. Run real Android/iOS device QA focused on camera/gallery upload and safe-area navigation.
