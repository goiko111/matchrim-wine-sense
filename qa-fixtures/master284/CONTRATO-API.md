# Matchrim · API de catálogo de vinos (contrato para Goiko)
> **Revisión del contrato: `rev3-2026-10-28`** (acompaña a los ficheros `sensory-evidence-1` de la misma revisión; ver `SHA256SUMS.txt`). **Versión vigente corregida, 27-oct-2026.** Sustituye a la enviada antes: corrige lo dicho sobre el «3 por defecto» (hay un valor de respaldo en el código, de incidencia desconocida, no un pico en los datos), sobre la procedencia (`source: null` = no consta) y deja claro que los atributos van por añada y solo la media de la búsqueda no.


Solo lectura. **Nunca devuelve precios, existencias ni restaurantes.** Los ejemplos JSON son **respuestas reales sobre el catálogo de producción** (lectura, 24-oct-2026), generadas con la API ya publicada (release 827, 24-oct-2026).

## Acceso
- Base: `https://app.winerim.com/api/v1/matchrim`
- Cabecera obligatoria `X-Matchrim-Key: <clave de Goiko>`. Sin clave o con clave incorrecta: `401 {"error":"unauthorized"}`. La clave **no va en este correo**: se os entregará por un canal seguro que acordaremos (nunca por correo ni chat abierto). Hasta entonces todas las peticiones dan 401.
- Límite: 300 peticiones por minuto con la clave de Goiko. Al pasarlo: `429` con cabecera `Retry-After` (segundos).
- Clave propia (`MATCHRIM_GOIKO_KEY`) y no la de la edge function de Matchrim (`MATCHRIM_SEARCH_KEY`): se puede rotar o revocar sin romper a la otra parte y cada una tiene su propio límite.

## 1. Buscar vinos — `GET /wines/search`
Un resultado por **vino canónico** (`mantalakWineId`), no una fila por restaurante.

| Parámetro | Significado |
|---|---|
| `name` | Palabras del **nombre del vino**, en cualquier orden. Cada palabra debe empezar una palabra del nombre. |
| `winery` | Palabras del **nombre de la bodega**, mismas reglas. |
| `q` | Palabras sobre «nombre + bodega» a la vez (lo que usa la app de Matchrim). |
| `vintage` | Añada de cuatro cifras. Por defecto **solo reordena** (los vinos con esa añada, primero). |
| `vintageMatch` | `prefer` (por defecto) o `only`. Con `only`, `vintage` **filtra**: solo vinos con esa añada conocida. Requiere `vintage`. |
| `page` | Página, desde 1 (por defecto 1). |
| `includeUnlisted` | `0` (defecto) o `1`. Con `1` incluye vinos verificados que ninguna carta activa lista (ver «Vinos que ninguna carta lista»). |
| `limit` | Resultados por página: por defecto 10, **máximo 50**. Un valor mayor se recorta a 50 **sin error**; la respuesta devuelve el `limit` efectivo y `total`/`pageCount` permiten seguir paginando. |

