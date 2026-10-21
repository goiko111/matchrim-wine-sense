# TestFlight 100 Y Catalogo Global

## Subida Confirmada

Apple acepto **Matchrim 1.0 (100)** a las **15:46:30 de Madrid, 21/10/2026**. Xcode termino con codigo 0, `Upload succeeded`, `Uploaded package is processing` y `EXPORT SUCCEEDED`. Esto confirma recepcion/procesamiento, **no que ya aparezca instalable en TestFlight**.

La subida es una beta privada limitada autorizada expresamente por el usuario: `Subir beta privada 100 limitada`. Conserva la Library parcial; no anuncia el maestro completo ni un benchmark real aprobado de 200 etiquetas. No se publica la web.

- Producto congelado: `a2f2f58d18e5cf61e1f60cf96d9f73dfe0de3c41`.
- Bundle: `wine.matchrim.app`, version 1.0, build 100.
- IPA exportado: 8.382.223 bytes, SHA256 `beb3a663b8481134e52a9b5f5b558abca126ce8bca8f18c044224da0f201491d`.
- Firma de distribucion y 164 recursos frontend verificados; `get-task-allow=false`, identificador de equipo/app correcto.
- Recibos privados: `qa-artifacts/native102-20261021/distribution100-export-r1/EXPORT-RESULT.json` y `distribution100-upload-r1/UPLOAD-RESULT.json`. La autorizacion humana queda registrada junto a ellos.
- Aviso de Apple, no error: el deployment target iOS 14 debera subir al menos a iOS 15 para subidas a partir de abril de 2027. No se cambia ahora el binario ya validado.

## QA Nativo Cerrado En Esta Tanda

Se instala el binario de simulador 100 ya compilado, cuyos recursos coinciden con el archive, en el simulador dedicado `Matchrim QA84 isolated`, iOS 26.0. El identificador aislado de test sigue siendo `wine.matchrim.qa99review`; **no implica que el binario sea la 99**. Info.plist y hashes prueban build 100. El proyecto XCTest anterior se copia y sus aserciones permanecen intactas; los nombres historicos de attachments se conservan.

| Recorrido real XCTest, retrato | Texto normal | Tamano maximo accesible |
| --- | --- | --- |
| Abrir aiRIM, un solo compositor | PASS | PASS |
| Teclado real, Enviar visible encima del teclado, sin enviarlo | PASS | PASS |
| Volver a Inicio, teclado desaparece | PASS | PASS |
| Tres entradas principales de Escanear | PASS | PASS |
| Desplegar Mas y volver a Botellas con scroll | PASS | PASS |
| Entrada de etiqueta y aviso de privacidad | PASS | PASS |
| Zonas tactiles visibles de al menos 44 px | PASS | PASS |
| Auditorias nativas: contraste, descripcion, texto cortado y trait | PASS | PASS |

Dos ejecuciones de un caso XCTest cada una, cinco capturas por ejecucion: **10 capturas nativas nuevas**. Se inspeccionan capturas de teclado/escaneo normal y aiRIM/etiqueta con texto maximo. El ajuste `content_size` se restaura a `large` en ambos recibos. Se ejecuta en segundo plano sobre el dispositivo virtual dedicado, sin abrir o tomar foco del Simulator del Mac ni inyectar raton/teclado del escritorio. Antes del arranque se comprueban reservas, procesos nativos y que el frente del escritorio no sea el simulador.

Evidencias: `uikit100-normal-r1/` y `uikit100-max-r1/` bajo `qa-artifacts/native102-20261021/`, con logs, xcresult, manifiesto y capturas. Runner reproducible: `scripts/qa-matchrim-native100-ios.mjs`; exige reservas propias `heavy-local` e `ios-simulator`, hashes del producto 100 y minimo 5 GiB libres.

No se presenta como QA completo de cuentas o reconocimiento: estos recorridos no hacen login, no envian consultas aiRIM, no analizan fotos ni prueban prediccion de gusto humano. Tampoco son uso manual de VoiceOver. El QA previo de panel/correccion con imagen y transporte interceptado sigue en `visual-final-r3`, separado del recorrido UIKit. El benchmark real de las 200 continua pendiente; no se reinician reservas SDK desconocidas.

## Hallazgo Nuevo: Catalogo Global Publico Real

Al releer Lovable se detecta un cambio ajeno, posterior al checkpoint anterior: `origin/main` / Lovable pasan de `8e48f4a` a **`95aa7508d1c2f0da9ba3205eee0304fd9d18357c`**, `fix(wine-card): open the Winerim ficha from the wine name and photo`. Ese cambio introduce `src/utils/winerimWineUrl.ts` y documenta el slug **`matchrim`**, distinto de `the-library`. **No se fusiona, modifica ni publica ese trabajo, ni se altera la 100 enviada.**

