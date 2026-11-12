# Matchrim 150 · Relieve visual y botella tumbada (12-nov-2026)

Origen: vídeo de la 149 (botella de Vinea Noctis tumbada en un botellero) y el comentario de la mujer del
propietario: «la aplicación es muy plana, lo veo todo al mismo nivel, me cuesta diferenciar las cosas y tengo que
leerlo todo para saber qué es».

## Lo que enseña el vídeo
- La foto es de una botella tumbada: la etiqueta («VINEA NOCTIS») queda de lado. La app ofreció seis vinos que no
  tenían nada que ver (Fino Quinta, Quinta Apolonia, QS2…). El vino sí está en la tienda de Winerim (Valmadrigal,
  rosado, DO León, id 253967).
- Medido con el mismo lector del iPhone sobre el fotograma del vídeo: con la foto tal cual lee «VINEA NOCTIS» con
  confianza 0,50; girada un cuarto, con confianza 1,00. No se ha podido saber qué texto leyó el iPhone aquel día.
- Mientras buscaba, la hoja ya enseñaba una caja de búsqueda vacía, «Corregir», «Foto de la etiqueta», «Reanalizar»,
  «Descartar» y «Cerrar». Y preguntaba dos veces lo mismo («¿Cuál es tu vino?» y «¿Es alguno de estos?»).

## Cambios
### Botella tumbada
- `src/utils/labelTurn150.ts`: cuando la lectura dice poco o sus líneas van de arriba abajo, la misma foto se lee
  girada un cuarto a cada lado y gana la lectura con más texto; se conservan además las líneas que solo vio el otro
  giro (el lector no distingue «tumbada a la izquierda» de «a la derecha» y en uno de los dos cambia una letra).
  Una foto normal se lee una sola vez, como antes.

### Relieve (`src/components/Relief150.tsx`)
- Fondo cálido detrás de todas las pantallas de iOS y tarjetas blancas con sombra (antes blanco sobre blanco con
  una línea gris).
- La nota es una etiqueta de color con cuatro niveles (80 verde lleno, 65 verde claro, 45 ámbar, menos gris): se
  distingue sin leer. En Inicio, último escaneo, escaneos anteriores y Mis vinos.
- Donde no hay foto, una botella dibujada del color del vino (tinto, blanco, rosado, espumoso, generoso, dulce) en
  vez del recuadro gris «Sin foto». Un punto del mismo color junto al tipo.
- Inicio: «Botella o carta» es la única puerta rellena; títulos de sección más grandes; buscador redondeado.
- Escanear: «Una etiqueta / Varias botellas» es un selector sobre pista gris; «Hacer foto» es el único botón lleno y
  «Elegir de galería» un enlace. Antes eran tres bloques granates seguidos.
- Candidatos: mientras busca solo se ven la espera y «Cerrar»; una sola pregunta; «Corregir» es un enlace; la
  búsqueda a mano va en un bloque aparte.

## Comprobación
- `scripts/check-matchrim-ux150.ts` 19/19. Recorridos en simulador 85/85. `harness/ux150.mjs` con el fotograma de
  la botella tumbada: la lectura girada llega a la búsqueda («noctis»).
- Fuera del simulador, con la tienda real: «noctis» devuelve Vinea Noctis y la ordenación lo deja como único
  candidato. En el simulador la tienda es simulada y no lo contiene, así que el recorrido completo con la tienda
  real no está probado de punta a punta.
- `check-matchrim-menu88.ts` falla al leer un archivo de evidencias de ~/Documents (ETIMEDOUT); no depende de este cambio.
- No probado en iPhone real.

## No tocado
- Ficha del vino, carta de vinos, Perfil, aiRIM y restaurante solo reciben el fondo y, donde aplica, la botella de
  color. El resto del repaso de relieve en esas pantallas queda para la siguiente entrega si el cambio convence.
- Los vinos guardados no tienen tipo en la base de datos: su botella sale gris hasta que la tienda de Winerim
  responde por ese vino.
