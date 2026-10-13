# Matchrim: Revision Explicita De Precios De Carta

## Alcance

Continuacion local de dos horas iniciada el 2026-10-13 a las 09:13:57 UTC, desde `3e75f30abc79c6262f96b06515437aec1e728a90` limpio. Este primer bloque complementa la nube, que trabaja en memoria y teclado del detalle de etiquetas. No hay push, deploy, imagenes al proveedor, persistencia alojada, telefono, Apple, version nativa nueva o TestFlight.

## Correccion

| Before | After | Why |
| --- | --- | --- |
| Importe editado inmediatamente, sin asignacion explicita en cartas con ambos formatos | Borrador con importe, formato y moneda; Aplicar/Descartar | No adivinar copa o botella ni guardar un borrador por accidente |
| `35,50` desaparece del campo | Parser decimal estricto con coma o punto; cero diferenciado de dato ausente | Entrada local habitual sin coercion silenciosa |
| Cambio de moneda conserva otros numeros como si fueran de la nueva divisa | Solo el importe confirmado usa la nueva moneda; lectura original queda adjunta | No fingir FX ni reinterpretar precios |
| No hay procedencia por formato para dos correcciones | Copa y botella manuales separadas; otras lecturas mantienen su origen | No atribuir al usuario precios leidos o inferidos |
| Edicion posterior parece cambiar una fila ya guardada | Precio bloqueado tras recibo confirmado, incierto o identidad retenida | Las acciones sucesivas solo actualizan favorito/estado, no metadata de precio |
| Selector al 200% puede sacar EUR de la pantalla | Altura limitada al espacio disponible, opciones de 44 px y texto sin truncar | Reflow local sin alterar el Select compartido |

El formato asignado a un importe no modifica `servicio` ni acredita disponibilidad. Si la carta dice solo copa y el usuario asigna botella, Bodega muestra disponibilidad pendiente. El scalar financiero sigue restringido a botella EUR, identidad confirmada y evidencia no inferida; ambos/moneda extranjera/servicio dudoso no se promueven. Guardar no es compra, cata, rating o aprendizaje.

Snapshot v1 conserva todos los campos antiguos y anade opcionalmente `manual_assignment`: ultimo formato/importe/moneda, precios manuales por formato y lectura original. La validacion rechaza discrepancias entre assignment, raw_amount, currency y precios. Lecturas originales sin formato o moneda siguen visibles como pendientes. El ingreso de vision elimina marcas de origen manual antes de la normalizacion existente; un modelo no puede autocertificar una correccion humana.

Identidad, confianza, ficha, afinidad, escritor SDK, ledger de tarjeta, owner y callbacks permanecen en sus limites anteriores. Once fuentes independientes y ocho inicializadores protegidos comparados con baseline; ninguna afinidad aparece por editar el precio. El comparador recibe precios por unidad, nunca un importe generico ambiguo.

## Matriz Final

| Recorrido | Expected/Actual |
| --- | --- |
| Ambos, copa o botella manual | Solo formato elegido cambiado; disponibilidad original preservada |
| Dos formatos manuales | Ambas correcciones conservadas y etiquetadas Manual |
| EUR a GBP | Otra unidad queda sin importe activo; EUR original y GBP manual distinguibles |
| Cero / coma / invalidos / datos incompletos | Cero y 35,50 admitidos; negativos, exponentes, mixtos y ausencia bloquean Aplicar |
| Descartar / claim manual del proveedor | Lectura original sin assignment; marca falsa del proveedor eliminada |
| Comparador / filtros / presupuesto | Seleccion de dos referencias persiste; botella35 no usa antiguo25 con limite30; copa usa12 |
| Guardado / recibo vacio | Sin edicion silenciosa ni segunda intencion; metadata y scalar verificables en memoria |
| Teclado / retrato / paisaje / 320 px al 200% | Tab y seleccion real, controles nuevos >=44 px, sin overflow ni lineas superpuestas |

Final primario: **40/40 contextos, 710/710 checks**. Son recorridos de cliente, no personas ni escenas independientes. **123/123 contratos**, incluidos 46 casos de paridad exacta de snapshots/lector antiguos, mas contratos existentes save48/list15/comparison17/actions27. `npm run test:release`, typecheck, lint y build exit0. Lint completo: cero errores y 106 avisos heredados; lint de los modulos nuevos/modificados no anade avisos. Build web reproducible, 146 ficheros; no se copia a iOS ni se publica.

Confirmacion local del precio: 32 muestras, media **37.56 ms**, max **49.75 ms**. Incluye click y consulta DOM en Chrome de este Mac; no es latencia OCR/backend ni rendimiento de iPhone.

Baseline: tres recorridos fallan por falta de formato/Aplicar, y coma decimal pierde el importe. Se conservan rondas intermedias rojas: dos selectores de tabla/disclosure del harness, temporizacion de foco al cerrar Radix, y un fallo real de dropdown en 320 px/200%. La primera validacion de actions tenia una ruta de recibo inexistente; se repite con copia identificada del recibo historico, sin reescribirlo. No se convierten esos fallos de instrumentacion en defectos de produccion.

## Evidencias Y Reproduccion

- `qa-evidence/matchrim-menu-price-resolution-2026-10-13/primary-final/results.json`: expected/actual, payload SDK interceptado, egress y hashes exactos de fuentes.
- `summary.json`, `manifest.json` y `validation-final/validation.json`: 326 entradas, 271 PNG incluidas rondas previas; 2,130 entradas anteriores permanecen byte-identicas.
- Capturas: `primary-final/currency-portrait-read.png`, `compare-landscape-bottle-compare.png`, `multi-format-portrait-applied.png`, `zoom-narrow-viewport.png`.
- `scripts/qa-matchrim-menu-price-resolution-oct13.py --stage after --output <nuevo-directorio>` sobre Vite local con analytics=false y fixtures=false. Usa boton Subir archivo/FileChooser, no input oculto ni estado React inyectado. Wrapper with_server.py y entorno Playwright existente; puerto4475 libre antes/despues.
- `python3 scripts/validate-matchrim-menu-price-oct13.py --output <nuevo-directorio>` y packager documentado. No regeneran datasets ni ejecutan vision.

HTTP/WS no locales interceptados antes de auth/navegacion; SW bloqueados, firma deliberadamente invalida, memoria SDK descartada. Cero egress real, escrituras alojadas, cuentas, llamadas pagadas o usuarios humanos. Una imagen publica de menu de comida ya existente sirve como canary de pixels; los vinos/precios son contratos sinteticos congelados y no describen esa foto. No se reutilizan fotos privadas del propietario.

## Residual

No se certifican OCR/canonical accuracy, disponibilidad real, preferencia humana, RLS/persistencia alojada, Safari/WebKit, Dynamic Type o VoiceOver nativos. WebKit/Firefox no estan instalados en el entorno; no se descargan. Las gates nativas, de memoria y de distribucion siguen separadas; no hay nuevo porcentaje global inventado.

Hallazgo siguiente observado en QA: la ficha propone `Parecido 92%` usando atributos inferidos de vision y puede comparar `Sin tipo` como una coincidencia. Se abordara en un segundo delta, sin recalibrar gustos ni presentar mocks como mejoras de inteligencia real.
