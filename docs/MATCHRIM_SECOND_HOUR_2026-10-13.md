# Segunda Hora: Imagenes, Revision Humana Y Memoria

Inicio autorizado: 2026-10-13 06:13:03 UTC. Trabajo local continuado durante mas de una hora y cierre de evidencias. Baseline limpio `3ad38f28badb59c03a1217c0ed1deb1a1581421a`, rama `codex/matchrim77-challenge-20261008`. Sin cambios de detector, matching, catalogo, scoring, perfil, corpus o Edge Functions. Sin push, deploy, cuentas reales, proveedor de vision o TestFlight.

## Cambios Verificados

| Before | After | Why |
| --- | --- | --- |
| El HEIC falla antes de tener preview y vuelve al selector sin aviso visible | Aviso accesible de apertura local, reintento del archivo, descarte y nueva seleccion | Evitar un fallo silencioso y permitir recuperar el flujo |
| Sin red se podia explicar el fallo de formato como fallo de conexion | Error local tipado tiene prioridad sobre el estado de red | No atribuir un problema del archivo al proveedor |
| Confirmar un candidato decia que se habia introducido manualmente y siempre dejaba la afinidad pendiente | Revision humana; distingue score previo valido de datos insuficientes | Confirmar identidad conserva el score anterior, corregir identidad lo elimina |
| Un aviso flotante por cada confirmacion; intento de cierre interceptado por el drawer | Estado persistente anunciado dentro del detalle, sin toast de identidad | Feedback legible sin competir con el vino seleccionado |
| Sonner 1.5.0 deja escuchas de visibilitychange tras desmontar avisos | Sonner 2.0.8 fijado; cierre accesible en castellano | Correccion publicada de la eliminacion de escuchas, sin parchear node_modules |

La preparacion muestra su estado y cancelacion incluso sin preview. Un fallo tardio de un analisis cancelado u obsoleto no puede sobrescribir la sesion actual. El calculo de afinidad y las reglas de identidad/deduplicacion permanecen byte a byte iguales a la baseline protegida.

## Expected / Actual

| Prueba | Esperado | Actual |
| --- | --- | --- |
| HEIC real aportado, Chrome movil, camara/galeria x retrato/paisaje | Explicar fallo local y no llamar al backend | Baseline 28/44; final 72/72, cuatro rutas, cero llamadas remotas reales |
| Reintento HEIC sin red | Mantener motivo de formato, no conexion | Pasa en las cuatro rutas |
| Descartar y volver a seleccionar el mismo archivo | Input limpio y nuevo intento | Pasa; posterior JPEG original recupera el lote |
| Creacion, confirmacion y edicion manual x dos orientaciones | Revision humana sin 100% del modelo; lista/comparador coherentes | Baseline 72/84; final 96/96 |
| Prototipo con toast reutilizado | Cierre operable sobre el drawer | Fallo real de intercepcion; 52/54 comprobaciones parciales y seis casos fallidos conservados. Sustituido por estado dentro del detalle |
| Contratos de caption, errores y proteccion | Score 0/82/100 no se declara pendiente; null/invalidos si | 61/61, incluidos 42 archivos protegidos; ejemplos numericos sinteticos, no usuarios reales |
| Componente de avisos, 25 creaciones por orientacion | Cierre de 44x44 y cero escuchas residuales | Dos rutas pasan, 50 creaciones por controles reales; visibilitychange inicial/final 0/0 |
| npm test | Regresiones locales existentes | Exit 0; incluye contratos, simulacion determinista, identidad y manifests existentes. No es una simulacion nueva de 10.000 personas |
| Typecheck / lint acotado / build | Compilacion y ausencia de nuevos errores | Typecheck 0; lint 0 errores, aviso heredado de exportacion mixta en sonner; build 6.87 s, 3.636 modulos y 146 archivos |

La comprobacion de formato utiliza `IMG_7547 2.HEIC` solo localmente. Chrome no abre este archivo; esto NO demuestra que WKWebView/iPhone carezca de soporte HEIC. Camara significa selector HTML con capture=environment, no permiso o captura fisica. No se han evaluado de nuevo las otras fotos del propietario ni precision OCR real.

