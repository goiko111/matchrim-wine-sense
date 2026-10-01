# Matchrim - QA funcional e inteligencia, 10.000 perfiles / 365 dias

Fecha: 2026-10-01

Base: Matchrim 1.0 (67) + cambios locales posteriores

Semilla: `10012026`
Huella determinista: `dde60e2b940ab06f9d83580cb56b8c8fda2cb3cc94251ed47d0b5103f6923f`

## Dictamen

La simulacion anual se completo con 10.000 agentes sinteticos, 421.722 decisiones y 287.675 valoraciones explicitas. No son 10.000 personas reales: es una auditoria determinista del algoritmo actual, ejecutada localmente y sin cuentas, PII, Supabase, vision ni trafico de produccion.

El aprendizaje aporta valor, pero todavia no justifica presentar la afinidad como una prediccion fuerte:

- mejora NDCG@5 de `0,6853` a `0,6990` frente al test inicial;
- mejora Hit@1 de `77,69%` a `79,30%`;
- reduce recomendaciones claramente rechazables de `2,06%` a `1,72%`;
- reduce el error del perfil de `0,6971` a `0,4587` tras 50 valoraciones;
- empeora ligeramente la calibracion numerica: MAE `10,90` puntos frente a `10,56` del test inicial;
- pierde rendimiento desde el mes 8 cuando el gusto cambia de forma sostenida.

Funcionalmente, las suites automatizadas, el recorrido visual nativo y el build iOS pasan. Se corrigieron dos defectos encontrados durante esta sesion: aiRIM no estaba en la barra principal nativa y el control central Escanear quedaba recortado en paisaje.

El gate de TestFlight no se reabre solo con estos resultados. El replay real de vision sigue fallando en multietiqueta (`50,00%` precision, `88,89%` recall) y menu de comida (`24,07%` recall).

## Cohorte sintetica

| Medida | Resultado |
|---|---:|
| Usuarios | 10.000 |
| Dias | 365 |
| Decisiones | 421.722 |
| Media de decisiones por usuario | 42,17 |
| Valoraciones explicitas | 287.675 |
| Eventos con feedback | 68,21% |
| Usuarios con deriva de gusto | 1.828 |
| Usuarios que alcanzan el criterio de aprendizaje | 8.244 (82,44%) |
| Tiempo total local | 34,497 s |
| Memoria residente maxima | 169,8 MB |

Segmentos: principiante, casual, aficionado, coleccionista y sumiller. Cada agente tiene un gusto latente de cinco ejes, respuestas iniciales con ruido, presupuesto, ocasion, frecuencia de uso, probabilidad de valorar y, en el 18,28%, cambio gradual de gusto desde el dia 180.

## Estrategias comparadas

| Estrategia | Precision@5 | NDCG@5 | Hit@1 | Regret | Correcta | Rechazable |
|---|---:|---:|---:|---:|---:|---:|
| Popularidad | 19,54% | 19,35% | 18,60% | 27,50 | 31,61% | 36,59% |
| Solo test inicial | 65,51% | 68,53% | 77,69% | 6,57 | 83,76% | 2,06% |
| Matchrim actual | 66,81% | 69,90% | 79,30% | 6,14 | 84,61% | 1,72% |
| Oraculo de evaluacion | 100% | 100% | 100% | 0 | 99,08% | 0% |

El oraculo conoce el gusto latente, el presupuesto y la ocasion; nunca entrena ni informa al modelo Matchrim. Sirve solo como techo de evaluacion. La brecha NDCG restante es `0,3010`: la mayor oportunidad no esta en popularidad, sino en incorporar contexto de decision sin convertirlo en gusto permanente.

## Aprendizaje y calibracion

| Valoraciones | Usuarios observados | RMSE medio | RMSE p90 |
|---:|---:|---:|---:|
| 0 | 10.000 | 0,6971 | 1,1090 |
| 1 | 9.998 | 0,6299 | 1,0004 |
| 3 | 9.932 | 0,5993 | 0,9560 |
| 5 | 9.429 | 0,5758 | 0,9217 |
| 10 | 6.899 | 0,5111 | 0,7826 |
| 25 | 4.048 | 0,4823 | 0,7231 |
| 50 | 1.695 | 0,4587 | 0,6884 |

