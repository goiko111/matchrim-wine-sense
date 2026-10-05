# Matchrim 1.0 (70): cierre del bloque de recortes

Fecha: 2026-10-05. Commit de cliente: `2740d8ef1ddd1444997d575fba5dcaad6b6be8fc`.
Baseline: [QA completo 69](MATCHRIM_BUILD69_QA_2026-10-05.md) y [piloto de 100 cuentas sinteticas](MATCHRIM_100_ACCOUNT_PILOT_2026-10-05.md).

## Decision

**NO-GO TestFlight.** Candidato firmado de desarrollo, staging `qpbmqvfnunkylvtvnyyx`, esquema `matchrim_qa`, sin mocks ni fixtures embebidos ni telemetria anonima. No hay archive de distribucion, deploy web ni cambios en produccion.

Este bloque corrige y prueba un defecto de recortes. No declara terminado todo Matchrim ni convierte cuentas sinteticas en usuarios humanos satisfechos.

## Implementacion

- La deduplicacion geometrica conserva la extension completa de la botella aunque una etiqueta parcial tenga mas confianza. Reevalua fragmentos ya guardados al ampliar la caja. Mantiene separadas botellas vecinas y botellas de diferentes baldas.
- Regresiones especificas de caja completa/etiqueta, fragmentos conectados, vecino y baldas, ademas de la bateria existente.
- El runner permite `--capture-kind` para seleccionar escenas existentes, sin regenerar el dataset.
- El QA nativo espera un viewport WebKit estable antes de consultar hit-testing tras girar; no se retiran assertions ni se modifica el binario para hacer pasar el test.

## QA Automatizado

| Gate | Resultado | Nota |
| --- | --- | --- |
| npm test | PASS | bateria completa y nuevos contratos de crops |
| typecheck / lint | PASS | error inicial de tipo literal corregido; rerun verde |
| Build web | PASS | staging con builder que valida clave anonima y proyecto |
| Build iOS dispositivo / simulador | PASS | SDK 26.0, Xcode 26.0.1, version 1.0 (70) |
| Firma de desarrollo | PASS | `codesign --verify --deep --strict` |
| Playwright | 29/29 PASS | interceptacion local; no certifica vision real |
| Simulador | 4/4 PASS | aiRIM, cinco modos, giro/background y texto XXXL |
| iPhone final | 5/6; NO-GO rendimiento | navegacion, galeria, modos, accesibilidad y giro PASS; maximo instrumentado 5.199 s supera umbral 5 s |
| Stress de giro con viewport estable | 3/3 PASS | mismo binario 70 |

La primera ejecucion de Playwright se lanzo accidentalmente contra el servidor de fixtures embebidos, incompatible con esos escenarios interceptados. Fallo una expectativa del harness; se repitio en el preview real correcto y paso 29/29.

La primera pasada fisica dio 5/6 por `Activation point invalid` al consultar hittability justo despues del cambio de orientacion. Tres repeticiones sin cambio de test dieron 2/3. Tras esperar estabilidad del viewport, los tres giros pasan. La pasada completa final corrige ese fallo de giro pero da 5/6 por arranque: maximo de cinco lanzamientos 5.199 s frente al umbral de 5 s (primera pasada: 4.370 s). No se relaja el umbral ni se repite hasta ocultar el fallo. Las evidencias iniciales y finales se conservan; el tiempo incluye overhead de automatizacion y el toque en Inicio, asi que no equivale a tiempo nativo de primer render.

VoiceOver manual completo, captura real de camara, memoria/energia bajo carga y red lenta fisica siguen sin certificarse. Arranque frio medido incluye lanzamiento y toque en Inicio, no solo tiempo de render.

## Vision Real

Modelo Anthropic `claude-sonnet-4-6`; detect v4, analyze v7, menu v6. Funciones de staging sin nuevos deploys en este segundo bloque. Las metricas de nombres son aproximadas, no verificacion independiente de productor/anada/atributos sensoriales.

| Metricas de las mismas 17 escenas de etiqueta | 69 | 70 |
| --- | ---: | ---: |
| PASS del runner | 13/17 | 14/17 |
| Nombres: precision / recall | 68.97% / 100% | 83.33% / 100% |
| Nombres coincidentes / salidas / esperados | 20 / 29 / 20 | 20 / 24 / 20 |
| Cajas: precision / recall | 69.05% / 100% | 80.56% / 100% |
| Cajas coincidentes / salidas / esperadas | 29 / 42 / 29 | 29 / 36 / 29 |
| IoU medio | 0.6775 | 0.7064 |
| Latencia media | 24.375 s | 21.529 s |
| Finalizacion / errores de consola | 17/17 / 0 | 17/17 / 0 |

Cloudy Bay vuelve a dos cajas completas en lugar de tres fragmentos; la anotacion antigua de un solo nombre penaliza la segunda botella de distinta anada. Ocho botellas de Moscatel repetido se agrupan en una referencia (P/R de nombre 1/1). Las dos escenas densas solo tienen umbrales estructurales: mas cajas no prueba identidad. Rerun real: [17 etiquetas](qa-evidence/matchrim-build69-2026-10-05/labels-after70.json).

Los errores de nombre restantes incluyen Valverde parcial y lecturas del fondo de `commons-32980703`, cuya anotacion solo cubre la botella principal. No se elimina el ground truth original para mejorar resultados. La mejora observada no demuestra causalidad estadistica en un proveedor no determinista.

## Negativos Y Anotaciones

