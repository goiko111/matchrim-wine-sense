# Matchrim 1.0 (71): identidad, moneda y decision verificable

Fecha: 2026-10-05. Continuacion aditiva de [69](MATCHRIM_BUILD69_QA_2026-10-05.md), [70](MATCHRIM_BUILD70_CROP_QA_2026-10-05.md) y [100 cuentas sinteticas](MATCHRIM_100_ACCOUNT_PILOT_2026-10-05.md). No se regenero el corpus ni se modificaron sus anotaciones originales.

## Decision

**NO-GO TestFlight.** Hay defectos de reconocimiento y rendimiento internos, ademas del acceso productivo no disponible. No basta con iniciar sesion en Apple para aprobar esta release. No se ha creado un archive de distribucion ni se ha subido una IPA. Web y backend de produccion sin cambios.

El rerun v8 y la verificacion final v9 estan terminados. Sus resultados fallidos permanecen en las evidencias; no se mezclan para construir una metrica favorable ni se certifica todo el producto con una bateria de cliente.

## Cambios

Commits de codigo: `6daa032`, `69900a9`, `09d1edf`. Se conservan los commits previos `19123b7`, `2740d8e` y `06a6f2f`. Solo cambios propios; no push al repositorio publico pendiente de autorizacion sobre metadatos de QA.

- Monedas ISO por referencia, sin convertir GBP en EUR ni asumir moneda por idioma. Simbolo `$` ambiguo y evidencias contradictorias producen moneda desconocida. Precios negativos y datos ausentes no se convierten en cero.
- Presupuesto y orden por valor solo comparan importes de una misma moneda conocida. Por copa se usa precio de copa, no de botella; precio de copa ausente no sirve para verificar presupuesto.
- Al guardar un vino extranjero, se conserva importe/moneda de escaneo en metadatos; no se escribe como EUR en el campo historico sin moneda.
- Afinidad recalculada por servidor solo con perfil y atributos completos. Evita aplicar dos veces la reduccion de calibracion del porcentaje. Esta calibracion numerica no demuestra calibracion empirica con preferencias humanas.
- Identidad con nombre/productor inferidos o dudas no se convierte en recomendacion confirmada por tener una afinidad alta. Indices de detalle/comparador permanecen alineados al filtrar vinos sin score.
- Carta completa primero; refinamiento adaptativo solo cuando la cobertura/confianza lo exige. Pizarra de nombre/precio usa recortes de filas completos, no separa el nombre de su precio como dos columnas de vinos.
- Filtro compartido cliente/servidor rechaza ofertas genericas como `Bottle of Wine` y `House Red Wine`. Rechaza nombres de sustitucion como `Languedoc-Roussillon (blanco parcialmente legible)` o `2021 [ilegible] Gap`.
- Deduplicacion mantiene la reconciliacion de un productor secundario incierto, pero no ignora dos productores contradictorios de buena confianza por compartir un nombre distintivo.
- Descripcion generada acotada a 24 palabras, razon a 18 y ausencia de evidencia explicita. No sustituye el desglose de afinidad del cliente. La reduccion de texto aun requiere medir precision y latencia; no se declara una mejora causal.

## Gates Del Cliente

| Gate | Resultado conocido | Alcance |
| --- | --- | --- |
| Tests unitarios | PASS | contratos de escaneo, precios, afinidad, deduplicacion y bateria completa incluida simulacion sintetica existente |
| Typecheck / lint | PASS | lint 0 errores, 107 avisos preexistentes |
| Build web e iOS Release | PASS final | cliente `09d1edf`, build 71, SDK 26.0 |
| Playwright | 31/31 PASS final | llamadas de vision interceptadas; no mide reconocimiento real |
| Simulador final | 4/4 PASS | menu aiRIM, cinco modos, giro/background, Dynamic Type XXXL y auditoria de texto recortado |
| Arranque Release en simulador | FAIL v8 | maximo de cinco lanzamientos instrumentados 5.429 s, umbral 5 s sin relajar; no remedio posterior de arranque ni cierre de ese gate |
| QA fisico 71 | BLOCKED | iPhone conectado pero bloqueado; sigue en 1.0 (68), no modificado |

