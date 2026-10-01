# Matchrim 1.0 (66) - QA visual y benchmark de producto

Fecha: 2026-10-01

Commit auditado: `d809502`

Dispositivos: iPhone 16 Pro Max fisico con iOS 26.6 e iPhone 16 Pro Simulator con iOS 26.0.

## Dictamen

Build 66 es funcional y su nueva portada ya es mejor que la anterior, pero no tiene todavia un sistema visual coherente de app premium. La ventaja de producto existe: escanear una decision completa y explicar afinidad individual. El problema es que la experiencia se fragmenta entre una portada nueva, autenticacion y flujos aiRIM heredados, resultados demasiado largos y una identidad aiRIM generica.

No recomiendo imitar la tienda o la capa social de Vivino ni convertir Matchrim en un gestor de bodega como InVintory. Si recomiendo adoptar sus patrones de claridad: contenido personal desde el primer viewport, busqueda/escaneo persistente, navegacion estable y asistente contextual.

## Hallazgos prioritarios

### P0

1. Dynamic Type real no funciona. Cambiar iOS desde `large` a `accessibility-extra-extra-large` no modifica ningun texto de Matchrim. El QA previo de 125% era zoom del navegador, no una prueba del ajuste de texto del sistema.
2. El layout horizontal de Inicio y aiRIM solo muestra el primer bloque sobre la barra inferior. El scroll por rueda no recupero contenido en Simulator; hace falta corregir el layout y repetir el gesto tactil con XCUITest o dispositivo.
3. El gate de reconocimiento real sigue sin aprobar: multietiqueta `50.00%` precision / `88.89%` recall y menu de comida `24.07%` recall. El rediseño no puede ocultar esta deuda.
4. El resultado multietiqueta movil es excesivamente largo y mezcla revision, comparador, decision y lista en una unica pagina. La jerarquia se degrada a medida que aparecen mas vinos.

### P1

1. `BrainCircuit` se usa como supuesto logo de aiRIM en navegacion, portada, landing y chat. Es un icono generico, no una identidad.
2. aiRIM ocupa a la vez una pestaña principal, una tarjeta destacada y multiples accesos secundarios. Compite con Escanear, que es la accion diferencial del producto.
3. Perfil/Bodega sin sesion abren una pantalla rosa con degradado y tarjeta central. El flujo de ocasiones especiales tambien conserva degradado rosa, emojis y cards antiguas. Parecen productos distintos.
4. La portada prioriza accesos, no valor acumulado. Vivino enseña escaneos y favoritos; InVintory ensena coleccion y acciones de alta frecuencia. Matchrim deberia mostrar la ultima decision, los vinos pendientes de confirmar y el aprendizaje del gusto.
5. No hay adopcion de apariencia oscura. No es un bloqueo de publicacion, pero confirma que los tokens existen sin estar conectados al sistema.

### P2

1. La marca Matchrim usa una pieza 3D roja detallada que pierde legibilidad a 24-32 px. Puede mantenerse como activo editorial, pero necesita un simbolo simplificado para app y tab bar.
2. Falta feedback tactil/visual cohesivo entre captura, deteccion, confirmacion y guardado.
3. Hay demasiadas cajas, bordes y mensajes simultaneos en resultados. La informacion debe revelarse por capas.

## Antes y despues propuesto

| Antes | Despues | Por que |
| --- | --- | --- |
| Cinco tabs, con aiRIM y Escanear compitiendo | Cuatro areas: Inicio, Descubrir, Bodega y Perfil; Escanear como accion primaria separada | Una tab bar navega; una captura ejecuta una accion |
| aiRIM como tab y gran tarjeta roja | aiRIM como accesorio contextual sobre la barra o accion dentro de resultados | Aparece cuando ayuda a decidir y no roba protagonismo al escaneo |
| Cerebro Lucide repetido | Simbolo propio de brujula sensorial: punto central, cuatro radios de aroma y una aguja de decision | Expresa gusto + orientacion sin parecer chatbot generico |
| Inicio como menu de funciones | Inicio con ultima decision, continuar revision, historial reciente y recomendacion personal | Aporta recurrencia y devuelve valor acumulado |
| Resultado multivino de una sola pagina muy larga | Imagen con pins + lista resumida; detalle en sheet; comparador en modo separado | Reduce densidad y mantiene contexto espacial |
| Pantallas nuevas blancas y flujos antiguos rosas | Un unico sistema: fondos neutros, burdeos funcional, verde para eleccion y ambar para duda | La confianza deja de depender de estilos contradictorios |
| Porcentajes y confianza repetidos en varias cards | Un resumen de decision y disclosure de evidencia | Menos ruido y mas trazabilidad |
| Texto CSS fijo | Escala tipografica ligada a Dynamic Type, reflow y limites de lineas revisados | Accesibilidad real y menos cortes |

## Direccion de identidad aiRIM

Recomendacion: retirar el cerebro. Mantener `aiRIM` como nombre funcional durante la transicion, pero presentar la accion como `Preguntar a RIM` o `Ayudame a elegir`, con aiRIM como firma secundaria.

