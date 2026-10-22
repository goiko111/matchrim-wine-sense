# Matchrim: recuperacion de catalogo169-171

Release bloqueado. Sin publicacion web, despliegue backend, turnos de IA Lovable ni nuevas llamadas de IA de pago. El limite50 peticiones/15EUR no cambia. No se sube TestFlight por terminar una compilacion.

## Accesos comprobados

La app nativa NO esta limitada a la tabla local de Lovable. Ya consulta el catalogo global PUBLICADO de Winerim con store=1. La lectura nueva170 del22/10/2026 a08:39:59 Madrid responde HTTP200:182069 referencias declaradas,20 filas en pagina1. No se descarga todo el catalogo ni se confunden sus IDs con Mantalak administrativo. Fuente y cuerpo/headers/digest: `qa-artifacts/night105-20261021/public-master-access170-r1/`.

Con los accesos ya conectados, Lovable Cloud permite SELECT/read_file sin agente de IA. Inventario local comprobado:6781 vinos,2136 productores y anadas1926..2025. La consulta limitada por Vidure/La Zorrera/Taubenschuss devuelve0 filas locales; no acredita ausencia de esos vinos en Winerim. Metadatos de relaciones no muestran otras tablas de vino/catalogo, ni tablas externas. Los ocho procedimientos Winerim observados clasifican atributos/estilos/encaje; no se invocan ni acreditan un maestro remoto.

Revision remota fijada:95aa7508d1c2f0da9ba3205eee0304fd9d18357c. `winerim-wines/handler.ts` acepta POST/GET y dirige a wines o wines/match de un restaurantUuid. Para listado reenvia page/limit, no store/text. No expone otro contrato maestro global. Se guarda la respuesta exacta read_file en `qa-artifacts/continuation169-20261022/REMOTE-HANDLER.json`.

Las busquedas de repositorios instalados siguen mostrando seis repositorios relacionados con Winerim, ninguno llamado Mantalak o winerim-backend. La busqueda de WineCrudController/Mantalak no obtiene codigo. No demuestra inexistencia del backend; si que no se obtuvo su contrato/codigo desde esos accesos. No se leen secretos, sesiones administrativas, correo ni datos personales de usuarios.

Conclusion precisa: acceso anonimo al catalogo publico global comprobado y ya integrado. NO queda demostrado acceso al maestro administrativo completo, correspondencia de IDs Mantalak/oferta, publicacion de cada referencia ni ficha sensorial por cada cosecha. No hace falta otra clave OpenAI para leer el catalogo publico. Los500 y datos incompletos del proveedor son fallos distintos de autenticacion.

## Cambio169: consultas con identidad

Se reutiliza el vocabulario de estilos completos existente en menuLiteralStyle95. Una uva/estilo aislado o un rol de viticultura no ocupa una consulta automatica de identidad; se conserva el nombre completo con marca, la lectura original, el limite de dos consultas y la busqueda manual. El ranking, los requisitos de productor/anada, los IDs y el calculo de afinidad no se relajan.

La unica adicion al modulo compartido de cartas es un export inerte de su vocabulario. Un test de fuente exige que, al retirarlo exactamente, quede byte-identico a de2ad99; la clasificacion/render web previa no cambia. No hay cambios en src/index.css ni en supabase/functions/search-wines/index.ts.

Prueba roja real: Trebbiano generaba una consulta aislada cuando se esperaba abstencion. Despues del parche:7 grupos169 y14 grupos de propuestas104 verdes; las pruebas previas de estilos95 y los17 handlers104 tambien pasan. Lint enfocado y diff-check verdes. Son pruebas locales con transporte controlado, no QA de reconocimiento real.

Inventario de asignacion sobre los200 OCR conservados: solo cambian038,039,041 y181. No se dan los expected al generador de consultas. Cambios observados:038 deja de consultar VINEYARDS;039 conserva quinientosdos y busca NARINCE;041 conserva KRIYA y busca D'ABRUZZO;181 conserva OBLIQUA y busca APALTA VINEYARP, literalmente como se leyo. Esto es planificacion de consultas, no un resultado de precision ni permiso para corregir el OCR a mano.

