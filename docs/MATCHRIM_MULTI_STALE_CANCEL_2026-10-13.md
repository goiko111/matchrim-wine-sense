# Matchrim: intento multietiqueta antiguo no cancela el nuevo (16)

## Resultado Y Alcance

P1 confirmado sobre baseline `9fa4fca45b08cf2aec11098446806c2c5e7b2aed`: A estaba leyendo regiones con tres lookups pendientes; Cancelar A recuperaba la interfaz correctamente. Tras Cerrar analisis y volver a elegir el mismo archivo, B alcanzaba la misma fase. Al liberar el catalogo antiguo de A, su catch publicaba `cancelled` sobre B: desaparecian Cancelar y la barra, aunque sus regiones y solicitudes seguian activas.

Parche minimo: una condicion `abortRef.current === controller` antes de `setPhase('cancelled')` en el catch AbortError de startScan. No se introduce wrapper de espera, estado, helper o listener nuevo. No se traslada el arreglo15: cancelScan ya recuperaba inmediatamente. Carta, helper15, SDK, busqueda, budget, concurrencia, recortes, deteccion, matching, identidad, afinidad, perfil, guardado y estilos permanecen intactos.

## Antes Y Despues

| Before | After | Why |
| --- | --- | --- |
| A cancela y permite cerrar/elegir otra vez mientras su catalogo sigue pendiente. | Sigue recuperando por los controles reales, sin esperar al catalogo. | No alterar la cancelacion inmediata que ya funcionaba. |
| A200 vacio o A503 tardio publica cancelado sobre B activo. | El publicador exige el controlador actual; B conserva su fase, Cancelar y progreso. | Solo el analisis propietario puede actualizar su estado. |
| B muestra cancelado aunque sus pins siguen analizando y su red sigue activa. | Fase, pins, candidatos, progress y notice permanecen coherentes al liberar A. | Evitar informacion contradictoria y perdida del control de cancelacion. |
| El catalogo antiguo continua en segundo plano. | Continua igual y su resultado/error termina consumido por el flujo existente. | No hay cancelacion de proveedor, devolucion de cuota ni ahorro demostrado. |

## Matriz Expected/Actual

| Prueba | Expected | Actual |
| --- | --- | --- |
| Teclado portrait393x852 / toque landscape852x393 | Reproducir por DOM antes de producto y revalidar mismo flujo. | Baseline corregido22/24; despues2/2 rutas24/24 checks. |
| Cancelar A en analyzing/catalog retenido | Recuperacion inmediata sin liberar sus solicitudes. | Cancelled, Cerrar analisis disponible, Cancelar/barra fuera, tres lookups aun retenidos; ningun requestfailed. |
| Cerrar analisis y Elegir de galeria | Input limpio por producto, FileChooser real, mismo path/archivo. | Dos selecciones por ruta iguales: JPEG1041114bytes,lastModified1791448775318; sin rename/resetJS/newFile/eventdispatch. |
| Liberar A con B analyzing y su catalogo retenido | No pisar phase/loader/progress/notice/regiones/candidatos de B. | 200 vacio portrait /503 landscape: B intacto durante1400ms. |
| Terminar B por sus propias respuestas | Ready y controles coherentes, sin resultados de A. | 5regiones,4analizadas,1poor deferred,3referencias agrupadas. Target del indicador100%, phase ready. |
| Plan real de solicitudes | Descubrir y conservar, no imponer plan de carta. | Por intento1detect/4analyze/3search/1GETperfilnull; total por ruta2/8/6/2. Concurrencia observada3, sin refinamiento/reintento. |
| Inputs, crop/query y payloads | Antes/despues byte-hashes y argumentos iguales. | 16requests de funciones por ruta comparados orden-insensiblemente: cuerpo/crop/imagehash/endpoint/query iguales. Payloads MULTI completos iguales en todos los stages. |
| Controladores y regresion | Actual cancela; obsoleto/null/diferente no publica. Resto igual. | 47/47 comprobaciones de actores privados, AST completo, consumers, effects/cleanup y fuentes protegidas. |
| Typecheck/lint de alcance | Sin errores nuevos. | Ambos exit0; comandos y stdout/stderr guardados. |
| Consola y seguridad | Sin errores inesperados ni egress/escrituras. | Sin pageerror/requestfailed. Landscape conserva3warnings del helper y3recursos503 esperados; portrait sin diagnosticos.0RESTwrites/remotoapp/provider/paid/cuentasreales. |
| Protecciones anteriores | Conservar01-15 y corpus sin repetir suites. | 40fuentes/4entradas de corpus-procedencia y1363evidencias05-15 intactas. No suites verdes anteriores ejecutadas. |

## Corpus Y Procedencia