El simbolo recomendado es una brujula sensorial: cuatro radios asimetricos inspirados en una rueda de aromas, un punto central que representa el perfil y una aguja/check que marca la decision. Debe funcionar en una tinta, a 20 px y sin degradado. Evitar cara, robot, cerebro, burbuja con estrellas o avatar humano; todos desplazan la confianza desde la evidencia hacia una personalidad artificial.

## Patrones observados en el iPhone

### Vivino 2026.34.0

- La busqueda de cualquier vino y el acceso a camara estan disponibles arriba y abajo.
- La portada devuelve valor acumulado: comunidad, escaneos recientes, feedback y favoritos.
- El contenido usa fotografias reales y acciones de feedback muy claras.
- No copiar: tienda, notificaciones comerciales y capa social como eje.

### InVintory 6.37.0

- La coleccion es el objeto principal y cada accion responde a ese contexto.
- Busqueda y camara comparten una misma entrada.
- El asistente `Vincent` aparece como una barra accesoria sobre la navegacion, con voz opcional.
- La adicion de botellas es una accion separada de la tab bar.
- No copiar: gestion patrimonial, 3D o importacion masiva como nucleo de Matchrim.

### Ventaja propia que conservar

Matchrim puede resolver una decision completa en una sola foto: mesa, expositor, carta o pizarra; identificar cada opcion; mostrar duda; comparar afinidad; y explicar por que. Ni la comunidad de Vivino ni el inventario de InVintory deben desplazar este trabajo principal.

## Tendencias aplicables

La direccion actual de Apple favorece contenido protagonista, controles persistentes con semantica clara, tab bars adaptativas, busqueda alcanzable y componentes que responden al tamano/orientacion. Liquid Glass es una capa de navegacion y controles, no una excusa para llenar la interfaz de translucencias. Para IA, Apple recomienda permitir refinar/reintentar, explicar estados concretos, mostrar alternativas y recoger feedback explicito.

Fuentes:

- [Apple: Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)
- [Apple: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [Apple: Generative AI](https://developer.apple.com/design/human-interface-guidelines/generative-ai)
- [Apple: What's new in Design](https://developer.apple.com/wwdc26/guides/design/)
- [Vivino app](https://www.vivino.com/en/app)
- [InVintory App Store](https://apps.apple.com/us/app/invintory-wine-cellar-manager/id1434754695)

## QA ejecutado

| Comprobacion | Resultado |
| --- | --- |
| Launch Matchrim 66 en iPhone fisico | PASS |
| Captura comparativa Matchrim/Vivino/InVintory en el mismo iPhone | PASS |
| Inicio, Escanear, aiRIM, auth y flujo de ocasiones en Simulator | PASS con hallazgos P0/P1 |
| Retrato y paisaje | FAIL de adaptacion en Inicio/aiRIM |
| Dynamic Type del sistema | FAIL, no cambia |
| Apariencia oscura | No soportada |
| Inventario de 34 rutas a 430x932 | 34/34 render, 0 overflow, 0 errores de consola |
| Typecheck | PASS |
| ESLint | PASS con 105 warnings existentes |
| Build Vite | PASS; advertencias de chunks grandes |
| Contratos de clasificador, aprendizaje, multivino y ground truth | PASS |
| Reconocimiento real grabado | FAIL de release gate en multietiqueta y menu de comida |

Nota del gate: la primera ejecucion del inventario de rutas apunto por defecto al puerto `4173`, ocupado por otra app, y aun asi salio con codigo 0. Se repitio contra Matchrim en `4178` y dio el resultado correcto. El script debe validar la identidad del target para evitar futuros falsos verdes.

## Evidencias

- `docs/qa-evidence/matchrim-build66-visual-2026-10-01/matchrim66-device-home.png`
- `docs/qa-evidence/matchrim-build66-visual-2026-10-01/vivino-device-home.png`
- `docs/qa-evidence/matchrim-build66-visual-2026-10-01/invintory-device-home.png`
- `docs/qa-evidence/matchrim-build66-visual-2026-10-01/airim-portrait.png`
- `docs/qa-evidence/matchrim-build66-visual-2026-10-01/airim-landscape.png`
- `docs/qa-evidence/matchrim-build66-visual-2026-10-01/airim-dynamic-type-axxxl.png`
- `docs/qa-evidence/matchrim-build66-visual-2026-10-01/airim-special-moments-legacy.png`
- `docs/qa-evidence/matchrim-build66-visual-2026-10-01/auth-legacy-visual-break.png`
- `docs/qa-evidence/matchrim-build66-visual-2026-10-01/routes/route-inventory.json`

## Siguiente sprint recomendado

1. Corregir Dynamic Type y paisaje antes de redisenar componentes.
2. Sustituir el cerebro por el simbolo de brujula sensorial y eliminar aiRIM como tab principal.
3. Unificar auth y todos los flujos aiRIM con el sistema visual actual.
4. Redisenar Inicio alrededor de `Continuar decision`, `Escaneos recientes` y `Para ti`.
5. Separar el resultado multivino en vista de escena, lista y comparacion.
6. Repetir QA en iPhone, XCUITest y reconocimiento real antes del siguiente TestFlight.
