# Matchrim Native99: Escanear Y aiRIM

Baseline: `d7d81e18e5219b1aedcca641f71ae4d46980faf8`. Continuacion aditiva del Native98, solo app nativa y portrait. No publicar la web ni presentar este bloque como cierre del catalogo o del reconocimiento real.

Producto: `ed7dda42eb6270a2fac87bdb2c9b964d784788b2`, version local1.0(99). El commit posterior de este informe cambia solo documentacion y dos lineas de dependencias del harness de Bodega; no cambia el producto compilado.

## Cambio De Producto

| Antes | Ahora | Limite conservado |
| --- | --- | --- |
| Escanear presentaba todos los modos al mismo nivel | Tres decisiones: Botellas, Carta de vinos, Comida y vino; modos secundarios en Mas | Pipelines existentes, aliases, parametros, consentimiento, guardado e historial por propietario |
| aiRIM tenia otra pantalla de opciones y un paso intermedio para conversar | Conversacion directa con un solo compositor y envio explicito; consultas guiadas plegadas | Mismo controlador de perfil, ownership, contexto enviado, cancelacion, proveedores y respuestas |
| Las cartas del restaurante competian con accesos de un solo plato | Acceso directo al workspace existente de cartas, fotos, PDF y enlaces desde ambas pantallas | No es un nuevo lector, modelo ni contrato de maridaje |
| iOS exponia texto hijo de los desplegables como botones de18pt | Nombre accesible en el desplegable de44pt; texto visual hijo no duplica el control | Sin ocultar el nombre accesible ni excluir controles pequenos del test |

El menu principal conserva Inicio, aiRIM, Escanear, Bodega y Perfil. La pagina web mantiene su render anterior; la formula de afinidad, los ceros sensoriales y la seleccion exacta de anada no cambian. Abrir aiRIM no envia ninguna consulta. Cancelar recupera el texto, y una respuesta tardia no cambia otra cuenta. Un consejo general no se convierte en afinidad personal.

## Evidencia Y Estado

Raiz privada: `/Users/GOIKO/2matchrim76-recognition-20261008/qa-artifacts/native99-20261021/`.

| Prueba | Resultado actual | Alcance |
| --- | --- | --- |
| Scan99 offline |11/11 PASS | JSX real, callbacks, consentimiento, aliases, historial/owner, render web completo sin cambios; no camara real |
| aiRIM99 offline |18/18 PASS | Controlador y hoja actuales; envio, IME, cancelacion, disclosure, autoscroll limitado, iconos estables y controles negativos |
| aiRIM Consumer95 |24/24 PASS | Controlador real con nueva hoja visual; perfil, abort, respuestas inseguras, cambio de cuenta y web legacy |
| Catalogo observado /50 perfiles sinteticos |5/5 PASS | `master-profile50.log`; calculo determinista, no50 humanos ni precision predictiva |
| Simulador99 final, normal y MAX |PASS,5 capturas por recorrido | `native-audit-r7-max-isolated`, `native-audit-r8-normal-isolated`: teclado/envio, atras, scroll real, Mas y entrada de etiqueta |
| Playwright final |PASS,14 capturas | `visual-r2-final`:320/393/440pt y CSS200%, consentimiento, respuesta/cancelacion controladas,44px/20px;0 excepciones/errores de consola/forwarding |
| Release / Consumer95 / Closure96 |PASS / PASS / PASS | `release-final.log`, `consumer95-final.log`, `closure96-final.log`; legacy proyectado no se vende como UI nueva |
| Food y Moments |PASS | `backend95-final.log`;50 perfiles sinteticos y handlers offline, no50 cuentas ni personas reales |
| Restaurante |22+13+170+55+27 checks PASS | Primer comando retuvo fallo de prefijo de dependencias; ultimo child27 PASS con su prefijo offline original, sin instalar ni modificar paquetes |
| Identidad94 y escala/evolucion de Bodega |28+21 checks PASS | `identity94-final-r2.log`;50 perfiles sinteticos, ceros/decimales, historial inicial inmutable y afinidad actual recalculada |
| Typecheck / lint |PASS /0 errores,129 warnings | `typecheck-final.log`, `lint-final.log`; harness de escala tambien pasa lint focal despues del arreglo |
| Source inverses / mutaciones |Scan99:7 checks/57 negativos; Home98:5/40 | Baselines, contadores y aserciones originales conservados, no cambio ciego de hashes |
| Build frontend / iOS99 |PASS / PASS | `preview-r4/preparation.json`, `simulator-r4/BUILD-RESULT.json`:387 fuentes y163 recursos; configuracion real, fixtures=false |

Los fallos reales de18pt se conservan en `native-audit-r1-normal` y `r2-normal`; r3 verifica la correccion. `native-audit-r4-max` conserva el fallo de scroll y las capturas que revelaron el icono agrandado. Los controles normales no se excluyeron del audit. Las auditorias automaticas de contraste, descripcion, clipping y traits no equivalen a escuchar VoiceOver ni a un recorrido fisico autenticado.

