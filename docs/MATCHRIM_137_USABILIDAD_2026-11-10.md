# Matchrim 137 · Revisión de usabilidad como usuario (10-nov-2026)

Recorrido completo de la app en el simulador, con backend simulado y vinos reales de Winerim, poniéndome en cinco
situaciones: quien no sabe de vino y teme pedir, quien está en el restaurante con la carta delante, quien mira una
vitrina o un lineal, el aficionado con bodega y quien no quiere registrarse. Esta vez también se han podido ver las
pantallas de resultado del escaneo de botella y de carta de vinos, que antes no estaban cubiertas.

## Lo que he cambiado

### 1. Después de escanear, primero la respuesta
- **Una botella:** al terminar la lectura salía la foto con un «1» y el texto «Lote listo para revisar · Hay referencias
  disponibles para confirmar»; había que tocar «Revisar vinos» para saber algo. Ahora se abre sola la ficha con el
  veredicto («Puede encajar contigo · 67/100», por qué encaja y qué podría gustarte menos).
- **Varias botellas (vitrina):** se abre directamente la lista con la afinidad de cada vino, no la foto.
- **Guardar una botella** pedía volver «al lote» y pulsar «Confirmar 1 referencia». Ahora la ficha tiene «Guardar en Por
  probar» y lo guarda en un toque.
- **Carta de vinos:** «El que más encaja contigo de esta carta», con su precio, pasa a ser lo primero de la pantalla.
  Antes quedaba al final, detrás de avisos, tiempos de lectura y botones.
- Fuera jerga interna: «lote», «referencias», «regiones», «Escena», «lecturas», «Ficha original vinculada»,
  «Referencia propuesta», «Falta enlazar la ficha».

### 2. Las razones se entienden sin saber de vino
- Antes: «Sus taninos están cerca de tu gusto», incluso en cavas y blancos, y la misma frase en todos los vinos.
- Ahora describen el vino: «Es fresco, con la acidez viva que te gusta», «Es seco, como sueles preferir», «Es suave
  en boca, sin aspereza». El tanino bajo ya no sale como primera razón.
- Inicio muestra dos razones por vino y la nota en una pastilla junto al veredicto.

### 3. Inicio dice para qué sirve la app
- Sin perfil: «¿Te va a gustar ese vino?», tres accesos directos (Una botella · Carta de vinos · Comida y vino) y una
  tarjeta «Primero, tus gustos» que explica que el test son 20 preguntas sobre sabores conocidos, 2 minutos.
  Antes el test era un enlace gris al final («Conocer mis gustos»).
- Con perfil: los mismos tres accesos encima de las recomendaciones.

### 4. «En el restaurante» guiado en tres pasos
- Pestañas «1 · Platos», «2 · Vinos», «3 · Maridajes», con «4 platos» en vez de «4 lecturas».
- La foto se lee sola (antes había que pulsar «Analizar pendientes»). Los PDF siguen dejando elegir páginas.
- Botón «Siguiente» al final de cada paso; al llegar a Maridajes se calculan solos.
- Cada plato muestra nombre y precio. El texto literal de la carta y el origen quedan en «Ver el texto original».
- «Eliminar sesión» (parecía cerrar la cuenta) pasa a «Empezar de cero». Los filtros de precio, copa o botella quedan
  plegados bajo el botón principal.

### 5. Primeros pasos
- **Test:** la portada explica que no hace falta saber de vino.
- **aiRIM:** cuatro preguntas de ejemplo que se escriben al tocarlas.
- **Escanear:** cada opción responde a una pregunta («¿Me gustará?», «¿Cuál pido?», «¿Qué vino va con mi plato?»).
- **Perfil:** una frase con tus gustos antes de las barras.
- **Bodega:** título «¿Lo has probado? Dinos qué te pareció» sobre los botones de valoración.
- **Registro:** «Crear mi cuenta · Son tres pasos cortos».
- **Modo restaurante:** el código Matchrim no se leía (texto oscuro sobre fondo granate).

## Comprobación
- Batería de recorridos en simulador sobre la app con estos cambios: 11 recorridos, 83/83.
- Recorridos nuevos de escaneo de botella (una, varias, desconocida) y de carta de vinos: sin errores.
- Checks del repositorio: los mismos 189 que pasaban con la 136; check nuevo `check-matchrim-ux137.ts` 6/6.
- No probado en iPhone real. El backend de los recorridos es simulado.

## Lo que propongo y no he tocado

### Necesita decisión tuya
1. **Registro demasiado largo.** Para escanear hace falta cuenta, y la cuenta pide 9 campos en el primer paso (teléfono
   obligatorio, apellido, país, ciudad) y dos pasos más. Es el mayor freno de toda la app. Propuesta: email y
   contraseña; el resto, después y opcional.
2. **Buscar un vino lleva a un formulario.** Al elegir un resultado se abre «Añadir vino» con diez campos. Quien busca
   «Viña Ardanza» quiere saber si le gustará, no dar de alta una botella. Debería abrir la misma ficha con afinidad
   que las recomendaciones.
3. **Pestaña «Bodega».** La pantalla se llama «Mis vinos» y mucha gente no tiene bodega. Propongo «Mis vinos» también
   en la barra. No lo he cambiado porque las pruebas nativas dependen de ese nombre.
4. **Veredictos más directos.** «Es una opción para explorar» no responde a «¿me gustará?». Propuesta: «Muy de tu
   estilo», «Probablemente te guste», «Puede que sí, puede que no», «No es tu estilo».
5. **Aviso de privacidad del escáner.** Nombra Supabase, OpenAI y Apple Vision. Conviene una versión corta con el
   detalle en un enlace.

### Necesita backend
6. **Maridajes sin tus gustos.** La pantalla de restaurante dice qué vino va con el plato, pero no si te gustará a ti.
   Lo ideal es una sola lista que combine las dos cosas.
7. **Vino encontrado en la tienda pública de Winerim sin datos de sabor.** En ese caso la app dice «faltan datos de
   sabor» y no da afinidad. No he podido medir sin red con qué frecuencia ocurre.
8. **Nota guardada con texto técnico.** Al guardar desde el escáner, la nota del vino incluye «ficha de catálogo
   106018; no es una probabilidad de que te guste».

### Estética
9. **Perfil** conserva el diseño antiguo (tarjetas pastel, emoji, «RANGO WINERIM · Pot. Ac. Dul.») y mide siete
   pantallas. Merece rehacerse con el estilo de Inicio.
10. **Fotos de botella.** Cuando falta la foto sale un recuadro gris «Sin foto». Una silueta de botella con el color
    del tipo de vino se acercaría más a Vivino.
