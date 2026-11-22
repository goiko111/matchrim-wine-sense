# Matchrim 165 · La app se adapta a la búsqueda nueva del servidor (22-nov-2026)

Desarrollo contestó el 21-nov (hilo AgentMail 37a80851): la búsqueda simple y la de lotes ya separan las palabras,
perdonan una errata por palabra, normalizan signos («18.91», «R-20»), ordenan por relevancia y admiten en el lote la
uva y el tipo de cada texto (`{"text","grape","type"}`, solo para ordenar). `typicalPrice` es la mediana de
restaurantes, sin distribuidores ni precios de menos de 5 €. Nava Real está en el catálogo pero en ninguna carta
activa (la tienda no lo enseña); de Julián piden la bodega o la D.O. El propietario pidió adaptar la app.

## Qué cambia en la app (`src/utils/storeListing139.ts`)
- Cada línea de la carta viaja con su tipo (tinto, blanco, rosado, espumoso) y la uva que imprime la carta
  (`lineHint165`, `BatchHint165`). Si el servidor rechazara un lote por esos objetos (400), se reenvía una vez como
  textos sueltos.
- Fuera el segundo intento propio de `estimateListing139` (hasta seis maneras más de preguntar cada línea sin
  encontrar): repetía lo que ya hace el servidor. Lo que contesta el lote se compara estricto y luego flexible; una
  línea que el lote no encuentra ya no se vuelve a preguntar. La búsqueda uno a uno queda para cuando el lote no se
  puede usar o deja un rango sin precios. (`rescueQueries162` sigue en la búsqueda a mano, `searchStoreTolerant163`.)
- El color que imprime la carta decide: «OSTATU» bajo los blancos ya no es el tinto que se llama exactamente «Ostatu»
  si esa bodega tiene blancos; sale el rango de sus blancos y el precio de la carta lo acota (Ostatu Blanco, Muga
  Blanco). Sin vinos de ese color, el nombre exacto sigue ganando. Vinos que son todos de otro color no casan
  («JULIAN – Garnacha», rosado, no es ninguno de los tintos «San Julián»).
- Un nombre corto que comparten hasta cuatro vinos del mismo color («La Mar») es un rango que el precio acota, en
  vez de «no lo hemos encontrado».
- Las respuestas guardadas en el teléfono cambian de versión (`store_batch.v2`, `store_search.v2`): las anteriores
  decían «nada» para líneas que el servidor ahora encuentra.

## Medido contra producción (22-nov-2026, carta del cliente, 22 líneas)
- Antes de recortar: 21/22, 2 lotes + 14 búsquedas sueltas, 2,6 s (y dos errores: «Julián» casaba con tres tintos;
  «Ostatu» y «Muga» con sus tintos).
- Ahora: 20/22, 1 lote, 0 búsquedas sueltas, 0,4 s. Sin encontrar: Julián y Nava Real, que no están en la tienda.

## Comprobado
- `scripts/check-matchrim-ux165.ts` 6/6 con las respuestas de producción de hoy (`scripts/fixtures/store-snapshot165.json`);
  ux163 4/4 (su grupo de la carta pasa a la 165), batch160 6/6, search162, menu139 24/24, ux164, ux162; tipos sin errores.
- Simulador (binario compile164-r1 con la web nueva): `harness/ux163.mjs` con el snapshot 165 20/20, la carta en 4 s; recorridos j02–j12 85/85; ux164 16, ux162 17, ux162b 8, ux161 7, ux159 7, ux158 16.

## Sin hacer o sin comprobar
- iPhone real. No hay build 165.
- La uva de la tienda no siempre es la de la carta (Terras Gauda La Mar figura como Albariño, la carta dice Caíño):
  la uva enviada ordena en el servidor, pero en la app «La Mar» se resuelve por precio.
- La búsqueda a mano conserva su segundo intento propio; no se ha medido si sobra.
- No se ha contestado a desarrollo (falta la bodega o D.O. de «Julián»).
