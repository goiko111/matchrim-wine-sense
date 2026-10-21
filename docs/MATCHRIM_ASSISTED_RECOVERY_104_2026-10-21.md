# Matchrim: recuperación asistida 104

## Alcance

Continuación de `996106d` en el repositorio nativo de trabajo. No se publica ni
modifica la web desplegada, no se usa Lovable y no se amplía el presupuesto.
La 100 subida anteriormente es inmutable: cualquier binario nuevo será 101 o
superior. Este documento no certifica disponibilidad en TestFlight.

Actualización 21/10, 18:33 UTC: código candidato `a558245`, build local
**1.0 (101)** compilado y firmado. Typecheck, bundle, QA visual y navegación
UIKit comprobados. **No subido**: el gate de reconocimiento real de las 200
etiquetas sigue sin aprobarse. No confundir ese gate con los de compilación.

## Cambios de producto

- Cuando falta una ficha segura, la respuesta principal ofrece «Encontrar mi
  vino en Winerim», sin esconderlo en los detalles técnicos.
- Hasta tres propuestas con foto, nombre, bodega y aviso de añada. El ranking
  no se presenta como porcentaje de confianza ni genera afinidad.
- Consultas literales y acotadas: nombre sustentado por OCR o escrito por el
  usuario; no se consultan URLs, cantidades ni identidades inventadas.
- Filtros de uva, año, calificativos, crianza y palabras distintivas impiden
  sugerir otra referencia solo por compartir denominación o estilo.
- La selección humana necesita lectura independiente por ID/slug público y
  coincidencia de identidad. Las páginas parciales solo admiten selección
  explícita; nunca certifican identidad automática.
- Una ficha sin añada conserva el año de la foto y permite consultar estilo,
  no sustituye la ficha sensorial de esa cosecha ni inventa afinidad de botella.
- Cancelar, cerrar o cambiar de región, usuario o perfil invalida respuestas
  tardías. Un error de red no modifica el vino.
- Se corrigen tres defectos detectados en revisión: confirmar desbloquea el
  guardado y limpia el error anterior; el ID/slug observado se verifica sin
  una nueva búsqueda incompatible con subnombres; cambiar de referencia no
  conserva uvas ni graduación sin verificar del candidato descartado.
- Se excluyen conectores gramaticales de la cobertura de propuestas y se
  reconoce una denominación italiana escrita completa como respaldo de DOC.
  No se eliminan calificativos de crianza, color ni cru.
- Una sustitución de una letra en una uva larga puede generar una propuesta
  solo si coinciden todos los tokens de productor y la otra uva del nombre,
  sin una uva contradictoria. Se conserva el OCR original, se avisa de la
  posible errata y no se crea identidad ni afinidad automática.

## Matriz de reconocimiento

Corpus original conservado: 200 etiquetas, 198 OCR no vacíos y 2 vacíos. Se
reutilizan OCR Apple Vision y respuestas públicas guardadas. No se vuelven a
subir imágenes, no se ejecutan modelos ni se cambia el ground truth.

| Pase de sugerencias | Escenas con lista | Referencia esperada top1 | Top3 | Listas sin esperada |
| --- | ---: | ---: | ---: | ---: |
| Inicial r1 | 88 | 45 | 54 | 34 |
| Cobertura mínima r2 | 59 | 35 | 40 | 19 |
| Uva/crianza/año r3 | 44 | 29 | 32 | 12 |
| Palabras distintivas r4 | 42 | 29 | 33 | 9 |
| Conectores/clasificación/errata de uva r6 | 45 | 32 | 36 | 9 |

R6: top3/escenas=18%; top3/listas=80% (r4: 16,5% y 78,6%). Son métricas de recuperación
asistida de páginas guardadas, **no precisión de identificación automática**.
Las dos consultas iniciales de cada escena son las de la adquisición 103;
no prueban que el generador 104 en la app haya recuperado esas mismas páginas.
No se ocultan las 155 escenas sin propuesta ni se cuentan como aciertos.

La referencia automática sigue en el baseline independiente: 13/200
referencias compatibles, 1 añada explícita y 12 fichas sin añada. No se suman
esos 13 a los 36, ya que puede haber solapamiento. Este baseline de OCR/búsqueda
no mide el detector de IA real de la app. La metadata esperada no es
una anotación humana definitiva: existen contradicciones de productor, como
Foral, y aliases no autorizados. No se corrigen para inflar métricas.

Evidencia local:

- `qa-artifacts/recovery104-20261021/ocr200-proposals-r1/REPORT.json`
- `qa-artifacts/recovery104-20261021/ocr200-proposals-r2/REPORT.json`
- `qa-artifacts/recovery104-20261021/ocr200-proposals-r3/REPORT.json`
- `qa-artifacts/recovery104-20261021/ocr200-proposals-r4/REPORT.json`
- `qa-artifacts/recovery104-20261021/ocr200-proposals-r5/REPORT.json` (mismas
  métricas, fingerprints posteriores a los arreglos de confirmación)
- `qa-artifacts/recovery104-20261021/ocr200-proposals-r6/REPORT.json`
- `qa-artifacts/recovery104-20261021/COMPARISON-R5-R6.json`
- Baseline: `qa-artifacts/global103-20261021/ocr200-current-replay-r4/REPORT.json`

Tres recuperaciones nuevas comprobadas contra metadata, no contra diccionarios
añadidos al producto:

