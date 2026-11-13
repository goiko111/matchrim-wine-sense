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
3. **«Compartir → Matchrim» desde la galería de fotos.** Extensión nativa (objetivo nuevo en Xcode, grupo de apps,
   perfil de firma). «Pegar foto» (151) cubre el caso mientras tanto.
4. **Extender el relieve** a la carta de vinos y al modo restaurante (Perfil, aiRIM y Escanear hechos en la 153). La ficha del vino ya tiene las tarjetas y el bloque de guardado.
5. **Vinos guardados sin tipo:** su botella dibujada sale gris hasta que la tienda responde.

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
