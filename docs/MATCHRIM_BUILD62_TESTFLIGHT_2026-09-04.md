# Matchrim 1.0 (62): candidato TestFlight y rollback web

Fecha: 2026-09-04

## Separacion de canales

- Web publica restaurada al flujo anterior del snapshot `bca8309` mediante el
  commit de avance `08e12fb` en `main`.
- Cliente movil moderno conservado en
  `codex/matchrim-release-integration-20260902`.
- Candidato movil: `Matchrim 1.0 (62)`, commit `5cd5ae0`.

La web se recompilo antes de publicar. El smoke publico de
`/escanear/etiqueta` vuelve a mostrar el flujo unitario y el texto
"Identifica una botella, calcula encaje y guárdala". La consola no registro
errores.

## Gates del build 62

| Gate | Resultado |
| --- | --- |
| `npm test` | PASS: clasificador, aprendizaje, multivino, 30 escenas y dataset independiente de 25 fuentes |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS, 0 errores y 107 warnings historicos |
| `npm run build` | PASS, 3.599 modulos |
| Copia Capacitor iOS | PASS |
| CocoaPods | PASS tras regenerar `Manifest.lock` contra este worktree |
| Xcode Debug Simulator | PASS |
| Instalacion y lanzamiento en simulador iOS 26 | PASS |
| Build Debug firmado para iPhone | PASS |
| Instalacion y lanzamiento en iPhone 16 Pro Max | PASS |
| Archive Release | PASS con Xcode 16.4 / SDK iOS 18.5 |
| Validacion y subida App Store Connect | BLOQUEADO: Apple exige Xcode 26 |

Identidad verificada del artefacto: `wine.matchrim.app`, version `1.0`, build
`62`. La captura de simulador confirma safe area, home y barra inferior sin
solapes:

- `docs/qa-evidence/matchrim-build62-2026-09-04/simulator-build62-home.png`.

Logs y artefactos locales reproducibles:

- `qa-artifacts/2026-09-04-build62/xcodebuild-simulator.log`;
- `qa-artifacts/2026-09-04-build62/xcodebuild-device.log`;
- `qa-artifacts/2026-09-04-build62/xcodebuild-archive-xcode16.log`;
- `qa-artifacts/2026-09-04-build62/Matchrim-62-xcode16.xcarchive`.

## Gate de subida

El reinicio elimino la instalacion local de Xcode 26.0.1. El App Store ofrece
Xcode 26.6, pero esa version requiere macOS 26.2 y este Mac usa macOS 15.7.7.
Xcode 16.4 puede compilar, firmar, instalar y archivar el candidato, pero su
SDK iOS 18.5 ya no es aceptado por App Store Connect.

La unica accion externa pendiente es completar el inicio de sesion ya preparado
en Apple Developer y descargar Xcode 26.0.1, compatible con este macOS. Despues
hay que repetir el archive con SDK iOS 26, validar, exportar y subir el mismo
build 62. No se necesita ningun cambio adicional de codigo.

El beta 62 queda autorizado por el usuario sobre el backend real v3 actual. La
certificacion v4 continua separada y bloqueada por la ausencia de
`LOVABLE_API_KEY` en staging; no se presenta como resuelta por esta subida.
