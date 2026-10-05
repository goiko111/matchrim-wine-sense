# Matchrim: piloto de 100 cuentas y QA real

Fecha: 2026-10-05

Rama: `codex/matchrim-learning-airim-qa-20260928`

Base nativa: Matchrim 1.0 (68)

Entorno de datos: Supabase staging `qpbmqvfnunkylvtvnyyx`, esquema aislado `matchrim_qa`

Produccion/TestFlight: no modificados

## Decision de release

**NO-GO para un nuevo TestFlight.** El flujo funcional, la navegacion, aiRIM, la privacidad y el modelo de afinidad pasan sus gates internos. La identidad visual todavia no alcanza el umbral de precision en cartas impresas ni en escenas densas, y una vitrina real tarda 126.8 segundos. Subir ahora trasladaria al usuario resultados dudosos y una espera excesiva.

Gate minimo para reabrir TestFlight:

- precision de identidad >= 0.90 y recall >= 0.85 en carta impresa independiente;
- precision >= 0.90 en referencias mostradas como identificadas en escenas multibotella;
- ninguna identidad de baja confianza presentada como confirmada;
- latencia de escena densa dentro de un presupuesto de producto acordado;
- rerun fisico del build firmado resultante.

## Cambios cerrados

- Capacidad de refinado ampliada de 30 a 60 regiones para no perder estantes inferiores.
- Deduplicacion conservadora de copias exactas, productores parciales compatibles y descriptores genericos de producto.
- Las regiones dudosas pueden agruparse visualmente, pero siguen fuera de la confirmacion por lote.
- aiRIM permanece como destino principal de la barra inferior movil.
- Eliminado el menu movil duplicado en web autenticada para `Scan` y `LiquidIntelligence`.
- Modo restaurante reescrito como decision de vino: `Carta Winerim` o `Escanear carta`.
- La captacion de interes comercial queda desactivada por defecto y requiere consentimiento explicito.
- La foto y el perfil no se comparten como señal comercial; solo nombre y ciudad si el usuario marca la opcion.
- Cliente Supabase configurable por esquema para aislar completamente el piloto.
- SQL de la cohorte movido a `qa/staging/sql`; no forma parte del historial de migraciones productivas.

## Cohorte funcional

Se crearon **100 cuentas sinteticas**, no 100 personas humanas. Representan diez perfiles repetidos de forma equilibrada:

| Segmento | Cuentas | Uso modelado |
| --- | ---: | --- |
| Principiante frutal | 10 | descubrimiento sencillo y fruta como señal dominante |
| Clasico estructurado | 10 | cuerpo, tanino y estilos tradicionales |
| Atlantico fresco | 10 | acidez, blancos y frescura |
| Dulce aromatico | 10 | dulzor y expresion aromatica |
| Explorador | 10 | diversidad y novedad |
| Precio consciente | 10 | decision util con sensibilidad a valor |
| Coleccionista | 10 | estructura, guarda y referencias complejas |
| Sumiller servicio | 10 | comparacion y recomendacion contextual |
| Baja vision | 10 | navegacion y controles accesibles |
| Restriccion alimentaria | 10 | contexto de comida y restricciones |

Datos sembrados y verificados por RLS:

| Dato | Total |
| --- | ---: |
| Quiz completos | 100 |
| Vinos en historiales/bodegas | 6,000 |
| Valoraciones | 4,800 |
| Sesiones restaurante | 300 |
| Eventos de uso | 2,500 |

Resultado funcional: **100/100 cuentas pasan** login real, propiedad RLS, perfil, bodega, seis rutas, navegacion principal, aiRIM en menu, escaner, modo carta, consentimiento privado por defecto y ausencia de desbordamiento horizontal.

## QA de inteligencia

Las diez configuraciones sensoriales representan las 100 cuentas. Cada una recibio 30 recomendaciones reales del catalogo Winerim. Resultado: **10/10 perfiles pasan**, 9 rankings top-5 distintos y distancia sensorial media top-10 entre 0.00 y 0.22 sobre una escala 1-5.

