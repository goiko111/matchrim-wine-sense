# Matchrim P0 - informe de QA

Fecha: 2026-08-15

Actualizacion final 2026-08-26: este documento conserva la evidencia fisica del build 57. El bloqueo de backend ya fue resuelto; el cierre vigente esta en `docs/MATCHRIM_P0_REMEDIATION_2026-08-26.md` y Matchrim 1.0 (58) fue subido correctamente a TestFlight.

Repositorio operativo: `/Users/GOIKO/Documents/Playground/matchrim-publish-20260713`

Dispositivo: iPhone 16 Pro Max `Goiko`, iOS 26.6, UDID `00008140-000A3D8A01E8801C`

Aplicacion: Matchrim 1.0, build 57 de desarrollo (build previo instalado: 56)

## Veredicto

Este veredicto describe el baseline del 15 de agosto. El cliente P0, el contrato de vision por regiones y las vistas de resultados estaban implementados y verificados. El recorrido fisico real llegaba desde seleccion de la foto hasta la llamada al backend, conservaba la imagen al fallar y ofrecia un reintento accionable.

El NO-GO de aquel dia queda superado: el canal integrado de Lovable desplego las tres funciones exactas, el E2E real paso 5/5 materiales y App Store Connect acepto el build 58 para procesamiento. La cuenta directa de Supabase sigue sin permisos de gestion sobre `cbjynrbvrhcmpaojmqdp`, pero ya no bloquea el servicio desplegado.

## Expected / actual

| Caso | Expected | Actual | Estado |
| --- | --- | --- | --- |
| Primer inicio y reapertura | La app inicia sin bloqueo y permite entrar al escaner | Inicio fisico en 2,5-3,1 s; reapertura y navegacion al hub correctas | PASS |
| Camara | Permiso y visor nativo utilizables | Visor fisico abierto, controles y cierre accesibles; no se tomo una foto nueva | PASS |
| Galeria privada | Elegir una foto sin acceso global a la fototeca | PHPicker nativo muestra acceso privado y devuelve el elemento seleccionado | PASS |
| Foto real `IMG_7605 2.jpg` | Normalizar, evaluar calidad y analizar | Preview exacto cargado; 1,6 MP, brillo 91, contraste 67; llega al limite de backend y conserva la foto | PASS parcial |
| Cuatro HEIC reales | Decodificar cartas/pizarra, respetar estructura y viewport | Los cuatro se convierten y recorren la UI con respuestas de contrato simuladas; tres viewports adicionales sin overflow | PASS de cliente |
| Reconocimiento multietiqueta real | Detectar regiones y resolver candidatos reales | Edge Functions no desplegadas por permisos; no hay resultado AI real verificable | BLOCKED |
| Multietiqueta de contrato | Regiones independientes, duplicados, dudas y top candidatos | 3 regiones, 2 referencias, duplicado agrupado y candidato dudoso visibles | PASS |
| Carta no amontonada | Pines numericos y lista sincronizada | Sin textos largos sobre imagen; zoom, filtro, lista y drawer sincronizados | PASS |
| Afinidad explicada | Score, confianza, dimensiones, señales y limites | Desglose ponderado, coincidencias, fricciones, aventura, fuentes, faltantes y feedback | PASS |
| Retrato | Controles y drawers dentro del viewport | Sin overflow horizontal a 430 x 932 | PASS |
| Paisaje | Acciones visibles y pulsables | Fallo inicial detectado; orientaciones y layout compacto corregidos; 956 x 440 fisico correcto | PASS tras correccion |
| Dynamic Type | Sin solapamiento a tamaño de accesibilidad | Lanzamiento con categoria XXXL; controles visibles y pulsables | PASS visual parcial |
| VoiceOver basico | Controles principales con nombres utiles | Arbol de accesibilidad expone modos, camara, galeria, regiones, error y reintento | PASS semantico parcial |
| Sin red | Mensaje util, preview conservado y reintento | Validado en Playwright offline; no se desactivo la conectividad personal del iPhone | PASS de cliente |
| Cancelacion | Detener las fases en curso | `AbortController` conectado a deteccion, regiones y carta; falta recorrido fisico con backend real | PASS tecnico parcial |
| Memoria | Capturar una muestra del proceso real | Traza Allocations de 11,14 s sobre PID 13122, sin caida; no se obtuvo una cifra fiable de pico desde el export CLI | PASS de evidencia |

