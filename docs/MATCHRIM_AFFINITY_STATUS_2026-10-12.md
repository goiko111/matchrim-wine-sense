# Matchrim07: afinidad pendiente no es rechazo

## Estado Y Reproduccion

Delta local07 sobre `9c3a59ca54793b9b7a86a8e5675da2f578fd4900`; repo limpio al iniciar. SourceSHA del scanner antes: `a1f0e716e8028fb39c7563c3070e0f0a003dff8d2ab518c890f2ccc0e21c0e1a`. Nombre de artefactos basado en fecha UTC12Oct; cierre ya13Oct en Madrid. No es cierre de producto ni release.

Checkpoint07 previo en `qa-evidence/matchrim-affinity-status-2026-10-12/checkpoint07.md`. Reproduccion propia antes de editar: dos orientaciones,0/2 contextos,12/22 checks. Cada tarjeta mostraba dos `Sin encaje`; explicacion decia datos insuficientes y el detalle `Afinidad estimada` con guion. Cinco contradicciones del nuevo contrato por contexto, no resultados negativos calculados.

Fuente inspeccionada: `normalizeScannedWine` normaliza el raw score; `applyMenuWineEvidence` elimina numericos del modelo salvo ficha canonica separadamente enlazada y perfil utilizable. Perfil ausente/incompleto/error queda unavailable; durante su carga no hay resultados nuevos. Este pipeline no fue modificado ni sustituido por fixtures positivos.

## Before/After

| Before | After | Why |
| --- | --- | --- |
| Missing/null se etiqueta Sin encaje | Afinidad pendiente en lista, badge, tarjeta y detalle | Ausencia de calculo no es preferencia negativa |
| Explanation puede parecer otra clase de resultado | Estado accesible con la misma causa y aclaracion No es un resultado negativo | Una unica semantica de abstencion |
| Guardas de presentacion se basan solo en valor no-null/numerico | Solo score finito0-100, calibrado y perfil disponible entra a vistas numericas | No mostrar NaN/Infinity/numericos no acreditados ni inventar0 |
| Perfil unavailable invita a Completa el quiz aunque haya fallo de carga | Perfil no disponible, sin atribuir una causa no demostrada | No culpar al test cuando fallo la consulta |
| Accion Por que encaja presupone encaje | Consultar afinidad | Consulta neutral incluso si falta calculo o el resultado es bajo |
| Umbrales existentes55/70/85 | Mismos labels, descripciones, clases y scores para controles validos | No cambiar algoritmo, recomendacion, normalizacion o modelo |

`presentMenuAffinity` es solo presentacion: no convierte strings, no redondea, no calcula ni escribe score. Un30 finito/calibrado mantiene No priorizaria; null/missing/no-calibrado/no-finito retienen score=null y etiqueta pendiente. Un0 explicitamente calculado se distingue de ausencia; no se fabrica un0 para falta de datos.

La integracion activa exige el flag existente `affinity_calibrated===true` y perfil cargado. La causa procede del snapshot real de perfil o la razon ya existente de la fila. La explicacion calculada anterior sigue intacta para resultados acreditados; en pendientes se muestra abstencion, sin un desglose numerico a partir de hipotesis. La funcion global de explicacion/calculo no cambia.

No se toco normalizacion, resolver/canonical, sensory, aprendizaje, thresholds de identidad/precio, perfil ni handlers06. saveScannedWine, updateScannedWine, resetSaveBatch, normalizeScannedWine y getSimilarWines son byte-identicos al baseline segun AST. Solo scanner y nuevo helper de presentacion son delta de producto.

## QA Y Denominadores

