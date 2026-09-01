# Matchrim: cierre de gates internos de los candidatos 59-60

Fecha: 1 de septiembre de 2026.

Estado: **94% real del P0; candidato interno 60 reproducible; NO-GO para TestFlight**.

No se desplegaron Edge Functions, no se archivo Release y no se subio ningun build. El ultimo TestFlight sigue siendo Matchrim 1.0 (58). Este cierre conserva como baseline los informes anteriores y mide el candidato desde la rama `codex/2matchrim-p0-remediation-20260826`.

## Resultado ejecutivo

- Dataset nuevo `matchrim-independent-v2`: 25 capturas independientes de Wikimedia Commons, sin solape con los cinco fixtures privados. Contiene 11 etiquetas simples, 6 escenas multibotella, 5 cartas impresas y 3 pizarras.
- Benchmark real agregado: 18/25 escenas PASS (`72%`), finalizacion operativa `100%`, cero errores de consola en las capturas usadas para la metrica.
- Identidad visible: precision micro `88,55%`, recall `94,23%` sobre 23 escenas con identidad anotada; 19 falsos positivos y 9 omisiones.
- Cartas/pizarras: precision visible `92,81%`, recall `94,85%`. Canonicidad del contrato (productor, nombre, anada y seccion): `90,32%` precision y `82,35%` recall.
- Deteccion con cajas humanas en 15 escenas: precision `61,36%`, recall `93,10%`, IoU medio `0,6922`. El recall es alto, pero la sobre-deteccion sigue siendo el P0 principal.
- Latencia: media `22,60 s`, mediana `14,40 s`, maxima `128,67 s`. El outlier fue una carta; la mediana mejora ligeramente frente al baseline.
- QA de cliente: 25/25 PASS con respuestas controladas y los cinco materiales privados para layout. Incluye privacidad, safe areas, retrato/paisaje, Dynamic Type 125%, nombres VoiceOver, targets tactiles, retries, cancelacion, offline, comparador 2-5, refinamiento regional, fallback de una zona y consola.
- iOS: Matchrim 1.0 (60), Debug Simulator, SDK 18.5, `CODE_SIGNING_ALLOWED=NO`, `BUILD SUCCEEDED`; instalacion limpia y lanzamiento en iPhone 16 Pro Simulator iOS 26.0.

## Continuacion interna: candidato 60

No se regenero el dataset ni se llamo al proveedor. Se reprodujeron las cajas ya capturadas del informe agregado y se completo el siguiente bloque interno:

- Deteccion multietiqueta adaptativa: la foto completa sigue siendo la via normal; una respuesta parcial o geometricamente contradictoria activa dos crops solapados de 56%, remapea sus coordenadas y fusiona cajas antes del OCR.
- Las franjas de 2% pegadas al borde se rechazan como regiones no analizables. Cuello, etiqueta y caja de botella anidados se consolidan por IoU, contencion y alineacion geometrica.
- Replay de las 15 escenas con cajas humanas: precision efectiva del cliente `61,36% -> 71,05%`, recall estable `93,10%`, 6 cajas espurias menos (`44 -> 38`). Es una medicion offline del postprocesado; no sustituye el rerun E2E con proveedor.
- El comparador prioriza identidad confirmada antes que una afinidad mayor pero dudosa. Si todas las identidades son dudosas muestra `Opcion provisional` y prohibe presentarla como recomendacion final.
- La explicacion de afinidad separa con un aviso visible la identidad del candidato y el score sensorial; una identidad inferior a `72%` pasa a datos faltantes y ensancha el rango orientativo.
- QA Playwright ampliado a 25/25: full + dos zonas, descarte de franjas, fallback si una zona falla, dos cajas independientes, decision provisional, detalle de afinidad, 393 px sin overflow y consola limpia.

La ground truth conserva una contradiccion de alcance que no se maquillo: `commons-32980703` esta anotada como una botella aunque se ven dos principales y botellas de fondo; `commons-9865219` anota seis frontales aunque existen objetos parcialmente visibles detras. Las metricas oficiales se conservan sin editar y el replay se informa por separado.

## Antes / despues