R6 reutilizo una revision anterior del runner: el fallo seguia indicando su antigua linea36, sin las nuevas acciones de scroll. Se aislaron namespace, derived data, clase y metodo, usando `wine.matchrim.qa99.navigation.r7.uitests`; ambos logs finales contienen `N99_HARNESS_R7_SCROLL_ACTIVE` y el marcador de fin de recorrido. R7 ejecuta un swipe real antes de abrir Mas. Se conserva el fallo anterior, no se cambia un FAIL por un PASS retrospectivo. El tamano de texto del simulador quedo restaurado a Large y la app QA aislada se cerro al terminar.

Se corrigieron dos limites del banco de pruebas, no reglas de producto: el test antiguo de escala ejecutaba el resolver real sin importar su nuevo `safeWineImageUrl98`; ahora inyecta el validador real y conserva las21 aserciones. Restaurante necesito el prefijo offline existente con parse5@7.3.0, ipaddr.js@2.2.0 y http-parser-js@0.5.10, como ya documentaba su propio comando. Ambos primeros fallos quedan conservados. Los sockets, auth y proveedores de esas pruebas son dobles offline; los parsers y PDF.js si se ejecutan realmente.

El build iOS99 r4 final es una compilacion nueva de Xcode26.0.1, unsigned y aislada como `wine.matchrim.qa99review`, con163 recursos frontend verificados. El repack r3 previo no se declara una compilacion nueva de Xcode ni firma de distribucion. `CLEAN-SOURCE-BINDING.json` enlaza el checkout final con las387 fuentes,163 recursos y los logs/runner finales sin relabelar el commit original de compilacion.

El bloqueo de disco se resolvio eliminando110 directorios de caches regenerables de esta tarea (ModuleCache, Index y Build/Intermediates), no archivos fuente, fotos, resultados xcresult, logs ni archivos de distribucion. `CACHE-CLEANUP.json` registra las rutas exactas y recuperacion aproximada de5.4GB. No se limpiaron caches de otras tareas ni se alteraron sus leases/procesos.

## Catalogo Completo: Dato Que Falta

La evidencia nueva identifica el backend Symfony como `winerim-backend` / `winerim-backend-production`. La Library publica, las recomendaciones y el maestro Mantalak son ambitos distintos. El esquema historico demuestra la relacion explicita entre IDs, no un contrato de lectura maestro accesible a Matchrim.

El propietario facilito `https://github.com/goiko111/matchrim-wine-sense`, que es exactamente el origin de este checkout. Se hizo fetch read-only: `origin/main` quedo en `278cf88` (los cambios recientes afectan Food/deteccion y restauran la web); no se mezclo main ni se desplego nada. Se revisaron los conectores actuales y la rama `integracion-con-winerim`. Este repositorio contiene React/Capacitor y Edge Functions; no contiene el proyecto PHP/Symfony del maestro ni un nuevo contrato de lectura Mantalak.

El `search-wines` de main consulta la tabla local `wines` y complementa con un modelo si hay clave: no es prueba de acceso al maestro Winerim, ni una ficha original autoritativa, y no se llamo en vivo. Permanece protegido y sin cambios. En este candidato, `findWinerimWineForLabel` entra primero por su rama nativa de lectura estricta `lookupWinerimOriginalSheet`, no por ese fallback generativo. Las rutas remotas demostradas siguen siendo Library/restaurante/recomendaciones.

La accion minima sigue siendo el contrato de lectura o el contacto tecnico del servidor desplegado en `app.winerim.com`, no otro enlace al frontend de Matchrim. El contrato preciso y los paths de controladores/servicios a localizar estan en `catalogue-discovery/REPORT.md`; no se necesitan contrasenas, cookies admin ni un volcado de base de datos.

Casos de aceptacion que no se pueden maquillar: La Zorrera2015 no se sustituye por una ficha Library2019; Vidure2020 no toma silenciosamente datos NV/2018; busqueda truncada o caida no significa vino inexistente. Los atributos generados y sus citas deben conservar esa procedencia. Una foto no acredita atributos sensoriales.

## Las200 Etiquetas, Sin Confundir Las Pruebas

`corpus200-matrix/MATRIX.json`, `MATRIX.csv` y `SOURCES.json` reunen200 filas expected/actual y509 fuentes con SHA256. Se reutilizan las imagenes y evidencias ya preservadas, no se regenera el dataset. Nombres, bodegas e IDs de los manifest originales son solo ground truth de evaluacion; no se introducen al recognizer.

- OCR local anterior:200 procesadas,198 con texto,2 vacias. Solape textual completo de nombre64/200, bodega96/200, ambos38/200. Esto NO es precision/recall de identidad canonica.
- IA historica: cinco imagenes vinculadas por SHA / diez starts; todas uncertain, con preparacion antigua. No se relabelan como resultado sobre la preparacion white actual.
- SDK fisico: cuenta real unknown,24 slots reservados siguen comprometidos; no se asignan resultados a una imagen sin hash.
- Reconocimiento real con pixeles white actuales: NOT-RUN/BUDGET-HOLD en200/200. Catalogo autoritativo no enlazado en200/200; afinidad no evaluada. No se afirma que los200 vinos esten ausentes del maestro.

