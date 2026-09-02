# Matchrim: gate de release Lovable e integración de cliente

Fecha: 2026-09-02

Rama de integración: `codex/matchrim-release-integration-20260902`

Fuentes integradas:

- diseño contemporáneo: `628047825e1fa5fe1563e50b60a546f2cf236d05`;
- hotfix móvil y gate de backend: `d66c24adf5209a3c1bbd074dcb3bbc94f11a5c52`;
- `origin/main` / último commit Lovable visible: `a0b7f638f18fc90c7a6e80555c11bf7a65e2098e`.

No se publicó Lovable, no se desplegó Supabase, no se incrementó el build, no se firmó y no se subió nada a TestFlight.

## Decisión

- **Frontend integrado:** listo para revisión y merge. Gates de cliente, UI y simulador verdes.
- **Web publicada:** desactualizada y no equivalente a `a0b7f63` ni al candidato integrado.
- **Nuevo TestFlight:** `NO-GO`. El backend real sigue en `4/5` escenas y el recall de cartas es `0.875`, por debajo del gate `0.90`.
- **Publicar `a0b7f63` directamente:** `NO-GO`. Esa SHA no pasa TypeScript y además omitiría el rediseño y el hotfix posteriores.

## Gate read-only de Lovable

El proyecto Lovable `matchrim-wine-sense` (`7e9b6f66-d4ee-404a-8678-c9afab22de75`) declara:

- estado `ready/completed`;
- `latest_commit_sha = a0b7f638f18fc90c7a6e80555c11bf7a65e2098e`;
- proyecto público y marcado como publicado;
- URL: `https://matchrim-wine-sense.lovable.app`.

Eso no significa que el snapshot público contenga el último commit. La inspección real de `/escanear/etiqueta` el 2026-09-02 muestra todavía el flujo antiguo:

> Etiqueta de vino. Identifica una botella, calcula encaje y guárdala.

La página carga el scanner unitario; no presenta el copy multietiqueta, el gate de privacidad ni `MultiWineLabelScanner`. En `a0b7f63`, en cambio, `ScanHub.tsx` ya ofrece una o varias botellas y `Scan.tsx` envuelve el flujo con `ScanPrivacyGate`. Por tanto, el frontend publicado está al menos por detrás del commit `bc24db5` y no representa `a0b7f63`.

## Validación exacta de `a0b7f63`

Se materializó la SHA exacta en un directorio limpio, sin usar el working tree de otra tarea.

| Gate | Resultado |
| --- | --- |
| `npm test` | PASS |
| `npm run build` | PASS, 3.596 módulos |
| ESLint dirigido a archivos modificados | PASS |
| Playwright histórico | PASS 18/18, consola limpia |
| `tsc -p tsconfig.app.json --noEmit` | **FAIL** |

Los errores de TypeScript afectan a contratos reales: eventos analytics multivino/carta no declarados, posición de pin sin `width`, tipos de moneda/precio y la inferencia de dimensiones de afinidad. La afirmación histórica de que `a0b7f63` pasaba TypeScript no es reproducible. La SHA no es un release candidate completo.

## Riesgo de pisar trabajo posterior

Hay dos carriles posteriores a `a0b7f63` que parten de `8ef0504`:

- `6280478`: rediseño app-first, navegación, home, scanner, carta, afinidad y aiRIM;
- `7192a28` + `d66c24a`: safe areas, accesibilidad, clusters de pines, detalle de carta, acordeón progresivo, textos y evidencia del gate real.

Publicar cualquiera de ellos de forma aislada perdería parte del otro. La rama de este informe integra ambos sin tocar producción. Durante la integración se corrigieron dos regresiones detectadas por QA: nombres accesibles de la barra inferior y una frase de aiRIM que había perdido tildes.

## QA del candidato integrado

Versión nativa conservada: `Matchrim 1.0 (61)`. No se creó un build 62.

