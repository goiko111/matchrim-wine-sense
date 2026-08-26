# Matchrim: remediacion P0 y gate de QA

Fecha: 26 de agosto de 2026.

Estado final: **P0 E2E aprobado y build 1.0 (58) subido a TestFlight**. El bloqueo de despliegue descrito debajo queda conservado como baseline historico.

Seguimiento grounded 2026-08-26: la remediacion de abstencion, el dataset reproducible de 30 escenas y el gate del siguiente build estan documentados en `docs/MATCHRIM_GROUNDED_BENCHMARK_2026-08-26.md`. El build 58 permanece como ultimo TestFlight; estos cambios requieren un build 59 tras cerrar los gates alli enumerados.

## Cierre final

- Fuente operativa recuperada: `/Users/GOIKO/2matchrim-p0-remediation-20260826`, rama `codex/2matchrim-p0-remediation-20260826`. El path declarado de iCloud seguia `dataless` y no se modifico.
- Commits de producto: `bc24db5`, `b20d6bc` y `eadef40`. `supabase/functions/search-wines/index.ts` coincide con `9343a1e` y no se modifico.
- El `403` directo de Supabase se acoto a permisos de la cuenta/CLI. El canal integrado y autorizado de Lovable desplego las tres funciones exactas por 2 creditos, sin exponer secretos.
- Edge Functions activas: `detect-wine-regions` (`matchrim-region-detector-v3`), `analyze-wine-region` (`matchrim-region-analysis-v2`) y `scan-wine-menu` (`scan-wine-menu-2026-08-26-grounded-v3`). Sus fuentes desplegadas tienen el mismo hash Git que las de esta rama.
- E2E real sin interceptar APIs: 5/5 materiales PASS. Las cuatro cartas suman 55 matches sobre 56 referencias esperadas: precision 100%, recall 98,2%. La vitrina produjo 30 regiones, 30 analizadas y 27 afinidades individuales.
- QA final: `npm test`, TypeScript, ESLint sin errores, build web, Playwright 14/14, build Debug de simulador, archive Release con SDK iOS 26 y validacion de App Store Connect.
- TestFlight: Matchrim 1.0 (58), `wine.matchrim.app`, upload aceptado a las 13:30 CEST del 26-08-2026 y en procesamiento. Apple solo aviso que el deployment target 14.0 debera subir a 15.0 en primavera de 2027.

## Expected / actual real

| Material | Expected | Actual | Precision | Recall | Afinidades | Latencia | Estado |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `IMG_7605 2.jpg` vitrina | >=12 regiones y >=6 candidatos | 30 regiones, 30 analizadas, 27 candidatos | Sin ground truth completo | Sin ground truth completo | 27 | 59,17 s | PASS con cobertura parcial |
| `IMG_7547 2.HEIC` carta | 16 vinos | 16 matches | 100% | 100% | 16 | 36,35 s | PASS |
| `IMG_7548 2.HEIC` carta | 8 vinos | 8 matches | 100% | 100% | 8 | 20,10 s | PASS |
| `IMG_7552 2.HEIC` pizarra | 13 vinos; excluir vermut/cerveza | 13 matches; no vinos espurios | 100% | 100% | 13 | 31,67 s | PASS |
| `IMG_7553 2.HEIC` pizarra | 19 vinos | 18 matches; falta `L'Arnaude` pequeno | 100% | 94,7% | 18 | 43,87 s | PASS de umbral, limitacion abierta |

El E2E registro un HTTP 500 transitorio en una region de la vitrina. El reintento recupero la region, no quedaron fallos finales y no hubo errores de consola no gestionados. La identidad de las 27 botellas de vitrina sigue requiriendo etiquetado manual por referencia antes de usar ese conjunto como benchmark de precision top-1/top-3.

## Evidencia final

- `/Users/GOIKO/2matchrim-p0-remediation-20260826/qa-artifacts/2026-08-26-real-e2e-v6/real-e2e-report.json`
- `/Users/GOIKO/2matchrim-p0-remediation-20260826/qa-artifacts/2026-08-26-real-e2e-v6/`
- `/Users/GOIKO/2matchrim-p0-remediation-20260826/qa-artifacts/2026-08-26-p0-remediation/ui-qa-results.json`
- `/Users/GOIKO/2matchrim-p0-remediation-20260826/qa-artifacts/2026-08-26-p0-remediation/ios-build-58-launch.png`
- `/Users/GOIKO/2matchrim-p0-remediation-20260826/qa-artifacts/2026-08-26-p0-remediation/ios-build-58-privacy-gate.png`
- `/Users/GOIKO/2matchrim-p0-remediation-20260826/qa-artifacts/2026-08-26-p0-remediation/ios-build-58-dynamic-type.png`
- `/Users/GOIKO/2matchrim-p0-remediation-20260826/qa-artifacts/2026-08-26-p0-remediation/ios-build-58-landscape.png`

