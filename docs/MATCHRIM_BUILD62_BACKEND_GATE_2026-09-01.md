# Matchrim build 62 - gate interno de backend

Fecha: 2026-09-01

Rama: `codex/matchrim-build61-hotfix-qa-20260901`

Base de cliente: `7192a28` sobre `Matchrim 1.0 (61)`

Dataset: `matchrim-ground-truth-v1`, cinco escenas originales aportadas por el usuario

## Decision

`NO-GO` para generar, firmar o subir el build 62.

El cliente completo las cinco ejecuciones, no produjo errores de consola ni falsos positivos contra el ground truth y mantuvo las versiones de backend esperadas. Sin embargo, una de las cuatro cartas perdio seis referencias respecto al baseline y solo recupero 9 de las 16 esperadas. El recall micro de cartas bajo de `0.9643` a `0.8750`, por debajo del gate interno de `0.90`.

No se ha incrementado el build, firmado, desplegado ni subido nada a TestFlight.

## Matriz expected/actual

| Escena | Expected | Actual fresco | Precision | Recall | Baseline | Deriva | Estado |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Vitrina multibotella | >=12 regiones; >=6 alta confianza | 30 regiones; 7 alta confianza | No exhaustiva | 1.00 sobre cap; 0.60 absoluta | 30; 10 alta confianza | 0 regiones; -3 alta confianza | PASS |
| `IMG_7547 2` | 16 vinos | 9 | 1.000 | 0.562 | 15 | -6 | FAIL |
| `IMG_7548 2` | 8 vinos | 8 | 1.000 | 1.000 | 8 | 0 | PASS |
| `IMG_7552 2` | 13 vinos | 13 | 1.000 | 1.000 | 13 | 0 | PASS |
| `IMG_7553 2` | 19 vinos | 19 | 1.000 | 1.000 | 18 | +1 | PASS |

Totales de las cuatro cartas: `49/56` identidades, precision `1.0000`, recall `0.8750`, cero falsos positivos y siete omisiones.

Las siete referencias omitidas en `IMG_7547 2` fueron Laurent Perrier La Cuvee, Laurent Perrier Ultra Brut, Laurent Perrier Rose, Gaudensius blanco, Barbaresco Marchesi di Barolo, Costa di Rose y La Rosa. La funcion marco la cobertura como completa tras extraer ocho vinos, lo que confirma que el fallo esta en la cobertura del OCR/backend y no en el render del cliente.

## Estabilidad

La comparacion usa la ejecucion build 61 ya archivada como baseline y el mismo algoritmo de matching de nombres del runner E2E.

| Metrica | Resultado | Gate | Estado |
| --- | ---: | ---: | --- |
| Precision de identidad entre runs | 0.9796 | >=0.90 | PASS |
| Recall de identidad entre runs | 0.8889 | >=0.85 | PASS |
| Maxima deriva de resultados por carta | 6 | <=2 | FAIL |
| Pass rate fresco | 0.80 | 1.00 | FAIL |
| Recall micro fresco | 0.8750 | >=0.90 | FAIL |
| Escenas con errores de consola | 0 | 0 | PASS |

La vitrina mantuvo 30 resultados y una latencia practicamente identica, pero solo 8 de las 19 identidades del baseline encontraron un equivalente en la pasada fresca. Ese solapamiento no se usa como precision exhaustiva porque el ground truth de la vitrina solo anota conteo y umbrales, pero confirma variabilidad relevante en la identidad sugerida.

## Backend observado

La pasada fresca uso exclusivamente las funciones desplegadas actuales:

- `matchrim-region-detector-v3`
- `matchrim-region-analysis-v3-grounded`
- `scan-wine-menu-2026-08-26-grounded-v3`

Las fuentes locales siguen declarando los candidatos `matchrim-region-detector-v4-candidate`, `matchrim-region-analysis-v4-candidate` y `scan-wine-menu-2026-08-27-regional-v4-candidate`. No se pueden certificar con este gate porque no estan desplegados y el acceso de gestion al proyecto Supabase `cbjynrbvrhcmpaojmqdp` sigue sin un canal valido tras el 403 ya documentado. Este informe certifica el backend que consumiria hoy el build 62, no el v4 local.

## Rendimiento y evidencia visual

| Escena | Latencia fresca | Ratio frente al baseline |
| --- | ---: | ---: |
| Vitrina multibotella | 53.497 s | 1.002x |
| `IMG_7547 2` | 28.037 s | 0.735x |
| `IMG_7548 2` | 23.055 s | 1.241x |
| `IMG_7552 2` | 32.526 s | 0.999x |
| `IMG_7553 2` | 39.059 s | 1.009x |

Media `35.235 s`, mediana `32.526 s`, maximo `53.497 s`. Las cinco escenas llegaron a estado terminal, sin fallos de red ni recuperaciones transitorias.

Las capturas moviles confirman pines agrupados y numerados, lista sincronizada, una decision expandida cada vez, comparador 2-5 y ausencia de overflow horizontal. El problema de `IMG_7547 2` es visible como una lista de solo nueve vinos, coherente con el JSON y no atribuible al runner.

Evidencia versionada:

- `docs/qa-evidence/matchrim-build62-backend-gate-2026-09-01/ground-truth-e2e-report.json`
- `docs/qa-evidence/matchrim-build62-backend-gate-2026-09-01/stability-report.json`

Las cinco capturas con los materiales aportados por el usuario permanecen solo en el artefacto local ignorado por Git: `qa-artifacts/2026-09-01-build62-backend-gate/run-1/`. No se publican con el commit.

## Siguiente gate

Accion minima del propietario: habilitar un proyecto/canal Supabase de staging con permiso de despliegue para las tres Edge Functions v4 y sus secretos ya gestionados, sin exponerlos en el repositorio.

Despues se debe desplegar v4 solo en staging y repetir exactamente este comando sobre las cinco escenas. El gate exige 5/5 PASS, precision y recall micro >=0.90, deriva maxima <=2, vitrina con >=12 regiones y >=6 identificaciones de alta confianza, y cero errores de consola. Solo con ese resultado corresponde generar el build 62 firmado y pedir autorizacion explicita para TestFlight.

Progreso real: cliente y QA interna cerrados; gate total de release `94%`. El residual es backend v4 certificable en staging, smoke fisico del binario firmado y autorizacion final de TestFlight.
