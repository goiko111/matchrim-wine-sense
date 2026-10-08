# Matchrim 77: corpus adversarial y QA funcional

Fecha: 2026-10-08. Rama: `codex/matchrim77-challenge-20261008`, basada en `8fa0084`.
Estado: candidata local, no publicada. TestFlight75 y web publicada sin cambios.

## Alcance y evidencia

Peticion: buscar imagenes que tensionen todas las funcionalidades, no solo una etiqueta facil.
Se conservan los 60 archivos publicos anteriores y las fotos privadas autorizadas del usuario.
Se incorporan 24 archivos publicos nuevos, descargados y revisados visualmente por el agente:
84 archivos publicos en total. **No son 84 escenas independientes ni 84 reconocimientos aprobados.**
El baseline incluye series de un mismo local y paginas de un mismo documento; deben agruparse antes de dividir desarrollo/evaluacion.

Proveniencia portable: `qa/ground-truth/matchrim-challenge-v4-sources.json`.
Anotaciones: `qa/ground-truth/matchrim-challenge-v4-annotations.json`.
Cada fuente conserva URL, licencia, autor cuando consta y SHA256. La fuente `commons-355816`
queda restringida a QA local hasta resolver la atribucion de autor: no redistribuir.
Las anotaciones son observaciones del agente, no validacion humana independiente.
Las escenas densas aun necesitan cajas e identidades exhaustivas; los subconjuntos legibles no permiten calcular recall total.

Raiz de evidencias local:
`/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim-challenge-20261008`.
En este documento, las rutas de evidencias relativas parten de esa raiz.

## Casos incorporados

| Familia | Ejemplos y comprobacion esperada |
| --- | --- |
| Etiqueta unica | Chateau Chamanara: conservar identidad solo si es legible, no inventar anada |
| Varias botellas | Joven Capel / Dile Moscato: separar variantes y agrupar duplicados |
| Duplicados | Tres etiquetas frontales La Quinta Mamba: una referencia, tres botellas; no identificar botellas traseras ilegibles |
| Vitrina/estanteria densa | Cinco baldas, reflejos y texto pequeno: cobertura parcial explicita, cajas y precios asociados correctamente |
| Envases inusuales | Botellas planas Garcon: detectar objetos sin inventar etiquetas negras ilegibles |
| Carta impresa | Carta historica inclinada: columnas, espirituosos y moneda historica, nunca asumir EUR |
| Carta ilustrada | Carta Thai con cuatro referencias legibles: ilustraciones de etiquetas no equivalen a inventario fisico |
| Pizarra de vino | Tienda Ontario: distinguir estilos/anadas de una identidad completa; no inventar productor |
| Pizarras de comida | Espanol, frances y chino; platos separados, salsas/guarniciones y precio del menu frente a precio individual |
| Menu denso | Barbacoa en varios paneles: precio por libra frente a precio por plato, sin fusionar filas |
| Foto de comida | Queso, pan, fruta y botella: resultado distinto segun modo plato/etiqueta |
| Negativos | Cocteles, tequila/sake, eslogan de bodega, eventos, libro cerrado y maquinaria: abstencion o categoria correcta |

Galerias: `new-sources/contact-1.jpg`, `new-sources/contact-2.jpg`, `wine-board-sources/contact-1.jpg`.
Pack materializado con hashes comprobados: `challenge-pack.json`.

## Resultado funcional y defectos

Baseline comida: 5/9 casos pasaban. Cuatro fallos reproducidos y corregidos:

1. Respuesta sin `dishes` rompia el render. Contrato Zod y error recuperable antes de guardar estado.
2. Perfil local con dimensiones null se convertia en preferencias 1/5. Se reutiliza el lector seguro compartido.
3. Porcentajes 140/-8 se mostraban al usuario. Valores no numericos o fuera de 0..100 se rechazan, no se recortan a una cifra convincente.
4. Bytes corruptos con MIME JPEG llegaban a la funcion. Se decodifica y reduce la imagen antes de cualquier invocacion.

