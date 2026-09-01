# Matchrim: exploracion de avatar y alternativa AIRim

Fecha: 1 de septiembre de 2026.

Estado: **spec de producto, sin implementacion ni despliegue**. Este carril es aditivo y no sustituye los gates P0 vigentes de precision, cuota, despliegue de funciones ni QA fisico documentados en `MATCHRIM_INTERNAL_GATES_2026-09-01.md`.

## Decision recomendada

Validar primero una **guia aiRIM contextual dentro de Matchrim**, textual, estatica y bajo demanda. Debe usar resultados estructurados que Matchrim ya posee para ayudar a confirmar una identidad, entender la afinidad, comparar alternativas y decidir en una carta. No debe ser un talking head, bloquear el escaneo ni hablar por defecto.

La identidad transversal **AIRim** puede definirse despues como un contrato comun de tono, permisos, memoria y herramientas. No se recomienda compartir aun un personaje animado ni una memoria global entre productos. La promocion de Matchrim-only a AIRim compartido exige demostrar recurrencia, utilidad y confianza sin perjudicar latencia, coste o privacidad.

La marca visible actual se conserva como `aiRIM`. `AIRim` se usa en esta spec solo para nombrar la hipotesis de capa transversal.

## Problema y jobs-to-be-done

| Persona | Job principal | Resultado util de la guia |
| --- | --- | --- |
| Usuario general | "Ayudame a elegir sin tener que entender todos los datos del vino" | Resume la mejor opcion, la duda principal y el siguiente paso en lenguaje claro. |
| Aficionado | "Explicame por que este vino encaja conmigo y que puedo aprender de la eleccion" | Conecta afinidad, dimensiones, vinos previos, aventura y datos ausentes sin falsa precision. |
| Sumiller | "Reduceme una carta o vitrina a una lista defendible para este comensal, plato y presupuesto" | Filtra, compara y prepara una explicacion breve para servicio con fuentes y confianza. |
| Usuario ante un error | "No inventes; ayudame a corregir rapido una etiqueta dudosa" | Formula una pregunta concreta, muestra candidatos y reanaliza solo la region afectada. |
| Usuario recurrente | "Recuerda lo que te he permitido aprender y deja que lo corrija" | Expone que memoria influyo, permite excluir datos y conserva un historial reversible. |

## Donde aporta valor

| Momento | Intervencion util | Lo que no debe hacer |
| --- | --- | --- |
| Antes del escaneo | Pedir solo contexto que cambie la decision: uso personal/servicio, plato, presupuesto o copa/botella. | Introduccion animada, saludo largo o tutorial obligatorio. |
| Durante el analisis | Mostrar fases, progreso, cancelacion y una explicacion corta si la imagen necesita otra toma. | Narrar cada fase, reproducir voz o anadir latencia al pipeline. |
| Identidad dudosa | Explicar por que hay duda y preguntar por un dato discriminante: productor, anada o linea concreta. | Elegir el candidato mas probable como si estuviera verificado. |
| Resultado multietiqueta | Actuar sobre el pin seleccionado y resumir candidato, confianza, afinidad y accion. | Flotar sobre la imagen, tapar etiquetas o repetir todas las fichas. |
| Carta o pizarra | Convertir filtros y contexto en una shortlist sincronizada con la lista. | Insertar bocadillos o porcentajes encima del texto original. |
| Comparador 2-5 | Explicar dos o tres diferencias decisivas y separar afinidad, certeza, precio y servicio. | Fabricar un score unico que mezcle dimensiones incompatibles. |
| Explicacion de afinidad | Responder "por que si", "por que no", dato faltante, familiaridad y alternativas. | Parafrasear el porcentaje o presentar inferencias como ficha tecnica. |
| Feedback | Recoger "acerto/no acerto" por dimension y decir que cambiaria. | Modificar el perfil silenciosamente o pedir una conversacion abierta. |

## UX util frente a talking head

### Si aporta valor

- Aparece integrado en el drawer, bottom sheet o detalle que el usuario ya ha abierto.
- Contesta sobre el vino o lote seleccionado y conserva la seleccion al volver a la imagen.
- Usa acciones estructuradas: `Confirmar`, `Corregir`, `Comparar`, `Ver por que` y `Recomendar alternativa`.
- Se abstiene cuando faltan datos y muestra la fuente de cada afirmacion.
- Recuerda preferencias solo con permiso, alcance visible y posibilidad de excluir o borrar.
- Puede convertir una explicacion extensa en resumen de servicio o en version didactica.

