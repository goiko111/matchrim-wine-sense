# Matchrim 1.0 (66): candidato de remediación móvil

Fecha: 2026-09-30

## Estado

El candidato local `1.0 (66)` corrige los tres defectos reproducibles del QA físico del build 65. El cliente está verde en contratos, build web, simulador iOS y archive Release. **No se ha enviado a TestFlight** porque el gate independiente de identidad canónica del expositor sigue bloqueado en staging.

## Cambios

- Bodega y Perfil comparten `matchrim-native-page-top`, que reserva la safe area en retrato y paisaje.
- Los ocho controles observados por debajo de 44 pt ahora cumplen el mínimo táctil.
- Inicio pluraliza correctamente `1 valoración afina` y `N valoraciones afinan`.
- Los perfiles aprendidos decimales se redondean y limitan a `0-5` antes de llegar al clasificador entero y al backend Winerim.
- Build iOS incrementado de `65` a `66`.

## QA

| Gate | Resultado |
| --- | --- |
| TypeScript | PASS |
| Contratos `npm test` | PASS |
| ESLint | 0 errores; 105 advertencias heredadas |
| Vite production build | PASS |
| Layout QA con sesión sintética e interceptación | PASS 14/14; 0 errores de consola |
| Bodega safe top | PASS: `y=75` con safe top de `59 px` |
| Perfil safe top | PASS: `y=75` retrato; `y=91` paisaje |
| Ocho controles afectados | PASS: todos `>=44 pt` |
| Singular de Inicio | PASS renderizado |
| Espaciado web Bodega/Perfil | PASS: composición previa conservada en `x=16`, `y=97` |
| Smoke XCUITest nativo | PASS: Inicio -> Escanear -> Inicio, retrato/paisaje |
| Home nativo | PASS: objetivo `124x44 pt` |
| Build simulador iOS 26 | PASS |
| Archive Release | PASS |

La sesión de layout fue local y sintética. Todas las respuestas Supabase se interceptaron; no hubo lecturas ni escrituras de producción. El smoke XCUITest usó el binario 66 instalado en `Matchrim QA iPhone 16 Pro` con iOS 26.0.

## Artefactos

- Archive: `/private/tmp/Matchrim-1.0-66-candidate-final.xcarchive` (`20 MB`).
- Bundle: `wine.matchrim.app`, versión `1.0`, build `66`, team `8X3XTD6XYX`.
- Firma local: Apple Development; no se ejecutó exportación App Store ni upload.
- SHA-256 del binario: `17c473b94d05f2e05138013a9f78bf95dac91a07f578a87da2f78475a6297ab2`.
- XCUITest: `/private/tmp/matchrim-build66-native-smoke-20260930c.xcresult`.
- Matriz: `docs/qa-evidence/matchrim-build66-simulator-2026-09-30/layout-qa-results.json`.
- Capturas: `docs/qa-evidence/matchrim-build66-simulator-2026-09-30/`.

## Gate para TestFlight

1. Configurar `LOVABLE_API_KEY` en staging aislado `qpbmqvfnunkylvtvnyyx`.
2. Ejecutar el trace final box/crop/result del expositor y puntuar identidad canónica por botella.
3. Si el gate de identidad pasa, instalar el build 66 en el iPhone físico y repetir únicamente safe area, objetivos táctiles, permisos limpios, guardar/puntuar y VoiceOver humano.
4. Exportar con distribución App Store y subir solo tras esos gates.

No se desplegó la web pública, Supabase ni TestFlight; no se modificó producción.