| Imagen | OCR relevante | Propuesta pública recuperada | Límite |
| --- | --- | --- | --- |
| img-061 | BIOGRAFO / DEI VINO | 377725 Biógrafo del Vino, Dominio del Bienamado | Productor requiere revisión; no atribuir año de catálogo a la foto |
| img-174 | TOMBACCO / PRIMITIVO / MANDURIA / DENOMINAZIONE ORIGINE CONTROLLATA | 376140 Primitivo di Manduria DOC, Tombacco | Ficha sin añada |
| img-182 | GHOST BLOCK / CABERNET SALVIGNON | 376092 Ghost Block Cabernet Sauvignon | Ficha sin añada; aviso explícito de errata |

Se mantiene sin resolver img-184: el año OCR 2026 está junto a texto de premio
Lyon/Gold y podría no ser cosecha. No se borra ese año para aceptar sin más
la ficha 2025. Tampoco se inventan aliases para resolver contradicciones como
Foral, Coto de Hayas/Aragonesas o erratas del catálogo.

## Pruebas ejecutadas

| Comprobación | Resultado | Límite |
| --- | --- | --- |
| Catálogo global 103 | 17 grupos PASS | Transporte aislado; no detector vivo |
| Perfiles sensoriales | 50 sintéticos PASS | No 50 personas ni estudio longitudinal |
| Ranking/consultas/selección parcial 104 | 10 grupos PASS | Sin red ni afinidad a partir del ranking |
| Handlers React e integración 104 | 7 grupos PASS | Hooks aislados, no layout de navegador |
| Scope nativo/web | 5 archivos, 14 mutantes rechazados | Aserciones previas conservadas |
| Scope maestro 102 | 9 grupos, 22 mutantes rechazados | Inversas completas conservadas |
| Puente de catálogo 97 | 13 grupos PASS, 120 casos web | Sin red/modelos |
| Respuesta de etiqueta 97 | 20 grupos PASS | No layout nativo |
| Escáner consumidor 95 | 16 grupos PASS | Sin runtime nativo |
| ESLint de archivos nuevos/tocados relevantes | PASS | No sustituye typecheck/build |
| Typecheck de aplicación | PASS | `candidate101-r4/typecheck.log` |
| Bundle producción aislado | PASS | Fuentes limpias de `a558245`; no publicación |
| Playwright, rama nativa | 12 capturas PASS, 0 errores página/consola | Transporte interceptado, no IA real ni UIKit |
| Compilación iOS simulador | PASS, instalada como bundle aislado | No modifica el TestFlight del teléfono |
| UIKit retrato normal | 1 recorrido PASS, 5 capturas | Teclado, navegación y auditorías automáticas |
| UIKit texto máximo | 1 recorrido PASS, 5 capturas | No equivale a VoiceOver manual ni reconocimiento real |
| Release iOS 101 | PASS, firma verificada, 164 recursos comprobados | Archivo local, no exportado/subido |
| Catálogo público/CORS | HTTP 200, origen `capacitor://localhost` admitido | 1 GET público gratuito; no envío de imagen/modelo |

Los tests de handlers cubren selección NV, perfil actual, cancelación con
adaptador que ignora abort, reintento, cambio de propietario/perfil/región,
unmount y errores de ficha/red. El runner visual cubre ficha NV, añada exacta
sintética y recuperación asistida a 393x852, 320x568 y texto 200%. Se comprueba
el cierre visible de 44 px, ancho de página/diálogo y carga real de foto.
La inspección visual confirma los estados revisados; no sustituye el recorrido
E2E de las 200 imágenes con el proveedor.

Una revisión independiente detectó los tres defectos de confirmación citados.
Tras corregirlos y añadir regresiones de handlers/selección, la segunda lectura
no encontró incidencias accionables en ese alcance. No sustituye el QA visual.

## Evidencias de compilación y QA

- `qa-artifacts/recovery104-20261021/candidate101-r4/preparation.json`
- `qa-artifacts/recovery104-20261021/visual-r3/report.json` y 12 PNG/ARIA
- `qa-artifacts/recovery104-20261021/uikit101-r2/RESULT.json`
- `qa-artifacts/recovery104-20261021/uikit101-r2/normal/attachments/manifest.json`
- `qa-artifacts/recovery104-20261021/uikit101-r2/max/attachments/manifest.json`
- `qa-artifacts/recovery104-20261021/archive101-r1/ARCHIVE-RESULT.json`
- `qa-artifacts/recovery104-20261021/archive101-r1/Matchrim101.xcarchive`
- `qa-artifacts/recovery104-20261021/PUBLIC-CORS-HEADERS.txt`

Fallos conservados: typecheck r1/r2 falló por inferencia `never[]` en el helper
de tokens; se tipó como `string[]`. Visual r1 falló en una expectativa de
fixture: decía bodega ausente pero su OCR simulado la incluía; se corrigió el
escenario, no el criterio. La instalación UIKit r1 falló porque el override CLI
de bundle ID también renombró frameworks; r2 compila con IDs originales y cambia
solo el plist de la app de simulador sin firma. El Release conserva
`wine.matchrim.app`.

## Gate de TestFlight

Los antiguos gates internos 1-3 (typecheck, bundle, visual y compilación/QA
nativo) están cerrados en este alcance. La reserva compartida de build dejó
de ser un bloqueo y se liberó al terminar, junto con el simulador.

1. Reconocimiento real de las 200 no aprobado. No consumir nuevos análisis
   mientras no se concilie el límite de 50 peticiones/15 EUR ya autorizado.
2. No subir un candidato que se anuncie como reconocimiento completo validado.
3. Las fichas NV y aliases/añadas contradictorias requieren datos fiables, no
   bajar umbrales para fabricar afinidades.

Gasto nuevo de este bloque: 0 llamadas de modelo, 0 turnos Lovable, 1 lectura
pública gratuita de Winerim. Web publicada, backend y proyecto iOS original
sin modificar; no se ha subido la 101 ni reutilizado el número 100.
