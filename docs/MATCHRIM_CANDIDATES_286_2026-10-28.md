# Matchrim 129: reconocimiento por candidatos (goal 286, noche del 28 al 29 de octubre)

## Qué cambia para el usuario

Cuando el escaneo en el iPhone deja una etiqueta sin identificar, la app ya no exige leer todas las palabras del nombre y de la bodega. Ahora:

1. Busca sola en Winerim con el texto leído:
   - las líneas literales, como hasta ahora;
   - las palabras del texto más grande de la etiqueta;
   - si una palabra larga no da resultados, su principio o su final, por si se leyó mal una letra.
2. Ordena los resultados por cuánto de cada vino se ha leído. Tolera:
   - erratas de una o dos letras;
   - palabras pegadas;
   - conectores como «de» o «et».

   Las palabras raras pesan más. Si la etiqueta contradice el color, la denominación o un calificativo del vino, este baja en la lista en lugar de desaparecer.
3. Lo que se muestra depende de la ventaja del primero:
   - **Ventaja clara:** «¿Es este tu vino?», con la foto de Winerim y el botón «Sí, es este». Debajo, «No es este: ver otros candidatos».
   - **Sin ventaja clara:** «¿Es alguno de estos?», con hasta 3 fotos de Winerim y «Ver más candidatos» (hasta 20).
   - **Siempre:** «Busca por nombre o bodega» como último recurso.
4. Nada se enlaza sin un toque del usuario. Al elegir, la app:
   - busca primero la referencia del catálogo maestro de Winerim, que trae los atributos 0–5 de esa añada y permite calcular el encaje;
   - sin sesión, o si el maestro no da una coincidencia única, verifica la ficha pública.
5. Antes del OCR, los recortes con el lado mayor por debajo de 1200 px se amplían 2× con Lanczos.

Otros cambios:

- **Avisos de calidad de la foto:** llevan tildes, por ejemplo «Resolución limitada para leer texto pequeño».
- **Referencia del catálogo maestro:** con la afinidad calculada, sigue visible debajo con la añada de los datos de sabor y el enlace a la ficha original (hallazgo de la QA nativa, `60243c2`).
- **Cabecera del detalle en MAX:** sin cambios respecto a la 127. El arreglo previsto se revirtió porque el título se montaba sobre el contenido (ver abajo).

## Medidas, sin conexión y con el código de la app

### 1. Búsqueda emulada sobre cada catálogo cerrado

Las 388 respuestas reales grabadas el 21 de octubre (2.553 filas) siguen una regla: cada palabra de la consulta es un trozo del nombre o de la bodega. La emulación aplica esa regla.

| OCR 2× | Vino correcto entre los resultados | A la primera | Entre las 3 primeras | Propuesta única: mostrada / precisión | Hoy (estricto 104) a la primera |
|---|---|---|---|---|---|
| Carta Plaza Blanca (135) | 92,6 % | 84,4 % | 91,1 % | 45 % / 100 % | 38,5 % |
| Paquete de 200 | 92,5 % | 90,0 % | 92,0 % | 66,5 % / 99,2 % | 40,0 % |

- Unas 3,5 búsquedas por foto.
- Con OCR sin ampliar: carta 79 % y 87 %; paquete 87,5 % y 90,5 %.
- Ficheros: `qa-fixtures/candidates286/RESULT-ocr2x.json` y `RESULT-ocr1x.json`.

### 2. Ranking sobre resultados reales del catálogo completo

Se reproducen sin conexión las respuestas reales grabadas para el paquete. Solo existen las consultas literales de entonces, así que esto mide el ranking entre distractores reales, no el plan de búsquedas nuevo.

En las 78 fotos cuyas consultas grabadas traían el vino correcto:

| | Resultado |
|---|---|
| A la primera | 85,9 % (estricto 104: 44,9 %) |
| Entre las 3 primeras | 89,7 % |
| Propuesta única | Mostrada en el 52,6 %, con una precisión del 95,1 % |

- El único fallo que aguanta cualquier umbral razonable es Foral Alvarinho de Quinta do Regueiro: su etiqueta dice «Melgaço» y «Old Vines», y eso encaja de lleno con Foral de Melgaço Old Vines Alvarinho.
- Fichero: `qa-fixtures/candidates286/RESULT-recorded-real-ocr2x.json`.

