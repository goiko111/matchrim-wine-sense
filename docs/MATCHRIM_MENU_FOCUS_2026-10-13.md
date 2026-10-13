# Matchrim: entrada y retorno de foco en ficha (11)

## Estado Y Alcance

Implementacion local y QA11 preparados para revision del coordinador; no aceptado/fulfilled todavia. Baseline30df48aa21a3771a26c9a03aca63b02e8bb899f0 limpio. Solo WineMenuScanner.tsx: autoFocus en esta instancia Vaul, captura de currentTarget real y restauracion por onCloseAutoFocus con guardias propias. No DrawerTrigger ficticio, nodos/globalDrawer/SDK editados, CSS/animacion/redisenos ni foco introducido por el harness.

API instalada: Vaul Root autoFocusfalse por defecto y Content impide focusScope.autoFocusOnMount cuando false; Radix modal intenta triggerRef al cerrar, ausente aqui. Se usa autoFocus solo en el Root local; primer control real es Cerrar, no input ni edicion, con titulo/descripcion del Dialog conservados. Radix enfoca sin scroll. El retorno propio usa el elemento del boton que abrio, isConnected, instancia activa, generacion vigente y modal cerrado; consume una sola vez la referencia. Clear/newbatch/owner/unmount invalidan solo referencias propias. Prev/next o actualizaciones mientras esta abierto no recapturan ni ejecutan focus.

## Antes Y Despues

| Before | After | Why |
| --- | --- | --- |
| Foco permanece en fila/pin detras del modal en12/12 aperturas | Foco inmediato/asentado en Cerrar detalle dentro de ficha12/12 | Entrada real sin activar teclado de edicion; contexto accesible de dialogo. |
| PrimerTab desde fila llega al SUMMARY Ver fichas completas y acciones; ciclos por pagina posterior | Tab/ShiftTab/ciclos reales permanecen dentro12/12 | Modal de teclado no deja foco en pagina oculta. |
| Cerrar termina en BODY12/12; Escape conserva el trigger porque nunca entro el foco | Escape y Cerrar vuelven al exacto boton de apertura12/12 cada uno | Retorno comprobado despues de entrada, no falsa prueba por foco inmovil. |
| Cuatro cierres de pin por teclado cambian scroll | Entrada/cierre conservan scroll en todos los casos finales | API preventScroll y guardias, no mover pagina para fabricar captura. |
| Riesgo de referencia vieja tras cambio de lote/owner o boton eliminado | Invalida generacion/elemento y no restaura desconectados ni sesion abierta/nueva | Controles puros/ref/AST, no cambios reales de cuenta. |

## Matriz De Pruebas

| Prueba | Expected | Actual |
| --- | --- | --- |
| Antes: fila/pin x Enter/Space/toque x393x852/852x393 | Reproducir con entrada real sin focus del harness |12contextos,128/180 checks;0contextos aprobados. Entrada/Tab/ciclo y retornoCerrar fallan12/12; scrollCerrar pin teclado falla4/4. |
| Despues: mismas12 rutas de entrada | Foco interior no editable, contexto accesible, ciclo, cerrar/volver y scroll |12/12 contextos;192/192 checks. Despues agrega12 checks de scroll desde evento nativo inicial; no equiparar180 con192. |
| Eventos reales | Tab hasta trigger, key Enter/Space o pointerType touch; no injection/force | Registrados keydown Enter/espacio y pointerdown touch en cada ruta. Sin locator.focus(), close.focus(), handlers falsos, links externos ni escrituras. |
| Titulo/descripcion e hit | aria-labelledby/describedby resuelven nodos conectados y texto; Cerrar alcanzable |12/12; raw IDs/nodos/hit/scroll/activeElement en JSON. |
| Owner/batch/unmount/disconnected/newer-open/prevnext | No retornar a elemento antiguo o robar foco mientras sigue abierta otra sesion propia |27/27 controles puros/ref/AST, no UI de cuentas/multiple vino ni certificacion hardware. |
| Limites protegidos | Notice10/retry08/procedencia09/guardado/queries/calculo/indices intactos | Inicializadores byte-identicos; tres funciones y cierre recuperan AST previo al quitar solo metadata de foco.23 fuentes y796 entradas05-10 intactas. |
| Typecheck/lint scoped11 | Exit0 | Ambos exit0, sin warnings nuevos. No repetir suites05-10/builds. |

Antes y despues, cada contexto1 OCRstub/1 busqueda canonicastub vacia/1 GET perfilnull; ninguna repeticion al abrir/cerrar.0RESTwrites intentadas,0 remoto de app/proveedor/pagado/cuentas reales;0 errores runtime/consola. HTTP/WS interceptados antesfakeauth/navigate, firma invalida, SWblock, analyticsfalse. Solo mismo contratoBOTH04/08/09/10 e imagenIMG_7547 2.jpg SHA2562b1da6ac2ab548346df754cc67a76b6d7a25cc28efb893564d49b9f7508c4194. No nueva verdad canonica ni perfil positivo, ni doce humanos/escenas.

## Evidencia Y Limites

docs/qa-evidence/matchrim-menu-focus-2026-10-13:143 entradasSHA/72PNG/27 fuentes finales24baseline/23protegidas. source-stages.json enlaza baseline/final y snapshots de Vaul/Radix ya instalados; primary.json conserva foco inmediato/asentado/retornos/scroll/counters. before/results.json y after/results.json guardan tracesTab/ciclos y eventos/readbacks; checkpoint11.md precede producto. Capturas clave before/row-Enter-portrait-opened.png, after/row-Enter-portrait-opened.png y after/pin-Space-landscape-close-return.png muestran foco y retorno. Warning inicial del stringregex Python eliminado con stringraw; no cambio del recorrido.

Microcontrol10 unicamente comprueba aviso propio ausente al abrir, porque11 cambia entrada de foco; no se reejecuta el QA10 de colas/lifetimes. Cola global y dismissal exacto permanecen byte-identicos. No afirmar que cualquier aviso ajeno sea universalmente inocuo/visible.

Siguiente hueco real de cobertura, no ejecutado: este replay tiene un unico resultado; botones Anterior/Siguiente deshabilitados y el ciclo deTab queda en Cerrar. Retener opener al cambiar contenido esta probado en refs/AST, no en UI con varias fichas, filtrado de fila o lectura/desplazamiento de cuerpo largo con teclado. No inventar defecto ni afirmar esas rutas aprobadas. VoiceOver/DynamicType/iOS/dispositivo y recomendacion real siguen gates separados.

Sin backend/auth/RLS, fotos remotas, cuota/paid, cuentas/contactos, push/deploy, Apple/TestFlight ni build. Invitacion anterior permanece pendiente;11 no revisa ese gate. No producto/camara/backend/native COMPLETE. Aceptacion del delta pendiente de revision del coordinador.
