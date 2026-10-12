# Matchrim: carta a Bodega, procedencia y confirmacion del guardado

## Estado

MATCHRIM-HOY-20261012-05 cerrado como delta local, sobre `829b67511d0f61b4fddb7f67e43835c892e87d17`, rama `codex/matchrim77-challenge-20261008`. No es cierre del producto, aprobacion de recomendaciones reales ni candidato iOS certificado. Commit de cierre: el commit que introduce este informe.

Fuente activa comprobada: `App.tsx` -> `/escanear/carta-vinos` -> `Scan` -> `components/wine-import/ScanHub` -> `WineMenuScanner`. Lectura: `/my-wines/:section` -> `MyWines`. No se ha cambiado el scanner alternativo inactivo, AuthContext, funciones remotas, SDK, esquema o nativo.

El checkpoint anterior a las ediciones esta en `qa-evidence/matchrim-menu-save-2026-10-12/checkpoint05.md`. El hash anterior del escritor es `6c161d04f51ba10a75ee4ac6677c7b973663494f6fe7e321fc3fb003c0a56a28`. `source-stages.json` conserva las fuentes completas anteriores/finales y sus SHA256.

## Cambios Verificados

| Before | After | Why |
| --- | --- | --- |
| Manual 35 EUR, servicio BOTH, se publica como `price=35`; se pierden precios por formato y estado pendiente | `price=null`; JSON conserva manual35, copa25, botella25, moneda, origen y pendiente | No asignar un importe ambiguo a copa y botella |
| Copa EUR se guarda como precio financiero generico | Precio por copa en metadata; scalar financiero null | No intercambiar copa y botella |
| Bodega no muestra los precios de carta ni su procedencia | Grupo accesible, importes por formato, Manual/Carta, moneda pendiente y datos inferidos | Permitir revisar lo leido sin apariencia de verificacion independiente |
| Un importe por botella aparece repetido al incorporar procedencia | Una linea `Carta / Botella` cuando las lecturas coinciden | Menos ruido visual, sin perder los datos JSON |
| Atributos y score del modelo pasan a `user_wines`; tasted puede activar entrenamiento | Solo evidencia de ficha canonica separadamente obtenida puede aportar ficha/afinidad; guardar no entrena | Una foto o una intencion de cata no son feedback positivo |
| Ya Probados exige rating, ocultando una declaracion tasted sin valorar | Incluye `status=tasted OR rating no nulo`; muestra Pendiente de valoracion | Conservar la intencion sin inventar una valoracion |
| Ausencia/corrupcion de representacion se anuncia como Guardado | Guardado sin confirmar, sin label de exito; se bloquean repeticiones inmediatas del lote | La escritura podria haberse realizado aunque no se confirme |
| Scalar legacy/tampered puede reutilizarse sin unidad/origen | Adaptador de lectura lo enmascara y muestra incertidumbre; ninguna reescritura historica | No transformar datos anteriores ambiguos en importes acreditados |

## Contrato

Se usa exclusivamente el JSON existente `place_details`: `menu_price_snapshot.version=1` conserva `raw_amount`, `raw_currency`, `currency`, `service`, precios copa/botella/llevar, `origin`, `manual_pending`, flags de inferencia, identidad y texto fuente. Los antiguos `scanned_price/scanned_currency` siguen presentes para compatibilidad; no bastan por si solos para acreditar un precio.

`user_wines.price` solo admite una botella EUR con formato/moneda/precio no inferidos, identidad admitida por el gate actual, sin pendiente ni conflicto entre importe general y botella. Un cero explicitamente leido difiere de null; no se inventa cero ni EUR. No hay conversion de divisas ni afirmacion de compra.

`menu_wine_evidence` distingue catalogo de inferencia. El escritor exige ficha normalizada, ID canonico, identidad confirmada y afinidad calculada por el cliente con ficha/perfil antes de conservar score. Ningun caso de esta matriz fabrica una ficha/perfil positivos. `use_for_profile_training=false` en las tres intenciones de guardado. El lector activo tambien bloquea atributos/score/entrenamiento de antiguas filas menu sin procedencia acreditable; la lectura para estadisticas de aprendizaje incorpora `place_details`. El cambio de rating mantiene los guards existentes y no habilita entrenamiento de una fila menu sin atributos.

