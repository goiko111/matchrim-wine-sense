# Matchrim 147 · Perfil rediseñado y lo que enseñó el vídeo de la 146 (12-nov-2026)

Tercera entrega del goal del 12-nov. El propietario respondió «si sigue y paralelamente mira el video».

## Lo medido en su vídeo de la 146 (revisado fotograma a fotograma por un subagente)
- Entrada única «Botella o carta»: funciona. Una carta fotografiada por ahí pasa sola a «Carta de vinos» en ~3 s.
- Carta (22 vinos, dos columnas): «Vista rápida» 1 s después de «Analizar la carta»; lista completa a los ~39 s.
  La vista rápida salió pobre: títulos de sección como vinos, nombres cortados de la columna de al lado, un precio
  de otra columna (70 € por 25 €), y solo dos rangos grises; ningún número verde.
- Números sobre la foto: 10 de 22, repartidos por el hueco antes de los precios, no junto a cada nombre.
- Botella (Chivite «La Zorrera» 2015): candidato a los ~7,5 s, pero el primero era «Finca Legardeta Finca de
  Villatuerta Garnacha»; el correcto estaba segundo entre «otros candidatos (12)». El usuario tardó 16 s en dar con él.
- Guardar con «Quiero probarlo» vuelve a la pantalla de cámara; antes parpadea medio segundo «Lectura terminada».
- La ficha se abrió desplazada: la botella y el 77/100 quedaban ocultos.

## Cambios
- **Perfil** con el lenguaje de la ficha de vino: cabecera clara, las mismas escalas de dos extremos con la marca
  «Tú» (Ligero ↔ Con cuerpo…), y los vinos recomendados como tarjetas compactas que se abren en el sitio.
- **Botella.** El vino cuyo nombre es exactamente lo que dice una de las líneas más grandes de la etiqueta va primero
  (`promoteHeadline147`). La ficha se abre por arriba. El primer paso dice «Leyendo la foto».
- **Números de la carta.** Siempre justo detrás del nombre y con el tamaño del texto impreso (antes dependía de la
  distancia entre los vinos colocados, que en una carta real engañaba).
- **Vista rápida.** Sin títulos de sección, sin zonas cortadas, sin nombres cortados por el borde; el precio es el
  más cercano a la derecha; el texto ya no promete «unos segundos».
- **90 curiosidades** (aprobadas las 30 primeras; pidió «muchas más»).
- **Probados y En bodega a la vez**: valorar un vino que tienes en casa no lo saca de la bodega.

## No incluido
- El parpadeo de «Lectura terminada» al guardar y el de la pantalla inicial tras «Usar foto» (medio segundo).
- La lectura del servidor separa mal alguna línea («JULIAN» / «IRACHE 18.91»): es backend.
- Rediseño de aiRIM, test y modo restaurante.

## Comprobación
`check-matchrim-ux147.ts` 5/5; barrido con los mismos fallos conocidos (uno menos: menu88); E2E 85/85; Perfil visto
en simulador. La regla del nombre grande y la colocación de números no están vistas en un iPhone real.
