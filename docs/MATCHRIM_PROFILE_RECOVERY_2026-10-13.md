# Matchrim08: recuperar perfil sin repetir OCR

## Estado

Delta local08 sobre301d078854d3e1594645d76f1fb24dea61eb0be7, limpio al iniciar. Fecha local13Oct2026 Madrid. No es cierre del producto, perfil humano recuperado, aprobacion de recomendaciones ni release.

Checkpoint anterior a producto en qa-evidence/matchrim-profile-retry-2026-10-13/checkpoint08.md. SourceSHA iniciales: scanner4b04cfdd521c5750f13e14dce22270952a42137ac4849ae2ae0fc82c1ce8a80e; resolver321de8b21cec93e6500aa3804225911e1035283df55e565c33d715bf4f248d4d; loader70121f6a835a98299b8d0cb95c2b3167f8865233d88a3916987ae2ab8fa02633.

Reproduccion propia before, dos orientaciones: error500 quedaba igual que ausencia y no habia boton. Cada contexto hizo1GETbase,1OCRstub y1canonicalstub, con precio manual35 y seleccion0; cero escrituras.

## Before/After

| Before | After | Why |
| --- | --- | --- |
| Basefail se convierte en null igual que0rows | ready/missing/invalid/base-error/base-timeout/training-error/training-timeout | Ausencia no equivale a error transitorio |
| Reintentar implica otro analisis de foto | Reintentar perfil ejecuta solo loader del owner | Ahorrar OCR, latencia y gasto |
| No hay progreso/cancelacion independiente | Estado accesible, bloqueo de dobleclick y cancelacion X | Un intento explicito y acotado |
| Trainingfail con base valida carece de estado propio | Se conserva quiz, samples=null y estado parcial retryable | No inventar aprendizaje ni descartar base valida |
| Recuperar perfil podria reutilizar score del modelo | Solo calculo local con ficha/ID/source/atributos ya retenidos y acreditables | Un perfil no acredita por si solo un vino |
| Callback tardio atraviesa contextos | Controller/generation/owner propios; abort en cierre/cancel/clear/nueva seleccion/unmount | No publicar datos del owner/lote anterior |

No se imprimen errores privados ni filas. Timeout solo se diagnostica cuando vence el timer de5s existente, no por inferir red lenta. Unknown failure se presenta como no se pudo cargar. Missing/invalid no son retryables como fallos transitorios; anonymous missing se describe como perfil local, no cuenta. No se fuerza rehacer el quiz por lectura fallida.

