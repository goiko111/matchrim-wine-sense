# Goal Matchrim 286: reconocer el 100 % de lo que Winerim ya tiene y que el encaje aprenda

## Objetivo

Toda foto de una botella o etiqueta de un vino que ya existe en Winerim termina en su ficha de Winerim. Lo hace sola cuando hay seguridad, o con un máximo de 3 toques. A partir de ahí:

- Matchrim calcula el encaje con los atributos 0–5 de Winerim de esa añada.
- Cada valoración en Bodega ajusta el perfil con la regla sorpresa, en los dos sentidos.

## Por qué

- **Atributos:** la API de Winerim ya devuelve los atributos 0–5 de cada vino publicado (136/136 en la carta de Plaza Blanca).
- **Reconocimiento:** el cuello de botella está en la app. Hoy solo busca la ficha si el OCR lee todas las palabras del nombre y de la bodega, y eso pasa con el 13 % de la carta y el 28 % del paquete de 200.
- **Lo que se ha medido:** ordenar los vinos conocidos por lo que el OCR sí lee da:
  - Carta: 84 % de aciertos a la primera y 94 % entre las 3 primeras.
  - Paquete de 200: 89,5 % y 94 %.

  Es un experimento sin conexión, en `qa-fixtures/retrieval286/`.

## Métricas de éxito

| Métrica | Objetivo |
|---|---|
| Vinos de la carta y del paquete de 200 que llegan a su ficha | **100 %**, en 3 toques o menos |
| Acierto a la primera / entre las 3 primeras (carta y paquete) | ≥ 85 % / ≥ 95 % |
| Precisión de la confirmación automática (sin preguntar) | ≥ 99 %: si hay duda, se pregunta |
| Acierto entre las 3 primeras contra el catálogo completo de Winerim (paquete de 200) | ≥ 80 %, primero hay que medirlo |
| Fotos reales con el iPhone (al menos 50, en mano o en restaurante) | Mismas métricas, medidas y anotadas |
| Vinos identificados que muestran encaje, si su ficha tiene atributos | 100 % |
| Encaje calculado con datos de otra añada | 0 |
| Valoraciones de vinos identificados que entrenan el perfil | 100 % |
| Paquete de 200 publicado en Winerim con atributos 0–5 | 200/200 (le toca a desarrollo) |

## Fases

1. **Build 128.** El código ya está hecho: regla sorpresa en los dos sentidos y uso de los atributos 0–5 de Winerim. Falta compilar, pasar la QA del simulador en normal y MAX, y subirla a TestFlight.
2. **Reconocimiento por candidatos (129).** Todo se hace en el móvil y sin coste:
   - Ampliar 2× el recorte de la etiqueta antes del OCR.
   - Ordenar los candidatos por lo que se lee, tolerando errores de lectura, conectores («et», «d'») y alias de bodega.
   - Buscar en este orden: carta del restaurante, Bodega del usuario y catálogo de Winerim.
   - Confirmar sin preguntar solo si el primer candidato saca clara ventaja al segundo.
   - Si no, preguntar «¿Es alguno de estos?» con las 3 fotos de Winerim, desempatando entre hermanos de la misma bodega por la foto.
   - Último recurso: la lista completa ordenada, con buscador.
3. **Medir contra el catálogo completo.** Usar el buscador público de Winerim con las 200 etiquetas: unas 200–400 lecturas gratuitas, que necesitan el OK de Goiko.
4. **Prueba real en el iPhone.** Al menos 50 fotos reales y un informe con las métricas de arriba.
5. **Lado de desarrollo y datos de Winerim:**
   - Publicar y completar los atributos de los vinos del paquete que aún no están publicados.
   - Crear una tabla de alias de bodega y grupo (por ejemplo «Oremus - Vega Sicilia» o «Do Ferreiro (Bodegas Gerardo Méndez)»).
   - Llevar la regla sorpresa a la copia del servidor que usan el chat y el maridaje.

## Límites

- **Sin coste:** ningún modelo de pago ni subida de fotos del usuario. El OCR y la comparación visual se hacen en el móvil.
- **Web y backend:** no se tocan desde aquí. Lo del servidor se le pide a desarrollo.
- **Con OK expreso:** escrituras en producción, push, despliegues, subidas a TestFlight y correos.
- **Pruebas:** con cuentas sintéticas y sin red en el simulador. En el iPhone, sin tocar los gustos reales del usuario.

## Hecho cuando

- Hay una build en TestFlight con el flujo de candidatos, con la QA del simulador superada en normal y MAX.
- Existe un informe con las métricas en el paquete de 200, en la carta de Plaza Blanca, contra el catálogo completo y con las fotos reales del iPhone.
- Todas las métricas cumplen su objetivo, o cada desviación tiene su causa y su siguiente paso.

## Estado a 28-oct, 16:45

- Fase 1: código en commits locales (`41e886e`, `f41b11e`), sin compilar porque la CPU estaba ocupada.
- Fase 2: medida sin conexión (`3928880`), sin implementar.
- Fases 3–5: pendientes.
