# Matchrim 1.0 (67): subida a TestFlight

Fecha: 2026-10-01

## Resultado

El propietario autorizo expresamente la subida del build 67 para probar el nuevo diseno nativo. Xcode 26.0.1 genero el archivo Release, lo valido para distribucion de App Store Connect y completo la subida correctamente.

- Bundle: `wine.matchrim.app`
- Version/build: `1.0 (67)`
- Equipo: `8X3XTD6XYX`
- Archivo preservado: `~/Library/Developer/Xcode/Archives/2026-10-01/Matchrim 1.0 (67).xcarchive`
- Resultado de Xcode: `Upload succeeded`
- Estado devuelto por Apple a las 08:43 CEST: paquete en procesamiento
- Commit fuente: `6de66e9`

El archivo se valido antes de enviarlo: tanto el metadata del archive como el `Info.plist` de la aplicacion contienen bundle `wine.matchrim.app`, version `1.0` y build `67`. La exportacion automatica uso el equipo correcto y App Store Connect acepto el paquete.

Apple emitio un aviso no bloqueante: el deployment target sigue en iOS 14 y debe elevarse como minimo a iOS 15 antes de abril de 2027.

## Alcance y gates

- No se desplego la web, Lovable ni Supabase.
- El build de produccion no contiene `VITE_MATCHRIM_QA_FIXTURES`.
- La subida habilita QA acotado en TestFlight, pero no aprueba por si sola la precision de reconocimiento.
- Sigue pendiente el smoke manual desde la instalacion de TestFlight: captura, Fotos, Auth, regreso a la app, rotacion fisica y reapertura.
- Sigue abierto el gate de identidad de la vitrina: ultimo benchmark registrado con `50.00%` de precision y `88.89%` de recall multietiqueta; menu de comida con `24.07%` de recall.

## QA que acompana al build

- TypeScript, ESLint, contratos/datasets y build web: PASS.
- Build iOS Simulator y build fisico: PASS.
- Instalacion y lanzamiento directo en iPhone 16 Pro Max: PASS.
- Inventario visual: 34/34 rutas, sin overflow ni errores.
- Personas sinteticas: 25/25 PASS.
- Cinco materiales suministrados: PASS visual determinista en retrato/paisaje para layout, pins, listas y comparacion; no constituye una nueva medicion OCR.

La evidencia completa esta en `docs/MATCHRIM_BUILD67_DESIGN_QA_2026-10-01.md` y `docs/qa-evidence/matchrim-build67-candidate-2026-10-01/`.