Se mantiene el limite humano20 etiquetas piloto /50 peticiones de pago /15EUR. Reconciliacion: diez starts API demostrados mas24 slots SDK sin cierre =34 comprometidos y10.20EUR provisionados, NO gasto facturado. Quedan16 slots aritmeticos, pero no autorizan un nuevo ejecutor sin prueba de quietud del cliente previo y bindings actuales. Las cuatro sondas fisicas revisadas usan activate(), no una terminacion demostrada; no se inventa ese cierre. No se hicieron llamadas nuevas, OCR nuevo, turnos Lovable ni despliegues en este bloque.

## Gate De Entrega

No hay autorizacion incondicional para subir un candidato no validado. Antes de TestFlight siguen siendo necesarios: contrato maestro real y fichas verificadas por anada; reconocimiento real dentro del limite vigente y con contador seguro; recorrido autenticado/persistencia y QA final del candidato. Los tests con dependencias sinteticas no sustituyen estos gates. No se ha tocado el iPhone en esta continuacion ni usado una ventana fisica anterior ya vencida.

`src/index.css` y `supabase/functions/search-wines/index.ts` quedan protegidos. No hay Publish, despliegue web/backend, upload de Apple o invitacion de testers en este bloque. La95 instalada en TestFlight no contiene Native98/99.

## Beta Privada Autorizada Y Subida Posterior

Despues del checkpoint anterior, el propietario solicito expresamente: "puedes subir testflight y vemos donde estamos?". Se autoriza y ejecuta una beta privada para evaluar el estado actual, no el cierre de los gates de catalogo/reconocimiento anteriores. Ninguno de esos pendientes se declara resuelto por la subida.

El 2026-10-21, Xcode26.0.1 genero un archivo Release nuevo de **1.0(99)**, bundle de produccion `wine.matchrim.app`, equipo `8X3XTD6XYX`, desde los mismos387 inputs y163 recursos comprobados. El archivo de simulador `wine.matchrim.qa99review` NO se subio. El IPA exportado pasa codesign estricto, perfil App Store con `get-task-allow=false` e identificador exacto. Los163 recursos del IPA siguen siendo identicos a los probados. Configuracion real de produccion, fixtures=false, sin live reload.

- Fuente: `838c89f11545ddd4fb336d3bf6a57117867851b4`; producto `ed7dda42eb6270a2fac87bdb2c9b964d784788b2`.
- IPA SHA256: `55d5bac531801a5daaa52bdb3f6fce3c94f41e7dc29ce26a53729de0aa472f63`.
- Subida unica: inicio06:12:09UTC /08:12:09Madrid, fin06:13:33UTC /08:13:33Madrid. Exit0: `Uploaded package is processing`, `Upload succeeded`, `Uploaded App`, `EXPORT SUCCEEDED`.
- Apple acepto el paquete y lo esta procesando. Esto NO confirma aun su disponibilidad instalable, asignacion a grupos ni invitacion a testers. No se repite la subida ni se altera el numero para simular disponibilidad.
- Evidencia privada: `qa-artifacts/native99-20261021/distribution99/{archive,export,upload}-result.json`, logs y `release99.mjs`; notas `WHAT_TO_TEST.es.txt` en la misma raiz de evidencias.
- Warning de Apple no bloqueante: target iOS14; Apple indica minimo iOS15 a partir de abril2027. No se cambia el target de un candidato ya probado en esta subida.

La fuente del producto no se modifica para subir. Sin Publish, deploy web/backend, cambios en main, invitaciones nuevas ni llamadas adicionales de IA de pago. Se conservan los gates pendientes: maestro completo de Mantalak/Winerim,200 etiquetas reales, fichas sensoriales de anada exacta y recorrido fisico/autenticado de99. Las notas preparadas los explicitan; no se afirma que ya esten publicadas como metadatos en Apple.

Coordinacion: archivo/export/upload bajo heavy-local `17f0bc35-1169-4af4-846c-cb26a11a1cc6`, liberada al terminar06:13UTC. Writer `da3adf68-cfae-4693-8472-d05e6ef6e72c`. Capacidad comprobada antes de cada etapa; sin limpieza adicional, uso de iPhone o interferencia con tareas ajenas. Una consulta pasiva posterior de las pestanas de Brave, con mac-desktop `4b727a80-59f7-4e65-843c-844fd181c7f6` y mas de5 minutos de inactividad HID, encuentra la unica pestana de Apple en `/login`; no se inicia sesion, navega, cambia cuenta ni abre otra pestana. Por ello la disponibilidad instalable queda sin verificar. Lease de escritorio liberada tras esa consulta.