Se probaron cinco escenas publicas adicionales: cuatro devolvieron cero referencias y cero identidades de alta confianza. La quinta devolvio 17 vinos, por lo que el informe bruto marca 4/5, con 17 falsos positivos segun la anotacion original.

La inspeccion visual independiente confirma que `commons-150250375` NO es un negativo: contiene 17 vinos legibles junto a cocktails, destilados y bebidas. El [addendum de revision](../qa/ground-truth/matchrim-pilot-review-addendum-2026-10-05.json) conserva hash y 17 referencias transcritas de la imagen, sin usar la salida del modelo como verdad. No modifica el corpus ni el informe bruto. Los cuatro negativos validos pasan 4/4; la escena mixta exige evaluar identidad, moneda y exclusion de otras bebidas aparte. Son 30 escenas distintas visitadas en este cierre, no 30 escenas canonicas plenamente anotadas.

En esta escena mixta se confirma un defecto real: los precios impresos en GBP se muestran con simbolo EUR. **P0 abierto de moneda/valor y presupuesto**. No se afirma que 17 nombres correctos certifiquen precios ni maridajes.

## Evidencias Y Reproduccion

- [Manifest del candidato 70](qa-evidence/matchrim-build69-2026-10-05/artifact70-manifest.json)
- [Cliente 29/29](qa-evidence/matchrim-build69-2026-10-05/client70-results.json)
- [Simulador 4/4](qa-evidence/matchrim-build69-2026-10-05/simulator70-summary.json)
- [iPhone final 5/6, arranque fallido](qa-evidence/matchrim-build69-2026-10-05/iphone70-final-summary.json)
- [Giro estable 3/3](qa-evidence/matchrim-build69-2026-10-05/iphone70-stable-rotation-summary.json)
- [Primera pasada fisica fallida](qa-evidence/matchrim-build69-2026-10-05/iphone70-initial-summary.json)
- [Stress de giro inicial 2/3](qa-evidence/matchrim-build69-2026-10-05/iphone70-rotation-initial-summary.json)
- [aiRIM en el menu principal del iPhone 70](qa-evidence/matchrim-build69-2026-10-05/iphone70-airim.png)
- [Cloudy Bay: dos regiones](qa-evidence/matchrim-build69-2026-10-05/labels70-cloudy-bay.png)
- [Moscatel repetido agrupado](qa-evidence/matchrim-build69-2026-10-05/labels70-duplicate-moscatel.png)
- [Caso mixto y defecto de moneda](qa-evidence/matchrim-build69-2026-10-05/mixed-menu70-currency-defect.png)
- [Negativos: informe bruto](qa-evidence/matchrim-build69-2026-10-05/negative-menus70-raw.json)

Paquete firmado local: `/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim70/Matchrim70-staging.zip`. Fuera de Git y no instalable por TestFlight sin archive/firma de distribucion. SHA-256 `62d7c8fdecf6dcb6d872dacf76ad39a2818352327b6d7ad1603d0623310b1ba5`. Se extrajo en `/private/tmp` y paso `codesign --verify --deep --strict`; el ejecutable y todos los assets web coinciden con el manifest. El ZIP es el artefacto de referencia: la copia `.app` suelta en Documents recibe metadatos FinderInfo del sincronizador y no debe usarse como paquete verificado.

Al terminar se restauro y abrio la version original 1.0 (68), comprobada por `devicectl`. No se dejo staging en el iPhone ni se desinstalo la app ni se borraron datos. [Evidencia de restauracion](qa-evidence/matchrim-build69-2026-10-05/iphone70-restoration.json). Las capturas de fotos privadas y del selector de galeria permanecen locales, fuera del commit.

Reproduccion: ejecutar el builder de staging documentado en el baseline y compilar con `CURRENT_PROJECT_VERSION=70`. Para vision, usar `qa-matchrim-ground-truth.py --mode etiqueta --max-scenes 17` y `--capture-kind food_menu_negative --max-scenes 5` sobre el mismo `materialization-report.json`; timeout 300000 ms y Playwright disponible. No usar produccion ni repetir fotos privadas sin consentimiento especifico para staging.

## Residual Y Gate

P0 internos: identidad parcial/fragmentos residuales y confianza canonica; pizarras que parten una misma fila al recortar columnas; moneda GBP/EUR; latencia de cartas densas; anotacion exhaustiva por botella/anada y validacion de precio/servicio. Gate de rendimiento abierto: medir arranque sin overhead de XCTest y resolver la variabilidad observada. No estan bloqueados por Apple y no se describen como terminados.

Gates externos: produccion mantiene 403 administrativo de Supabase; la repeticion de las cinco fotos privadas en staging esta pendiente del consentimiento especifico solicitado por auto-review. No hay bloqueo de cuota del proveedor en estas pasadas publicas.

El push fue detenido por auto-review por la publicacion de metadatos internos de QA. `gh repo view` confirma que `goiko111/matchrim-wine-sense` es **publico** y que la cuenta dispone de permiso ADMIN. Se solicito al usuario elegir entre publicar solo codigo o tambien las evidencias no sensibles. Hasta recibir esa decision, los commits quedan locales; no se cambio la visibilidad del repositorio ni se intento un canal alternativo. Fotos privadas y claves no forman parte de los commits.

TestFlight requiere cerrar los P0, validar runtime productivo equivalente, confirmar canal/cuenta/firma de distribucion y probar el archive exacto. El estudio de 100 cuentas sinteticas valida aislamiento y coherencia funcional, no satisface por si solo el gate de recomendacion humana.
