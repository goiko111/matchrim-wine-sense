# Capturas de la API de Matchrim — 25-oct-2026

Respuestas **íntegras y sin editar** (solo reindentadas) de `https://app.winerim.com/api/v1/matchrim`, producción, **release 829** (`14a8b8793`, según nuestro registro de despliegue; las respuestas no declaran la release). Siete GET de solo lectura con la clave de Goiko en la cabecera `X-Matchrim-Key` (no consta en ningún fichero). Hora UTC de cada llamada en la tabla; `_llamadas.json` tiene lo mismo.

| Fichero | Llamada | Hora UTC | HTTP |
|---|---|---|---|
| `01-busqueda-defecto-migratoria.json` | `GET https://app.winerim.com/api/v1/matchrim/wines/search?q=Migratoria` | 2026-10-25T13:21:25Z | 200 |
| `02-busqueda-includeUnlisted-migratoria.json` | `GET https://app.winerim.com/api/v1/matchrim/wines/search?q=Migratoria&includeUnlisted=1` | 2026-10-25T13:21:25Z | 200 |
| `03-busqueda-defecto-control-listado.json` | `GET https://app.winerim.com/api/v1/matchrim/wines/search?q=Altotinto&limit=5` | 2026-10-25T13:21:26Z | 200 |
| `04-ficha-217480.json` | `GET https://app.winerim.com/api/v1/matchrim/wines/217480` | 2026-10-25T13:21:26Z | 200 |
| `05-ficha-control-78397.json` | `GET https://app.winerim.com/api/v1/matchrim/wines/78397` | 2026-10-25T13:21:26Z | 200 |
| `06-busqueda-amplia-includeUnlisted-pagina1.json` | `GET https://app.winerim.com/api/v1/matchrim/wines/search?q=Rioja&includeUnlisted=1&limit=50&page=1` | 2026-10-25T13:21:26Z | 200 |
| `07-busqueda-amplia-includeUnlisted-pagina2.json` | `GET https://app.winerim.com/api/v1/matchrim/wines/search?q=Rioja&includeUnlisted=1&limit=50&page=2` | 2026-10-25T13:21:26Z | 200 |

## Qué comprueba cada una
- **01** Modo por defecto (sin `includeUnlisted`): «Migratoria» no aparece (`results: []`, `total: 0`). Es el comportamiento de la release 827.
- **02** Con `includeUnlisted=1`: aparece **217480** (La Migratoria, Bodegas Frontonio): `mantalakWineId` presente; `id`, `representativePublicId` y `webUrl` a `null`; `tastingAttributes: null`; no hay campo `listed`. Búsqueda literal por «Migratoria».
- **03** Control en modo por defecto («Altotinto», `limit=5`): `total` 18, `pageCount` 4, 5 resultados. De aquí salió el vino de control (el primero con `id` y `webUrl`): **78397**.
- **04** Ficha de **217480**: ficha 200, `representativePublicId` y `webUrl` a `null`, `vintages: []`, `attributesByVintage: []`. La ficha no trae campo `id`; usa `representativePublicId`.
- **05** Ficha de **78397**: `representativePublicId` 320305 y `webUrl` rellenos. En la búsqueda (03) este vino traía `id` y `webUrl`.
- **06 y 07** Paginación con `includeUnlisted=1` (`q=Rioja`, `limit=50`, páginas 1 y 2): `total` 81 y `pageCount` 2 en ambas; 50 + 31 = 81 resultados; **ningún `mantalakWineId` repetido entre páginas** (solapamiento 0). Sin fila pública: 18 en la página 1 y 12 en la 2 (id `null`).

## Observaciones
- La foto de 217480 es un fichero `pending-photo-…`: la foto de alta del catálogo, no una foto revisada de etiqueta. No sabemos más.
- Solo cubren estas consultas. No son una medición de cobertura del catálogo.
