# Matchrim · Dos propuestas de backend para revisar (11-nov-2026)

Nada de esto está aplicado ni desplegado. Son dos parches guardados como archivos y este documento. La carpeta
`supabase/` del repositorio queda igual que estaba; quien lleve el backend decide si los aplica.

Archivos:

- `docs/backend-proposals/2026-11-11-airim-respuestas.patch` — propuesta 1.
- `docs/backend-proposals/2026-11-11-send-auth-email.patch` — propuesta 2, solo si se elige la vía de la función propia.
- Este documento.

Para aplicar un parche: `git apply docs/backend-proposals/<archivo>.patch` desde la raíz del repositorio. Ambos se
han comprobado con `git apply --check` sobre el estado actual de la rama.

---

## Propuesta 1 · Respuestas de aiRIM más útiles

### Resumen

aiRIM pasa a contestar primero qué pedir, luego por qué en relación con los gustos de la persona dichos con palabras,
y después dos o tres estilos, zonas o uvas concretas. Además empieza a usar los vinos que la persona ha guardado y
valorado, que el servidor ya leía pero no le pasaba al modelo. No cambia el modelo, ni el número de llamadas, ni lo
que la app instalada (136–138) envía o recibe.

### Qué pasa hoy (lo que he leído en el código)

- En el iPhone, la conversación libre envía la pregunta suelta más un texto de contexto con el perfil en cifras
  (potencia 2, acidez 4…) y siete reglas de cautela. Una de ellas dice «ofrece orientación general y condicional,
  separada del gusto personal». Con esa instrucción el modelo evita justo lo que pides: razonar con tus gustos.
- El servidor carga el perfil del test y **todos tus vinos guardados** para ajustar ese perfil, pero al modelo solo le
  pasa cinco cifras. Los nombres de los vinos que te gustaron o no te gustaron no llegan.
- Las instrucciones de base del servidor son seis líneas de tono («habla en primera persona», «usa plato»). No dicen
  cómo estructurar la respuesta ni a qué nivel hablar.
- Cada pregunta viaja sola: aiRIM no ve los mensajes anteriores de la conversación. Si preguntas «¿y si prefiero
  blanco?», no sabe de qué plato hablabas.
- La app revisa la respuesta antes de mostrarla. Si contiene un porcentaje, una nota tipo «8/10», o frases como
  «ideal para ti» o «encaja contigo», la descarta entera y muestra un texto fijo («Sin una ficha sensorial contrastada
  no puedo afirmar una afinidad personal…»). Es posible que la respuesta pobre que viste fuera ese texto fijo.

### Qué cambia con el parche

Un solo archivo: `supabase/functions/ai-wine-chat/index.ts`.

1. **Instrucciones de base ampliadas** (diez pautas). Respuesta directa primero; el porqué ligado a tus gustos en
   palabras; si el plato pide una cosa y tus gustos otra, decirlo y dar primero la opción que respeta tus gustos y
   después la clásica (el ejemplo del chuletón y el Rioja joven está escrito tal cual como modelo de razonamiento);
   dos o tres cosas concretas que pedir, con zona y uva; lenguaje llano por defecto y más detalle si la persona usa
   vocabulario de aficionado o lo pide; una sola frase final sobre lo que no puede saber (la carta, el precio, esa
   botella concreta); unas 180 palabras como máximo salvo que se pida más.
2. **El perfil también en palabras.** Además de las cifras, el servidor añade una línea como «le suelen gustar: vinos
   ligeros; frescura y acidez viva; vinos secos; poco tanino; mucha fruta», y pide no repetir las cifras.
3. **Historial de vinos.** De los vinos que el servidor ya lee, pasa al modelo una lista corta: hasta 6 que te
   encantaron, 3 correctos, 5 que no te gustaron y 3 guardados sin valorar (nombre, bodega y zona, los más recientes).
   No hay ninguna consulta nueva a la base de datos.
4. **Se aclara la regla de cautela.** Las cautelas siguen valiendo para botellas concretas (no puntuar, no
   certificar). Se añade que no impiden razonar por estilos, zonas y uvas con tu perfil, que es lo que se espera.
5. **Sin botellas inventadas.** Puede nombrar zonas, denominaciones, uvas y estilos. No debe inventar marcas, añadas,
   precios, premios ni disponibilidad. Si tú nombras un vino, habla de lo habitual en su zona y dice que es
   conocimiento general, no una ficha comprobada.
