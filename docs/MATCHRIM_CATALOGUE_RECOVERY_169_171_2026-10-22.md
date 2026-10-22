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

## Validacion pendiente de cierre

Baseline r11:148 escenas evaluables/52 incompletas,31 top1 y33 top3 compatibles con los metadatos expected del scorer; no precision experta ni200 identidades canonicas. El inventario169 no sustituye ese benchmark. Falta repetir el corpus con los cambios actuales y sus nuevos recibos, y reconstruir el candidato porque105/r3 corresponde a23d9f5b anterior. Se respetan las reservas de compilacion/simulador ajenas; no se publica ni se toca el telefono del usuario.

El caso nativo real164/r5 anterior permanece como evidencia historica: recuperacion MANUAL de Flor de Muga Blanco2022, valoracion guardada te encanta,69/100 comparacion de estilo, cinco ejes, ficha independiente y auditoria de viewport sin incidencias. No se recicla como certificacion automatica de los nuevos cambios.
