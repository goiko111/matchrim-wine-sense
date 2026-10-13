# Matchrim: cancelacion durante ranking y catalogo pendiente (15)

## Resultado Y Alcance

Corregido un P1 reproducido sobre baseline `1c8c8805a368c211895b89e69c0f3313befbd771`: cancelar durante "Ordenando resultados..." no recuperaba la interfaz hasta que terminaban las dos consultas al catalogo. La UI seguia bloqueada en las muestras de 100, 1000 y 2000 ms. No se define un SLA de un segundo ni se afirma que la consulta externa estuviera abortada.

El parche limita la espera a la vida del analisis mediante `awaitMenuCatalog`; el resultado/error tardio de la operacion original queda consumido sin publicarse. El feedback de cancelacion exige el controlador actual. El guardia existente de `finally` permanece intacto. El helper global, argumentos de busqueda, SDK, autenticacion, RLS, matching, scoring, estilos y guardado no cambian.

## Antes Y Despues

| Before | After | Why |
| --- | --- | --- |
| Cancelar durante ranking conserva loader e inputs deshabilitados mientras el catalogo sigue retenido. | Feedback cancelado, loader fuera e inputs habilitados sin liberar el catalogo. | La interfaz deja de depender de una promesa externa sin cancelacion propia. |
| La salida se observa solo tras liberar las respuestas antiguas: 2081,2/2089,9 ms en los ensayos completos. | Recuperacion DOM observada a 2,5/2,8 ms, con ambas consultas antiguas aun pendientes. | Medida del ensayo local, no latencia del modelo ni SLA de produccion. |
| No es posible iniciar el siguiente analisis mientras permanece bloqueado el primero. | Quitar carta, Subir archivo y elegir el mismo path permiten un nuevo ranking antes de terminar el antiguo. | Recuperacion por controles visibles; no manipulacion de loading, inputs o controladores. |
| El lookup no recibe un signal de red del scanner. | Sigue sin recibirlo; la espera local se interrumpe y los callbacks antiguos no contaminan el reintento. | No se inventa cancelacion de servidor/proveedor, devolucion de cuota ni ahorro de coste. |

## Matriz De Pruebas

| Prueba | Expected | Actual |
| --- | --- | --- |
| Reproduccion previa, teclado 393x852 y toque 852x393 | Confirmar comportamiento real antes de editar. | `before` y `before-complete`: 22/24 checks, dos fallos de recuperacion mientras el catalogo estaba pendiente. |
| Cancelar durante ranking sin liberar lookups | Recuperar feedback/loader/inputs y permitir reintento. | `after`: 2/2 rutas, 24/24 checks; recuperacion independiente de respuestas externas. |
| Respuesta antigua 200 vacia o error antiguo 503 con intento nuevo pendiente | No sustituir loader, filas, feedback o toast del nuevo intento. | Dos lookups antiguos por ruta liberados; estado nuevo intacto durante 1400 ms. |
| Reintento con mismo archivo | Mismo path, nombre, MIME, bytes y lastModified tras Quitar carta. | Dos selecciones por ruta iguales; cuatro candidatos finales en el orden original. No certifica selector OS/iOS. |
| Plan real de llamadas del cliente | No lecturas extra por callbacks tardios. | Cada intento: 3 OCR locales, 2 lookups vacios, 1 GET de perfil null. Total por ruta: 6/4/2. |
| Limpieza y propiedad de la espera | Un settle, limpieza de listener, preabort sin lookup, rejection tardia consumida. | 25/25 pruebas puras/AST/proteccion de fuentes. |
| Regresion de codigo | Solo wrapper de espera y guardia del feedback. | AST completo de processFile igual al baseline al retirar esos dos cambios; efectos y resto de inicializadores intactos. |
| Typecheck y lint de alcance | Sin errores nuevos. | Ambos exit 0; comandos y stdout/stderr retenidos en verification.json. |
| Consola y red | No errores inesperados, egress real ni escrituras. | Portrait sin diagnosticos; landscape conserva dos warnings del helper y dos errores de recurso 503 esperados. Ningun pageerror/requestfailed. |
| Evidencia previa | No sobrescribir otros gates. | 25 fuentes y 1264 entradas de evidencias 05-14 verificadas sin cambios. |

## Datos Y Limites

Una escena existente: `IMG_7547 2.jpg`, JPEG, 2303531 bytes, lastModified 1791448774457, SHA `2b1da6ac2ab548346df754cc67a76b6d7a25cc28efb893564d49b9f7508c4194`.

