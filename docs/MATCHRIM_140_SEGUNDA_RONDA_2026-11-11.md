# Matchrim 140 · Segunda ronda en iPhone real, sobre la 139 (11-nov-2026)

Goiko probó la 139 en su iPhone: la botella se enlazó sola, la carta contestó y el buscador encontró los vinos.
Lo que no le convenció, y lo que hace la 140. Solo iOS; web, `main` y backend sin tocar.

## Cambios
1. **La ficha de Winerim se abría en Safari.** Ya no hay ningún control en iOS que salga de la app hacia la web de
   Winerim (escáner, carta, Mis vinos). La ficha (tipo, zona, uvas, añada) y la foto se ven dentro.
2. **Ficha de la botella escaneada:** foto, veredicto, guardar, ficha de Winerim y corregir. Sin el bloque repetido,
   sin «Detalles de lectura», sin la caja vacía con «Cancelar», sin flechas con una sola botella, sin «Identidad
   revisada por ti» cuando la enlazó la app.
3. **Añada:** un «botella número 1927» en la etiqueta se tomaba por otro año y, con dos años, no se elegía ninguno.
   Ese número se descarta y un año solo en su línea gana. Reproducido con el texto de la etiqueta, no con la
   lectura real del iPhone.
4. **Carta de vinos:** el precio de la carta decide qué vino de la bodega es («probablemente, por el precio»);
   los seguros van antes que los rangos; los rangos ocupan una línea; si la uva de la carta no está en la bodega se
   dice; nombre y foto de Winerim; guardar en un toque desde la ficha. Carta de Ikili: 7 exactos, 4 probables,
   5 rangos, 3 fuera de Winerim.
5. **Buscador:** botellas más grandes, volver de una ficha conserva la búsqueda, primero los vinos con el nombre
   buscado, sin entradas basura ni formatos repetidos.
6. **Velocidad:** 19 vinos en unos 17 s (antes más de 30), primeros resultados a los 6 s.

## Lo que conviene saber
- Cada consulta a Winerim tarda 3-5 s y su servidor falla por encima de unas seis a la vez. Ir más rápido requiere
  una consulta por lotes en Winerim.
- El «probable por precio» puede equivocarse cuando la tienda no distingue bien las uvas (visto: «Muga – Garnacha»
  → Muga Crianza).
- El bloque repetido sigue en la corrección manual de una botella: la prueba nativa lo exige ahí.
- Se dejó de descartar los vinos con datos «3, 3, 1, 3, 3»: son tintos medios normales, no relleno.

## Comprobación
- Recorridos en simulador: 11 recorridos, 84/84. Sin fotos de botella en los datos simulados.
- Checks: 196 (195 de la 139 más `ux140`). `check-matchrim-original-library89-ui` adaptado: en iOS la ficha
  verificada ya no enlaza fuera.
- QA nativa: candidate140-r1, r133-r136 en verde a la primera; archive140-r1 firmado.
- No probado en iPhone real.