El loader conserva exactamente las dos query chains: quiz_results GET owner/latest/limit1/maybeSingle; training user_wines GET mismoowner/use_for_profile_training=true/rating y atributos no-null. SDK/auth/RLS/esquema sin cambios. [maybeSingle admite cero o una fila](https://supabase.com/docs/reference/javascript/maybesingle); no-row es ausencia valida.

retryScanProfile no llama analyzeFile, scan-wine-menu, prepareImage, canonical lookup ni escrituras. Ref sincronica impide paralelos; no hay retry automatico, loop o backoff añadido. Su generation/controller son independientes de saveLifetime/ledger06. Solo publica snapshot actual y actualiza localmente compatibilidad/affinity_calibrated/razon, no foto/cajas/identidad/precios/currency/servicio/seleccion/recuento/favorito/tasted/rating/training.

refreshMenuProfileAffinity conserva restantes campos y referencias posicion/precios. Exige source=catalog, canonicalId previo, identidad admitida y atributos previos suficientes para el calculo local existente. No reconstruye ficha desde nombre/OCR/modelo ni restaura rawscore descartado. Sin esa evidencia, perfil disponible y afinidad pendiente coexisten. Semantica07, umbrales55/70/85 y algoritmos intactos.

## QA Expected/Actual

| Caso | Resultado Medido |
| --- | --- |
| Error500 -> retry -> null200 | Error desaparece; ausencia valida no retryable; no perfil/afinidad fabricados |
| Error persiste | Un GET adicional; sigue error y boton manual; no loop |
| Dobleclick | Un unico segundo GET; base=2 |
| Cerrar/cancelar X | Abort observado; respuesta tardia no publica ausencia |
| Owner SDK event | Antiguo controller abortado; no publicacion anterior |
| Clear/Quitar carta | Lote invalidado; ningun OCR adicional |
| Unmount al selector /escanear | Abort/cleanup; base2, OCR1, canonical1 |
| Timeout de retry | Timer real5s; distinto de ausencia, manualmente retryable |

Primario final18/18 contextos,226/226 checks: nueve recorridos con393x852 y852x393. Cada contexto mantiene OCR1/canonical1/base2. No son18 usuarios/escenas. Una imagen/contratoBOTH sintetico ya existente; firma deliberadamente invalida/estado aislado/HTTP-WS antes auth y navegacion/SW bloqueados/analytics=false.

27/27 contratos puros y callback activo por AST: payload valido/invalido/ausente, error/timeout/partialtraining, cancelacion, gates de ficha retenida y campo-no-modificado. Ficha matematica positiva CONTRACT_NOT_A_REAL_WINE/SYN-CONTRACT-SHEET no es vino real validado. Sin UI de perfil positivo/ficha humana ficticios.

ID guardado06: replay del ID exacto de SDK-stub dentro de Map de refs simulado, ejecutando callback activo08. Conserva ID, tamano de ledger y precio pendiente. No se insertan filas nuevas para certificarlo ni se afirma persistencia/ledger UI preexistente real. Cinco initializers (save, edicion, reset, normalizacion y decision07) son byte-identicos.

Imagen UI: SHA256 del dataURL igual antes/despues; manual35 y lista/recuento/identidad/seleccion permanecen. Cajas/precios como referencias y restantes campos son invariantes puros del mapper. Nueva seleccion aborta antes de reset en contrato lifecycle/AST; no se lanzo otra imagen para probarlo. Same-file renombrado06 no certifica mismo archivo/cancel/iOS y sigue intacto.

Rondas rojas conservadas: after-first close capturo panel cerrandose, se espera ocultacion antes de reabrir; after cancel no estaba retenido en stub y devolvia null temprano. Se corrigieron esos aspectos del harness y se repitieron solo dos cancel. Unmount hacia Inicio disparaba tercera lectura del destino; se repitieron solo esos dos hacia selector sin GET ajeno. No cambios de producto para hacer verdes esos problemas de fixture/navegacion.

Primario: after excepto cancel/unmount, sustituidos por after-cancel/after-unmount. Recibos/counters/checks/abort events/snapshots en primary.json, rondas conservadas.58 PNG,112 hashes,19 fuentes finales/snapshots,15 baselines. Doce fuentes protegidas y506 entradas05/06/07 intactas. Source-stage hashes identifican rondas; full snapshots solo baseline/final, no todo source transitorio.

Lint/tsc SOLO cuatro modulos y dependencias importadas: exit0, stdout/stderr y comandos en verification.json. Sin suites05/06/07, build web/nativo, SDK downloads/Xcode. Cero runtime errors/overflow horizontal; controles accesibles y screenshots del panel asentado. Abortados auditados; fallo de fulfill solo admisible si hubo requestfailed del cliente, no silenciar aislamiento. No los hubo en finales.

Cero REST writes/feedback/history/perfil/rating/training, cuentas reales, proveedor/egress de app, llamadas pagadas/gasto nuevo. POST inicial a funciones es stub, no vision/canonical real. No reconocimiento/precision/recall nuevos, RLS/backend, usuarios reales, Dynamic Type/VoiceOver/QA fisico acreditados.

## Reproduccion

Repo /Users/GOIKO/2matchrim76-recognition-20261008; scripts/qa-matchrim-profile-retry-oct13.py con Vite4455/analytics=false y wrapper with_server. Default recover en ambas orientaciones; --cases usa la matriz. No desactivar interception ni auth fake contra backend.

npx tsx scripts/check-matchrim-profile-retry-oct13.ts <result-json> prueba08. Packer recoge receipts/source/PNG, contrasta queries/manifests y ejecuta solo tsc/lint del delta. Config scoped incluido; no produce build distribuible.

## Residual Y Gates

Siguiente hueco observado, no ejecutado: aiRIM muestra Identidad lista y afirma vino confirmado con fuente inference y canonical lookup vacio en este recorrido. Screenshot after/recover-portrait-viewport.png y buildAiRimContextGuide lo respaldan: frase basada en senal/ausencia de dudas, sin canonicalId. Distinguir senal/candidato de verificacion/canonico/humana es frontera de lenguaje/procedencia pendiente; no cambiar modelo por inercia.

Recuperacion real con perfil humano/ficha no aprobada E2E. Shared loader devuelve status adicional; otro scanner consume nota pero no recibe nuevo boton08. No dedup persistente, saneamiento historico ni entrenamiento remoto certificado. Corpus/holdouts/ledgers y baseline80 (sin cambios posteriores) conservados.

Encargos independientes: reconocimiento/corpus/QA funcional-inteligencia/cuentas completas/estudio largo/identidad-precios/distribucion/invitacion Apple. Gates humanos agrupados: canal E2E real/proveedor/dispositivo y firma/cuenta/sesion Apple para invitacion/TestFlight. No preguntados de nuevo ni inspeccionados. Sin push/deploy/produccion/Apple/movil/TestFlight/subidas08.