El insert solicita `.select(...).single()` y comprueba ID, propietario, identidad, estado, favorito, importe, atributos, score y snapshots. La comparacion JSON no depende del orden de claves de JSONB. Solo una denegacion explicita de entrada/constraint permite repetir; errores de transporte/permiso o representaciones vacias/incoherentes quedan sin confirmar. Guards de vida/propietario/lote descartan callbacks obsoletos; no se certifica cancelacion de escritura alojada.

## Matriz Expected/Actual

Importes de unidades/divisas/BOTH son contratos sinteticos derivados del replay ya existente, no nuevas detecciones. Cada fila tiene retrato 393x852 y paisaje 852x393.

| Caso | Esperado | Actual Antes | Actual Final |
| --- | --- | --- | --- |
| BOTH wishlist/favorite/tasted, manual35 EUR | Scalar null; conservar manual35 y lecturas25/25 pendientes | Scalar35, sin snapshot; tasted oculto | Null, manual pendiente, lecturas25/25; las tres secciones visibles |
| Copa EUR12 | No precio financiero por botella | Scalar12 | Null; metadata y lectura por copa |
| Botella EUR25 | Scalar25 con procedencia de carta | Scalar25 sin metadata completa ni vista | Scalar25, una linea por botella, origen Carta |
| Botella GBP35 | No conversion EUR; mantener GBP | Scalar null, sin vista | Null y GBP visible |
| Moneda null / servicio desconocido | No EUR ni formato inventado | Scalar null, sin vista | Null, moneda/formato pendientes |
| Servicio inferido, manual25 / lectura copa12 | No acreditar servicio; mantener ambos importes diferenciados | Sin procedencia completa | Null, manual pendiente y lectura12 marcada dato inferido |
| Denegacion 23514 | No exito ni fila; permitir reintento manual | No fila; error | No fila; no Guardado |
| Representacion vacia con fila en memoria | No certificar; evitar segundo insert automatico | Guardado | Sin confirmar; tres acciones bloqueadas |
| Representacion con scalar35 incoherente | No certificar ni reutilizar scalar | Guardado ignorando representacion | Sin confirmar; scalar enmascarado y aviso incoherente |
| Legacy sin snapshot | No acreditar scalar35 ni procedencia | Sin vista | Lectura anterior y formato/origen pendientes; scalar null solo en cliente |
| Manual botella35 EUR / manual copa15 EUR | Actualizar solo el formato conocido; mantener origen Manual | Baseline UI no ejecutado para estas dos extensiones | Botella35 / copa15, pendiente false, solo botella en scalar |

La matriz por caso/orientacion con payload anterior/final y texto del lector esta en `qa-evidence/matchrim-menu-save-2026-10-12/expected-actual.json`.

## QA Y Denominadores