### Es decorativo o perjudicial

- Rostro parlante permanente, lip-sync, mirada o gestos sin efecto sobre la decision.
- Mensajes genericos entre escaneo y resultado que retrasan el flujo.
- Burbuja flotante que compite con pins, zoom, filtros o acciones principales.
- Voz automatica en restaurante, tienda o entorno compartido.
- Personalidad que aumenta la seguridad verbal cuando la confianza de identidad es baja.
- Conversacion libre que rehace OCR o matching por intuicion en lugar de llamar a herramientas estructuradas.

## Flujos propuestos

### 1. Foto con varias botellas

1. El usuario captura o elige la foto y puede indicar `Para mi` o `Servicio`.
2. Matchrim ejecuta quality gate, regiones, OCR, matching, deduplicacion y afinidad individual.
3. La imagen conserva solo contornos y pins numerados; la lista muestra estados y ranking.
4. Al seleccionar un pin dudoso, aiRIM explica la duda y ofrece candidatos, correccion manual o reanalisis de esa region.
5. Con dos o mas vinos confirmados, aiRIM resume la mejor opcion segura, una exploratoria y una de valor, sin fusionar confianza y afinidad.

### 2. Carta o pizarra para servicio

1. Tras enderezar y estructurar el documento, el usuario anade plato, presupuesto y copa/botella si son relevantes.
2. Matchrim aplica filtros y mantiene sincronizados pins, lista y secciones.
3. aiRIM propone una shortlist de hasta tres vinos y explica cada eleccion con afinidad, disponibilidad en la carta, precio y confianza.
4. El sumiller puede pedir `Resumen para explicar en mesa`; la salida no anade datos no respaldados.
5. La correccion de una linea vuelve a puntuar solo los candidatos afectados.

### 3. Afinidad y aprendizaje

1. Desde el detalle, `Ver por que` abre coincidencias, fricciones, dimensiones, fuentes y dato faltante.
2. aiRIM permite cambiar entre una explicacion breve, didactica o de servicio sin alterar el calculo.
3. El usuario marca `Acerto/no acerto` en una dimension.
4. Antes de recordar el feedback, Matchrim muestra su alcance y permite usarlo solo en la sesion o en el perfil.
5. La siguiente recomendacion declara que dato aprendido influyo y permite deshacerlo.

## Arquitectura por capas

1. **Presentacion/personaje.** Componente compacto dentro de superficies existentes, con icono o retrato estatico, estado textual y acciones. Nunca es el unico canal para una recomendacion.
2. **Orquestacion.** Maquina de estados basada en eventos de producto: escaneo completado, region dudosa, comparador abierto, explicacion solicitada o feedback enviado. No interviene por temporizador ni por scroll.
3. **Herramientas.** Contratos tipados para deteccion de regiones, OCR/matching canonico, afinidad explicable, comparacion, filtros de carta, recomendacion y correccion. El modelo no inspecciona la foto directamente cuando existe resultado estructurado.
4. **Generacion.** Primero plantillas deterministas sobre datos existentes; modelo de lenguaje solo bajo demanda para resumir o adaptar el registro. Toda salida conserva ids, fuentes, confianza y abstenciones recibidas de las herramientas.
5. **Voz opcional.** STT/TTS desacoplados, con activacion explicita, transcripcion, pausa y audio nunca automatico. Se prioriza procesamiento del sistema/dispositivo cuando sea viable.
6. **Memoria.** Tres scopes separados: sesion, perfil Matchrim y, solo en una fase futura, AIRim transversal. Cada recuerdo registra origen, consentimiento, fecha, productos autorizados y borrado reversible.
7. **Observabilidad y coste.** Eventos de impresion, apertura, accion, descarte, utilidad, latencia, tokens y error. Los ids de vino y la confianza viajan estructurados; las fotos y el texto OCR no entran en telemetria general.

## Contrato minimo de respuesta