Dos GET nuevos169 sobre las dos consultas sin cache: D'ABRUZZO devuelve200/parcial20 filas; APALTA VINEYARP devuelve200/completo0. No se reintentan500 anteriores. Recibos inmutables en `public-query169-r1`. El cero no se convierte en vino identificado y el parcial no se convierte en busqueda completa.

## Contabilidad

CLI341 GET publicos acumulados, mas una imagen publica anterior. Nueva tanda169/170:3 GET, cero inicios de modelo, cargas de imagen, turnos Lovable o escrituras productivas. Reserva conservadora269/400;131 libres. Las lecturas ordinarias de la app no estan instrumentadas. No se reutilizan reservas de guardado119 ni refresh manual132.

## Cambio171: no perder propuestas validas

Antes, un slug vacio en una fila descartaba tambien todas las filas validas, incluida la pagina anterior. Ahora solo searchProposals conserva las filas validadas y congeladas con status incomplete. Los sobres con count/page/longitud incoherentes no aportan filas nuevas. IDs duplicados, tambien ocultos en filas invalidas, siguen invalidando la seleccion como ambiguous. Busqueda estricta y lookup automatico mantienen el comportamiento anterior, incluido search con flags contradictorios; ninguna fila se convierte en identidad por aparecer en las propuestas.

Sin slugs inventados, conversion de IDs, fusiones ni atributos sensoriales estimados nuevos. Confirmar una propuesta recuperada sigue requiriendo detalle independiente con el mismo ID/slug/nombre/bodega/anada. Fallos HTTP/JSON/tamano/timeout y cancelacion siguen descartando el prefijo, como antes. Se conservan el limite de80 filas,4 paginas y12000ms totales.

Pruebas171:13 grupos verdes. Revision del padre corrigio el guard de flags para que el cuarto argumento de search no salte el modo estricto cuando el tercero es false. Cliente103:17 grupos previos verdes. Recuperacion TSX104:18 grupos verdes, incluido cliente real con transporte controlado, fila valida+vecina malformada, aviso incomplete, cero confirmaciones automaticas y verificacion de detalle al elegir.

Paginacion160:10 grupos verdes. La expectativa anterior queda en el historial Git; se actualiza el descarte de filas en errores de esquema al nuevo contrato explicito: lista exhaustiva de IDs validados del prefijo/pagina, ningun slug vacio, status incomplete y sin paginas extra. Los controles de busqueda automatica, IDs duplicados, expiracion, transporte y limite de ranking160 permanecen intactos.

Harness112:28 grupos verdes en memoria, cero red/escrituras. Dos grupos nuevos prueban que estilos genericos abstienen sin reconocimiento y que una propuesta recuperada de pagina malformada queda EXCLUIDA de las metricas mientras la busqueda siga incomplete. No se cambia el scorer, la elegibilidad ni los expected.

## Benchmark medido r12

Rerun actual sobre producto db9d007:200 recibos reales de Vision conservados,443 lecturas de cache verificadas,0 misses,0 GET nuevos, fuentes verificadas. Los expected se cargan despues de congelar el ranking. No se regeneran fotos ni se relajan identidad, elegibilidad o scorer. Exit1/NO-GO conservado.

| Metrica | r11 | r12 |
| --- | ---: | ---: |
| Escenas evaluables |148|151|
| Busquedas incompletas |52|49|
| Abstenciones validas, no reconocimientos |6|7|
| Listas con propuestas dentro de las evaluables |39|40|
| Top1 compatible con expected de metadatos |31|32|
| Top3 compatible con expected de metadatos |33|34|
| Listas sin expected |6|6|

No son tres identidades nuevas.038 pasa de consulta generica incompleta a abstencion;039 completa sus consultas con0 resultados;181 conserva la MISMA propuesta Obliqua Carmenere/public376094 que ya existia, pero ahora termina la recuperacion y entra en el denominador.041 sigue parcial tras cambiar Trebbiano por el fragmento literal D'ABRUZZO. Las148 escenas antes evaluables quedan iguales; no se pierden aciertos anteriores.

En193 se conservan19 filas validas de MONTEPULCIANO y en200 se conservan39 de ALTOTINTO. Son58 filas antes descartadas, NO58 vinos reconocidos nuevos. Ambos casos siguen incomplete y fuera de las metricas. Las49 pendientes corresponden a28 solo-parciales,19 no-disponibles,1 esquema y1 esquema+parcial. Los errores500 conservados no se reintentan para maquillar el resultado.