El JPEG de recuperacion es el canario publico original de carta de comida, sin cambiar sus pixeles o ground truth. Sus respuestas de vino son las respuestas locales antiguas interceptadas: validan flujo y geometria del cliente, nunca reconocimiento real. Perfil null, catalogo vacio, ninguna nueva afinidad positiva de usuario inyectada.

## Memoria: Resultado Acotado

Se realizaron seis sesiones diagnosticas: 48, 121, 24, 243, 24 y 49 ciclos; 509 en total, pero solo los ultimos 49 corresponden al candidato final sin toast de identidad. Las capturas de heap completas se conservan fuera del repo. GC explicito y descarte de consola estan identificados por sesion: no se mezclan con la medicion sin GC de la primera hora.

- Baseline rapida: 121 avisos pendientes en el DOM tras 121 ciclos, aunque solo uno visible; al esperar 8 s el DOM baja de 1.332 a 120 nodos y los avisos desaparecen. No era por si solo prueba de fuga permanente.
- Baseline de escuchas: 24 visibilitychange siguen en document tras 24 ciclos y reposo. El codigo 1.5.0 registra en document y elimina de window. 1.7.4 conserva ese defecto; no se eligio como solucion.
- Sonner 2.0.8 corrige el target. El componente real vuelve a cero escuchas tras el reposo. Fuente primaria: [release 2.0.8](https://github.com/emilkowalski/sonner/releases/tag/v2.0.8), [hook mantenido](https://raw.githubusercontent.com/emilkowalski/sonner/main/src/hooks.tsx); tambien se verificaron codigo e integridad del paquete instalado. El lock cambia solo Sonner.
- Prototipo de 243 ciclos: DOM visible estable en 132 nodos y un aviso, pero el contador CDP de nodos sigue creciendo. Por eso no se declara memoria aprobada.
- Candidato final: 49 ciclos verdes, sin avisos de identidad; DOM visible 121 nodos, 0 imagenes/canvas/drawers tras reset, visibilitychange final 0. Heap antes de GC 13,52-26,81 MiB; tras reposo/GC, 13.853.092 bytes, 5.403 nodos CDP y 516 listeners totales. Estos ultimos contadores no estan certificados como sanos.
- La limpieza de consola y la liberacion de handles de listeners no eliminan todo el crecimiento. El analisis de retencion de li ya no muestra avisos de identidad, pero falta atribuir los nodos/listeners restantes. No se hicieron limpiezas especulativas del pipeline de imagen ni se midio RSS/nativo.

## Evidencias Y Reproduccion

Evidencia empaquetada: `docs/qa-evidence/matchrim-second-hour-2026-10-13`, con manifest SHA-256, resultados fallidos previos, rutas finales, metricas por ciclo, retencion derivada, snapshots de fuentes y hashes del build. Se verificaron las 1.971 entradas anteriores sin modificarlas.

Las fotos del propietario, capturas derivadas de su prueba HEIC y heaps completos quedan en `/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim-second-hour-20261013`. No estan copiados al repo, enviados, publicados ni compartidos.

Herramientas: `qa-matchrim-image-recovery-oct13.py`, `qa-matchrim-identity-notice-oct13.py`, `qa-matchrim-memory-oct13.py` y `qa-matchrim-notifications-oct13.py`. Usan el wrapper with_server.py, fixture bypass=false, analytics=false, service workers bloqueados, HTTP/WS externo interceptado antes de autenticacion sintetica invalida. El probe de avisos es una pagina de componente solo de desarrollo y no aparece en los 146 archivos del build.

## Gate Residual

P1 interno: atribuir el crecimiento de nodos/listeners CDP con una sesion sin instrumentacion acumulativa y con retencion por tipo; luego medir memoria fisica. P0 externo sin cerrar: reconocimiento de las escenas reales con proveedor, catalogo/perfil y resultado esperado por referencia; QA nativo de permisos, HEIC, VoiceOver/Dynamic Type, reinicio y red real. No se reinicio proveedor, ledger, dataset o estudios de preferencias. La invitacion TestFlight anterior sigue pendiente del gate Apple existente. Esta entrega no autoriza ni prepara una subida fingida a TestFlight; no hay nuevo numero de build iOS.
