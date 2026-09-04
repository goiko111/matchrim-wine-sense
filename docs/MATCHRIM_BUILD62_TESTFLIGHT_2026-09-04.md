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
| Archive Release | PASS con Xcode 26.0.1 (17A400) / SDK iOS 26.0 |
| Firma y validacion local del archive | PASS: `codesign --verify --deep --strict` |
| Subida App Store Connect | PASS: `Upload succeeded` |
| Estado TestFlight | `1.0 (62) - Lista para enviar`, procesamiento completado |
| Distribucion interna | Grupo `Testers Matchrim`, 1 tester con acceso |

Identidad verificada del artefacto: `wine.matchrim.app`, version `1.0`, build
`62`. La captura de simulador confirma safe area, home y barra inferior sin
solapes:

- `docs/qa-evidence/matchrim-build62-2026-09-04/simulator-build62-home.png`.

Logs y artefactos locales reproducibles:

- `qa-artifacts/2026-09-04-build62/xcodebuild-simulator.log`;
- `qa-artifacts/2026-09-04-build62/xcodebuild-device.log`;
- `qa-artifacts/2026-09-04-build62/xcodebuild-archive-xcode16.log`;
- `qa-artifacts/2026-09-04-build62/Matchrim-62-xcode16.xcarchive`;
- `qa-artifacts/2026-09-04-build62/Matchrim-62-xcode26.xcarchive`;
- `qa-artifacts/2026-09-04-build62/ExportOptions-AppStore.plist`.

## Resultado de la subida

Se instalo Xcode 26.0.1 Apple silicon (17A400) en
`/Applications/Xcode-26.0.1.app`. El archive se regenero con el SDK iOS 26.0,
conservando la identidad `wine.matchrim.app`, la version `1.0` y el build `62`.
La exportacion App Store Connect uso firma automatica del equipo configurado,
mantuvo el numero de build y completo la carga correctamente el 2026-09-04.

App Store Connect completo posteriormente el procesamiento y confirmo `1.0
(62) - Lista para enviar` en TestFlight. La compilacion quedo asignada al grupo
interno `Testers Matchrim`; todos sus miembros tienen acceso. Apple emitio un
unico aviso no bloqueante: el deployment target actual es iOS 14.0 y, a partir
de primavera de 2027, las nuevas entregas deberan usar iOS 15.0 o posterior. Se
registra como mantenimiento futuro; no afecta a este beta.

El beta 62 queda autorizado por el usuario sobre el backend real v3 actual. La
certificacion v4 continua separada y bloqueada por la ausencia de
`LOVABLE_API_KEY` en staging; no se presenta como resuelta por esta subida. La
web publica permanece en el flujo anterior restaurado y no fue modificada por
esta entrega movil.