## Limitaciones restantes

1. El iPhone `Goiko` figuraba `unavailable`; el build 58 se valido en iPhone 16 Pro Simulator iOS 26.0. El build 57 conserva la evidencia fisica previa.
2. VoiceOver queda validado a nivel semantico/roles y tamanos tactiles, no mediante un recorrido hablado automatizado completo en build 58.
3. La carta `IMG_7553` conserva una omision de texto muy pequeno y la vitrina no tiene ground truth exhaustivo de identidad.
4. El deployment target 14.0 no bloquea esta subida, pero debe elevarse a iOS 15 antes de primavera de 2027.

## Entorno seguro de partida

- Carril: `/Users/GOIKO/2matchrim-p0-remediation-20260826`
- Rama: `codex/2matchrim-p0-remediation-20260826`
- Base final reconciliada: `9343a1e` (`Improve wine search acronym aliases`)
- El repositorio operativo de iCloud no se modifico: sus fuentes y objetos Git seguian `dataless` por un error de File Provider.
- Se reconstruyeron sobre la base los cambios historicos de multietiqueta, carta y comparador desde el historial local de Codex. No se sobreescribio el cambio ajeno conocido de `search-wines`.
- Al iniciar esta remediacion no se habian desplegado Edge Functions, firmado un archive ni subido un build. El estado final queda documentado arriba.

## Remediacion implementada antes del cierre

### Safe areas y privacidad

- Variables CSS unificadas para `env(safe-area-inset-*)` y safe insets reales de UIKit.
- `MatchrimBridgeViewController` sincroniza top/bottom safe area y Dynamic Type con la WebView.
- El CTA del aviso usa flujo compacto en movil y queda completamente por encima del nav inferior; una asercion compara ambos bordes.
- Gate previo a cualquier `input[type=file]`: foto seleccionada solamente, envio de imagen/recortes, proveedores de IA, no subir personas/datos sensibles y persistencia por defecto.
- Purpose strings de camara/fotos y politica actualizados para etiquetas, botellas, expositores, cartas, pizarras y platos.
- La politica declara Matchrim/Winerim, Lovable AI Gateway y Google Gemini. No inventa una retencion: deja esa cifra como requisito legal previo a release externo.

### Multietiqueta y cobertura

- Pipeline por regiones: quality gate, detector, deduplicacion de cajas, crop por region, analisis por region, candidatos, agrupacion de referencias y ranking.
- Overlay numerico; candidato, duda, evidencia y acciones viven en drawer. Deteccion, identidad y afinidad se muestran por separado.
- Contrato `coverage`: `reported_complete`, `partial` o `unknown`, objetos detectados/estimados y notas. Un fixture nunca declara cobertura completa.
- La funcion `detect-wine-regions` solicitaba y normalizaba cobertura; en esta pasada previa aun no se habia desplegado.

### Afinidad y confianza

- Siete dimensiones posibles: cuerpo, acidez, dulzor, tanino, fruta, madera/crianza e intensidad/aromas.
- Fuentes separadas: etiqueta, catalogo, inferencia y preferencia aprendida; rango orientativo, datos ausentes, fricciones y feedback por dimension.
- La identidad y el respaldo de la explicacion son señales distintas y aproximadas.
- La afinidad basada en atributos inferidos se contrae hacia neutral: un match ordinal de 100 pasa a 93, no se presenta como certeza.
- La identidad de carta se calibra por posicion, productor, region/precio y evidencia textual. Sin `texto_fuente`, no puede entrar en banda alta.
- La funcion de carta solicita `texto_fuente` y `dudas`; productor, region y estilo se marcan como posibles inferencias cuando el backend actual no los entrega.

## QA previa al cierre

### Automatizada

| Gate | Resultado |
| --- | --- |
| `npm test` | PASS: clasificador, aprendizaje, vision/coverage, comparador y calibracion |
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS con 108 warnings historicos, 0 errores |
| `npm run build` | PASS, 3.594 modulos |
| Playwright determinista | PASS, 14 casos, consola limpia |
| Safe area Playwright | PASS: gate `y=279.5`, CTA bottom `738`, nav top `779`, sin overflow a 393 px |
| Xcode simulador | PASS, Debug QA local, `CODE_SIGNING_ALLOWED=NO` |

El build conserva avisos no P0: `caniuse-lite` antiguo, chunks mayores de 500 kB y script CocoaPods sin outputs. `npm ci` informo 25 vulnerabilidades de dependencias (2 low, 5 moderate, 17 high, 1 critical); requieren auditoria separada, no `npm audit fix` automatico.

### E2E real sin interceptar APIs

Runner: `scripts/qa-matchrim-real-e2e.py`. Tiene guard que rechaza hosts que no sean localhost/staging/qa/preview, hashes SHA-256 de fixtures, capturas, latencia, consola, filas y pines.

