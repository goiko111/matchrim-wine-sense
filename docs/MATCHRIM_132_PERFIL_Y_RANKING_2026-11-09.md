# Matchrim 132 · perfil que aprende, test de perfil y ranking (9-nov)

Todo se ha medido sin red, sin cuentas y sin coste. Evidencias en `qa-artifacts/learning132-20261109/`: simulación, resultados y repeticiones desde la caché. La carpeta es local y no está versionada.

## 1. El perfil aprende de las valoraciones (aprendizaje v4)

**Cómo se ha medido:** hay 6283 vinos reales de Winerim con datos de sabor, sacados de la caché de búsquedas públicas. Con ellos se simulan 300 usuarios sintéticos, cada uno con un gusto real oculto, un test con error y entre 1 y 80 valoraciones de vinos que elige beber. Se usa el mismo código de la app (`calculateLearnedMatchrimProfile`). La cifra de cada celda indica cómo se parece el orden de afinidad de la app al gusto real; 1,0 es perfecto.

| Valoraciones | v1 (web) | v3 (iOS hasta la 131) | **v4 (132)** |
|---|---|---|---|
| 0 (solo test) | 0,795 | 0,795 | 0,795 |
| 5 | 0,876 | 0,869 | **0,915** |
| 20 | 0,933 | 0,913 | **0,951** |
| 80 | 0,939 | 0,891 | **0,969** |

- **Fallo de la 131:** el aprendizaje v3 **empeoraba a partir de unas 20 valoraciones** (0,913 → 0,891) mientras su confianza subía al 95 %. Con un test muy desviado, la caída era mayor: de 0,845 a 0,775.
- **Por qué fallaba:** v3 promedia desplazamientos. Al envejecer las valoraciones antiguas, el promedio se encoge en vez de solo repartirse.
- **Qué hace v4:** coloca el perfil a la distancia que indica cada valoración. «Me encanta» lo sitúa cerca del vino, «Bien» a media distancia y «No es para mí» lejos. Al mismo tiempo tira suavemente hacia el test. Las valoraciones recientes pesan más.
- **Escenarios** (orden de afinidad tras 80 valoraciones):

  | Escenario | v3 | v4 |
  |---|---|---|
  | Valoraciones de vinos al azar | 0,848 | 0,960 |
  | Cambio de gusto a mitad | 0,388 | 0,751 |
  | Test muy desviado | 0,775 | 0,968 |
  | Solo «Me encanta» | 0,944 | 0,951 |
  | Usuarios más o menos exigentes | entre 0,858 y 0,917 | entre 0,946 y 0,957 |

- **Alcance:** solo iOS (`native-v4`). La web sigue con v1. El aprendizaje del servidor (chat aiRIM y maridaje) sigue con v2, porque el backend queda fuera.
- **Check:** `scripts/check-matchrim-learning132.ts`, 7/7.

## 2. El test de perfil ya no empuja a los vinos dulces

**Problema:** el test pregunta por alimentos, y a casi todo el mundo le gustan casi todos. Cada eje subía con ese gusto general.

| Quien responde «sí» al… | Dulzor del test | Vinos dulces, generosos o de postre entre sus 20 más afines |
|---|---|---|
| 40 % | ~2,6 | 28 % |
| 60 % (lo típico) | ~3,5 | **60 %** |
| 80 % | ~4,5 | **96 %** |

En el catálogo son el 8 %. Además, a quien le gustan los sabores potentes (cayena, cuero, café solo) le salían sobre todo jereces: el 86 % de sus 50 vinos más afines.

**Arreglo en la 132, solo en iOS (`src/utils/quizCalibration132.ts`):**
- Cada eje se lee **en relación con el gusto general de la persona** y se coloca en la escala de los vinos.
- Quien puntúa todo igual queda en el centro del catálogo: seco, cuerpo medio y algo de tanino.
- El dulzor solo sube con una preferencia clara por lo dulce.

| Respuestas | Perfil 132 | Vinos más afines (50) |
|---|---|---|
| Comida potente | 5-3-0-4-2 | 36 tintos y 14 generosos (antes 7 tintos y 43 generosos) |
| Comida fresca y ácida | 3-5-1-1-3 | 39 blancos, 10 espumosos y 1 rosado |
| Muy goloso | dulzor 5 | dulces |
| Típico, 60 % «sí» | dulzor ~1 | 0,8 % dulces |

- Se guarda como enteros de 0 a 5, como hasta ahora; las columnas son INTEGER. La web sigue con el cálculo anterior.
- **Los perfiles ya guardados no cambian:** la app no guarda las respuestas. **Para aprovecharlo hay que repetir el test**; los pilotos que lo hicieron antes de la 132, también.
- **Checks:** `scripts/check-matchrim-quiz-calibration132.ts`, 6/6. Los checks 85 y 273 incorporan la modificación revisada.

## 3. Ranking de candidatos: cuentan las palabras que no se leyeron

**Cambio:** las palabras del vino que no aparecen en la etiqueta restan un poco (0,25 de su peso). Así, un nombre más largo que solo comparte las palabras leídas ya no gana.

- **Ejemplo:** con Olivé Batllori Brut Nature, la 131 proponía como única opción «Bellmunt i Oliver Método Tradicional Brut Nature». La 132 propone Batllori Brut Nature.
- **Medido repitiendo las mismas búsquedas reales desde la caché**, sin peticiones nuevas:

| | 131 | 132 |
|---|---|---|
| Fotos reales: correcto el primero | 14 de 32 | **19 de 32** |
| Fotos reales: entre los 3 primeros | 19 | 20 |
| Carta: correcto el primero | 136 de 233 | 138 |
| Carta: entre los 3 primeros | 173 | 177 |
| Check 286, carta, solo ranking: el primero | 83,7 % | 85,9 % |
| Check 286, 200 etiquetas: el primero | 90,0 % | 90,5 % |

- **Propuestas únicas en fotos reales:** las 2 que figuraban como erróneas eran correctas, así que de verdad no hay ningún error. Real de Asúa está bien: el catálogo lo pone con su propia bodega.
- **Faustino V → VII no era un fallo:** la foto de Commons es de una botella de Faustino VII, y la app leyó «Faustino VII». **No hay problema con los números romanos.**
- **Propuestas únicas en la carta:** la única nueva que no coincide es «Remelluri Reserva» para «Remelluri Reserva Magnum 2016»: el mismo vino en otro tamaño de botella.

## Lo que no se ha podido probar

- **Con una cuenta real:** valorar, ver cómo evoluciona el perfil en Perfil y la afinidad con la referencia maestra. Queda para la prueba de Goiko desde su perfil.
- **Usuarios simulados:** la relación entre la comida que gusta y el vino que gusta es una hipótesis; no hay datos reales de pilotos todavía.
