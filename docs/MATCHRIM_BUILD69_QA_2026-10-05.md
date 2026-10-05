# Matchrim 1.0 (69): correcciones y benchmark real

Fecha: 2026-10-05. Rama: `codex/matchrim-learning-airim-qa-20260928`.
Commit de producto: `19123b7`. Baseline conservado: [piloto de 100 cuentas](MATCHRIM_100_ACCOUNT_PILOT_2026-10-05.md).

## Decision de release

**NO-GO para TestFlight.** Este es un candidato firmado de desarrollo, conectado a staging, no un archive de distribucion. No se ha publicado la web ni modificado produccion.

El flujo funcional no equivale a precision de identidad. Las metricas de nombres de este informe no verifican por separado bodega, anada, precio ni ficha sensorial. La afinidad basada en inferencias es orientativa, no una probabilidad empiricamente calibrada de que a una persona le gustara el vino.

## Defectos corregidos

1. El boton central de escaneo se desplazaba al pulsarlo: el `transform` del estado activo sobrescribia la traslacion de centrado y cancelaba el toque. Ahora ocupa la tercera celda de la barra nativa. El diseño web no se ha rediseñado.
2. El refinado multibotella descartaba las detecciones de la foto completa. Se conserva full + regiones y se deduplican las cajas; la botella principal Viña Gravonia vuelve a leerse en el rerun real.
3. Una lectura de foco podia sustituir, en vez de complementar, la carta completa. La fusion conserva la base y añade contenido complementario.
4. Bodegas y anadas sin respaldo literal se sustituyen por `null`, con duda visible. No se promociona una variante de producto que no se ve completamente.
5. `null`, espacios, booleanos y campos ausentes podian convertirse en ceros, atributos sensoriales minimos o incluso una afinidad del 8%. Cliente y funciones ahora conservan desconocidos; no calculan afinidad completa con dimensiones ausentes.
6. El OCR inventaba sustitutos como `Wine 1` o `Sparkling Wine (Fifth 12.00)`. El contrato exige abstencion y el filtro elimina estilos/precios usados como identidad sin marca visible.
7. La fusion de cartas separa coincidencia de documento de identidad canonica. Dos lecturas de una misma linea con precios contradictorios no eligen un precio silenciosamente; se devuelve precio desconocido y aviso. Diferentes bodegas y anadas siguen separadas.
8. Se evita un cuarto recorte horizontal cuando ya han terminado ambas columnas. Las lecturas parciales del borde derecho siguen disponibles en fotografias verticales con varias paginas.
9. Una consulta al catalogo local no disponible ya no rompe el OCR de staging: continua sin enriquecimiento y sin fingir un match de catalogo.

## QA funcional y visual

| Gate | Resultado | Alcance |
| --- | --- | --- |
| Unitarios y contratos | PASS | aprendizaje, perfiles, aislamiento, identidad, duplicados, crops, valores ausentes, retries y cancelacion |
| Typecheck | PASS | `tsconfig.app.json`, no comprobacion vacia de referencias |
| Lint | PASS | `npm run lint -- --quiet` |
| Build web | PASS | staging, fixtures desactivados, telemetria anonima desactivada |
| Build iOS fisico/simulador | PASS | Xcode 26.0.1, SDK iOS 26, version 1.0 (69) |
| Playwright integral | 29/29 PASS | respuestas controladas, no metrica de OCR |
| Playwright nativo | 6/6 grupos PASS | toque real en barra inferior, escena/lista/comparador, cuatro cartas, retrato/paisaje, aiRIM |
| Simulador final | 4/4 PASS | aiRIM, cinco modos, giro/background, Dynamic Type XXXL y auditoria de clipping |
| iPhone antes del ultimo ajuste de datos | 6/6 PASS | navegacion, safe areas, cinco cold launches, galeria, giro/background y accesibilidad |
| iPhone del binario final | 6/6 PASS | iPhone 16 Pro Max, iOS 26.6; navegación, cinco cold launches, galeria, giro/background y auditoria de texto |

El maximo de los cinco arranques fisicos finales fue 4.207 s, incluyendo el toque adicional en Inicio. No es comparable directamente con el 2.450 s del baseline anterior. VoiceOver basico se valida mediante nombres accesibles y semantica de dialogos; no sustituye un recorrido manual completo con lector de pantalla. La apertura/retorno de galeria no certifica captura real de camara. Memoria/energia bajo carga y red lenta fisica siguen pendientes.

