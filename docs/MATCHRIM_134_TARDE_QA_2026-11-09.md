# Matchrim 134 y 135 · QA de la tarde y arreglos (9-nov)

Goiko: «Necesito hacer pruebas en profundidad de la app. Puedes estar tu toda la tarde mejorando la app sin necesidad de que yo este?»

Todo se ha hecho sin red, sin cuentas reales y sin coste. No se ha subido nada, ni se ha hecho push, ni se ha tocado la web o el backend.

## Cómo se ha probado

1. **Batería completa de checks** (302 scripts offline).
   - 204 pasan.
   - Los 97 que fallaban ya antes de mis cambios son checks históricos:
     - congelan ficheros byte a byte;
     - necesitan una ruta de resultado como argumento;
     - o su comportamiento se cambió a propósito más tarde.
   - Ninguno indicaba una regresión real.
   - 11 no se ejecutaron porque pueden llamar a la red.
2. **Cinco revisiones de código independientes**, solo lectura, cada una sobre una parte de la app en iOS:
   - bodega;
   - perfil, test y aprendizaje;
   - escaneo de etiquetas;
   - restaurante, cartas, inicio y cuenta;
   - inicio de sesión y búsqueda en el catálogo.
   - Cada hallazgo se comprobó leyendo el código antes de corregirlo.
3. **Simulador con backend simulado** (nuevo).
   - La 133 compilada se instaló en el simulador con un usuario sintético y una base de datos emulada dentro de la app:
     - 24 vinos reales del catálogo de Winerim;
     - 16 de esos vinos valorados;
     - perfil del test.
   - Se bloquea cualquier llamada externa.
   - La bodega cargó con las afinidades calculadas.
   - La exploración manual se cortó porque los toques del simulador se registraban de forma irregular.
   - Queda como herramienta en `~/ClaudeCode/matchrim-tarde-20261109/harness/`.
4. **QA nativo de las builds 134 y 135** con los runners habituales: añada y catálogo, a tamaño de texto normal y máximo.

## Qué se ha arreglado en la 134

### Bodega

- **El fallo más grave:** al valorar, marcar favorito o guardar, toda la pantalla pasaba a un spinner. La ficha abierta se cerraba y la lista volvía arriba.
  - Ahora la lista y la ficha se mantienen durante la recarga.
- La afinidad ya no parpadea a «por calcular» en cada recarga, y el filtro «Alta afinidad» ya no se queda vacío un momento.
- Si el filtro no encuentra nada, la app lo dice y ofrece «Ver todos». Antes mostraba «Tu bodega empieza con la primera botella».
- **Nuevo:** botón «Me he bebido una botella» en la ficha de los vinos de «En bodega».
  - Descuenta una botella.
  - Con la última, el vino pasa a «Probados».
  - Antes, en iOS, una botella no se podía gastar nunca.
- Cerrar con la X la hoja de compra ya no borra el formulario que se estaba escribiendo.
- Al borrar un vino se borra también su foto propia del iPhone.
- La ficha muestra la foto propia; antes solo mostraba la del catálogo.
- VoiceOver:
  - cada fila lee añada, afinidad o valoración y botellas;
  - los botones de valoración dicen cuál está marcado.
- Los nombres de las secciones coinciden con las pestañas: «En bodega», «Por probar» y «Probados».
- «ABV» se sustituye por «vol.».

### Escaneo

- **Si fallaba o se cancelaba «Reanalizar», el lote ya no se podía guardar.** El botón «Confirmar» desaparecía. Ahora la región vuelve a como estaba y se puede guardar.
- «Reanalizar» ya no borra un vino confirmado en el modo de una etiqueta.
- La foto de toda la estantería ya no se guarda como foto propia de un vino.
- Elegir otra vez la misma foto de la galería vuelve a funcionar.
- **Cámara (código de la 133):**
  - un segundo toque en «Hacer foto» con la cámara abierta ya no abre el menú de archivos;
  - si iOS no llega a mostrar la cámara, el botón ya no queda bloqueado hasta reiniciar la app.

### Perfil, test y aprendizaje

- Quien responde todo igual sale «Intermedio / Equilibrada / Presente». Antes salía «Con cuerpo / Viva / Intensa».
- Un «No va» o un «Bien» sobre un vino que coincide exactamente con el perfil ahora sí enseña. Antes no movía nada.
- Un dulzor o tanino de 0 ya no sale marcado «fuera de rango» en estilos que empiezan en 0.
- El test se guarda antes de descargar recomendaciones.
  - Antes esperaba a bajar toda la tabla de vinos.
  - Si fallaba esa descarga, decía «No hemos podido confirmar el guardado» aunque el perfil sí se había guardado.
- Salir del test con respuestas pide confirmación.
- En Historial se oculta «Ver Detalles», que cambiaba el perfil activo sin avisar.

### Registro y cuenta

- Los errores del registro salen siempre en castellano.
- La contraseña exige 6 caracteres desde el primer paso.
- «Volver» lleva al paso anterior; antes salía del registro y se perdía lo escrito.
- Cerrar sesión sin cobertura ahora cierra la sesión en el iPhone. Antes fallaba y la sesión seguía abierta.
- La página de borrar cuenta:
  - muestra el estado en castellano;
  - respeta la barra de estado y la barra inferior.

