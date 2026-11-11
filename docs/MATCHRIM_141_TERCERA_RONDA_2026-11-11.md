# Matchrim 141 · Tercera ronda en iPhone real, sobre la 140 (11-nov-2026)

Lo que Goiko vio en la 140 y lo que hace la 141. Solo iOS; web, `main` y backend sin tocar.

## Cambios
1. **Añada «1927».** El arreglo de la 140 eligió el número de botella: el iPhone lee «Esta es la botella número» y
   «1927» como dos líneas. Ahora cada línea se juzga con la anterior y un año suelto de más de cuarenta años nunca
   es la añada. Si el 2020 no se lee, sale «Añada no indicada».
2. **La ficha de Winerim de verdad.** «Ver la ficha completa de Winerim» abre la página de Winerim enmarcada dentro
   de la app, con «Cerrar». En búsqueda, escaneo, recomendaciones y Mis vinos. Vista en simulador con una ficha real.
3. **Guardar en un toque** un vino buscado («Por probar», con foto, bodega, zona y añada). Sin formulario.
4. **Mis vinos:** ficha corta (foto, veredicto o estimación, «Me he bebido una botella», valorar, nota, Winerim) y
   «Más opciones». Foto de Winerim en la lista cuando no hay propia. Menos consultas al cargar en iOS.
5. **Carta de vinos:** bandeja de hasta cuatro fotos antes de analizar; lo no leído se reintenta solo una vez;
   espera a toda altura; notas dibujadas sobre la foto cuando las posiciones son fiables.
6. **Buscador:** el filtro de entradas con precio mira también el segundo nombre de la tienda; los resultados
   anteriores que siguen encajando se quedan mientras llega la búsqueda nueva.

## Lo que conviene saber
- Las notas sobre la foto dependen de las posiciones que devuelve el servidor; con cartas reales pueden salir
  desplazadas. Si menos del 70 % de los vinos tiene posición, la foto queda plegada.
- En vinos con ficha verificada, Mis vinos conserva «Afinidad actual» y «Guardar afinidad de hoy» (función previa,
  protegida por pruebas). Decisión pendiente.
- El favorito y eliminar pasan a «Más opciones».
- La velocidad no cambia: 3-5 s por consulta a Winerim y unos 30 s la lectura de una carta con IA.

## Comprobación
- Recorridos en simulador: 11 recorridos, 85/85 (guardado en un toque, marco de Winerim, carta con bandeja).
- Checks: 197 (196 de la 140 más `ux141`).
- QA nativa: candidate141-r1, r137-r140 en verde a la primera; archive141-r1 firmado.
- No probado en iPhone real.