El arranque incluye overhead de XCTest y navegacion a Inicio, no es tiempo puro de primer render. El fallo queda conservado; no se repite hasta conseguir una pasada favorable. Tampoco certifica el rendimiento del iPhone. VoiceOver manual completo, captura de camara, red lenta fisica, memoria y energia bajo carga no estan certificados por los cuatro tests del simulador.

## Benchmark Real De 25 Escenas

Sin interceptacion ni fixtures embebidos. Staging, Anthropic `claude-sonnet-4-6`, detector v4, analisis v8 y menu v7. El cliente es el snapshot core71 congelado en el puerto 4173: incluye moneda, refinamiento adaptativo y ajuste de afinidad, pero precede al ultimo endurecimiento visual de la decision, precio de copa y edicion de moneda. Es diagnostico, no certificacion exacta del binario final.

| Metrica | 69 (25 escenas) | Core71 (mismas 25) |
| --- | ---: | ---: |
| Precision de nombres | 83.43% | 90.00% |
| Recall de nombres | 93.59% | 92.31% |
| Coincidencias / salidas / esperados | 146 / 175 / 156 | 144 / 160 / 156 |
| Falsos positivos / omitidos | 29 / 10 | 16 / 12 |
| Runner PASS | ver baseline | 20/25 |
| Finalizacion / escenas con error de consola | ver baseline | 25/25 / 0 |
| Latencia media / maxima | ver baseline | 58.859 s / 195.413 s |

Son coincidencias aproximadas de nombre, no verificacion canonica independiente de productor, anada, precio, servicio, uvas o atributos sensoriales. Las lecturas provisionales tambien cuentan como salidas. La variabilidad del proveedor y el cambio de contrato impiden atribuir toda diferencia a una sola correccion.

Etiquetas: 13/17 PASS, 19/26/20 nombres, P 73.08%, R 95%, media 22.834 s. Cajas: 29/35/29, P 82.86%, R 100%, IoU medio 0.6879 sobre 15 escenas anotadas, umbral IoU 0.3. Las dos escenas densas sin anotacion exhaustiva no certifican precision canonica. Cartas/pizarras: 7/8 PASS, 125/134/136, P 93.28%, R 91.91%, media 135.411 s.

### Matriz Expected/Actual

E/S/M = nombres esperados/salidas/coincidentes. `-` indica anotacion estructural, no identidad exhaustiva.

| Escena | Tipo | E/S/M | Runner | Latencia s |
| --- | --- | --- | --- | ---: |
| commons-116618810 | etiqueta | 1/1/1 | PASS | 12.787 |
| commons-128502713 | etiqueta | 1/1/1 | PASS | 10.696 |
| commons-128503275 | etiqueta | 1/1/1 | PASS | 10.697 |
| commons-128610681 | etiqueta | 1/1/1 | PASS | 11.204 |
| commons-128610856 | etiqueta | 1/1/1 | PASS | 15.303 |
| commons-152675154 | etiqueta | 1/1/1 | PASS | 14.276 |
| commons-152676516 | etiqueta parcial | 1/2/1 | FAIL | 19.838 |
| commons-152684780 | etiqueta | 1/1/1 | PASS | 16.297 |
| commons-152687522 | etiqueta | 1/1/1 | PASS | 14.251 |
| commons-152733274 | etiqueta | 1/1/1 | PASS | 14.236 |
| commons-26358451 | etiqueta | 1/1/1 | PASS | 14.721 |
| commons-32980703 | botella/fondo | 1/3/0 | FAIL | 36.563 |
| commons-114960137 | botellas repetidas | 1/2/1 | FAIL | 29.347 |
| commons-9941064 | dos anadas | 1/2/1 | FAIL | 12.217 |
| commons-69528109 | estanteria | - | PASS estructural | 27.366 |
| commons-9865219 | multibotella | 6/7/6 | PASS | 31.400 |
| commons-50584361 | expositor denso | - | PASS estructural | 96.985 |
| commons-118365446 | carta | 21/21/20 | PASS | 170.384 |
| commons-131235304 | carta | 16/16/16 | PASS | 140.116 |
| commons-37013918 | carta | 24/23/23 | PASS | 195.413 |
| commons-17259492 | carta | 22/20/19 | PASS | 170.506 |
| commons-155596646 | carta | 24/22/22 | PASS | 172.483 |
| commons-113061301 | pizarra | 9/8/8 | PASS | 75.924 |
| commons-151686648 | pizarra | 5/5/5 | PASS | 30.426 |
| commons-152561556 | pizarra densa | 15/19/12 | FAIL | 128.034 |

