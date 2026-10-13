# Matchrim: aviso propio de deteccion y ficha (10)

## Alcance

MATCHRIM-HOY-20261012-10, delta local sobre0156df365f3e547d303d5cc25bb9fc841d30a98d. Solo producto WineMenuScanner.tsx: ID del success de deteccion, vigencia local del aviso, apertura comun de ficha y atributos accesibles del recuento existente. No redisenar ni modificar AccountNotifications, Sonner, Drawer global, CSS, z-index, temporizacion o animacion.

El ID devuelto por toast.success se conserva por instancia. Abrir detalle, seleccionar archivo valido, limpiar, desmontar o cambiar de propietario invalidan solo ese aviso; toast.dismiss siempre recibe su ID exacto si existe. El token se captura antes de convertir PDF y viaja sin modificar las operaciones de conversion/escaneo. Publicar exige instancia activa, generacion vigente y controlador actual no abortado. Los avisos error/warning/info/guardado y la cola global no se limpian desde este codigo.

## Antes Y Despues

| Before | After | Why |
| --- | --- | --- |
| Aviso propio de deteccion invade cabecera horizontal | Aviso propio retirado por ID al abrir fila, pin y demas caminos del opener | Recupera lectura sin ocultar otras notificaciones. |
| Cabecera7514.38px2 y titulo143.18px2 bajo aviso a585ms | Interseccion0px2 en los cuatro contextos finales, medidos a569-611.2ms | Medicion DOM/pixeles, no espera del TTL ni ocultacion en el harness. |
| Centros de titulo/Cerrar alcanzables aun con solape parcial | Ambos alcanzables; Cerrar/Escape funcionan y Tab queda dentro tras foco explicitoCerrar | No se inventa bloqueo previo del botonCerrar. |
| Un aviso sin handle puede quedar tras clear o terminar una espera antigua | ID exacto y token propio descartan la publicacion antigua | No comparte ni altera generations de guardado/perfil. |
| Recuento visible sin status explicito | Mismo texto con role=status, aria-live=polite y aria-atomic=true | El feedback de lista permanece cuando se retira el aviso. No certifica VoiceOver. |

## Matriz De QA

| Prueba | Expected | Actual |
| --- | --- | --- |
| Reproduccion propia antes: fila393x852/852x393 | Medir solape antes de editar producto | Portrait12/12; landscape11/12, fallo de interseccion. Aviso visible a607.6/585ms; centros titulo/Cerrar alcanzables. |
| Final: fila y pin, ambas orientaciones | Sin aviso propio sobre cabecera; IDexacto, recuento y controles intactos |4/4 contextos,60/60 checks. ID1 propio retirado en cada contexto;0px2 de interseccion. |
| Warning ajeno sintetico tras cerrar/reabrir | No descartarlo ni limpiar cola global | Se mantiene en DOM, sin nueva llamada a dismiss. Captura marcada foreign-warning-control; no es error de usuario real. |
| Open/clear/newbatch/unmount/owner, generacion nueva, abort/controller/PDF token | Vieja publicacion no reaparece; otros IDs intactos |37/37 contratos puros/ref/AST. Owner usa dos instancias simuladas, no cambio real de cuenta; PDF solo propagacion/token, no renderE2E. |
| Guardados, normalizacion, queries, scores, retry08 y guia09 | Sin cambio funcional ajeno | Inicializadores protegidos byte-identicos; al quitar solo metadata del aviso, cinco funciones tienen mismo AST. Otros toast calls intactos;23 fuentes y693 entradas05-09 protegidas. |
| Typecheck/lint scoped10 | Exit0, sin warnings nuevos | Ambos exit0; logs conservados. No repetir suites05-09 ni builds. |

Cada contexto final:1 POST OCRstub,1 POST busqueda canonicastub vacia,1 GET perfilnull. Abrir/retirar/reabrir no aumenta contadores.0RESTwrites intentadas,0 llamadas remotas de la app/proveedor/pagadas,0 cuentas reales; sin errores runtime/consola. HTTP/WS antes de auth/navegacion, firma falsa invalida, SWbloqueado y analyticsfalse. Instrumentacion local envuelve dismiss solo para registrar argumentos y llama el original sin alterar semantica; warning ajeno es control explicito.

Misma escena/contratoBOTH04/08/09; imagenIMG_7547 2.jpg SHA2562b1da6ac2ab548346df754cc67a76b6d7a25cc28efb893564d49b9f7508c4194. Cuatro contextos no son cuatro personas/escenas ni precision del OCR. La apertura inicial de pin final ocurre dentro del TTL de su success real local, no se reinyecta aviso ni se espera que expire. En el baseline el segundo camino volvio a fila por selectorpin equivocado; se conserva ese limite, y el final usa Vino1 exacto.

## Evidencia Y Limites

Directorio docs/qa-evidence/matchrim-menu-notice-2026-10-13:103 entradasSHA,28 PNG,27 fuentes finales/24baseline; primary.json con geometria/hit/foco/counters y source-stages.json con etapas/proteccion. Capturas clave before/landscape-row-detail.png y after-final/row-landscape-row-detail.png; apertura inicial por pin after-final/pin-landscape-row-detail.png. Avisos ajenos conservados en capturas foreign-warning-control.

Las ejecuciones intermedias fila/pin pasan60/60 pero no suman humanos ni al primary final. Primer contrato36/37 fallo por comparar contenedor completo modificado como inmutable; corregido a nested initializers y AST explicito. Primer config scoped externo no resolvia tipos Node ya instalados; corregido solo typeRoots local. Un warning nuevo de cleanupref se elimino capturando el objeto de esa instancia. Cuatro-contextos tuvo cierre Chrome lento, finalmente exit0 con recibos; intento posterior de SIGINT encontro proceso ya terminado, sin accion. No rerun adicional para ese cierre. Metadata inicial y recibos retenidos, no se conservan logs crudos de la primera terminal.

Siguiente hueco real de QA, sin ejecutar ahora: foco inicial tras toque permanece en fila/pin en las mediciones. Tab se ensayo despues de enfocarCerrar explicitamente; no prueba traslado automatico ni recorrido desde disparador con lector/teclado. Mantener accesibilidad movil nativa, DynamicType, VoiceOver, reconocimiento real/cuota y QA fisico como gates separados.

Sin backend, auth/RLS, cuentas/contactos, SDK upgrade, push/deploy, build nativo, Apple/TestFlight o subidas. La invitacion TestFlight previa sigue pendiente;10 no revisa ese gate ni empaqueta el delta como build. Este informe cierra solo aviso propio10, no producto/camara/backend/native COMPLETE.
