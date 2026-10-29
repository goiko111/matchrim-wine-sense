# Matchrim · kit para pilotos (beta interna de TestFlight)

## Para Goiko: dar de alta a un piloto

Los pilotos entran como **probadores internos**: hasta 100 personas y sin revisión de Apple.

1. App Store Connect → **Usuarios y acceso** → «+». Pon el nombre y el correo del piloto, con el rol más bajo (**Marketing** o **Ventas**; no hace falta Developer ni Admin). Si no quieres que vea apps que no son Matchrim, desmarca «Acceso a todas las apps» y deja solo Matchrim.
2. El piloto acepta la invitación desde su correo; así se crea su cuenta de App Store Connect.
3. App Store Connect → Matchrim → **TestFlight** → **Pruebas internas** → grupo (por ejemplo «Pilotos») → «+» y elige a la persona. Si el grupo tiene activada la distribución automática, recibe cada build nueva sin hacer nada más.
4. El piloto recibe un correo de TestFlight, instala **TestFlight** desde la App Store y después Matchrim.

Las builds caducan a los 90 días. Para dar de baja a un piloto, quítalo del grupo o de Usuarios y acceso.

## Para el piloto: qué probar (15 minutos)

1. **Regístrate y haz el test de perfil.** Así la afinidad se calcula con tus gustos.
2. **Escanea 5–10 botellas reales**, en casa, en una tienda o en un restaurante. Mezcla etiquetas fáciles, de bodegas conocidas, con otras difíciles: letra decorada, poca luz, botella brillante o etiqueta pequeña.
3. Para cada botella, fíjate en:
   - si la app la reconoce o te propone candidatos, y si el bueno está entre ellos;
   - si la añada coincide con la de la botella;
   - si calcula la afinidad y si te parece razonable;
   - debajo de la afinidad, la referencia de Winerim («Ver ficha original»).
4. **Si es tu vino, tócalo para confirmarlo.** La app nunca confirma un vino sola.
5. Valora los vinos que hayas probado. Así aprende tus gustos.

## Cómo avisar de un fallo

- **Captura de pantalla dentro de la app.** Haz una captura y elige «Compartir comentarios de la beta». TestFlight envía la captura, tu comentario, el modelo de iPhone y el número de build. Es la vía más útil.
- **Botón «Avísanos».** En la pantalla de candidatos («¿Ninguno es tu vino? Avísanos») y en Perfil («Enviar un comentario de la beta»). Abre tu correo con un mensaje ya preparado para hola@winerim.com, que incluye el texto leído en la etiqueta y los candidatos mostrados. Puedes editarlo antes de enviarlo. La app no envía nada por su cuenta ni adjunta fotos.
- Si la app se cierra de golpe, TestFlight te ofrece enviar el informe del cierre.

## Mensaje de bienvenida (para copiar y enviar)

> ¡Hola! Gracias por probar Matchrim antes que nadie.
>
> Matchrim lee la etiqueta de un vino con la cámara y te dice si encaja con tus gustos.
>
> 1. Te llegará un correo de Apple para unirte al equipo y otro de TestFlight. Instala TestFlight desde la App Store y, desde ahí, Matchrim.
> 2. Regístrate y haz el test de perfil (2 minutos).
> 3. Escanea botellas reales: en casa, en una tienda o en un restaurante. Si la app duda, te propondrá varios vinos; toca el tuyo.
> 4. Cuando algo falle o no te convenza, haz una captura de pantalla y elige «Compartir comentarios de la beta», o usa el botón «Avísanos» de la app. Cuéntanos qué botella era.
>
> Es una beta: habrá vinos que todavía no reconozca o sin datos de sabor. Precisamente eso es lo que queremos aprender contigo. ¡Gracias!

## Lo que todavía no hace bien (para no sorprenderse)

- Cuando no reconoce la etiqueta de primeras, propone candidatos y siempre pide un toque.
- Algunos vinos de Winerim aún no tienen datos de sabor; en esos casos la afinidad sale «sin calcular».
- El vermut no se acepta.
- Con el texto del iPhone al tamaño máximo, la cabecera del escaneo muestra solo la primera línea del título.
- Es una beta: tus valoraciones y tu perfil son reales y se guardan en tu cuenta.