## Lo que esto no demuestra

- **El catálogo completo con las consultas nuevas:** son unas 200–400 búsquedas públicas gratuitas (fase 3), pendientes de tu OK. En los 183.509 vinos, las búsquedas por fragmento pueden devolver más de 80 filas, y entonces solo llega la primera página.
- **Fotos reales con el iPhone** (fase 4).
- **Confirmación sin ningún toque:** no está activada. Con distractores reales, la propuesta única acierta el 95 %, no el 99 %.
- **QA nativa del flujo de candidatos:** no la hay. Las pruebas del simulador trabajan sin red y este flujo necesita el buscador público. Lo cubren pruebas del componente real con transporte controlado: `scripts/check-matchrim-candidate-ui286.mjs`, 7/7.

## Pruebas

| Prueba | Resultado |
|---|---|
| candidates286 (unitarias + medida) | PASS |
| candidate-ui286 | 7/7 |
| recovery104 | 18 |
| picker163 | 18 |
| reference136 | 49 |
| rescan161 | 142 |
| vision122 | 9 |
| native112-harness | 28 |
| master259 | 8/8 |
| master259-ui | 8/8 (enmienda revisada para el import nuevo) |
| master260 | 7/7 |
| first20-283 | 6/6 |
| master283-offline | 5/5 |
| surprise285 | 7/7 |
| consumer95-profile | PASS |
| proposals104, query174, stacked175, color124, appellation120 | PASS |
| distribute129 | 4/4 |
| Comprobación de tipos | PASS |

Las pruebas en rojo ya lo estaban en la 128 limpia, porque comparan el código con versiones anteriores: manual-lookup-bridge96, identity218, consumer95-native-layout, native-image-safety95, feedback-strength96, comparison-target96, label-keyboard96, native-scan99, native-home-accessibility96 y native-type90.

## Commits locales, sin push

| Commit | Contenido |
|---|---|
| `7c5e68c` | Reconocimiento por candidatos y ampliación 2× |
| `4db080f` | Tildes y resultados |
| `a97ccf0` | Cabecera en MAX |
| `be4c712` | Los programas de compilación y QA admiten la 129 |
| `3125f47` | Publicador de la 129, sin ejecutar |
| `b7321bb` | Reproducción sobre resultados reales |
| `60243c2` | La referencia del maestro se ve debajo de la afinidad (hallazgo de la QA nativa) |
| `3456e6c` | Revierte `a97ccf0`: vuelve la cabecera compacta de MAX (hallazgo de la QA nativa) |

Worktree limpio de la 129: `/Users/GOIKO/2matchrim-candidate129-20261028`, ahora en `3456e6c`.

## Compilación y QA

La 129 sale del worktree limpio: primero en `3125f47`, tras el hallazgo de r63 en `60243c2` y, tras el de r66, en `3456e6c`, que es la 129 final. La carpeta principal tiene el mismo código de producto; solo cambian scripts y documentos.

| Paso | Carpeta | Resultado |
|---|---|---|
| Preparación | `candidate129-r1` | FALLO: al worktree le faltaba el enlace a `qa-artifacts/native99-20261021`, de donde se lee la configuración pública. Se conserva. |
| Preparación | `candidate129-r2` | PASS, pero sin `ios/App/Pods`, que git ignora |
| Compilación de r2 | `compile129-r1` | FALLO por esa falta de Pods. Se conserva. |
| Preparación | `candidate129-r3` | PASS. Comprobación de tipos PASS. Pods copiado desde la carpeta principal, como en la 127, sin tocar archivos versionados. |
| Compilación para simulador | `compile129-r2` | PASS |
| Archivo firmado de Release | `archive129-r1` | PASS: firma verificada; no exportado ni subido. Queda sustituido por el de `60243c2`. |
| QA nativa: añada, normal | `native220-r63` | FALLO, se conserva. Ver abajo. |
| Preparación | `candidate129-r4` | PASS, en `60243c2`. Comprobación de tipos PASS. |
| Compilación para simulador | `compile129-r3` | PASS |
| QA nativa: añada, normal | `native220-r64` | PASS en `60243c2`; capturas revisadas |
| QA nativa: añada, MAX | `native220-r65` | FALLO del arnés: el turno pesado caducó a mitad (al renovar sin `--seconds` se concedieron 10 min). Se conserva; tamaño de texto y app restaurados a mano. |
| QA nativa: añada, MAX | `native220-r66` | PASS en `60243c2`, pero las capturas muestran el título de la cabecera montado sobre el contenido. Ver abajo. |
| QA nativa: catálogo, normal | `native220-r67` | PASS en `60243c2` |
| Preparación | `candidate129-r5` | PASS, en `3456e6c`. Comprobación de tipos PASS. |
| Compilación para simulador | `compile129-r4` | PASS |
| QA nativa: añada, normal | `native220-r68` | PASS |
| QA nativa: añada, MAX | `native220-r69` | PASS |
| QA nativa: catálogo, normal | `native220-r70` | PASS |
| QA nativa: catálogo, MAX | `native220-r71` | PASS |
| Archivo firmado de Release | `archive129-r2` | PASS: firma verificada, `3456e6c`; no exportado ni subido |

