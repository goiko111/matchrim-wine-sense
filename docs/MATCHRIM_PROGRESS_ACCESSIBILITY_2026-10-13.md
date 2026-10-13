# Matchrim: progreso y mediciones accesibles

## Resultado

Continuacion humana desde `eac41777fb3817446b4d2c5ce33c7deea6384335`. Corregido el hallazgo16: la barra dibujaba el porcentaje pero siempre exponia estado indeterminado, sin aria-valuenow. Ahora Root recibe value, ocho usos tienen nombres contextuales y cuatro mediciones estaticas usan meter.

Solo13 atributos JSX en8 archivos:1forwarding,8nombres,4roles. Sin cambios de porcentajes, calculos, modelos, identidad, perfiles, matching, budgets, recortes, cancelacion, guardado, estilos o animacion. AST completo de cada modulo igual al baseline al retirar esos atributos; los arreglos15/16 permanecen intactos.

## Antes Y Despues

| Before | After | Why |
| --- | --- | --- |
| Barra visible24/42/100 sin valor accesible, siempre indeterminate. | aria-valuenow24/42/100, texto porcentual y estado loading/complete. | Reenviar el valor real a Radix Root, sin modificarlo. |
| Ocho usos sin nombre contextual. | Nombre de tarea, confianza o afinidad; Bodega distingue el vino por nombre. | El lector puede identificar que representa cada indicador. |
| Afinidad/confianza presentadas como progreso de tarea. | Cuatro indicadores estaticos con rolemeter; tareas siguen como progressbar. | Distinguir medicion acotada de avance de una operacion. |
| Valor ausente o null sin porcentaje. | Sigue indeterminado y sin aria-valuenow; no se inventa cero. | No dar certeza falsa cuando falta un dato. |
| Mismo diseno antes del arreglo. | PNGs de componentes identicos byte a byte en ambas orientaciones. | Cambio semantico, no redisenyo ni variacion de geometria/color. |