```ts
type AiRimGuidance = {
  trigger: 'uncertain_identity' | 'affinity_detail' | 'comparison' | 'menu_shortlist';
  subjectIds: string[];
  summary: string;
  evidence: Array<{
    claim: string;
    source: 'wine_record' | 'ocr' | 'inference' | 'learned_preference';
    confidence?: number;
  }>;
  missingData: string[];
  actions: Array<'confirm' | 'correct' | 'reanalyze' | 'compare' | 'show_alternatives'>;
  memoryUsed: Array<{ id: string; label: string; scope: 'session' | 'matchrim_profile' }>;
};
```

El contrato no permite que la capa de personaje cambie identidad canonica, bounding boxes, afinidad ni ranking. Solo puede explicar resultados o solicitar una accion que vuelva a ejecutar la herramienta propietaria.

## Privacidad y accesibilidad

- La guia completa debe funcionar sin imagen de avatar, animacion ni audio.
- Texto con Dynamic Type, reflow, contraste AA, foco logico y nombres VoiceOver para estado y acciones.
- `Reducir movimiento` elimina transiciones expresivas; no hay parpadeos ni lip-sync necesario.
- Voz siempre opt-in, con indicador persistente de microfono, transcripcion editable y borrado de audio.
- Las fotos no se usan para entrenar, personalizar el personaje ni crear memoria salvo consentimiento separado y explicito.
- Memoria visible por dato, con `No usar para mi perfil`, exportacion y borrado. La memoria AIRim no hereda permisos de Matchrim.
- La incertidumbre se expresa en texto, icono y etiqueta; nunca depende solo de color o tono de voz.
- Las acciones esenciales siguen disponibles como controles normales si la guia falla o esta desactivada.

## Opciones visuales

| Opcion | Descripcion | Valor | Riesgo/coste | Decision |
| --- | --- | --- | --- | --- |
| A. Firma contextual | Icono `aiRIM`, etiqueta y bloque textual integrado; sin rostro. | Maxima claridad y minimo ruido. | Bajo. | **MVP recomendado.** |
| B. Retrato estatico | Ilustracion pequena con 2-3 estados discretos dentro del drawer. | Puede mejorar reconocimiento y cercania. | Moderado; sesgo de autoridad y espacio movil. | Prototipo A/B despues del MVP A. |
| C. Personaje 2D animado | Gestos breves, sin lip-sync obligatorio. | Diferenciacion emocional potencial. | Movimiento, accesibilidad, bateria y mantenimiento. | P2 solo con evidencia. |
| D. Talking head realista/3D | Voz y sincronizacion facial. | Presencia alta, utilidad funcional baja. | Latencia, coste, uncanny valley, privacidad y distraccion. | No recomendado. |

Direcciones para B si se valida: ilustracion editorial de sumiller contemporaneo, sello abstracto basado en copa/perfil sensorial o retrato geometrico no humano. Debe evitar disfraz, genero o edad como autoridad, y no parecer una persona real que inspecciona la foto.

## MVP medible: guia aiRIM contextual

Alcance de experimento, solo en entorno seguro y bajo feature flag:

- Firma visual A, sin animacion ni voz.
- Cuatro triggers: identidad dudosa, detalle de afinidad, comparador y shortlist de carta.
- Respuestas deterministas desde contratos existentes; una variante puede probar resumen generado bajo demanda.
- Maximo una intervencion proactiva por decision y ninguna durante captura/analisis.
- Acciones estructuradas y cierre persistente por sesion.
- Telemetria sin foto ni OCR: impresion, apertura, accion, descarte, resultado, utilidad, latencia y coste.
- Prueba moderada con 8-12 participantes repartidos entre usuario general, aficionado y sumiller antes de cualquier build publico.

### Criterios de aceptacion

- Ninguna intervencion tapa imagen, carta, pins, filtros, comparador o CTA principal en retrato, paisaje y Dynamic Type.
- La guia nunca contradice identidad, confianza, fuentes o score estructurado.
- Con identidad insuficiente se abstiene y ofrece corregir/reanalizar; no recomienda ese objeto como vino confirmado.
- La misma decision puede completarse con la guia cerrada o desactivada.
- VoiceOver permite descubrir, abrir, recorrer acciones y cerrar el bloque sin perdida de foco.
- El feature flag desactiva presentacion, generacion y llamadas incrementales sin afectar el pipeline Matchrim.

## Metricas de exito y guardrails

