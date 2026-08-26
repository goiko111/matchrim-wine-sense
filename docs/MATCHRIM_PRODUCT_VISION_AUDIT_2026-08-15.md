# Matchrim: auditoria de producto, vision y QA movil

Fecha: 2026-08-15

## Fuente de verdad

- Repositorio operativo: `matchrim-publish-20260713`.
- Rama: `codex/publish-20260713`, alineada con `origin/main` en `52d21f2` al iniciar este frente.
- Build instalado en el iPhone 16 Pro Max `Goiko`: Matchrim `1.0 (56)`, bundle `wine.matchrim.app`.
- La copia `matchrim-wine-sense` contiene cambios locales y archivos no versionados de otro frente. No se modifica ni se usa como destino.
- Material real de QA: cuatro fotos de cartas impresas inclinadas y una foto de un expositor con decenas de botellas, reflejos, oclusiones y referencias repetidas.

## Diagnostico actual

1. El escaner de etiqueta asume exactamente un vino. Envia la imagen completa a `extract-wine-label-ocr` y recibe una unica ficha.
2. El escaner de carta usa una sola llamada multimodal con un limite de 15 vinos. Mezcla OCR, clasificacion, posicion, atributos sensoriales y afinidad en la misma respuesta.
3. La afinidad de carta se recalcula en servidor sobre cinco dimensiones, pero la interfaz explica poco el origen del dato y no distingue ficha, inferencia y preferencia aprendida.
4. La foto de carta muestra porcentajes completos sobre la imagen. En documentos densos esos elementos tapan texto y no escalan bien al hacer zoom.
5. La funcion de etiqueta afirma verificar en Internet mediante otro prompt al mismo modelo, sin una herramienta de busqueda ni fuentes trazables. Esa salida no se puede presentar como verificacion.
6. No existe contrato de lote, estado por region, candidatos alternativos, deduplicacion ni reanalisis parcial.
7. El historial es local y guarda escaneos individuales; no representa un lote multibotella ni sus correcciones.

## Principios de producto

- No inventar identidad. Si la evidencia no alcanza, devolver candidatos y explicar la duda.
- Separar deteccion, lectura, resolucion canonica y recomendacion. Cada fase tiene confianza y errores propios.
- La imagen sirve para orientarse; la lista sirve para decidir. Los detalles nunca deben tapar la fuente visual.
- La afinidad es una estimacion explicable, no una medida de calidad objetiva.
- Toda afirmacion debe declarar su procedencia: `etiqueta`, `catalogo`, `inferencia` o `preferencia aprendida`.
- Permitir corregir y reintentar una region sin repetir todo el lote.

## Arquitectura P0

### Flujo multietiqueta

```text
archivo/camara
  -> quality gate local (tamano, brillo, contraste, resolucion)
  -> detector de regiones (una llamada sobre la foto completa)
  -> normalizacion y deduplicacion geometrica
  -> crops locales por bounding box
  -> OCR/resolucion por region (una llamada por crop, concurrencia limitada)
  -> candidatos canonicos y confianza
  -> afinidad por candidato confirmado
  -> lote editable y confirmable
```

La deteccion completa no se tratara como reconocimiento final. Su unico trabajo es localizar botellas/etiquetas y devolver regiones. El reconocimiento se ejecutara sobre cada crop para evitar que una sola respuesta fusione vinos distintos.

### Contrato de region

```ts
type ScanRegion = {
  id: string;
  index: number;
  box: { x: number; y: number; width: number; height: number };
  detectionConfidence: number;
  quality: {
    glare: "low" | "medium" | "high";
    occlusion: "low" | "medium" | "high";
    legibility: "good" | "limited" | "poor";
  };
  status: "pending" | "analyzing" | "recognized" | "uncertain" | "unrecognized" | "discarded";
  candidates: WineCandidate[];
  selectedCandidateId: string | null;
};
```

`WineCandidate` incluye nombre, productor, anada, region, pais, uvas, confianza, evidencias visibles, campos inferidos y motivo de duda. La UI nunca promueve automaticamente un candidato de baja confianza a reconocido.

### Carta y pizarra

- Mantener imagen completa con `object-fit: contain`, zoom y pan.
- Sustituir porcentajes superpuestos por pins numerados compactos.
- Seleccion sincronizada entre pin y fila de lista.
- Un unico detalle expandido en movil, presentado como bottom sheet.
- Mantener estructura de seccion, columna y precio en el contrato del OCR.
- Filtros por servicio, tipo, region, precio, afinidad y confianza.

### Afinidad explicable

El resultado usa dimensiones normalizadas y ponderadas. P0 cubre cuerpo/potencia, acidez, tanino, dulzor y fruta, con espacio contractual para madera, intensidad aromatica y estilo cuando exista evidencia.

Cada explicacion devuelve:

- score global y confianza del score;
- contribucion por dimension;
- coincidencias y fricciones;
- por que puede gustar y que puede no encajar;
- familiaridad/aventura;
- datos ausentes y efecto esperado;
- procedencia de cada dato;
- alternativa segura, exploratoria y de valor cuando el lote lo permita.

