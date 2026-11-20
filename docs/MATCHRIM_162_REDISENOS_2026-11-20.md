# Matchrim 162 · Rediseños pedidos tras el vídeo de la 159 (20-nov-2026)

Origen: respuesta del propietario del 20-nov a la lista «Lo que no he hecho»: «Pantallas reales… Esto hay que
hacerlo», y «la carta que he subido es de un cliente que ya existe en Winerim por lo que esos 22 vinos te aseguro
que están en Winerim».

## La carta: los vinos «no encontrados» sí estaban en Winerim
Tenía razón. Nueve líneas salían como «No lo hemos encontrado en Winerim» y la tienda las tiene. La búsqueda de la
tienda solo encuentra un texto escrito tal cual: «ONDARRE MILENIUM» (es Millenium), «LALIER» (Lallier), «IRACHE
18.91» (1891) y «FINCA DE LA MOTA» (Finca la Mota) daban cero. Ahora una línea sin resultado se vuelve a preguntar
por sus palabras, con esas erratas reparadas, y se compara palabra a palabra admitiendo una letra distinta
(`rescueQueries162`, `looseMatch162` en `storeListing139.ts`). Sigue siendo una estimación etiquetada.

Probado contra la tienda real con las nueve líneas: seis salen ya (Ondarre Millenium, Lallier R.020, Lallier Rosé,
Lallier Blanc de Blancs —entre varios—, Irache 1891 Rosado, Finca la Mota). Tres siguen sin salir: «JULIAN», «LA
MAR» y «NAVA REAL». Son nombres de una o dos palabras cortas que la tienda no devuelve en su primera página
(«La Mar» está como «Terras Gauda La Mar»); arreglarlo bien es cosa de la búsqueda del servidor (tolerante y por
bodega + uva). Pendiente de pedirlo a desarrollo.

En la lista, los vinos sin nota llevan ahora un rótulo: «Leídos de la carta, sin nota todavía», para que no parezca
que no se han leído. La vista rápida que aparece mientras se lee la carta se titula «Vinos de la carta · N de
momento» y se reordena sola según llegan las notas. La lectura completa del servidor sigue llegando de una vez
(medio minuto): eso no ha cambiado.

## Recorrido («Cómo funciona Matchrim»)
- Fuera las cuatro fotos de banco. Cada paso es un trozo de la app que responde al dedo (`NativeTour162`): elegir
  entre tres vinos y ver su nota, contestar una pregunta del test, elegir qué fotografiar, tocar la nota para ver
  el porqué, guardar un vino, decir el plato y ver cómo se reordena la carta. Nada se guarda ni se envía.
- Se pasa deslizando o tocando los puntos; ya no hay flechas. Queda un botón («Siguiente») y «Saltar guía».
- Las dos pausas del test enseñan seis fotos de comida del propio test.

## Tu perfil
Escala de cinco tramos en cada preferencia, «Por dónde empezar» (tres estilos de vino que salen de las cinco
respuestas por reglas simples, con ejemplos; `profileStyles162`) y «Qué hace Matchrim con esto». Son ejemplos de
estilos, no notas.

## Pantalla de acceso
Con el diseño del resto de la app y, antes del formulario, para qué sirve la cuenta. El aviso de la 161 («Para
guardar «X» necesitas una cuenta») se mantiene cuando hay un vino esperando.

## «¿Dónde lo tomaste?» (y «¿Dónde lo compraste?», «¿Dónde lo viste?»)
Rehecha en el iPhone (`NativeWherePanel162`): primero dónde (tres botones grandes), luego el nombre del sitio con
buscador, precio y fecha. Todo opcional menos el tipo de sitio.
- El buscador usa los mapas de Apple desde la propia app (`MatchrimPlacesPlugin162.swift`, `MKLocalSearch`): gratis,
  sin clave, sin cuenta y sin pedir permiso de ubicación. Solo sale del teléfono el texto escrito, hacia Apple.
  Como no usa la ubicación, conviene escribir nombre y ciudad («Narru Donostia»).
- Se guarda «Nombre · dirección» en el campo de siempre (`consumption_place`); no cambia nada en el servidor.
- Google Places no se usa (es de pago). Las funciones antiguas `search-places` y `detect-location` siguen en el
  repositorio sin que la app las llame.