- Baseline: 26 contextos, 186/280 comprobaciones; 0/26 contextos completos. Fallos de procedencia/entrenamiento/representacion/visibilidad reproducidos, no precision OCR.
- Primario final: 26/26 contextos, 364/364 checks; extension de formato manual: 4/4, 56/56. Total final: 30/30 y 420/420, 28 intenciones SDK insert aisladas y dos lecturas legacy sin insert.
- 48/48 contratos puros, incluidos tres contra el normalizador real de Bodega extraido por AST: legacy, incoherencia tras enmascarar y aislamiento de fuentes no-menu. No son 48 escenas ni usuarios.
- 112 PNG finales. Se conservan baseline y dos rondas diagnosticas: 247 PNG en total, 289 entradas SHA256. Las rondas repetidas no cuentan como usuarios ni escenas independientes.
- Todas las peticiones HTTP no-locales se interceptan antes de fake auth y navegacion; WebSocket no-local se cierra. Firma de sesion deliberadamente invalida; no alta/cuenta/perfil humano. Lectura SDK en memoria descartada por contexto, no persistencia alojada/RLS. Cero llamadas remotas reales de app, cero llamadas pagadas, cero nuevas fotos enviadas. La consulta de documentacion publica Supabase no es trafico de la app.
- Ningun error runtime. Solo dos mensajes de consola 400 esperados en las denegaciones sinteticas. Sin POST adicional de entrenamientos/eventos, PATCH, DELETE o PUT.
- Retrato/paisaje: sin overflow horizontal; lineas de procedencia dentro de grupo y sin solaparse; ultimo control de tarjeta alcanzable por encima de barra nativa. Capturas completas de viewport corroboran el scroll. No es VoiceOver, Dynamic Type de iOS ni QA fisico.
- Typecheck verde. Lint verde con los mismos 106 warnings preexistentes y cero errores. Build web 5.97s, warnings previos de chunks/Browserslist; no cambio de dependencias para ocultarlos. Los snapshots llevan sufijo `.txt` para no duplicar entradas de lint. Logs y tiempos de proceso en `verification/`.
- Seis fuentes protegidas sin cambios. Cuatro funciones de guard/acciones y el preambulo de propietario/controladores en MyWines son byte-identicos al baseline. No se han repetido las suites verdes de 04.

## Reproduccion Local

Desde `/Users/GOIKO/2matchrim76-recognition-20261008`:

```bash
npx tsx scripts/check-matchrim-menu-save-oct12.ts --output /tmp/menu-save-pure.json
node scripts/verify-matchrim-menu-save-oct12.mjs /tmp/menu-save-verification
/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim73-qa-20261007/.venv/bin/python /Users/GOIKO/.codex/skills/webapp-testing/scripts/with_server.py --server 'VITE_APP_ANALYTICS_ENABLED=false npm run dev -- --host 127.0.0.1 --port 4452' --port 4452 -- /Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim73-qa-20261007/.venv/bin/python scripts/qa-matchrim-menu-save-oct12.py --output /tmp/menu-save-ui
```

La extension se ejecuta con `--cases bottle-manual:portrait,bottle-manual:landscape,cup-manual:portrait,cup-manual:landscape`. El harness bloquea egress antes de cualquier sesion; no desactivar esa interceptacion para reutilizar la sesion invalida. No incluye un benchmark de rendimiento real ni escenarios multiusuario concurrentes.

## Residual Y Siguiente Gate

Pendiente local concreto: asociar acciones sucesivas wishlist/favorito/tasted al mismo ID retornado, revisar cambios de identidad posteriores al primer guardado y evitar duplicacion entre acciones o reescaneos. Este ledger solo impide repetir inmediatamente una intencion ambigua dentro del lote; no es deduplicacion persistente. Tambien falta un flujo explicito para resolver formato/moneda de importes manuales pendientes, sin inferirlos.

Gate externo separado: lectura/escritura y readback con propietario real en un canal autorizado, precision independiente del proveedor, aprendizaje/recomendaciones reales y QA nativo. El JSON es procedencia del cliente, no una firma contra clientes maliciosos; backend/RLS no se han auditado ni modificado aqui. Los consumidores remotos de filas historicas requieren su propia comprobacion; este delta no sanea la base ni certifica todos los lectores.

Sin deploy, push, publicacion, build nativo ni TestFlight. La invitacion solicitada a `avueltasconelmundo@hotmail.es` sigue sin enviarse por el gate de sesion/cuenta Apple ya documentado; no se ha vuelto a pedir ni inspeccionado Apple durante este bloque.

Decision humana agrupada para el carril de lanzamiento: completar la sesion del propietario de App Store Connect para invitar al tester a la ultima version realmente disponible; estos cambios locales no equivalen a un nuevo build publicado.

Documentacion primaria consultada: [insert y representacion](https://supabase.com/docs/reference/javascript/insert), [filtros OR](https://supabase.com/docs/reference/javascript/or). La sintaxis tambien se contrasto con el SDK instalado; ninguna actualizacion de API/paquete.