### Restaurante y cartas

- Un plato o vino elegido que ya no está en la carta deja de estar seleccionado. Antes daba un error al combinar.
- «Eliminar sesión» también borra el presupuesto, la moneda y el servicio.
- Los precios salen con formato: «18,50 €» en lugar de «18.5 EUR».
- Se aceptan presupuestos y precios con coma («25,50»). Antes se ignoraban sin avisar.
- Una carta nueva empieza sin los filtros de la anterior.

### Otros

- Si alguien sin sesión elige un vino y luego inicia sesión, el vino sigue en el formulario.
- Tildes corregidas en siete pantallas.

## Qué añade la 135 (incluye todo lo de la 134)

- **Diálogos de confirmación en castellano.** Los del sistema (borrar un vino, eliminar la sesión del restaurante, enviar muchas páginas a la IA) salían con «Cancel» y «Ok» en inglés. Ahora usan «Cancelar» y «Eliminar», «Analizar» o «Continuar».
- **Nombres de sección iguales en toda la app.** Los avisos de guardado de la carta, del maridaje y del escaneo dicen «Por probar» o «Probados», como las pestañas, en lugar de «Quiero Probar» o «Ya Probados».
- **aiRIM recuerda la conversación** al ir a escanear o cambiar de pestaña y volver. Se guardan como máximo 40 mensajes durante esa sesión de la app.
- **Inicio de sesión:**
  - los errores salen en castellano («No hay conexión», «Espera 37 segundos antes de pedir otro enlace», etc.);
  - tras entrar, «Atrás» ya no rebota al login;
  - el destino se conserva al pasar por «¿Olvidaste tu contraseña?».
- **Búsqueda en el catálogo:**
  - si no encuentra el vino, ofrece «Añadir … a mano» con el nombre escrito;
  - «Cargar más referencias» se puede reintentar después de un fallo de red o una cancelación.
- **Botellas iguales en una foto:** si una de ellas lee la añada, esa botella representa al grupo, así que la añada ya no se pierde al guardar.
- **Fotos grandes de la galería:** se abren sin copiarlas a texto base64, así que gastan menos memoria.
- **Fecha de compra por defecto:** es la de hoy en hora local; antes, pasada la medianoche en España, proponía la de ayer.
- **El aviso «Tu etiqueta sigue aquí» era falso.** Si se inicia sesión desde el escáner, hay que repetir la foto, y ahora la app lo dice.

## Pruebas

- **Check de la 135:** `scripts/check-matchrim-batch135.ts`, 10/10.
- **Check nuevo:** `scripts/check-matchrim-tarde134.ts`, 10/10. Incluye pruebas de comportamiento de:
  - aprendizaje;
  - test;
  - cámara;
  - borrador sin sesión;
  - cierre de sesión (la web se comporta exactamente igual).
- **Checks del aprendizaje y del test:** 132 y 133 siguen pasando.
- **Repetición de los 204 checks que pasaban:** fallan 10. Todos son checks que:
  - congelan byte a byte `MyWines`, `AuthContext`, el registro o el escáner;
  - o fijan literalmente la etiqueta antigua de la fila de la bodega.
  - Es el cambio buscado, no una regresión.
- **Build 134:** compilación, QA nativo r93-r96 y archivo firmado: todo PASS.
- **Build 135:** compilación, QA nativo r97-r100 y archivo firmado: todo PASS. La evidencia valida con el publicador de la 135 (`scripts/distribute-matchrim135.mjs`), pero no se ha exportado ni subido.
- **menu88** se quedó colgado en la segunda pasada. No es un fallo de código: lee fotos de Documentos que iCloud ha descargado del disco, y la lectura espera la descarga. El código que prueba no ha cambiado.

## Lo que no se ha arreglado (siguiente tanda)

- Una referencia rechazada por la base de datos se reintenta sin fin. Habría que permitir quitarla del lote.
- Si alguien sin sesión escanea y pulsa «Buscar con mi cuenta», el escaneo se pierde al iniciar sesión. Ahora la app lo avisa, pero conservarlo requiere guardar el estado del escáner.
- El enlace del email para recuperar la contraseña se abre en Safari, no en la app. Haría falta un Universal Link.
- La búsqueda del catálogo distingue tildes y orden de palabras («vina tondonia» no encuentra «Viña Tondonia»). Se arregla en el backend.
- aiRIM no recuerda lo hablado al responder: cada pregunta va sola al servidor. Necesita cambios en el backend.
- El teléfono es obligatorio en el registro, pero no se guarda en ningún sitio. Es una decisión de producto.
- Las fotos propias y las cartas del restaurante se quedan en el iPhone al cerrar sesión. Solo son visibles para su dueño, pero ocupan sitio.
- El aprendizaje del servidor (chat aiRIM, maridaje) sigue en v2.

## Lo que no se ha podido probar

- **iPhone real:**
  - cámara;
  - fotos propias;
  - cierre de sesión sin cobertura;
  - VoiceOver real.
- **Con cuenta real:** valorar y ver cómo cambia el perfil. La lógica se ha probado con el código de la app, pero no en una sesión real.
