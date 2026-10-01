# Matchrim independent vision gate - 2026-10-01

## Scope and safety

This gate ran only against Supabase project `qpbmqvfnunkylvtvnyyx` (`winerim-middleware-staging`). Production project `cbjynrbvrhcmpaojmqdp`, the public web deployment and TestFlight were not changed. The five user-authorized captures were sent through the real staging functions with no interception or fixture payloads.

The provider credential is stored as an encrypted staging secret. The repository and QA artifacts contain only the secret name and digest-visible deployment metadata, never the credential value.

## Independent provider

The shared provider adapter supports an explicit `anthropic` or `lovable` selection and preserves Lovable as a backwards-compatible fallback. Staging is pinned to:

- provider: `anthropic`;
- model: `claude-sonnet-4-6`;
- image formats: JPEG, PNG, GIF and WebP;
- HEIC handling: converted and resized on the client/QA boundary before upload.

A direct hosted smoke returned HTTP 200, `ai_provider=anthropic`, `ai_model=claude-sonnet-4-6`, eight wines and `reported_complete` coverage in 47.293 seconds.

## Staging deployment

| Function | Hosted version | Source contract |
| --- | ---: | --- |
| `detect-wine-regions` | 4 | multi-object boxes and coverage |
| `analyze-wine-region` | 4 | grounded OCR candidates and abstention |
| `scan-wine-menu` | 4 | structured menu OCR, prices and positions |
| `calculate-wine-affinity` | 5 | calibrated affinity and learned profile |

All four functions bundled through the Supabase API deploy path. The database remains isolated in `matchrim_qa`; the middleware `public` schema was not exposed.

## Real five benchmark

| Scene | Expected | Actual/matched | Precision | Recall | Latency | Gate |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `IMG_7605 2.jpg` display | >=12 regions, >=6 candidates | 30 regions, 23 candidates, 20 scores | n/a | n/a | 93.374 s | Pass, identity GT pending |
| `IMG_7547 2.HEIC` clipped menu | 16 | 14 | 1.000 | 0.875 | 105.392 s | Pass |
| `IMG_7548 2.HEIC` menu | 8 | 8 | 1.000 | 1.000 | 49.295 s | Pass |
| `IMG_7552 2.HEIC` menu + beer/vermouth | 13 | 13 | 1.000 | 1.000 | 73.510 s | Pass |
| `IMG_7553 2.HEIC` dense two-page menu | 32 | 32 | 1.000 | 1.000 | 166.220 s | Pass |

Menu aggregate: 67/69 references, precision `1.000`, recall `0.971`. `IMG_7547` still misses the two most clipped identities, `Gaudensius blanco` and `La Rosa`, instead of guessing them.

The display result is deliberately not assigned identity precision/recall: its acceptance data defines object-count and candidate minimums, not a bottle-by-bottle canonical ground truth. It validates region detection, partial-coverage disclosure, individual scoring and abstention. Exact identity quality for that display remains a separate ground-truth task.

## Defects fixed

1. Dense portrait-normalized menu photos could be declared complete after reading only the main page. The client now runs the narrow right-side focus crop for dense portrait documents even when the full scan reports complete.
2. The focus crop rejected medium-confidence rows despite visible OCR evidence. It now retains them only when the normalized candidate name is grounded in `texto_fuente`; absent or very weak evidence still abstains.
3. Safe staging emitted console 406 errors because analytics intentionally has no table in the isolated schema. `VITE_APP_ANALYTICS_ENABLED=false` disables telemetry only in this QA build; production defaults to enabled.
4. The E2E report now records non-2xx URLs plus provider/model metadata and includes lateral-focus results in its backend aggregation.

Before/after on the two failing scenes:

- `IMG_7547`: recall `0.625` (10/16) -> `0.875` (14/16), precision remained `1.000`.
- `IMG_7553`: recall `0.688` (22/32) -> `1.000` (32/32), precision remained `1.000`.

## Visual and functional QA

At a 393 x 852 mobile viewport with 3x device scale, all final scenes had:

- no horizontal document overflow;
- no unhandled console errors, HTTP errors or failed network requests;
- numbered pins/clusters over the image and details in the synchronized list;
- one affinity score per accepted menu result;
- visible confidence and doubts for medium-confidence identities;
- intentional text ellipsis inside rows rather than viewport overflow.

Private local evidence (not committed because it contains the user's captures) is under `docs/qa-evidence/matchrim-anthropic-staging-2026-10-01/`. The sanitized, versionable result is `summary.json` in that directory.

## Verification

- `npm test`: pass, including learning, personas, 10,000-user simulation contract, multi-wine, 30-scene manifest and 25-source independent ground truth.
- `npm run typecheck`: pass.
- scoped ESLint for client, runner and Edge Functions: pass.
- `npm run build`: pass with production-default analytics enabled.
- Supabase API bundling/deploy: pass for all four staging functions.

## Remaining gates

TestFlight remains intentionally unchanged. The internal vision gate is green for the four menu acceptance scenes and object-level display flow, but a production/TestFlight release still requires an explicit decision to configure the provider in the production project, deploy the four reviewed function versions, run one physical-iPhone smoke against that channel and monitor provider cost/latency. Current end-to-end latency ranges from 49.3 to 166.2 seconds, with a five-scene median of 93.4 seconds; performance is the principal P1 before describing the experience as fast.
