# Matchrim: benchmark grounded y cierre de QA

Fecha: 26 de agosto de 2026.

Estado: **implementacion interna completada; NO-GO temporal para un nuevo TestFlight**. La funcion de analisis por region esta desplegada, el cliente y el build de simulador pasan QA, pero el siguiente binario debe ser build 59 y solo debe subirse tras cerrar los gates externos y de dataset descritos abajo.

Seguimiento 2026-08-27: la concurrencia adaptativa, retry selectivo y QA de rendimiento estan cerrados en `docs/MATCHRIM_PERFORMANCE_RESILIENCE_2026-08-27.md`. El gate restante baja de 15% a 13%; TestFlight sigue cerrado.

## Versiones y alcance

- Rama operativa: `codex/2matchrim-p0-remediation-20260826`.
- Dataset: `matchrim-ground-truth-v1`, 30 escenas reproducibles.
- Detector activo: `detect-wine-regions` / `matchrim-region-detector-v3`.
- Analizador activo: `analyze-wine-region` / `matchrim-region-analysis-v3-grounded`.
- Carta activa: `scan-wine-menu` / `scan-wine-menu-2026-08-26-grounded-v3`.
- Cliente probado: fallback estructurado, correccion manual, quality gate local, comparador 2-5, afinidad trazable y overlay numerico sin textos sobre la imagen.
- Build publico anterior: Matchrim 1.0 (58). No contiene todos los cambios de este cierre; no se subio un build nuevo.

El despliegue directo con Supabase CLI sigue devolviendo `403` para el proyecto `cbjynrbvrhcmpaojmqdp`. El canal autorizado de Lovable desplego unicamente `analyze-wine-region`; una modificacion remota ajena posterior fue reconciliada y revertida sin tocar el trabajo previo de `search-wines`.

## Dataset y metodologia

El dataset cumple el minimo operativo de 30 escenas, pero no se presenta como 30 capturas independientes:

- 5 capturas reales: una vitrina multibotella, dos cartas impresas y dos pizarras.
- 25 variantes deterministas: baja luz, luz desigual, perspectiva, texto pequeno e ilegible.
- Cada fuente se verifica por SHA-256 y las variantes se regeneran desde el manifiesto.
- El ground truth nunca se deriva de la salida del modelo.
- Las cartas tienen identidad esperada por linea. La vitrina solo tiene umbral de recuento humano y unas 50 botellas visibles; faltan cajas e identidad exhaustivas.

Por esa ultima limitacion, la precision del detector de vitrina es **no disponible**. Se informa recall de recuento limitado por el cap de 30, no una precision inventada.

## Baseline de 30 escenas

Ejecucion real sin interceptar APIs, previa al analizador grounded v3:

- Pass rate: 19/30, `63,33%`.
- Identidad en 20 escenas legibles de carta: precision micro `98,08%`, recall micro `91,43%`, 5 falsos positivos y 24 omisiones.
- Abstencion: 1/5 escenas ilegibles completaba dentro del limite; ninguna invento nombre de alta confianza.
- Vitrina: recall medio de recuento capado `100%`; recall absoluto estimado `60%`; precision no disponible.
- Latencia: media `60,24 s`, mediana `39,92 s`, maxima `181,45 s`.

