# Matchrim iOS · Pedir a Winerim un vino que no está (alcance para desarrollo, 14-nov-2026)

## Qué necesitamos
Cuando alguien escanea una botella en Matchrim y el vino no está en la tienda pública, la app debe poder pedir a
Winerim que lo busque y lo cree, con el mismo proceso que Winerim ya usa cuando un cliente solicita un vino, y
recibir la ficha cuando esté lista.

Caso real (14-nov): «La Nine», Domaine Jean-Baptiste Sénat, Minervois 2023. La app leyó bien la etiqueta, pero
`/api/v1/restaurant/{uuid}/wines?text=` no devuelve nada para «la nine», «senat» ni «domaine senat».

## Lo que pedimos a desarrollo

### 1. Crear la solicitud
`POST` a un endpoint nuevo, llamable desde la app sin clave secreta (la app es pública; una clave dentro se puede
extraer). Si hace falta protegerlo, con límite por dispositivo o por usuario.

Lo que enviaría la app:
- `name`: nombre leído o corregido por la persona (obligatorio).
- `winery`, `vintage`, `region`, `country`, `type`: si se conocen.
- `labelText`: las líneas leídas en la etiqueta, tal cual, para ayudar a identificarlo.
- `requestId`: identificador generado por la app, para no crear dos solicitudes del mismo escaneo.
- Sin foto y sin datos de la persona. Si la foto os ayuda, decidnos y lo valoramos aparte (hoy la foto de una
  botella no sale del teléfono).

Lo que necesitamos de vuelta: un identificador de solicitud y un estado.

### 2. Estados
- `found`: el vino ya existía (la búsqueda de la app no lo encontró). Devolver la ficha directamente.
- `pending`: en proceso. Indicar, si se puede, cuánto suele tardar.
- `created`: ficha creada. Devolver la ficha.
- `not_found`: Winerim no ha podido identificarlo.
- `rejected`: no es un vino o la solicitud no es válida.

### 3. Consultar la solicitud
`GET` por identificador de solicitud, para que la app pregunte al volver a abrirse. No necesitamos avisos push.

### 4. La ficha que devuelve
La misma forma que una fila de la tienda, para abrirla con el código que ya tenemos:
`id`, `slugname`, `name`, `winery`, `vintage`, `type`, `region`, `country`, `grapes`, `photo` y `tastingAttributes`
(`power`, `acidity`, `sweetness`, `tannin`, `fruity`, de 0 a 5). Con `id` y `slugname` abrimos el detalle actual.

Además, un campo que diga de dónde salen los datos de sabor (cata, ficha de bodega, estimación automática). La app
lo usa para decir «estimación» cuando corresponde.

### 5. Reglas
- Una solicitud repetida del mismo vino no crea un duplicado: devuelve la ficha o la solicitud existente.
- El vino creado queda en la tienda pública, de modo que la siguiente búsqueda normal ya lo encuentra.

## Preguntas para desarrollo
1. ¿Cuánto tarda hoy el proceso de buscar y crear un vino solicitado: segundos, minutos u horas? De eso depende que
   la app espere en pantalla o diga «te avisamos cuando esté».
2. ¿El proceso actual es automático o pasa por una persona?
3. ¿Hay límite de solicitudes que debamos respetar por usuario o por día?
4. ¿Os sirve el texto leído de la etiqueta, o necesitáis la foto?
5. ¿Podéis marcar el origen de los datos de sabor en la ficha?

## Qué hará la app
- Hoy (build 156): si el vino no está, la persona puede guardarlo en sus vinos con lo que dice la etiqueta, sin nota
  de afinidad, y hay un enlace que abre el correo para pedirlo a Winerim.
- Con este endpoint: ese enlace pasa a ser un botón «Pedir a Winerim que lo añada». Si la respuesta llega en
  segundos, se muestra la ficha y la nota en el momento. Si tarda, el vino queda guardado como «pendiente de ficha» y
  la app completa la ficha y la nota cuando Winerim responde.
- Los datos de sabor se usan para mostrar la afinidad. No se guardan como datos sensoriales de la persona ni entrenan
  su perfil hasta que valore el vino, como hoy con la tienda.
