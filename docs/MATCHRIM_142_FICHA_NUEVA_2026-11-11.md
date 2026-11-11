# Matchrim 142 · Ficha de vino nueva (11-nov-2026), primera entrega

Tras la ronda sobre la 141, Goiko pidió tomar el lenguaje visual de Vivino y recordó que Winerim ya tiene los datos.
Se recorrió Vivino en su iPhone con un runner XCUITest (solo mirar; capturas en `~/ClaudeCode/vivino-walk/ref/`).
Solo iOS; web, `main` y backend sin tocar.

## Qué lleva
- **WineSheet142:** botella grande y veredicto al lado; bodega, nombre, añada; guardar eligiendo dónde; «Por qué
  encaja» en una frase por rasgo con cara; datos con icono; barras de sabor de dos extremos con el vino y la persona;
  «Combina muy bien con»; «A qué sabe» y nota de cata; origen e historia; vinos parecidos con su nota, navegables.
- **Datos:** detalle del vino en la tienda pública de Winerim (`winerimDetail142`): maridajes, nota de cata, ficha
  rápida, historia, temperatura, grado y relacionados. Se lee una vez por vino; solo texto bien formado.
- **Guardar eligiendo dónde** (`NativeSaveChoice142`): Quiero probarlo / Ya lo he probado (con valoración) / Lo tengo
  en casa. No guarda datos de sabor ni entrena el perfil.
- **El bloque de Winerim** (iconos, barras, maridajes, nota) también en escaneo, Mis vinos y recomendaciones.
- **Fuera la página de Winerim enmarcada** (dejaba salir a toda la tienda).
- **Inicio** abre con el último escaneo.

## Pendiente (segunda entrega)
- Cabecera nueva también en la ficha del escaneo y en la de Mis vinos.
- Mis vinos con tarjetas y filtros en píldoras.
- Notas sobre la foto de la carta leyendo la foto en el iPhone.
- Pulgares «¿te gustó?» en la tarjeta del último escaneo.

## Comprobación
- Recorridos en simulador: 11 recorridos, 85/85. Los datos de prueba no traen fotos de botella.
- Checks: 197 más `ux142`. `check-matchrim-menu88` falla al leer evidencia externa en `~/Documents/Codex/...`
  (JSON vacío); no depende de estos cambios.
- QA nativa: candidate142-r1, r141-r144 en verde a la primera; archive142-r1 firmado.
- No probado en iPhone real.