La pista se contrasta con GET reales, no se acepta solo por un comentario:

1. `GET https://app.winerim.com/api/v1/whoami/slugname?s=matchrim` devuelve 200 y UUID `00000000-0000-0000-0000-000000000001`.
2. El cliente publico Angular ya observado usa `store=1` como filtro de la vista store. `GET /api/v1/restaurant/{uuid}/wines?page=1&store=1` devuelve 200 y **182.397** resultados en la primera comprobacion; el replay guardado devuelve **182.399**. Es un contador vivo, no dos casos extra de QA. Se recupera solo la primera pagina, no se descargan todas las filas.
3. Busqueda literal por `text=Vidure` y `text=La Zorrera`, con `store=1`, devuelve una referencia cada una. El detalle independiente por id/slug responde 200 y coincide con la referencia buscada.

| Referencia publica | ID publico, NO ID Mantalak | Productor | Anada publica | Ejes potencia/acidez/dulzor/tanino/fruta |
| --- | --- | --- | --- | --- |
| Vidure | 364050 | Pago de Cirsus | null | 5 / 3 / 1 / 4 / 4 |
| La Zorrera | 336808 | Chivite | null | 4 / 3 / 1 / 3 / 4 |

Ambas devuelven imagen y atributos sensoriales, pero **no informan origen de cata/generacion ni la anada de estos datos**. No acreditan Vidure 2020 o La Zorrera 2015. Tampoco proporcionan el mapeo a los IDs administrativos observados 201987 / 180278. El registro publico de La Zorrera no puede sustituir silenciosamente su ficha 2015: incluso el dulzor publico (1) difiere del generado 2015 observado anteriormente (0).

Esta lectura real resuelve una parte importante del bloqueo: **ya no hace falta pedir de nuevo el repositorio Symfony para acceder al catalogo publico global de unas 182.400 referencias**. No demuestra equivalencia con los 217.391 registros del maestro administrativo ni resuelve la falta de anada/procedencia. La integracion nativa segura de esta fuente es ahora trabajo interno pendiente, no falta de acceso a esas 182.400 referencias.

Prueba reproducible conectada: `scripts/probe-matchrim-global-catalogue103.mjs`. Guardada en `qa-artifacts/native102-20261021/global-store103-r1/`: seis respuestas GET originales, hashes SHA256, latencias y proyeccion de identidad/atributos. El script no hace OCR, no sube fotos, no consulta modelos, no llama quick-sheet/generacion ni modifica el runtime de la app. Las latencias guardadas son 257 ms para resolver, unos 3,4-3,5 s por busqueda y 1,3 s por detalle. No se llama precision/recall a dos busquedas por nombre conocido.

## Otros Accesos Revisados Sin Escritura

El listado actual de Supabase permite staging de CRM, Cellaria y puentes, no la gestion del proyecto Lovable de Matchrim. Se leen exclusivamente metadatos de esquemas:

- CRM staging tiene cartas, solicitudes y catalogos WineAdvisor por restaurante; no replica sensorial del maestro.
- Bridge prod no devuelve tablas wine/catalog/mantalak en los esquemas consultados.
- Cellaria staging tiene columnas `mantalak_id` / `master_wine_id`, pero `market_wine_list_items` esta vacia: cero filas, IDs y menus. No se utiliza como catalogo.
- No hay `~/.ssh/config` con un acceso de servidor ya configurado. No se buscan claves privadas, se inventan hosts ni se abre una conexion de administracion.

No se leen datos de clientes o contactos ni se escribe en ninguno de esos proyectos.

## Siguiente Gate Del Catalogo

La beta 100 queda subida **con las limitaciones autorizadas**. Para una version posterior: integrar la fuente publica global en la rama nativa, separar namespace publico/Mantalak, conservar lectura independiente de detalle, tratar referencias sin anada como tales y no prestarles atributos a una cosecha fotografiada. Debe haber tests de regresion con las respuestas reales guardadas, relectura de perfiles, QA visual del resultado y un benchmark que separe disponibilidad del catalogo de reconocimiento OCR/IA. No reutilizar el numero 100 ya enviado a Apple.

Coste incremental de esta tanda: **cero llamadas de IA y cero creditos Lovable**, sin despliegues backend ni publicacion web. Las lecturas GET/SQL descritas son de catalogo/metadatos, no analisis pagados de imagen. El techo de 50 starts / 15 EUR no se amplia.
