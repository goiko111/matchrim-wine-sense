# Matchrim: revisión de producto con 100 usuarios simulados (28-oct-2026)

## Resumen

Matchrim promete decirte si un vino te va a gustar, cuánto y por qué. Para comprobarlo hemos hecho tres cosas:

- **Simulación:** 100 usuarios sintéticos e independientes usan la app durante 12 semanas sobre las **200 etiquetas reales** del paquete Winerim. Hacen el quiz, escanean, guardan en Bodega y valoran. La simulación llama a las funciones reales de la app.
- **Competencia:** la hemos comparado con Vivino, Oeni, Preferabli, CellarTracker y Sommo (ver [benchmark](MATCHRIM_BENCHMARK_284_2026-10-28.md)).
- **Mejoras:** hemos corregido lo que se ha podido corregir.

Conclusión en una frase: **el diseño de la app es honesto y el quiz da un buen punto de partida, pero hoy el «encaje» no funciona con vinos reales**. El catálogo no tiene datos de sabor respaldados, el reconocimiento solo deja buscar la ficha en una de cada cuatro etiquetas y, además, el aprendizaje a partir de las valoraciones tenía un defecto. Esto último ya tiene un arreglo probado en simulación.

## Qué hemos medido

Todo lo que sigue se ha hecho en el Mac, sin cuentas, sin red, sin llamadas de pago y sin escribir en producción. Las 200 imágenes, su OCR en el móvil (Apple Vision) y las 19 fichas guardadas del catálogo son reales. Las personas, sus respuestas, sus valoraciones y los valores de sabor del brazo B son **sintéticos**, así que estas cifras no miden la precisión del gusto real. Recibos: [RESULT](../qa-fixtures/users284/RESULT.json), [semillas](../qa-fixtures/users284/SEEDS.json), [100 usuarios](../qa-fixtures/users284/USERS.json) y [script](../scripts/simulate-matchrim-users284.ts).

### Brazo A: la app tal como está hoy, con datos reales

| | Resultado |
|---|---|
| Etiquetas con texto legible por OCR | 198/200 |
| Etiquetas en las que la app **admitiría buscar la ficha**, aun suponiendo que identifica bien el vino | **56/200 (28 %)** |
| Las mismas, contadas sobre los 3.636 escaneos de los 100 usuarios | 1.019 (28 %) |
| Etiquetas excluidas por no ser vino (vermut) | 1/200 |
| Fichas reales guardadas con algún eje utilizable para afinidad | **0/19** |
| Escaneos en los que se muestra afinidad | **0** |
| Valoraciones que enseñan algo al perfil | **0** |

Por qué ocurre:

- **Búsqueda de la ficha.** La app solo la busca si el OCR muestra todas las palabras distintivas del nombre y de la bodega. En el 72 % de las etiquetas falta alguna: logotipos, tipografías o texto vertical.
- **Identificación.** El OCR por sí solo no identifica el vino. El nombre lo aporta el reconocimiento por IA, que es de pago, o la corrección del usuario.
- **Datos de sabor.** Las fichas reales del catálogo no los traen respaldados: 15 de 19 no tienen filas y las 4 que sí tienen no indican la fuente.
- **Resultado.** La afinidad siempre sale «Sin calcular» y valorar en Bodega no cambia nada.

### Brazo B: el motor de gustos con datos completos (sintéticos)

Los mismos 100 usuarios, con 199 vinos a los que se dan valores de sabor de 0 a 5 según su estilo. Cada usuario tiene un gusto «real» oculto. Ese gusto **no** sigue la fórmula de la app: tiene pesos propios por eje, aversiones (por ejemplo, «odio el tanino») y ruido. Cada uno hace unas 22 valoraciones en 12 semanas.