6. **Evita lo que la app descarta.** Se le pide no escribir porcentajes ni notas numéricas y no usar «ideal para ti» ni
   «encaja contigo», para que la respuesta no acabe sustituida por el texto fijo.
7. **Formato.** En la conversación libre, texto sin símbolos de formato (la app los mostraría como asteriscos). Si el
   mensaje pide un formato exacto —el flujo de restaurante pide JSON y las consultas guiadas de la web piden una
   plantilla— ese formato manda.
8. **Conversación previa (preparado, sin efecto hoy).** El servidor acepta un campo opcional `history` con los últimos
   mensajes. Las builds actuales no lo envían y todo sigue igual; ver «cambio en la app» más abajo.

### Qué no cambia

- El formato de respuesta: `{ success: true, response: "texto" }` en la conversación y el mismo flujo de texto en las
  consultas guiadas. Las builds 136–138 siguen funcionando sin tocar nada.
- El modelo, el límite de tokens, la temperatura y el número de llamadas de pago. La entrada crece unos 900 tokens
  por pregunta (instrucciones e historial); es un aumento pequeño de coste por consulta, no una llamada nueva.
- «Elegir para una ocasión» tiene su propio circuito y no se ha tocado.
- Las consultas guiadas de la **web** («Vino para un plato», etc.) siguen pidiendo «exactamente 3 vinos» con bodega y
  precio aproximado. Eso choca con «no inventar botellas», pero la web lee esa plantilla y cambiarla rompería su
  pantalla. Queda como decisión aparte.

### Qué necesita

- **De quien lleve el backend:** revisar y desplegar la función `ai-wine-chat`. Además, tres comprobaciones del
  repositorio tienen «congelado» este archivo (guardan su huella y fallan si cambia una letra):
  `scripts/check-matchrim-openai92-routing.ts`, `scripts/check-matchrim-special-moments95.ts` y
  `scripts/check-matchrim-native-airim99.ts`. Fallarán hasta que alguien revise el cambio y actualice esas huellas.
  Es el comportamiento esperado de esas guardas, no un error del parche.
- **De ti:** decidir si aceptas que los nombres de tus vinos valorados se envíen al proveedor de IA junto con la
  pregunta (hoy ya se envían las cifras del perfil y la pregunta). Conviene revisar si el texto de privacidad de la
  app lo cubre.

### Cambio en la app que recomiendo para la 139 (no lo he tocado)

- Archivo: `src/components/AiRimConversation.tsx`, en la llamada a `ai-wine-chat` (función `sendMessage`).
- Campo nuevo en el cuerpo: `history`, una lista con los últimos 6 mensajes anteriores a la pregunta, sin el de
  bienvenida: `[{ "role": "user" | "assistant", "text": "…" }]`. El servidor recorta cada texto a 1.500 caracteres
  y descarta cualquier otra cosa.
- En el mismo cambio convendría retirar del contexto del iPhone la frase «Ofrece orientación general y condicional…
  separada del gusto personal» (`src/utils/aiRimConsumer95.ts`), que contradice lo que ahora se pide. Ese archivo
  también está congelado por las guardas.
- Opcional: cuando la app descarta una respuesta, hoy muestra el texto fijo sin decir por qué. Un reintento
  automático o un mensaje más claro evitaría la sensación de «respuesta pobre».

### Parámetros que no he cambiado pero conviene valorar

- La conversación libre usa el nivel de modelo «rápido» y las consultas guiadas el de «calidad». Pasar la
  conversación al de calidad mejoraría el razonamiento, pero cuesta más por pregunta y tarda más. Es una decisión de
  coste; en el parche no se toca.

### Riesgos

- Un modelo no siempre obedece. Puede nombrar alguna bodega conocida o pasarse de largo. La app sigue teniendo su
  filtro, y las pautas reducen el riesgo, no lo eliminan.
- Se relaja una cautela anterior: antes aiRIM no ligaba el consejo a tus gustos; ahora sí, a nivel de estilos. Sigue
  sin puntuar ni certificar botellas.
- El perfil «en palabras» usa umbrales simples (3,5 o más es alto; 2 o menos es bajo). Un perfil muy plano dará una
  descripción poco expresiva («cuerpo medio, acidez moderada…»).
