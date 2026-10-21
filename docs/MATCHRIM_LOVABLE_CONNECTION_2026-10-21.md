# Conexion Lovable / Winerim: Diagnostico En Lectura

## Resultado

La conexion existe y responde. No se ha demostrado acceso al maestro completo de Winerim por nombre/ID desde los contratos de lectura revisados. Hay cuatro vias distintas que no deben confundirse:

| Via | Fuente y alcance observado | Limite |
| --- | --- | --- |
| Busqueda local | Lovable Cloud, `public.wines`: 6.781 filas | No tiene ID Mantalak ni enlace verificable a ficha original en sus columnas |
| Winerim por restaurante / Library | `winerim-wines` -> `app.winerim.com/api/v1/restaurant/{uuid}/wines` o `/wines/match` | Pide UUID de restaurante; la Library consultada declara 1.711 referencias, no el maestro |
| Recomendador global | `matchrim-recommendations` -> `app.winerim.com/api/v1/matchrim/recommendations`, cinco ejes de perfil | Devuelve 12 vinos home / 30 detail para el perfil sintetico; declara universo compatible de 13.914, NO total del maestro ni busqueda por nombre |
| Escaner movil actual | `lookupWinerimOriginalSheet`: resolver Library, buscar texto y verificar detalle de identidad/anada | Una referencia fuera de esa Library no recibe una ficha por existir en Mantalak |

Los 6.781 y 1.711 no se suman: no son catalogos disjuntos demostrados. La ausencia de una coincidencia aqui no prueba ausencia en Winerim. No se han usado sesiones administrativas ni rutas adivinadas para copiar el maestro.

El recomendador global es una conexion mas amplia que la Library y ya esta integrada en `fetchWinesByAttributes` para el caso sin restaurante. Su salida no es un indice completo para resolver una etiqueta arbitraria. El extractor actual YA entiende `wines.detail` y `wines.home`: no se ha encontrado aqui un defecto que justifique cambiarlo. El antiguo helper de candidatos originales sobre recomendaciones conserva solo una muestra neutral en cache; tampoco convierte 30 resultados en busqueda del maestro.

## Por Que Antes Podia Encontrarlos

El commit `f66edd6acd2493c7718a34f2d56d5dc40ca72cba`, del 16 de octubre, cambio la rama nativa de `findWinerimWineForLabel`: antes consultaba `search-wines`; ahora exige una ficha original verificada mediante la Library. El flujo anterior ya tenia controles de nombre, productor e ID, pero su buscador complementaba las filas locales con propuestas de IA.

`search-wines` sigue invocando IA cuando hay clave, incluso si ya encuentra filas locales; no usa herramienta de busqueda web. `search-wines-v75` permite omitirla con `catalogOnly`. No se ha llamado a ninguna de estas funciones en vivo durante este bloque. Una propuesta de IA o una coincidencia local no acreditan una ficha del maestro.

Esto explica un cambio real de cobertura y puede explicar parte del recuerdo del usuario. No hay logs de aquellas consultas concretas que permitan afirmar que todos los aciertos antiguos fueran inventados. Tampoco seria correcto recuperar aparente cobertura asignando atributos de otra bodega o cosecha.

## Cambios Ya Existentes En Lovable

Se revisaron proyecto, archivos, historial de mensajes/ediciones y base de datos mediante herramientas de lectura. Proyecto `7e9b6f66-d4ee-404a-8678-c9afab22de75`, revision observada `8e48f4a8d8bc95eccc3d9206fad7fcb1502c1eba`.

- `787b252`: el proxy aprende a leer POST JSON, que es lo que envia la app; antes esperaba parametros GET. Incluye lectura `endpoint:wines`.
- `c594f9b`: acepta ejes decimales 0..5. El handler los transmite sin redondear.
- `8e48f4a`: redondeo antes del clasificador de estilos en otro codigo de main. La rama movil ya redondea la entrada de ese clasificador y conserva el perfil continuo para la afinidad local; no se ha mezclado este cambio por inercia.
- El historial Lovable informa un despliegue de **solo `winerim-wines`** el 21 de octubre a las 06:45:35 UTC, desde `36d1c47`, con paquete SHA256 `cc0969360c0a62cd3ff9e65da046f1f223963e0fade7f704d4c122e4495e23e2`. Es evidencia historica declarada por ese canal, sin ID de operacion; este bloque NO ejecuto ese despliegue.

La rama movil conserva una version anterior del fuente del proxy en su arbol. El backend no forma parte del binario iOS: no se debe desplegar ese archivo antiguo para intentar reparar la app ni atribuir este arreglo a una nueva version TestFlight. No se ha sobrescrito trabajo de main ni modificado el handler desplegado.

## Comprobacion Real Sin IA

Cinco peticiones anonimas, sin cookies, sesiones, imagenes ni perfil real. El canary del proxy hizo tres el 21 de octubre a las 11:47:11-13 de Madrid, sin reintentos; despues se hicieron dos GET del recomendador global para resolver su esquema anidado. Respuesta limitada a 256 KiB y timeout de 15 s por peticion.

| Peticion | HTTP | Resultado | Latencia |
| --- | --- | --- | ---: |
| Resolver publico `the-library` | 200 | UUID de la Library | 331 ms |
| POST `winerim-wines`, endpoint wines, pagina 1, limite 1 | 200 | count 1.711; devuelve Manzanilla La Gitana | 590 ms |
| POST endpoint match, perfil decimal sintetico | 200 | count 0, results vacio | 409 ms |
| GET recomendador global, perfil entero sintetico, primera observacion | 200 | Esquema wines anidado; contador del probe inicial NO interpretable | 1.070 ms |
| GET recomendador global, segunda observacion del esquema | 200 | wines.home: 12; wines.detail: 30; compatibleUniverse: 13.914 | 499 ms |