| | Semana 0 (solo quiz) | Semana 12, regla actual | Semana 12, regla corregida |
|---|---|---|---|
| Error del perfil frente al gusto real (0–5) | 0,91–1,01 | 0,96–1,04 (**empeora**) | **0,74–0,83** |
| Usuarios cuyo perfil mejora / empeora | — | 29–35 / 37–44 | **84–89 / 0–1** |
| De 3 vinos recomendados, % que el usuario adoraría | 54–66 % | 54–66 % (sin cambio) | **60–68 %** |
| La misma cifra si se recomendara al azar | 14–17 % | | |
| La misma cifra con un perfil perfecto | 88–90 % | | |

*Rangos con 4 semillas. «Regla corregida» es la regla «sorpresa»; la regla «solo atracción» da resultados prácticamente iguales.*

Hallazgos:

1. **El quiz funciona como punto de partida.** Sin ninguna valoración, la app ya recomienda bien entre 3 y 4 veces más que el azar.
2. **El aprendizaje actual no mejora y a veces empeora.** Cuando el usuario marca un vino como «no es para mí», la app aleja su perfil de ese vino en **todos** los ejes, y más cuanto **más distinto** es el vino.
   - Ejemplo: a un amante de tintos potentes no le gusta un blanco fresco, y la app le empuja aún más hacia potencia y tanino, hasta pasarse de su gusto. Su error sube de 1,04 a 1,25.
   - Es decir, aprende sobre todo de rechazos que ya eran previsibles.
3. **La regla corregida** solo deja que un rechazo mueva el perfil si la app esperaba que el vino gustara. Es lo que llamamos sorpresa. Con ella mejora el 84–89 % de los usuarios y no empeora prácticamente ninguno.
4. **Límite de la fórmula.** Los perfiles con una aversión fuerte o con un solo eje dominante encajan peor. Por ejemplo, para el grupo «evita tanino» el top‑3 baja del 53 % al 44 % con la regla actual. La afinidad trata los 5 ejes por igual y no sabe qué es lo que el usuario no soporta.

## Qué debería tener Matchrim y cómo debería funcionar

Ordenado por impacto. Junto a cada punto se indica en qué se apoya: la simulación (S), la competencia (C) o el estado actual (E).

### Imprescindible para que el encaje funcione

1. **Datos de sabor respaldados para los vinos que la gente escanea (S, E).**
   - Sin ellos no hay afinidad ni aprendizaje, y el resto de mejoras no se notan.
   - La «fase A» de desarrollo los obtendría separando el dato documentado de su conversión a 0–5.
   - Coste estimado por desarrollo: unos 0,02 USD por vino, sin contar reintentos ni revisión humana y sin techo verificable. Para las 200 referencias del paquete sería del orden de 4 USD de búsqueda e IA.
   - **Es decisión de Goiko.** No es un presupuesto aprobado.
2. **Corregir el aprendizaje antes de que entren datos reales (S).**
   - Hay que aplicar la regla «sorpresa» en el aprendizaje nativo, con pruebas propias y una nueva QA.
   - Es un cambio solo en el cliente nativo; ni la web ni el backend se tocan.
3. **Reconocimiento que no dependa de leer cada palabra (S, C).**
   - Hoy la búsqueda solo se admite en el 28 % de las etiquetas.
   - Propuesta:
     - Cuando no se admita la búsqueda automática, ofrecer **«¿Es alguno de estos?»** con candidatos de la búsqueda explícita.
     - Mantener **«Corregir vino y añada»** a un toque, como Preferabli y CellarTracker.
     - Medir cuántas etiquetas quedan resueltas por el usuario.

### Imprescindible para la experiencia

4. **Cuando no haya afinidad, decir por qué y qué hacer (C, E).**
   - Matchrim ya distingue entre identidad, añada, ficha, perfil y datos de sabor; hay que mantenerlo.
   - Es la mayor ventaja frente a Vivino, que solo dice «sigue valorando».