Xcode espero inicialmente a que se desbloqueara el dispositivo; despues completo las seis pruebas sin fallos. Al terminar se reinstalo y abrio la version original 1.0 (68), conectada a produccion, mediante instalacion del mismo bundle sin borrar datos. No se dejo staging en el telefono. El build 69 conserva su manifest y artefacto independiente.

## Benchmark independiente

Se reutilizan las mismas 25 escenas existentes: 11 etiquetas simples, 6 escenas multibotella, 5 cartas impresas y 3 pizarras. IDs, hashes de imagen y hashes de fuente se verificaron contra `matchrim-independent-v2`; no se regenero el dataset ni se usaron salidas del modelo como ground truth.

Dos ejecuciones completas con proveedor real, sin interceptacion. Modelo: `claude-sonnet-4-6`. La primera congela analyze v6/menu v5; la segunda usa analyze v7/menu v6 y el commit `19123b7`. Las comparaciones son descriptivas: no demuestran causalidad estadistica y el proveedor es no determinista.

La primera pasada finalizo 25/25 escenas y paso 16/25: nombres P=0.6203, R=0.9423; cajas P=0.6585, R=0.9310, IoU=0.7074; latencia media 59.254 s, mediana 25.426 s, maxima 189.707 s. Hubo un HTTP 500 recuperado por retry, no un error sin manejar. La cobertura limitada por recuento del informe bruto puede superar 1 por un defecto del calculo anterior; el runner corregido limita ese valor a 1. No se usa esa metrica para certificar precision.

La segunda pasada termino 25/25, con 18/25 PASS. Nombres: 146 coincidencias de 175 salidas y 156 esperadas, P=0.8343, R=0.9359; 29 falsos positivos y 10 omitidos. Cajas: P=0.6905, R=1.0000, IoU=0.6775. Latencia media 49.176 s, mediana 26.004 s y maxima 176.350 s. No hubo errores de consola ni fallos transitorios. Los umbrales de PASS del runner no son el gate mas estricto de release.

| Categoria | P antes | P 69 | R antes | R 69 | Latencia media 69 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Etiquetas, 17 escenas (15 con nombres) | 82.61% | 68.97% | 95.00% | 100.00% | 24.375 s |
| Cartas impresas, 5 | 61.59% | 91.67% | 94.39% | 92.52% | 132.557 s |
| Pizarras, 3 | 54.00% | 71.05% | 93.10% | 93.10% | 50.743 s |

La mejora agregada no oculta que las etiquetas empeoraron por fragmentos y nombres parciales. Eso motivo la correccion adicional del [candidato 70](MATCHRIM_BUILD70_CROP_QA_2026-10-05.md), validada en un rerun aparte, no mezclada con esta pasada. Las categorias densas con anotacion solo estructural no tienen precision de identidad certificada.

La [matriz por escena y referencia](qa-evidence/matchrim-build69-2026-10-05/independent25-comparison.json) conserva expected/actual, coincidencias, falsos positivos, omitidos, cajas, latencia y estado de ambas ejecuciones. Informes brutos: [antes](qa-evidence/matchrim-build69-2026-10-05/independent25-before.json) y [despues 69](qa-evidence/matchrim-build69-2026-10-05/independent25-after69.json).

### Limites de las anotaciones

- `commons-9941064` contiene dos Cloudy Bay Sauvignon Blanc de anadas distintas (2008 y 2006), pero anota un solo nombre esperado. La metrica estricta de nombres penaliza una segunda fila legitima; un fragmento adicional de la misma botella si es un defecto. Se conserva el dato original, sin maquillar el resultado.
- `commons-152676516` muestra la referencia 750 en 2006 y 2007; la anotacion de nombres no distingue ambas anadas. Una lectura parcial de Valverde no equivale a identificar completamente la referencia.
- `commons-32980703` anota una sola caja/identidad principal aunque existen otras botellas reales de fondo. La precision geometrica respecto a ese subconjunto no es precision exhaustiva de objetos.
- Las dos vitrinas privadas no tienen ground truth exhaustivo de todas las botellas. Mas regiones o mas afinidades no prueba mejor identidad.

## Perfiles y uso recurrente

Se conserva el estudio previo: 100 cuentas **sinteticas** pobladas, 6,000 vinos, 4,800 valoraciones, 300 sesiones restaurante, 100/100 recorridos funcionales y 10/10 perfiles con recomendaciones coherentes. No se convierten en 100 participantes humanos ni en evidencia de satisfaccion de 10,000 personas durante un año.

aiRIM permanece en el menu principal. El comparador distingue usuario y servicio, presupuesto y copa/botella. La captacion comercial Winerim exige consentimiento aparte; foto y perfil no se comparten como señal comercial. No se ha añadido memoria transversal ni un avatar decorativo en este bloque.