Reglas:
- Hay que enviar al menos uno de `q`, `name` o `winery`; los que se envíen se combinan con **Y**. Cada texto: 2–100 caracteres, hasta 6 palabras distintas, y la búsqueda debe contener alguna palabra de 3 o más letras. Un año de cuatro cifras escrito en `q` o `name` solo reordena.
- Sin acentos ni mayúsculas: «Viña» = «vina».
- **Añada:** el catálogo solo conoce las añadas que listan los restaurantes o que tienen atributos propios. Que una añada no aparezca **no prueba que no exista**; por eso `vintage` solo reordena salvo que pidáis `vintageMatch=only` para acotar.
- **Paginación estable:** orden total (coincidencia exacta del nombre, añada preferida, nombre más corto) con desempate por `mantalakWineId` ascendente. Repetir la misma petición, o cambiar `limit`, da el mismo orden y ninguna página repite ni salta un vino. Solo se sirven los primeros 10.000 resultados (`page × limit`); si pasa, `400`: afinad la búsqueda.
- Respuesta: `results`, `count` (resultados en esta página), `total` (vinos que cumplen toda la búsqueda), `page`, `limit`, `pageCount`. Una página fuera de rango devuelve `results: []` con el `total` correcto.
- `id` y `representativePublicId` (mismo valor) son el id público de **una** fila de carta representativa; sirven para construir el enlace web y no identifican el vino: para eso usad siempre `mantalakWineId`.
- `webUrl`: enlace a la ficha web pública, `https://web.winerim.com/matchrim/store/{representativePublicId}/{slug}`, donde el slug es el `slugname` exacto del resultado. Solo se construye con una fila real y un slug real del catálogo; si el vino no tiene slug (o, en la ficha, ninguna fila pública activa), `webUrl` es `null` y nunca se adivina uno.
- `vintages` = añadas conocidas (listadas por algún restaurante activo + las que tienen atributos propios), de más reciente a más antigua.
- `tastingAttributes` en la búsqueda es una **media orientativa** de las estimaciones de las cartas (un decimal) y **no es específica de añada**: es lo único de los atributos que no va por añada. Los valores por añada están en la ficha (apartado 2), en `attributesByVintage`.

Ejemplo — paginación, página 1: `GET /wines/search?name=amarone&limit=2&page=1` (`total` 149 vinos en 75 páginas):
```json
{
  "results": [
    {
      "id": 355574,
      "representativePublicId": 355574,
      "mantalakWineId": 214921,
      "name": "Amarone Classico",
      "winery": "Fidora",
      "type": "tinto",
      "country": "IT",
      "region": "Valpolicella",
      "grapes": [
        "Corvina",
        "Corvinone",
        "Rondinella"
      ],
      "vintages": [],
      "tastingAttributes": {
        "power": 5,
        "acidity": 3,
        "sweetness": 1,
        "tannin": 4,
        "fruity": 4
      },
      "photo": "https://app.winerim.com/images/wines/6a672f4d57f35060658299.png",
      "slugname": "Amarone-Classico",
      "webUrl": "https://web.winerim.com/matchrim/store/355574/Amarone-Classico"
    },
    {
      "id": 176612,
      "representativePublicId": 176612,
      "mantalakWineId": 202489,
      "name": "Amarone Dea Lualda",
      "winery": "Corteforte",
      "type": "tinto",
      "country": "IT",
      "region": "Amarone della Valpolicella Classico",
      "grapes": [
        "Corvina",
        "Corvinone",
        "Molinara",
        "Rondinella"
      ],
      "vintages": [],
      "tastingAttributes": {
        "power": 5,
        "acidity": 4,
        "sweetness": 2,
        "tannin": 4,
        "fruity": 4
      },
      "photo": "https://app.winerim.com/images/wines/685195f8e8f38590613801.png",
      "slugname": "Amarone-Dea-Lualda",
      "webUrl": "https://web.winerim.com/matchrim/store/176612/Amarone-Dea-Lualda"
    }
  ],
  "count": 2,
  "total": 149,
  "page": 1,
  "limit": 2,
  "pageCount": 75
}
```

Página 2 (`page=2`): mismo orden, sin repetir ni saltar; resumen de ids: [50050, 48483] (la 1 trae [214921, 202489]). Una página fuera de rango (`limit=50&page=99`) da `results: []` y conserva el total:
```json
{
  "results": [],
  "count": 0,
  "total": 149,
  "page": 99,
  "limit": 50,
  "pageCount": 3
}
```

Errores: `400 {"error":"invalid_query","message":"…"}`. Ejemplo — `GET /wines/search?vintage=2021` (falta `q`, `name` o `winery`):
```json
{
  "error": "invalid_query",
  "message": "Indica al menos uno de q, name o winery."
}
```

