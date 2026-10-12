# Matchrim06: acciones sucesivas sobre la misma tarjeta

## Estado Y Baseline

Delta local06 sobre `9469921d260bf8d88f91a7e313a926358efdc397`. Repo limpio al iniciar. Escritor activo WineMenuScanner.tsx SHA256 `1944b506f304b51d5de3ef48c0385cfe5cbe97f6b1da2b966b1a86b5d350baa4`. Checkpoint antes de editar producto: `qa-evidence/matchrim-menu-actions-2026-10-12/checkpoint06.md`. No sustituye encargos humanos, no es cierre de Matchrim ni release.

Antes se sospechaba duplicacion solo por inspeccion estatica. Se reprodujo primero la secuencia real del cliente Quiero Probar -> Anadir favorito -> Lo he probado, con SDK interceptado y memoria local. Tres POST devolvieron tres IDs distintos: ...001 wishlist/favorite=false, ...002 wishlist/favorite=true, ...003 tasted/favorite=false. La cata perdia el favorito y quedaba separada de las otras filas. Cinco checks del nuevo contrato fallaron; no fue un nuevo benchmark OCR ni escritura alojada.

## Correccion

| Before | After | Why |
| --- | --- | --- |
| Un insert por boton sobre la misma tarjeta | Un insert y dos PATCH al ID confirmado y owner exactos | Una referencia, varias intenciones coherentes |
| Lo he probado pierde favorito | PATCH solo status=tasted; favorito permanece | Estado, marca transversal y rating no son intercambiables |
| Favoritar una cata puede crear wishlist separado | PATCH solo is_favorite=true | No degradar cata ni reescribir historial |
| Editar identidad tras guardar puede volver a insertar con otro nombre | Hold visible, sin modificar la referencia anterior ni crear alias | Una edicion no acredita que ambas identidades sean el mismo vino |
| Respuesta correcta de otro ID podria usarse como nuevo vinculo | Comprobacion del ID retenido, owner, rating null y metadata05 | No certificar una representacion ajena o incoherente |

Ledger solo en memoria del propietario/componente/lote actual, por indice de tarjeta. No deduplica nombres, productores, otras tarjetas, annadas/SKU, filas anteriores o rescans. Una seleccion de archivo/clear inicia otro lote; nunca se resetea automaticamente para reintentar una respuesta incierta.

La mutacion posterior contiene exclusivamente la intencion necesaria: `is_favorite=true` y/o `status=tasted`. No envia nombre, precio, metadata, cantidad, rating, atributos ni entrenamiento. El ID es el devuelto por el primer insert confirmado, nunca uno calculado por nombre. Un delta vacio no solicita PATCH. El precio manual BOTH35 sigue sin scalar, con lecturas25/25 y estado pendiente; los datos inferidos siguen sin ficha/score/aprendizaje.

Cada representacion se contrasta con ID/owner y snapshot congelado05; si falta, cambia ID/owner, pierde favorito/estado o metadata, queda sin confirmar y bloquea repeticion inmediata. Una escritura pudo realizarse aunque no se confirme. No se reinserta ni se afirma que fue rechazada. Edicion durante el insert tambien mantiene hold: puede conservarse el recibo de la identidad original, pero no se etiqueta exito sobre la identidad editada.

Vida/owner/generacion de lote invalidan callbacks tardios. El cambio de owner de QA usa un evento BroadcastChannel del SDK instalado y sesion de firma deliberadamente invalida; no es login real ni cambio de cuenta certificado.

## Matriz Y Evidencias

| Recorrido | Expected/Actual Final |
| --- | --- |
| Wishlist -> favorito -> tasted | 1 POST + 2 PATCH, ...001, tasted AND favorite, rating null |
| Tasted -> favorito | 1 POST + 1 PATCH; sin enviar wishlist ni perder cata |
| Solape/dobleclick inicial | Solo un insert pendiente; otras intenciones bloqueadas; luego mismo ID |
| Vacio/wrongID/wrongowner/metadata incoherente en segundo recibo | No etiqueta Favorito; hold; no tercer intento ni reinsert |
| Identidad editada despues o durante primer guardado | Solo primer POST; hold visible; referencia original sin alias |
| Owner change/unmount con segundo recibo tardio | Mutacion anterior conserva ID/owner originales; no exito en nuevo contexto |
| Nuevo lote antes de segundo recibo | No marcador antiguo; nueva primera intencion habilitada; no vinculo automatico |
| Lectura Favoritos y Ya Probados | Misma unica fila con favorito y cata sin rating; metadata pendiente05 y controles visibles |