| Escena | Modo | Esperado | Actual | Afinidades | Alta confianza | ms | Estado baseline |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| `multibottle-fridge--original` | etiqueta | 12 | 30 | 24 | 5 | 78794 | PASS |
| `multibottle-fridge--low-light` | etiqueta | 12 | 30 | 27 | 4 | 73844 | PASS |
| `multibottle-fridge--uneven-light` | etiqueta | 12 | 30 | 25 | 8 | 69755 | FAIL layout |
| `multibottle-fridge--perspective` | etiqueta | 12 | 30 | 23 | 6 | 61208 | FAIL layout |
| `multibottle-fridge--small-text` | etiqueta | 12 | 30 | 23 | 6 | 59233 | FAIL layout |
| `multibottle-fridge--illegible` | etiqueta | 12 | 30 | 0 | 0 | 42588 | PASS |
| `img-7547-2--original` | carta | 16 | 16 | 16 | 16 | 38353 | PASS |
| `img-7547-2--low-light` | carta | 16 | 16 | 16 | 10 | 83513 | PASS |
| `img-7547-2--uneven-light` | carta | 16 | 10 | 10 | 10 | 24700 | FAIL recall |
| `img-7547-2--perspective` | carta | 16 | 14 | 14 | 13 | 35020 | PASS |
| `img-7547-2--small-text` | carta | 16 | 10 | 10 | 10 | 25097 | FAIL recall |
| `img-7547-2--illegible` | carta | 16 | 0 | 0 | 0 | 180854 | FAIL timeout |
| `img-7548-2--original` | carta | 8 | 8 | 8 | 8 | 24032 | FAIL identidad |
| `img-7548-2--low-light` | carta | 8 | 8 | 8 | 8 | 20535 | PASS |
| `img-7548-2--uneven-light` | carta | 8 | 8 | 8 | 8 | 21540 | PASS |
| `img-7548-2--perspective` | carta | 8 | 8 | 8 | 8 | 24523 | PASS |
| `img-7548-2--small-text` | carta | 8 | 8 | 8 | 8 | 19996 | PASS |
| `img-7548-2--illegible` | carta | 8 | 0 | 0 | 0 | 181111 | FAIL timeout |
| `img-7552-2--original` | pizarra | 13 | 13 | 13 | 13 | 35015 | PASS |
| `img-7552-2--low-light` | pizarra | 13 | 13 | 13 | 13 | 34600 | PASS |
| `img-7552-2--uneven-light` | pizarra | 13 | 13 | 13 | 13 | 40960 | PASS |
| `img-7552-2--perspective` | pizarra | 13 | 13 | 13 | 13 | 33539 | FAIL identidad |
| `img-7552-2--small-text` | pizarra | 13 | 13 | 13 | 13 | 33068 | PASS |
| `img-7552-2--illegible` | pizarra | 13 | 0 | 0 | 0 | 180912 | FAIL timeout |
| `img-7553-2--original` | pizarra | 19 | 18 | 18 | 18 | 41340 | PASS |
| `img-7553-2--low-light` | pizarra | 19 | 18 | 18 | 18 | 39094 | PASS |
| `img-7553-2--uneven-light` | pizarra | 19 | 18 | 18 | 18 | 39156 | PASS |
| `img-7553-2--perspective` | pizarra | 19 | 18 | 18 | 18 | 42621 | PASS |
| `img-7553-2--small-text` | pizarra | 19 | 18 | 18 | 18 | 40674 | PASS |
| `img-7553-2--illegible` | pizarra | 19 | 0 | 0 | 0 | 181449 | FAIL timeout |

## Resultado tras remediacion

### Abstencion y fallback

Las 5 escenas ilegibles pasan 5/5, sin nombres falsos ni candidatos de alta confianza. Las cuatro cartas se rechazan localmente por calidad en unos `1,3-1,5 s`; la vitrina conserva deteccion por regiones y el analizador devuelve `unreadable` con un codigo de fallback accionable.

El contrato v3 distingue `identified`, `uncertain` y `unreadable`. Cuando falta texto visible o la identidad propuesta no esta sustentada, devuelve `candidates: []`, no calcula afinidad y ofrece reanalizar, acercar la camara o identificar manualmente.

### Vitrina completa con v3 grounded

Las seis variantes pasan 6/6 con APIs reales, sin interceptar, sin errores de consola, sin fallos finales y sin desbordamiento horizontal a 393 px.

| Variante | Regiones | Identificadas/dudosas | Alta confianza | No legibles | Afinidades | ms | Estado |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| original | 30 | 19 | 9 | 11 | 19 | 60216 | PASS |
| baja luz | 30 | 18 | 7 | 12 | 18 | 53706 | PASS |
| luz desigual | 30 | 8 | 3 | 22 | 8 | 44779 | PASS |
| perspectiva | 30 | 23 | 10 | 7 | 23 | 66944 | PASS |
| texto pequeno | 30 | 13 | 3 | 17 | 13 | 51822 | PASS |
| ilegible | 24 | 0 | 0 | 24 | 0 | 30263 | PASS |