## Versiones y entorno

Staging: `qpbmqvfnunkylvtvnyyx`, esquema `matchrim_qa`.

| Funcion | Version gestion | Contrato | JWT |
| --- | ---: | --- | --- |
| detect-wine-regions | 4 | `matchrim-region-detector-v4-candidate` | activado |
| analyze-wine-region | 7 | `matchrim-region-analysis-v7-null-preserving` | activado |
| scan-wine-menu | 6 | `scan-wine-menu-2026-10-05-null-preserving-v6` | activado |
| calculate-wine-affinity | 5 | existente | activado |
| matchrim-recommendations | 1 | existente | activado |
| search-wines | 2 | fallback local | estado publico previo, no relajado en esta continuacion |

Produccion `cbjynrbvrhcmpaojmqdp`: el comando de listado administrativo vuelve a responder 403. No se intento un deploy productivo ni se usaron creditos Lovable. La cuenta propietaria debe conceder acceso administrativo de Edge Functions o ejecutar un despliegue revisado, pero solo despues del gate de reconocimiento.

## Reproduccion

```bash
node scripts/build-matchrim-staging-candidate.cjs /private/tmp/matchrim-staging-api-keys.json
DEVELOPER_DIR=/Applications/Xcode-26.0.1.app/Contents/Developer xcodebuild \
  -workspace ios/App/App.xcworkspace -scheme App -configuration Debug \
  -destination 'generic/platform=iOS' -derivedDataPath /private/tmp/matchrim-candidate69 \
  CURRENT_PROJECT_VERSION=69 build
```

El fichero de claves queda fuera de Git; el builder rechaza claves de servicio o de otro proyecto. Para QA iOS, `scripts/create-matchrim-ui-test-project.rb` genera un proyecto aislado con `qa/ios/MatchrimCandidateUITests.swift`, usando el gem `xcodeproj` ya instalado. El benchmark reutiliza `qa-artifacts/matchrim-pilot-v3/materialization-report.json` con `--max-scenes 25`; exige un entorno Playwright disponible y preview local del build real de staging.

El manifest de artefacto conserva commit, SDK, version y hashes del ejecutable/assets. El candidato firmado se guarda ademas fuera de `/tmp` en la carpeta de artefactos de este chat.

## Evidencias

Directorio: [build69](qa-evidence/matchrim-build69-2026-10-05/).

- [aiRIM en menu principal del iPhone, binario final](qa-evidence/matchrim-build69-2026-10-05/iphone-final-airim-main-menu.png)
- [Lista multivino clara, fixture de UI](qa-evidence/matchrim-build69-2026-10-05/client-multi-wines.png)
- [Escaner fisico en paisaje, binario final](qa-evidence/matchrim-build69-2026-10-05/iphone-final-scanner-landscape.png)
- [QA fisico final 6/6](qa-evidence/matchrim-build69-2026-10-05/iphone-final-summary.json)
- [Restauracion de la version original 68](qa-evidence/matchrim-build69-2026-10-05/iphone-restoration.json)
- [Resultados reales de las cinco fotos privadas, pasada v5](qa-evidence/matchrim-build69-2026-10-05/user-five-v5-final.json)

Las capturas del selector privado de fotos y los nuevos archivos que contienen fotos privadas permanecen locales, fuera del commit. Las pruebas fallidas previas y los reruns se conservan en los informes originales; el verde funcional no sustituye el NO-GO de reconocimiento.

La repeticion final de las cinco fotos privadas fue detenida por auto-review: la autorizacion existente nombraba produccion y proveedor, no el backend distinto de staging. Se solicito consentimiento especifico; no se intento otra ruta de envio. Los resultados previos se etiquetan como pasadas anteriores, no como QA nuevo del binario final.

## Residual concreto

P0: fragmentos duplicados de una misma botella, identidades parciales en escenas densas, mezcla de campos/filas en cartas antiguas y latencia larga. Hace falta anotacion canonica exhaustiva para validar bodega/anada y calibrar confianza, no solo nombres. No se promete un porcentaje global de progreso que oculte estos gates.

P1: QA manual completo de VoiceOver/camara, memoria/energia y red lenta real; cartas multipagina y precios historicos/formatos no equivalentes; medir satisfaccion tras consumo con participantes humanos.

Gate de TestFlight: benchmark real dentro de umbrales (P>=0.90, R>=0.85 por categoria, sin identidad falsa confirmada), presupuesto de latencia acordado, runtime productivo equivalente validado y QA del binario de distribucion exacto. El verde del candidato de desarrollo no basta para publicar.
