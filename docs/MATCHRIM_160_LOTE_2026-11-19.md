# Matchrim 160 (en preparación) · Búsqueda por lotes de Winerim (19-nov-2026)

## Lo que dijo desarrollo (19-nov, pegado por el propietario)
- Lote hecho: `POST /api/v1/matchrim/wines/search-batch` con `{"texts": [...]}` (1 a 25), sin clave, 30 lotes por
  minuto por IP (compartidos por los móviles de una misma red). Por texto, hasta 5 vinos, uno por vino, sin precio,
  con `id`, `slugname`, datos y `tastingAttributes`. Sin publicar: lo publican junto con el arreglo de velocidad.
- Búsqueda simple: 1,3–1,5 s en producción; la causa (búsqueda por bodega) está hallada y el arreglo preparado, sin
  cifra prometida.
- Lectura de cartas (`scan-wine-menu`) y alcance del vino no encontrado: en estudio.
- Comprobado el 19-nov: la dirección del lote responde 404 en producción.

## Qué hace la app
- `batchRows160` en `storeListing139.ts`: las líneas pedidas en el mismo instante (una carta, varias botellas) viajan
  en una llamada de hasta 25 textos. `estimateListing139` usa primero el lote.
- Si el lote no existe (404/405/501) o responde algo que no se reconoce, no se vuelve a intentar en media hora y
  todo sigue con la búsqueda de siempre. Con 429 se pausa un minuto.
- Una línea que el lote deja entre varios vinos de una bodega se vuelve a pedir con la búsqueda simple, porque esa
  trae los precios de restaurante con los que se elige entre ellos (el lote no lleva precio).
- La búsqueda escrita a mano (Inicio) sigue con la búsqueda simple: enseña hasta 20 resultados.
- La forma exacta de la respuesta no está confirmada: se acepta la lista directa o bajo `results`/`data`/`items`, y
  cada texto como lista o como objeto con `wines`/`results`/`items`/`matches`.

## Riesgos anotados
- Dijimos a desarrollo que el precio no lo usábamos; sí se usa para elegir entre vinos de una misma bodega en una
  carta. Queda cubierto con la segunda consulta, pero convendría pedir el precio habitual en el lote.
- Un vino que el lote no encuentra no se vuelve a buscar uno a uno: si el lote busca peor que la búsqueda simple,
  se perderían aciertos. Hay que medirlo cuando esté publicado.

## Comprobación
`check-matchrim-batch160.ts` 6/6 (servidor simulado); en simulador, una carta hace un lote y ninguna búsqueda
suelta con el lote activo, y un intento fallido más las búsquedas de siempre sin él; E2E 85/85 (tres recorridos
necesitaron repetirse por la conexión de la prueba). No probado contra el lote real ni en iPhone.
