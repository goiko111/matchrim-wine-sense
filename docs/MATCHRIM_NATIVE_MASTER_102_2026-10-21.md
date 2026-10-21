# Escaner Nativo / Maestro Winerim: Implementacion 102

Continua `907e25c`. **102 es el identificador de este bloque de trabajo, no una version subida a TestFlight.** Se implementa codigo del cliente y se corrige un fallo de admision; no se declara conectado el maestro de produccion.

## Codigo Implementado

- `nativeMasterCatalog102.ts`: conector opt-in, dos GET maximo (busqueda y detalle independiente), timeout total de 3,5 s, cuerpos acotados a 256 KiB, cancelacion incluso si el adaptador ignora AbortSignal, sin cookies, secretos, imagenes, perfil o llamadas a IA.
- `MultiWineLabelScanner`: consulta el maestro solo en nativo, fuera de fixtures y con identidad literal admisible. Una respuesta ambigua no puede recurrir despues a una ficha distinta. Sin configuracion conserva la via Library anterior; una indisponibilidad puede recurrir a esa via, manteniendo sus verificaciones estrictas.
- Identidad Mantalak separada de Library: `mantalak:ID`, productor, anada y detalle concordantes. Nunca se convierte un UUID local o ID Mantalak en una URL Library.
- Datos sensoriales 0..5 con cero/decimales conservados, anada sensorial explicita y procedencia `winerim-source` o `winerim-generated`. NV/otra cosecha no se prestan a la anada solicitada.
- Afinidad mediante la formula existente, sin cambiar pesos ni elevar la confianza OCR. Datos generados se muestran como tales, no como cata verificada. La ausencia de ficha publica no impide por si sola calcular una afinidad respaldada por el registro maestro; la ausencia de atributos o perfil si la impide.
- Autoridad de registros limitada a objetos congelados devueltos por el lector validado. Copiar JSON desde vision no puede autodeclarar un registro verificado. La vista revalida identidad, atributos y score; editar el vino o perder un calificador invalida la explicacion.
- Se conserva procedencia/ID/anada sensorial en `place_details.winerim_master_evidence` al guardar por el flujo existente. No se crea una migracion, se cambia el propietario ni se escribe en cuentas reales durante este bloque.

No se han conectado todavia los selectores manuales ni la carta al nuevo contrato: siguen usando sus vias anteriores. Este conector se incorpora al enriquecimiento automatico del escaner multietiqueta. Tampoco se obtiene una ficha publica a partir de un ID administrativo.

## Fallo Concreto Corregido

Al reproducir las 200 lecturas OCR guardadas contra 6.781 filas locales y 30 recomendaciones reales independientes, una fila generica podia pasar el filtro literal:

- `img-119`: OCR `CHASSAGNE-MONTRACHET`, `Premier Cru "Morgeot"`, `Jean-Claude RAMONET`, `2018`.
- Propuesta local: UUID `ffa0204f-f03f-4eaf-ad24-99f3114d0bce`, `Jean-Claude Ramonet Chassagne-Montrachet`, 2018. Omite Premier Cru/Morgeot.
- Antes: una propuesta literalmente admisible; despues: cero, con esa propuesta retenida para revision. No se llegaron a asignar identidad canonica ni afinidad en ninguno de los dos replays.

`nativeWineQualifier102.ts` detecta SOLO lineas autonomas Premier Cru/1er Cru/Grand Cru, con climat entre comillas si aparece. El nombre debe conservar la clasificacion y ese climat. No interpreta toda la nomenclatura viticola ni confunde el productor `Grand Cru Cellars` con una clasificacion. Esta regla se ejecuta antes de cualquier consulta nativa, incluso sin activar el maestro, y deja una duda legible para revisar la referencia. No cambia ni inventa el nombre correcto.

La fixture `ocr-qualifier102.observed.json` conserva texto y hash de la observacion. Es un contraejemplo real del filtro lexical con OCR guardado, **no una afirmacion de que OpenAI identificase mal esa foto en produccion**.

## Continuacion De Las 200

| Replay offline, no reconocimiento E2E | Antes | Despues |
| --- | ---: | ---: |
| Escenas / recibos OCR comprobados | 200 | 200 |
| Escenas con texto | 198 | 198 |
| Propuestas con todos los tokens exigidos por el filtro literal | 1 | 0 |
| Propuestas compatibles con nombre/productor esperados | 0 | 0 |
| Propuestas retenidas por calificador omitido | 0 | 1 |
| Identidades canonicas verificadas / afinidades | 0 / 0 | 0 / 0 |
| Nuevas llamadas de IA / red | 0 / 0 | 0 / 0 |

`replay-matchrim-ocr-catalogue102.ts` usa los 200 recibos del OCR ya terminado, no vuelve a procesar imagenes ni regenera el dataset. Verifica los hashes del recibo respecto al manifiesto preparado. El catalogo independiente se carga antes de recuperar propuestas; los nombres/productores esperados entran solo DESPUES, para evaluar. Se supone confianza 1 unicamente para aislar el gate lexical: no se convierte confianza OCR en confianza de identidad. No se construye un catalogo cerrado con las respuestas esperadas. Precision/recall canonicos siguen null; no hay 200 aciertos reales que reportar.

Evidencias: `qa-artifacts/native102-20261021/OCR200-LITERAL-REPLAY.json` y `OCR200-LITERAL-REPLAY-AFTER.json`, con 200 filas cada uno y hashes de entradas.