## 2. Ficha por id canónico — `GET /wines/{mantalakWineId}`
No depende del slug. `404 {"error":"not_found"}` si no existe o no está verificado. Funciona aunque ningún restaurante lo liste en este momento.

Contenido: id canónico, nombre, bodega, tipo, país, región, uvas, foto, `slugname` (informativo; `null` si no tiene), `representativePublicId` y `webUrl` (ver arriba; `null` si el vino no tiene ninguna fila pública activa o no tiene slug), `vintages` (añadas conocidas) y los atributos sensoriales **por añada**.

Atributos (`tastingAttributes`):
- `scale`: enteros de **0 a 5**; **0 = «no aplica»** (p. ej. taninos en un blanco), no «poco». Ejes: `power` (potencia), `sweetness` (dulzor), `acidity` (acidez), `tannin` (taninos), `fruity` (fruta). `aging` (crianza) es un sexto valor de 0 (sin barrica) a 5 (gran reserva) y puede ser `null`.
- `attributesByVintage`: una fila genérica (`vintage: null`, valor del vino sin añada concreta) y una fila por cada añada con valores propios. **Si el vino no tiene filas por añada, solo viene la fila genérica y `dependsOnVintage` es `false`.** Si una añada no tiene fila propia, no se inventa: usad la genérica. Si no hay ninguna fila, la lista va vacía.
- **Procedencia:** `source` (`{"type":"ai","model":…,"confidence":…,"generatedAt":…}`) se devuelve cuando consta el registro de generación por IA, que existe solo para una parte pequeña de las filas (4 % al 27-oct: modelo `gpt-5`, marzo y abril de 2026). En el resto **no consta** modelo, prompt ni fecha; la administración de Winerim también puede editar los valores. `source: null` significa «no consta», no «verificado» ni «no verificado». No hay un campo que marque una cata humana. `confidence` es la confianza que registró el generador; no es una probabilidad de identidad ni de gusto. Existe un valor por defecto de código (3) cuando la IA no devuelve un eje, pero no sabemos cuántas filas lo usaron.

Ejemplo — `GET /wines/180278` (Chivite La Zorrera: genérica + añada 2015; la 2019 no tiene fila propia y no hereda la de otra añada):
```json
{
  "mantalakWineId": 180278,
  "name": "La Zorrera",
  "winery": "Chivite",
  "type": "tinto",
  "country": "ES",
  "region": "Navarra",
  "grapes": [
    "Garnacha"
  ],
  "photo": "https://app.winerim.com/images/wines/63bd7b864cd47785352844.png",
  "slugname": "La-Zorrera",
  "representativePublicId": 336808,
  "webUrl": "https://web.winerim.com/matchrim/store/336808/La-Zorrera",
  "vintages": [
    2019,
    2015
  ],
  "tastingAttributes": {
    "scale": {
      "min": 0,
      "max": 5,
      "notApplicable": 0,
      "axes": [
        "power",
        "sweetness",
        "acidity",
        "tannin",
        "fruity"
      ],
      "aging": "Crianza, de 0 (sin barrica) a 5 (gran reserva). Puede faltar (null).",
      "note": "Enteros de 0 a 5. 0 significa \"no aplica\" (por ejemplo, taninos en un blanco), no \"poco\"."
    },
    "dependsOnVintage": true,
    "attributesByVintage": [
      {
        "vintage": null,
        "power": 4,
        "sweetness": 1,
        "acidity": 3,
        "tannin": 3,
        "fruity": 4,
        "aging": null,
        "source": null
      },
      {
        "vintage": "2015",
        "power": 4,
        "sweetness": 0,
        "acidity": 3,
        "tannin": 3,
        "fruity": 4,
        "aging": null,
        "source": null
      }
    ]
  }
}
```

