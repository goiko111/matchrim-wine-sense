# Matchrim 145 · Velocidad y fallos del vídeo de la 144 (12-nov-2026)

Primera entrega del goal fijado por el propietario el 12-nov («si construyela y hacemos todo esto tambien … pontelo
como un goal»). Lista viva del goal: `~/ClaudeCode/matchrim-tarde-20261109/GOAL_MATCHRIM_2026-11-12.md`.

## Lo medido en su vídeo de la 144
Carta: ~40 s hasta la lista y ~55 s hasta todos los números. Botella: ~48 s hasta los candidatos (y eran 18
Malvasías para un PSI). Búsqueda escrita: ~8 s. Cada consulta a la tienda pública de Winerim tarda 3,8–4,1 s en su
servidor (medido con cinco búsquedas el 12-nov); la app las hacía una detrás de otra y cada una leía hasta cuatro
páginas en fila, con un límite de 12 s que dejaba búsquedas «sin completar».

## Cambios
- **Botella.** Las búsquedas de una misma fase salen a la vez y las páginas de una búsqueda también
  (`candidateRecognition286`, `nativeGlobalCatalogue103`). Mismo resultado y mismo orden que antes.
- **Etiqueta, no fondo.** Solo cuentan las líneas que cruzan el centro de la foto (`labelLines145`); un nombre de
  tres letras («Psi 2023») se busca (`shortNames145`) y un símbolo leído al borde no entra en la búsqueda.
- **Carta.** Mientras el servidor lee (≈40 s), «Vista rápida» enseña en 1–2 s los vinos y precios que lee el propio
  iPhone y su estimación según responde Winerim (`MenuQuickPreview145`, `quickMenu145`). La lista completa la
  sustituye al llegar. No se guarda nada.
- **Caché en el teléfono.** Búsquedas y fichas de la tienda se guardan una semana (`storeDiskCache145`): la segunda
  vez abren al momento. Solo datos públicos de la tienda; sin precios ni existencias en las fichas.
- **Números en la foto de la carta.** En cartas apretadas el número se encoge al alto de línea y va justo detrás del
  nombre: uno por línea. Las líneas «uno de varios vinos» no llevan número en la foto.
- **Una nota por vino (decisión del propietario).** El tanino 0 no cuenta en blancos, rosados y espumosos en ningún
  sitio: `buildConsumerAffinity` aplica la regla que la estimación de tienda ya usaba. Lo guardado con cada vino no
  cambia; cambia lo que se muestra. Oráculos y sonda nativa actualizados (85 → 93 en el blanco de la QA).
- **Guardar.** Las tres opciones en la ficha del escaneo; un vino que ya tienes cambia de sitio en vez de
  guardarse dos veces.

## Comprobación
- `check-matchrim-ux145.ts` 6/6; barrido con los mismos fallos conocidos que la 143; E2E 85/85.
- Simulador con sus dos fotos reales: la carta enseña la vista rápida a los 1,6 s con sus 19 líneas y precios; el PSI
  lanza «Psi» y la línea de la D.O. a la vez y ninguna búsqueda sale del texto de fondo.
- No medido en iPhone real: los segundos reales dependen de Winerim (≈4 s por consulta).

## Lo que no cambia desde la app
Los ≈40 s de lectura de la carta en el servidor y los ≈4 s por consulta de Winerim. Petición a Winerim preparada
aparte (búsqueda rápida o por lotes).

## No incluido (siguientes entregas del goal)
Una sola cámara; pantalla «Lectura terminada» tras guardar en Por probar; rediseño de Perfil, aiRIM, test y modo
restaurante.
