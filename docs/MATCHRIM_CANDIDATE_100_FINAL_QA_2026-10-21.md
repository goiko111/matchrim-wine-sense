# Candidato 1.0 (100): Build Y QA Final

Actualizacion posterior: `MATCHRIM_TESTFLIGHT_100_AND_GLOBAL_CATALOGUE_2026-10-21.md` cierra el recorrido UIKit normal/maximo, registra la autorizacion de beta limitada y la subida aceptada por Apple. Tambien documenta una via global publica nueva y verificada. Los gates pendientes de este checkpoint se conservan abajo como evidencia historica.

## Estado Verificado

Producto: `a2f2f58d18e5cf61e1f60cf96d9f73dfe0de3c41`, continuacion de `0ed945a`. Herramientas reproducibles: `b322166` y `507a1c1`. **100 es el numero del candidato iOS; 102 sigue siendo el identificador del bloque de codigo, no una subida.**

- Typecheck final PASS; build de produccion aislado PASS en 7,02 s. Sin fixtures, sin preview remoto, con el proyecto de produccion y sin activar el contrato maestro propuesto.
- Archive Release 1.0 (100) PASS, firma verificada con `codesign --verify --deep --strict`; todos los recursos frontend coinciden con los hashes de la preparacion final.
- Build iOS Simulator PASS, mismos recursos frontend. Solo su Info.plist sin firma cambia a `wine.matchrim.qa99review` para mantener el aislamiento del simulador existente. No esta instalado ni probado en UIKit en esta tanda.
- Lint de los tres scripts nuevos y del parche PASS. Veinte grupos de presentacion/aislamiento web PASS; scope exacto: ocho archivos restaurados y 22 mutaciones rechazadas, sin eliminar aserciones o casos originales.
- QA visual final: 10 capturas, retrato 393x852 y 320x568, texto normal y 200 % en 393x852. Cero errores de consola/runtime y cero solicitudes reenviadas. Cuenta, deteccion y candidatos interceptados; no son reconocimiento de IA ni usuarios humanos.

## Defecto Encontrado Y Corregido

Con texto al 200 %, las reglas heredadas convertian el layout del panel de etiqueta en un bloque desplazable completo. El pie con Cerrar quedaba fuera del viewport. Ahora el panel conserva flex, el pie permanece visible y solo el contenido central se desplaza.

El cambio esta en `src/components/wine-import/nativeLabelSheet102.css`, importado por `LabelAnalysisView`. Los dos selectores exigen plataforma nativa, texto accesible y el panel de etiqueta. `src/index.css` y `supabase/functions/search-wines/index.ts` permanecen byte a byte iguales a `db6a181`. No se ha publicado la web ni alterado sus ramas de presentacion.

| Prueba | Esperado | Resultado observado |
| --- | --- | --- |
| Privacidad antes de seleccionar imagen | Ninguna peticion de deteccion/lectura | PASS, antes del consentimiento no se invoca ninguna |
| OCR guardado img-119, propuesta sin Premier Cru Morgeot | Sin identidad canonica ni afinidad prestada | PASS en flujo real de cliente con transporte interceptado; una deteccion, una lectura, ninguna consulta de catalogo |
| Panel con texto 200 %, antes del parche | Cerrar visible | FAIL conservado en `visual-final-r2` |
| Panel con texto 200 %, despues del parche | Pie visible, contenido desplazable, sin overflow | PASS, `visual-final-r3`, con limites verticales y boton de al menos 44 px comprobados |
| Correccion manual con texto 200 % | Campo editable; no inventar afinidad; Cerrar accesible | PASS, captura y snapshot accesible guardados |
| iOS Release final | Compilar, firmar y empaquetar el frontend exacto | PASS, `archive100-r2/ARCHIVE-RESULT.json` |
| iOS Simulator final | Compilar el mismo frontend | PASS; no equivale a recorrido UIKit |
| UIKit, teclado y auditoria nativa | Recorrido real del candidato | NO EJECUTADO: al terminar el build se detecto actividad real en el escritorio; no se tomo foco ni se inicio otro runner |
| Maestro Winerim completo y 200 identidades | Busqueda real por nombre/productor/anada y detalle compatible | BLOQUEADO: no se ha localizado un contrato autorizado del maestro; no se sustituyo por Library o un listado esperado |