- Los nombres de vinos los escribió la persona. Se pasan recortados y marcados como datos, no como instrucciones.
- No lo he probado contra el modelo real: no he hecho ninguna llamada de red. He comprobado que el archivo es
  sintácticamente válido y que los textos nuevos se construyen bien con datos de ejemplo.

### Cómo comprobarlo después de aplicarlo

1. Con una cuenta que tenga test hecho y algún vino valorado, pregunta en el iPhone «¿Qué vino pido con un
   chuletón?». La respuesta debe empezar por qué pedir, mencionar tus gustos con palabras, dar dos o tres estilos o
   zonas concretas y cerrar con una frase sobre lo que no puede saber. Sin porcentajes, sin asteriscos.
2. Pregunta «No sé nada de vino, ¿qué pido con pescado a la plancha?» y luego algo con vocabulario técnico («busco un
   tinto de maceración carbónica para un chuletón»). El nivel debe cambiar.
3. Con una cuenta sin test: orientación general y una invitación breve a hacerlo.
4. Abre «Elegir con las cartas del restaurante» y pide un maridaje: debe seguir mostrando opciones (ese flujo espera
   JSON y no debe verse afectado).
5. Si en alguna prueba aparece el texto fijo «Sin una ficha sensorial contrastada…», la app ha descartado la
   respuesta; conviene anotar la pregunta para ajustar las pautas.

---

## Propuesta 2 · Correo de confirmación en castellano con marca Matchrim, y vuelta a la app

### Resumen

El correo de alta sale hoy con la plantilla por defecto en inglés y el enlace termina en la portada de la web, sin
ningún mensaje. Propongo dos pasos: ahora, pegar las plantillas en castellano y añadir en la web un aviso de «Cuenta
confirmada. Abre Matchrim e inicia sesión»; en la siguiente build de iOS, que el enlace abra directamente la app
(Universal Link). El primer paso no necesita build nueva y arregla también las 136–138.

### Qué pasa hoy (lo que he leído en el código)

- La app pide a Supabase que, tras confirmar, lleve a `<dominio web>/?confirmed=true`. En iOS el dominio sale de una
  variable de compilación (`VITE_AUTH_REDIRECT_ORIGIN`); si falta, usa `https://winerim.wine`.
- Ninguna pantalla de la web lee `?confirmed=true`. Por eso no aparece ningún mensaje.
- La app de iOS no tiene declarado ningún enlace propio: ni esquema de URL ni «Associated Domains». No existe archivo
  de permisos (entitlements) en `ios/App/App/`. Tampoco está instalado el complemento `@capacitor/app`, que es el que
  avisa a la app cuando se abre desde un enlace. El `AppDelegate` sí está preparado para pasar esos enlaces.
- La función `send-auth-email` existe pero nada en el repositorio la conecta. El remitente que viste
  («matchrim-wine-sense») es el nombre del proyecto, lo que indica que el correo lo manda el servicio por defecto.

### (a) El correo

Hay dos caminos. El primero es el rápido y el que recomiendo para empezar.

#### Camino 1 · Pegar las plantillas en el panel (Supabase → Authentication → Email Templates)

Usan las variables estándar de Supabase. `{{ .ConfirmationURL }}` es el enlace completo; no hay que tocarlo.

**Confirm signup — Asunto:**

```
Confirma tu email para empezar en Matchrim
```

**Confirm signup — Cuerpo (HTML):**

```html
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f4;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;">
      <tr><td style="padding:28px 28px 0 28px;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:bold;color:#7f1d1d;">Matchrim</td></tr>
      <tr><td style="padding:20px 28px 0 28px;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:bold;color:#1c1917;">Confirma tu email</td></tr>
      <tr><td style="padding:12px 28px 0 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:24px;color:#44403c;">Hola. Gracias por crear tu cuenta en Matchrim. Confirma que este email es tuyo y ya podrás iniciar sesión en la app.</td></tr>
      <tr><td align="center" style="padding:24px 28px 0 28px;">
        <a href="{{ .ConfirmationURL }}" style="display:inline-block;background-color:#7f1d1d;color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;padding:14px 28px;border-radius:8px;">Confirmar mi email</a>
      </td></tr>
      <tr><td style="padding:20px 28px 0 28px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#78716c;">Si el botón no funciona, copia este enlace y pégalo en tu navegador:<br><span style="word-break:break-all;color:#7f1d1d;">{{ .ConfirmationURL }}</span></td></tr>
      <tr><td style="padding:20px 28px 28px 28px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#78716c;">Si no has creado una cuenta en Matchrim, ignora este mensaje.</td></tr>
    </table>
  </td></tr>
</table>
```

