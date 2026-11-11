# Matchrim 139 · Lo que salió al probar la 138 en un iPhone real (11-nov-2026)

Goiko instaló la 138 en su iPhone 16 Pro Max y recorrió la app con una guía paso a paso: registro, test, buscador,
una botella real (Vidure, Pago de Cirsus), una carta de vinos real (Ikili, 19 tintos) y aiRIM. La 139 corrige lo que
encontró. Solo iOS; la web, `main` y el backend no se han tocado.

## Lo que falló y qué hace ahora la 139

1. **La carta de vinos se leía bien y no contestaba nada** (19 vinos leídos, 0 con nota). Ahora cada línea se busca
   en la tienda de Winerim. Si la carta nombra el vino, sale su nota; si solo pone la bodega («RODA – Tempranillo»),
   sale un rango («entre 68 y 75») y se puede elegir el vino exacto. La lista se ordena por afinidad y «El que más
   encaja contigo de esta carta» queda arriba. Con la carta de Ikili: **16 de 19** con nota o rango (medido contra
   la tienda real). Fuera quedan «Luis R.», La Garnatxa Salvaje y Carralcova.
2. **Carta de varias páginas:** «Añadir otra página» suma vinos a la misma lista.
3. **Botella clara que no se enlazaba sola.** Si el texto leído contiene el nombre y la bodega de un único candidato,
   se enlaza y abre el veredicto, con «¿No es este? Cambiar». Si hay duda, sigue la lista para elegir.
4. **Botella conocida solo por la tienda de Winerim:** antes «aún necesitamos datos de sabor»; ahora una estimación.
5. **Buscador.** Buscaba en un catálogo propio pequeño (sin Ramón Bilbao ni Mar de Frades). Ahora busca en la tienda
   de Winerim, con foto, bodega real y zona; el teclado se abre solo y la ficha aparece al instante.
6. **Ficha de Winerim a la vista** (tipo, zona, uvas, añada) en recomendaciones y búsquedas, en vez del botón que
   acababa en «no se ha podido enlazar esta identidad».
7. **El tanino penalizaba a los blancos** en las estimaciones (la tienda pone 0, que significa «no aplica»). Ya no
   cuenta ni en la nota ni en los motivos.
8. **El vino escaneado se perdía** al salir sin guardar. Inicio muestra «Últimos vinos escaneados».
9. **Notas propias:** «Mi nota» en cada vino guardado.
10. **aiRIM no parecía un sitio donde preguntar.** Título, ejemplos a la vista y un cuadro de texto que se ve.
11. **Esperas:** barra con los pasos reales y una curiosidad general del vino que cambia cada 6 segundos
    (30 textos en `src/utils/wineFacts139.ts`, pendientes de tu revisión).
12. **Limpieza:** botones que se quedaban en amarillo, casilla de privacidad gigante, perfil vacío con diseño
    antiguo, aviso que tapaba el resultado del test, jerga del escáner («Identidad parcial», «formato pendiente»,
    «6.8 MP · brillo 80»…), avisos de calidad cuando la lectura había salido bien, nombres de rasgos distintos en
    cada pantalla, y un único «tu estilo» espumoso junto a uvas tintas.

## Lo que conviene que sepas

- **Todo lo que viene de la tienda de Winerim es una estimación y se dice.** No entra en el aprendizaje de tu perfil
  ni se guarda como ficha verificada.
- **Rango por bodega:** cuando la carta solo pone la marca, no sabemos cuál de sus vinos es. El rango es honesto,
  pero el vino de la carta podría no estar entre los que ofrece la tienda.
- **Enlace automático de botellas:** antes la app nunca enlazaba sin un toque. Ahora lo hace solo con etiqueta clara.
  Si la ficha de Winerim tiene añada y la etiqueta no dio ninguna, no enlaza (no inventa la añada).
- **Guardar un vino desde la carta** queda en «Más opciones → Guardar o corregir un vino» (dos toques).
- **En vinos con ficha verificada el tanino 0 sigue contando.** Hay comprobaciones antiguas que protegen ese
  comportamiento; cambiarlo es una decisión aparte.
- **Sin conexión**, un vino de la carta que no se pudo buscar sale igual que uno que no está en Winerim.

## Comprobación
- Recorridos en simulador (backend simulado): 11 recorridos, 83/83, con pasos nuevos para el buscador de Winerim,
  el tanino en blancos y la estimación en maridajes. Escáner de botella y de carta recorridos con capturas.
- Checks del repositorio: 195 (los 192 de la 138 más `ux139`, `menu139` y `autolink139`).
- El emparejador de cartas, medido contra la tienda real de Winerim con la carta de Ikili: 16/19.
- QA nativa: la primera candidata (r1) falló en r125 porque la casilla del aviso de privacidad medía 28 puntos y la prueba exige 44. Corregido; la segunda (candidate139-r2) pasa las cuatro pasadas (r129-r132) y tiene el archivo firmado.
- No probado todavía en iPhone real. El enlace automático no se ha visto con una botella de verdad.

## Fuera de la app (propuestas escritas, nada aplicado)
`docs/backend-proposals/2026-11-11-PROPUESTAS-BACKEND.md` y dos parches:
- **aiRIM:** respuestas que razonan con tus gustos y tu historial. Hallazgo: la app descarta cualquier respuesta con
  un porcentaje o frases como «encaja contigo» y muestra un texto fijo; puede ser lo que viste.
- **Correo de confirmación:** plantillas en castellano listas para pegar, y los pasos para que el enlace vuelva a la
  app. La función de correo que hay en el repositorio no debe activarse sin el parche (no comprueba quién la llama).
- **Imágenes del test:** pendiente de decidir estilo (fotos reales o ilustración).
