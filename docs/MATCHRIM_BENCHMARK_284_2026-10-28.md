# Matchrim frente a Vivino, Oeni y otras apps de afinidad (28-oct-2026)

Investigación con páginas públicas: fichas de App Store, webs oficiales, centros de ayuda y reseñas. No se ha creado ninguna cuenta, no se ha instalado ninguna app ni se ha enviado ningún formulario. Leyenda: **[V]** comprobado en la fuente enlazada · **[I]** inferencia · **[NC]** no confirmado. Ninguna fuente aporta datos independientes sobre la precisión de estas puntuaciones.

## ¿Qué app es «Oeno»?

La candidata más probable (confianza en torno al 60 %) es **Oeni**, «gestor de bodega nº 1» [V](https://apps.apple.com/es/app/oeni-gestor-de-bodega-n-1/id6445827140):

- Es una app francesa, en castellano, activa en 2026 (v4.8.0) y con 4,7★ en la App Store española.
- Su «% de recomendación» **no mide el paladar**. Combina maridaje, momento óptimo de consumo y valor de mercado.

Las alternativas son menos probables:

- **OENO by Vintec** (≈30 %): un gestor de bodega que usa el reconocimiento de Vivino. Su última versión es de diciembre de 2024 [V](https://apps.apple.com/us/app/oeno-by-vintec/id1464123585).
- **MyOeno**: un sensor físico, abandonado desde 2021.

**Pendiente de confirmar con Goiko.**

Además de Vivino y Oeni, se añaden **Preferabli**, **CellarTracker** y **Sommo**. Se descartan por estar paradas Hello Vino (2017), Delectable (2021) y Sippd.

## Comparativa

| | Vivino | Oeni | Preferabli | CellarTracker | Sommo | Matchrim hoy |
|---|---|---|---|---|---|---|
| **Qué escanea** | Etiqueta. La carta y la estantería son de pago | Etiqueta | Etiqueta | Etiqueta, código de barras y tique | Etiqueta. La carta y la estantería son de pago | Etiqueta y carta, con OCR en el propio móvil |
| **Si no reconoce el vino** | Búsqueda manual o revisión humana, que tarda horas | Solicitud de alta | Solicitud de alta | Editar la búsqueda o avisar al equipo | Lo marca como dudoso | «Corregir vino y añada» y búsqueda explícita |
| **Añada** | Una entrada por cada añada | La detecta | Se elige al valorar | Se puede editar | Se puede corregir | Campo editable; nunca se toman datos de otra cosecha |
| **Perfil** | Sale de las valoraciones (estilo, región, uva) | No tiene | 4 niveles de valoración, que se agrupan en estilos | Notas y preferencias | Radar de 6 ejes («Taste DNA») | Cuestionario de 20 preguntas sobre 5 ejes, más aprendizaje a partir de la Bodega |
| **Puntuación personal** | Porcentaje (de pago) o pulgar (gratis) | % de recomendación, que no mide el gusto | Sí / No / Quizá | Una frase («muy probable»…) | Sin confirmar | Afinidad de 0 a 100, solo si hay datos respaldados |
| **Sin datos** | «Sigue valorando» | Sin confirmar | No muestra nada | «No concluyente» | Lo deja como desconocido | «Sin calcular», con la causa y el paso siguiente |
| **Explica el porqué** | No | No | Por estilos | Sí, en texto | Sin confirmar | Parcial |
| **Cobro** | Premium entre 4,99 $ y 57 $ | 8,99 € al mes | Gratis (negocio B2B) | Por tramos de botellas más suscripción | 5 escaneos gratis | — |

## Datos clave por app

### Vivino

- **Match for You** aparece a partir de 5 valoraciones. El % es la probabilidad de que el usuario puntúe el vino con 4★ o más, con estas bandas: 70–100 buena, 40–70 media, 0–40 baja [V](https://www.vivino.com/wine-news/introducing-match-for-you). Sin pagar solo se ve un pulgar; el porcentaje es de Premium.
- No explica por qué recomienda un vino. Cuando faltan datos, solo dice que sigas valorando.
- La añada es el fallo más citado en las reseñas [V](https://jancisrobinson.com/articles/best-wine-labelscanning-apps).
- Su ficha de App Store declara que vincula al usuario fotos, ubicación precisa y datos de pago, y que lo rastrea [V](https://apps.apple.com/us/app/vivino-buy-the-right-wine/id414461255).
- Recibe quejas por el muro de pago y porque el porcentaje se sustituyó por una etiqueta.

### Oeni

- Su punto fuerte es la gestión de bodega: bodega en 3D, momento óptimo de consumo, valoración y plusvalías. Desde la versión 4.7.0 cita de dónde sale el valor de cada vino.
- El alta tiene 16 pasos y termina en un muro de pago.
- En una reseña, una importación de unos 500 vinos solo reconoció la mitad.

### Preferabli

- Valoración en cuatro niveles: Love, Like, SoSo y Dislike. Lo que cuenta es el corte entre «me atrae» y «no me atrae».
- El perfil necesita en torno a una docena de valoraciones.
- Si la app no sabe lo suficiente, **la ficha no muestra nada** [V](https://go.preferabli.com/knowledge/where-did-will-i-like-it-go-preferabli-support).
- Pide año de nacimiento, género y código postal.

### CellarTracker

- La función «Will I Like This Wine?» es de pago. Responde con frases, del tipo «muy probable», «posiblemente» o «probablemente no», con el razonamiento escrito. Si no tiene datos suficientes, responde «no concluyente» [V](https://support.cellartracker.com/article/106-cellartracker-insights).
- Funciona con un modelo de lenguaje.
- Errores documentados por sus usuarios: da «muy probable» a casi cualquier Burdeos y una vez recomendó un coñac al confundir «Grande Champagne» con un vino.

### Sommo

- Distingue lo que muestra la etiqueta, lo que ha confirmado el usuario y lo que ha deducido la IA, y deja como desconocido lo que no sabe («keep honest unknowns») [V](https://apps.apple.com/us/app/sommo-all-in-one-ai-wine-app/id6757319027).
- El radar «Taste DNA» se construye a partir del diario, no de un cuestionario.
- Algunos usuarios elogian que no venda sus datos.

## Lecciones para Matchrim

Detalladas y priorizadas en el [informe de producto](MATCHRIM_PRODUCT_REVIEW_284_2026-10-28.md):

1. Cuando no haya afinidad, explicar por qué y ofrecer qué hacer.
2. Separar «qué vino es» de «cuánto te gustará».
3. Corregir el vino en un toque, con la añada como campo aparte.
4. Permitir «pedir este vino» y avisar al usuario cuando tenga datos.
5. Explicar el porqué con los 5 ejes.
6. Definir qué significa el número, con bandas.
7. No cobrar por la honestidad.
8. Hacer visible lo que la app aprende.
9. Valoración en 4 niveles.
10. En la carta, ordenar solo los vinos que tienen datos.
11. Ventana de consumo indicando su origen.
12. Usar la privacidad y un alta ligera como argumento.

**Sin confirmar:**

- Que «Oeno» sea Oeni.
- Cómo corrigen Vivino y Oeni un vino mal identificado.
- Si alguna app enseña al usuario cómo cambian sus recomendaciones.
