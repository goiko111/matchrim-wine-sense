# Matchrim: Continuacion 159-161

Actualizacion03:46 UTC. El candidato104/r1 compila y pasa texto maximo. El reescaneo161 real falla antes de enlazar una ficha; no se considera aprobado. Nueva correccion163 del selector manual pendiente de recompilar y validar visualmente. No es un aprobado de TestFlight.

## Resultados Reales Posteriores

- `candidate104-r1`: typecheck y bundle PASS, fuente limpia `1a863e2`; `uikit104-r1`: compilacion e instalacion PASS. Sin archivo firmado nuevo ni subida.
- `cellar144-max158-r2`: PASS en UIKit a accesibilidad extra-extra-extra grande; dos vinos existentes, afinidad actual/inicial y cinco factores. Ajuste original large restaurado con recibo del host. Dos auditorias Apple sin filtrar y19 adjuntos requeridos. No certifica voz hablada ni todos los pixeles desplazados.
- `rescan161-r1`: FAIL real conservado, 104.8s, lectura local y busqueda sin propuesta/ficha enlazada. Ningun login, guardado, valoracion o modelo solicitado. La miniatura Flor de Muga219x692 no muestra cosecha; el diagnostico local162 con el plugin sin modificar lee Muga-, Plor, Muga y RIOJA con senal0.5. No es evidencia suficiente para asignar Flor2022 ni heredar su valoracion. El diagnostico no reproduce el preprocesado de galeria.
- `native112-corpus200-r10`:148 evaluables,52 incompletas (antes141/59),39 listas con propuestas (antes38),31 top1/33 top3 contra nombres de archivo (antes30/32). Seis listas sin el esperado, seis abstenciones. Conserva200 salidas Vision reales previas, no200 nuevos recorridos de galeria. No es precision/recall experta ni200 identidades verificadas. Gate NO-GO, salida1.
- `vision122-lower-half-r1`:20 imagenes en copia aislada del plugin;016 sigue vacia y varios controles pierden texto. No promovido ni incorporado al benchmark; plugin productivo intacto.

## Correccion163

Se encontro que el selector manual usaba la consulta estricta de primera pagina y solo mostraba tres filas sin navegacion. Una busqueda con23 referencias podia ocultar la cosecha existente. Ahora usa la via de propuestas acotada80, muestra tres por pagina y permite filtrar la anada. No deduplica IDs ni supone que las fichas duplicadas sean equivalentes. Elegir exige detalle independiente y aviso de cambio de cosecha. Consultas parciales siguen explicitamente incompletas. Cambios de pagina/filtro/contexto invalidan manejadores antiguos; no se cambia el calculo.

Pruebas163: seis grupos con parser real y transporte controlado; todas las23 filas alcanzables una sola vez, filtro2022, paginas, metadatos intactos, verificacion por ID, cambio de consulta/cuenta y cancelacion. Lookup126 previo: siete grupos verdes. Lint enfocado verde. Las pruebas visuales aisladas usan mocks y se documentan aparte, sin confundirlas con reconocimiento ni UIKit.

## Corregido En Codigo

- El escaner nativo consulta las valoraciones del propietario por separado del entrenamiento. Incluye vinos excluidos del aprendizaje y sin ficha sensorial; no cambia el perfil ni el calculo.
- La lectura exige propietario, conteo completo, filas validas y plazo5s. Cancelacion/cambio de cuenta no reutilizan respuestas. La web conserva su lector anterior.
- El reescaneo exige identidad de catalogo verificada, misma cosecha, productor y referencia compatibles, sin borrar calificadores. Acepta el prefijo literal del productor, como Pago de Cirsus Vidure. Rechaza contradicciones geograficas y de IDs con namespace conocido.
- Anadas desconocidas no heredan valoraciones master/Library. Dos anadas nulas en la via publica solo pueden mostrar valoracion de referencia si coinciden con el ID publico previamente guardado; nunca certifican una ficha sensorial de cosecha.
- Una valoracion conocida prevalece en lista y explicacion. Si falla su lectura, el detalle muestra Comparacion de estilo provisional y avisa; no oculta el fallo en otra pestana.
- El comparador conserva la cifra sensorial pero excluye los not_for_me de la eleccion personal. Si todos estan rechazados, no recomienda ninguno. Modo servicio conserva su orden; las valoraciones no se convierten en puntos ficticios.
- Propuestas publicas: hasta80 filas por consulta y160 en dos consultas, manteniendo validacion de paginas, IDs, cosecha, detalle independiente y plazo12s. Busqueda automatica ordinaria sin ampliar.
- El probe de texto maximo elige direccion desde la geometria actual, conserva ocho desplazamientos maximos y falla si no avanza. La prueba anterior fallida se conserva.