| Metrica | Baseline independiente | Candidato 59 | Cambio |
| --- | ---: | ---: | ---: |
| Escenas PASS | 60,00% | 72,00% | +12,00 pp |
| Precision de identidad | 65,14% | 88,55% | +23,41 pp |
| Recall de identidad | 79,78% | 94,23% | +14,45 pp |
| Precision de deteccion | 61,36% | 61,36% | sin cambio |
| Recall de deteccion | 93,10% | 93,10% | sin cambio |
| IoU medio | 0,6852 | 0,6922 | +0,0070 |
| Latencia media | 18,27 s | 22,60 s | +4,33 s |
| Latencia mediana | 14,63 s | 14,40 s | -0,23 s |
| Latencia maxima | 38,91 s | 128,67 s | +89,76 s |

La mejora de identidad combina correcciones de producto y de medicion. El baseline comparaba ruido del boton con la identidad; el runner actual separa nombre visible, identidad canonica y geometria. No se rebajaron los umbrales. El aumento de latencia media proviene del outlier de 128,67 s y de analizar full + dos regiones en paralelo para cartas incompletas.

## Expected / actual de 25 escenas

| Escena | Modo | Esperado | Actual | Precision | Recall | ms | Estado |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| `commons-116618810` | etiqueta | 1 | 1 | 1,000 | 1,000 | 7678 | PASS |
| `commons-128502713` | etiqueta | 1 | 1 | 1,000 | 1,000 | 7863 | PASS |
| `commons-128503275` | etiqueta | 1 | 1 | 1,000 | 1,000 | 7429 | PASS |
| `commons-128610681` | etiqueta | 1 | 1 | 1,000 | 1,000 | 7848 | PASS |
| `commons-128610856` | etiqueta | 1 | 2 | 1,000 | 1,000 | 8404 | PASS |
| `commons-152675154` | etiqueta | 1 | 1 | 1,000 | 1,000 | 14401 | PASS |
| `commons-152676516` | etiqueta | 1 | 2 | 0,000 | 0,000 | 7820 | FAIL identidad |
| `commons-152684780` | etiqueta | 1 | 1 | 1,000 | 1,000 | 12886 | PASS |
| `commons-152687522` | etiqueta | 1 | 1 | 1,000 | 1,000 | 7356 | PASS |
| `commons-152733274` | etiqueta | 1 | 1 | 1,000 | 1,000 | 9834 | PASS |
| `commons-26358451` | etiqueta | 1 | 1 | 1,000 | 1,000 | 7296 | PASS |
| `commons-32980703` | etiqueta | 1 | 9 | 0,000 | 0,000 | 14393 | FAIL sobre-deteccion |
| `commons-114960137` | etiqueta | 6 | 6 | 0,333 | 1,000 | 18374 | FAIL falsos positivos |
| `commons-9941064` | etiqueta | 2 | 2 | 1,000 | 1,000 | 10346 | PASS |
| `commons-69528109` | etiqueta | 6 | 10 | n/a | n/a | 14851 | PASS recuento |
| `commons-9865219` | etiqueta | 5 | 14 | 0,667 | 1,000 | 23062 | FAIL sobre-deteccion |
| `commons-50584361` | etiqueta | 12 | 3 | n/a | n/a | 16956 | FAIL recall de regiones |
| `commons-118365446` | carta | 21 | 22 | 0,955 | 1,000 | 29921 | PASS |
| `commons-131235304` | carta | 16 | 16 | 1,000 | 1,000 | 34143 | PASS |
| `commons-37013918` | carta | 24 | 30 | 0,800 | 1,000 | 36741 | FAIL duplicados |
| `commons-17259492` | carta historica | 22 | 18 | 0,944 | 0,773 | 44071 | FAIL recall |
| `commons-155596646` | carta historica | 24 | 24 | 0,958 | 0,958 | 39118 | PASS |
| `commons-113061301` | pizarra | 9 | 9 | 1,000 | 1,000 | 23285 | PASS |
| `commons-151686648` | pizarra | 5 | 5 | 1,000 | 1,000 | 128665 | PASS con outlier |
| `commons-152561556` | pizarra densa | 15 | 15 | 0,933 | 0,933 | 32278 | PASS |

