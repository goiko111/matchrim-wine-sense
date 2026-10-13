# Matchrim: continuidad de foco multificha (12)

## Alcance

Delta local preparado para revision, baseline7a3171bb753f0b64a1f5b46813e1c1a7f65f50de. WineMenuScanner.tsx agrega dos refs y guardias de foco en botones Anterior/Siguiente. Si la navegacion llega al limite que deshabilita el boton actualmente enfocado, pasa primero el foco al opuesto habilitado con preventScroll. Solo si document.activeElement===event.currentTarget; no roba otro foco ni usa targetglobal arbitrario/asincronia. Indices/clamps/opener11/guardsowner-batch/notice10/retry08/procedencia09 y datos intactos.

Corpus inmutable: docs/qa-evidence/matchrim-menu-list-2026-10-12/before-complete/input-provenance.json SHA1c6d8bd4e5d9aa392f476a66ba7a86e8c6a055f752110f3bef008450c6de6e9e, bothContract entero4 candidatos/layout/coverage/posiciones/precios/sensory/uncertainty sin editar. Imagen previaIMG_7547 2.jpg SHA2b1da6ac2ab548346df754cc67a76b6d7a25cc28efb893564d49b9f7508c4194. No cuatro vinos reconocidos fisicamente ni personas ni nuevoOCR real/canonicaltruth/perfil positivo.

## Antes Y Despues

| Before | After | Why |
| --- | --- | --- |
| Llegar indice3 deja BODY con teclado o Siguiente deshabilitado con toque | Foco en Anterior habilitado, dentro de ficha | El control activado no desaparece del recorrido de teclado. |
| Llegar indice0 mantiene Anterior deshabilitado enfocado | Foco en Siguiente habilitado | Mantener continuidad sin reenfocarCerrar en cada cambio. |
| Reentrar conTab desdeBODY desplaza pagina en4 rutas teclado | Scroll de pagina constante en todos los cambios | Foco local preventScroll antes de deshabilitar; no espera/ocultacion. |
| Nombre/index/descripcion, mismoDialog y retorno externo ya pasan en nuevos recorridos | Permanecen coherentes; retorna fila/cluster original aunque vinoactual cambie | No reescribir comportamiento que ya funciona. |
| Podria imponerse contador ficticio1/1/1 al corpus4 | Se conserva el contador real3OCR/2canonicalempty/1GETnull | No tocar consultas/pipeline para fabricar verde. |

## Matriz De QA

| Prueba | Expected | Actual |
| --- | --- | --- |
| Baseline corregido sobre producto intacto | Reproducir solo multificha y limites |8 rutas,652/672 checks;0contextos aprobados.16 fallos de foco en extremos y4 scrolltrasreentrada teclado. |
| FilaBarbaresco conTab+Enter o toque; clusterreal conTab+Space o toque; ambasorientaciones | Indices1→2→3→2→1→0→1→2; cluster empieza3 y pasa2→1 antes del mismo camino |8/8 rutas;672/672checks finales. |
| Limites0/3, focoinmediato/asentado,TabShiftTab/ciclos/hit | SinBODY/disabled/noCloseReset, controles habilitados alcanzables | FocoSiguiente en0/Anterior en3, mismoDOMDialog y pagina estable. |
| Contexto por cada cambio | Index/nombre/title y productor/region/description actuales; limites correctos | Todos comprobados, JSON completo de transiciones/refs accesibles. No certifica anuncioVoiceOver. |
| Escape desde otro vino | Volver al boton externo original, no ultimo vino |8/8 exactos; fila/cluster original retenidos. |
| Nueva apertura por pinreal1Lugana, luego Cerrar | Nueva sesion/opener de ese pin, no fila/cluster anterior |8/8 exactos. |
| Guardia autofocus/index/propios frente a foco ajeno/refnull | Solo reenfocar contraparte en limite si el propio boton tenia foco; mismos clamps/indices |32/32 controles puros/AST. No cuentas/dispositivo. |
| Limites protegidos y typecheck/lint scoped12 | Algoritmos/queries/ledger/refs11/notice10 no cambian | Inicializadores/efectos byte-identicos; callbacks tras quitar solo guardia equivalen al AST previo;24 fuentes/939 entradas05-11 intactas. Typecheck/lint exit0. |

Cada contexto antes/despues tiene3OCRstub iniciales,2 busquedas canonicas vacias y1GET perfilnull. No incrementos al navegar/reabrir. Estos NO cumplen el supuesto1/1/1 heredado del caso de un vino: el pipeline intacto refina al recibir el contrato4 y busca dos candidatos confidence0.88. No se desactiva ni esconde nada. El mismo contrato4 completo se responde localmente a cada invocacionOCR; esto no valida OCR por region ni sus posiciones como verdad visual.0RESTwrites intentadas,0 remoto de app/proveedor/pagado/cuentas reales;0 errores runtime/consola. HTTP/WS antesfakeauth/navigate, firma invalida/SWblocked/analyticsfalse.

## Evidencia Y Residual

docs/qa-evidence/matchrim-menu-navigation-2026-10-13:175 entradasSHA/104PNG/28 fuentes finales25baseline/24protegidas. source-stages.json enlaza etapas y protege05-11; primary.json y after/results.json guardan matrices/inputmethod/eventos/indices/title/foco/opener/scroll/boundaries. Capturas before-complete/row-keyboard-landscape-boundary-3.png y after/row-keyboard-landscape-boundary-3.png muestran BODY previo vs Anterior enfocado. checkpoint12.md precede producto.

Primera pasada before/ tuvo264checks,254passed y8 excepciones deharness: asumio singletonpin4 y cluster abriese indice1. Runtime observado tiene pin1Lugana y cluster deLaurent/Barbaresco/Barolo que abreLaurentindice3. Se corrigio solo elrunner y se completo baseline antesdeeditar producto; no nuevasposiciones/fixtures ni los errores se clasifican comoapp. Las primeras capturas/recibos siguen conservadas.

Siguiente hueco concreto observado, no ejecutado: con coverage reported_complete4 aparecen3 invocacionesOCR iniciales. Este replay reemite la respuesta completa y no prueba contratos/regiones de los refinamientos ni su necesidad/latencia. Falta validacion fiel de esas regiones para medir exactitud/coste; no afirmar defecto devision ni cambiar pipeline por inercia. Lectura/desplazamiento de cuerpo con teclado y VoiceOver/DynamicType/iOS real siguen sin certificacion.

No build/suitesverdes05-11 repetidos, backend/auth/RLS/stock/feedback/rating/train, SDK/globalDrawer/CSS/animacion, provider quota, archivos de otras tareas, Apple/telefono/TestFlight/contactos/push/deploy/subidas. Invitacion anterior pendiente;12 no opera ese gate. No producto/camara/backend/native COMPLETE.
