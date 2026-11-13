# Matchrim 153 · El relieve llega al resto de pantallas (13-nov-2026)

Goiko, tras probar la 152: «¿podemos avanzar con el diseño?». Continúa la 150/151 (la app se veía plana).

## Lo que cambia
- **Escanear:** «Botella o carta» es la puerta rellena en granate, como en Inicio; «Comida y vino» es una tarjeta;
  «Más formas» y «Últimos escaneos» van en tarjetas.
- **Perfil:** la frase «En pocas palabras…» es el único bloque oscuro; estilos, escalas, uvas y regiones con sombra
  en vez de borde; títulos de sección más marcados; «El que más» relleno.
- **Vinos recomendados (Perfil e Inicio):** nota en etiqueta de color, botella dibujada en el color del vino, punto y
  nombre del tipo.
- **aiRIM:** la invitación a preguntar es el bloque oscuro mientras el chat está vacío; ejemplos como tarjetas.
- **Ficha de escaneo:** «¿Qué haces con este vino?» sube justo debajo del veredicto (antes había que bajar una
  pantalla, visto en los vídeos de la 151 y la 152). Se muestra una sola vez.

## Comprobación
- `check-matchrim-ux153.ts` 8/8; barrido con los mismos 15 fallos de antes; E2E 85/85.
- candidate153-r1: prepare, compile, 4 pruebas nativas (r189–r192) y archivo firmado, PASS.
- En simulador sobre la 153 compilada: las tres pantallas nuevas y la ficha de escaneo con el bloque bajo el veredicto
  (un solo bloque; guardar desde ahí funciona).
- No probado en iPhone real.

## Sin tocar
- Restaurante y carta de vinos solo cambian por las tarjetas compartidas; no se han rediseñado.
- La valoración intermedia y el resto de `MATCHRIM_PENDIENTES_2026-11-13.md`.
