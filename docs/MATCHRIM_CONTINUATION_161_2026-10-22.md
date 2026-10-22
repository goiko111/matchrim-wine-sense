# Matchrim: Continuacion 159-161

Estado03:24 UTC. Implementacion revisada; compilacion, regresion200 y nuevos recorridos UIKit pendientes. No es un aprobado de TestFlight.

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

CLI acumulado304 GET de catalogo, mas una imagen publica. Cargo conservador al techo gratuito:226/400;174 restantes. GET ordinarios de la app no instrumentados. Nuevos inicios de modelos0, imagenes enviadas a proveedor0, Lovable0, despliegues0, publicacion web0. Se mantiene el limite50 peticiones de pago/15EUR.

## Pendiente De Evidencia

1. Typecheck/lint/build y candidato nativo104 congelado.
2. Rerun200 con nuevas paginas acotadas y caches previas; no repetir OCR ni cambiar expectativas. Referencia anterior r9:141 elegibles/59 incompletas/30 top1/32 top3 contra nombres de archivo, no precision experta.
3. Bodega a texto maximo con el probe corregido y restauracion exacta del ajuste.
4. Galeria local de Flor de Muga, propuesta2022 explicita, ficha independiente, valoracion guardada y cinco factores. Sin login/guardado/valoracion nuevos ni modelos.
5. Firma/archivo actualizado solo tras QA. TestFlight sigue bloqueado hasta cerrar los gates reales, sin reutilizar la excepcion100.

Preparado tambien un experimento aislado lower-half-roi en122: solo configura una copia del plugin, no modifica Vision en la app ni alimenta112. Su finalidad es investigar lecturas vacias como016. No hay mejora medida ni promocion a produccion. Coordenadas normalizadas desde abajo segun [Apple](https://developer.apple.com/documentation/vision/vnimagebasedrequest/regionofinterest).
