# Matchrim: comparacion contextual y QA en simulador R2

Fecha: 2026-08-25
Fuente: `matchrim-publish-20260713`
Rama/base: `codex/publish-20260713` / `c0e636f`
Build probado: Matchrim `1.0 (57)`, Debug para iOS Simulator
Gate de publicacion: cerrado; no se ha desplegado Supabase ni enviado un build.

## Alcance ejecutado

- Frontera local de fixtures activable solo con `VITE_MATCHRIM_QA_FIXTURES=true`.
- Flujo nativo PHPicker con los cinco archivos originales.
- Expositor multibotella: cinco regiones, tres referencias, duplicado agrupado, una identidad dudosa y una region sin reconocer.
- Cartas: imagen con pines numericos, lista sincronizada, cinco resultados y detalle fuera de la imagen.
- Comparador de 2 a 5 vinos en modos `Para mi` y `Servicio`, con presupuesto, formato y prioridades verificables.
- Afinidad trazable por dimensiones, confianza, coincidencias, fricciones, aventura, procedencia, datos ausentes y feedback.
- Orientacion vertical/horizontal y Dynamic Type AXXXL.
- Cierre/reinstalacion/reapertura del build, logs, memoria y consola web.

La frontera QA es explicita y muestra un aviso visible. El bundle de produccion se comprobo sin el chunk `matchrimQaFixtures`; por tanto, estas respuestas no pueden entrar accidentalmente en un build normal.

## Correcciones de R2

1. El comparador ahora incorpora el tercer vino que llega progresivamente durante el analisis. Tras una edicion manual conserva la seleccion del usuario.
2. Dynamic Type en WKWebView usa `text-size-adjust` y una variante de layout para accesibilidad. Ya no usa `pageZoom`, que recortaba lineas lateralmente.
3. Las dimensiones de afinidad pasan a dos filas en AXXXL: etiqueta y feedback arriba; barra y trazabilidad debajo.
4. La aplicacion del tamaño se repite tras el montaje asincrono de Capacitor y responde tambien al cambio de categoria en vivo.
5. La matriz Playwright puede ejecutar la misma frontera embebida y aborta si intenta invocar una Edge Function.

## Expected / actual

| Caso | Esperado | Actual | Estado |
| --- | --- | --- | --- |
| TypeScript | Sin errores | `npx tsc --noEmit` completo | PASS |
| Pruebas puras | Clasificador, aprendizaje y contratos multiwine | Tres scripts completos | PASS |
| ESLint del cambio | Sin errores nuevos | Sin errores | PASS |
| Build web normal | Bundle de produccion sin fixtures | 3.592 modulos; no contiene chunk QA | PASS |
| Build web QA | Bundle con frontera determinista visible | Build completo | PASS |
| Build iOS Simulator | App 57 Debug instalable | `** BUILD SUCCEEDED **` | PASS |
| `IMG_7605 2.jpg` | No fusionar toda la foto | 5 regiones; 3 referencias; 2 Muga agrupadas; 1 dudosa; 1 no reconocida | PASS nativo |
| Region dudosa | No inventar identidad | Riscal 61% y Caceres 43%, evidencia y motivo de duda | PASS nativo |
| Afinidad individual | Score explicable | Desglose sensorial, confianza 58%, friccion, aventura, fuentes y feedback | PASS nativo |
| Comparacion | Seleccionar 2-5 sin perder resultados tardios | 3/5 inicial; 5/5 manual; modos personal y servicio | PASS nativo |
| Carta `IMG_7547` | Cinco resultados sin amontonar | Finca Dofi como candidato principal del fixture | PASS nativo |
| Carta `IMG_7548` | Cinco resultados sin amontonar | Gramona Imperial como candidato principal del fixture | PASS nativo |
| Carta `IMG_7552` | Soportar carta inclinada/horizontal | Txakoli G22; vertical y horizontal sin solapes | PASS nativo |
| Carta `IMG_7553` | Pines y lista sincronizada | 4 pines fiables, quinto dudoso sin pin inventado; Les Terrasses primero | PASS nativo |
| Restricciones de servicio | Presupuesto y copa cambian la decision | Con copa + 40 EUR elige Pazo de Senorans, 36 EUR | PASS nativo |
| Layout movil | Sin desbordamiento horizontal | `scrollWidth == clientWidth` en 430x932 y 932x430 | PASS web |
| Dynamic Type AXXXL | Texto mayor con reflujo | Arranque frio, lista y detalle sin recorte lateral; dimensiones recompuestas | PASS nativo |
| Sin red | Conservar foto y ofrecer reintento | Matriz production-boundary completa | PASS web |
| Consola | Sin excepciones de aplicacion | Cero errores en ambas matrices web; sin crash ni excepcion JS en recorrido nativo | PASS |
| Reapertura | Sin cierre ni pantalla vacia | Terminacion, instalacion y lanzamiento repetidos | PASS |
| Memoria de simulador | Medida tras flujo intensivo | App 61 MB, pico 63 MB; WebContent 106 MB, pico 194 MB | PASS parcial |
| Precision OCR/modelo | Resultados reales sobre backend desplegado | Funciones no desplegadas; los valores son fixtures contractuales | BLOCKED |

