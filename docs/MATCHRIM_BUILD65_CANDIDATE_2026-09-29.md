# Matchrim 1.0 (65) - TestFlight

Fecha: 2026-09-29

## Resultado

- Bundle: `wine.matchrim.app`; version `1.0`; build `65`.
- Fuente movil: rama `codex/matchrim-learning-airim-qa-20260928`.
- Web/Lovable: se mantiene en `08e12fb`; no se publico ni se modifico la web.
- Backend: no se desplegaron Edge Functions ni cambios de produccion.
- Archive exacto: `/private/tmp/Matchrim-1.0-65-final.xcarchive`.
- App Store Connect: `Upload succeeded`; el paquete quedo en procesamiento.
- Aviso no bloqueante de Apple: el deployment target iOS 14 debe subir a iOS 15 antes de abril de 2027.

## Cambios cerrados

- Reconciliacion de lectura global, regiones y crop derecho para cartas densas.
- Dedupe conservador de truncamientos OCR sin fusionar dos filas legitimas del mismo vino.
- Abstencion de identidades no corroboradas y rechazo de fragmentos genericos.
- Activacion del crop derecho cuando la cobertura es `partial` o `unknown`.
- Conservacion de precios copa/botella y servicio al fusionar observaciones.
- Presentacion de anada en la lista y trazabilidad por llamada en el runner E2E.
- Ground truth corregido para las 32 referencias realmente visibles en `IMG_7553 2.HEIC`.

## Benchmark real autorizado

Tanda final unica: `real-five-release-gate-approved`. No hubo interceptacion ni mocks. Las cuatro cartas se evaluaron con precision minima `0.90` y recall minimo `0.85`.

| Material | Resultado | Precision | Recall | Latencia | Observacion |
| --- | ---: | ---: | ---: | ---: | --- |
| Expositor multibotella | 30 regiones | n/a | n/a | 54.9 s | PASS de deteccion, grounding y score individual; sin ground truth canonico botella a botella |
| `IMG_7547 2.HEIC` | 15/16 | 1.000 | 0.938 | 39.4 s | Falta Barolo; cero falsos positivos |
| `IMG_7548 2.HEIC` | 8/8 | 1.000 | 1.000 | 23.9 s | Cero falsos positivos |
| `IMG_7552 2.HEIC` | 13/13 | 1.000 | 1.000 | 35.3 s | Cero falsos positivos |
| `IMG_7553 2.HEIC` | 31/32 | 1.000 | 0.969 | 65.1 s | Falta L'Arnaude; cero falsos positivos |

Versiones observadas: `matchrim-region-detector-v3`, `matchrim-region-analysis-v3-grounded` y `scan-wine-menu-2026-08-26-grounded-v3`.

El proveedor mostro variacion entre ejecuciones. La remediacion no relaja los umbrales: selecciona la fuente base cuando hay alto solapamiento, incorpora regiones solo si aportan cobertura neta material y descarta guesses de baja confianza no corroborados.

## Gates

| Gate | Resultado |
| --- | --- |
| Unitarios y contratos | PASS |
| TypeScript | PASS |
| ESLint | PASS: 0 errores, 105 avisos existentes |
| Build web | PASS: 3.600 modulos; aviso conocido de chunks grandes |
| Suite visual movil | PASS 27/27 |
| Safe areas y paisaje | PASS |
| Dynamic Type 125% y VoiceOver basico | PASS |
| Touch targets | PASS: >=44 px |
| Sin red, reintento y cancelacion | PASS |
| Consola | PASS: sin errores no manejados |
| Build iOS simulador Xcode 26 | PASS |
| Archive Release `1.0 (65)` | PASS |
| Upload App Store Connect | PASS |

## Perfiles QA

Los perfiles son fixtures aislados y no escriben produccion.

| Perfil | Recomendacion aprendida | Score | Muestras | Confianza |
| --- | --- | ---: | ---: | ---: |
| Explorador atlantico | Rias Baixas atlantico | 83 | 7 | 43% |
| Clasico estructurado | Rioja Reserva clasico | 81 | 3 | 25% |
| Principiante frutal | Tinto frutal ligero | 85 | 3 | 22% |

## Evidencia

- Resumen versionable: `docs/qa-evidence/matchrim-build65-mobile-2026-09-29/automated/real-five-release-summary.json`.
- UI versionable: `docs/qa-evidence/matchrim-build65-mobile-2026-09-29/automated/ui-qa-results.json`.
- Evidencia privada local: `docs/qa-evidence/matchrim-build65-mobile-2026-09-29/real-five-release-gate-approved/`.
- Archive: `/private/tmp/Matchrim-1.0-65-final.xcarchive`.
- Export/upload: `/private/tmp/Matchrim-1.0-65-upload`.

## Residual

- Apple debe terminar de procesar el build para que aparezca en TestFlight.
- El expositor aun no certifica precision canonica por botella; requiere anotacion independiente.
- Sigue abierto el QA humano final en iPhone para camara fisica, permisos y VoiceOver real.
- La cuota/permiso de gestion de Supabase sigue separado; no fue necesario desplegar funciones para este build.