El tercer resultado prueba aceptacion del contrato POST/decimales, **no recomendacion correcta**. No se ha probado por que ese perfil obtiene cero referencias ni se declara afinidad aprobada. Los SHA256 de cuerpos, horas y duraciones estan en `live-readonly-r1/REPORT.json`; no se guardan claves en el informe.

Los dos GET globales dieron el mismo cuerpo SHA256 `38a9fd924ba08bfb9201c03c24ff17f744c878b3380252c362515fb1ae05b4d0`. La primera sonda esperaba un array directo y anoto returnedRows=0: es una limitacion de esa sonda, **no cero vinos del servidor**. Se conserva y corrige explicitamente con el cuerpo acotado de r2 y un replay offline del extractor REAL de `winerimApi.ts`: seis checks de esquema PASS, 30 filas seleccionadas, 30 atributos sensoriales validos 0..5 y 30 afinidades locales finitas para ese perfil sintetico. Esto demuestra transporte/datos/calculo disponibles en recomendaciones; no identidad de las imagenes, ficha original ni acierto respecto al gusto humano. No se reutilizan esos 30 vinos como universo cerrado para aparentar reconocimiento.

## Las 200 Referencias Frente Al Catalogo Local

Se extrajo solo la proyeccion de identidad de las 6.781 filas mediante SELECT. Una consulta SELECT independiente comparo las 200 referencias esperadas. Despues, un auditor sin red uso el modulo real `isSafeCanonicalLabelMatch`, incluyendo normalizacion de acentos/productor y calificadores, contra la proyeccion completa:

| Medida de disponibilidad local, NO reconocimiento | Resultado |
| --- | ---: |
| Referencias evaluadas | 200 |
| Referencias con nombre normalizado igual | 4 |
| Referencias con nombre y productor compatibles | 0 |
| Filas con nombre coincidente pero otro productor, rechazadas | 7 |
| Identidades canonicas verificadas / afinidades calculadas | 0 / 0 |

Casos de colision: Syrah de Christophe Abbet frente a Castillo de Buen Amor; Morgon Cote du Py de Chauvet Freres frente a Damien Coquelet; Sauvignon Blanc de Gross frente a cuatro bodegas distintas; Les Caillerets de Domaine Ramonet frente a Vincent & Sophie Morey. La coincidencia del nombre no permite heredar sus atributos.

Estos nombres esperados entran UNICAMENTE en la evaluacion offline de disponibilidad: no se inyectan en OCR, reconocimiento, cache o usuarios. No es una medicion de precision/recall del escaner, ni cobertura de anadas, ni una nueva prueba real con OpenAI de las 200 imagenes. Se conserva el diagnostico OCR anterior, sin regenerar dataset ni repetirlo.

## Trabajo Cerrado Y Pruebas

- `scripts/probe-matchrim-winerim-connection101.mjs`: canary reproducible de tres lecturas, opt-in `--run-readonly`, sin rutas de modelos o mutaciones; no ejecutarlo de nuevo por rutina.
- `scripts/audit-matchrim-catalogue-coverage101.ts`: auditor offline con hashes de ambas entradas, 200 filas y separacion explicita de referencia compatible vs identidad verificada.
- `qa-fixtures/consumer95/catalogue-collisions101.observed.json`: siete filas reales de identidad, cotejadas con la proyeccion original sin diferencias.
- `scripts/check-matchrim-catalogue-collisions101.ts`: **11 checks PASS**; siete rechazos de productor y cuatro controles sinteticos de alias legal/acentos, anada, cuvee y bodega. Sin red.
- `scripts/audit-matchrim-recommendation-contract101.ts`: replay sin red del cuerpo global observado, seis checks PASS con el extractor real y validacion/calculo de los 30 atributos recibidos. No modifica ni reimplementa el extractor de producto.
- ESLint de los cuatro scripts nuevos: **0 errores y 0 warnings**. No se repiten suites verdes ni build iOS al no modificar codigo del producto.

Evidencias locales: `qa-artifacts/lovable-connection101-20261021/`: metadatos Lovable, SQL SELECT reproducible, proyeccion de identidad, comparacion exacta SQL, `OFFLINE-COVERAGE.json`, recibos del canary, `global-recommendations-schema-r2.body.json` y `RECOMMENDATION-CONTRACT.json`. La proyeccion completa no se incorpora al Git ni al binario.

## Limites Conservados Y Siguiente Gate

**0 starts de IA, 0 turnos del agente Lovable, 0 deploys, 0 publicaciones web y 0 escrituras en produccion en este bloque.** Se conserva el techo de 20 etiquetas / 50 starts / 15 EUR y la retencion anterior: 10 starts demostrados mas 24 slots SDK no cerrados, 10,20 EUR provisionados, no factura. No se consume ni libera esa reserva.

No se ha pedido otra vez al usuario el mismo repositorio. El repositorio Matchrim y su conexion Lovable ya estan comprobados, incluido el recomendador global que SI devuelve vinos fuera de la muestra local. La pieza que falta en la integracion revisada es una lectura autorizada del maestro por nombre/ID con identidad Mantalak, anada, procedencia sensorial y mapeo nullable a ficha publica. Las reparaciones POST/decimales recuperan el contrato de restaurante; no amplian ese catalogo al maestro. Sigue pendiente explicar el match de restaurante vacio y verificar reconocimiento real de las 200 dentro del gasto autorizado, sin confundirlo con OCR local.

La ultima subida sigue siendo 1.0(99), sin disponibilidad TestFlight verificada en este bloque. No se ha subido otro candidato ni tocado la web. El guard de anadas del bloque 100 sigue preparado para un futuro candidato, no incluido en la 99.