## Matrices y limites

La matriz `browser-prod` ejercita la frontera normal con interceptores de prueba y cubre offline/reintento. La matriz `browser-embedded` usa la frontera incluida en el build QA y falla ante cualquier llamada de red. Ambas pasan 13 casos y reportan cero errores de consola.

Las latencias de esta frontera son deliberadamente artificiales: 240 ms para deteccion, 160 ms por region y 350 ms para carta. Sirven para validar progreso, concurrencia y cancelacion, no para afirmar rendimiento del modelo.

El log nativo contiene dos avisos ImageIO al generar miniaturas JPEG/HEIC dentro de PHPicker. La imagen seleccionada se mostro y el flujo termino; no hubo crash. Debe vigilarse en el iPhone fisico porque no es una medida de precision ni de estabilidad con memoria real.

## Evidencias

Seleccionadas y versionadas:

- `docs/qa-evidence/matchrim-comparison-2026-08-25-r2/`
- `ui-qa-results-production-boundary.json`
- `ui-qa-results-embedded-boundary.json`
- capturas de regiones, ranking, comparador, pines, afinidad, horizontal y AXXXL.

Artefactos completos no versionados:

- `qa-artifacts/2026-08-25-matchrim-comparison-r2/simulator/full-fixture-flow.mp4`
- `qa-artifacts/2026-08-25-matchrim-comparison-r2/simulator/app-and-webkit.log`
- `qa-artifacts/2026-08-25-matchrim-comparison-r2/simulator/xcodebuild.log`
- matrices y capturas completas en `browser-prod/` y `browser-embedded/`.

## Gate exacto

Estado TestFlight/deploy: **NO-GO**.

Para abrir el gate deben cumplirse, en este orden:

1. Revisar y autorizar el despliegue versionado a staging de `detect-wine-regions`, `analyze-wine-region` y `scan-wine-menu`.
2. Ejecutar los cinco originales contra esas funciones sin fixtures y registrar cajas, OCR, candidatos, afinidad, latencia y fallos reales.
3. Corregir cualquier identidad inventada, fusion de columnas o precision insuficiente; repetir hasta que no haya P0 abierto.
4. Generar un build Release con el siguiente `CFBundleVersion` libre, sin `VITE_MATCHRIM_QA_FIXTURES`, y verificar que no incluye el chunk QA.
5. Repetir camara, galeria, vertical/horizontal, AXXXL, VoiceOver basico, red lenta/sin red, memoria y reapertura en iPhone fisico.
6. Presentar las evidencias y solicitar una autorizacion nueva y explicita antes de desplegar produccion o subir a TestFlight.