## Implementacion cerrada

- Carta con full + dos teselas de 56% y solape del 12%, recortes de hasta 1800 px, coordenadas remapeadas al documento y tolerancia a una region fallida.
- Seleccion conservadora: si full declara `reported_complete`, se usa full; si no, se usan solo regiones. Se evita sumar full y regiones, que generaba duplicados masivos.
- Deduplicacion por texto fuente o proximidad de pin, sin fusionar referencias distintas del mismo productor o estilo.
- Dedupe multibotella mas estricto: aliases OCR solo se agrupan cuando los tokens extra son productor/anada. Se evita unir variantes como Passion Pop Original y Mixed Berry.
- Candidate Edge Functions v4: una botella fisica no se divide por paneles, la certificacion no sustituye al nombre, se preservan filas repetidas por formato/precio y la incertidumbre limita confianza.
- QA reproducible con IoU, precision/recall, hashes, source ids de Commons, autoria/licencia y anotacion humana; el modelo nunca genera ground truth.
- Accesibilidad de carta: pins y zoom con minimo 44x44 px, botones icon-only nombrados, dialogo accesible y layout sin overflow al 125%.
- Manifest nativo actualizado a Capacitor actual (`packageClassList`), eliminando el error de registro de plugins observado en el primer lanzamiento del build 59.

## QA casual y sommelier

| Flujo | Resultado |
| --- | --- |
| Usuario casual | Escaneo, ranking, identidad dudosa, correccion manual, opcion segura/exploratoria/valor y error offline son accionables. PASS de cliente. |
| Sumiller | Comparador 2-5, modo Servicio, presupuesto, copa/botella, lista sincronizada y detalle de afinidad estan presentes. PASS de cliente. |
| Afinidad | Score aproximado, confianza de identidad, coincidencias, fricciones, fuentes, datos faltantes y dimensiones se muestran por separado. PASS con fixtures; la calidad sensorial depende de datos disponibles. |
| No amontonamiento | En imagen solo pins/contornos numerados; texto, score y acciones viven en lista/drawer. PASS retrato/paisaje. |
| Abstencion | Sin texto legible no se inventa identidad ni afinidad; ofrece reanalizar o identificacion manual. PASS. |

## Gaps y bloqueos

### P0

1. Produccion sigue en detector v3, analizador v3 y carta v3. Las fuentes locales son `matchrim-region-detector-v4-candidate`, `matchrim-region-analysis-v4-candidate` y `scan-wine-menu-2026-08-27-regional-v4-candidate`; no se desplegaron por el gate de publicacion.
2. El proveedor devolvio `Creditos agotados` durante la ultima pasada: las cinco primeras cartas respondieron y las tres pizarras quedaron bloqueadas. La metrica final de cartas re-puntua offline una captura real completa anterior, del mismo build y sin mocks. El informe lo marca con `rescored_without_api_calls: true` y conserva el source report.
3. Precision oficial del detector `61,36%`; el postprocesado del candidato 60 alcanza `71,05%` en replay sin perder recall. El refinamiento regional y el v4 candidato deben probarse E2E tras restaurar cuota y desplegar con autorizacion.
4. No hay QA de esta revision en iPhone fisico. El build 60 solo se instalo en simulador; camara, PHPicker, VoiceOver hablado, red lenta y memoria total con WebKit quedan como gate fisico.

### P1

1. Reducir coste/latencia de full + regiones mediante batching server-side o detector OCR especializado. Presupuesto deseado: mediana <=15 s y maxima <=45 s.
2. Mejorar herencia de productor/anada/seccion en menus historicos y apilar campos sin confundir descripciones con nombres.
3. Perfilar memoria de proceso nativo + WebKit durante 25 escenas. El `.app` Debug pesa 12 MB y `dist` 8,2 MB; no se declara un pico de memoria sin instrumento fiable.

### Exploracion aditiva: avatar/aiRIM

