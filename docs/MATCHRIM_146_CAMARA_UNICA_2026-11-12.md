# Matchrim 146 · Una sola cámara y ajustes del vídeo de la 145 (12-nov-2026)

Segunda entrega del goal del 12-nov. El propietario grabó la 145 y respondió «Sí, a la 146» a meter los ajustes
junto con la cámara única.

## Lo medido en su vídeo de la 145 (margen ±2 s)
| Acción | 144 | 145 |
|---|---|---|
| Botella, hasta el candidato | ~48 s | ~8 s (y el vino correcto) |
| Carta, hasta ver algo útil | ~40 s | ~3 s (vista rápida) |
| Carta, lista completa | ~40 s | ~34 s |
| Búsqueda nueva | ~8 s | ~7 s |
| Misma búsqueda otra vez | ~8 s | casi al momento |

## Cambios
- **Una sola entrada.** Escanear muestra «Botella o carta» y «Comida y vino»; Inicio, dos accesos en vez de tres.
  La lectura en el iPhone viene elegida por defecto y es la que distingue una botella de una carta (144). El lector
  de cartas sigue en «Más formas de escanear» (varias fotos, PDF). «Varias botellas» sigue como opción.
- **Guardar desde la ficha cierra el escaneo.** También con «Quiero probarlo» se vuelve a la cámara, sin pasar por
  «Lectura terminada · Foto · Vinos (1) · Comparar».
- **Vista rápida.** Sin las líneas del pie de la carta (redes, web, teléfono); donde hay varios vinos de la bodega,
  el rango en gris; donde no hay nada, nada (antes una raya).
- **Números sobre la foto.** Un punto más grandes.
- **Sin aviso «Algunas búsquedas no se han completado»** cuando hay un vino en pantalla.
- **Inicio** ya no dice «Primero, tus gustos» mientras carga; **Escanear** dice «1 vino guardado» en vez de
  «1 referencia confirmada · 1 objetos · 0 dudosos».

## No incluido
- Cerrar el escaneo al pulsar «Cerrar» sin guardar: la QA nativa pulsa después la pestaña «Vinos (1)»; cambiarlo
  exige cambiar esa sonda.
- Guardar las recomendaciones de Inicio en el teléfono (solo se ha corregido el título mientras carga).
- En modo «Varias botellas» no se detecta una carta.

## Comprobación
`check-matchrim-ux146.ts` 4/4; barrido con los mismos fallos conocidos; E2E 85/85; en simulador, su foto de la
carta metida por la entrada única acaba en «Carta de vinos» sin elegir nada. No probado en iPhone real.
