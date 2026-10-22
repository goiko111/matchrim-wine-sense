# Matchrim: cierre de catalogo y reescaneo164-168

Estado: en curso, sin aprobacion tecnica de release. No se publica web, no se despliegan funciones y no se amplian llamadas de pago. La beta100 limitada no autoriza105.

## Las52 incompletas

Baseline inmutable: `native112-corpus200-r10/REPORT.json`,148 escenas evaluables/52 incompletas, no148 vinos identificados. Analisis de las52:109 lecturas de cache verificadas, cero misses y cero red.

| Causa | Escenas | Evidencia |
| --- | ---: | --- |
| Solo consultas parciales |31|38 resultados de consulta superan80 filas; conteos88..5513 |
| Solo consultas no disponibles |19|25 respuestas HTTP500 almacenadas,21 textos distintos |
| Fallo de esquema |1|img-193, MONTEPULCIANO, id362891 con slugname vacio |
| Esquema y consulta parcial |1|img-200, ALTOTINTO pagina2, id363580 sin slug; SELECCION devuelve1631 |

En esas52 hay101 desenlaces de consulta:36 completos,38 parciales,25 no disponibles y2 incompletos. Ocho escenas ya tienen propuestas, cinco compatibles con el esperado del scorer actual; siguen fuera del denominador porque no termino toda la recuperacion. No son52 fallos equivalentes de OCR.

`public-refresh165-r1` vuelve a comprobar seis consultas exactas anteriores: Braida, GORU, BIEGLER, WIENINGER, WIENER y HAJSZAN. Las seis siguen HTTP500 con el mismo cuerpo generico, no un vacio ni un error de cache. `public-german167-r1` comprueba una variante ortografica alemana de texto observado; tambien HTTP500. No se reintenta el resto por inercia.

CLI acumulado338 GET publicos de catalogo, mas una imagen publica anterior. Cargo conservador260/400;140 libres restantes. Cero inicios de modelos, cargas de imagen al proveedor, turnos Lovable y escrituras productivas en esta continuacion. Limite50 peticiones de pago/15EUR intacto. Lecturas ordinarias del runtime de la app no instrumentadas.

## Cambios internos

-166: case-folding aleman de sharp-s/SS solo para ranking de propuestas nativas. No cambia OCR, consultas literales, identidad canonica ni afinidad. Nueve grupos nuevos, incluidos negativos de anada/calificador/productor y entradas originales intactas;14 grupos anteriores verdes. El caso real098 sigue sin propuesta con las21 filas de cache disponibles: no se atribuye una mejora de reconocimiento no medida.
-168: el selector prioriza un ID publico ya guardado por el propietario si coinciden ID, slug, nombre, productor, cosecha y geografia compatibles. Muestra Ya en tu Bodega. No fusiona IDs ni importa valoraciones entre duplicados. Conserva las23 filas de prueba alcanzables; exige detalle independiente al elegir.
- La prioridad usa la lectura159 ya existente, sin consultas nuevas. Snapshot de otro propietario, incompleto, cambiado o con referencia adulterada no se usa. Cambios de propietario/snapshot invalidan solicitudes incluso antes de limpiar efectos. Al actualizarse el snapshot se libera busy sin aplicar respuestas antiguas.
- Se corrige el singular una referencia.

Pruebas168:20 grupos de binding/paginacion;14 grupos de handlers TSX reales con transporte controlado;7 lookup126 anteriores,6 estados nativos y6 arboles web identicos del scanner. El inversor historico solo elimina una linea exacta de props168 y sigue exigiendo el hash159 completo antes de devolver el baseline;10 mutaciones desconocidas rechazadas. No se quitan aserciones antiguas.

Se corrige ademas un defecto encontrado en el recorrido nativo: Etiqueta por identificar no se precarga como consulta al catalogo, y se desactivan autocorreccion/capitalizacion de nombres propios. Commit de producto0ca14dc, posterior a bebb86a. La busqueda de una identidad conocida conserva el nombre inicial.

Visual aislado `picker163-known168-r1`: PASS en375,440 y440 con raiz32px, sin overflow horizontal, tres controles de seleccion >=44px, sin errores de pagina. Se inspeccionaron las capturas375 y texto grande. La referencia guardada ID23 aparece primero y exige un GET de detalle antes de confirmar. Las23 filas siguen disponibles. Transporte controlado: NO acredita catalogo real, iOS ni reconocimiento.

Rerun `native112-corpus200-r11`:200 recibos reales de Vision local reejecutados contra funciones actuales,444 lecturas de cache verificadas, cero misses y cero GET nuevos. Integridad de fuente verificada. Resultado sin cambio:148 evaluables,52 incompletas,6 abstenciones,39 listas con propuestas;31 top1 y33 top3 compatibles con el esperado del scorer,6 listas sin esperado. Es proxy con expected derivado de los metadatos conservados, no precision experta ni200 identidades canonicas. Exit1/NO-GO se conserva.

