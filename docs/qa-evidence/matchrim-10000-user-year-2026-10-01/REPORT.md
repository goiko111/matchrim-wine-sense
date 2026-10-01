# Matchrim - simulación sintética de 10.000 usuarios durante un año

Fecha: 2026-10-01

## Dictamen

Esta es una auditoría longitudinal **sintética**, no un estudio con 10.000 personas reales. Sirve para encontrar defectos del algoritmo, medir aprendizaje, comparar estrategias y preparar un piloto humano. No demuestra por sí sola satisfacción, retención ni intención de compra.

- Usuarios sintéticos: 10.000.
- Periodo: 365 días.
- Decisiones simuladas: 421.722.
- Valoraciones explícitas: 287.675 (68.21% de los eventos).
- Tiempo local total: 58.08 s.
- Producción, Supabase, proveedor de visión y datos personales: **0 llamadas / 0 escrituras**.
- Huella determinista: `4b823fcdc41dbeb202c97bf073a07c7bcd77a8cf65a74ff092c31683d640440c`.

## Inteligencia de recomendación

| Estrategia | Precision@5 | Recall@5 | NDCG@5 | Hit@1 | Regret medio | MAE afinidad |
|---|---:|---:|---:|---:|---:|---:|
| popularity | 19.54% | 19.54% | 19.35% | 18.60% | 27.50 | n/a |
| onboarding | 65.51% | 65.51% | 68.53% | 77.69% | 6.57 | 10.5598 |
| hybrid | 66.81% | 66.81% | 69.90% | 79.30% | 6.14 | 10.8955 |
| candidate | 66.81% | 66.81% | 69.90% | 79.30% | 6.14 | 10.3749 |
| oracle | 100.00% | 100.00% | 100.00% | 100.00% | 0.00 | 0 |

- Mejora NDCG del híbrido frente a popularidad: 50.55%.
- Mejora NDCG del híbrido frente al test inicial: 1.37%.
- Cambio NDCG del candidato frente al híbrido actual: 0.00%.
- Cambio MAE de afinidad del candidato: -0.52 puntos.
- Cambio de calibración del candidato: -1.28%.
- Detección de deriva: precision 46.67%, recall 0.77%, falsos positivos 0.20%.
- Brecha NDCG restante frente al oráculo: 30.10%.
- Falsa confianza del híbrido: 1.53%.
- Segmento con menor NDCG híbrido: **novice** (62.65%).

La calibracion por confianza conserva el ranking y reduce el error de afinidad; puede avanzar a regresion de producto y paridad Edge. La recencia adaptativa queda rechazada porque la señal de deriva no separa perfiles estables y cambiantes con recall suficiente.

## Aprendizaje del perfil

| Valoraciones disponibles | Usuarios observados | RMSE medio | RMSE p90 |
|---:|---:|---:|---:|
| 0 | 10.000 | 0.697 | 1.109 |
| 1 | 9998 | 0.630 | 1.000 |
| 3 | 9932 | 0.599 | 0.956 |
| 5 | 9429 | 0.576 | 0.922 |
| 10 | 6899 | 0.511 | 0.783 |
| 25 | 4048 | 0.482 | 0.723 |
| 50 | 1695 | 0.459 | 0.688 |

El RMSE compara el perfil aprendido con el gusto latente sintético en escala 0-5. La cohorte incluye contradicciones, valoraciones omitidas y deriva gradual de gusto desde el día 180 en 1828 perfiles.

## QA funcional incluido

- Aislamiento de los 10.000 historiales en memoria; cada agente solo aprende de sus propias valoraciones previas.
- Orden cronológico sin fuga de señales futuras.
- Eventos sin valoración no entrenan el perfil.
- Presupuesto y ocasión alteran la decisión real, pero no contaminan las cinco dimensiones persistentes.
- Recomendación y feedback reproducibles mediante semilla fija.
- Métricas mensuales, por segmento y por estrategia exportadas para regresión.
- Latencia del algoritmo p50/p95/p99: 0.02575 / 0.07112 / 0.09133 ms.

La navegación, accesibilidad, escáner, cartas, errores y layout móvil se validan además con la suite funcional/visual existente; este motor no sustituye esas pruebas.

## Límites

1. Los comportamientos son agentes matemáticos y heredan las hipótesis del simulador.
2. El modelo actual aprende cinco ejes; no aprende todavía uva, región, madera, familias aromáticas ni ocasión.
3. OCR, detección e identidad se mantienen en el benchmark independiente de reconocimiento.
4. Para afirmar valor humano se necesita un piloto consentido y longitudinal con usuarios reales.
