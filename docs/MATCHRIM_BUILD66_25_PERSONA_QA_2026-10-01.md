# Matchrim 1.0 (66) - QA de 25 perfiles

Fecha: 2026-10-01

## Dictamen

- Build evaluada: Matchrim `1.0 (66)`, instalada y arrancable en el iPhone conectado.
- Cohorte: 25 perfiles sinteticos deterministas y aislados. No son 25 personas reales; usuarios humanos participantes: 0.
- UI personalizada: 25/25 sesiones aprobadas, sin trafico a produccion.
- Escaner y cartas: 29/29 comprobaciones UI aprobadas con respuestas interceptadas y los cinco archivos reales usados como soporte visual.
- Suite tecnica: tests, typecheck y build aprobados. ESLint: 0 errores y 105 warnings heredados.
- Gate de reconocimiento real grabado: NO aprobado. Multi-etiqueta y menu de comida siguen por debajo de 0.90 precision/recall.
- iPhone: instalacion y lanzamiento de build 66 aprobados mediante `devicectl`; XCUITest bloqueado al habilitar automation mode.

## Alcance y metodo

Cada perfil tiene respuestas propias a 20 preguntas, vector de gusto inicial, historial de 0/1/5/20 senales, recomendacion y confianza. Cada sesion UI usa un contexto de navegador, usuario, token, localStorage, quiz y bodega diferentes. Las llamadas Supabase/Winerim se interceptan: 0 lecturas y 0 escrituras de produccion.

Orden de los vectores: `potencia/acidez/dulzor/tanino/fruta`, escala 0-5. Respuestas: `si/indiferente/no`.

| # | Perfil | Trabajo a resolver | Respuestas | Inicial | Aprendido | Top tras 20 | Conf. |
|---:|---|---|---|---|---|---|---:|
| 1 | principiante-cero | Entender su gusto sin historial | 0/5/15 | 0/1/1/0/1 | 0/1/1/0/1 | blanco baja acidez | 0% |
| 2 | principiante-frutal | Encontrar fruta directa | 5/2/13 | 0/1/4/0/4 | 0.5/1.7/3.1/0/5 | tinto frutal | 54% |
| 3 | tinto-clasico | Tintos estructurados familiares | 8/1/11 | 4/0/1/4/1 | 5/1.6/0.2/5/1.7 | Rioja reserva | 65% |
| 4 | blanco-atlantico | Blancos frescos y salinos | 6/2/12 | 0/5/1/0/3 | 0.5/5/1/0/3.7 | Albarino | 54% |
| 5 | dulce-aromatico | Dulzor y expresion aromatica | 7/1/12 | 1/1/5/1/4 | 1/2/5/0.2/4.9 | Moscatel | 63% |
| 6 | acidez-alta | Tension y final fresco | 6/1/13 | 0/5/1/0/2 | 0.9/5/0.6/0.5/3 | Albarino | 63% |
| 7 | acidez-baja | Evitar vinos muy acidos | 6/1/13 | 1/0/4/1/3 | 2.2/0/3.9/1/3.5 | blanco baja acidez | 56% |
| 8 | tanino-alto | Estructura para carne | 7/1/12 | 4/1/0/4/0 | 5/3.5/0.3/5/0.5 | Rioja reserva | 64% |
| 9 | tanino-bajo | Evitar sequedad | 4/2/14 | 0/1/3/0/4 | 0.5/1.7/2.7/0/5 | tinto frutal | 54% |
| 10 | experto-explorador | Explorar tension y estructura | 11/0/9 | 4/3/0/4/1 | 5/4.4/0.3/5/1 | Nebbiolo | 65% |
| 11 | conservador-familiar | Elegir una referencia segura | 5/2/13 | 3/0/0/3/0 | 4.6/1.6/0/4.8/1.2 | Rioja reserva | 63% |
| 12 | presupuesto-estricto | No superar 15 EUR | 4/1/15 | 0/1/2/0/4 | sin cambio | blanco baja acidez | 0% |
| 13 | compra-premium | Comparar premium y anadas | 8/2/10 | 4/1/0/4/0 | 5/3.5/0.3/5/0.5 | Rioja reserva | 64% |
| 14 | restaurante-copa | Elegir por copa | 4/2/14 | 0/2/1/0/3 | sin cambio | tinto frutal | 0% |
| 15 | maridaje-marisco | Elegir para marisco | 5/1/14 | 0/4/0/0/1 | sin cambio | Albarino | 0% |
| 16 | sumiller-tintos | Revisar carta de tintos | 8/1/11 | 4/1/0/4/0 | 5/2/0/5/1.2 | Rioja reserva | 61% |
| 17 | sumiller-blancos | Revisar blancos y anadas | 6/1/13 | 0/5/1/0/2 | sin cambio | Albarino | 0% |
| 18 | tienda-expositor | Resolver varias botellas | 6/2/12 | 0/3/2/0/4 | 1.8/3.7/0.7/1.2/3.8 | Albarino | 70% |
| 19 | coleccionista-duplicados | Agrupar duplicados y anadas | 6/1/13 | 3/0/0/4/0 | 4.4/1.9/0.1/5/1.4 | Rioja reserva | 65% |
| 20 | etiqueta-oculta | Incertidumbre sin inventar | 4/3/13 | 1/1/3/1/3 | sin cambio | blanco baja acidez | 0% |
| 21 | pizarra-manuscrita | Corregir OCR irregular | 5/2/13 | 0/3/1/0/2 | sin cambio | tinto frutal | 0% |
| 22 | baja-vision | Completar con texto al 125% | 4/2/14 | 0/1/3/0/4 | 0.5/1.7/2.7/0/5 | tinto frutal | 54% |
| 23 | voiceover | Navegar sin apoyo visual | 4/2/14 | 0/3/0/0/2 | 0.5/4.4/0.5/0/3.2 | Albarino | 59% |
| 24 | movilidad-reducida | Usar controles de 44 px | 4/2/14 | 0/0/3/0/3 | 1.8/0/3.4/0.5/3.5 | blanco baja acidez | 61% |
| 25 | cambio-de-opinion | Pasar de tintos a blancos | 6/2/12 | 3/1/0/4/0 | 4.6/1.7/0.5/5/1.4 | Rioja reserva | 63% |