## Contrato Propuesto, No Desplegado

El cliente solo admite, si se configura explicitamente, `https://app.winerim.com/api/v1/matchrim/catalogue`. **Esta ruta es una propuesta para el propietario del backend. No ha sido descubierta como API existente, ni probada en vivo, ni desplegada.** No se hicieron peticiones a esa ruta inventada. Cambiar una variable no crea el servicio.

Variable de build nativo: `VITE_MATCHRIM_MASTER_CATALOG_URL`. Debe contener solo la URL publica autorizada, nunca una clave. No se ha activado en este bloque. La ruta debe devolver unicamente datos de vino autorizados para Matchrim, no campos administrativos, precios privados o datos de usuarios. Si el servidor requiere otro mecanismo de autorizacion, hay que implementarlo antes de activar; no se copian cookies de administrador al movil.

GET de busqueda: `name`, `producer`, `vintage` (cadena vacia para NV). Respuesta contractual:

```json
{
  "contract": "matchrim-master-catalogue-v1",
  "scope": "full-master",
  "complete": true,
  "count": 1,
  "matches": [{
    "namespace": "mantalak", "id": "123", "name": "Aurora Reserva",
    "producer": "Bodega Luna", "vintage": "2020", "region": null, "country": "ES"
  }]
}
```

Ejemplo SINTETICO. GET de detalle: `id`, `vintage`. Devuelve `contract`, `scope` y `wine`: misma identidad mas `sensory`, nullable. Si hay sensory, exige `vintage`, `scale:"winerim-0-5"`, `provenance`, `sourceReference` y cinco numeros `power/acidity/sweetness/tannin/fruity` de 0 a 5. El schema ejecutable esta en `nativeMasterCatalog102.ts`. Pagina incompleta, mas de cinco resultados, duplicados, namespace incorrecto, identidad/anada contradictoria o atributos fuera de rango no autorizan afinidad.

No se ha fabricado un proxy hacia administracion ni se han usado las 30 recomendaciones como si fueran el maestro completo. La busqueda de repositorio instalado `winerim-backend` sigue sin devolver acceso; eso no demuestra inexistencia del repositorio. La raiz publica de app.winerim.com redirige a login; el HTML/JS publico de login no proporciona el contrato maestro. No se ha hecho un barrido de rutas de API.

## Pruebas Y Estado

- 14 grupos nuevos PASS de transporte/identidad/atributos/procedencia/cancelacion y closure REAL del escaner, con respuestas SINTETICAS del contrato propuesto. Incluyen 50 perfiles sinteticos y la formula conservadora existente; no son 50 personas ni validacion de gusto humano.
- 13 grupos del bridge97 PASS, con los 120 casos de paridad web y las reservas de IA intactas. Las condiciones nuevas tienen pruebas separadas de dispatch nativo/fixture/web y bloqueo por calificador.
- 16 checks consumer95 scanner PASS. La rama heredada se restaura exactamente antes de sus oraculos; no se presenta ese replay como nuevo QA UIKit.
- 36 grupos recognition96 PASS tambien en el rerun final (`recognition-final.log`). Los oraculos y recuentos anteriores no se eliminan ni actualizan para encubrir cambios.
- `native-master102-scope.json` registra inversos literales y hashes completos de siete archivos. El check nuevo verifica la restauracion byte a byte y rechaza bypasses de los guards nativos. Los lectores historicos proyectan solo estos cambios declarados; el codigo actual se prueba sin proyeccion en el harness nuevo.
- Typecheck y build aislado r1 PASS antes del ultimo guard de calificador. No se declaran build/QA visual finales por ese resultado intermedio. La compilacion queda en `build-r1/web`, nunca se copia a la web publicada o al iPhone.

Los fallos intermedios se conservan: expectation inicial 100 frente a 93 de la formula conservadora, lint del regex de control, dos errores TS del inferido Zod, y lectores antiguos que rechazaron el prefijo nuevo hasta anadir sus inversos exactos. No se cambiaron la formula, sus oraculos o los resultados esperados de identidad para ocultarlos.

El ultimo typecheck/build completos y el QA visual del estado final quedan pendientes de una nueva ventana `heavy-local`: la reserva propia del build r1 se libero al acabar; los intentos posteriores devolvieron BUSY por una operacion ajena. No se interrumpio ni se uso esa reserva. Lint y pruebas dirigidas pueden avanzar sin ocuparla; no equivalen a ese gate.

## Gate Real Pendiente

Hay codigo y un arreglo efectivo del escaner, no solo un informe. **La conexion al maestro completo sigue sin estar activa:** falta un contrato de lectura autorizado del servidor Symfony, o acceso a su codigo para implementarlo. Se ha pedido al usuario el responsable tecnico, no otra vez el mismo repositorio cliente. La accion minima es habilitar/identificar esa lectura y contrastar el adaptador con su respuesta real antes de activar la variable de build.

Se conserva 20 etiquetas / 50 starts / 15 EUR, sin consumo adicional ni liberacion de los slots SDK desconocidos. Este bloque no usa IA de pago ni creditos de Lovable, no modifica configuracion/BD de produccion, no despliega, no publica la web y no sube TestFlight. El benchmark E2E real de las 200 y el gate visual/fisico de una version conectada siguen abiertos.
