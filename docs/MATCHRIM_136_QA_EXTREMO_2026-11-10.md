# Matchrim 136 · Examen extremo de QA (10-nov)

Goiko: «quiero saber en que podemos trabajar las proximas 4 horas sin parar y que sea realmente un avance en todo esto y sobre todo quiero un examen de QA y de funcionamiento y de correccion extremo»

Antes de empezar se subió la 135 a TestFlight con su OK («Sí, sube la 135»). Apple confirmó la recepción.

Todo lo demás se ha hecho sin red real, sin cuentas reales y sin coste. No se ha hecho push y no se ha tocado la web ni el backend.

## Qué hay nuevo para probar

### 1. Batería E2E automática en el simulador (nueva y reutilizable)

**Cómo funciona.**
- Se maneja la app de verdad desde dentro, con el inspector de WebKit (`ios_webkit_debug_proxy`).
- Antes, los toques en el simulador fallaban; ahora cada recorrido se repite igual y deja capturas.
- La app corre con un backend simulado dentro del propio WebView:
  - un usuario sintético;
  - 24 vinos reales de Winerim en su bodega;
  - recomendaciones calculadas sobre 885 vinos reales;
  - búsqueda del catálogo emulada.
- Cualquier otra llamada externa se bloquea.
- El código de la app se recompila en 30 s y se prueba sin repetir la build nativa.

**Recorridos.** Son 10, con 65 comprobaciones, y al final pasan todos:

| Recorrido | Qué comprueba |
|---|---|
| Inicio y búsqueda | Recomendaciones con afinidad, «Ver todos», búsqueda sin tilde, sin conexión, vino inexistente, añadir a mano hasta guardarlo |
| Bodega | Valorar y cambiar la valoración (la ficha sigue abierta), favorito, guardar afinidad, gastar la última botella, eliminar (cancelar y aceptar) |
| Cerrar sesión | Menú de cuenta, Inicio y Bodega sin datos del usuario anterior, aiRIM limpio |
| Registro | Tres pasos, enlaces a términos y privacidad, que el formulario se conserve |
| Estrés | Doble toque en «Me he bebido una botella» y en «Me encanta»; fallo de red al valorar, al gastar botella y al eliminar; fallo de lectura y reintento |
| Bodega enorme | 524 vinos: carga en menos de 1 s, ficha en 82 ms, valorar en 47 ms, scroll completo |
| aiRIM sin servidor | Aviso claro; la pregunta no se pierde al cambiar de pestaña |
| Test de gusto | Confirmación al salir, guardado, perfil nuevo usado en Inicio |
| Arranque y sin red | Arranque en frío 1,9 s; sin red no echa al usuario; escanear sigue disponible; se recupera |
| Auditoría de pantallas | 23 rutas a texto máximo y a texto normal: desbordes, botones sin nombre, botones pequeños, inglés y texto roto |

### 2. Examen del motor de gusto

Se usaron los 6.283 vinos reales de Winerim y el motor de la app (v4).

**Pasa todas las propiedades:**
- el perfil siempre es válido, entre 0 y 5;
- el orden de los votos no cambia el resultado;
- un «Me encanta» nunca baja la afinidad de ese vino;
- un «No va» nunca la sube;
- se puede llegar a perfiles extremos;
- los datos corruptos se ignoran: valores fuera de rango, texto, nulos, fechas imposibles;
- calcula 1.000 valoraciones en 38 ms.

**Fallo encontrado y corregido.** Quien solo marca «No va» acababa con un perfil peor que el del test (error 0,71 → 1,00 con 40 votos), y la app le mostraba una confianza del 96 %.

| Escenario | Antes de 136 | Con 136 |
|---|---|---|
| Solo «No va», 40 votos: error del perfil (test 0,71) | 1,00 | 0,76 |
| Solo «No va», 40 votos: orden de recomendaciones (test 0,857) | 0,848 | 0,875 |
| Solo «No va»: confianza mostrada | 96 % | 40 % |
| Votos normales o mixtos | sin cambios | sin cambios (error 0,69 → 0,38) |

### 3. Repaso de checks del repositorio

- De los 204 checks que pasaban ayer, 188 siguen pasando.
- Los demás congelan a propósito ficheros que he cambiado:
  - textos sin tilde o en inglés;
  - el número de diálogos de Inicio;
  - la regla antigua del lote.
- Los he revisado uno a uno. Los dos que eran fallos reales (la foto del catálogo en «Guardar afinidad» y Privacidad sin propiedades) se corrigieron antes de la build.
- Check nuevo: `check-matchrim-qa136` (7/7).

## Fallos corregidos en la 136

**Bodega**
- «Guardar afinidad de hoy» no hacía nada útil en un vino que ya enseñaba su afinidad: volvía a buscarlo en el catálogo y, si no lo encontraba, decía «afinidad pendiente». Ahora usa la ficha verificada que ya tiene el vino.
- Si la bodega no cargaba por falta de red, los contadores decían «0 / 0 / 0» junto a «tus datos no se han borrado». Ahora se ocultan hasta que carga.

