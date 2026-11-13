# Matchrim 151 · El siguiente paso se ve, y pegar una foto (13-nov-2026)

Viene de dos audios de la mujer de Goiko tras usar la 149/150 (12-nov, 22:34 y 22:35), transcritos en local.

## Lo que dijo
1. Subió un vino que le gustó mucho (La Suerte de Arrayán, garnacha). La app le dio 68/100 y no supo cómo decirle que
   a ella le había encantado. «El siguiente paso —si lo voy a probar, si ya lo he probado o si lo tengo en bodega— me
   pasa desapercibido: aparece todo del mismo color, tengo que leerlo todo y no veo los botones donde tocar.»
2. Entre «Me encanta» y «Correcto» falta un término medio («Me gusta», «Me gusta mucho»). Hoy, para que la app aprenda,
   se ve obligada a marcar «Me encanta» en vinos que solo le han gustado.
3. A veces tiene una captura de una botella en el teléfono y desde la app no la encuentra al buscar fotos. Con otras
   apps la copia y la pega.

## Lo que cambia en la 151
- **Guardar y valorar es el único bloque oscuro de la ficha.** Las tres opciones («Quiero probarlo», «Ya lo he
  probado», «Lo tengo en casa») eran cajas blancas sobre fondo blanco. Ahora van en un bloque granate con el título
  «¿Qué haces con este vino?» y la frase «Guárdalo. Si ya lo has probado, nos dices qué te pareció». Las tres siguen
  iguales entre sí (en la 144 una sola rellena se leía como ya elegida). Vale para la ficha de búsqueda y la de escaneo.
- **Cada valoración tiene su color**: verde (me encantó), ámbar (correcto), gris (no me gustó), tanto al guardar como
  en la ficha de un vino ya guardado.
- **Un vino guardado sin valorar lo pide en ese mismo bloque oscuro** («¿Lo has probado? Dinos qué te pareció»).
  Cuando ya está valorado vuelve a ser una tarjeta normal.
- **«Pegar foto» en el escáner**, junto a «Elegir de galería». Se copia la foto en Fotos, WhatsApp o el navegador y se
  pega aquí; sigue el mismo camino que una foto de galería. iOS pide permiso para pegar cada vez. Si no hay foto
  copiada, la app explica cómo copiarla.
- Las tarjetas de la ficha del vino toman el relieve de la 150.

## Lo que NO cambia y necesita decisión: el término medio de valoración
No se puede hacer solo en la app. La base de datos solo admite tres valores (`rating IN ('love','ok','not_for_me')`)
y el aprendizaje del perfil, en la app y en el servidor, pesa esos tres (1 · 0,25 · −0,8). Añadir «Me gusta» supone:
1. Migración en producción: admitir un cuarto valor (`like`). Es aditiva; las versiones antiguas siguen funcionando.
2. Aprendizaje (app y funciones del servidor): peso intermedio para `like` (propuesta: 0,6) y su banda de ajuste.
3. App: cuarta opción en los tres sitios donde se valora y sus textos («Te gustó»).
El orden obligado es servidor primero y app después; una app que envíe `like` antes de la migración daría error al
guardar. Queda pendiente del OK de Goiko, como el resto de cambios de servidor.

## Propuesta aparte: compartir desde Fotos
Lo más natural sería «Compartir → Matchrim» desde la galería. Es una extensión nativa nueva (otro objetivo en Xcode,
grupo de apps y perfil de firma propio). No está hecho; «Pegar foto» cubre el caso mientras tanto.

## Comprobación
- `check-matchrim-ux151.ts`: 12/12. Recorrido `ux151` en simulador: 8/8.
- No probado en iPhone real. El pegado se ha probado en simulador sustituyendo el portapapeles; el aviso de permiso
  de iOS al pegar solo se verá en el teléfono.
