# Full Feature Audit - Winerim

Audited on 2026-06-10 against local `main` at `http://127.0.0.1:5173`, using the configured Supabase and Winerim API environment.

## Executive Summary

The core consumer promise works: a user can create/confirm an account, complete Matchrim, use the code against Winerim, save a recommended wine, rate it, and see the profile learn from that rating.

The scanner promise also works at the AI/function level: a generated image of a restaurant wine list was sent to `scan-wine-menu`; the function returned 5 detected wines, Matchrim compatibility, sensory attributes and explanations in about 10 seconds.

Implementation update: the first product-hardening sprint from this audit is now applied in code. It adds scanner guidance, scanner result filters, edit-before-save, retry guidance, restaurant share prompts, Winerim API result filters, compact fit reasons, profile-training toggles, before/after learned profile radar, aiRIM learned-profile context, aiRIM example chips, and a top-level error boundary.

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
- Done: added photo guidance before upload: good light, full page, avoid reflections, one section at a time, keep prices visible.
- P1: Support multi-page PDFs or clearly state that only the first page is analyzed. Current UI converts only page 1.
- Done: added edit-before-save for scanned wines, including name, producer, vintage, region, country, type, price, grapes and notes.
- Partial: result confidence is expressed as review guidance and compatibility; per-field OCR confidence is still not available from the edge function.
- Partial: restaurants without Winerim now get a user-facing email/WhatsApp prompt after scanning. Aggregate demand copy such as "X personas han intentado usar Winerim aquí" still needs a public-safe aggregation endpoint.
- P2: Preserve the scanned image/session in storage for admin review only if privacy policy/retention is finalized. Otherwise keep no image, only extracted structured data.
- Done: added retry guidance with smaller-section suggestion when scanning returns no useful result or errors.
- Done: scanned wines sort by compatibility by default, with filters for type and price.

## Product Improvements By Area

### Matchrim / Code

- Done: Matchrim Passport now explains the code as "uva + carácter" and names both parts when possible.
- P1: Add "Use in restaurant now" as the dominant result CTA on mobile, above broader education.
- P2: Add a share card image for the Matchrim code, suitable for WhatsApp/Instagram.
- P2: Let users retake the test while keeping previous codes in history, with "current active code" clearly marked.

### Winerim Restaurant Flow

- P1: QR URLs should prefill restaurant id/name and land directly on the correct tab.
- Done: Winerim API results now include sort, type, service/section and price filters.
- Done: each Winerim result now includes a compact "why it fits me" explanation using match, grapes, region and price when available.
- Partial: saved Winerim wines now keep restaurant/session metadata in `user_wines.place_details`. A dedicated aggregate conversion metric in the admin pipeline still needs a schema/API decision.

### Non-Winerim / Evangelization

- Done: after scanning in a non-Winerim restaurant, users can email or WhatsApp a restaurant-facing Winerim demand message.
- P1: Ask permission to remember the restaurant and aggregate demand. Make the value exchange explicit.
- P2: Build an admin view that ranks non-Winerim restaurants by scanned menus, unique users and repeat demand.
- P2: Let users add "I asked the waiter" / "They were interested" as a lightweight commercial signal.

### Mis Vinos

- Partial: scanned wines can be edited before saving. Editing already saved API/scanned wines still needs a dedicated edit flow.
- Done: `Ya Probados` now shows whether each rated wine trains the profile and lets users exclude/include eligible wines.
- P2: Add notes: occasion, dish, people, photo, and "would order again".
- P2: Add duplicate detection when saving the same Winerim wine from API/scanner/manual.
- P2: Add export/delete controls for user data once privacy workflow is finalized.

### Profile Learning

- Done: profile now overlays test base vs active learned radar when ratings exist.
- Done: confidence copy now explains early/progress/strong personalization states.
- Done: users can exclude a rating from profile training after saving, and Profile/Use Matchrim/aiRIM respect `use_for_profile_training`.
- P2: Add "what to try next" recommendations based on weak/unknown profile areas.

### aiRIM

- Done: aiRIM now sends the active learned Matchrim context from the app, and the edge function includes app context in the function prompt.
- P1: Add structured cards and save actions to aiRIM outputs, not only generated prose.
- Done: aiRIM now has example chips for common dish, wine and pairing scenarios.
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
- Done: added a top-level route-aware error boundary to avoid blank pages if a component throws.
- P2: Reduce or lazy-load large chunks further: `pdf.worker`, `RegionMap`, Mapbox and admin bundles.
- P2: Update Browserslist data regularly.

## Tested Artifacts

- Synthetic scanner image: `/tmp/winerim-scanner-menu-synthetic.png`
- Learned profile screenshot: `/tmp/winerim-real-user-profile-learned-fixed.png`
- Authenticated mobile nav screenshot: `/tmp/winerim-real-user-mobile-bottom-nav-auth.png`

## Next Recommended Sprint

1. Apply the account deletion migration to Supabase and rerun deletion request plus admin privacy queue.
2. Apply/deploy updated `ai-wine-chat` edge function so aiRIM uses the new learned-profile app context in production.
3. Run real Android/iOS device QA focused on camera/gallery upload, PDF upload, safe-area navigation and keyboard.
4. Decide whether restaurant conversion metrics live in `restaurant_matchrim_sessions`, a new event table, or a derived admin query over `user_wines.place_details`.
5. Build the restaurant demand dashboard into a sales pipeline view once the schema decision is made.