## 3. Correspondencia de ids — `GET /wines/ids?publicIds=1,2,3`
Traduce el **id público de carta** (`menu_winelist_wine.id`, el que ven en el listado público) al id canónico. Hasta **100** ids separados por comas. Devuelve solo `publicId`, `mantalakWineId`, la añada de esa fila (`vintage`, `null` si no tiene) y `webUrl`: el enlace web **de esa fila** (su propio id y su propia añada), construido solo con el slug real del catálogo; `null` si el vino no tiene slug. No expone restaurante, precios ni existencias.
- `results` en el orden pedido (sin repetidos). `notFound`: ids que no existen o que ya no están activos en ninguna carta activa; para ellos no hay correspondencia.
- Ids no numéricos, listas con huecos (`1,,2`), `0`, negativos, o más de 100: `400`.

Ejemplo — `GET /wines/ids?publicIds=362891,363580,378799,2147483000` (los dos de «slugname vacío», uno con añada y uno inexistente):
```json
{
  "results": [
    {
      "publicId": 362891,
      "mantalakWineId": 215213,
      "vintage": null,
      "webUrl": "https://web.winerim.com/matchrim/store/362891/Giacondi-Montepulciano-D-Abruzzo-Giacondi-IT"
    },
    {
      "publicId": 363580,
      "mantalakWineId": 215439,
      "vintage": null,
      "webUrl": "https://web.winerim.com/matchrim/store/363580/Anecdota-Chenin-Blanc-Altotinto-MX"
    },
    {
      "publicId": 378799,
      "mantalakWineId": 9176,
      "vintage": "2021",
      "webUrl": "https://web.winerim.com/matchrim/store/378799/Emidio-Pepe-Montepulciano-d-Abruzzo_2021"
    }
  ],
  "notFound": [
    2147483000
  ]
}
```

## Ausencia de datos, añadas y límites conocidos
- **Ausente ≠ cero ≠ 3.** La API nunca rellena: un eje se devuelve solo si hay fila; sin filas, `attributesByVintage` va vacío; `aging` es `null` cuando falta. **Aviso sobre el dato de origen:** el código tiene un valor de respaldo (`3` por eje) para cuando la IA no devuelve ese eje (desde el 16-mar-2026); **no sabemos cuántas filas lo usaron y no se observa en la distribución de los datos** (la moda es 4; solo 3 filas tienen los cinco ejes en 3). Por eso no podemos afirmar de un 3 concreto que sea genuino ni que no lo sea. `0` es «no aplica» según la escala, no «sin dato».
- **Sin añada / añada desconocida:** `vintage: null` significa «sin añada indicada» (fila genérica, o fila de carta sin añada); el catálogo no distingue un vino sin añada (NV) de una añada no registrada.
- **Añada exacta:** `GET /wines/search?...&vintage=2020&vintageMatch=only` devuelve solo vinos con esa añada conocida. Si el vino solo existe con otra, **no sale** (`total: 0`) y la ficha no hereda nada de otra añada. Para saber si el vino existe con otra añada, repetid la búsqueda sin `vintageMatch=only` y mirad `vintages`.
- **Ids:** `mantalakWineId` es el id canónico del catálogo maestro (`mantalak_wine`); no hay otro «maestro» ni namespace «Library» con ids propios. El id público de carta (`menu_winelist_wine.id`) se traduce con `/wines/ids`; el campo `id` de cada resultado de búsqueda es el de una fila de carta representativa, no identifica la añada.
- **Alias:** no existe tabla de alias; la búsqueda ignora acentos y mayúsculas y encuentra por inicio de palabra.
- **Fecha/versión:** solo `source.generatedAt` cuando consta la generación por IA; las filas de atributos no guardan fecha propia.
- **Ejes:** `power` (cuerpo/potencia), `sweetness`, `acidity`, `tannin`, `fruity`, `aging` (crianza). No hay en este catálogo ejes de intensidad aromática ni estilo.

