# Matchrim: Estilos, Edicion Continua Y Reflow

Segundo bloque local sobre `ca73c57efa52c205fc173fb69e5f0ac11ae90f7c`. No sustituye la nube ni la evidencia de precios. Cambios locales, sin push/deploy/provider/hosted writes/telefono/Apple/TestFlight.

| Before | After | Why |
| --- | --- | --- |
| Parecido92% con atributos inferidos de vision | Sin sugerencia numerica; ficha sensorial verificada obligatoria en ambos vinos | La foto no acredita el estilo sensorial |
| Parecido100% con solo tipo coincidente y atributos ausentes | Estado Parecidos pendientes con dato faltante | Tipo/uvas desconocidos o inferidos no son medidas sensoriales |
| Porcentaje parecido confundible con gusto personal | Banda cualitativa y origen de cinco atributos de fichas Winerim | Comparacion de fichas, no probabilidad ni afinidad personal |
| Nombre editado desmonta la tarjeta tras el primer caracter | Clave estable menu-row-index, misma que el ledger de tarjeta | Conservar foco/borradores sin cambiar ID ni acreditar identidad |
| Nombre y controles recortados en320px/200%, aunque no hay page overflow | Padding movil acotado, texto reflow, botonera de una columna y controles >=44px | Comprobar contenedor/ancestros, no solo ancho de pagina |
| Texto de descarte partido en zoom | Icono familiar de deshacer, nombre accesible y tooltip | Herramienta compacta sin truncar comandos |

La similitud solo utiliza cinco valores numericos finitos1-5 de dos fichas de catalogo, IDs no vacios e identidades confirmadas con confianza normalizada finita. Devuelve diferencias por dimension y distancia euclidea acotada, sin tipo/uvas inferidos. Misma referencia no se sugiere a si misma; annadas conocidas diferentes no se colapsan. Datos ausentes son null, no score0; el wrapper usa0 solo para excluirlos del listado anterior. Umbral50/bandas son heuristicas de comparacion de fichas, no calibracion humana. Madera/aromas/intensidad no se inventan ni se incluyen como dimensiones disponibles.

No se modifica perfil, formula de afinidad, identidad canonica, escritor SDK, ledger, precios/unidades/monedas ni deteccion. Ocho inicializadores activos, ocho fuentes independientes y seis inicializadores de negocio del editor protegidos. La edicion manual sigue invalidando ficha/afinidad/confianza; la clave estable no transforma esa edicion en identidad confirmada.

## QA Y Evidencias

Final: **20/20 recorridos, 264/264 checks**, **94/94 contratos de estilo** y **123/123 contratos de precios**. Casos: vision, ficha ausente, tipo ausente, falso catalogo del proveedor, edicion de una vez y letra a letra, una referencia, carta sintetica de30, retrato/paisaje,320px/200% con ficha/formulario abiertos. Medidos texto/controles/ancestros recortadores,44px, ultima accion sobre menu inferior, referencias separadas, abstencion, HTTP/WS, errores y ausencia de escritura. No son20 personas/escenas independientes.

Release tests, typecheck, lint y build pasan; lint0errores106warnings heredados.2466 no es el denominador: se preservan exactamente **2456 entradas** previas (2130 historicas mas326 del bloque de precios). Manifest nuevo:238 entradas y172PNG, incluidas rondas intermedias; build146ficheros, sin qa-pages ni copia iOS.

Se conserva el primer16/16 con160checks: el ancho de pagina no detectaba recortes locales. La inspeccion de pixels anadio guard de texto y detecto heading213px en caja124px, despues clipping en parrafos/formulario. Se conservaron los rojos y se repitio con guard de ancestros. Escritura secuencial pierde Revisado y foco antes; despues conserva toda la cadena en ambas orientaciones. Primer caret End no es fiable en Mac: se corrigio a ControlOrMeta+ArrowRight y se reprodujo otra vez el fallo antes de editar producto. No se atribuye esa correccion de harness a la app.

- `qa-evidence/matchrim-menu-style-evidence-2026-10-13/primary-final/results.json`: expected/actual, geometria, requests y hashes de fuente.
- `before/`, `typing-before-corrected-caret/`, `form-reflow-before/`: fallos observados conservados.
- `primary-final/price-zoom-narrow-price-editor.png` y `typing-portrait-viewport.png`: formulario legible y foco/acciones.
- `contracts-final.json`, `validation-delivery/`, `summary.json`, `manifest.json`: contratos, compilacion e integridad.

Reproduccion: scripts/qa-matchrim-menu-style-evidence-oct13.py --output <nuevo-directorio>, wrapper with_server/puerto4476 y analytics=false/fixtures=false. Usa Subir archivo/FileChooser y teclas reales, no estado React inyectado. Contratos: npx tsx scripts/check-matchrim-menu-style-evidence-oct13.ts <nuevo-json>. Packager conserva fuentes y hashes.

Canary: imagen publica de menu de comida ya existente con contratos sinteticos antiguos de vino; no describe reconocimiento de esa foto. Perfil null/catalogo vacio en UI, firma invalida, egress interceptado antes de navegar. Positivos matematicos exclusivamente sinteticos en contrato, no fichas positivas inyectadas en UI, datos reales de Winerim ni resultados humanos. Cero cuentas/calls pagadas/persistencia alojada. No se certifica panel positivo con catalogo real, Safari, VoiceOver/Dynamic Type nativos, precision/recall o mejora de recomendacion real.

## Continuidad

La nube termino su turno: reporta120min, commits005d907/08fc4b6/3b18c1e/60c7192/3845c72,425checks y600ciclos. Son resultados reportados por ese carril, no rerun local ni codigo integrado. RSS/memoria nativa sigue pendiente; no se suma ese denominador al QA local. Patch e informe siguen en la conversacion cloud6acde10d-5198-83eb-9c5e-eba222059fe2; integracion requiere revisar conflictos del scanner y repetir gates combinadas.

Siguiente borde local reproducido: editor acepta1,25JPY y formatter muestra1JPY. Se corregira precision de moneda sin FX, preservando datos originales y evitando promocion financiera de importes invalidos. Calidad de modelo, datos humanos, hosted/RLS, native/firma/Apple permanecen gates independientes; ninguna subida autorizada por estos resultados.
