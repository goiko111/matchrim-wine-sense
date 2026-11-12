# Matchrim 148 · aiRIM, modo restaurante y pendientes pequeños (12-nov-2026)

Cuarta entrega del goal. El propietario pidió «ponte con todo en marcha y no pares hasta tenerlo»; el rediseño del
test espera su elección de estilo de imágenes y los cambios de servidor quedan para hablar.

## Cambios
- **aiRIM** con el lenguaje de la ficha: cabecera suave, burbujas redondas con la marca de aiRIM, las preguntas de
  ejemplo como tarjetas, entrada redondeada. Mismos textos, mismas etiquetas de accesibilidad, misma lógica.
- **Modo restaurante** (iOS): fondo suave, los tres pasos como píldoras, platos, vinos y maridajes en tarjetas, el
  «Para ti» de cada maridaje en una franja verde cuando encaja. La web no cambia.
- **Inicio al instante.** Lo último que se mostró a cada persona se guarda una semana en el teléfono y sale sin
  esperar; la respuesta nueva lo sustituye.
- **Una botella: el escaneo termina con su ficha.** Al cerrar la ficha de un vino elegido de la lista (o enlazado por
  su etiqueta) se vuelve a la cámara. Un vino identificado a mano con «Corregir» conserva la página de resultado.
  Al guardar ya no parpadea «Lectura terminada».
- **Carta en «Varias botellas».** El iPhone lee la foto antes de enviar nada; si es una carta, pasa al lector de cartas.

## No incluido
- Rediseño del test de gustos (falta elegir estilo de imágenes: fotos uniformes, ilustraciones o sin imágenes).
- El parpadeo de medio segundo de la pantalla inicial tras «Usar foto» (es el regreso de la cámara de iOS).
- Cambios de servidor (respuestas de aiRIM, correo de confirmación, lectura de cartas).

## Comprobación
`check-matchrim-ux148.ts` 5/5; barrido con los fallos conocidos; E2E 85/85; aiRIM, restaurante e Inicio vistos en
simulador (Inicio muestra los vinos a los 0,6 s de abrir). No probado en iPhone real.
