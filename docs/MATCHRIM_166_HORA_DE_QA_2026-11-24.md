# Matchrim 166 — una hora como alguien que no sabe de vino (24-nov-2026)

Encargo del propietario: una hora de QA recorriendo la app como quien tiene la carta delante y no sabe de vino,
arreglando lo que frene. Sin build ni subida: todo queda en la rama de trabajo, comprobado en el simulador.

## 1. Recorrido desde cero (sin test, sin vinos)

Medido en el simulador con la lectura del servidor retrasada a 30 s, como la real:

- Inicio → Escanear → Carta de vinos → aviso de privacidad → foto → «Analizar la carta»: 6 toques.
- Quien no ha hecho el test esperaba los 30 s y recibía: su propia foto ocupando la primera pantalla, la frase
  «Haz el test de paladar para saber si te gustará» repetida en los 8 vinos, y dos frases técnicas («No hay un
  perfil guardado para esta cuenta; afinidad pendiente», «Afinidad pendiente: perfil no disponible»).

Arreglado:

1. **Antes de la foto.** La pantalla de la carta avisa: «Aún no has hecho el test de paladar. Podemos leer la carta,
   pero no decirte cuál te gustará», con el botón «Hacer el test · 2 min». Solo sale cuando falta el test.
2. **Después de leer.** Un solo bloque arriba, «Falta tu test de paladar», con el mismo botón y la indicación de
   guardar antes la carta. La foto queda plegada en «Ver carta». Las filas muestran nombre y precio, sin frase repetida.
3. **Sin jerga.** Las dos frases técnicas ya no salen en la app.

## 2. Letra de accesibilidad al máximo

Pantallas de la 164 medidas con la letra más grande del iPhone (49,9 px de base): ancho, texto cortado, botones de
menos de 44 pt, bloques montados y columnas demasiado estrechas.

- **Fallo encontrado y arreglado:** en la ficha de Mis vinos, «¿Cambió en la copa?» quedaba en 166 pt de ancho y
  partía las palabras por sílabas. La ficha sumaba tres márgenes medidos en tamaños de letra (50+50+37 pt por lado).
  Ahora esos márgenes son fijos con letra grande y el texto baja bajo el icono.
- Sin fallos medidos: frase del perfil, «Tu mapa del vino», estilo, juego de aromas, «De dónde viene».
- Visto y no tocado: en la ficha abierta desde la búsqueda, la cabecera fija ocupa mucho alto con letra máxima.

## 3. «Dale tiempo» donde se elige

El consejo solo salía al volver a escanear la misma etiqueta. Ahora sale también en la ficha de un vino de la carta y
en la ficha de la búsqueda, cuando ese vino (mismo nombre y bodega, aunque sea otra añada) tiene nota de copa y todas
las notas guardadas coinciden. `evolutionFor166`, `EvolutionAdvice166`.

## 4. La espera de la foto de carta

La espera ya enseñaba los vinos según los lee el iPhone (145/162). Lo que faltaba:

- La vista previa preguntaba cada línea sin su sección: ahora lleva «blanco/tinto/rosado/espumoso» del título bajo el
  que está (solo en cartas de una columna), para que el blanco de una bodega no salga con la nota de su tinto.
- Una bodega con varios vinos se resuelve por el precio de la carta, como hace la lista terminada.
- Sin test, la vista previa ya no promete notas que no van a llegar.

No comprobado en el simulador con vinos reales: su copia de pruebas no tiene red exterior; las notas de la vista
previa se han comprobado por código (`check-matchrim-ux166.ts`).

## 5. Búsqueda a mano

Medido el 24-nov-2026 contra la tienda pública con 30 búsquedas, erratas incluidas (`scripts/measure-matchrim-search166.ts`):
el segundo intento de la app no añadió ningún vino que el servidor no diera ya en 29, y en la otra («lalier r-20»)
solo añadió otros vinos de la misma bodega; costaba entre 1 y 5 llamadas más cuando había menos de 8 resultados.
Quitado: la búsqueda a mano hace una sola llamada. Una errata en palabra corta («tera gauda») no la encontraba ni
antes ni ahora.

## Comprobado

- `check-matchrim-ux166.ts` 4/4; siguen pasando ux165, ux164, ux163, ux162, ux145–147, search162, batch160; `tsc` limpio.
- Simulador (compile165-r1 con la web nueva): recorridos j02–j12 85/85, ux166 13/13 (también con letra máxima),
  ux164 16, ux163 20, ux162 17, ux162b 8, ux161 7.
- La prueba de «ondare milenium» en el simulador usaba la respuesta grabada del servidor antiguo (vacía) y dependía
  del segundo intento; ahora usa la respuesta real del 24-nov-2026 (`store-snapshot166.json` en el arnés).

## 25-nov-2026 — los tres cabos sueltos (encargo del propietario: «resuelve esto… y prepara la build»)

1. **La carta vuelve sola tras el test.** Al pulsar «Hacer el test» desde una carta ya leída, sus líneas se guardan
   en el teléfono (solo esa cuenta, 6 horas, `pendingMenu166.ts`). Al terminar el test, el botón principal es «Ver mi
   carta con sus notas» y abre esa misma carta, ya con notas y con «El que más encaja contigo». La copia se borra al
   abrirla. Ya no hace falta guardarla antes ni repetir la foto. Desde el aviso de antes de la foto, el test vuelve a
   la pantalla de la carta.
2. **Avisos de «falta el test» con letra máxima.** Medidos a 50 px de base (relanzando la app: una recarga perdía el
   tamaño y la primera medida no valía): caben, sin texto cortado ni botones bajos.
3. **Cabecera de la ficha de la búsqueda con letra máxima.** «Volver a la búsqueda» ocupaba cuatro líneas de una
   barra que no se desplaza (146 pt de 956). Con letra grande queda la flecha sola (el texto sigue para VoiceOver) y
   medidas fijas: 53 pt.

Simulador (compile165-r1 con la web nueva): j02–j12 85/85, ux166 13, ux166b 12 (también con letra máxima), ux164 16,
ux163 20, ux162 17, ux162b 8, ux161 7. `check-matchrim-ux166.ts` 6/6.

## No comprobado / pendiente

- iPhone real.
- La vuelta a la carta se ha probado con cuenta iniciada; sin cuenta el test pide registrarse antes de guardar el perfil.
- Si pasan más de 6 horas entre la foto y el final del test, la carta ya no vuelve.

## Candidata 166 (25-nov-2026) — subida a TestFlight

- `candidate166-r1` en el commit `8111601`: preparación y compilación correctas; archivo `archive166-r1` firmado y verificado.
- QA nativo: r260 (añadas, normal), r264 (añadas, máxima), r262 (catálogo, normal) y r265 (catálogo, máxima) pasan.
- Dos pasadas con letra máxima fallaron antes y se repitieron: r261 (854 > 853) y r263 (856 > 853), «Control hidden
  behind the fixed footer» tras los 24 desplazamientos que la prueba se permite. Quedan anotadas en
  `qa-artifacts/testflight166-20261125/RELEASE.json`. Es la misma convergencia que r254 en la 164; la prueba no se ha tocado.
- Simulador sobre el binario compile166-r1: j02–j12 85/85, ux166 13, ux166b 12, ux164 16, ux163 20, ux162 17, ux162b 8, ux161 7.
- Subida a TestFlight el 25-nov-2026 con el sí expreso del propietario («Sí, súbela.»): `upload166-r1`, Apple acusó recibo
  (`appleUploadAcknowledged: true`). No comprobado que ya se pueda instalar (`testFlightInstallableConfirmed: false`). Solo beta interna.