## Pruebas automatizadas

- `npx tsc --noEmit`: pasa.
- `npm test`: clasificador V4.1, aprendizaje Matchrim y contrato multivino pasan.
- `npm run build`: pasa; queda el aviso existente de chunks mayores de 500 kB.
- `npm run lint`: cero errores y 108 avisos no bloqueantes del repositorio.
- Playwright: 11/11 casos pasan, incluidos los cinco materiales reales, retrato/paisaje, offline, filtros, zoom, drawers y ausencia de errores de consola.
- Xcode: build Debug firmado para dispositivo pasa; instalacion y lanzamiento por `devicectl` pasan.

## Evidencias seleccionadas

- `docs/qa-evidence/matchrim-p0-2026-08-15/ui-qa-results.json`
- `docs/qa-evidence/matchrim-p0-2026-08-15/multi-label-summary-mobile.png`
- `docs/qa-evidence/matchrim-p0-2026-08-15/multi-label-detail-mobile.png`
- `docs/qa-evidence/matchrim-p0-2026-08-15/wine-menu-dual-desktop.png`
- `docs/qa-evidence/matchrim-p0-2026-08-15/iphone-57-scan-hub.png`
- `docs/qa-evidence/matchrim-p0-2026-08-15/iphone-57-label-landscape.png`
- `docs/qa-evidence/matchrim-p0-2026-08-15/iphone-57-private-photo-picker.png`
- `docs/qa-evidence/matchrim-p0-2026-08-15/iphone-57-real-fixture-preview.png`
- `docs/qa-evidence/matchrim-p0-2026-08-15/iphone-57-real-fixture-backend-error.png`
- `qa-artifacts/2026-08-15-matchrim-p0/device-allocations.trace`
- `docs/qa-evidence/matchrim-p0-2026-08-15/iphone-landscape-before-fix.mp4` (diagnostico anterior a la correccion; la evidencia final es la captura de paisaje)

## Limitaciones reales

1. Falta desplegar `detect-wine-regions`, `analyze-wine-region` y la version actualizada de `scan-wine-menu`.
2. Solo `IMG_7605 2.jpg` se selecciono de forma exacta en el iPhone; los otros cuatro materiales se validaron en el cliente web con el contrato AI simulado, no como reconocimiento real.
3. VoiceOver se valido mediante semantica y arbol de accesibilidad, no con un recorrido hablado completo.
4. Dynamic Type se valido visualmente con argumento de lanzamiento XXXL; queda pendiente una matriz completa desde Ajustes.
5. La prueba offline fisica no se hizo para no cambiar Wi-Fi/datos del usuario.
6. El video disponible documenta el fallo de paisaje que condujo a la correccion. La comprobacion final en paisaje queda documentada con captura y resultado XCUITest.

## Puerta de TestFlight historica

Los pasos siguientes eran la puerta abierta el 15 de agosto. Despliegue, E2E de cinco materiales, archive y subida quedaron completados el 26 de agosto; solo permanecen las limitaciones explicitadas en el informe final.

1. Conceder permiso de despliegue de Edge Functions en `cbjynrbvrhcmpaojmqdp`.
2. Desplegar las tres funciones y verificar secretos/modelo, limites, logs y privacidad de imagenes.
3. Repetir los cinco materiales en el iPhone con resultados reales y guardar expected/actual por region, latencia por fase y uso de memoria durante analisis.
4. Corregir cualquier falso positivo o solapamiento y repetir accesibilidad/cancelacion/red lenta.
5. Archivar y subir build 57 si el numero sigue libre; en caso contrario, incrementar a 58.