La direccion del aprendizaje es correcta y continua mejorando hasta 50 valoraciones. Sin embargo, la afinidad superior recomendada pasa de `88,98%` a `90,77%`, mientras el MAE aumenta. El ranking mejora, pero el porcentaje se sobreexpresa. Debe calibrarse por confianza, volumen, contradiccion y calidad de ficha.

La NDCG mensual sube hasta `0,7115` en el mes 7 y cae a `0,6841-0,6869` entre los meses 10 y 12. Coincide con la cohorte que cambia de gusto: el suelo de peso historico y la mezcla maxima actual hacen que la correccion sea lenta.

El segmento mas debil es principiante: NDCG@5 `0,6265`, Hit@1 `70,15%`, MAE `11,39` y falsa confianza `2,61%`. Sumiller alcanza NDCG@5 `0,7230` y Hit@1 `82,30%`, principalmente por mas feedback y un test inicial menos ruidoso.

## QA funcional

| Gate | Resultado |
|---|---|
| Unitarios y contratos | PASS |
| Regresion anual determinista | PASS, 3.673 eventos ejecutados dos veces con igual huella |
| TypeScript | PASS |
| ESLint `--quiet` | PASS, 0 errores |
| Build web produccion | PASS |
| Capacitor copy iOS | PASS |
| Xcode 26.0.1, iOS Simulator 26.0 | PASS, `BUILD SUCCEEDED` |
| 25 perfiles UI aislados | 25/25 PASS |
| Navegacion nativa | PASS: Inicio, aiRIM, Escanear, Bodega, Perfil |
| Multietiqueta con fixture local | PASS de flujo y layout, no de precision OCR |
| Cuatro cartas/pizarras | PASS en retrato/paisaje con fixtures locales |
| Comparador 2-5 | PASS, vistas Escena/Vinos/Comparar no se amontonan |
| aiRIM y ocasiones | PASS |
| Overflow y consola | PASS |

Correcciones de esta sesion:

1. `aiRIM` sustituye a `Explora` en la barra principal de la app nativa. Explorar sigue accesible desde Inicio y las recomendaciones.
2. El tab central Escanear se compacta en paisaje y el test valida que su bounding box queda completamente dentro de la barra.
3. La puntuacion de afinidad usada por producto se exporta y reutiliza directamente en la simulacion; no hay una formula paralela.
4. La simulacion pequena determinista se incorpora a `npm test`.

## Gates pendientes

### P0 - inteligencia

- Calibrar el porcentaje: el ranking aprendido mejora, pero el MAE de afinidad no.
- Adaptar el peso temporal a cambios sostenidos y mostrar una confianza menor durante una transicion.
- Reordenar por contexto efimero (plato, presupuesto, copa/botella, ocasion) sin escribirlo en el perfil estable.
- Mantener abstencion cuando la identidad o ficha sensorial no soportan el score.

### P0 - vision real

- Multietiqueta: subir precision real de `0,50` a `>=0,90` sin bajar recall de `0,8889`.
- Cajas: subir precision normalizada de `0,8438` a `>=0,90` manteniendo recall `>=0,90`.
- Menu de comida: desplegar el candidato de segmentacion y repetir las 54 lineas; el replay actual conserva recall `0,2407`.

### P1 - validacion humana

- Piloto consentido con usuarios reales y vinos realmente probados.
- Medir acierto declarado, cambio de eleccion, confianza, repeticion, retencion y disposicion a pagar.
- Comparar el porcentaje mostrado con la experiencia real; una simulacion no puede validar satisfaccion ni gusto humano.

## Evidencias

- Estudio completo: `docs/qa-evidence/matchrim-10000-user-year-2026-10-01/summary.json`.
- Informe generado: `docs/qa-evidence/matchrim-10000-user-year-2026-10-01/REPORT.md`.
- Metricas mensuales, segmentos y aprendizaje: CSV en el mismo directorio.
- Auditoria de 100 perfiles: `profile-audit-100.csv`.
- QA funcional nativo: `functional-native/results.json` y capturas asociadas.
- QA de 25 perfiles: `persona-ui/ui-results.json` y capturas seleccionadas.

## Reproduccion

```bash
npm run qa:simulation:year
npm test
npm run typecheck
npx eslint . --quiet
npm run build
```

La simulacion completa queda separada de vision. No debe usarse para maquillar los falsos positivos del OCR ni para afirmar que participaron 10.000 personas.