Metas iniciales de experimento, no compromisos de produccion:

| Metrica | Senal de exito |
| --- | --- |
| Finalizacion de decision asistida | +10% relativa frente al flujo sin guia. |
| Tiempo hasta eleccion con confianza | -20% mediano sin empeorar el p95 del escaneo. |
| Correccion de identidades dudosas | +15% relativa y menos abandonos tras duda. |
| Apertura de explicacion con accion posterior | Al menos 35% de quienes abren completan confirmar, comparar o elegir alternativa. |
| Utilidad declarada | Al menos 70% `Me ayudo`; feedback segmentado por persona y trigger. |
| Recurrencia | +8% relativa en usuarios que completan otra decision en 30 dias. |
| Descarte/silenciado | Menos de 25%; investigar cualquier trigger por encima de 35%. |
| Latencia incremental | Presentacion local p95 <100 ms; resumen generado p95 <2,5 s una vez listos los datos. |
| Coste incremental | Objetivo de hipotesis <= EUR 0,03 por decision asistida; voz = EUR 0 por defecto. |
| Guardrail de confianza | Cero recomendaciones sobre identidades abstain/no reconocidas y cero fuentes inventadas en QA. |
| Accesibilidad | 100% de los flujos MVP completables con Dynamic Type y VoiceOver basico. |
| Privacidad | 100% de memorias con scope/origen/borrado; cero foto, OCR o audio en analytics general. |

## Backlog aditivo

### P0-avatar: validar utilidad sin personaje animado

1. Definir taxonomia de triggers, estados, acciones y eventos sin modificar el backlog P0 operativo de Matchrim.
2. Mapear los contratos de deteccion, identidad, afinidad y comparador al `AiRimGuidance` minimo.
3. Prototipar la firma contextual A en Figma o harness local, no en produccion.
4. Preparar guiones de prueba para multibotella, carta/pizarra, comparador y afinidad con abstencion.
5. Validar el prototipo con 8-12 usuarios y medir comprension, tiempo, correccion, utilidad y descarte.
6. Redactar consentimiento, scopes de memoria, voz opt-in y comportamiento con guia desactivada.
7. Gate: no pasar a P1 si no mejora decision/correccion o si aumenta el abandono, la falsa confianza o el tiempo total.

### P1-avatar: experimento funcional Matchrim-only

1. Implementar bajo feature flag el bloque textual integrado y las acciones estructuradas.
2. Usar plantillas deterministas para duda, afinidad, comparacion y shortlist; evaluar resumen generado solo bajo demanda.
3. Anadir telemetria de utilidad, acciones, latencia y coste sin contenido sensible.
4. Anadir memoria de sesion y perfil Matchrim con opt-in, procedencia y deshacer.
5. Ejecutar A/B entre flujo sin guia, firma contextual y retrato estatico B.
6. Repetir QA visual movil, VoiceOver, red lenta/sin red, listas largas y fallo de generacion.

### P2-avatar: AIRim compartido solo tras evidencia

1. Definir un design kit comun de tono, estados, iconografia y reglas de abstencion sin imponer una UI unica.
2. Disenar federacion de herramientas por permisos; cada producto conserva sus contratos y ownership.
3. Prototipar memoria transversal con consentimiento por producto, vista de datos y revocacion granular.
4. Evaluar voz opcional y retrato estatico; animacion 2D solo si existe mejora medible de uso recurrente.
5. Excluir talking head 3D/realista salvo que una investigacion futura pruebe un job no cubierto por texto, controles o audio simple.

## Gate Matchrim-only vs AIRim compartido

Mantener Matchrim-only mientras la guia no alcance simultaneamente utilidad >=70%, mejora de finalizacion >=10%, guardrails de confianza/accesibilidad completos y coste dentro del objetivo durante al menos dos cohortes. AIRim compartido solo avanza si dos productos tienen jobs repetidos reales, el usuario comprende que memoria se comparte y la reutilizacion reduce esfuerzo sin diluir la especializacion.

La ventaja defendible no es un avatar. Es la capacidad de explicar, con datos Winerim y preferencias consentidas, por que una botella concreta de una escena o carta encaja, que parte es incierta y que alternativa conviene. El personaje solo merece existir si hace esa capacidad mas facil de usar.