**Reset password — Asunto:**

```
Cambia tu contraseña de Matchrim
```

**Reset password — Cuerpo (HTML):**

```html
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f4;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;">
      <tr><td style="padding:28px 28px 0 28px;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:bold;color:#7f1d1d;">Matchrim</td></tr>
      <tr><td style="padding:20px 28px 0 28px;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:bold;color:#1c1917;">Cambia tu contraseña</td></tr>
      <tr><td style="padding:12px 28px 0 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:24px;color:#44403c;">Hola. Hemos recibido una petición para cambiar la contraseña de tu cuenta de Matchrim. El enlace caduca pronto y solo sirve una vez.</td></tr>
      <tr><td align="center" style="padding:24px 28px 0 28px;">
        <a href="{{ .ConfirmationURL }}" style="display:inline-block;background-color:#7f1d1d;color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;padding:14px 28px;border-radius:8px;">Cambiar mi contraseña</a>
      </td></tr>
      <tr><td style="padding:20px 28px 0 28px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#78716c;">Si el botón no funciona, copia este enlace y pégalo en tu navegador:<br><span style="word-break:break-all;color:#7f1d1d;">{{ .ConfirmationURL }}</span></td></tr>
      <tr><td style="padding:20px 28px 28px 28px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#78716c;">Si no lo has pedido tú, ignora este mensaje: tu contraseña no cambia.</td></tr>
    </table>
  </td></tr>
</table>
```

**Versión solo texto.** El panel de Supabase solo admite el cuerpo HTML; no tiene un campo aparte para texto plano.
Por eso la plantilla lleva el enlace escrito a la vista bajo el botón: es lo que se lee si el botón no se muestra.
Si se usa el Camino 2, el correo sí sale con una versión de texto real. Estos son los textos, por si hacen falta:

```
Matchrim

Confirma tu email

Hola. Gracias por crear tu cuenta en Matchrim. Confirma que este email es tuyo y ya podrás iniciar sesión en la app.

Confirmar mi email:
{{ .ConfirmationURL }}

Si no has creado una cuenta en Matchrim, ignora este mensaje.
```

```
Matchrim

Cambia tu contraseña

Hola. Hemos recibido una petición para cambiar la contraseña de tu cuenta de Matchrim. El enlace caduca pronto y solo sirve una vez.

Cambiar mi contraseña:
{{ .ConfirmationURL }}

Si no lo has pedido tú, ignora este mensaje: tu contraseña no cambia.
```

**El remitente.** Las plantillas cambian el texto, no quién lo envía. Para que el correo llegue como
«Matchrim <…@dominio propio>» hay que configurar un servidor de correo propio (SMTP) en el panel de autenticación, con
un dominio verificado. El servicio por defecto, además, tiene un límite bajo de correos por hora.

#### Camino 2 · Usar la función `send-auth-email` (envío por Resend)

Sirve si se quiere controlar el correo desde el código y enviarlo con Resend. Qué hay que configurar:

- **Tipo de gancho:** en el panel de autenticación, «Auth Hooks» → **Send Email Hook**, de tipo HTTPS, apuntando a la
  dirección de la función `send-auth-email`. Al crearlo, el panel genera un secreto.
- **Secretos de la función (solo nombres):** `RESEND_API_KEY`, `SEND_EMAIL_HOOK_SECRET` (el que genera el panel) y,
  opcional, `MATCHRIM_AUTH_EMAIL_FROM` (remitente; si falta, el parche usa `Matchrim <noreply@winerim.com>`).
  `SUPABASE_URL` ya existe en las funciones.
- **Dominio del remitente verificado en Resend.** No he podido comprobar si `winerim.com` lo está.
- **Despliegue sin verificación de sesión:** quien llama a la función es el propio servicio de autenticación, no un
  usuario. Hay que añadir en `supabase/config.toml` `[functions.send-auth-email]` con `verify_jwt = false`. No lo he
  incluido en el parche para no tocar la configuración común.
- Con el gancho activo, las plantillas del panel dejan de usarse: todos los correos de autenticación pasan por la
  función.

**Fallos que veo en la función tal como está** (por eso va el parche `2026-11-11-send-auth-email.patch`):

