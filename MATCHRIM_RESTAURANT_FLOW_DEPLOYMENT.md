# Matchrim Restaurant Flow - Deploy Checklist

## Scope

This release adds the restaurant usage loop for Matchrim/Winerim:

- User gets a Matchrim code from the quiz.
- The code can be used at `/usar-matchrim`.
- If the restaurant has Winerim, the app calls the Winerim API and filters the returned wine list.
- If the restaurant does not have Winerim, the user identifies the restaurant and scans the wine list.
- Restaurant usage is stored as demand data for the admin dashboard.
- Rated wines in "Mis Vinos" can tune the active Matchrim profile over time.

## Supabase Status

Production schema has been verified through Supabase REST:

```text
GET /rest/v1/restaurant_matchrim_sessions?select=id&limit=1 -> 200 []
```

The restaurant demand table is present in production.

Relevant migration files:

```text
supabase/migrations/20260608110000_create_matchrim_restaurant_sessions.sql
supabase/migrations/20260609024534_4871f375-d82f-4c00-bcc4-6ab705dc532b.sql
```

Both migrations are idempotent and target `public.restaurant_matchrim_sessions`. The later Lovable-generated migration adds explicit grants while keeping the same RLS model:

- Authenticated users inserting their own restaurant sessions.
- Authenticated users reading their own sessions.
- Authenticated users updating their own sessions after menu scan completion.
- Admins reading all demand sessions through `private.has_role`.

## Edge Function Status

These functions have been deployed:

```text
calculate-wine-affinity
scan-wine-menu
```

Both functions now:

- Convert Matchrim quiz values from 0-5 to the 1-10 wine attribute scale.
- Build a learned profile from rated `user_wines` where sensory attributes exist.
- Use the learned profile for affinity and menu-scan matching.

## Required Frontend Env Vars

Current `.env` contains:

```text
VITE_SUPABASE_PROJECT_ID=cbjynrbvrhcmpaojmqdp
VITE_SUPABASE_URL=https://cbjynrbvrhcmpaojmqdp.supabase.co
VITE_WINERIM_API_URL=https://app.winerim.com
VITE_WINERIM_RESTAURANT_UUID=00000000-0000-0000-0000-000000000001
VITE_WINERIM_STORE_URL=https://web.winerim.com
```

For production, confirm:

- `VITE_WINERIM_API_URL` points to the API host that serves `/api/v1/restaurant/:uuid/wines/match`.
- `VITE_WINERIM_RESTAURANT_UUID` is only a fallback; QR or URL links should pass `?restaurant=` or `?r=`.
- `VITE_WINERIM_STORE_URL` points to the public Winerim wine/card experience.
- Optionally set `VITE_WINERIM_APP_URL` if the code-share link should open a different Winerim host.

Winerim API smoke test:

```text
GET https://app.winerim.com/api/v1/restaurant/00000000-0000-0000-0000-000000000001/wines/match?... -> 200
```

The real API returns `results`, numeric/string prices, optional `photo`, optional `section`, and grape arrays that may be nested. The frontend normalizes those fields before rendering.

## Manual QA

Use this route shape:

```text
/usar-matchrim?v=34213&code=Albarino-Fresco&r=<restaurant_uuid>
```

Check:

- Anonymous user can view/share the Matchrim passport.
- Logged-in user can load a Winerim restaurant card from API.
- Returned Winerim wines render with stable ids, match percentages and prices when present.
- "Guardar en Mis Vinos" inserts a wishlist wine with Winerim metadata.
- Non-Winerim tab requires restaurant name before scan.
- Menu scan updates `restaurant_matchrim_sessions.menu_scan_used` and `wines_detected`.
- Admin tab "Demanda" shows sessions, restaurants, users, Winerim sessions and non-Winerim scans.
- Profile page shows "Perfil aprendido activo" after rating wines with sensory attributes.

## Local Verification Performed

```bash
npx tsc --noEmit
npm test
npm run build
npx eslint src/services/winerimApi.ts src/utils/matchrimLearning.ts src/pages/UseMatchrim.tsx src/pages/Profile.tsx src/components/wine-import/WineMenuScanner.tsx supabase/functions/calculate-wine-affinity/index.ts supabase/functions/scan-wine-menu/index.ts
npx eslint src/services/winerimApi.ts src/components/WineCard.tsx
```

All passed locally. Full-repo lint still has pre-existing unrelated errors in older files.