## Qué distingue hoy la API en los datos sensoriales (y qué no)
Por eje (`power`, `sweetness`, `acidity`, `tannin`, `fruity`, `aging`):
| Situación | Cómo se ve hoy | ¿Distinguible? |
|---|---|---|
| Valor disponible | entero 1–5 en la fila de esa añada o, si no hay, en la genérica | Sí. No se sabe de cada valor si vino de la IA, de una edición manual o del valor de respaldo |
| No aplica | `0` (escala: 0 = no aplica) | Sí |
| Ausente | no hay fila (`attributesByVintage` vacío o sin esa añada); `aging: null` | Sí a nivel de fila/añada; **no por eje**: una fila trae siempre los cinco ejes |
| Valor de respaldo (`?? 3`) | existe en el código; su incidencia es desconocida | **No** (el dato no guarda la marca) |
| Fuente | `source` solo si consta el registro de generación por IA (4 % de las filas); si no, `null` = **no consta** | Parcial |
| Escala | `scale` en cada ficha (0–5) | Sí |
| Añada aplicable | `vintage` de cada fila (`null` = genérica); sin fila de una añada no se hereda otra | Sí |
| Versión / fecha | solo `source.generatedAt` cuando hay `source` | Parcial |
| Ficha vs inferencia | no hay dato | No |
Los atributos **sí van por añada** (114.319 filas de 54.148 vinos al 27-oct: 77.421 con añada y 36.897 genéricas; **las dos categorías suman 114.318: una fila no está clasificada en ninguna y no tenemos conservado cuál es**; la ficha lee la de la añada pedida y, si no existe, la genérica). Distinguir por eje entre valor, valor de respaldo, ausente y no aplica, con fuente y versión por fila, requeriría un cambio de datos y de contrato que no está hecho (ver `sensory-evidence-1`, en revisión).

## Garantías de orden y paginación
- Orden total y determinista: coincidencia exacta del nombre, añada preferida, nombre más corto y, al final, `mantalakWineId` ascendente. Misma petición o distinto `limit` ⇒ mismo orden.
- Ninguna página repite ni salta un vino mientras el catálogo no cambie entre peticiones; un alta o baja entre dos páginas puede desplazar resultados (no hay cursor).
- **Nada se trunca en silencio:** `total` cuenta todos los vinos que cumplen la búsqueda; `limit` > 50 se recorta a 50 y la respuesta devuelve el `limit` efectivo; una página fuera de rango devuelve `results: []` con el `total`; pedir más allá de los primeros 10.000 resultados da `400` explícito, nunca una lista cortada.

## `vintageMatch=only`: cuatro casos (consultas reales sobre producción, solo lectura, 24-oct)
Ruta: `GET /wines/search?...&vintage=AAAA&vintageMatch=only`. Una añada «conocida» es la que lista alguna carta activa o tiene atributos propios. (Resumen de los campos relevantes; la forma completa es la del apartado 1.)