1. **No comprueba quién la llama.** Cualquiera que conozca la dirección puede hacer que envíe correos a la dirección
   que quiera desde vuestro dominio. El parche verifica la firma que el servicio de autenticación añade a cada
   llamada y rechaza el resto. Es el fallo importante.
2. **Marca equivocada.** Asunto y cuerpo dicen «Winerim», y los correos que no son alta ni contraseña salen como
   «Liquid Intelligence». El parche los pone todos en castellano con marca Matchrim.
3. **El nombre de la persona se inserta en el HTML sin limpiar.** Alguien podría registrarse con un «nombre» que
   contenga HTML y este aparecería en el correo. El parche lo neutraliza.
4. **Si falta la dirección de vuelta, el enlace lleva la palabra «undefined».** El parche usa la dirección del sitio.
5. **No envía versión de texto**, y escribe el email de la persona en los registros. El parche añade el texto y deja
   de registrar el email.
6. El enlace incluía la clave pública del proyecto sin necesidad. No es un secreto, pero sobra; se quita.
7. El correo de «código de verificación» (reautenticación) no mostraba el código. Ahora sí.

Límite conocido del parche: el cambio de email con doble confirmación (un correo a la dirección antigua y otro a la
nueva) no está tratado de forma específica. Si esa opción está activada, hay que ampliarlo antes de usar el gancho.

No he podido ejecutar la función contra el servicio real. He comprobado que el archivo es válido y que el HTML y el
texto se generan bien con datos de ejemplo.

### (b) Volver a la app después de confirmar

#### Opción rápida · Aviso en la web (recomendada para ahora)

La persona pulsa el botón, se abre el navegador y ve: **«Cuenta confirmada. Abre Matchrim e inicia sesión.»**

- **Trabajo de web:** en la página de inicio, si la dirección trae `?confirmed=true`, mostrar ese aviso en lugar de
  la portada normal. Si la dirección trae un error (el enlace caducó o ya se usó, Supabase lo indica con
  `error_code=otp_expired`), mostrar «El enlace ha caducado. Pide otro desde la app.» Publicar la web.
- **Trabajo de panel:** pegar las plantillas del Camino 1 y comprobar que el dominio de la web está en la lista de
  direcciones de vuelta permitidas (Authentication → URL Configuration → Redirect URLs).
- **Trabajo de app:** ninguno. Funciona con las builds 136–138 ya instaladas.
- Límite: la persona tiene que volver a la app a mano e iniciar sesión. Es un paso de más, pero claro.

#### Opción completa · Universal Link (el enlace abre la app)

Un Universal Link es una dirección web normal que iOS abre directamente en la app si está instalada, y en el
navegador si no. Necesita un dominio vuestro y una build nueva; las 136–138 no lo tendrán.

Pasos y quién hace cada uno:

1. **Elegir el dominio (tú).** Uno que controléis y donde se pueda publicar un archivo en una ruta exacta, por
   ejemplo `matchrim.winerim.wine`. No he podido comprobar si el dominio `…lovable.app` permite servir ese archivo
   como exige Apple (sin redirecciones y como JSON); por eso recomiendo dominio propio.
2. **Publicar el archivo de asociación (web).** En `https://DOMINIO/.well-known/apple-app-site-association`, sin
   extensión, servido como `application/json` y sin redirecciones:

   ```json
   {
     "applinks": {
       "details": [
         {
           "appIDs": ["TEAMID.wine.matchrim.app"],
           "components": [
             { "/": "/auth/*", "comment": "Confirmación de email y cambio de contraseña" }
           ]
         }
       ]
     }
   }
   ```

   `TEAMID` es el identificador del equipo de Apple: está en developer.apple.com → Account → Membership details
   («Team ID»), y también en el proyecto de Xcode (Signing & Capabilities). Solo se interceptan las direcciones que
   empiezan por `/auth/`; el resto de la web sigue abriéndose en el navegador.
3. **Página web de respaldo (web).** Una página `/auth/confirm` que haga lo mismo que la app cuando esta no está
   instalada: validar el enlace y mostrar «Cuenta confirmada. Abre Matchrim e inicia sesión.» Debe publicarse
   **antes** de cambiar las plantillas del paso 6.