- Una imagen ya existente y el contratoBOTH sintetico de04. Seis variantes negativas declaradas: null, missing, modelo no-calibrado, stringInfinity, perfil-error500 y perfil-loading. No son nuevas escenas, personas, OCR o recomendaciones reales.
- Principal after:12/12 contextos (393x852 y852x393),134/134 checks. Es la implementacion semantica antes del ultimo cambio solo-texto de CTA.
- after-visual:2/2,26/26 checks de los mismos null. La primera captura del drawer era a medio movimiento; se espera al panel asentado, se lleva el status a vista y se verifica contencion/legibilidad. No se cambio layout para corregir un supuesto fallo de animacion.
- final-visual:2/2,28/28 checks, misma ausencia y fuente final con CTA neutral. No se repitieron los otros diez contextos verdes por cambiar un texto; los stages y recibos separan esa diferencia.
-33/33 contratos: matematicos calibrados0/30/54/54.9/55/69/70/84/85/100 contra el helper viejo, negativos de tipo/rango/calibracion, wrapper activo sin perfil y cinco invariantes protegidos por AST. Estos controles son contrato UI, nunca perfil/ficha/recomendacion real nueva. No hay UI positiva alimentada por una ficha/perfil ficticios.
- Compilacion solo de los dos modulos cambiados, declaracion Vite y dependencias importadas: verde en fuente final. Lint especifico: cero errores/warnings. Sin repetir05/06, otras suites o builds verdes; sin build de distribucion.
-42 PNG conservados,91 entradas SHA256,17 fuentes finales/snapshots y13 baselines. Doce fuentes protegidas y las415 entradas de evidencias05/06 siguen byte-identicas. Source-stage hashes en `source-stages.json`.
- HTTP/WS interceptados antes de auth/navegacion, SW bloqueados, firma deliberadamente invalida. Cero cuentas/usuarios reales, escrituras REST/feedback/rating/perfil/historia, llamadas remotas de app/proveedor, gasto nuevo o persistencia/RLS acreditada.
- Cero runtime exceptions y overflow horizontal. Status accesible y parrafos sin solaparse en el panel asentado; screenshots actuales muestran el texto pendiente dentro del viewport. Solo dos errores de consola500 esperados del contrato profile-error.

`denominators.json` conserva rondas por separado. `before/results.json`, `after/results.json` y `final-visual/results.json` contienen raw response, texto observado, expected/check/actual y auditoria de peticiones; `contracts-final.json` controla thresholds/fuentes; `verification.json` y stdout/stderr.txt conservan compile/lint final. No sumar repeticiones visuales como usuarios/escenas independientes.

## Reproduccion Local

En `/Users/GOIKO/2matchrim76-recognition-20261008`, `scripts/qa-matchrim-affinity-status-oct12.py` con servidor Vite4454, analytics=false y wrapper with_server ya conocido. Default solo null:portrait/null:landscape. `--cases` admite los seis nombres anteriores y ambas orientaciones. No desactivar interception ni usar la sesion fake contra backend.

Contrato: `npx tsx scripts/check-matchrim-affinity-status-oct12.ts <output-json>`. El packer conserva fuentes/pixels/receipts, valida evidencias anteriores y ejecuta solo lint/tsc de07. Config acotado en tsconfig-scoped.json. Ningun script genera perfil, recalibra score ni llama una IA nueva.

## Siguiente Hueco Y Limites

Hueco real siguiente, no ejecutado: distinguir perfil inexistente/incompleto de fallo de carga y recuperar el perfil sin volver a procesar la foto/OCR. Los casos500 de07 y la fuente lo respaldan: `loadMatchrimScanProfile` solo se invoca dentro de analyzeFile; no hay accion de reintento del perfil independiente. Hoy el estado no disponible es honesto pero la causa y recuperacion no son suficientemente accionables. No asumir que reintentar un quiz vacio lo soluciona.

Afinidad baja real con ficha/perfil acreditados no fue aprobada E2E; solo su contrato matematico de presentacion. No sustituye estudio de usuarios, calidad de recomendacion, precision/recall del proveedor, privacidad/RLS alojados, VoiceOver/Dynamic Type/QA fisico ni firma/canal de release. La limitacion same-file/onChange de06 sigue intacta: distintos nombres con mismos bytes no prueban mismo archivo/cancel/galeria iOS.

Encargos independientes conservados: reconocimiento real/corpus, QA funcional/inteligencia y cuentas humanas, identidad corregida/hold y precios pendientes, distribucion e invitacion Apple. Gates humanos agrupados: canal autorizado para E2E real/proveedor/dispositivo y sesion/firma/cuenta Apple para invitacion/TestFlight. No se han vuelto a preguntar o inspeccionar. Sin push, deploy, produccion, nativo ni TestFlight en07.