Imagen existente `qa-fixtures/food-menu/commons-restaurant-menu-2026-08-25-2000.jpg`, SHA `9980c5e6b9d5e52f1783e2f26d1a97e22c0c2e1556e9e72919dd26fc34ece9a9`. Ground-truth SHA `2bc521b8f9dc6a426699ea34c29d3a7230716146922d19a9d9499234d68fafd0` conserva CC0 1.0, Caspardergeist, URL Commons y anotacion original de platos. No se descargo, transformo en archivo derivado ni reanoto. Es menu de comida, solo canario de preprocessing/crop/lifecycle, no foto de cinco botellas ni ground-truth de vinos.

Respuestas exactas de candidate()/function_response() en `scripts/qa-multi-wine-ui.py`, SHA `f2aa2924e48c8c2f6f0cbe45011e6ef92bda3cb17be14a645659b70a0343ae40`. Se extraen exclusivamente esos FunctionDef mediante AST, sin importar entrypoint, materializar fixtures o ejecutar suites. Payloads completos en cada stage, SHA `883e66d2b5c3009115308bbf5fe0e088a73a6fcc940638048a53a45bdf209bd6`. Campos del request y hashes completos de body/dataURL/crops retenidos sin claves ni headers.

Fixtureflagfalse: deteccion/analisis reales del cliente alcanzan los stubs de red y tres lookups canonicos, no bypass embedded. Perfil GETnull, canonica vacia, afinidad pendiente; los nombres/confianzas/atributos del corpus no son identidades canonicas ni preferencias aprendidas. El normalizer ordena y regenera IDs; las respuestas existentes se mantienen por region_id sin inventar evidencia para ajustar el contenido de la foto.

## Evidencia Y Limites

[Paquete local](</Users/GOIKO/2matchrim76-recognition-20261008/docs/qa-evidence/matchrim-multi-stale-cancel-2026-10-13/primary.json>):149entradasSHA,40PNG,44snapshots finales y41baseline. `source-stages.json` enlaza baseline, hashes antes/despues, contrato, corpus y protecciones. `verification.json` conserva ejecuciones. Scanner antes `4c9111299961a45670dc3628a58e42af5f9a4f091ffdfac9403a1028b6034e11`; despues `67574e822d8f78d440422c285f9b5e217ec24e76e0adf899563234f55430e172`.

149entradas/44fuentes/4entradascorpus comprobadas contra index antes de commit. Diff-check codigo/scripts/informe pasa; global conserva62avisos de whitespace previo solamente en snapshots exactos. No limpieza ajena ni cambio de sus bytes/hashes.

Transparencia del harness: before20/24 incluye dos falsos negativos por asumir aria-valuenow100; before-complete20/24 corrige target visual, pero compara keysint Python con keysstr del JSON de contadores. Ambos se conservan. Before-final sobre producto intacto22/24 solo falla la carrera2/2. Snapshot final del harness corresponde a before-final/after, no reconstruye scripts iniciales.

Capturas revisadas antes/despues en ambas orientaciones; controles del alcance legibles y sin desbordamiento horizontal al terminar. La captura inmediata ready puede mostrar transicion de la barra aun en curso, aunque su target inline sea100%; no se vende como comprobacion pixel100% ni latencia de reconocimiento. El tiempo local incluye retencion deliberada de stubs.

HTTP/WS interceptados antes de fakeauth/navegar, SWblock/analyticsfalse, contextos privados Chromeheadless. FileChooser estandar por path tras reset del producto, no selectorOS/iOS, camara, permisos, DynamicType o VoiceOver. No hardware, proveedor real, precision/recall, estudio de personas o E2E de produccion. No unmount/owner matrix ampliada: effects/cleanup protegidos, parche solo publicador actual.

## Reproduccion Y Residual

Desde el repo, con runtime existente y salida nueva:

```bash
/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim73-qa-20261007/.venv/bin/python /Users/GOIKO/.codex/skills/webapp-testing/scripts/with_server.py --server "VITE_MATCHRIM_QA_FIXTURES=false VITE_APP_ANALYTICS_ENABLED=false npm run dev -- --host 127.0.0.1 --port 4463 --strictPort" --port 4463 -- /Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim73-qa-20261007/.venv/bin/python scripts/qa-matchrim-multi-stale-cancel-oct13.py --output /tmp/matchrim-multi-stale-local --baseline-results docs/qa-evidence/matchrim-multi-stale-cancel-2026-10-13/before-final/results.json
```

Hallazgo nuevo separado, no implementado: Progress compartido consume value para el indicador, pero no lo pasa a Radix Root; DOM aria-valuenow esnull tanto en42%target pendiente como en100%target ready. Evidencia source/DOM retenida, candidato para QA de accesibilidad focalizado; no afirmar fallo de lector fisico. No abrir PDF aparcado ni ampliar actividad por relleno.

Sin build web/nativo, push, deploy, SDKdownloads, Apple, telefono, TestFlight, contactos, subidas o gasto. La invitacion previa conserva su gate independiente y no se opera en16. Entrega local para revision, no cierre global del producto.