1. **Exacta** — `name=zorrera&winery=chivite&vintage=2015&vintageMatch=only`:
```json
{
  "total": 1,
  "count": 1,
  "results": [
    {
      "mantalakWineId": 180278,
      "name": "La Zorrera",
      "winery": "Chivite",
      "vintages": [
        2019,
        2015
      ]
    }
  ]
}
```
2. **No encontrada (el vino no existe)** — `name=zzzqqq&vintage=2015&vintageMatch=only`:
```json
{
  "total": 0,
  "count": 0,
  "results": []
}
```
3. **Vino sin añadas registradas** — `name=montepulciano&winery=giacondi&vintage=2020&vintageMatch=only` da 0, pero el mismo vino sin `only` sale con `vintages: []`:
```json
{
  "total": 0,
  "count": 0,
  "results": []
}
```
Sin `only` (`name=montepulciano&winery=giacondi`):
```json
{
  "total": 1,
  "count": 1,
  "results": [
    {
      "mantalakWineId": 215213,
      "name": "Giacondi Montepulciano D´Abruzzo",
      "winery": "Giacondi",
      "vintages": []
    }
  ]
}
```
4. **Solo existe otra añada** — `name=vidure&winery=pago de cirsus&vintage=2020&vintageMatch=only` da 0 aunque el vino existe con 2018. Para saberlo, repetir sin `only` y leer `vintages`; la ficha no hereda atributos de otra añada.
```json
{
  "total": 0,
  "count": 0,
  "results": []
}
```
Ficha del vino de este caso, `GET /wines/201987` (genérica + 2018):
```json
{
  "mantalakWineId": 201987,
  "name": "Vidure",
  "winery": "Pago de Cirsus",
  "type": "tinto",
  "country": "ES",
  "region": "Navarra",
  "grapes": [
    "Cabernet Sauvignon"
  ],
  "photo": "https://app.winerim.com/images/wines/68370b8de5d4b340278417.png",
  "slugname": "Vidure",
  "representativePublicId": 364050,
  "webUrl": "https://web.winerim.com/matchrim/store/364050/Vidure",
  "vintages": [
    2018
  ],
  "tastingAttributes": {
    "scale": {
      "min": 0,
      "max": 5,
      "notApplicable": 0,
      "axes": [
        "power",
        "sweetness",
        "acidity",
        "tannin",
        "fruity"
      ],
      "aging": "Crianza, de 0 (sin barrica) a 5 (gran reserva). Puede faltar (null).",
      "note": "Enteros de 0 a 5. 0 significa \"no aplica\" (por ejemplo, taninos en un blanco), no \"poco\"."
    },
    "dependsOnVintage": true,
    "attributesByVintage": [
      {
        "vintage": null,
        "power": 5,
        "sweetness": 1,
        "acidity": 3,
        "tannin": 4,
        "fruity": 4,
        "aging": 4,
        "source": null
      },
      {
        "vintage": "2018",
        "power": 4,
        "sweetness": 1,
        "acidity": 3,
        "tannin": 4,
        "fruity": 4,
        "aging": null,
        "source": null
      }
    ]
  }
}
```

## Enlaces antiguos tipo `…/{id}/_2022`
Los 312 `slugname` vacíos (154 filas con añada abrían con `_AAAA`) se rellenan en origen; el **id público (`menu_winelist_wine.id`) no cambia**, y la web exige id + slug exactos, así que los enlaces `…/{id}/_2022` dejan de abrir. Para resolverlos:
1. Tomar el `{id}` del enlace guardado (ignorar el slug).
2. `GET /wines/ids?publicIds={id}` → `mantalakWineId`, `vintage` de esa fila (el `_2022` coincide con ese `vintage`) y `webUrl`: **el enlace nuevo de esa misma fila** (mismo id, slug real + `_2022`).
3. `GET /wines/{mantalakWineId}` → ficha por id canónico; no depende del slug.
Basta para recuperar el vino y su ficha. Límite: si la fila ya no está activa en una carta activa, el id sale en `notFound`. (El `webUrl` de la *ficha* apunta a la fila representativa, que puede ser otra; el de `/wines/ids` es el de la fila pedida.) Que la web acepte o redirija los slugs antiguos `_AAAA` queda fuera de esta API.

## Vinos que ninguna carta lista
Por defecto la búsqueda devuelve **solo vinos que lista algún restaurante activo** (respuesta idéntica a la de la release 827). Con `includeUnlisted=1` (opt-in; solo `0` o `1`) devuelve **todo vino verificado del catálogo**, lo liste o no alguna carta; `total`, `page` y el orden siguen siendo deterministas. La ficha por `mantalakWineId` cubre siempre todo vino verificado. Para los que ninguna carta activa lista (solo salen con `includeUnlisted=1`) (p. ej. La Migratoria, 217480) `id`, `representativePublicId` y `webUrl` son `null` (no existe fila pública de la que construir el enlace web), `vintages` puede ir vacío y `tastingAttributes` de la búsqueda es `null`; la ficha por `mantalakWineId` funciona igual.