**Inicio y búsqueda**
- «Ver todos» (bajo tus recomendaciones) llevaba a «Elige vino en un restaurante». Ahora abre la lista completa: hasta 20 vinos del catálogo que aún no tienes, ordenados por afinidad.
- Sin conexión, el buscador solo ofrecía «Reintentar búsqueda». Ahora también ofrece añadir el vino a mano.

**Registro**
- Tocar «términos y condiciones» o «política de privacidad» no hacía nada dentro de la app, así que no se podían leer antes de aceptarlos. Ahora se abren en una hoja encima del formulario, y el formulario se conserva.

**Motor de gusto**
- Votos solo negativos: el límite y la confianza de la tabla anterior.

**Escaneo por lotes**
- Si la base de datos rechazaba un vino, los vinos siguientes de la foto no se guardaban nunca, porque reintentar volvía a chocar con el mismo. Ahora se guardan los demás y el aviso dice cuál falló.
- Pendiente de ayer, resuelto.

**aiRIM**
- Sin servidor, el aviso dice «Tu pregunta no se ha perdido», pero al cambiar de pestaña la pregunta desaparecía. Ahora se conserva.

**Textos y accesibilidad**
- El botón de cerrar de los diálogos se anunciaba en inglés («Close») con VoiceOver; ahora dice «Cerrar».
- Privacidad y Términos estaban escritos enteros sin tildes («Ultima actualizacion», «senal», «informacion»); ahora están corregidos. El contenido no cambia.
- «Sesion iniciada» → «Sesión iniciada».
- A texto máximo, el título «¿Dónde lo compraste?» se partía a mitad de palabra y quedaba tapado por la X.
- En Estilos de vino, «Hacer Test Matchrim» llevaba a aiRIM y «Explorar aiRIM» al test; además recargaban toda la app y se salían de la pantalla.
- Las pestañas de «Usar Matchrim» y «Estilos» medían 32 px de alto; ahora miden 44 px, el mínimo de Apple.
- A texto máximo, las palabras largas de los títulos se cortaban sin guion («restau…», «Elim…»). Ahora los títulos se parten por sílabas en castellano («res-taurante», «Eli-minar»). Botones y pestañas siguen partiendo por palabras enteras.

## Lo que se comprobó y estaba bien

- Doble toque en «Me he bebido una botella»: gasta solo una.
- Errores de red al valorar, al gastar botella y al eliminar: avisan y no fingen éxito.
- Cerrar sesión no deja datos del usuario anterior.
- Sin red, la sesión se mantiene, escanear sigue disponible y todas las pantallas acaban mostrando un aviso con «Reintentar» (tardan entre 7 y 9 s porque Supabase reintenta).
- El test de gusto pide confirmación al salir y guarda bien.
- No hay errores de JavaScript en ningún recorrido.

## Pendiente (no hecho)

**Backend**
- La búsqueda distingue tildes y orden de palabras.
- aiRIM no recuerda la conversación en el servidor.

**Universal Link**
- El enlace para recuperar la contraseña se abre en Safari.

**Escaneo sin sesión**
- Si escaneas sin sesión y entras desde el escáner, hay que repetir la foto.

**Decisiones tuyas**
- El teléfono es obligatorio en el registro pero no se guarda.
- Las fotos propias siguen en el iPhone después de cerrar sesión. Borrarlas haría que su dueño las perdiera para siempre, porque solo existen en ese móvil.
- Términos usa «la app Winerim» y «Volver a Winerim», y Privacidad «Volver a Matchrim». Unificar el nombre de la app cambia texto legal.

**Votos contradictorios**
- Muchos votos opuestos sobre vinos idénticos todavía mueven el perfil en ejes que no tienen nada que ver.
- Probé a neutralizar los pares opuestos: arregla el caso extremo, pero con usuarios realistas no cambia nada medible (0,956 frente a 0,955). Lo dejé fuera de la 136.

**Restaurante**
- Escanear una carta no está en la batería E2E, porque usa dos servicios con protocolo propio.

**iPhone real**
- No se ha probado en un iPhone real: ni la cámara, ni las fotos propias, ni la recuperación de contraseña.

## Dónde está todo

- Batería E2E: `~/ClaudeCode/matchrim-tarde-20261109/harness/`. `run-all.sh` lanza los recorridos; capturas y resultados en `../e2e/`.
- Examen del motor: `~/ClaudeCode/matchrim-tarde-20261109/engine/` (`exam.mts`, `neg.mts`).
- Commits locales, sin push:
  - 2533bdc: código de la 136 y check;
  - b3c5e6e: runners;
  - 4bb6660: guiones en títulos.
- La build es `candidate136-r2`, compilada desde 4bb6660.
- La batería E2E se pasó también sobre la app 136 compilada de verdad: 71/71.
