# Matchrim 143 · Rediseño, segunda entrega (11-nov-2026)

Continúa la 142 (ficha de vino nueva). Solo iOS; web, `main` y backend sin tocar.

## Qué lleva
- **Inicio:** el último escaneo con «¿Lo has probado? ¿Te gustó?» y dos pulgares; guarda el vino en Probados con la valoración.
- **Mis vinos:** filtros en píldoras y vinos en tarjetas con chip de valoración o nota (verde desde 65).
- **Ficha de un vino guardado:** cabecera nueva (botella y valoración o nota grande), «Por qué encaja» en frases
  cuando la nota es una estimación, histórico de afinidad plegado en «Ver cómo ha cambiado tu afinidad».
- **Ficha del escaneo:** veredicto con número grande y porqué en frases.
- **Notas sobre la foto de la carta:** si el servidor no da posiciones fiables, el iPhone lee la página con Apple
  Vision (`recognizeLines`, método nuevo del plugin; `recognize` intacto) y cada vino toma la línea que imprime su
  nombre (`menuPositions143`). La foto se abre con las notas si al menos el 70 % de los vinos queda situado.

## Lo que conviene saber
- La lectura de la carta en el iPhone no se puede ejecutar en simulador: está comprobada la lógica y la compilación,
  no el resultado sobre una carta real (umbrales sin afinar con texto real).
- Primer cambio de código nativo de la serie; la QA nativa pasa sin cambios.
- Guardar con pulgar o como «Ya lo he probado» no entrena el perfil (sin datos de sabor verificados).

## Comprobación
- Recorridos en simulador: 11 recorridos, 85/85.
- Checks: 198 (incluye `ux143`; `menu139` con 24 grupos). `menu88` sigue fallando por evidencia externa.
- QA nativa: candidate143-r1, r145-r148 en verde a la primera; archive143-r1 firmado.
- No probado en iPhone real.