| Perfil | Vector P/A/D/T/F | Primeras recomendaciones | Score top-10 | Distancia |
| --- | --- | --- | ---: | ---: |
| Principiante frutal | 2/3/2/1/5 | Rose D'Anjou, Monte Gatun Rosado, Gold Rose | 96.0 | 0.16 |
| Clasico estructurado | 5/3/1/5/3 | Pago del Ama, Celsus, Aljibes Petit Verdot | 100.0 | 0.00 |
| Atlantico fresco | 2/5/1/1/4 | Moravia Agria, Rezabal Txakoli Rose, Zabala | 96.5 | 0.14 |
| Dulce aromatico | 2/3/5/1/5 | Maestro Moscatel Dulce, Infinitus, Vietti Moscato | 94.8 | 0.20 |
| Explorador | 4/4/1/3/4 | Alto Sios, Finca Cascorrales, Penapedre | 100.0 | 0.00 |
| Precio consciente | 3/3/2/2/4 | Pasion de Bobal Rose, Irache Rosado, Bin 50 Shiraz | 100.0 | 0.00 |
| Coleccionista | 5/4/1/5/2 | Serpico, Ysios Los Prados, Nebbiolo d'Alba | 94.5 | 0.22 |
| Sumiller servicio | 4/4/1/4/3 | Cuprum Reserva, Ostatu Gran Reserva, Pavie Decesse | 100.0 | 0.00 |
| Baja vision | 3/2/2/2/4 | Pasion de Bobal Rose, Irache Rosado, Bin 50 Shiraz | 95.0 | 0.20 |
| Restriccion alimentaria | 2/4/1/2/4 | Akutain Cosecha, Saltamarti, Saint-Romain | 100.0 | 0.00 |

Esto valida coherencia algoritmica y diferenciacion de rankings; **no demuestra satisfaccion humana ni acierto subjetivo durante un año**. Ese estudio requiere usuarios reales, feedback posterior a consumo y comparacion contra un baseline.

## Benchmark visual real

Corpus independiente materializado: 60 fuentes distintas de Wikimedia Commons, con 36 escenas de etiqueta/expositor y 24 de carta/pizarra. Incluye 8 negativos explicitos, 3 pizarras manuscritas y 13 cartas de vino. En esta sesion solo cinco escenas representativas se ejecutaron contra el proveedor real; las 60 quedaron preparadas como corpus, no consumidas todas.

| Escena | Resultado | Precision | Recall | Latencia | Observacion |
| --- | --- | ---: | ---: | ---: | --- |
| Etiqueta unica Castano | PASS | 1.00 | 1.00 | 13.8 s | identidad correcta |
| Estanteria multibotella | FAIL | 0.667 | 1.00 | 29.8-42.1 s | reconoce las 6 referencias, pero repite lecturas y produce un dudoso falso |
| Carta impresa | FAIL | 0.600 | 0.562 | 36.1 s | confunde uva/tipo con nombre canonico y mezcla campos |
| Pizarra manuscrita | PASS | 1.00 | 1.00 | 13.8 s | 5/5 lineas en esta muestra |
| Menu de comida negativo | PASS | abstencion | abstencion | 4.3 s | 0 falsos vinos |

El proveedor fue no determinista entre dos ejecuciones de la estanteria. La deduplicacion nueva agrupa nombres y productores parciales compatibles por contrato, pero no oculta un candidato como `Solar` al 55%: queda dudoso y bloquea la aprobacion de precision.

### Foto real del usuario

Archivo: `76bd3a6d-2895-458f-96bd-2ab2f1052c71 2.JPG`.

| Metrica | Limite 30 | Limite 60 |
| --- | ---: | ---: |
| Regiones analizadas | 30 | 59 |
| Identidades mostradas | 25 | 47 |
| Afinidades individuales | 25 | 41 |
| Alta confianza | 10 | 24 |
| Latencia | 94.9 s | 126.8 s |