El feedback rapido por dimension se conserva localmente en P0 y queda preparado para sincronizacion posterior. No modifica el perfil silenciosamente.

## Prioridades

### P0 - decision fiable en el momento

1. Foto con 2-N botellas: deteccion por regiones, crops, OCR separado, candidatos, confianza, descarte y reanalisis parcial.
2. Overlay sobrio con contornos y numeros; detalle fuera de la imagen.
3. Carta sin amontonamiento: pins numerados, lista sincronizada, filtros y navegacion anterior/siguiente.
4. Explicacion de afinidad por dimensiones y procedencia del dato.
5. Progreso por fases, cancelacion, errores recuperables y soporte de fotos grandes.
6. Tests de geometria, deduplicacion, normalizacion, ranking y explicacion.
7. QA E2E en iPhone real con los cinco archivos, evidencias visuales, logs, latencia y expected/actual.

### P1 - recurrencia y contexto profesional

1. Perfil que aprende de valoraciones y correcciones con historial de cambios reversible.
2. Modo restaurante/sumiller: comensal, plato, presupuesto, copa/botella y explicacion para servicio.
3. Comparacion de 2-5 vinos con diferencias por dimension y precio.
4. Historial persistente y diario de cata con fotos, lugar y contexto.
5. Inventario visual de expositor/bodega con recuento, duplicados y reescaneo incremental.
6. Privacidad visible: retencion de fotos, datos enviados y borrado.

### P2 - ampliacion con evidencia suficiente

1. Lista de deseos y alertas de precio/disponibilidad.
2. Compartir una seleccion sin exponer el perfil privado.
3. Modo cata a ciegas.
4. `Bebe ahora/guarda` solo para referencias con datos fiables de ventana de consumo.
5. Flujo de revision humana para OCR/matching con trazabilidad y control de calidad.

## Criterios de aceptacion P0

- Una foto multibotella nunca produce una sola ficha global.
- Cada objeto visible tiene region, estado y confianza independientes.
- Duplicados de la misma referencia se agrupan sin perder el recuento.
- Un match dudoso muestra 2-3 candidatos o queda como no reconocido.
- Ningun texto largo ni porcentaje tapa etiquetas o lineas de una carta.
- Seleccionar un pin lleva al mismo vino en la lista y viceversa.
- El score explica contribuciones, fricciones, datos ausentes y origen de datos.
- El usuario puede cancelar y reanalizar una sola region.
- El flujo sobrevive cierre/reapertura sin dejar un estado inconsistente.
- La aprobacion requiere E2E en el iPhone fisico; compilar no cuenta como QA.

## Riesgos y limites conocidos

- El modelo actual no ofrece segmentacion determinista. Las cajas son propuestas de deteccion y se validan geometricamente antes de recortar.
- OCR y resolucion canonica no equivalen a verificacion. Sin fuente externa trazable se marcara como inferencia.
- La concurrencia por crop debe limitarse para controlar latencia, memoria y coste.
- HEIC necesita validacion especifica dentro de WKWebView; las pruebas web usan derivados JPEG sin alterar los originales.
- El build 56 es la linea base instalada. El nuevo build debe incrementar version de compilacion y conservar el bundle `wine.matchrim.app`.

## Evidencia de QA requerida

Para cada uno de los cinco archivos: tipo detectado, regiones esperadas, regiones reales, reconocidos/dudosos/no reconocidos, duplicados, latencia por fase, consumo de memoria observado, capturas antes/despues, log de consola/dispositivo y resultado expected/actual. Tambien se cubren orientacion, Dynamic Type, VoiceOver basico, red lenta/sin red, cancelacion y reapertura.

## Actualizacion 2026-08-25 R2

Se ha completado la primera pieza P1 de comparacion 2-5: selector compartido, modo personal/servicio, prioridades afinidad/certeza/valor, presupuesto y formato cuando existen datos. La decision mantiene separados afinidad, confianza OCR e informacion de precio/servicio; no fabrica un score agregado. Tambien se corrigio la seleccion progresiva para incorporar resultados tardios hasta que el usuario edita manualmente el lote.

El contenedor iOS 57 pasa build, PHPicker, vertical/horizontal y Dynamic Type AXXXL en simulador. WKWebView traduce la categoria del sistema a ajuste de texto con reflujo, y el detalle sensorial usa una composicion especifica de accesibilidad para no comprimir etiquetas, barras ni feedback.

Los cinco originales recorren ahora la aplicacion nativa con una frontera QA determinista y visible. Esto valida contratos, estados, comparador y layout, pero no la precision: el P0 real sigue abierto mientras `detect-wine-regions`, `analyze-wine-region` y `scan-wine-menu` no se desplieguen en staging y se repita la matriz sin fixtures. TestFlight permanece en NO-GO hasta completar tambien el E2E en iPhone fisico.