Primario: 26/26 contextos (13 recorridos, retrato393x852/paisaje852x393), 370/370 checks. No son usuarios independientes. Ademas, dos contextos de lectura visual, cuatro vistas, 18/18 checks y cero mutaciones: reutilizan la fila realmente obtenida en el recorrido interceptado, sin volver a ejecutar el scanner.

27/27 contratos de intencion, identidad, confirmacion y limites AST activos complementan la UI. Compilacion acotada a los dos modulos cambiados y la declaracion Vite existente, con dependencias importadas: verde. Lint especifico de scanner/helper/contrato: cero errores y warnings. No se repitieron05, otras suites ni builds verdes. La primera configuracion acotada omitio declaraciones Vite; se corrigio el config de QA, no el producto.

Se conserva un after intermedio 24/26: los dos batch fallaban porque reseleccionar el mismo archivo no emitio onChange y no hubo segundo scan. Se repitieron SOLO esos dos casos con identicos bytes y distinto nombre de File; hubo nueva seleccion y pasaron. El disclosure/expanded se abre segun estado, no con clicks a ciegas. Se mantienen los recibos/capturas rojos; no se contabilizan como fallos de invalidacion de lote demostrados.

Resultados de IDs/intenciones/payload/checks: `qa-evidence/matchrim-menu-actions-2026-10-12/primary.json`. Source-stage hashes y copias .txt en `source-stages.json`, sources/ y baseline-sources/. 92 PNG conservados, 72 primarios; 126 entradas SHA256. Seis fuentes05 protegidas y las 289 entradas de su manifest siguen byte-identicas. Baseline, rondas diagnosticas y visuales tienen denominadores separados; un recibo intermedio identifica hash de producto sin snapshot completo de aquella fuente transitoria.

HTTP/WS interceptados antes de auth/navegacion; service workers bloqueados. Fake auth invalida, memoria descartada por contexto. Cero cuentas/usuarios reales, llamadas remotas de app/proveedor, llamadas pagadas, OCR nuevo o persistencia/RLS verificada. No runtime exceptions ni overflow horizontal. La lectura visual verifica los botones por encima del menu en retrato/paisaje; no es VoiceOver/Dynamic Type/QA nativo.

## Reproduccion

Desde `/Users/GOIKO/2matchrim76-recognition-20261008`, harness `scripts/qa-matchrim-menu-actions-oct12.py` con servidor Vite local4453, analytics=false y wrapper with_server ya usado en05. `--cases` permite los 13 recorridos nombrados en la matriz; por defecto solo sequence:portrait. `--readback-fixture <receipt-after/results.json>` hace prueba visual de lectura sin nuevas mutaciones/scanner. No desactivar egress ni usar la sesion sintetica contra un backend.

Contrato: `npx tsx scripts/check-matchrim-menu-actions-oct12.ts <artifact06>`. Config acotado en tsconfig-scoped.json; comandos/exitcodes en validation06.json. No produce build de distribucion. El helper es `src/utils/menuWineActions.ts`; la unica integracion de producto tocada es el scanner activo. Sin cambios en AuthContext/MyWines/SDK/schema/RLS/funciones.

## Residual Y Gates

Siguiente hueco nuevo observado en pixels: el header del scanner dice `Sin encaje` cuando el score falta, aunque el texto aclara que falta perfil/ficha. `getWineDecision` lo confirma; `after-batch/batch-portrait-last.png` lo muestra. Separar afinidad pendiente de afinidad negativa es el siguiente delta de semantica de inteligencia; no se ha cambiado ese bloque en06.

Otros residuales acotados: resolver el hold de identidad con una decision explicita y verificable, diferenciando conservar la referencia original, revisar el candidato o guardar otra referencia. Hoy no se permite alias silencioso; el hold no tiene una resolucion completa dentro de esa tarjeta. Ediciones de precio/moneda tras el primer guardado tampoco se escriben de forma implicita por estas acciones; necesitan un flujo propio de revision de metadata.

No es deduplicacion persistente ni solucion de concurrencia entre dispositivos/contextos remotos. Salir/reentrar/rescan no une filas anteriores. Backend/RLS, exactitud independiente del proveedor, cuentas humanas y QA fisico siguen separados. La misma seleccion de archivo sin cambio de File no inicia otro analisis en este harness Chrome; no se extrapola como fallo de galeria iOS sin probarlo.

Gates humanos agrupados: acceso autorizado para escritura/readback alojados y QA de dispositivo/canal de distribucion; sesion del propietario Apple para la invitacion solicitada y TestFlight. No se han pedido de nuevo ni inspeccionado Apple. Sin push, deploy, produccion, nativo ni TestFlight en06.
