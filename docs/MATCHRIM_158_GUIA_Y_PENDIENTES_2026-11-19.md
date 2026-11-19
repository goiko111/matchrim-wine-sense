# Matchrim 158 · Recorrido guiado, primeros pasos y pendientes de la 157 (19-nov-2026)

Origen: mensaje del propietario del 19-nov («HAZLO» a los pendientes de la app; «creo que nos falta como un
tutorial guiado de todo lo que la app puede hacer… para que nadie se pierda»).

## Recorrido guiado
- La app ya abría una guía la primera vez, pero solo en el Inicio antiguo; el Inicio actual (`NativeHome98`) no la
  mostraba. Eran seis pantallas de letra pequeña sobre «regiones» y «señales».
- Ahora, en el iPhone, son **seis pantallas cortas**, una idea por pantalla y en el orden en que se usa la app:
  para qué sirve, el test, la foto, la nota, guardar y valorar, el restaurante. La última lleva al test (sin
  perfil) o a escanear (con perfil).
- Se abre sola una vez a quien no ha hecho nada todavía (sin perfil, sin vinos y sin escaneos) y se reabre desde
  «Cómo funciona Matchrim», en el Inicio. Se conserva «Saltar guía» (las pruebas nativas lo usan).
- La web no cambia (`MatchrimQuickGuide` mantiene sus pasos fuera del iPhone).

## Primeros pasos (Inicio)
Tarjeta `NativeFirstSteps158` con cuatro pasos, cada uno con para qué sirve y a un toque: hacer el test, escanear
el primer vino, guardar un vino, valorar uno probado. Marca los hechos, desaparece cuando están los cuatro y se
puede ocultar (se recuerda solo en el teléfono).

## Varias botellas: guardar desde la ficha
Con varias botellas solo se podía guardar desde la lista, todas a la vez y todas en «Por probar». La ficha de cada
vino ofrece ahora los tres destinos (quiero probarlo, ya lo he probado, lo tengo en casa). Al guardar vuelve a la
lista, la fila queda marcada y ese vino sale del lote, de modo que «Guardar los N vinos» no lo duplica. Una sola
botella sigue igual. Un vino guardado así en «Por probar» no lleva la ficha enlazada que sí guarda el lote.

## Aviso de contraetiqueta
Si la etiqueta leída tiene menos de dos palabras útiles (`thinLabel158`: sin años, grados ni volumen) y no se
propone ningún vino, la hoja de candidatos dice «Esta etiqueta tiene muy poco texto. Prueba con la
contraetiqueta». Con una sola botella lleva el botón «Fotografiar la contraetiqueta»; con varias, solo el texto
(repetir la foto perdería las demás).

## Créditos
`docs/MATCHRIM_157_FOTOS.md` lleva ya el origen de las ocho fotos de sabores.

## Desarrollo (AgentMail)
- 19-nov: enviado a Enrique el hilo «Matchrim iOS | Búsqueda por lotes (respuesta), velocidad y lectura de cartas»
  (threadId 808edd09-54b9-48f6-9b17-bff17873f7d1): respuesta a sus tres preguntas del 13-nov sobre el lote,
  medición de la búsqueda, petición sobre `scan-wine-menu` y recordatorio del alcance del 14-nov.
- Medido el 19-nov: la búsqueda simple de la tienda tarda 1,4–2,0 s (era 3,6–4,3 s el 14-nov).
- Tarea programada `matchrim-agentmail-buzon` (laborables 9:40 y 17:40): solo lee y avisa; apunta en
  `~/ClaudeCode/matchrim-tarde-20261109/AGENTMAIL_BUZON.md`.

## Sin hacer
- «Pedir a Winerim que añada este vino» desde la app: depende de desarrollo.
- Valoración intermedia «Me gusta» y propuestas de servidor: decisión del propietario.
- La guía no enseña capturas reales de la app, solo iconos y las fotos del test.
