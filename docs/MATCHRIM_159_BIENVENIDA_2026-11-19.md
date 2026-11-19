# Matchrim 159 · Bienvenida: preguntas previas, ejemplo, fotos y pausas del test (19-nov-2026)

Origen: el propietario vio el recorrido de bienvenida de otra app de vino (A to Wine, de aprendizaje) y pidió
«mete las cuatro en una 159».

1. **Dos preguntas en la portada del test** (`NativeIntent159`, `intent159`): para qué quieres Matchrim (restaurante,
   casa, regalo, curiosidad) y cuánta seguridad tienes al elegir. Un toque cada una y no son obligatorias. Se
   guardan solo en el teléfono; no van al servidor ni tocan el perfil. Hoy cambian el texto del paso «escanea tu
   primer vino» de «Primeros pasos» y, con «Poca», añaden una frase de ánimo. No cambian el Inicio ni las notas.
2. **Un vino de ejemplo en el recorrido** (pantalla «Entiende la nota»): tarjeta marcada «Ejemplo» con «Un rioja
   crianza», 86/100, «Muy de tu estilo» y dos motivos. No es un vino real ni una nota calculada.
3. **Fotos de situación** en el recorrido (brindis, tienda, casa, restaurante) en lugar de iconos. Cuatro fotos de
   Pexels con licencia gratuita; origen en `docs/MATCHRIM_157_FOTOS.md`.
4. **Dos pausas en el test** (`QuizBreak159`), tras la 7.ª y la 14.ª respuesta: dicen para qué sirven las respuestas
   y cuánto queda. No calculan nada a partir de las respuestas. Salen una vez por test.

## Comprobación
`check-matchrim-ux159.ts` 3/3; barrido con los mismos fallos que la 157 (dos checks de montaje actualizados:
`consumer95-native-recommendation` conoce `NativeFirstSteps158`, y los estados nuevos del test van tras los
anteriores); E2E 85/85, ux158 16/16 y ux159 7/7 en simulador. No probado en iPhone real.

## Sin hacer
- Las respuestas previas no reordenan el Inicio ni cambian la última pantalla del recorrido.
- Quien ya hizo el test solo ve las dos preguntas si lo repite.