| Gate | Resultado |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm test` | PASS: clasificador, aprendizaje, multivino, 30 escenas y dataset independiente de 25 fuentes |
| `npm run lint` | PASS, 0 errores; 107 warnings históricos |
| `npm run build` | PASS, 3.599 módulos |
| Playwright UI | PASS 27/27, consola limpia |
| Xcode Debug, simulador iPhone 16 Pro | PASS, sin firma |
| Instalación y lanzamiento en simulador iOS 26.0 | PASS |

La batería UI cubre safe areas y privacidad, retrato/paisaje, targets de 44 px, Dynamic Type 125%, VoiceOver básico, offline, retry/cancelación, multietiqueta, abstención sin identidad, corrección e invalidación de afinidad, refinamiento regional, clusters, carta dual, comparador 2-5, presupuesto/formato, fichas progresivas y los fixtures `IMG_7548`, `IMG_7552` e `IMG_7553`.

Evidencia versionada:

- `docs/qa-evidence/matchrim-release-integration-2026-09-02/ui-qa-results.json`;
- `docs/qa-evidence/matchrim-release-integration-2026-09-02/privacy-safe-area-mobile.png`;
- `docs/qa-evidence/matchrim-release-integration-2026-09-02/privacy-safe-area-landscape.png`;
- `docs/qa-evidence/matchrim-release-integration-2026-09-02/multi-label-summary-mobile.png`;
- `docs/qa-evidence/matchrim-release-integration-2026-09-02/multi-label-identity-correction-mobile.png`;
- `docs/qa-evidence/matchrim-release-integration-2026-09-02/wine-menu-dual-desktop.png`;
- `docs/qa-evidence/matchrim-release-integration-2026-09-02/wine-menu-accessibility-125pct-mobile.png`;
- `docs/qa-evidence/matchrim-release-integration-2026-09-02/simulator-release-integration.png`.

Log local reproducible: `qa-artifacts/2026-09-01-build61-hotfix/xcodebuild-release-integration.log`.

## Gate real pendiente

El rerun de las cinco escenas con las funciones v3 desplegadas terminó `4/5 PASS`:

| Escena | Expected | Actual | Estado |
| --- | ---: | ---: | --- |
| Vitrina multibotella | >=12 regiones; >=6 alta confianza | 30; 7 alta confianza | PASS |
| `IMG_7547 2` | 16 vinos | 9 | **FAIL** |
| `IMG_7548 2` | 8 vinos | 8 | PASS |
| `IMG_7552 2` | 13 vinos | 13 | PASS |
| `IMG_7553 2` | 19 vinos | 19 | PASS |

Precision de identidad en cartas `1.000`; recall `0.875`; siete omisiones; latencia media `35.235 s` y máxima `53.497 s`. Las tres funciones v4 candidatas siguen sin poder certificarse en staging porque el canal de gestión de Supabase `cbjynrbvrhcmpaojmqdp` respondió `403`.

El iPhone 16 Pro Max del usuario está conectado, pero no se instala un candidato físico porque todavía no existe un binario firmado que supere este gate.

## Publicación mínima exacta

### Web Lovable

No publicar `a0b7f63`, `6280478` ni `7192a28` por separado. El mínimo seguro es:

1. revisar y fusionar el commit de esta rama de integración en `main`;
2. confirmar que Lovable muestra como `latest_commit_sha` ese commit integrado;
3. abrir Preview y repetir el smoke de `/`, `/escanear`, `/escanear/etiqueta` y `/escanear/carta-vinos`;
4. ejecutar una única acción **Publish / Update** en Lovable;
5. verificar que el bundle público contiene `ScanPrivacyGate` y el flujo multietiqueta, y repetir el smoke público.

No hace falta desplegar Edge Functions para alinear el frontend web con el cliente v3 actual. La publicación debe describirse como actualización de cliente, no como certificación del backend v4.

### TestFlight

El paso mínimo anterior a un build 62 es habilitar staging con permiso de despliegue para las tres Edge Functions v4, ejecutar las cinco escenas y obtener `5/5`, precision/recall >=`0.90`, deriva máxima <=`2` y cero errores de consola. Después: incrementar a 62, archivar/firmar, smoke físico en el iPhone conectado y solicitar autorización explícita de subida.

Progreso real: cliente integrado y QA interna `100%`; release total `94%`. El 6% restante es backend v4 certificable, smoke físico del binario firmado y autorización final de publicación/TestFlight.
