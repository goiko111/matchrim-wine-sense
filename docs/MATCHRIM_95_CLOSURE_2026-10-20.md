# Matchrim 95: beta privada y QA del 20 de octubre

**Disponible en TestFlight:** 1.0 (95), `wine.matchrim.app`. Apple acepto una unica subida a las05:48:35UTC; lectura visual posterior confirma procesamiento Finalizado y En pruebas en Testers Matchrim, dos testers. Notas de prueba en espanol guardadas. Sin publicar web/App Store ni crear enlace publico, usuarios o permisos.

El propietario autorizo expresamente esta beta con las dos incidencias conocidas indicadas abajo. No es una declaracion de QA global verde. Fuente del binario: `788165096e8573e73c8217f62d725e229510a608`; cualquier commit posterior de este cierre solo documenta el resultado.

## Cambios entregados

- `fb8ab80`: contrato nativo de evidencia visual, aislamiento del perfil respecto al OCR y diagnostico seguro de Food.
- `e9a2159`: acciones de cabecera de carta apiladas y contenidas en movil.
- `7881650`: deduplicacion nativa de platos por procedencia, geometria y secciones corroboradas; no fusion transitiva ni perdida de porciones/precios. Caso real TOP/BOTTOM:19 filas ->15, cuatro duplicados eliminados.
- La afinidad nativa ya usa explicacion cotidiana y detalle opcional, separada de identidad/confianza. Sin ficha sensorial verificada no inventa un porcentaje. Confirmar nombre no acredita una ficha; busqueda/correccion siguen explicitas.
- El archivo protegido `supabase/functions/search-wines/index.ts` permanece exacto respecto a `ebee038`.

## Matriz de resultados

| Prueba | Esperado / resultado | Limite |
|---|---|---|
|14 grupos locales, typecheck, lint, build |14/14 PASS;0 errores;106 warnings heredados | No prueba de vision real |
|50 perfiles sinteticos historicos |1000 respuestas,34 vectores; recalculo actual250/250 rasgos iguales | No50 humanos ni nuevo UIKit50; no gusto predictivo |
|Carta7548 real desde Fotos en UIKit |1/1 PASS81.316s;4HTTP200;8/8 nombres,16/16 precios y servicios | Ocho nombres legibles, cuatro entradas cortadas omitidas; GT agente postresultado, no ciego |
|Replay de esas cuatro respuestas actuales |4/4 vistas;308/308 controles;8 filas/16 precios, cancelacion y reintento humano | Chromium/CSS200, no UIKitMAX; sin nueva API |
|Food TOP/BOTTOM reales + union actual |11+8 filas ->15;4 duplicados; porciones y42BOTTOM conservados | Lectura parcial; Caesar mantiene variantes sin recomendacion inventada |
|Food interfaz actual |4/4 vistas;272/272 controles | Respuestas reales grabadas;16 POST mock, no nuevo E2E Food |
|Core nativo actual |10PASS/1FAIL; dos seguimientos sin reproduccion del teclado | FAIL original conservado; causa no demostrada |
|Firma/distribucion95 |188 controles PASS;157 recursos exactos; IDs de App/frameworks unicos | Warning Apple90068: elevar iOS14 a15 antes de abril2027 |

Latencias individuales de carta en el flujo real: FULL47.538s, right-focus6.422s, TOP20.443s, BOTTOM28.822s. No se suman como latencia de usuario ni se promedian con otros tipos de imagen. El flujo81.316s incluye navegacion y Fotos. Right-focus se abstiene: no hay nombres completos en ese recorte.

El resultado mostrado conserva ocho referencias por confirmar y afinidad pendiente; el perfil es local sintetico33333 y la vision real PUBLIC_ONLY. El catalogo externo estaba bloqueado deliberadamente en ese banco: no se acredita ausencia de fichas, enlace canonico ni afinidad de produccion. Los ocho vinos no se presentan como verificados.

## Despliegue y presupuesto

Un turno correctivo Lovable, **1.7creditos**: detect-wine-regions-v72, scan-wine-menu-v72 y scan-food-pairing. Commit de despliegue`f7201cec`; restauracion frontal`130dcee6`, diff neto solo tres handlers, sin Publish. Tres pares de fuente/readback exactos; no UUID de version de funcion expuesto. Food mantiene marcadorv10; el diagnostico no demuestra reparacion de disponibilidad.

Ventana autorizada: **20/20 intentos reales consumidos,0 restantes,0 reintentos automaticos**. F08 Food completo502/55.867s permanece FAIL; el log tipado TimeoutError es compatible con el limite local55s, sin causa upstream demostrada. Los fallos de arranque del banco R5/R6 fueron anteriores a cualquier metodo UIKit/POST y permanecen separados; no suman intentos pagados.

## Incidencias aceptadas para esta beta

1. Food con foto completa puede agotar el tiempo y devolver502; los recortes respondieron200. No afirmar que este reparado.
2. Teclado puede desaparecer al rotar con texto MAX. El texto se conservo; dos seguimientos no lo reprodujeron y no prueban reparacion o frecuencia.

Autorizacion humana: `request_user_input_async/call_d726328a5fc1469d9c326f630532d394/question0`, respuesta Autorizar beta privada con incidencias. No autoriza otra llamada o despliegue ni convierte limites de catalogo/precision/gusto en PASS.

## Distribucion y evidencia

Archivo/export firmado desde produccion, bundle`wine.matchrim.app`1.0(95), no qa91live. IPA local elegible SHA`1a5872d6d5b0a72967da780ddbcbfff396ed869ee1da89ea33f0c92e40bbffce`. Xcode reempaqueto para subir: hash del paquete transmitido no observado; no se equipara al IPA local. Solo cambio la clave Distributions del Info.plist del archive, no el App, UUID,196 archivos restantes o157 recursos.

Delivery Apple`0f921c5b-aff2-48e5-b1b9-323241b61eb2`, app6778803146. El tester solicitado ya pertenecia al mismo grupo interno y tenia94 instalada;95 se asigno automaticamente a ambos. No duplicar invitacion ni cambiar roles. No instalacion95 en telefono observada en este bloque.

- [TestFlight95](https://appstoreconnect.apple.com/teams/d207a425-6f6f-46d3-9731-77d395f34036/apps/6778803146/testflight/ios/0f921c5b-aff2-48e5-b1b9-323241b61eb2).
- [Prueba visual En pruebas](/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim95-closure-20261018/APPLE_TESTFLIGHT_95_EN_PRUEBAS.png).
- [Lectura real y limites](/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim95-closure-20261018/evaluation-E/live-F09-F12-actual-r1/HANDOFF.md).
- [Cuatro vistas actuales](/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim95-closure-20261018/label-C/menu-f09-f12-replay788-r1/HANDOFF.md).
- [50 perfiles y respuestas](/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim95-closure-20261018/NATIVE50_RESULTADOS_PERFILES.md).
- [Subida y limpieza final](/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim95-closure-20261018/native-D/testflight95-upload788-r1/ADDITIVE-UPLOAD-CLOSURE.json).
