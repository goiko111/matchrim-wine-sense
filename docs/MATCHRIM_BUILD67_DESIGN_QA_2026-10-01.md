# Matchrim 1.0 (67) - candidato de diseno nativo y QA

Fecha: 2026-10-01

Estado: candidato local instalado con firma de desarrollo en el iPhone conectado. Sin despliegue web, Supabase ni TestFlight.

## Cambios cerrados

- Navegacion iOS de cuatro areas: Inicio, Explora, Bodega y Perfil. Escanear queda como accion primaria central.
- aiRIM deja de usar el cerebro generico y adopta una brujula sensorial compacta. Sigue accesible desde Inicio y desde decisiones contextualizadas.
- Inicio muestra acciones de captura, continuacion reciente, comparacion, afinidad y recomendaciones con una jerarquia mas corta.
- Resultado multietiqueta nativo dividido en Escena, Vinos y Comparar. Solo una vista extensa aparece a la vez.
- Auth y ocasiones especiales usan el sistema neutro/burdeos de la app en iOS. La web conserva su rama visual anterior.
- Dynamic Type real conectado a la categoria de iOS mediante la escala acotada existente del bridge. En tamanos accesibles las acciones de captura pasan a una columna.
- Paisaje compacto y safe areas revisados en binario de Simulator.

## Matriz QA

| Gate | Resultado |
| --- | --- |
| TypeScript | PASS |
| ESLint | PASS, 0 errores |
| Contratos y datasets | PASS |
| Build Vite produccion | PASS |
| Build iOS Simulator desde `App.xcworkspace` | PASS |
| Build iOS fisico con Xcode 26.0.1 | PASS, firma Apple Development |
| Instalacion/lanzamiento iPhone 16 Pro Max | PASS, bundle `1.0 (67)` y proceso activo |
| Inventario web | 34/34 rutas, 0 overflow, 0 errores |
| Personalizacion | PASS |
| Personas aisladas | 25/25 PASS |
| Navegacion nativa | PASS, cinco destinos con targets nombrados |
| Resultado multivino | PASS, Escena/Vinos/Comparar mutuamente excluyentes |
| Material `IMG_7605 2.jpg` | PASS visual con 5 regiones y pins independientes |
| `IMG_7547/7548/7552/7553` | PASS visual en retrato/paisaje, lista sincronizada sin overflow |
| Dynamic Type iOS | PASS en medium y accessibility-extra-extra-extra-large |
| Paisaje iOS | PASS visual, contenido sin solape bajo safe areas |

La rotacion remota del iPhone fisico no esta soportada por `devicectl`; el resultado de paisaje de esta tabla corresponde a Simulator. Falta el gesto manual en el dispositivo para elevarlo a gate fisico.

## Frontera de evidencia

Los cinco materiales de esta pasada usan respuestas deterministas embebidas y no hacen trafico de produccion. Demuestran decodificacion, composicion, pins, listas, comparacion, accesibilidad y ausencia de amontonamiento. No vuelven a medir precision OCR ni identidad canonica.

El transporte real autorizado de los cinco materiales ya habia completado 5/5. Sin embargo, el gate de identidad de la vitrina sigue sin una reconciliacion final box/crop/result fiable. El ultimo benchmark independiente registrado tambien mantiene `50.00%` de precision y `88.89%` de recall multietiqueta, y `24.07%` de recall en menu de comida. Por eso el candidato 67 no se ha subido a TestFlight.

## Evidencias

- `docs/qa-evidence/matchrim-build67-candidate-2026-10-01/native/results.json`
- `docs/qa-evidence/matchrim-build67-candidate-2026-10-01/native/home-native.png`
- `docs/qa-evidence/matchrim-build67-candidate-2026-10-01/native/multi-scene.png`
- `docs/qa-evidence/matchrim-build67-candidate-2026-10-01/native/multi-wines.png`
- `docs/qa-evidence/matchrim-build67-candidate-2026-10-01/native/multi-compare.png`
- `docs/qa-evidence/matchrim-build67-candidate-2026-10-01/native/airim-occasions.png`
- `docs/qa-evidence/matchrim-build67-candidate-2026-10-01/native/auth-native.png`
- `docs/qa-evidence/matchrim-build67-candidate-2026-10-01/personas/ui-results.json`
- `docs/qa-evidence/matchrim-build67-candidate-2026-10-01/routes/route-inventory.json`
- `docs/qa-evidence/matchrim-build67-candidate-2026-10-01/simulator/home-portrait-medium.png`
- `docs/qa-evidence/matchrim-build67-candidate-2026-10-01/simulator/home-portrait-axxxl-fixed.png`

## Gate para TestFlight

La reconstruccion de produccion sin `VITE_MATCHRIM_QA_FIXTURES`, firma de desarrollo, instalacion y lanzamiento fisico ya pasan. Antes de TestFlight faltan el smoke manual en el iPhone de rotacion, Escanear, Auth y regreso desde Fotos, y un archivo Release. La subida requiere autorizacion explicita y no convierte el gate de identidad OCR en aprobado.