QA visual adicional: el aviso de error quedaba bajo el pliegue con fotos verticales.
Se lleva el error a la zona visible y se anade una accion directa para seleccionar otra foto.
El cierre de la previsualizacion tiene nombre accesible y objetivo tactil de 44 px.
El contrato acepta dimensiones sensoriales null sin transformarlas en datos y se prueba contra una respuesta real historica guardada.
Esta reproduccion local de JSON historico **no es una nueva llamada de reconocimiento**.

## Matriz de funcionalidades

| Funcion | Expected / comprobacion | Actual en este lote y limite |
| --- | --- | --- |
| Inicio, onboarding, login, perfil y rutas | Render, navegacion y guardas de acceso | 34/34 rutas, sin overflow ni errores de pagina/consola; backend interceptado; no prueba login real |
| Etiqueta unica/multiple, vitrinas | Region individual, parcialidad, correccion, descarte y reanalisis | Incluido en 31/31 casos de escaner con respuestas controladas; precision real nueva pendiente |
| Cartas/pizarras de vinos | Pins/lista sincronizada, no tapar texto, precios y monedas | Suite de escaner verde; capturas vertical/horizontal y texto125%; manuscrito real pendiente |
| Menu de comida/plato | Separar ideas de estilo de botellas disponibles | 10/10 casos adversariales finales; foto real y respuestas controladas; no OCR real nuevo |
| Datos incompletos | No crash, no afinidad imposible, perfil ausente no inventado | Contratos, respuesta historica y UI pasan; error visible y seleccion alternativa |
| Comparar 2-5 | Limites, presupuesto y contexto de servicio, detalle trazable | Suite cliente verde; no validacion humana de calidad del ranking |
| Afinidad y aprendizaje | Aislamiento, excluir no valorados/datos parciales, anadas distintas | 25/25 perfiles sinteticos UI y contratos pasan; no son 25 personas ni feedback real |
| aiRIM | Acceso y conservar contexto plato/vino | Navegacion nativa y enlaces cliente pasan; contenido conversacional real no evaluado |
| Bodega/favoritos/historico | Acceso correcto y no entrenar con una sugerencia sin valorar | Guardas anonimas y contratos; CRUD persistente autenticado de varias cuentas pendiente |
| Restaurante Winerim | Recomendacion desde carta real, no prometer disponibilidad de una idea | Traspaso menu -> carta con plato pasa; datos vivos, copa/botella y disponibilidad pendientes |
| Captacion de restaurantes | Consentimiento, separar observacion de informacion verificada, sin duplicar leads | No probado end-to-end en este lote; no creacion de restaurantes ni envio comercial |
| Compartir/privacidad/borrado | No compartir perfil privado; consentimiento antes de enviar imagen | Gate del escaner y rutas; borrado real, destinatario y persistencia entre cuentas pendientes |
| Offline/reintento/cancelacion | Recuperacion sin inventar resultados ni perder regiones validas | Escaner de vino controlado verde; menu de comida aun sin cancelacion explicita de la invocacion |
| PDF/fotos grandes | No perder paginas sin avisar, limitar bytes, recuperacion | Preparacion/validacion de imagen cubierta; PDF comida solo procesa primera pagina actualmente |
| Accesibilidad/orientacion | Safe areas, objetivos tactiles, texto ampliado, rotacion | QA nativo y capturas; VoiceOver hablado y flujo fisico completo pendientes |
| Rendimiento | Latencia por fase, memoria, coste y comportamiento con concurrencia | Compilacion y cold-launch nativo registrados; p50/p95 de vision/coste/carga no medidos en este lote |

Evidencias: `food-ui/results.json` (antes), `food-ui-recovery-final/results.json` (despues),
`scanner-regression-final/ui-qa-results.json`, `persona-ui/ui-results.json`, `personas.json`,
`routes/route-inventory.json`, `verification.json`, `native-results.json`, `simulator-qa.log`.
El cohort sintetico en proceso no es una prueba de carga de 1.000 usuarios ni un estudio humano anual.
QA nativo final: 6/6, screenshots en `native-screenshots/manifest.json`; cold launches
de simulador: 4.046, 2.952, 2.975, 2.926, 2.930 s. No equivalen a rendimiento en iPhone fisico.