`commons-32980703`: la imagen revisada conserva Viña Gravonia en la parte baja de la etiqueta, pero los recortes/analisis devolvieron Viña Tondonia; es un error real, aunque queda provisional. `commons-114960137`: una botella parcialmente leida queda como segundo grupo Moscatel sin Dulce. `commons-9941064`: la anotacion original solo espera un nombre pese a dos botellas de distinta anada; no se borra ni se fusionan anadas para mejorar el score. Pizarra densa: productores cruzados, duplicados y nombres incompletos.

## Reruns Del Candidato

La pasada v8 de las ocho cartas/pizarras usa los assets de `69900a9` y menu v8, no el snapshot core71. Resultado **5/8 PASS**, 124/142/136 nombres, precision 87.32%, recall 91.18%, 18 falsos positivos, 12 omisiones, finalizacion 8/8 y cero escenas con errores de consola. Media 131.619 s, maxima 192.331 s. Frente a v7/core71 la precision empeora y la latencia media apenas baja; el texto compacto no ha demostrado resolver el P0. No se oculta esa regresion. No se ha repetido esta bateria completa con menu v9, cuyo cambio posterior es el filtro de nombres de sustitucion.

| Escena v8 | E/S/M | Runner | Latencia s |
| --- | --- | --- | ---: |
| commons-118365446 | 21/22/19 | FAIL | 157.849 |
| commons-131235304 | 16/16/15 | PASS | 109.394 |
| commons-37013918 | 24/24/24 | PASS | 192.331 |
| commons-17259492 | 22/31/20 | FAIL | 175.746 |
| commons-155596646 | 24/21/21 | PASS | 149.383 |
| commons-113061301 | 9/8/8 | PASS | 139.967 |
| commons-151686648 | 5/5/5 | PASS | 23.368 |
| commons-152561556 | 15/15/12 | FAIL | 104.914 |

La pasada final de **17 etiquetas/multibotella** usa el cliente exacto `09d1edf` y analyze v8/detect v4: **14/17 PASS**, 19/26/20 nombres, precision 73.08%, recall 95%, 7 falsos positivos y una omision. Cajas 27/36/29, precision 75%, recall 93.10%, IoU medio 0.7135. Media 22.910 s, maxima 113.441 s, finalizacion 17/17 y cero escenas con errores de consola.

Fallan `commons-152676516` (1/2/1), `commons-32980703` (1/4/1) y `commons-9941064` (1/2/1). Gravonia vuelve a aparecer, pero siguen otras propuestas/fondo; Moscatel se agrupa correctamente en esta repeticion. No prueba una correccion determinista del proveedor. Frente a las etiquetas de 70 (P 83.33%, R 100%, cajas P 80.56%, R 100%) esta pasada es peor. Ni los umbrales permisivos del runner ni las anadas anotadas de forma incompleta autorizan un GO de calidad canonica.

## Negativos Y Caso GBP

Menu v7: 3/4 negativos validos pasan; el cuarto devuelve la oferta generica Bottle of Wine con confianza 0.62. Tras el filtro v8, los mismos cuatro negativos validos pasan 4/4, con cero referencias. El quinto caso del informe bruto contiene vinos y no es un negativo valido.