El forwarding sigue la [API oficial de Radix Progress](https://www.radix-ui.com/primitives/docs/components/progress); la distincion de mediciones estaticas sigue el [patron meter de W3C](https://www.w3.org/WAI/ARIA/apg/patterns/meter/). Tambien se verifico codigo/tipos de la dependencia realmente instalada1.1.0, sin actualizarla. AffinityExplanation custom ya usaba meter y no se modifico.

## Matriz De Pruebas

| Alcance | Expected | Actual |
| --- | --- | --- |
| Baseline previo a producto | Confirmar fallo en DOM y AX, no asumir por fuente. | 4contextos52/116checks: primitivas22/50 pororientacion yscanner4/8 pororientacion. Fallos de semantica; sin errores de ejecucion/consola. |
| Componente real aislado | Valores0/24/42/100/12.5, unknownnull/undefined, texto personalizado y8contextos de consumidor. |16vectores pororientacion,100/100checks DOM/AX/visual/bounds despues.42 es numero de prueba, no perfil o afinidad aprendida. |
| Cliente multietiqueta | Nombre y valor accesible en profile24/detect24/analyze42/ready100. |2rutas nuevas,16/16checks; una seleccion galeria porruta, teclado393x852/toque852x393. No repetir carreraA/B de16. |
| Pipeline de cliente | No cambiar peticiones, argumentos o recortes. | Porruta1GETperfilnull/1detect/4analyze/3search vacios; body/crop/image/query hashes iguales antes/despues. |
| Geometria y aspecto | No cambiar estilos o posiciones. |2PNGs de primitivas conSHA identico before/after; captura ready espera transicion y muestra barra llena. Sin desbordamiento horizontal enalcance. |
| Regresion de fuente | Solo13 atributos intencionados. |49/49checks AST/proteccion;40fuentes y1512evidencias05-16 intactas. |
| Typecheck | Compilacion de app y herramientas sin errores. |Fullapp typecheck0; tooling scoped0. |
| Lint | No errores o avisos nuevos. |0errores,10warnings any/hooks identicos al baseline, comparados porarchivo/linea/columna/regla/mensaje. |
| Build web | Build local reproducible sin modificar canal nativo. |Vite5.4.10,3633modulos,6.88s,exit0. ManifestSHA de146archivos; warnings previos Browserslist/chunks>500kB conservados. |
| Privacidad/red | No egress real, cuentas o escrituras. |HTTP/WS interceptados antesnav/fakeauth, SWblock/analyticsfalse.0remotoapp/proveedor/pagadas/RESTwrites/cuentasreales. |

Total despues:4/4contextos y116/116checks de navegador, ademas49/49checks AST/fuentes. No son116usuarios ni una certificacion de producto completa.

## Evidencias

[Paquete local](</Users/GOIKO/2matchrim76-recognition-20261008/docs/qa-evidence/matchrim-progress-a11y-2026-10-13/primary.json>):137entradasSHA,20PNG,52snapshots finales y48baseline. `source-stages.json`, `verification.json`, `lint-baseline-parity.json` y `web-build-manifest.json` enlazan fuente, resultados y compilacion.

137entradas y52fuentes verificadas tambien contra el index deGit antes de commit. Diff-check codigo/scripts/informe pasa; global conserva102avisos de whitespace previo solo en snapshots exactos. No limpieza ajena ni cambio de sus bytes/hashes.

PNGs primitivas portraitSHA`2024cde1ef8449dfaf9f458cf5bcf27b362e30755bb50be63f655a02f3a2fc54`; landscapeSHA`506ebdafe5567502bdbdc885ccd601d05c0adfcf54feef927915e214330ac395`. Igualdad before/after demuestra invariancia de esos renders, no todas las pantallas de la app.

Runtime, payloads y canario son los existentes: fotografia CC0 de menu-comida SHA9980c5e6b9d5e52f1783e2f26d1a97e22c0c2e1556e9e72919dd26fc34ece9a9 y contrato MULTI de candidate/function_response extraido solo porAST, sin importar entrypoints/descargar/materializar. Es preprocessing/lifecycle, NO fotografia de cinco botellas ni reconocimiento real. Canonica vacia yperfilnull; afinidad/identidad reales no validadas en este bloque.

Los16vectores usan el componente real porSSR y atributos contextuales leidos del codigo, pero no montan pantallas reales de Perfil/Bodega/CSV con cuentas completas. El cliente de escaneo si ejecuta su pipeline con stubs. AX es arbol computado deChrome, no VoiceOver/Safari/iPhone ni anuncio audible certificado. SelectorFileChooser porUI/protocolo, no gateOS/iOS resuelto.

## Reproduccion Y Gate

Desde el repo, generar salida nueva y ejecutar el harness local:

```bash
./node_modules/.bin/tsx --tsconfig tsconfig.app.json scripts/fixtures-matchrim-progress-a11y-oct13.tsx /tmp/matchrim-progress-local
/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim73-qa-20261007/.venv/bin/python /Users/GOIKO/.codex/skills/webapp-testing/scripts/with_server.py --server "VITE_MATCHRIM_QA_FIXTURES=false VITE_APP_ANALYTICS_ENABLED=false npm run dev -- --host 127.0.0.1 --port 4464 --strictPort" --port 4464 -- /Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim73-qa-20261007/.venv/bin/python scripts/qa-matchrim-progress-a11y-oct13.py --output /tmp/matchrim-progress-local
```

No suites verdes previas reejecutadas, simulacion de personas, nuevo dataset, proveedor real, build nativo/capcopy/firma, Apple, telefono, contactos, TestFlight, push o deploy. Webbuild local no publica ni cambia la web en produccion. La invitacion previa mantiene su gate independiente y sigue sin operarse aqui.

Siguiente evidencia a revisar, no arreglada por inercia: el contador de la fase analyzing muestra2de5 cuando hay una region candidata terminada y una diferida por legibilidad; incluye diferidas en el numerador. Conviene distinguir regiones revisadas/analizadas/sinanalizar antes de afirmar progreso preciso. Fuente ycapturas de search conservadas; no tocar scores o detector para corregir copy.