## Resultados de perfil

- Las preferencias sensoriales explicitas alcanzan el top 3 y un estilo rechazado nunca queda primero.
- Guardar la primera recomendacion la excluye de la siguiente lista; una anada diferente sigue siendo elegible.
- Guardar sin valorar no entrena el perfil. Una ficha sensorial incompleta tampoco entrena silenciosamente.
- Presupuesto, ocasion y color se tratan como contexto/filtro, no como dimensiones permanentes del gusto.
- En el cambio de opinion, cinco valoraciones recientes mejoran el nuevo objetivo en 38 puntos y lo dejan cuarto con 71% de confianza; una senal reciente sostenida converge al nuevo objetivo. No se borra el historial de golpe.
- 1.000 sesiones virtuales adicionales: 0 errores, p50 0.0067 ms, p95 0.0176 ms y p99 0.0786 ms. Es benchmark local del algoritmo, no carga de backend ni usuarios humanos.

## UI por usuario

Todas las sesiones validan Inicio, Perfil, bodega aislada, entrada al escaner, ausencia de overflow y consola. Casos especificos:

- Privacidad: el escaner permanece bloqueado hasta consentimiento.
- VoiceOver basico: navegacion sin controles anonimos.
- Baja vision: 125% sin desbordamiento horizontal.
- Movilidad reducida: tabs y boton de copia de al menos 44x44 px.
- Paisaje: cinco perfiles repartidos por la cohorte, sin overflow.

Resultado: 25/25 PASS, 0 errores de consola relevantes.

## Etiquetas, cartas y pizarras

La bateria UI compartida contiene 29 comprobaciones PASS:

- Foto multietiqueta: cinco regiones, tres referencias, duplicado agrupado, identidad dudosa y region no reconocida.
- Traza region-crop-resultado, refinamiento por zonas y fallback si una zona falla.
- Correccion manual invalida la afinidad heredada; reanalizar sustituye la identidad; descartar elimina la region.
- Una identidad dudosa nunca se presenta como eleccion final.
- Retry selectivo para 503, no retry para 400 y cancelacion durante `Retry-After`.
- Carta: imagen con pins numericos y lista sincronizada, comparador 2-5, presupuesto, copa/botella, zoom, filtros y drawer.
- Fixtures reales: IMG_7605 2.jpg y los cuatro HEIC materializados; retrato y paisaje sin overflow.
- Dynamic Type 125%, VoiceOver basico, objetivos tactiles y modo sin red.

Estas 29 pruebas usan respuestas de vision interceptadas. Verifican contrato, UX y resiliencia; no vuelven a medir el proveedor.

## Reconocimiento grabado

Replay del ultimo benchmark independiente real, sin repetir llamadas ni gastar cuota:

| Categoria | Escenas | Precision | Recall | Gate 0.90/0.90 |
|---|---:|---:|---:|---|
| Etiqueta unica | 11 | 90.91% | 90.91% | PASS |
| Multietiqueta | 4 | 50.00% | 88.89% | FAIL |
| Carta de vinos impresa | 5 | 91.82% | 94.39% | PASS |
| Pizarra manuscrita | 3 | 96.55% | 96.55% | PASS |

La normalizacion local de cajas mejora precision de 61.36% a 84.38% manteniendo recall en 93.10%, todavia bajo el 90% de precision. El menu de comida conserva 100% de precision pero solo 24.07% de recall (13/54 lineas); requiere desplegar y volver a medir el candidato de segmentacion.

## iPhone y build 66

- `devicectl` encontro `wine.matchrim.app`, version interna 66.
- Lanzamiento real: PASS.
- XCUITest: BLOCKED; el runner agoto el timeout al habilitar automation mode. No se ejecuto navegacion automatizada fisica en esta pasada.
- Evidencia: `MatchrimBuild66PhysicalSmoke.xcresult` y `/tmp/matchrim-build66-physical-smoke.log`.

## Gate final

La build 66 es utilizable para prueba interna de UX y perfiles. No debe considerarse certificada en reconocimiento multietiqueta ni menu de comida hasta:

1. Reducir falsos positivos multietiqueta y superar precision/recall 0.90/0.90 en un benchmark real nuevo.
2. Desplegar el candidato de segmentacion de menu y repetir el conjunto de 54 lineas.
3. Reintentar XCUITest con automation mode disponible en el iPhone.

## Evidencias

- `docs/qa-evidence/matchrim-build66-25-persona-2026-10-01/persona-results.json`
- `docs/qa-evidence/matchrim-build66-25-persona-2026-10-01/ui-results.json`
- `docs/qa-evidence/matchrim-build66-25-persona-2026-10-01/recognition-replay-local.json`
- `docs/qa-evidence/matchrim-build66-25-persona-2026-10-01/scan-ui/ui-qa-results.json`
- Capturas en `docs/qa-evidence/matchrim-build66-25-persona-2026-10-01/` y `scan-ui/`.