Se conserva el [addendum visual independiente](../qa/ground-truth/matchrim-pilot-review-addendum-2026-10-05.json) para `commons-150250375`. En v8 el cliente muestra las 17 referencias anotadas, pero una respuesta cruda intermedia contiene un nombre de sustitucion por una region y precios desplazados. El cliente reconcilia esa respuesta con otros recortes; no se afirma que ese sustituto llegue a la lista final.

En el rerun final v9: cuatro negativos validos **4/4**, cero referencias; carta mixta **17/17 nombres coincidentes**, todas las filas crudas en GBP y cero nombres ilegibles de sustitucion. Latencia del caso mixto 79.446 s. La anotacion original de negativo se conserva y su informe bruto sigue fallando ese quinto caso correctamente segun dicha anotacion; la evaluacion positiva es separada. Moneda y nombres correctos no certifican precios, productor, anada ni maridajes.

## Entornos Y Publicacion

Staging `qpbmqvfnunkylvtvnyyx`, esquema `matchrim_qa`, fixtures y analitica anonima desactivados. Versiones de gestion finales comprobadas: detect 4, analyze 8, menu 9, affinity 5, recommendations 1 y search 2. JWT activado salvo el estado publico previo de search, no modificado. Contratos finales: `matchrim-region-detector-v4-candidate`, `matchrim-region-analysis-v8-partial-name`, `scan-wine-menu-2026-10-05-no-placeholder-v9`. Las tres versiones de menu se desplegaron secuencialmente, despues de acabar la bateria anterior; no se cambio una funcion durante una cohorte.

Produccion `cbjynrbvrhcmpaojmqdp`: 403 administrativo por CLI y permiso denegado por MCP; tampoco aparece entre los proyectos accesibles de la sesion Supabase del navegador. No se puede demostrar que falten todas las funciones ni afirmar paridad de versiones. No se intento mutar produccion ni cambiar miembros/permisos. Accion del propietario: dar acceso administrativo legitimo a ese proyecto o ejecutar un despliegue revisado por su canal propietario, despues del gate de reconocimiento.

Apple: certificados de desarrollo y distribucion disponibles; la pagina de App Store Connect muestra formulario de inicio de sesion. Esto no prueba por si solo que los tokens de Xcode hayan caducado. No se fuerza un upload para comprobarlo con un build que no aprueba QA.

Los cinco archivos privados originales estan autorizados para produccion/proveedor, no para staging. No se han reenviado en esta continuacion; sigue pendiente el consentimiento especifico solicitado. Las imagenes privadas usadas en Playwright permanecen locales con llamadas interceptadas.

No se hizo push: el remoto es publico y la publicacion de metadatos internos de QA sigue pendiente de la decision solicitada. No se sortea esa restriccion por otra rama/canal. Los commits de codigo y evidencias quedan locales. Sin creditos Lovable consumidos.

## Artefacto Y Evidencias

Cliente final: `09d1edf5ca48a1e0a0be8cf2fe10ac3c8b121a92`. Binario Release de desarrollo 1.0 (71), `wine.matchrim.app`, SDK `iphoneos26.0`. ZIP firmado verificado tras extraer a `/private/tmp`, ejecutable y 147 archivos web identicos. SHA-256 del paquete: `69b3c82644104a47fe900aab84cf865a7190067c50c1daef2fb161ab9038dccd`. El ZIP, no una `.app` suelta sincronizada por FileProvider, es el artefacto de referencia. No es una IPA de distribucion ni una version de TestFlight.

Evidencias privadas locales, fuera de Git y sin publicacion remota:

- [Manifest final](</Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim71/artifact71-manifest.json>) y [ZIP del candidato](</Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim71/Matchrim71-staging.zip>).
- [25 escenas diagnosticas](</Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim71/core71-independent25/ground-truth-e2e-report.json>), [ocho cartas/pizarras v8](</Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim71/v8/menus/ground-truth-e2e-report.json>) y [17 etiquetas finales](</Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim71/final-labels/ground-truth-e2e-report.json>).
- [Negativos finales, informe bruto](</Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim71/final-negatives/ground-truth-e2e-report.json>) y [carta GBP contra addendum independiente](</Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim71/logs/matchrim71-v9-mixed-addendum.json>).
- [Cliente 31/31](</Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim71/final-client-ui/ui-qa-results.json>), [moneda/presupuesto GBP](</Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim71/final-client-ui/wine-menu-money-GBP-mobile.png>) y [moneda desconocida](</Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim71/final-client-ui/wine-menu-money-unknown-mobile.png>).
- [Simulador final 4/4](</Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim71/logs/matchrim71-v9-simulator-summary.json>), [captura XXXL y aiRIM principal](</Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim71/logs/matchrim71-v9-simulator-portrait.png>) y [fallo de arranque conservado](</Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim71/logs/matchrim71-cold-simulator-summary.json>).
- [Versiones finales de funciones](</Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim71/logs/matchrim71-v9-staging-functions.json>) y [logs de tests/builds](</Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim71/logs/>).

Los informes brutos conservan las rutas originales de captura; cada captura tambien esta copiada junto a su informe en el directorio durable. Se guardan resultados XCTest de simulador y fallo de arranque en `artifacts/matchrim71/native`. Las dos tentativas iniciales de Playwright fallaron por conversion HEIC dentro del sandbox y por lanzamiento de Chrome restringido, antes de evaluar la app; se repitieron con las conversiones validas existentes y permiso de ejecucion. Una invocacion de Xcode uso inicialmente un nombre de target incorrecto y no ejecuto tests; las pasadas finales usan el target real y pasan. La primera guarda estricta de productor rompio un test existente de reconciliacion de OCR secundario incierto; se ajusto para conservar ese comportamiento y bloquear solo el conflicto entre productores de buena confianza. La bateria completa final pasa y el fallo inicial queda en los logs.

Reproduccion del cliente final: checkout del commit de codigo indicado, builder `node scripts/build-matchrim-staging-candidate.cjs /private/tmp/matchrim-staging-api-keys.json`, build Xcode Release con `CURRENT_PROJECT_VERSION=71` y Xcode 26.0.1. La clave anonima de staging permanece fuera de Git. Para vision: dataset existente `qa-artifacts/matchrim-pilot-v3/materialization-report.json`, `qa-matchrim-ground-truth.py --mode etiqueta --max-scenes 17` o `--capture-kind food_menu_negative --max-scenes 5`, timeout 300000 ms y preview local real. El entorno aislado de QA usa Python 3.12/Playwright 1.55/Chrome instalado. No subir las fotos privadas a staging con esta receta sin consentimiento especifico.

## Residual

- P0 interno: identidad exacta en recortes parciales, referencia principal frente a texto de bodega/fondo, nombres incompletos y productor/precio cruzados en cartas/pizarras; anotacion independiente exhaustiva de precios y canonicos.
- P0 interno: tiempos de cartas densas y medicion de arranque sin overhead de navegacion; no resueltos por el certificado Apple ni por compilar.
- P1: calibracion empirica de confianza, memoria/energia y red lenta en dispositivo, VoiceOver manual y validacion humana de calidad de recomendacion. Las 100 cuentas y el ano sintetico de 10.000 perfiles no son personas reales.
- Externo: acceso productivo, iPhone desbloqueado, consentimiento de fotos privadas para staging y publicacion de metadatos de QA. Firma/cuenta de distribucion se validaran contra el archive exacto despues del gate, no antes.

No se da un porcentaje global arbitrario. El siguiente gate requiere corregir y repetir los casos fallidos, validar campos/latencia, repetir QA del binario exacto y demostrar runtime productivo equivalente; despues se prepara y sube TestFlight con la autorizacion ya dada.
