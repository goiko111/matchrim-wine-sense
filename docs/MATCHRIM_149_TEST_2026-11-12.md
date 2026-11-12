# Matchrim 149 · Test de gustos con ilustraciones (12-nov-2026)

Última entrega de diseño del goal. El propietario eligió «B, ilustraciones» entre tres estilos para las imágenes
del test (fotos uniformes, ilustraciones planas dibujadas en la app, sin imágenes).

## Cambios (solo iOS)
- **Veinte ilustraciones planas** dibujadas dentro de la app (`QuizArt149`), una por pregunta, cada alimento sobre
  su color suave y todas con el mismo trazo. Sustituyen a las veinte fotos, que tenían cada una su luz y su
  encuadre. No se descarga nada. La web conserva sus fotos.
- **Pregunta:** línea de progreso a todo el ancho, la ilustración, la pregunta grande y centrada, y tres respuestas
  grandes con su icono (Me gusta · Me da igual · No me gusta); la elegida se rellena en granate.
- **Portada:** cuatro de los alimentos arriba y el botón redondeado.
- Las preguntas, las respuestas, su puntuación y el resultado no cambian.

## Comprobación
`check-matchrim-ux149.ts` 3/3; barrido con los fallos conocidos; E2E 85/85 (incluye el recorrido del test completo);
las veinte preguntas vistas en simulador. No probado en iPhone real.

## Estado del goal
Hecho en la app: velocidad (145), cámara única (146), Perfil (147), aiRIM y restaurante (148), test (149).
Fuera de la app, pendiente del propietario: pasar el texto a desarrollo y hablar los cambios de servidor.
