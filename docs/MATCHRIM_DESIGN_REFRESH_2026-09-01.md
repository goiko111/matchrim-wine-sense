# Matchrim: rediseño contemporáneo de producto

Fecha: 1 de septiembre de 2026.

Rama: `codex/matchrim-design-refresh-20260901`.

Base: `8ef05046122e40e34b17508e1f270a048b6deda1` (`origin/codex/2matchrim-p0-remediation-20260826`).

Estado: **implementación cliente completada; rama aislada; no se tocó backend, Supabase, producción ni TestFlight**.

## Resumen ejecutivo

Esta pasada convierte Matchrim de una home/entrada todavía muy promocional a una experiencia de herramienta móvil: abrir, escanear una carta o varias etiquetas, ver confianza, comparar 2–5 opciones, corregir identidad y leer una explicación contextual de aiRIM sin cambiar contratos de datos.

El rediseño conserva la diferenciación definida en los documentos internos: escaneo de mesa/carta completa, múltiples botellas separadas, confianza visible, corrección manual, ranking comparativo, afinidad explicable y aiRIM contextual. No copia el patrón dominante de ficha individual + rating; organiza la decisión alrededor de la escena real.

## Fuentes actuales consultadas

Se revisaron patrones oficiales y actuales el 1 de septiembre de 2026:

- Vivino: scanner de etiquetas, cartas y comparación rápida en su página oficial de scanner; ficha con características, datos, ratings y reviews; App Store con escaneo de cartas, `Match for You`, perfil de gustos y sommelier AI. Fuentes: [Vivino Wine Scanner](https://www.vivino.com/en/wine-news/vivino-wine-scanner), [Vivino App Store](https://apps.apple.com/us/app/vivino-drink-the-right-wine/id414461255), [Vivino Google Play](https://play.google.com/store/apps/details?id=vivino.web.app).
- Delectable: foto de etiqueta para ratings/descripciones, recomendaciones expertas, tasting notes y diario personal. Fuente: [Delectable](https://delectable.com/) y [Delectable App Store](https://apps.apple.com/us/app/delectable-scan-rate-wine/id512106648).
- CellarTracker: gestión de bodega, reviews comunitarias, label search editable, filtros, precios, drink windows y flujos de añadir botellas/recibos. Fuentes: [CellarTracker mobile](https://mobileapp.cellartracker.com/), [Label Search](https://support.cellartracker.com/article/34-label-search), [How to Add Bottles](https://support.cellartracker.com/article/82-how-to-add-bottles), [Homepage and Activity Feed](https://support.cellartracker.com/article/102-homepage-and-activity-feed).
- Wine-Searcher: escaneo de etiqueta orientado a información de mercado, precios, merchants, critic scores, grapes/regiones y señales de foto clara/cercana. Fuentes: [A Year of Scanning](https://www.wine-searcher.com/m/2026/02/a-year-of-scanning-what-youre-really-drinking) y [Wine-Searcher App Store](https://apps.apple.com/us/app/wine-searcher/id351057887).

Inferencia desde esas fuentes: la categoría está convergiendo en scanner + ficha + comunidad/precio. Matchrim debe parecer contemporáneo, pero su ventaja de producto no está en otra ficha más; está en decidir en contexto, con dudas explícitas y comparador.

## Decisiones de diseño

- **Home útil, no landing**: la ruta `/` ahora es una consola de decisión con estado del código Matchrim, CTA directo a carta/escaneo y accesos a carta, etiqueta, comparador, mis vinos, Winerim y perfil. Se eliminó el largo recorrido de marketing, testimonios y formularios de la primera pantalla.
- **Sistema visual sobrio**: fondo cálido, superficies blancas, paneles de tinta borgoña/negro, acento ámbar solo para CTA principal, radio de 8 px y sombras suaves. Se evita una paleta mono-borgoña o un look de landing con bloques decorativos.
- **Navegación móvil estable**: top/bottom nav usan safe areas (`--matchrim-safe-top`, `--matchrim-safe-bottom`), targets mínimos y estados activos de alto contraste.
- **Escaneo como flujo principal**: `/escanear` abre con carta completa, varias etiquetas y aiRIM contextual; las tarjetas de modo priorizan carta de vinos sin ocultar etiqueta ni legacy scanner.
- **Resultados con jerarquía operativa**: foto con pines numéricos, métricas/estado en rails, ranking y comparador separados de la imagen. La carta conserva detalle y acciones en lista/drawer, no encima de la foto.
- **Confianza y corrección visibles**: los estados dudoso/sin reconocer/manual siguen presentes, pero con superficies más claras y CTAs consistentes.
- **aiRIM contextual, no avatar decorativo**: el bloque guía explica identidad, respaldo, rango y siguiente paso de forma estática/determinista, sin nuevas llamadas ni memoria transversal.
- **Movimiento contenido**: se reemplazó `transition: all`; hover solo en puntero fino; `prefers-reduced-motion` desactiva transformaciones.

## Implementación cerrada

- `src/index.css`: tokens globales de Matchrim, safe-area variables, surfaces, data rails, scan stage, pressable states, reduced-motion y hover gating.
- `src/pages/Index.tsx`: home convertida en loader de perfil/código y render directo de `NativeAppHome`.
- `src/components/NativeAppHome.tsx`: nueva home responsive, app-first, con acciones escaneables y estado de perfil.
- `src/components/AppNav.tsx` y `src/components/MobileBottomNav.tsx`: navegación actualizada con el nuevo sistema visual, safe areas y targets táctiles.
- `src/pages/Scan.tsx` y `src/components/wine-import/ScanHub.tsx`: hub de escaneo rediseñado, modo carta destacado, encabezados más compactos y estados de entrada consistentes.
- `src/components/wine-import/MultiWineLabelScanner.tsx`: subida, resumen de lote, ranking, drawer, corrección manual y fallback visualmente unificados.
- `src/components/wine-import/WineMenuScanner.tsx`: scanner de carta, decisión Matchrim, filtros, ranking, fichas y drawer con jerarquía más densa y menos promocional.
- `src/components/wine-import/WineComparisonWorkspace.tsx`: comparador 2–5 reencuadrado como panel de decisión.
- `src/components/AffinityExplanation.tsx`, `src/components/AiRimContextGuide.tsx`, `src/components/ScanPrivacyGate.tsx`: afinidad, aiRIM y privacidad alineados al nuevo sistema.

No se modificaron Edge Functions, contratos de Supabase, storage, migraciones, producción, Capacitor release, build number ni TestFlight.

## Antes / después

| Superficie | Antes | Después | Evidencia |
| --- | --- | --- | --- |
| Home móvil | Página larga de marketing con múltiples bloques promocionales antes del uso real. | Consola directa: perfil, CTA de escaneo y accesos principales en el primer recorrido. | `before-home-mobile.png`, `after-home-mobile.png`, `after-home-desktop.png` |
| Hub de escaneo | Lista de opciones más plana, sin suficiente jerarquía entre carta, etiqueta y legacy. | Entrada de decisión con carta completa como modo principal y tarjetas compactas. | `before-scan-hub-mobile.png`, `after-scan-hub-mobile.png` |
| Entrada etiqueta | Privacy/upload funcional pero visualmente separada del resto del producto. | Gate y upload con surfaces, confianza visible y targets táctiles. | `after-scan-label-entry-mobile.png`, `privacy-safe-area-mobile.png` |
| Entrada carta | Scanner correcto pero menos integrado visualmente. | Scan stage oscuro, CTA fuerte y labels de confianza consistentes. | `before-scan-menu-desktop.png`, `after-scan-menu-entry-mobile.png` |
| Multietiqueta | Resultado potente, pero con menor contraste entre detección, resumen, comparador y detalle. | Pines numéricos, lote, confianza, comparador, decisión provisional y aiRIM con jerarquía clara. | `multi-label-summary-mobile.png`, `multi-label-airim-guide-mobile.png` |
| Carta/menú | Flujo útil con imagen/lista, pero menos contemporáneo. | Dual view con foto legible, decisión Matchrim, comparador, filtros y drawer más refinados. | `wine-menu-dual-desktop.png`, `wine-menu-airim-guide-desktop.png` |

## QA ejecutado

| Gate | Resultado |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS, 0 errores y 107 warnings históricos |
| `npm test` | PASS |
| `npm run build` | PASS |
| Playwright smoke screenshots | PASS, mobile/desktop en `/`, `/escanear`, `/escanear/etiqueta`, `/escanear/carta-vinos` |
| Playwright multi-wine UI | PASS 26/26, consola limpia |

Comando UI principal:

```bash
MATCHRIM_QA_URL=http://127.0.0.1:5173 MATCHRIM_QA_ARTIFACTS=qa-artifacts/2026-09-01-design-refresh/ui \
python3 /Users/GOIKO/.codex/skills/webapp-testing/scripts/with_server.py \
  --server "npm run dev -- --host 127.0.0.1 --port 5173" \
  --port 5173 \
  --timeout 60 \
  -- /tmp/matchrim-design-pw/bin/python scripts/qa-multi-wine-ui.py
```

Casos cubiertos por `ui-qa-results.json`: privacidad y safe areas, paisaje, resumen multietiqueta, comparador, métricas, overflow móvil, detalle con candidatos, abstención/corrección, invalidación de afinidad tras corregir identidad, refinamiento regional, fallback regional, decisión provisional, retry selectivo, cancelación con backoff, carta dual, comparador por servicio, overflow desktop, zoom/filtro/drawer, matriz de fixtures, touch targets, nombres accesibles, Dynamic Type 125%, offline y consola.

## Evidencias

Directorio: `docs/qa-evidence/matchrim-design-refresh-2026-09-01/`.

- `ui-qa-results.json`: 26/26 PASS.
- `after-home-mobile.png` y `after-home-desktop.png`: home app-first.
- `after-scan-hub-mobile.png`: hub de escaneo.
- `after-scan-label-entry-mobile.png`: entrada etiqueta con privacidad aceptada.
- `after-scan-menu-entry-mobile.png`: entrada carta con privacidad aceptada.
- `privacy-safe-area-mobile.png` y `privacy-safe-area-landscape.png`: gate bajo safe areas.
- `multi-label-summary-mobile.png`: lote, pines, confianza, comparador y ranking.
- `multi-label-airim-guide-mobile.png`: aiRIM contextual con identidad dudosa.
- `wine-menu-dual-desktop.png`: carta con pines numéricos, decisión y comparador.
- `wine-menu-airim-guide-desktop.png`: detalle contextual en carta.
- `wine-menu-accessibility-125pct-mobile.png`: Dynamic Type 125% y targets.
- `before-home-mobile.png`, `before-scan-hub-mobile.png`, `before-scan-menu-desktop.png`: baseline visual usado para contraste.

## Residual y límites

- No hay QA en iPhone físico en esta rama; cámara real, PHPicker real, VoiceOver hablado, red lenta WebKit y memoria nativa siguen siendo gate físico.
- No se hizo rerun de APIs reales ni despliegue de funciones. El Playwright UI usa fixtures locales y respuestas controladas para validar cliente/layout.
- `npm run build` conserva warnings existentes: Browserslist antiguo y chunks mayores de 500 kB.
- `npm run lint` conserva 107 warnings históricos, sin errores.
- `npm ci` instaló correctamente, pero el audit de dependencias del repo reporta vulnerabilidades existentes; no se abordaron en esta rama visual.
- Los screenshots full-page móviles muestran la bottom nav fija repetida sobre el documento largo por cómo Playwright compone capturas completas. Las verificaciones críticas de solape se hicieron con bounding boxes y viewport captures; los gates de privacidad, Dynamic Type y touch targets pasaron.

## Criterio de merge sugerido

Esta rama puede revisarse como cambio de producto/cliente aislado. Antes de asociarla a un release público conviene ejecutar el gate físico y decidir si el rediseño debe salir junto a un backend candidate o como capa visual sobre el cliente ya validado.
