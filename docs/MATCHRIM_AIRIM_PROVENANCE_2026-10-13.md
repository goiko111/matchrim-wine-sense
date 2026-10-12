# Matchrim: procedencia de la guia aiRIM (09)

## Alcance

Delta local MATCHRIM-HOY-20261012-09 sobre HEAD a533e0d4d689fb245ec91ad0bb2f93796018e4cc. Solo cambia src/utils/aiRimContextGuide.ts y agrega pruebas/evidencia09. Componente, tres consumidores, reconocimiento, normalizadores, scores, umbrales55/70/85, precios, guardado05/06, comparacion y reintento08 quedan byte-identicos. No push, deploy, backend, Apple, dispositivo ni TestFlight.

El contrato existente de la guia no recibe enlace canonico verificable ni evento humano actual. Una confidence1, ausencia de dudas, nombre escrito, source catalog, perfil o texto de evidencia no permiten deducirlos. No se agrega una prop sintetica de autoridad. La guia describe un candidato y no verifica botella, EAN ni cosecha; tampoco niega una confirmacion que pueda existir fuera de su contrato.

## Antes Y Despues

| Before | After | Why |
| --- | --- | --- |
| Identidad lista; afinidad pendiente / esta confirmado con lectura88%, inferencia y catalogo vacio | Candidato de lectura; afinidad pendiente / La lectura propone... | La senal del OCR no demuestra identidad canonica, humana o fisica. |
| Senal de identidad88% | Senal estimada de lectura88%; no equivale a verificacion canonica o humana | Mantiene el valor existente sin atribuirle autoridad adicional. |
| Confirma manualmente el correcto / completa el perfil | Contrasta nombre, productor y cosecha; usa datos suficientes para afinidad | Escribir o seleccionar un nombre no acredita por si solo botella/cosecha. |
| Guia positiva sin distinguir candidato de botella | Describe este candidato; no verifica la botella ni la cosecha | Los rangos y las dos evidencias numericas existentes permanecen iguales para entradas validas. |
| NaN/Infinity podian saltar ramas de cautela o aparecer como porcentajes | Solo la presentacion abstiene ante confianza no finita y afinidad ausente/no finita/fuera de0-100 | No modifica calculo, reconocimiento ni normalizacion compartidos. |

## Matriz De Pruebas

| Prueba | Expected | Actual |
| --- | --- | --- |
| Reproduccion previa: carta, lectura88%, inferencia, sin ficha ni perfil | No afirmar identidad confirmada | FAIL en ambas orientaciones;14/20 checks,3 fallos semanticos por contexto. |
| Mismo contrato/imagen,393x852 y852x393, version final | Candidato explicito, afinidad pendiente, no verificacion fisica/canonica/humana |2/2 contextos;20/20 checks. |
| Nombre/confianza/fuente/perfil solos; procedencia ausente/invalida/incompleta | Ninguna autoridad ni ficha vinculada inventada | Controles incluidos en78/78 contratos. |
| Afinidad ausente/invalida y dudas; tres contextos | Abstencion prudente; mantener dudas y siguiente paso util |78/78 contratos totales. |
| Controles matematicos validos0/30/55/70/85/100 y cuatro fuentes sensoriales | Mismos rangos/dos primeras evidencias y tono del helper previo | Igualdad comprobada contra codigo del HEAD baseline; no son usuarios/fichas reales. |
| Compatibilidad y limites |3 callsites sin cambio, perfil cargado/null explicito, contrato y llamada al motor sin cambios | Byte/AST comprobados;20 fuentes protegidas y618 entradas05-08 intactas. |
| Typecheck y lint scoped09 | Exit0 | Exit0; logs conservados. No suites/builds anteriores repetidos. |

Cada contexto final intercepta1 POST OCR,1 POST de busqueda canonica vacia y1 GET de perfilnull, todos respondidos localmente.0 escrituras reales/REST intentadas,0 llamadas remotas de la app,0 llamadas pagadas,0 cuentas reales,0 errores runtime/consola. Interceptores HTTP/WS antes de auth/navegacion; firma falsa invalida, service workers bloqueados y analyticsfalse.

La entrada es el mismo contrato BOTH04/08 y la imagen IMG_7547 2.jpg ya usada, SHA256 2b1da6ac2ab548346df754cc67a76b6d7a25cc28efb893564d49b9f7508c4194. No nuevos OCR, corpus, holdouts ni perfiles positivos UI. La primera ejecucion despues del cambio de lenguaje tambien paso20/20; se conserva como repeticion de etapa, no como otros usuarios/escenas. La etapa final sustituye annada por cosecha. Recibos enlazan SHA de cada etapa; solo baseline y fuente final completos se conservan.

## Evidencia Y Residual

Directorio: docs/qa-evidence/matchrim-airim-provenance-2026-10-13. manifest.json contiene75 entradas SHA256 y12 PNG; source-stages.json conserva24 fuentes finales/21 baseline, recibos de etapa y proteccion05-08. primary.json resume solo los2 contextos finales. checkpoint09.md se creo antes de editar producto.

Capturas finales: after-final/portrait-guide.png y after-final/landscape-viewport.png. Inspeccion visual: texto ajustado al ancho en ambas orientaciones. El drawer es desplazable; la captura horizontal no demuestra que toda la guia quepa simultaneamente en393px de alto. No demuestra VoiceOver/Dynamic Type/iOS fisico. El check geometrico comprueba ancho de hijos, no ausencia universal de solapes.

Siguiente defecto local observado, no ejecutado09: el toast de deteccion invade temporalmente la cabecera del drawer horizontal; aparece tanto antes como despues. No declarar QA visual global aprobado. Mantener separados precision/recall independiente con proveedor, cuota y QA fisico.

Invitacion TestFlight solicitada sigue sin enviar; permanece el gate previamente documentado de sesion propietaria App Store Connect. No se reviso Apple en09 ni se empaqueto este delta como build nativo. No hay aprobacion de lanzamiento ni porcentaje global inferido.