### Lo que encontró la QA nativa (r63)

Con la 128, una referencia del catálogo maestro ya puntúa con los valores 0–5 de Winerim. Por eso la vista principal pasa a enseñar la afinidad: en la prueba, «Afinidad orientativa: 85 de 100».

Pero en ese caso desaparecía el bloque de la referencia:

- el título «Vino encontrado en Winerim»;
- de qué añada son los datos de sabor;
- el enlace «Ver ficha original Winerim».

La ficha pública sí se mostraba debajo de la afinidad, así que el maestro era el único caso sin ese bloque. La prueba de la 128 esperaba ese bloque y no se había pasado nunca en el simulador.

Corrección en `60243c2`: la referencia del maestro se muestra debajo de la afinidad, igual que la pública. La prueba nativa comprueba además la afinidad y ya no toca un texto de una línea como si fuera un botón. master259-ui sigue en 8/8, con una enmienda revisada para ese bloque, y la comprobación de tipos pasa.

### Lo que se vio en las capturas de MAX (r66)

En MAX, «Pinot Blanc · 2020» ocupa dos líneas. La segunda línea y la bodega se pintaban encima del contenido del panel.

La causa está en `nativeLabelSheet102.css`, que limita a propósito la cabecera de MAX a `min(12dvh, 6rem)`. Así los campos ampliados del formulario conservan espacio, y un título largo se desplaza dentro de la propia cabecera. La regla de `a97ccf0` no levantaba ese límite, pero sí quitaba el recorte.

Se revierte en `3456e6c`. Vuelve el comportamiento de la 127: se ve la primera línea del título y el resto se desplaza dentro de la cabecera. Es una limitación conocida, no un arreglo.

### Estado de la 129 final (`3456e6c`)

- **QA nativa:** cuatro pasadas en el simulador propio, con usuario sintético y 0 llamadas de red, todas PASS. Capturas revisadas. Al terminar se cerró la app de prueba y se restauró el tamaño de texto. Los cuatro turnos están liberados.
- **`qa-artifacts/testflight129-20261029/RELEASE.json`:** apunta a `candidate129-r5`, `archive129-r2` y r68–r71, y conserva los fallos. La validación en seco contra el publicador da PASS con una autorización de prueba en memoria; no se escribió ningún fichero de autorización.
- **Sin hacer:** `HUMAN-AUTHORIZATION.json`, exportación y subida. Solo con tu OK expreso a una beta limitada, citando tus palabras exactas.

Limitaciones conocidas para esa decisión:

1. El flujo de candidatos no tiene QA nativa porque necesita el buscador público. Lo cubre el arnés del componente, 7/7.
2. El plan de búsquedas nuevo no se ha medido sobre el catálogo completo (fase 3, pendiente de OK).
3. No se ha probado con fotos reales del iPhone.
4. La propuesta única acierta el 95 % con distractores reales, así que siempre hace falta un toque.
5. La mayoría de las referencias reales siguen sin datos de sabor.
6. El vermut se rechaza por diseño.
7. En la imagen 020, «Ver ficha original» abre la ficha de 2020 aunque la botella dice 2000.
8. En MAX, la cabecera solo muestra la primera línea del título; el resto se desplaza dentro de ella.
9. Nadie ha confirmado todavía que la 127 se procesara en TestFlight ni que se pueda instalar.

