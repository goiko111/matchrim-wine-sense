# Matchrim 157 · Test con fotos, mejoras de diseño y vídeo de la 156 (14-nov-2026)

Origen: respuesta del propietario a las propuestas de diseño («C, consigue tú todas», avance automático, OK a las
seis ideas, «5 OK consigue tú las imágenes») y su vídeo de la 156 (sin voz).

## Test de paladar
- **Veinte fotos a sangre** (`QuizPhoto157`, `src/assets/quiz157/`): la foto ocupa media pantalla con el progreso
  y la pregunta encima. Trece vienen del test de la web y siete son nuevas de bancos de licencia libre; origen y
  enlaces en `docs/MATCHRIM_157_FOTOS.md`.
- **Avance automático:** tocar una respuesta la marca un instante y pasa a la siguiente; la última lleva al perfil.
  «Anterior» sigue, y una pregunta ya respondida muestra «Siguiente» para no tener que responder otra vez.

## Las seis ideas
1. **Foto real en Mis vinos.** Ya existía para los vinos guardados desde la lista del escáner. Faltaba al guardar
   desde la ficha del escáner («Ya lo he probado», «Lo tengo en casa») y al conservar un vino que Winerim no
   tiene: ahora también guardan la foto de la etiqueta (solo en el teléfono, no se sube).
2. **Botella y nota arriba.** Ya estaba en las dos fichas. Añadido: la ficha del vino guardado muestra siempre la
   botella (dibujada si no hay foto).
3. **Por qué, por partes.** Nuevo bloque «Lo que ya has probado»: cómo valoraste otros vinos de la misma zona y de
   la misma uva. Solo con tus valoraciones y a partir de dos vinos.
4. **Inicio con tu último vino.** Ya existía («Tu último escaneo» con «¿Te gustó?»). Sin cambios.
5. **«A qué sabe» con imágenes.** Los sabores que nombra la nota de cata de Winerim salen como tarjetas con foto
   (18 familias; diez fotos compartidas con el test y ocho nuevas). Solo lo que dice la nota; «sin madera» no
   enseña madera.
6. **Valorar desde la lista.** Cada vino sin valorar lleva tres botones en su fila.

## Del vídeo de la 156
- **Candidatos sin relación («La Nine»: 13 y 17 vinos).** Solo se proponen los vinos que la etiqueta respalda
  (todas las palabras del nombre, o la mayoría de nombre y bodega). Si ninguno, primero sale «No vemos tu vino
  entre los de Winerim» con el guardado, y los demás quedan plegados en «Ver vinos parecidos».
- **PSI y Chivite La Zorrera se quedaban en «Pendiente» aunque Winerim los tiene.** PSI porque la etiqueta no da
  bodega; Chivite porque la etiqueta dice «J. Chivite Family Estates» y la tienda «Chivite». Corregidos ambos.

## Sin hacer
- «Pedir a Winerim que añada este vino» sigue abriendo el correo: depende de desarrollo.
- En «Varias botellas», para guardar un vino hay que volver a la lista.
- Aviso de contraetiqueta; valoración intermedia «Me gusta» (servidor).

## Comprobación
`check-matchrim-ux157.ts` 7/7; barrido sin fallos nuevos; E2E 85/85 en simulador; test completo visto en simulador
con avance automático; valoración desde la lista comprobada contra la base simulada. No probado en iPhone real.