| Fixture | Esperado | Actual | Latencia | Estado |
| --- | ---: | ---: | ---: | --- |
| `IMG_7605 2.jpg` vitrina | >=10 regiones | 0 | 1,95 s | BLOQUEADO: preflight/CORS de `detect-wine-regions` |
| `IMG_7547 2.HEIC` | >=8 filas | 14 filas / 14 pines | 25,19 s | PASS de cobertura minima y layout |
| `IMG_7548 2.HEIC` | >=8 filas | 8 / 8 | 16,54 s | PASS de cobertura minima y layout |
| `IMG_7552 2.HEIC` | >=8 filas | 14 / 14 | 26,68 s | PASS de cobertura minima y layout |
| `IMG_7553 2.HEIC` | >=8 filas | 15 / 15 | 24,16 s | PASS de cobertura minima y layout |

Los cuatro PASS prueban extraccion minima, pines, ausencia de overflow y consola limpia. No constituyen una medicion completa de precision de identidad: falta ground truth por campo y por linea. La variacion entre ejecuciones confirma que los conteos no deben usarse como unica metrica.

### Visual movil nativa

Simulador: iPhone 16 Pro, iOS 26.0, UDID `83282D15-477D-45F7-A3B5-82CB2B89B52D`.

- Retrato: cabecera por debajo de Dynamic Island; gate y CTA sin solaparse con nav.
- Multietiqueta: cinco contornos/pines numerados, sin texto largo sobre botellas.
- Horizontal: Dynamic Island en lateral sin cubrir controles; imagen mantiene overlay.
- Dynamic Type `accessibility-extra-large`: H1 envuelve, controles siguen visibles y no aparece overflow horizontal.
- Logs: sin excepcion propia ni crash; aparecen mensajes conocidos del framework Simulator/WebKit/RemoteTextInput.

Evidencia local:

- `/Users/GOIKO/2matchrim-p0-remediation-20260826/qa-artifacts/2026-08-26-p0-remediation/ui-qa-results.json`
- `/Users/GOIKO/2matchrim-p0-remediation-20260826/qa-artifacts/2026-08-26-p0-remediation/native/privacy-gate-portrait.png`
- `/Users/GOIKO/2matchrim-p0-remediation-20260826/qa-artifacts/2026-08-26-p0-remediation/native/multilabel-portrait.png`
- `/Users/GOIKO/2matchrim-p0-remediation-20260826/qa-artifacts/2026-08-26-p0-remediation/native/multilabel-landscape.png`
- `/Users/GOIKO/2matchrim-p0-remediation-20260826/qa-artifacts/2026-08-26-p0-remediation/native/multilabel-dynamic-type.png`
- `/Users/GOIKO/2matchrim-p0-remediation-20260826/qa-artifacts/2026-08-26-real-e2e/real-e2e-report.json`

## Gate historico ya resuelto

Este era el gate de partida. Los puntos operativos de despliegue, E2E, build y autorizacion quedaron resueltos en el cierre final; las limitaciones no resueltas se enumeran arriba.

1. Materializar la fuente de verdad operativa y revisar el diff contra este carril sin sobrescribir trabajo ajeno.
2. Desplegar `detect-wine-regions` y `analyze-wine-region` solo en staging, verificar CORS/OPTIONS, secretos, timeouts y logs.
3. Repetir las cinco fotos sin fixtures. Para vitrina: recall por botella visible, IoU/cajas, duplicados y precision top-1/top-3. Para cartas: ground truth de nombre, productor, anada, seccion, servicio y precio.
4. Confirmar contratos y retencion maxima de Lovable/Gemini; publicar esa retencion y cerrar DPA/base legal.
5. Ejecutar E2E en iPhone fisico: permisos iniciales, camara, fototeca, cancelacion, offline/red lenta, reapertura, VoiceOver y memoria.
6. Resolver o aceptar formalmente vulnerabilidades de dependencias y fijar presupuestos de latencia/memoria.
7. Revisar evidencias y obtener autorizacion nueva y explicita antes de cualquier deploy o subida a TestFlight.

## Comandos reproducibles

```bash
npm ci
npm test
npx tsc --noEmit
npm run lint
npm run build
npm run dev -- --host 127.0.0.1 --port 4173
PYTHONPATH=/tmp/matchrim-playwright-runtime python3 scripts/qa-multi-wine-ui.py
MATCHRIM_E2E_TIMEOUT_MS=45000 PYTHONPATH=/tmp/matchrim-playwright-runtime python3 scripts/qa-matchrim-real-e2e.py
DEVELOPER_DIR=/Applications/Xcode-26.0.1.app/Contents/Developer xcodebuild -workspace ios/App/App.xcworkspace -scheme App -configuration Release -destination 'generic/platform=iOS' archive
```