## Gates abiertos y siguiente ejecucion real

- **P0 reconocimiento:** ejecutar fuentes nuevas y originales por modo, conservar respuesta cruda, caja final/crop/hash, OCR, identidad y afinidad por separado.
- Medir precision y recall por referencia, por botella y por categoria; errores de anada/cuvee, duplicados, falsas identidades de alta confianza y abstencion en negativos. No sumar subconjuntos anotados como si fueran verdad exhaustiva.
- Revisar independientemente identidad/cajas legibles. No usar salida del modelo como ground truth ni mejorar prompts con el holdout final.
- Propuesta de gate a acordar antes del run: cero falsas identidades de alta confianza en negativos; precision de nombre >=95% y recall de texto legible >=90% por categoria anotada. La identidad canonica exige su propia medida, no se infiere de OCR.
- **P0 recomendaciones:** evaluacion ciega por personas/sumiller, comparacion contra preferencias reales y control de disponibilidad. Las invariantes sinteticas no demuestran satisfaccion real.
- **P1 comida:** contrato backend local convierte algunos null sensoriales a 1 por `Number(null)`; el cliente corregido no puede recuperar informacion ya perdida en servidor. Corregir/probar en staging antes de deploy; no se ha modificado ni desplegado ese backend en este lote.
- **P1 cobertura/resiliencia comida:** primera pagina PDF, ausencia de cancelacion explicita y progreso ciclico no medido siguen pendientes. No presentar lectura parcial como exhaustiva.
- **P1 persistencia/dispositivo:** cuentas de QA aisladas, CRUD/reapertura/cambio de cuenta, camara real, permisos frescos, VoiceOver hablado, memoria y red limitada.

**Presupuesto:** ledger compartido previo 289/300 llamadas. Este lote consume 0 llamadas nuevas de vision.
Se ha solicitado autorizacion para hasta 300 llamadas adicionales o usar solo las 11 restantes; sin respuesta al cierre, el benchmark remoto nuevo no se ejecuta.
No se atribuye el pendiente a falta de cuota del proveedor: es un limite de gasto/autorizacion, no un error comprobado del proveedor.

## Reproduccion y distribucion

1. `npm run test:release`, `npm run typecheck`, `npm run lint`.
2. `node scripts/build-matchrim-production-candidate.cjs /ruta/al/client-production.env`.
   Solo admite clave publica anonima; catalog75/affinity73/vision72, schema public, fixtures desactivados.
3. Preview local y `scripts/qa-matchrim-food-challenges.py` con `MATCHRIM_QA_URL`, `MATCHRIM_FOOD_QA_OUTPUT` y `MATCHRIM_CHALLENGE_SOURCES`; usa Chrome y Python Playwright.
4. `scripts/qa-multi-wine-ui.py` para regresion. `scripts/qa-matchrim-route-inventory.cjs` con `MATCHRIM_ROUTE_QA_ISOLATED=true` para rutas sin backend remoto.
5. Recolector Commons y constructor de pack tienen `--help`; no envian imagenes al proveedor. El builder valida SHA256, licencia y ausencia de duplicados del baseline.
6. El runner nativo local `native.cjs` conserva comandos, logs, archivo y exportacion local; la suite fuente es `qa/native-candidate75/MatchrimCandidateUITests.swift`. El nombre historico de la suite no es el numero del binario.

Build local **1.0 (77)**; release-tests/typecheck/build pasan; lint 0 errores y 107 advertencias heredadas.
Resumen portable: [summary.json](qa-evidence/matchrim77-challenge-2026-10-08/summary.json).
IPA local: `Matchrim-1.0-77-local-candidate.ipa`, SHA256
`117f5eb2899d4aa4b6c6fa49570e0a038c725098fd92ee1920641f715cdac57d`.
No se ha subido77, no se ha instalado en el telefono del propietario ni publicado web/funciones.
No declarar DONE global ni aptitud de reconocimiento por la compilacion o por los mocks.
