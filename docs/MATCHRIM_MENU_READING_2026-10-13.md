# Matchrim: lectura de cuerpo con teclado (13)

## Resultado

Nueva cobertura local preparada para revision sobrec5c7b283ba860251af36b5eefe6d4120e648b2f0. Baseline13 pasa4/4 rutas y116/116checks. No defecto P0/P1 de lectura reproducido en ese alcance, por lo que NO se cambia producto ni se inventa una ejecucion after-fix. Scanner antes/despuesSHA799cad0234299a39e9ce09ce8a4aa1e1bbb356716bde2fa439bebf2e3490b962.

El cuerpo real div.overflow-y-auto entra porTab en Chromium aunque tabIndex=-1. PageDown/ArrowDown/End permiten leer el ultimo parrafo existente; PageUp/ArrowUp/Home funcionan en ese contenedor. No se anaden listeners de comportamiento, scrollTo/scrollTop assignments, focus/scrollIntoView/wheel/force, contenido, roles o CSS. Listener de registro pasivo y CDP/ariaSnapshot solo observan.

## Antes Y Despues

| Before | After | Why |
| --- | --- | --- |
| Captura inicial con contenido inferior recortado | Teclas nativas desplazan el cuerpo hasta el ultimo parrafo visible y alcanzable | Antes/despues son estados del mismo codigo, no correccion de layout. |
| Tab alDIV ya observado12, sin probar desplazamiento |4 nuevas rutas con ocho estados original/cambiado; lectura final, Home/End/PageUp/Down/Arrow verificados | Cobertura faltante cerrada sin repetir12entero. |
| Scroll de cuerpo y pagina sin distinguir | Readbacks separados demuestran pagina estable y scroll interno real | No fabricar lectura moviendo pagina/viewport. |
| Posible etiqueta accesible ausente | AXgeneric/nameempty/ignoredfalse registrado; sin parche a ciegas | Funcion de teclado pasa; no inventar fallo ni certificar lector fisico. |

## Matriz De Pruebas

| Prueba | Expected | Actual |
| --- | --- | --- |
| FilaBarbaresco viaTabEnter, clusterrealLaurent viaTabSpace,393x852/852x393 | Tab real hasta cuerpo, foco interior |4/4 rutas; listener confirma teclas reales, sinfoco delharness. |
| Ocho estados de cuerpo | Overflow real oN-A sin estirar |8 conoverflow;0N-A. Rama nooverflow delrunner no ejercitada, no certificada. |
| ArrowDown/PageDown/Home/End/PageUp/ArrowUp | Cambiar scrollbody, conservar document-scroll/foco |116/116checks totales; ultimo parrafo completo visible/hit conEnd ysoloPageDown. |
| SalidaShiftTab/Tab | Close ynav habilitada existentes |4/4 rutas; nada de focoglobal/inyeccion dehandlers. |
| Cambio de un vino despues de leer | Nuevoindex/title, clamp nativo y sinrobo de foco |4/4: fila1→0 ycluster3→2, lectura delnuevo cuerpo tambienpasa. No full12rerun. |
| Escape/Cerrar tras cuerpo | Retorno altrigger original ypagina estable |4/4 ambos. Micro11solo esta transicion de lectura. |
| Codigo/recibos anteriores | Sin cambios deproducto/gates |25 fuentes protegidas byte-identicas y1114 entradas05-12 intactas. Lint/typecheckfrontend/build/suitesverdes no rerun por no modificarproducto. |

ScrollHeight/clientHeight/max originales: filaPortrait778/572/206, filaLandscape573/172/401, clusterPortrait802/572/230, clusterLandscape597/172/425. PageDown llega205/401/229/425px respectivamente (tolerancia2px por redondeo). Tras cambiarvino:718/571/147,553/172/381,778/572/206,573/172/401; scroll se mantiene oclampa nativamente, sin reset nuevo. Fragmento final visible: No es un resultado negativo ni significa que este vino no te guste.

Contadores por contexto3OCRlocal/2canonicalempty/1GETprofileNULL, sinincrementos porleer/cambiar/reabrir.0RESTwrites intentadas/remoto deapp/proveedor/pagado/cuentas reales,0erroresruntime/consola. HTTP/WSantesfakeauth/navigate, firma invalida/SWblock/analyticsfalse. CorpusbothContract4 yfoto inmutables SHA1c6d8bd4e5d9aa392f476a66ba7a86e8c6a055f752110f3bef008450c6de6e9e y2b1da6ac2ab548346df754cc67a76b6d7a25cc28efb893564d49b9f7508c4194. Unaescena/replay, no personas/vision/canonicaltruth ni perfil positivo.

## Evidencia Y Limites

docs/qa-evidence/matchrim-menu-reading-2026-10-13:70 entradasSHA,12PNG,27 fuentes finales/25baseline,25protegidas. before/results.json guardaactiveElement/body+document-scroll/keytrace/fragment/hit/AX/ariaSnapshot/inputmethod/contextos yretornos; primary.json resume116checks/ocholecturas. source-stages.json marca productCodeChangedfalse yscannerSHAigual. Capturas inicial y original-bottom/changed-bottom son misma ejecucion sin edicion. checkpoint13.md precede pruebas/producto.

Siguiente hueco concreto observado, no ejecutado: el cuerpo se expone enAX como generic sinnombre, mientras elDialog ylosstatus de afinidad tienen contexto. No se ha probado como identifica/anuncia ese foco un lector, ni navegacion en otro motor que no use el foco nativo decontenedores scroll. Es un gate de validacion semantica/lector, no fallo de teclado certificado ni permiso para parchear/usarhardware. Refinamientos reales/latencia/cuota siguen aparcados.

Sin globalDrawer/SDK/CSS/motion/pipeline/normalizacion/matematica/precios/canonical/query/save/ledger/feedback/training/refs11/guardias12 cambios. Sin Apple/telefono/VoiceOverfisico/TestFlight/contactos/build/push/deploy/subida/nuevoLLM/permisos. Invitacion previa pendiente ysinoperar ese gate. No producto/camara/backend/native COMPLETE.
