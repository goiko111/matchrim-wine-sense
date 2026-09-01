# Matchrim build 61 - QA fisica y hotfix interno

Fecha: 2026-09-01

Base verificada: `5828a5f` (`Matchrim 1.0 (61)`)

Hotfix aislado: `codex/matchrim-build61-hotfix-qa-20260901`

Dispositivo: iPhone 16 Pro Max, iOS 26.6, build 61 instalado desde TestFlight

Simulador: Matchrim QA iPhone 16 Pro, iOS 26.0

## Veredicto

El build 61 es estable para apertura, permisos, camara, galeria, cancelacion, recuperacion de estado, comparador y explicacion de afinidad. El recorrido fisico encontro cuatro defectos de cliente que el hotfix corrige: contenido bajo la Dynamic Island, acciones de decision sin respuesta, expansion masiva de todas las fichas de carta y pines demasiado juntos.

El hotfix queda reproducible y verde en web y simulador, pero no se ha publicado ni convertido en build 62. El detector real del build 61 sigue cubriendo mal escenas densas: en la estanteria publica detecto 30 regiones, pero solo cubrio bien la balda superior y reconocio 5 referencias. Por tanto, el cliente esta listo para candidato; la promocion a TestFlight requiere un rerun real del backend sobre las cinco escenas y aceptar o corregir ese residual de recall.

## Black-box en iPhone

Todas las fotos usadas en esta sesion fisica fueron materiales publicos de Wikimedia Commons cargados expresamente en un album de QA. No se inspeccionaron ni exportaron fotos personales del dispositivo.

| Caso | Expected | Actual build 61 | Estado |
| --- | --- | --- | --- |
| Inicio y reapertura | Arranque estable y estado recuperable | Inicio, cierre, reapertura y background/foreground correctos | PASS |
| Privacidad | Informacion previa y consentimiento persistente | Gate visible, consentimiento obligatorio y persistencia correcta | PASS |
| Camara | Visor nativo y retorno seguro | Visor abierto; interrupcion con Home y retorno sin captura | PASS |
| Galeria | Selector privado y cancelable | PHPicker correcto; cancelacion sin perder la ruta | PASS |
| Estanteria densa | Cubrir al menos 12 referencias visibles, sin inventar | 30 regiones; 5 reconocidas, 9 dudosas, 16 sin reconocer; cobertura concentrada arriba | FAIL P0 recall |
| Varias botellas | Una identidad y score por botella, deduplicacion | 10 regiones para unas 11 botellas; 5 reconocidas, 4 dudosas, 1 sin reconocer | PASS parcial |
| Etiqueta unica | Abstencion si la identidad no es verificable | 1 region; lectura parcial `Monastrell`; sin referencia inventada | PASS |
| Pizarra manuscrita | Lista estructurada y dudas visibles | 9 entradas; estructura util, con riesgo de repetir lineas de seccion | PASS parcial |
| Carta impresa | 16 entradas sin fusionar columnas ni duplicar lineas | 16 en una pasada y 17 en otra; `PINOT NIOR` duplicado y `PROSECO` | FAIL P1 deduplicacion |
| Comparador | Seleccion entre 2 y 5 vinos | Limites y cambio usuario/servicio correctos | PASS |
| Afinidad | Explicacion trazable, no solo porcentaje | Dimensiones, fuentes, fricciones, faltantes, confianza y feedback visibles | PASS |
| Acciones de decision | Abrir el detalle del vino elegido | `Ver detalle` no abria nada | FAIL P1 |
| Fichas de carta | Expansion progresiva | Una accion renderizaba las 17 fichas, unas 50 pantallas de scroll | FAIL P1 |
| Safe area | Nada bajo status bar/Dynamic Island | Avisos y resultados invadian el area superior | FAIL P0 |
| Rotacion | Retrato y paisaje utilizables | 440x956 y 956x440 correctos | PASS |
| Accesibilidad | Nombres y objetivos tactiles suficientes | Auditoria XCUITest: 13 objetivos pequenos y 1 descripcion ausente en inicio | FAIL P1 |

## Tiempos fisicos

Los tiempos incluyen seleccion en PHPicker; entre parentesis se indica el proceso cuando pudo aislarse.