La ampliacion recupera filas inferiores y mejora cobertura. Sigue sin haber ground truth exhaustivo de cada botella; aparecen lecturas falsas o incompletas como `Don Variente`, `Chax de Bux`, `BAO` y `Piedras de San Fe`. Esta escena **no tiene precision aprobada**.

## QA fisico en iPhone

Dispositivo: iPhone 16 Pro Max Goiko, iOS 26.6. Se instalo temporalmente el cliente de staging, se ejecuto XCUITest y se restauro despues Matchrim 1.0 (68) de produccion.

Resultado: **7/7 pruebas fisicas pasan**.

- aiRIM visible como opcion principal y navegacion inferior completa;
- cinco modos de escaneo y acceso autenticado;
- retrato, paisaje, background y reapertura;
- apertura y retorno de galeria;
- controles interactivos con area minima de 44 pt;
- cinco cold launches, maximo 2.4502 s;
- auditoria de accesibilidad basica.

La auditoria reporto ocho avisos de area pequeña en nodos de texto estatico del WebView. No encontro controles interactivos bajo 44 pt, clipping por Dynamic Type ni contenido fuera de safe areas. Se conserva como residual semantico, no como fallo tactil.

## Regresion automatizada

Pasaron:

- `npm test`
- `npm run typecheck`
- `npm run lint -- --quiet`
- `npm run build`
- contrato multietiqueta con 48 regiones y deduplicacion conservadora
- 100/100 recorridos funcionales autenticados en cuatro shards
- 10/10 perfiles de recomendacion
- 7/7 XCUITests fisicos

El build web mantiene el aviso conocido de chunks superiores a 500 kB; no es un error de compilacion, pero queda como trabajo de rendimiento.

## Evidencias

- [Corpus de 60 escenas](qa-evidence/matchrim-100-account-pilot-2026-10-05/corpus-60-contact-sheet.jpg)
- [Foto densa real](qa-evidence/matchrim-100-account-pilot-2026-10-05/dense-display-real-mobile.jpg)
- [Etiqueta unica](qa-evidence/matchrim-100-account-pilot-2026-10-05/public-single-label-real-mobile.jpg)
- [Estanteria multibotella](qa-evidence/matchrim-100-account-pilot-2026-10-05/public-multi-shelf-real-mobile.jpg)
- [Carta impresa](qa-evidence/matchrim-100-account-pilot-2026-10-05/public-printed-list-real-mobile.jpg)
- [Pizarra manuscrita](qa-evidence/matchrim-100-account-pilot-2026-10-05/public-handwritten-board-real-mobile.jpg)
- [Abstencion en menu de comida](qa-evidence/matchrim-100-account-pilot-2026-10-05/public-food-negative-real-mobile.jpg)
- [aiRIM en menu principal del iPhone](qa-evidence/matchrim-100-account-pilot-2026-10-05/iphone-airim-main-tab.jpg)
- [Escaner fisico en retrato](qa-evidence/matchrim-100-account-pilot-2026-10-05/iphone-scanner-portrait.jpg)
- [Escaner fisico en paisaje](qa-evidence/matchrim-100-account-pilot-2026-10-05/iphone-scanner-landscape.jpg)
- [Consentimiento restaurante privado por defecto](qa-evidence/matchrim-100-account-pilot-2026-10-05/restaurant-consent-mobile.jpg)

## Residual y siguiente gate

P0 pendiente:

1. Separar con mas fuerza nombre de vino, productor, uva, añada y precio en cartas impresas.
2. Calibrar abstencion/candidatos dudosos en regiones mezcladas para no presentar identidad falsa.
3. Reducir llamadas por escena densa y mostrar resultados progresivos dentro de un presupuesto de latencia.
4. Ejecutar las 60 escenas con proveedor real cuando exista cuota aprobada, congelando modelo y version para eliminar variacion entre reruns.

Accion unica para TestFlight: aprobar un nuevo build solo despues de que el benchmark real anterior pase el gate y repetir en el iPhone el binario firmado exacto. Hasta entonces, el telefono queda en la build 68 y no se sube ningun candidato dependiente de mocks ni de precision insuficiente.
