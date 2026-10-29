# Matchrim 130 · medición del recorrido completo con la carta plazablanca-clone (29-oct)

## Qué se ha medido

Es el recorrido que hace un piloto cuando la app no identifica la etiqueta, con el código real de la app (`CandidateRecovery286.find`):

lectura en el dispositivo → consultas 104 → `searchCandidates286` contra el buscador público de Winerim → candidatos → vino correcto → datos de sabor de Winerim → afinidad con un perfil sintético.

- **Lectura:** Apple Vision revision 3, en modo preciso, sin vocabulario. Usa los mismos idiomas y el mismo escalado que `MatchrimOCRPlugin106`: miniatura de 2400 px como máximo y ampliación ×2 Lanczos por debajo de 1200 px.
- **Imágenes:** los 135 vinos de la carta, con la imagen original de Winerim (`app.winerim.com/images/wines`, entre 409 y 1080 px de alto; es la de mayor resolución que publica Winerim). De cada una hay dos versiones «tipo foto de móvil» generadas con CoreImage:
  - **a (mesa):** la botella ocupa 2100 de 2400 px, con perspectiva, desenfoque de 1,6 y un reflejo;
  - **b (restaurante):** botella de 1300 px, −1,1 EV, tono cálido, grano y desenfoque.
- **Búsquedas:** 292 peticiones HTTP al buscador público, por debajo del tope de 300 y con caché, sin repetir ninguna. Todas devolvieron 200, con una mediana de 3,3 s.
- **Cobertura:** el presupuesto alcanzó para **76 imágenes de 26 vinos**, en orden de carta y con las tres versiones de cada vino. Las otras 314 imágenes no se han buscado.
- **Sin coste ni datos reales:** ningún modelo, ninguna cuenta, ninguna foto subida y 0 EUR.

Evidencias en `qa-artifacts/realphotos130-20261029/`: RESULT-carta-r1.json, requests.json y las herramientas. Las imágenes y lo leído en cada una están en `~/ClaudeCode/matchrim-realphotos130/`.

## Resultados (76 imágenes, 26 vinos)

| | Original | Mesa (a) | Restaurante (b) | Total |
|---|---|---|---|---|
| Vino correcto en 1.ª posición | 18/26 | 16/26 | 13/24 | **47/76 (62 %)** |
| Entre los 3 primeros | 20/26 | 20/26 | 17/24 | **57/76 (75 %)** |
| Entre los candidatos (incluido «Ver más») | | | | **64/76 (84 %)** |
| Sin candidatos | 1 | 2 | 3 | 6 |
| El correcto no aparece | 2 | 3 | 1 | 6 |

- **Propuesta única («¿Es este tu vino?»):** se mostró 11 veces. En 8 era exactamente el vino de la carta. Las otras 3 son el mismo vino (Clos Cibonne Tentations), que el catálogo tiene duplicado con otro nombre. No hubo ninguna propuesta única de otro vino.
- **Lectura vacía:** 15 imágenes de las 405, 12 de ellas en la versión con poca luz (b), que es exigente a propósito.
- **Datos de sabor:** **63 de las 64 fichas encontradas traen datos de sabor de Winerim (0–5), y con ellas se calcula la afinidad.** En las 26 de 26 que se pudieron medir, la carta aporta datos de sabor.
- **Añada:** solo se lee en 16 imágenes; las fotos de catálogo casi nunca muestran la cosecha. En las 2 discrepancias la imagen de Winerim es de otra añada que la carta: Mestres Coquet, cuya imagen es de 2014 y la carta dice 2021, y Dom Pérignon, imagen de 2015 y carta de 2017. Cuando la ficha no tiene añada y no se lee, la app no inventa ninguna.

## Por qué falla

1. **Etiquetas muy decoradas o tipografía artística** (El Pinsapo, Fronholz de Ostertag, Cloe): la lectura sale con letras cambiadas y la búsqueda no encuentra nada útil. El piloto tiene que escribir el nombre.
2. **Solo se lee la bodega** (Mestres, André Clouet, Sierra Cantabria): hay muchos vinos de la misma bodega y el correcto queda en «Ver más candidatos».
3. **Fichas duplicadas en el catálogo** (Tentations / Côtes de Provence Clos Cibonne Tentations): es un problema de datos, no de la app.

En esta medición no hay ningún fallo de ranking que justifique tocar el código de la 130: cuando se lee el nombre, el vino correcto sale primero.

## Lo que no se ha podido verificar

- **La referencia maestra con sesión iniciada**, que es el caso de los pilotos: la afinidad sale de la función `matchrim-master-catalog`, y eso requiere una cuenta. Crear cuentas queda fuera de los límites del goal. Aquí se mide si la ficha elegida tiene datos de sabor en Winerim y qué afinidad dan; según la decisión del 28-oct, son los mismos valores que la referencia maestra.
- **Sin sesión**, la ficha pública no da afinidad, porque sus datos de sabor están apartados desde 4486fd0.
- **El resto de la carta (109 vinos) y las 102 fotos reales con licencia libre** se leyeron, pero no se buscaron: el presupuesto de 300 búsquedas se acabó. Hace falta un OK para más búsquedas.
- **La QA en el simulador con red** consumiría más búsquedas públicas y también necesita ese OK.
