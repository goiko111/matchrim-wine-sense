# Matchrim build 67 - QA fisico profundo

Fecha: 2026-10-01

## Respuesta directa

- **Si, la 67 contiene el nuevo diseno nativo.** La navegacion movil es inferior y tiene cinco destinos: Inicio, Explora, Escanear, Bodega y Perfil.
- **aiRIM no es una pestana del menu.** Se abre de forma contextual desde Inicio mediante `Consultar a aiRIM` / `Pregunta a aiRIM`, despues de la zona de decisiones. Tambien puede aparecer desde resultados y ocasiones.
- El paquete instalado y probado directamente por USB es `Matchrim 1.0 (67)`, bundle `wine.matchrim.app`, en un iPhone 16 Pro Max.

## Alcance real

La app TestFlight instalada se probo con XCUITest contra el dispositivo fisico, no mediante una replica web. El candidato con correcciones se valido despues en iPhone 16 Pro Simulator iOS 26. No se publico web, backend ni otro TestFlight.

| Area | Dispositivo fisico, build 67 | Candidato corregido, simulador |
|---|---|---|
| Instalacion/version | PASS: `1.0 (67)` | Build iOS reproducible PASS |
| Safe area / Dynamic Island | PASS en Inicio | PASS |
| Navegacion inferior | PASS, cinco destinos | PASS |
| Ubicacion de aiRIM | PASS: entrada contextual, sin sexta pestana | PASS |
| Cinco arranques en frio | 5/5; maximo `2,526 s` | 5/5; maximo `2,939 s` |
| Targets tactiles visibles | PASS; lista de infracciones `[]` | PASS; lista `[]` |
| Selector de Fotos | PASS fisico; abre, privacidad limitada y cancelacion segura | PASS iOS 26 |
| Accesibilidad automatizada | 7 avisos de area sobre textos estaticos; 0 controles pequenos | 0 incidencias en Inicio, aiRIM y Escanear |
| Escaner horizontal | FAIL en la 67: controles fuera/ocupados por barra | PASS candidato: botones dentro de `874 x 402`, pulsables y selector abierto |
| Consola/rutas web | No aplica | PASS; Explora y Escanear, `errors: []` |

## Hallazgos

### Corregidos para el siguiente candidato

1. **aiRIM heredaba el scroll de Inicio.** En la 67 fisica el encabezado podia abrir recortado. El candidato reinicia el scroll solo en nativo al cambiar de estado; `¿Que necesitas decidir?` queda completamente visible.
2. **El escaner desbordaba en horizontal.** En la 67 el boton de galeria llegaba a `x=1003` con viewport de `874`. El candidato usa una composicion nativa compacta: camara `x=375...551`, galeria `x=571...747`, ambas pulsables en `y=209...275` y por encima de la barra.
3. **La web se conserva.** Las reglas nuevas estan limitadas a `html.matchrim-native-platform`; la regresion web mantiene rutas y no registra errores de consola.

### Abiertos

- **P0 reconocimiento real:** no queda certificado. El ultimo benchmark independiente mantiene precision multietiqueta `50,00%`, recall `88,89%` y recall de menu de comida `24,07%`. El transporte autorizado de los cinco materiales termino 5/5, pero eso no certifica identidad.
- **P0 vitrina:** falta reconciliacion exhaustiva `box -> crop -> resultado -> identidad` para puntuar la vitrina sin inventar precision.
- **P1 visual:** el logo rojo historico de Matchrim en Inicio desentona con el lenguaje nuevo y merece una revision de identidad separada.
- **P2 automatizacion:** iOS 26 Simulator ignora de forma intermitente la orden de rotacion justo despues de `Home -> reactivar`. Persistencia al volver y rotacion desde lanzamiento pasan por separado; la combinacion queda sin certificar en simulador.

## Regresion tecnica

- `npm run typecheck`: PASS.
- `npx eslint . --quiet`: PASS.
- `npm test`: PASS, incluidos aprendizaje, personas sinteticas, contrato de comida, identidad de bodega, multivino, traza E2E, frigorifico, dataset de 30 escenas y dataset independiente de 25 fuentes.
- `npm run build`: PASS.
- `xcodebuild` con `App.xcworkspace`: PASS.
- Suite candidata de simulador: 7/8 en bloque; el unico fallo fue la transicion de orientacion descrita arriba. El test geometrico de paisaje y la interaccion de galeria pasan de forma dedicada.
- QA fisico acumulado de esta pasada: 5 pruebas PASS, incluidas navegacion, accesibilidad, arranques, targets y selector privado de Fotos.

## Evidencia

- [Inicio fisico build 67](qa-evidence/matchrim-build67-physical-deep-2026-10-01/final/physical-home-build67.png)
- [aiRIM fisico: defecto de scroll de la 67](qa-evidence/matchrim-build67-physical-deep-2026-10-01/final/physical-airim-build67-scroll-defect.png)
- [Escaner fisico build 67](qa-evidence/matchrim-build67-physical-deep-2026-10-01/final/physical-scan-hub-build67.png)
- [Selector privado de Fotos en iPhone fisico](qa-evidence/matchrim-build67-physical-deep-2026-10-01/final/physical-private-photo-picker-build67.png)
- [aiRIM corregido en candidato](qa-evidence/matchrim-build67-physical-deep-2026-10-01/final/candidate-airim-scroll-fixed.png)
- [Escaner horizontal corregido](qa-evidence/matchrim-build67-physical-deep-2026-10-01/final/candidate-scanner-landscape-fixed.png)
- [Selector privado de Fotos en candidato](qa-evidence/matchrim-build67-physical-deep-2026-10-01/final/candidate-private-photo-picker.png)

## Decision

La build 67 instalada sirve para revisar el nuevo diseno y los flujos principales, pero contiene dos defectos reproducibles ya corregidos en fuente: entrada de aiRIM con scroll heredado y layout del escaner en paisaje. El siguiente candidato debe incorporar estas correcciones. Su subida no debe presentarse como aprobacion del reconocimiento real mientras sigan abiertos los umbrales de precision y la trazabilidad de vitrina.