5. **Separar «qué vino es» de «cuánto te gustará» (C).** Por ejemplo: «Identificado: X · añada sin confirmar», y solo después la afinidad.
6. **Explicar el porqué con los 5 ejes (C).** Por ejemplo: «Encaja en cuerpo y acidez; es más tánico de lo que sueles preferir». Vivino no explica nada y los usuarios de CellarTracker valoran que se lo expliquen.
7. **Definir qué significa el número (C).** Usar bandas (alta, media, baja) y mostrar solo la banda cuando la confianza sea baja.
8. **Hacer visible el aprendizaje (C, S).** Por ejemplo: «Tras tus últimas valoraciones, tu perfil se ha movido hacia más acidez; han cambiado 3 recomendaciones». Ninguna app de la competencia lo enseña.
9. **Avisar cuando se pida un vino (C).** «Pedir este vino a Winerim» y avisar al usuario cuando su ficha tenga datos. Winerim controla el catálogo; la competencia no avisa.
10. **Preguntar por las aversiones (S).** Una pregunta en el quiz o tras un rechazo, del tipo «¿qué no soportas: tanino, dulzor, acidez…?», que se use como penalización explícita.

### Deseable

11. **Valoración en 4 niveles** (me encanta, me gusta, regular, no es para mí), con colores y textos bien distintos (C).
12. **En la carta,** ordenar solo los vinos con datos y listar el resto como «sin datos», sin ocultarlos (C).
13. **Bodega con ventana de consumo** que indique de dónde sale ese dato (C).
14. **Privacidad como argumento:** el OCR se hace en el móvil y no hay rastreo. Permitir saltar el quiz y retomarlo después (C).
15. **Vermut y fortificados:** hoy se excluyen a propósito. Hay que decidir si Matchrim los cubre (E).

## Qué hemos mejorado o comprobado hoy

| | Estado |
|---|---|
| Texto de añadas: «datos solo de 2024» ya no se presenta como «ficha sin datos» (`6aa4bda`) | Hecho, con pruebas (6/6) |
| Escenario nativo para la 020 (botella 2000, ficha 2020) en el simulador (`f9daa19`) | Hecho; pendiente de ejecutar en el 127 |
| Runners de compilación y QA con identidad propia, sin usurpar la de Codex (`493cf3a`, `dcf36b7`) | Hecho, con pruebas (5/5) |
| Contrato rev3 de desarrollo validado con nuestro Ajv (`f45b373`) | 43/43 |
| Simulación de 100 usuarios con las 200 etiquetas | Hecha (esta revisión) |
| Defecto del aprendizaje y regla corregida | Probada en simulación; **pendiente de implementar** en el producto |
| Candidato 127: pruebas de simulador (escenarios 259 y 283, normal y MAX) y subida única a TestFlight | Subido y aceptado por Apple (28-oct 12:14); procesamiento pendiente de confirmar |

## Qué no hemos hecho y por qué

- **100 cuentas reales en TestFlight.**
  - No se han creado cuentas en el backend de producción: meterían datos falsos en producción y crear cuentas queda fuera de lo que puedo hacer.
  - Para pruebas con muchas cuentas reales hace falta un entorno de pruebas (staging) de desarrollo.
  - El iPhone se usará para la build de TestFlight y para pruebas reales de cámara y galería.
- **Probar Vivino y Oeni en el móvil.** No puedo manejar apps de terceros en tu iPhone. El análisis se ha hecho con fuentes públicas.
- **Leer las fichas 21–200 del catálogo.** Necesita tu autorización: son 180 lecturas gratuitas.
- **Precisión del gusto real.** Ninguna simulación la demuestra. Hace falta una prueba con personas reales y los vinos que realmente prueban.

## Decisiones que necesito de Goiko

1. ¿Autorizas leer las fichas 21–200 (180 lecturas gratuitas, 0 €)?
2. ¿Encargamos la fase A para las 200 referencias del paquete (orden de 4 USD estimado, sin techo verificable) o para un primer lote de 20?
3. ¿Implemento ya la regla «sorpresa» del aprendizaje para el candidato 128?
4. ¿Matchrim debe cubrir vermut y fortificados?
5. ¿Subo los commits locales?
