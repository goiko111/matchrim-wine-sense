# Matchrim · Pendientes para más adelante (13-nov-2026)

Lista única de lo que queda abierto tras subir la build 151. Nada de esto está hecho.

## Necesita decisión de Goiko (cambio de servidor)
1. **Valoración intermedia «Me gusta»** entre «Me encanta» y «Correcto» (pedida por su mujer, 12-nov). Orden obligado:
   migración que admita un cuarto valor (`like`) en `user_wines.rating`; peso intermedio en el aprendizaje del perfil,
   en la app y en las funciones del servidor (propuesta 0,6, hoy 1 · 0,25 · −0,8); después la app, con la cuarta
   opción en los tres sitios donde se valora. Detalle en `MATCHRIM_151_SIGUIENTE_PASO_2026-11-13.md`.
2. **Propuestas de servidor ya preparadas y sin aplicar** («del cambio de servidor ya hablaremos»): respuestas de
   aiRIM, correo de confirmación y el resto de `2026-11-11-PROPUESTAS-BACKEND.md` y `TEXTO_PARA_DESARROLLO_2026-11-12.md`
   (en ~/ClaudeCode/matchrim-tarde-20261109).

## Desarrollo nuevo
3. (Hecho en la 155, pendiente de subir y de probar en iPhone) **«Compartir → Matchrim» desde la galería de fotos.** Extensión nativa (objetivo nuevo en Xcode, grupo de apps,
   perfil de firma). «Pegar foto» (151) cubre el caso mientras tanto.
4. (Hecho en la 154) Relieve en la carta de vinos y el modo restaurante. La ficha del vino ya tiene las tarjetas y el bloque de guardado.
5. (Hecho en la 154) Las botellas dibujadas toman color del nombre, las uvas o la última respuesta de la tienda.

## Sin comprobar en un iPhone real
6. Todo lo de las builds 147 a 151 solo está probado en simulador.
7. La botella tumbada (150) de principio a fin con la tienda real, y qué leyó de verdad el iPhone en el vídeo.
8. «Pegar foto» en el teléfono: falló en la 151; la 152 lo lee desde la parte nativa (probado en simulador, falta el iPhone).
8b. (Hecho en la 153) El bloque de guardar de la ficha de escaneo va bajo el veredicto.
9. Que la 151 aparezca para instalar en TestFlight (Apple confirmó la recepción, nada más).

## Deuda de pruebas
10. El barrido de checks arrastra 15 fallos que ya estaban antes de la 150 (lista en
    ~/ClaudeCode/matchrim-tarde-20261109/rerun151/summary.tsv); `check-matchrim-menu88` no puede leer un archivo de
    evidencia en ~/Documents.

## Esperando respuesta
11. La opinión de Goiko y de su mujer sobre la 150 y la 151 en el teléfono: si el relieve convence y si ahora se ve
    el paso de guardar y valorar.

## Añadido el 14-nov (tras el vídeo de la 155)
12. Filtrar los candidatos del escáner que solo comparten palabras comunes con la etiqueta (caso «La Nine»: 20 vinos «Jean Baptiste»).
13. Pedir a Winerim desde la app un vino que no está: alcance en `MATCHRIM_ALCANCE_VINO_NO_ENCONTRADO_2026-11-14.md`, pendiente de enviar a desarrollo y de su respuesta.
14. Aviso «prueba con la contraetiqueta» cuando la etiqueta delantera no tiene texto útil.
15. Conectar AgentMail en esta sesión (o seguir pasando los mensajes por Codex).

## Actualizado el 14-nov (157)
- Hecho en la 157: punto 12 (candidatos sin respaldo de la etiqueta, plegados) y punto 15 (AgentMail conectado; alcance enviado a desarrollo).
16. En «Varias botellas», guardar un vino desde su ficha sin volver a la lista.
17. Respuesta de desarrollo al alcance del vino no encontrado (hilo AgentMail «Matchrim iOS | Pedir a Winerim un vino que no está en la tienda»).

## Actualizado el 19-nov (158)
- Hecho en la 158: punto 14 (aviso de contraetiqueta), punto 16 (guardar desde la ficha en «Varias botellas»),
  recorrido guiado y «Primeros pasos» en el Inicio. Detalle en `MATCHRIM_158_GUIA_Y_PENDIENTES_2026-11-19.md`.
- Enviado a desarrollo el 19-nov: respuesta sobre la búsqueda por lotes, velocidad y lectura de cartas. La búsqueda
  simple ha bajado a 1,4–2,0 s.
18. Respuesta de desarrollo a los dos hilos de AgentMail (14-nov y 19-nov). Lo revisa la tarea programada
    `matchrim-agentmail-buzon`.
19. Antes de publicar en el App Store: compilar con el Xcode que exija Apple (hoy el Mac tiene Xcode 16.4).

## Actualizado el 19-nov (159 y 160)
- Hecho en la 159: bienvenida con fotos y preguntas de intención. En la rama, sin build (160): búsqueda por lotes y
  lectura del precio habitual; pedido a desarrollo el precio en el lote. Detalle en `MATCHRIM_160_LOTE_2026-11-19.md`.
20. Que las respuestas de la bienvenida («para qué quieres la app», `intent159`) ordenen el Inicio: hoy se guardan
    pero no cambian nada. Propuesto el 19-nov; el propietario dijo «Guárdalo como cambio pendiente». No hacerlo
    hasta que lo pida. Iría en la 160.
21. Build 160 cuando desarrollo publique el lote: medirlo contra el servicio real antes de subirla.

## Actualizado el 20-nov (vídeo de la 159)
- Arreglado en la rama: guardar sin sesión, guardar en «Varias botellas» los vinos con nota estimada, aviso
  contradictorio, miniaturas, búsqueda de PSI. Detalle y lista de lo no hecho en `MATCHRIM_161_VIDEO_159_2026-11-20.md`.
22. Rediseños pedidos en el vídeo: recorrido (fotos e interacción), perfil, pantalla de acceso, «¿Dónde lo tomaste?»
    con búsqueda de restaurante, fotos en «Combina con», lista de la carta progresiva, guardar la carta con su restaurante.

## Actualizado el 20-nov (162, «Esto hay que hacerlo»)
- Hecho en la rama, sin build: punto 22 entero (recorrido con trozos de la app y deslizar, perfil, acceso, «¿Dónde lo
  tomaste?» con buscador de Apple, fotos en «Combina con», foto a la vista en la hoja, cartas guardadas en el
  teléfono) y la búsqueda tolerante de la carta (6 de 9 líneas «no encontradas» ya salen). Detalle en
  `MATCHRIM_162_REDISENOS_2026-11-20.md`.
23. Pedir a desarrollo búsqueda tolerante en el servidor (erratas, bodega + uva): «JULIAN», «LA MAR» y «NAVA REAL»
    de la carta del cliente siguen sin salir. Sin enviar: necesita que Goiko lo pida.
24. Cartas guardadas entre teléfonos y enlazadas con la carta del restaurante en Winerim: necesita servidor.
25. La lectura completa de la carta llega de una vez (medio minuto): que el servidor la entregue por partes.
26. Hecho con un vino (añadidos «cuándo beberlo» y la clasificación); repetir con una muestra amplia.
