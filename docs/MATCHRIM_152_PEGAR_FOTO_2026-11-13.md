# Matchrim 152 · «Pegar foto» funciona en el iPhone (13-nov-2026)

Viene del vídeo de Goiko con la 151 en su iPhone (13:44).

## Lo que se vio en el vídeo
- Guardar y valorar funcionan: el bloque granate aparece en la ficha de escaneo y en la del vino guardado.
- **«Pegar foto» falló**: con una foto recién copiada en Fotos («Copiar foto»), la app respondió «No hay ninguna foto
  copiada». La lectura del portapapeles desde la página web no devuelve la imagen dentro de la app en el iPhone.
- Al valorar, el aviso decía «Valoración guardada; stock sin cambios. Faltan atributos sensoriales para afinar tu perfil».

## Lo que cambia
- El portapapeles lo lee la parte nativa (`pasteImage` en el plugin de la app, sobre el portapapeles del sistema). iOS
  pregunta «Matchrim quiere pegar desde…»; al permitir, la foto entra por el mismo camino que una de galería. Si se
  deniega o no hay foto, sale el aviso que explica cómo copiarla. La lectura desde la página queda como respaldo.
- Los avisos al valorar en iPhone dicen solo «Valoración guardada» o «Vino movido a Probados».

## Comprobación
- `check-matchrim-ux152.ts` 7/7; barrido de checks con los mismos 15 fallos de antes.
- candidate152-r1: prepare, compile, 4 pruebas nativas (r185–r188) y archivo firmado, PASS.
- En simulador, con una foto copiada de verdad al portapapeles del sistema: aparece el aviso de iOS, «Permitir pegar»
  y la app lee la foto y abre los candidatos. La llamada nativa devuelve la imagen (JPEG, ~270 kB).
- No probado en iPhone real.

## Sin tocar
- En la ficha de escaneo el bloque de guardar queda debajo de «Por qué encaja contigo»; en la de búsqueda está bajo
  el nombre. Subirlo exige reordenar la ficha de escaneo.