El primer harness (`visual-final-r1`) solo verificaba overflow horizontal y produjo capturas full-page que redimensionan/repiten drawers fijos en Chromium. No constituye aprobacion visual completa. La segunda pasada anadio limites verticales/pie y encontro el fallo real. La tercera conserva esas aserciones, usa capturas de viewport para overlays y pasa con el arreglo. Se conservan las tres evidencias y los dos archives: el r1 anterior al arreglo NO es el candidato final.

## Catalogo: Nuevos Accesos Comprobados

Sin usar turnos de Lovable, el proyecto sigue en `8e48f4a8d8bc95eccc3d9206fad7fcb1502c1eba`, conocimiento vacio y cero conectores personalizados. Se listaron tambien los repositorios accesibles por CLI para todas las afiliaciones: no se encontro el servidor Symfony. La busqueda de codigo y las lecturas puntuales de `bridge-to-winerim` y `protocol-whisperer` no proporcionan el maestro de vinos; no se cambio ninguno de esos repositorios.

Se leyeron el HTML publico `https://web.winerim.com/the-library`, su entry `main-HDPRGBJV.js` y sus siete chunks precargados. El servicio de catalogo en `chunk-RBZVLNIE.js` utiliza rutas por restaurante: resolver slug, wines con text, wines/grouped y detalle por id/slug. No se observaron busqueda global por nombre/anada ni atributos del maestro completo. No se ejecutaron metodos de analitica, pedidos, ERP, quick-sheet ni escrituras. La documentacion CRM accesible es de usuarios/analitica, no un catalogo maestro.

Recibo: `qa-artifacts/native102-20261021/CATALOGUE-ACCESS-FINAL.json`. La ruta `GET /api/v1/matchrim/catalogue` sigue siendo una propuesta NO desplegada y NO probada. Su variable queda vacia en el build. No se insertan cookies de administrador o secretos en el cliente.

Los 200 recibos OCR y las imagenes existentes siguen conservados. Esta tanda no reejecuta su OCR ni llama al proveedor. El replay anterior sigue con 198 lecturas no vacias, cero identidades canonicas verificadas y precision/recall canonicos sin medir. No se presenta este QA interceptado como 200 reconocimientos correctos.

## Evidencias Y Reproduccion

Directorio: `qa-artifacts/native102-20261021/`.

- `final-r2/preparation.json`: source hashes, commit, configuracion, typecheck y hashes de todos los recursos.
- `final-build-r2.log`: build final; se conservan avisos existentes de chunks grandes y Browserslist antiguo, no errores de compilacion.
- `visual-final-r3/report.json`: 10 capturas y sus snapshots accesibles; llamadas externas interceptadas, no reenviadas.
- `visual-final-r3/qualifier-detail-393-200.png` y `manual-correction-text200.png`: pie fijo visible despues del arreglo.
- `archive100-r2/Matchrim100.xcarchive` y `ARCHIVE-RESULT.json`: archive final firmado. Xcode conserva avisos de Splash con dos elementos sin asignar.
- `simulator100-r1/BUILD-RESULT.json`: build de simulador; no instalacion ni lanzamiento.
- `simulator100-r1.log`: fallo inicial del comando de orquestacion por quoting, antes de arrancar Xcode; `simulator100-r2.log` conserva el intento correcto. No se borra el fallo.

Los comandos reproducibles exigen reservas propias vigentes y al menos 5 GiB libres; usar salidas nuevas:

```bash
node scripts/prepare-matchrim-native102.mjs <directorio-preparacion>
node scripts/qa-matchrim-native102.mjs <directorio-preparacion> <directorio-visual>
node scripts/archive-matchrim-native102.mjs <directorio-preparacion> <directorio-archive>
```

Variables de coordinacion: `MATCHRIM102_HEAVY_LEASE_ID`, `MATCHRIM102_WRITER_LEASE_ID`. No son claves de servicios. La preparacion obtiene solo la clave anon publica del bundle previo, rechaza claves con otro rol/proyecto y no la imprime.

## Gate De TestFlight

**No subido.** Hay un candidato firmado reproducible, no una aprobacion de catalogo/recognition E2E. Faltan el recorrido UIKit final y una lectura real autorizada del maestro para validar identidad y ficha sensorial. Ningun resultado sintetico habilita esa subida. No se ha usado el telefono fisico en esta tanda.

Consumo incremental: cero starts de modelos, cero turnos de Lovable, cero deploys, cero escrituras de produccion y cero publicaciones web. Sigue el techo anterior 20 etiquetas / 50 starts / 15 EUR y su conciliacion conservadora: no se liberan ni descuentan reservas SDK desconocidas. No se ha solicitado ampliacion.