Esto es un proxy de coincidencia con expected derivados de los metadatos aportados, no precision experta,200 identidades confirmadas ni E2E de galeria. Fuente: `qa-artifacts/night105-20261021/native112-corpus200-r12/REPORT.json`.

## Build y QA

105/r4 sobre db9d007: preparacion limpia, TypeScript/bundle PASS, compilacion/install iOS Simulator PASS a08:49:09 Madrid. Fixtures=false/masterConfigured=false. No archive/export/upload. El ejecutable Swift sin cambios no sustituye la comprobacion de los recursos JS/plist propios de esta revision.

`picker163-damaged171-r1`: componente real con transporte controlado,23 filas de las cuales una es malformada. Se mantienen22 validas, el filtro2022 ofrece2, la referencia guardada23 aparece primero y la seleccion exige detalle. PASS375/440/raiz32px, sin overflow, con controles >=44px y0 errores de pagina. Se inspeccionaron375 y texto grande. Esto no acredita iOS ni catalogo real.

El caso nativo real164/r5 anterior permanece como evidencia historica: recuperacion MANUAL de Flor de Muga Blanco2022, valoracion guardada te encanta,69/100 comparacion de estilo, cinco ejes, ficha independiente y auditoria de viewport sin incidencias. No se recicla como certificacion automatica de los nuevos cambios.

164/r6 sobre105/r4/db9d007: PASS real UIKit, fin08:51:24 Madrid. Foto original atestada, cuenta QA existente, consulta MANUAL por lupa con teclado abierto, seleccion2022, detalle publico independiente, valoracion te encanta como dato principal y69/100 de estilo como dato secundario. Cinco factores observados perfil/vino: potencia1.4/3, acidez4/3, dulzor2/0, tanino1.1/0, fruta3.3/4. Cero incidencias Apple en contraste/descripcion/recorte/trait del viewport final, ninguna suprimida. Captura final inspeccionada: `manual164-r6/attachments/7CFF9760-EC3F-4D0A-94DA-9E699C763E4F.png`.

No inicia sesion, crea usuarios, guarda vinos, valora, certifica anada en la foto, demuestra identidad automatica ni mide exactitud real del gusto. SelectedPublicId sigue null porque AX no expone el ID, sin adjudicar equivalencia entre duplicados. Los cinco ejes y la cifra provienen del dialogo actual, no de un fixture ni del fondo. Evidencia: `qa-artifacts/continuation161-20261022/manual164-r6/RESULT.json`, capturas/AX/video/xcresult. No se usa el iPhone fisico.

Revision local de los200 casos regenerada desde r12: `qa-artifacts/night105-20261021/native112-review-corpus200-r12/REVIEW.html` y `REVIEW.csv`. Reutiliza imagenes locales, no las descarga ni copia. Es una vista de evidencia no publicada, no otra app ni cambios en la web de Matchrim.

## Pendientes antes de TestFlight

-28 escenas solo-parciales: consultas amplias superan el limite deliberado de80 filas. Queda trabajo de mejor acotacion/paginacion; no se presenta como un bloqueo exclusivamente externo ni se aumenta el limite para fingir cobertura.
-19 escenas no disponibles: respuestas500 conservadas, seis consultas exactas ya revalidadas en165. No se reintentan en169; requiere correccion de la ruta/datos del backend o una via autorizada de lectura que responda correctamente.
-Una escena de esquema y otra de esquema+parcial: slugs vacios362891/363580. Propuestas validas recuperadas, pero la busqueda sigue incompleta; no se inventan slugs ni se edita el maestro.
-Maestro administrativo/ofertas y datos sensoriales por anada: no demostrados con los accesos actuales. La ruta publica global SI esta disponible; no pedir otra clave de IA para solucionar esto.

Producto db9d007 subido a rama de trabajo; fuente web desplegada/main/Edge Functions intactas. Heavy/ios liberados tras los jobs reales, sin tocar procesos o leases ajenos. TestFlight NO SUBIDO; build105 es candidato de simulador, no un release aprobado.