## QA nativo164

Nuevo recorrido preparado: sesion QA existente, foto original byte-attested, Vision local, recuperacion MANUAL Flor de Muga Blanco, seleccion explicita2022, ficha publica independiente y valoracion guardada primaria, cifra0..100 y cinco factores acotados. No prueba reconocimiento automatico ni que la foto acredite2022; no crea otro guardado, valoracion, cuenta o perfil.

El runner exige fuente/app/artefactos exactos, binding de Photos durante toda la ejecucion y antes de PASS, arbol Xcode y helpers fijados, un solo metodo y marcadores dentro del test. Lee nombre/productor/anada y afinidad del dialogo verificado, no de contenido de fondo. Exige capturas/AX y metadatos de dispositivo/configuracion/repeticion, readback y auditoria Apple sin suprimir incidencias. Se corrigieron cinco hallazgos de revision del nuevo harness antes de ejecutarlo. Los38 negativos de evaluador/readback y guardas de fuente pasan; no equivalen a una prueba UIKit.

Compilacion105/r2 sobre0ca14dc: typecheck/bundle y build/install iOS Simulator PASS, configuracion sin fixtures ni maestro inventado. Preparacion limpia y fingerprints de JS/plist verificados; no archive, export ni upload. Las fuentes de producto no cambiaron despues de0ca14dc.

Recorrido real164/r1: FAIL conservado al intentar seleccionar todo el texto precargado; no se obtuvo Select All. Eso motivo el arreglo de consulta vacia.164/r2: confirma cuenta QA existente, galeria y foto original, lectura local y escritura exacta Flor de Muga Blanco. FAIL antes de elegir anada. La captura con teclado muestra Buscar fuera del panel visible; el toque cierra el teclado y no aparece ni aviso ni selector. No hay recibo HTTP de esa busqueda: NO se atribuye este fallo a un500 del backend. El aviso de busqueda incompleta ya estaba antes de la consulta manual.

164/r3 envia una sola consulta mediante el Return nativo observado en el AX de iOS. Respuesta real visible:23 referencias,8 paginas, fichas sin anada en primera pagina. FAIL conservado porque el harness buscaba popup/button y WebKit expone el selector Filtrar por anada como Other. Captura/AX conservan la respuesta real; no acreditan aun ficha elegida ni afinidad.164/r4 corrige solo el tipo de elemento y cierra el teclado mediante su checkmark nativo observado antes de revelar el filtro. Seleccion2022 real:4 referencias,2 paginas; fallo de harness al exigir el aviso completo en un solo StaticText, mientras iOS lo fragmenta en frase/anada/punto. Se conserva FAIL original y se verifica el aviso completo dentro de la fila exacta observada en el siguiente probe. No se quita ninguna exigencia de ficha/anada/valoracion/afinidad.

Remediacion UX del envio: lupa44x44 accesible junto al campo, alineada con el input en vez de debajo; enterKeyHint search; blur del input antes de comenzar la consulta. Nueva prueba real del handler exige el orden blur -> search, nombre accesible y tooltip.14 grupos verdes y lint enfocado verde. Este cambio invalida105/r2 como candidato final: falta preparar105/r3 y repetir visual/nativo sobre esos bytes. El nuevo probe vuelve a usar Buscar con teclado abierto y exige que se cierre al enviar. Heavy/ios anteriores liberados realmente06:15:59UTC tras terminar el lote, sin detener tareas ajenas.

## Catalogo maestro

Revision local de contratos y clientes existentes: no hay contrato de lectura global utilizable con los accesos publicos actuales. La APIv2 `GET /api/v2/wines` y `GET /api/v2/wines/{id}` exige token de un restaurante; no acredita todo Mantalak. No se usan credenciales administrativas en el movil ni se inventa una ruta.

El protocolo de Winerim distingue cuvee Mantalak de oferta/anada y etiquetas especificas. Faltan cobertura/paginacion globales, mapeo de namespaces, resolucion de oferta/anada y procedencia sensorial0..5. `nativeMasterCatalog102.ts` es un contrato opt-in propuesto, no una ruta desplegada. La configuracion del candidato permanece vacia.

Accion externa necesaria: el backend Winerim debe proporcionar el contrato autorizado de busqueda/detalle del maestro y corregir las consultas500/fichas sin slug. Este bloqueo no se resuelve con otra clave de OpenAI ni publicando la web. Se conserva evidencia reproducible sin secretos.

Fuentes locales: vault `sources/2026/09/32330628b08a-API_TOKEN_V2_DOCUMENTATION.html` (autenticacion/listado/detalle), nota `2026-08-22-wine-creation-protocol-844fec2b.md` (base y anadas), y parsers/clientes del repositorio. No se confunde Library con un maestro demostrado.
