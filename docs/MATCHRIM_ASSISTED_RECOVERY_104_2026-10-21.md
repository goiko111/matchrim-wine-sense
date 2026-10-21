# Matchrim: recuperación asistida 104

## Alcance

Continuación de `996106d` en el repositorio nativo de trabajo. No se publica ni
modifica la web desplegada, no se usa Lovable y no se amplía el presupuesto.
La 100 subida anteriormente es inmutable: cualquier binario nuevo será 101 o
superior. Este documento no certifica disponibilidad en TestFlight.

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

R4: top3/escenas=16,5%; top3/listas=78,6%. Son métricas de recuperación
asistida de páginas guardadas, **no precisión de identificación automática**.
Las dos consultas iniciales de cada escena son las de la adquisición 103;
no prueban que el generador 104 en la app haya recuperado esas mismas páginas.
No se ocultan las 158 escenas sin propuesta ni se cuentan como aciertos.

La referencia automática sigue en el baseline independiente: 13/200
referencias compatibles, 1 añada explícita y 12 fichas sin añada. No se suman
esos 13 a los 33, ya que puede haber solapamiento. La metadata esperada no es
una anotación humana definitiva: existen contradicciones de productor, como
Foral, y aliases no autorizados. No se corrigen para inflar métricas.

Evidencia local:

- `qa-artifacts/recovery104-20261021/ocr200-proposals-r1/REPORT.json`
- `qa-artifacts/recovery104-20261021/ocr200-proposals-r2/REPORT.json`
- `qa-artifacts/recovery104-20261021/ocr200-proposals-r3/REPORT.json`
- `qa-artifacts/recovery104-20261021/ocr200-proposals-r4/REPORT.json`
- `qa-artifacts/recovery104-20261021/ocr200-proposals-r5/REPORT.json` (mismas
  métricas, fingerprints posteriores a los arreglos de confirmación)
- Baseline: `qa-artifacts/global103-20261021/ocr200-current-replay-r4/REPORT.json`

## Pruebas ejecutadas

| Comprobación | Resultado | Límite |
| --- | --- | --- |
| Catálogo global 103 | 17 grupos PASS | Transporte aislado; no detector vivo |
| Perfiles sensoriales | 50 sintéticos PASS | No 50 personas ni estudio longitudinal |
| Ranking/consultas/selección parcial 104 | 8 grupos PASS | Sin red ni afinidad a partir del ranking |
| Handlers React e integración 104 | 6 grupos PASS | Hooks aislados, no layout de navegador |
| Scope nativo/web | 5 archivos, 14 mutantes rechazados | Aserciones previas conservadas |
| Scope maestro 102 | 9 grupos, 22 mutantes rechazados | Inversas completas conservadas |
| Puente de catálogo 97 | 13 grupos PASS, 120 casos web | Sin red/modelos |
| Respuesta de etiqueta 97 | 20 grupos PASS | No layout nativo |
| Escáner consumidor 95 | 16 grupos PASS | Sin runtime nativo |
| ESLint de archivos nuevos/tocados relevantes | PASS | No sustituye typecheck/build |

Los tests de handlers cubren selección NV, perfil actual, cancelación con
adaptador que ignora abort, reintento, cambio de propietario/perfil/región,
unmount y errores de ficha/red. El runner visual 103 se amplía con el caso
asistido y texto al 200%; aún no se contabiliza como ejecutado en este bloque.

Una revisión independiente detectó los tres defectos de confirmación citados.
Tras corregirlos y añadir regresiones de handlers/selección, la segunda lectura
no encontró incidencias accionables en ese alcance. No sustituye el QA visual.

## Gates pendientes

1. Typecheck y nuevo bundle de producción aislado con las fuentes actuales.
2. QA visual de las tres rutas: ficha NV, añada exacta sintética y recuperación
   asistida; retrato pequeño y texto 200%, fotos y cierre accesibles.
3. Compilación iOS nueva, navegación nativa y teclado a texto máximo.
4. Reconocimiento real de las 200 no aprobado. No consumir nuevos análisis
   mientras no se concilie el límite de 50 peticiones/15 EUR ya autorizado.
5. No subir un candidato que se anuncie como reconocimiento completo validado.

La máquina tiene reserva `heavy-local` de otra tarea; no se usará una
compilación ni simulador ajeno para saltar la coordinación. Los informes de
build/visual anteriores no certifican este cambio. El archivador reproducible
se adapta a builds mayores que 100, sin ejecutar subida ni tocar el proyecto
iOS original.