## Comprobaciones Locales

| Prueba | Resultado |
| --- | --- |
| Rescan159 resolver/servicio |16 grupos; incluye50 vectores sinteticos distintos, timeout/abort, propietario, cosecha, prefijo, ID y geografia |
| Scanner159 JSX/SSR actual |6 casos nativos y6 estados web identicos al anterior |
| Comparador159 |9 escenarios dirigidos;300 decisiones sin valoracion identicas al anterior;2 estados web y2 nativos |
| Summary153 previo |15 valorados,20 desconocidos,8 singular/plural,5 paridades anteriores;5 fuentes de calculo/perfil exactas |
| Propuestas104 |14 grupos; frontera nueva160 y exclusiones intactas |
| Paginacion160 |10 grupos, incluyendo cuatro paginas, drift, duplicados, cancelacion y limite160 |
| Recovery104 |17 grupos de handlers reales aislados |
| Catalogo103 |17 grupos y50 perfiles sinteticos; no confirman el maestro desplegado |
| Cellar144/158 |139 checks de host/source y10 de geometria simulada; UIKit nuevo aun pendiente |
| Rescan161 |142 checks de host/source; recorrido real aun pendiente |
| Inversas historicas159 | Fuentes pre159 exactas,9 mutaciones rechazadas; pruebas nuevas ejecutadas sin proyeccion |

Son pruebas sinteticas/de contrato, no50 usuarios ni evidencia empirica de gusto. El primer typecheck detecto la inferencia opcional de Zod con strictNullChecks=false; se corrigio el tipo tras validacion. Falta el typecheck final.

## Lecturas Reales Sin IA

Tres GET publicos devuelven Flor de Muga Blanco y Manzanilla La Gitana, incluidas279035/2022 y278688/sin anada. Hay multiples IDs duplicados para nombres/cosechas: no se supone una equivalencia general entre namespaces ni cobertura completa Mantalak.

Una descarga publica de la botella Flor de Muga se conserva sin editar, SHA256 `8d213ff13a2a9c79ce6131180afe7a599bcda88b94cecf1cf853d2c6658cc1f9`. La foto no acredita2022: el nuevo recorrido161 exigira elegir expresamente esa cosecha. No forma parte del benchmark200 y no se guardara otro vino ni otra valoracion.

CLI acumulado331 GET de catalogo, mas una imagen publica. Cargo conservador al techo gratuito:253/400;147 restantes. GET ordinarios de la app no instrumentados. Nuevos inicios de modelos0, imagenes enviadas a proveedor0, Lovable0, despliegues0, publicacion web0. Se mantiene el limite50 peticiones de pago/15EUR.

## Pendiente De Evidencia

1. Recompilar104/r2 con163 y validar su selector visual;104/r1 y texto maximo ya pasan en el alcance indicado.
2. Cerrar52 busquedas incompletas y las identidades reales: no basta el texto OCR. Faltan contrato/namespace/cobertura del maestro y datos sensoriales fiables por cosecha; no inventar equivalencias Library/Mantalak.
3. Reescaneo real con referencia y cosecha verificables, valoracion guardada y cinco factores. El caso161 fallido no puede marcarse verde cambiando las expectativas ni introduciendo el nombre esperado en el OCR.
4. Firma/archivo y TestFlight solo tras cerrar los gates reales. No reutilizar la excepcion100 ni gastar mas para eludirlos.

Preparado tambien un experimento aislado lower-half-roi en122: solo configura una copia del plugin, no modifica Vision en la app ni alimenta112. Su finalidad es investigar lecturas vacias como016. No hay mejora medida ni promocion a produccion. Coordenadas normalizadas desde abajo segun [Apple](https://developer.apple.com/documentation/vision/vnimagebasedrequest/regionofinterest).