- **Código nativo nuevo**: hace falta build para verlo; en el simulador de pruebas (carcasa de la 159) el buscador
  se probó con una respuesta fija, no con los mapas reales.

## «Combina muy bien con»
Tarjetas con foto como «A qué sabe». Winerim usa una lista corta de maridajes (muestreo del 20-nov: marisco,
verduras, aves, pasta, pescado, ternera, cerdo, cordero, caza, arroz, quesos, aperitivos, picante, postres, fruta).
Seis fotos nuevas de licencia libre (créditos en `MATCHRIM_157_FOTOS.md`); el resto reutiliza fotos del test.

## La foto escaneada
En la hoja «¿Cuál es tu vino?» la foto recién hecha se queda a la vista, arriba a la derecha.

## Guardar la carta con su restaurante
«Guardar esta carta» en el resultado: se elige el restaurante con el mismo buscador y la carta (las líneas leídas,
no la foto) queda **en ese iPhone**. Al abrir «Carta» sin foto aparecen las «Cartas guardadas»: abrir, ver en el
mapa, quitar. Hasta doce. No va al servidor: compartir cartas entre teléfonos o personas, o enlazarlas con la carta
que el restaurante tiene en Winerim, necesita desarrollo y decisión del propietario.

## ¿Sale en la app todo lo que Winerim tiene de un vino?
Comparado el 20-nov el JSON completo de un vino de la tienda (Quintaluna 2023) con la ficha. Faltaban dos cosas y
se han añadido: **cuándo beberlo** («Mejor en 2026–2027 (bebible 2025–2028)») y **la clasificación con su
explicación** («Vino de la Tierra (VT)»). Lo demás ya se enseñaba: tipo, zona, uvas, añada, temperatura, grado,
los cinco ejes y la crianza, maridajes, nota de cata completa, elaboración, bodega, viñedo, clima, historia,
curiosidad y vinos parecidos. No se enseñan a propósito: precios por restaurante (solo sirven para estimar),
marcas internas (`new`, `soldout`, `highlight`, `selection`, `section`) y `milanoSommeliers/Categories` (vacíos).
Una ficha vista en la última semana sigue saliendo de la copia del teléfono, sin los dos datos nuevos, hasta que caduque.

## Sin hacer / sin comprobar
- Nada de esto está en un build ni visto en un iPhone.
- El buscador de sitios con los mapas reales (solo con respuesta fija).
- La lista completa de la carta sigue llegando de una vez desde el servidor.
- «JULIAN», «LA MAR», «NAVA REAL» siguen sin encontrarse.
- La comparación de campos se hizo con un vino; no con una muestra amplia.
- Las respuestas de intención no ordenan el Inicio (pendiente 20, a petición del propietario).

## Build 162 (20-nov-2026, sin subir)
- `candidate162-r3` (commit 0c17fde): prepare, compile, QA nativa r243–r246 y `archive162-r3` firmado. Lleva la 160, la 161 y la 162.
- Las vueltas r1 y r2 compilaron pero fallaron la prueba de letra máxima (r235, r238, r240): la miniatura de la foto en
  «¿Cuál es tu vino?» crecía con la letra y, ya fijada en puntos, «Corregir» seguía 1–2 pt bajo el pie. Con letra de
  accesibilidad la miniatura se oculta y la cabecera queda como en la 159; no se llegó a la causa exacta de esos 1–2 pt.
- `MatchrimPlacesPlugin162.swift` compila y responde con los mapas reales de Apple en el simulador
  (`harness/places-real162.mjs`: Narru Donostia, Bar Néstor, Casa Lucio, con dirección).
- Sobre el binario `compile162-r3`: recorridos j02–j12 85/85, ux162 17/17, ux162b 8/8, ux161 7/7, ux159 7/7, ux158 16/16.
- Sin comprobar: iPhone real; el recorrido, el perfil y las tarjetas de maridaje con letra de accesibilidad.
- Subida a TestFlight: solo con el sí expreso del propietario (`qa-artifacts/testflight162-20261120/RELEASE.json` listo,
  falta `HUMAN-AUTHORIZATION.json`; `~/ClaudeCode/matchrim-build162/upload162.sh`).