| Escena | Tiempo |
| --- | ---: |
| Etiqueta unica | 19.0 s |
| Pizarra manuscrita | 29.8 s |
| Varias botellas | 38.6 s |
| Carta impresa | 45.0 s |
| Estanteria densa | 69.3 s (aprox. 57.7 s de proceso) |

## Correcciones del hotfix

- Reserva superior comun para WebView, cabeceras y navegacion, con guard fijo sobre la safe area.
- Navegacion inferior accesible como enlaces completos de 56 px, con nombres expuestos al lector de pantalla.
- Pines de carta y multietiqueta agrupados por proximidad; el zoom reduce el umbral y permite separarlos.
- Acciones de decision conectadas al drawer sincronizado en lugar de desplazar a contenido oculto.
- Fichas de carta como acordeon controlado: solo se renderiza el vino que el usuario abre.
- Deduplicacion tolerante a OCR parcial cuando posicion, productor, precio y anada no contradicen el match.
- Textos visibles de escaneo, privacidad y afinidad corregidos en espanol.

No hay cambios en `supabase/functions`, contratos de produccion, credenciales, version de backend ni despliegues.

## Regresion automatizada

| Gate | Resultado |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm test` | PASS: clasificador, aprendizaje, contrato multivino, 30 escenas controladas y 25 fuentes Commons independientes |
| `npm run lint` | PASS con 0 errores; 107 avisos heredados |
| `npm run build` | PASS; permanece el aviso conocido de chunks grandes |
| Playwright | 27/27 PASS, sin errores de consola |
| Safe area simulada | PASS: guard de 59 px; contenido por debajo |
| Navegacion movil | PASS: cinco enlaces de 56 px con nombre accesible |
| Retrato/paisaje | PASS: 393x852, 430x932 y 932x430 sin overflow horizontal |
| Dynamic Type | PASS a 125% sin overflow ni controles inaccesibles |
| Sin red/cancelacion/retry | PASS; conserva foto, permite reintento y cancela el backoff |
| Build iOS simulador | PASS, Xcode Debug sin firma, `1.0 (61)` |
| Lanzamiento en simulador | PASS; cabecera por debajo de Dynamic Island |

## Evidencias locales

La evidencia fisica publica del build 61 esta en:

- `/Users/GOIKO/2matchrim-p0-remediation-20260826/qa-artifacts/2026-09-01-build-61-device-blackbox/`

La evidencia del hotfix esta en:

- `/Users/GOIKO/2matchrim-build61-hotfix-qa-20260901/qa-artifacts/2026-09-01-build61-hotfix/ui-qa-results.json`
- `/Users/GOIKO/2matchrim-build61-hotfix-qa-20260901/qa-artifacts/2026-09-01-build61-hotfix/privacy-safe-area-mobile.png`
- `/Users/GOIKO/2matchrim-build61-hotfix-qa-20260901/qa-artifacts/2026-09-01-build61-hotfix/multi-label-summary-mobile.png`
- `/Users/GOIKO/2matchrim-build61-hotfix-qa-20260901/qa-artifacts/2026-09-01-build61-hotfix/wine-menu-dual-desktop.png`
- `/Users/GOIKO/2matchrim-build61-hotfix-qa-20260901/qa-artifacts/2026-09-01-build61-hotfix/wine-menu-accessibility-125pct-mobile.png`
- `/Users/GOIKO/2matchrim-build61-hotfix-qa-20260901/qa-artifacts/2026-09-01-build61-hotfix/simulator-launch.png`
- `/Users/GOIKO/2matchrim-build61-hotfix-qa-20260901/qa-artifacts/2026-09-01-build61-hotfix/xcodebuild-simulator.log`

Las capturas con imagenes aportadas por el usuario permanecen ignoradas por Git y no se publican.

## Residual y puerta de TestFlight

1. Ejecutar el backend candidato sobre las cinco escenas publicas con el mismo contrato y registrar identidad expected/actual por referencia.
2. Exigir que la estanteria densa no se limite a una balda, que la carta produzca 16 referencias estables y que no reaparezcan falsos positivos OCR.
3. Si pasa, incrementar a build 62, archivar y firmar con la cuenta ya disponible.
4. Solo entonces subir a TestFlight con autorizacion explicita. Este hotfix no ha subido ningun build.

Progreso real: cliente y QA interna 100%; gate de release completo 92%. El 8% restante es reconocimiento real denso, rerun fisico del candidato firmado y autorizacion final de subida.