La spec `MATCHRIM_AVATAR_AIRIM_EXPLORATION_2026-09-01.md` anade un carril de discovery sin sustituir ningun P0/P1 anterior. Recomienda validar primero una guia `aiRIM` contextual, textual y estatica dentro de Matchrim; voz, animacion, memoria transversal y la identidad compartida `AIRim` quedan condicionadas a utilidad, confianza, accesibilidad, coste y consentimiento. No hay implementacion ni cambio de produccion asociado.

## Gates ejecutados

| Gate | Resultado |
| --- | --- |
| `npm test` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS, 0 errores y 107 warnings historicos |
| `npm run build` | PASS; aviso existente de chunks >500 kB |
| QA UI Playwright | PASS 25/25, consola limpia |
| Replay de normalizacion | PASS; precision 61,36% -> 71,05%, recall 93,10% estable |
| Benchmark real independiente | 25/25 terminales; 18/25 sobre umbral |
| Xcode Debug Simulator | PASS, Matchrim 1.0 (60) |
| Instalacion/lanzamiento limpio | PASS; error de plugins corregido |
| TestFlight/deploy | NO EJECUTADO |

## Evidencias

- Dataset: `qa/ground-truth/matchrim-independent-v2.json`.
- Contact sheet: `docs/qa-evidence/matchrim-candidate-59-2026-09-01/independent-25-contact-sheet.jpg`.
- Informe agregado: `qa-artifacts/matchrim-independent-v2/e2e-final-25-2026-09-01/ground-truth-e2e-report.json`.
- Captura real de cartas re-puntuada: `qa-artifacts/matchrim-independent-v2/e2e-final-menus-rescored-2026-09-01/ground-truth-e2e-report.json`.
- Incidencia de creditos: `qa-artifacts/matchrim-independent-v2/e2e-final-menus-display-2026-09-01/ground-truth-e2e-report.json`.
- UI 22/22: `qa-artifacts/2026-09-01-candidate/ui-final-22/ui-qa-results.json`.
- Multietiqueta: `docs/qa-evidence/matchrim-candidate-59-2026-09-01/multi-label-summary-mobile.png`.
- Dynamic Type: `docs/qa-evidence/matchrim-candidate-59-2026-09-01/wine-menu-accessibility-125pct-mobile.png`.
- Privacidad paisaje: `docs/qa-evidence/matchrim-candidate-59-2026-09-01/privacy-safe-area-landscape.png`.
- Simulador: `docs/qa-evidence/matchrim-candidate-59-2026-09-01/simulator-build-59-home.png`, `simulator-build-59-privacy-portrait.png` y `simulator-build-59-privacy-landscape.png`.
- App candidato: `qa-artifacts/2026-09-01-candidate/derived-data-59/Build/Products/Debug-iphonesimulator/App.app`.
- Replay candidato 60: `npm run qa:detection:replay` sobre `qa-artifacts/matchrim-independent-v2/e2e-final-25-2026-09-01/ground-truth-e2e-report.json`.
- UI 25/25: `docs/qa-evidence/matchrim-candidate-60-2026-09-01/ui-qa-results.json`.
- Refinamiento regional: `docs/qa-evidence/matchrim-candidate-60-2026-09-01/multi-label-regional-detection-mobile.png`.
- Decision provisional: `docs/qa-evidence/matchrim-candidate-60-2026-09-01/multi-label-provisional-decision-mobile.png`.
- Afinidad con identidad dudosa: `docs/qa-evidence/matchrim-candidate-60-2026-09-01/multi-label-detail-mobile.png`.
- Lanzamiento iOS: `docs/qa-evidence/matchrim-candidate-60-2026-09-01/ios-simulator-launch-build-60.png`.
- App candidato 60: `qa-artifacts/build-60-workspace-derived/Build/Products/Debug-iphonesimulator/App.app`.

## Accion unica para abrir TestFlight

El propietario debe ejecutar un unico release gate autorizado: **restaurar cuota, desplegar las tres Edge Functions v4, repetir las 25 escenas y los cinco materiales privados, completar el recorrido fisico en iPhone y autorizar expresamente la subida del build 60 solo si esos resultados quedan verdes**. Hasta entonces, el candidato es reproducible pero no publicable.