Metricas agregadas: pass rate `100%`, recall medio de recuento capado `96,67%`, recall absoluto estimado `58%`, latencia media `51,29 s`, mediana `52,76 s` y maxima `66,94 s`. La precision top-1/top-3 sigue sin ser calculable para esta vitrina hasta completar anotacion humana por botella.

## QA de cliente y movil

- Playwright de producto: 15/15 casos PASS.
- Viewports: 393x852, 430x932, 932x430 y 1440x1000, sin overflow.
- Comparador: 2-5 vinos, nombre largo realista, afinidad, modo personal y modo servicio.
- Carta/pizarra: pines numericos, lista sincronizada, zoom, filtros, drawer y presupuesto/formato.
- Fallback: motivo visible, acciones, correccion manual y afinidad pendiente cuando faltan datos sensoriales.
- Privacidad y safe area: gate previo a galeria/camara, CTA por encima de la navegacion y contenido bajo Dynamic Island corregido.
- Offline: conserva foto, muestra error accionable y permite reintentar.
- Consola: cero errores no gestionados.
- Simulador iPhone 16 Pro iOS 26: retrato y paisaje PASS; build Debug reproducible desde `App.xcworkspace`.
- iPhone fisico `Goiko`: registrado pero `unavailable`; no se declara QA fisico de esta revision.

## Gates tecnicos

| Gate | Resultado |
| --- | --- |
| `npm test` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS, 0 errores y 107 warnings preexistentes |
| `npm run build` | PASS; warning existente de chunks mayores de 500 kB |
| QA UI Playwright | PASS 15/15 |
| E2E grounded vitrina | PASS 6/6 |
| Abstencion de cinco fuentes | PASS 5/5 |
| Xcode Debug Simulator | PASS |
| TestFlight nuevo | NO EJECUTADO |

## Evidencias reproducibles

- Manifiesto: `qa/ground-truth/matchrim-v1.json`.
- Generador: `scripts/build-matchrim-ground-truth.py`.
- Validador: `scripts/check-matchrim-ground-truth.py`.
- Runner: `scripts/qa-matchrim-ground-truth.py`.
- Baseline 30 escenas: `qa-artifacts/matchrim-ground-truth-v1/e2e-baseline/ground-truth-e2e-report.json`.
- Abstencion: `qa-artifacts/matchrim-ground-truth-v1/e2e-hardened-abstention/ground-truth-e2e-report.json`.
- Vitrina v3: `qa-artifacts/matchrim-ground-truth-v1/e2e-v3-fridge-full/ground-truth-e2e-report.json`.
- UI: `qa-artifacts/2026-08-26-grounded-remediation/ui-qa-results.json`.
- Captura fallback: `qa-artifacts/2026-08-26-grounded-remediation/multi-label-unreadable-fallback-mobile.png`.
- Capturas simulador: `qa-artifacts/2026-08-26-grounded-remediation/simulator-final-build-portrait.png` y `simulator-launch-landscape-normalized.png`.

## Gate exacto para build 59

Trabajo interno restante estimado: **13%**.

1. `8%`: anotar al menos 25 capturas independientes adicionales y cajas/identidad exhaustivas de la vitrina; medir precision, recall e IoU de deteccion y precision top-1/top-3.
2. `4%`: ejecutar el build actual en iPhone fisico con camara, galeria, orientacion, Dynamic Type, VoiceOver hablado, red lenta/offline, cancelacion y memoria.
3. `1%`: reducir la vitrina de 30 regiones desde el presupuesto provisional `<=60 s` hacia `<=35 s` mediante batching u orquestacion server-side. El cliente adaptativo y el soak de retry ya estan cerrados.

Solo despues de esos tres gates corresponde incrementar a build 59, archivar, validar y pedir autorizacion explicita para TestFlight. El build no debe depender de mocks y no debe presentar como fiable una identidad que no este respaldada por texto visible o catalogo.
