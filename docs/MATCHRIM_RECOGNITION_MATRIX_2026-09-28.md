# Matchrim: matriz canónica de reconocimiento real

Fecha: 2026-09-28

Build de cliente observado: Matchrim 1.0 (64)

Backend visual heredado por el build: funciones desplegadas v3; no se realizó deploy

## Regla de lectura

Esta matriz no mezcla QA de interfaz con exactitud del modelo. `Backend real` significa
que la imagen llegó a una Edge Function desplegada sin interceptar la respuesta.
`Fixture de interfaz` significa que la imagen real se cargó en el cliente, pero la
respuesta de red fue controlada para validar estados, accesibilidad y layout.

El gate de identidad es precisión y recall `>= 0,90`. Una categoría sin ground truth
exhaustivo no puede certificarse aunque produzca muchas regiones o candidatos.

## Resultado por categoría

| Categoría | Evidencia real | Ground truth | Resultado | Gate |
| --- | --- | --- | --- | --- |
| Etiqueta individual | 11 escenas independientes, backend real | 11 identidades | 10 correctas de 13 resultados; precisión `0,7692`, recall `0,9091`, latencia media `9,581 s` | **FAIL precisión** |
| Varias botellas/etiquetas | 6 escenas independientes + vitrina aportada | 4 escenas con 9 identidades evaluables; 2 de grounding/recuento; vitrina sin identidades/cajas exhaustivas | 8 correctas de 14 resultados: precisión `0,5714`, recall `0,8889`; vitrina: 30 resultados, 7 de alta confianza, precisión/recall de identidad no disponibles | **NO CERTIFICADO / FAIL** |
| Carta de vinos impresa | `IMG_7547 2` y `IMG_7548 2`, backend real | 24 referencias | 17/24, precisión `1,0000`, recall `0,7083`; `IMG_7547` aporta 9/16 y concentra las omisiones | **FAIL recall** |
| Pizarra/carta densa | `IMG_7552 2` y `IMG_7553 2`, backend real | 32 referencias | 32/32, precisión `1,0000`, recall `1,0000`; latencias `32,526 s` y `39,059 s` | **PASS limitado a 2 escenas** |
| Carta de comida | Menú real CC0 fotografiado, backend real `scan-food-pairing` | 54 platos legibles anotados | 8 tarjetas; 13/54 nombres cubiertos, precisión de grounding `1,0000`, recall `0,2407`, una tarjeta fusiona 6 postres; `22,907 s` | **FAIL recall/segmentación** |

Como control adicional, las cinco cartas impresas del dataset independiente suman 101
aciertos sobre 110 resultados y 107 referencias: precisión `0,9182`, recall `0,9439`,
latencia media `36,799 s`. Sus tres pizarras independientes suman 28/29, con precisión
y recall `0,9655` y latencia media `61,409 s`. Esos agregados superan el umbral, pero no
anulan el fallo de la carta aportada `IMG_7547` ni certifican vitrinas.

## Carta de comida real

La escena nueva es una fotografía real de un menú impreso en turco, con perspectiva,
reflejos, varias secciones y precios. La imagen procede de Wikimedia Commons, autor
`Caspardergeist`, licencia CC0 1.0. El ground truth excluye encabezados, precios,
teléfonos y redes sociales.

La ejecución devolvió HTTP 200 desde
`scan-food-pairing-2026-06-30-client-profile-v1`, sin cuenta autenticada y sin escritura
de producción. Los ocho resultados estaban apoyados por texto visible; no hubo nombres
inventados. Sin embargo, el contrato limita la salida a ocho platos y el modelo agrupó
`Magnolya/Mozaik Pasta/Kabak Tatlısı/Sütlaç/Pannacotta/Supangle` como un único plato.
Por eso la exactitud de los resultados devueltos no compensa el recall `24,07%` ni la
segmentación incorrecta.

Evidencia reproducible:

- `qa-fixtures/food-menu/commons-restaurant-menu-2026-08-25-2000.jpg`
- `qa-fixtures/food-menu/ground-truth.json`
- `scripts/qa-matchrim-food-menu.py`
- `docs/qa-evidence/matchrim-build64-recognition-2026-09-28/food-menu-real-backend.json`

## Fixtures de interfaz, separados

El build 64 conserva `27/27` casos de Playwright para carga de imágenes reales,
previsualización, pins y lista sincronizada, detalle de afinidad, corrección manual,
reintento, cancelación, modo sin red, retrato, paisaje, Dynamic Type y accesibilidad
básica. Este resultado certifica el cliente y el layout; no aporta precisión ni recall.

## Perfiles y aiRIM

La auditoría de perfiles permanece separada de visión. Las tres personas deterministas
mantienen aislamiento y orden aprendido tras serialización. Las tres respuestas del
runtime real de aiRIM identifican evidencia faltante y usan confianza cualitativa tras
el ajuste del build 64. No se crearon cuentas ni se escribieron datos de producción.

Evidencia:

- `qa-artifacts/2026-09-28-build64-testflight/airim-persona-responses.json`
- `qa-artifacts/2026-09-28-learning-airim/home-airim-qa-results.json`
- `qa-artifacts/2026-09-28-learning-airim/ui-qa-results.json`

## Estado de certificación

- Cliente móvil y layout: **PASS**.
- Pizarra/carta densa en las dos escenas aportadas: **PASS limitado**.
- Exactitud visual integral del build 64: **NO CERTIFICADA**.
- P0 dominante: falsos positivos multietiqueta, recall de `IMG_7547` y cobertura/
  segmentación de carta gastronómica.
- No se justifica otro binario: los defectos demostrados están en el runtime de visión
  y su contrato. Corregir el cliente o subir build 65 sin un backend mejor no cambiaría
  estas métricas.

## Fuentes numéricas

- `docs/qa-evidence/matchrim-build62-backend-gate-2026-09-01/ground-truth-e2e-report.json`
- `/Users/GOIKO/2matchrim-p0-remediation-20260826/qa-artifacts/matchrim-independent-v2/e2e-final-25-2026-09-01/ground-truth-e2e-report.json`
- `docs/qa-evidence/matchrim-build64-recognition-2026-09-28/food-menu-real-backend.json`
