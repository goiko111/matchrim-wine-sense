# Matchrim: rendimiento y resiliencia multietiqueta

Fecha: 27 de agosto de 2026.

Estado: **bloque de cliente cerrado; sin deploy de funciones ni TestFlight**.

## Alcance implementado

- Concurrencia adaptativa entre 2 y 5 regiones: 5 para escenas de 20 o mas objetos, 4 para 8-19 y 3 para escenas pequenas.
- Reduccion automatica a 2 en `saveData`/2G y a 3 en 3G.
- Priorizacion de regiones legibles y con mejor confianza para obtener antes resultados utiles, conservando el orden visual original en la lista final.
- Retry solo para red, `408`, `425`, `429` y `5xx`; un `4xx` no se repite.
- Respeto de `Retry-After`, backoff exponencial acotado y cancelacion efectiva durante la espera.
- Un segundo intento para deteccion y hasta tres intentos por region. El canario encontro y acoto un JSON truncado real del detector.
- Errores tecnicos `5xx` convertidos en mensaje accionable, conservando la foto.
- Metricas de calidad, deteccion, analisis, total, concurrencia y reintentos enviadas a analytics; resumen total visible al terminar.

La politica usa el estado HTTP y `sb-error-code` cuando esta disponible. No reintenta identidades `unreadable`: esas son respuestas validas, no errores.

## Canarios reales

Comparacion contra las mismas variantes de `e2e-v3-fridge-full`. Las llamadas no se interceptaron y usaron `matchrim-region-detector-v3` y `matchrim-region-analysis-v3-grounded`.

| Escena | v3 / 3 workers | Nueva / 5 workers | Cambio | Regiones | Identificadas | Alta confianza | Fallos finales | Estado |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| original | 60,216 s | 45,902 s | -23,8% | 30 | 23 | 9 | 0 | PASS |
| baja luz | 53,706 s | 36,274 s | -32,5% | 30 | 20 | 3 | 0 | PASS |
| ilegible | 30,263 s | 24,899 s | -17,7% | 30 | 0 | 0 | 0 | PASS abstencion |

Total de las tres muestras: `144,185 s -> 107,075 s`, mejora agregada `25,7%`.

Estas cifras prueban la mejora de orquestacion en estas ejecuciones, no un benchmark determinista del modelo. Los candidatos pueden variar entre pasadas. Los invariantes que si se exigen son regiones completas, cero fallos finales, cero identidad de alta confianza en ilegible, consola limpia y ausencia de overflow.

Durante el primer canario de baja luz, el detector devolvio JSON truncado y HTTP 500. Antes del cambio el flujo termino en error a los `20,770 s`; la politica nueva repitio de forma acotada y la escena siguiente paso completa. El test Playwright reproduce este caso sin depender del modelo.

## QA reproducible

| Gate | Resultado |
| --- | --- |
| Pruebas puras | PASS, incluida concurrencia 2-5, prioridad, retry y aborto |
| TypeScript | PASS |
| ESLint del cambio | PASS |
| Build web | PASS, 3.596 modulos |
| Playwright movil/funcional | PASS 18/18 |
| Retry detector `503` | 2 llamadas, recuperado |
| Retry region `503` | 2 llamadas, recuperado |
| Region `400` | 1 llamada, no retry |
| Cancelacion en `Retry-After: 10` | 1 llamada, sin segunda peticion |
| Vitrina original real | PASS 30/30, 45,902 s |
| Vitrina baja luz real | PASS 30/30, 36,274 s |
| Vitrina ilegible real | PASS 30/30, 0 candidatos, 24,899 s |
| Xcode Debug Simulator | BUILD SUCCEEDED, Matchrim 1.0 (58) local |
| Lanzamiento iPhone 16 Pro Simulator | PASS retrato, safe area correcta |

## Evidencias

- `qa-artifacts/2026-08-27-performance-remediation/ui-qa-results.json`
- `qa-artifacts/2026-08-27-performance-remediation/multi-label-retry-policy-mobile.png`
- `qa-artifacts/2026-08-27-performance-remediation/simulator-performance-build-portrait.png`
- `qa-artifacts/matchrim-ground-truth-v1/e2e-v4-performance-original/ground-truth-e2e-report.json`
- `qa-artifacts/matchrim-ground-truth-v1/e2e-v4-performance-low-light-retry/ground-truth-e2e-report.json`
- `qa-artifacts/matchrim-ground-truth-v1/e2e-v4-performance-illegible/ground-truth-e2e-report.json`
- Build: `qa-artifacts/derived-data-performance/Build/Products/Debug-iphonesimulator/App.app`.

## Limites y siguiente gate

- La latencia de 30 regiones sigue siendo alta para uso frecuente. El presupuesto provisional queda en `<=60 s` para una vitrina de 30 regiones, con objetivo siguiente de `<=35 s` mediante batching/orquestacion server-side o un modelo de OCR especializado.
- La precision de deteccion de vitrina sigue sin poder calcularse hasta anotar cajas exhaustivas.
- El iPhone fisico sigue fuera de este bloque; no se sustituye por el simulador.
- El build publico permanece en 58. Estos cambios requieren build 59 solo despues de cerrar dataset, iPhone fisico y autorizacion.