4. **Permiso en la app (app, build nueva).** Activar «Associated Domains» para `wine.matchrim.app` en el portal de
   Apple y regenerar el perfil de firma. Crear `ios/App/App/App.entitlements` con
   `com.apple.developer.associated-domains` = `applinks:DOMINIO` y enlazarlo en el proyecto de Xcode.
5. **Recibir el enlace en la app (app).** Instalar `@capacitor/app` (versión 7, la del resto de Capacitor) y añadir
   una escucha de `appUrlOpen`. Cuando llegue una dirección `/auth/confirm?token_hash=…&type=…`, la app llama a
   `supabase.auth.verifyOtp({ token_hash, type })`: con `type=email` deja la sesión iniciada y muestra «Cuenta
   confirmada»; con `type=recovery` abre la pantalla de nueva contraseña. Si falla, «El enlace ha caducado. Pide
   otro.»
6. **Cambiar el enlace de las plantillas (panel).** Para que iOS abra la app, el enlace del correo tiene que apuntar
   directamente a vuestro dominio. El enlace estándar (`{{ .ConfirmationURL }}`) apunta al dominio de Supabase y
   después redirige; iOS no abre la app de forma fiable tras una redirección. En las plantillas se sustituye por:
   - Alta: `https://DOMINIO/auth/confirm?token_hash={{ .TokenHash }}&type=email`
   - Contraseña: `https://DOMINIO/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`
   
   (Con el Camino 2, el mismo cambio se hace en la función.)
7. **Lista de direcciones permitidas (panel).** Añadir `https://DOMINIO/**` en Redirect URLs.

Riesgos de esta opción: iOS descarga el archivo de asociación al instalar o actualizar la app, así que un error en el
archivo no se ve hasta probar con una build real; hay que probar en un iPhone, no en simulador con datos falsos. Si
el paso 6 se hace antes de publicar la página del paso 3, los enlaces de las builds antiguas dejan de funcionar.

#### Qué recomiendo

Hacer las dos, en este orden:

1. **Ahora:** plantillas en castellano (Camino 1) y aviso en la web. Es trabajo de panel y de web, no depende de
   Apple ni de una build, y arregla lo que viste para todas las personas con la app actual.
2. **En la siguiente build de iOS:** Universal Link. Es la experiencia correcta (pulsas y estás dentro), pero depende
   de un dominio, del portal de Apple y de una build, y conviene probarla con calma.
3. **La función `send-auth-email`** solo si queréis remitente y contenido controlados desde el código. No es
   necesaria para tener el correo en castellano; si se activa, que sea con el parche, no como está.

### Qué necesita de ti o de quien lleve el backend

- Saber quién tiene acceso al panel de autenticación del proyecto. Varios documentos del repositorio indican que el
  backend está gestionado desde Lovable Cloud; si es así, las plantillas, el remitente y los ganchos pueden estar en
  la sección de correo de Lovable y no en un panel de Supabase directo. No he podido verificarlo.
- Decidir el dominio (para el Universal Link y para el remitente del correo).
- Confirmar el Team ID de Apple.

### Lo que no he podido determinar

- Por qué el enlace terminó en `matchrim-wine-sense.lovable.app`. Según el código, la app de iOS pide volver a
  `winerim.wine` salvo que la build se compilara con otra dirección, y no he encontrado esa variable en los scripts de
  compilación. Hay que mirar con qué valor se compiló la 138 y cuál es la «Site URL» del panel.
- Qué servicio envía hoy el correo y si hay un gancho o un SMTP ya configurado.

### Cómo comprobarlo después de aplicarlo

1. Crear una cuenta de prueba desde el iPhone. El correo debe llegar en castellano, con «Matchrim» y el botón
   «Confirmar mi email».
2. Pulsar el botón. Con la opción rápida: se abre la web con «Cuenta confirmada. Abre Matchrim e inicia sesión», y al
   iniciar sesión en la app, entra. Con Universal Link: se abre la app ya con la sesión iniciada.
3. Pulsar el mismo enlace por segunda vez: debe decir que ha caducado, no dejar una pantalla en blanco.
4. Pedir «he olvidado mi contraseña»: correo en castellano con «Cambiar mi contraseña», y el cambio funciona.
5. Si se usa la función: hacer una llamada a su dirección sin firma y comprobar que responde con rechazo (401) y no
   envía nada.
6. Abrir el correo en Gmail y en Mail de iPhone, en modo claro y oscuro, para ver que el botón se lee.
