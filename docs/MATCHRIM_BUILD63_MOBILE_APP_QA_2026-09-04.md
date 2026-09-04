# Matchrim 1.0 (63): navegacion y experiencia movil

Fecha: 2026-09-04

## Alcance

Este candidato corrige la shell movil de Matchrim sin desplegar cambios en la
web publica. La rama movil es
`codex/matchrim-release-integration-20260902`; `main` conserva el rollback web
documentado para el build 62.

| Antes: build 62 | Despues: build 63 |
| --- | --- |
| Navegacion web superior visible en iPhone horizontal | Barra inferior de cinco destinos persistente en retrato y paisaje |
| Home con composicion de portada y acciones secundarias dispersas | Home orientada a tareas: botellas, carta y comparador en el primer viewport |
| Entrada de carta con panel oscuro anidado e instrucciones extensas | Entrada clara con camara y archivo como acciones directas |
| Acciones principales con posicion absoluta sensible al texto ampliado | Tarjetas fluidas que crecen con Dynamic Type |
| Navegacion duplicable en escaner autenticado | Una sola instancia de navegacion nativa |

## Navegacion y diseno

- Barra inferior nativa: Inicio, Descubrir, Escanear, Bodega y Perfil.
- Escanear es la accion central y permanece disponible en paisaje.
- `AppNav` y `Header` no renderizan menus web dentro de Capacitor.
- Home con cabecera utilitaria compacta, sin menu superior.
- Hub de escaneo con Carta y Etiqueta como entradas principales; Menu de
  comida, Plato y Encontrar vino quedan como acciones secundarias.
- Carta y Etiqueta comparten patrones de captura y galeria, jerarquia y color.
- Safe areas horizontales y verticales verificadas con Dynamic Island.

## Matriz de QA

| Gate | Resultado |
| --- | --- |
| `npm test` | PASS: clasificador, aprendizaje, multivino, 30 escenas controladas y 25 fuentes independientes |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS, 0 errores; 107 warnings historicos |
| `npm run build` | PASS, 3.599 modulos |
| Playwright funcional | PASS, 27/27 casos y consola limpia |
| Multietiqueta | PASS: regiones, duplicados, identidad dudosa, abstencion y correccion manual |
| Carta/pizarra | PASS: pines numericos, lista sincronizada, zoom, filtros y detalle progresivo |
| Afinidad | PASS: comparador 2-5, factores, fricciones, limites y alternativas |
| Resiliencia | PASS: retry selectivo, cancelacion durante backoff y modo sin red |
| Accesibilidad | PASS: targets >=44 px, nombres accesibles, dialogos y 125% de texto |
| Shell nativa | PASS: 430x932 y 932x430, sin menu superior, sin overflow y una barra inferior |
| Dynamic Type XXL en simulador | PASS tras corregir solapamiento de la tarjeta Carta |
| Xcode 26.0.1 / simulador iOS 26 | PASS, instalacion y lanzamiento del build 63 |
| Archive Release | PASS |
| Firma del archive | PASS: `codesign --verify --deep --strict` |
| Carga App Store Connect | PASS: `Upload succeeded` |
| Estado TestFlight | `1.0 (63) - Lista para enviar` |
| Distribucion interna | Grupo `Testers Matchrim`, 1 tester con acceso |

El reporte estructurado esta en
`docs/qa-evidence/matchrim-build63-mobile-2026-09-04/ui-qa-results.json`.

## Evidencias

- `simulator-build63-home-portrait.png`: home real del binario iOS.
- `simulator-build63-home-dynamic-type-xxl.png`: home con texto XXL y tarjetas
  sin solapes.
- `native-scan-hub-portrait.png`: hub nativo en retrato.
- `native-scan-hub-landscape.png`: barra inferior y safe areas en paisaje.
- `native-label-entry-portrait.png`: entrada multietiqueta.
- `native-menu-entry-portrait.png`: entrada de carta renovada.
- `multi-label-summary-mobile.png`: lote multibotella y resultados separados.
- `wine-menu-accessibility-125pct-mobile.png`: carta con texto ampliado.

Los logs reproducibles quedan en
`qa-artifacts/2026-09-04-build63-design/`, incluido
`xcodebuild-simulator.log`.

## Gate de distribucion

Identidad validada: `wine.matchrim.app`, version `1.0`, build `63`. El archive
se genero con Xcode 26.0.1, se valido localmente y App Store Connect completo
su procesamiento el 2026-09-04. El build esta `Lista para enviar` y asignado al
grupo interno `Testers Matchrim`.

Apple emitio el aviso no bloqueante ya conocido: el deployment target actual
es iOS 14.0 y, a partir de primavera de 2027, las nuevas entregas deberan usar
iOS 15.0 o posterior. El backend real v3 autorizado para el build 62 no cambia
en este candidato; la certificacion v4 sigue siendo un carril separado.
