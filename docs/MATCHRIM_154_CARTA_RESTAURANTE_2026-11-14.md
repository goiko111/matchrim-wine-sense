# Matchrim 154 · Carta de vinos, restaurante y botellas con color (14-nov-2026)

Goiko, mientras prueba la 153: «¿puedes ir trabajando en esto?» (los cuatro puntos de «Diseño y desarrollo»).

## Hecho en la 154
- **Carta de vinos:** «El que más encaja contigo de esta carta» es el único bloque oscuro, con su nota en una etiqueta
  blanca; cada vino de la lista lleva su nota en etiqueta de color (verde, ámbar, gris) marcada como estimación (≈).
- **Modo restaurante:** tarjetas con sombra en vez de borde; la banda del maridaje en verde («Muy buena pareja»),
  ámbar («Puede funcionar») o gris; título de la pantalla como en el resto.
- **Botellas grises:** un vino guardado sin foto dibuja su botella en el color que dicen su nombre («Rosado», «Brut»,
  «Reserva»…) o sus uvas, o el que dijo la tienda la última vez (se recuerda en el teléfono, 300 vinos como mucho).
  Sin pistas sigue gris. No se guarda nada con el vino ni se usa para la afinidad.

## Medido
- Búsqueda simple de la tienda, 14-nov: 3,6–4,3 s en cinco búsquedas nuevas; 0,4 s una repetida. La mejora que
  anunció desarrollo (~0,5 s) no está desplegada. El escáner por lotes sigue esperando a desarrollo.

## No empezado: «Compartir → Matchrim»
Necesita un objetivo nuevo en Xcode con su propio identificador (`wine.matchrim.app.<algo>`) y un grupo de apps para
pasar la foto a la app. Con la firma automática Xcode crearía ambos en la cuenta de Apple Developer al compilar.
Además hay que adaptar los scripts de preparación, compilación y archivo. Pendiente del OK de Goiko.

## Comprobación
- `check-matchrim-ux154.ts` 9/9; barrido con los mismos 15 fallos de antes; E2E 85/85.
- candidate154-r1: prepare, compile, 4 pruebas nativas (r193–r196) y archivo firmado, PASS.
- No probado en iPhone real.