## Límites conocidos de `webUrl`
`webUrl` apunta a la ficha web pública, que hoy solo abre si el vino tiene atributos de cata en alguna carta y si el slug cumple la ruta pública (letras, cifras, `-`, `_`); un slug con otros signos (por ejemplo, apóstrofo) no abrirá. Es deuda de la web, no de esta API; para identificar y leer el vino usad siempre la ficha por `mantalakWineId`.

## Compatibilidad
La app de Matchrim sigue usando `q`, `vintage` y `limit` con el mismo significado; solo se han añadido campos (`total`, `page`, `pageCount`) y el tope de `limit` pasa de 20 a 50 (se sigue recortando sin error).

## Ejemplos reales conservados (capturas del 25-oct-2026, release 829)
Respuestas literales de producción, sin editar (las mismas que el README de `capturas-25oct`). No incluyen los campos de `sensory-evidence-1`, que **no están implementados en la API**: sus ejemplos están en `EJEMPLOS.json`.

**Vino que ninguna carta lista, con `includeUnlisted=1`** — `GET /wines/search?q=Migratoria&includeUnlisted=1` (sin el parámetro devuelve `results: []`, `total: 0`):
```json
{
  "results": [
    {
      "id": null,
      "representativePublicId": null,
      "mantalakWineId": 217480,
      "name": "La Migratoria",
      "winery": "Bodegas Frontonio",
      "type": "tinto",
      "country": "ES",
      "region": "Sierra de Gredos",
      "grapes": [
        "Garnacha Negra"
      ],
      "vintages": [],
      "tastingAttributes": null,
      "photo": "https://app.winerim.com/images/wines/6acf10bba530f2.80892612_pending-photo-20114-5895ffce8e804c1c.png",
      "slugname": "La-Migratoria-Bodegas-Frontonio-ES",
      "webUrl": null
    }
  ],
  "count": 1,
  "total": 1,
  "page": 1,
  "limit": 10,
  "pageCount": 1
}
```

**Ficha de ese vino** — `GET /wines/217480` (sin filas de atributos ni añadas):
```json
{
  "mantalakWineId": 217480,
  "name": "La Migratoria",
  "winery": "Bodegas Frontonio",
  "type": "tinto",
  "country": "ES",
  "region": "Sierra de Gredos",
  "grapes": [
    "Garnacha Negra"
  ],
  "photo": "https://app.winerim.com/images/wines/6acf10bba530f2.80892612_pending-photo-20114-5895ffce8e804c1c.png",
  "slugname": "La-Migratoria-Bodegas-Frontonio-ES",
  "representativePublicId": null,
  "webUrl": null,
  "vintages": [],
  "tastingAttributes": {
    "scale": {
      "min": 0,
      "max": 5,
      "notApplicable": 0,
      "axes": [
        "power",
        "sweetness",
        "acidity",
        "tannin",
        "fruity"
      ],
      "aging": "Crianza, de 0 (sin barrica) a 5 (gran reserva). Puede faltar (null).",
      "note": "Enteros de 0 a 5. 0 significa \"no aplica\" (por ejemplo, taninos en un blanco), no \"poco\"."
    },
    "dependsOnVintage": false,
    "attributesByVintage": []
  }
}
```

**Ficha de un vino listado, con una sola fila genérica** — `GET /wines/78397` (aquí solo se muestran los campos de identidad; la captura completa es `05-ficha-control-78397.json`):
```json
{
  "mantalakWineId": 78397,
  "representativePublicId": 320305,
  "webUrl": "https://web.winerim.com/matchrim/store/320305/Anecdota"
}
```

**Sobre de paginación con `includeUnlisted=1`** — `GET /wines/search?q=Rioja&includeUnlisted=1&limit=50&page=1` y `page=2` (`results` omitido; 50 + 31 resultados, ningún `mantalakWineId` repetido):
```json
{ "count": 50, "total": 81, "page": 1, "limit": 50, "pageCount": 2 }
{ "count": 31, "total": 81, "page": 2, "limit": 50, "pageCount": 2 }
```