Contrato BOTH completo de cuatro candidatos, SHA `1c6d8bd4e5d9aa392f476a66ba7a86e8c6a055f752110f3bef008450c6de6e9e`: Lugana Allegrini, Barbaresco Marchesi di Barolo, Barolo Marchesi di Barolo y Laurent Perriere Ultra. Son respuestas controladas del corpus; no nuevas identidades canonicas demostradas, precision/recall ni reconocimiento real. Perfil GET null, sin datos positivos ni afinidad inventada.

HTTP y WS interceptados antes de fake auth/navegacion, SW bloqueados y analytics desactivada en el servidor local. Cero llamadas remotas de la app/proveedor/pagadas, escrituras REST o cuentas reales. Se mantienen consultas HTTP simuladas en segundo plano: ausencia de requestfailed no es evidencia de cancelacion de red. El error 503 de control y los warnings existentes se guardan, no se silencian en el producto.

La seleccion usa Subir archivo real y FileChooser estandar de Playwright/Chromium por path, tras limpiar con Quitar carta. No prueba camara, selector nativo, iPhone, permisos o VoiceOver. Revisadas capturas vertical/horizontal del alcance; sin nuevo desbordamiento horizontal al completar. No se certifican todas las pantallas, texto dinamico ni todo el layout de la app.

Antes de implementar se revisaron el changelog y la [documentacion oficial de functions.invoke](https://supabase.com/docs/reference/javascript/functions-invoke). El cambio no modifica ese API ni utiliza esa lectura como garantia de cancelacion en servidor. No se hicieron SQL, despliegues ni consultas reales.

## Evidencias Y Reproduccion

Directorio: [evidencias](</Users/GOIKO/2matchrim76-recognition-20261008/docs/qa-evidence/matchrim-menu-ranking-cancel-2026-10-13/primary.json>). 99 entradas SHA, 24 PNG, 30 snapshots finales y 26 baseline. `manifest.json`, `source-stages.json`, `verification.json`, los resultados before/before-complete/after y los contratos conservan los resultados completos.

Scanner antes: `799cad0234299a39e9ce09ce8a4aa1e1bbb356716bde2fa439bebf2e3490b962`; despues: `58fa342fa3bb71c51512b6558fb56b29b10bf56b3d5a0131a0c5dd94fac1c105`. Helper nuevo: `79174879adf7eed910a07e3aafc0f5ce24eb4c6490a1581402c87ce567422b2a`.

El diff-check del codigo/scripts/informe pasa. El global avisa solo de whitespace previo en snapshots byte-identicos de Scanner/AuthContext/MyWines; se conservan sus bytes/hashes, sin limpieza ajena. Las 99 entradas del manifest y las 30 fuentes estan comprobadas tambien contra el index de Git antes de commit.

Transparencia de pruebas: el primer harness tenia una observacion de red tautologica. Before-complete, ejecutado antes del parche, anade predicado de dos requests retenidos/sin requestfailed y timestamp pasivo. El snapshot final del harness corresponde a before-complete/after, no reconstruye el script inicial. `contracts-initial.json` conserva 24/25: el guardia de inicializadores excluia processFile pero no sus descendientes; se corrigio el test y se mantuvo la comparacion AST completa.

Reproduccion en este Mac con Python/Playwright existentes, sin instalar SDK o dependencias:

```bash
/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim73-qa-20261007/.venv/bin/python /Users/GOIKO/.codex/skills/webapp-testing/scripts/with_server.py --server "VITE_APP_ANALYTICS_ENABLED=false npm run dev -- --host 127.0.0.1 --port 4462 --strictPort" --port 4462 -- /Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim73-qa-20261007/.venv/bin/python scripts/qa-matchrim-menu-ranking-cancel-oct13.py --output /tmp/matchrim-ranking-cancel-local
```

Ejecutar desde el repo; salida nueva separada para no sobrescribir evidencias. Los comandos de contratos/typecheck/lint estan en `verification.json`. No se reejecutaron suites anteriores, build web o build nativo; no hay nueva version TestFlight ni QA global aprobado.

## Residual

Siguiente hueco concreto, no ejecutado: cancelar durante conversion PDF previa al OCR. Los gates de reconocimiento con proveedor, camara/selector fisico, iOS/VoiceOver y publicacion siguen independientes. Este bloque no aumenta el dataset ni redefine identidad, confianza o afinidad.

Sin push, deploy, Apple, telefono, TestFlight o contactos en15. La invitacion solicitada sigue pendiente del gate de sesion autorizada de App Store Connect previamente registrado; no se ha enviado ni se ha vuelto a comprobar Apple. Entrega local preparada para revision, no producto completo.
