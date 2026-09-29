# Matchrim 1.0 (65) - candidato movil

Fecha: 2026-09-29

## Alcance y procedencia

- Proyecto Lovable de origen: `7e9b6f66-d4ee-404a-8678-c9afab22de75`.
- La experiencia web se mantiene en `08e12fb` (`revert: restore previous Matchrim web experience`). No se publico ni se modifico Lovable en este ciclo.
- Candidato movil: rama `codex/matchrim-learning-airim-qa-20260928`, construido desde `4ab7e04` mas el incremento local de build y la evidencia de este informe.
- Bundle: `wine.matchrim.app`; version `1.0`; build `65`.
- Xcode: `26.0.1 (17A400)`; simulador iPhone 16 Pro con iOS 26.0/26.0.1.

## Build y firma

- Build de simulador: PASS.
- Instalacion y primer inicio limpio en simulador: PASS.
- Archive arm64: `/private/tmp/Matchrim-1.0-65.xcarchive`.
- Firma: Apple Development, equipo `8X3XTD6XYX`; identificador y version comprobados en el archive.
- El archive no se ha exportado ni subido a App Store Connect. No se presenta como candidato TestFlight aprobado.

## Gates ejecutados

| Gate | Resultado |
| --- | --- |
| Unitarios y contratos | PASS: clasificador, aprendizaje, perfiles, carta de comida, identidad de Bodega, multivino, 30 escenas controladas y 25 independientes |
| TypeScript | PASS |
| ESLint | PASS con 0 errores y 105 avisos existentes |
| Build web de produccion | PASS, 3.600 modulos; persiste el aviso conocido de chunks grandes |
| Suite visual multietiqueta/carta | PASS 27/27, consola limpia |
| Safe areas | PASS a 59 px superior y 34 px inferior simulados |
| Retrato/paisaje | PASS, sin overflow horizontal |
| Dynamic Type | PASS automatizado a 125% y pase manual en `accessibility-large` |
| Accesibilidad basica | PASS: nombres accesibles, dialogo identificado y objetivos tactiles >=44 px |
| Sin red, reintento y cancelacion | PASS |
| Archive firmado | PASS, `1.0 (65)` |

La suite detecto inicialmente un JPEG truncado durante la conversion HEIC dentro del sandbox. `sips` habia devuelto codigo 0 pero genero solo 3,6 KB y ninguna dimension valida. El preparador ahora rechaza conversiones menores de 100 KB con un diagnostico explicito; las copias validas locales son de aproximadamente 2,1-2,2 MB.

## QA visual y reconocimiento observado

| Material | Recorrido | Actual | Clasificacion |
| --- | --- | --- | --- |
| `IMG_7605 2.jpg` (expositor/nevera) | Galeria nativa -> calidad -> regiones -> detalle | 30 regiones, 52,2 s, 1,6 MP, brillo 91, contraste 67. Una region mostro deteccion 95% pero dos identidades al 55%, como `Dudoso`, con correccion, reanalisis y descarte disponibles. | Reconocimiento real observado; no certifica precision agregada |
| `IMG_7553 2.HEIC` (carta impresa) | Galeria nativa -> OCR -> lista/ranking | 29 vinos, aviso de cobertura parcial y lista legible sin texto sobre la imagen. Sin perfil, la UI pide completar el quiz en vez de afirmar afinidad personalizada. | Reconocimiento real observado; falta expected/actual por linea |
| Pizarra manuscrita publica | Galeria nativa -> OCR -> lista | 9 vinos, resultado legible y sin solapes. | Reconocimiento real observado sobre fixture publico |
| Cuatro HEIC aportados | Matriz Playwright, retrato/paisaje | Decodificacion, normalizacion, layout, filtros, zoom, drawer y comparador 2-5 pasan. | Contrato/UI con respuestas simuladas; no reconocimiento real |
| Cinco materiales aportados | Runner E2E reproducible | No ejecutado en lote: requiere autorizacion explicita para transmitir las imagenes al backend productivo de Matchrim y a su proveedor de vision. | Gate externo abierto |

Las capturas manuales estan en `docs/qa-evidence/matchrim-build65-mobile-2026-09-29/`. El resultado automatizado esta en `automated/ui-qa-results.json`.

## Perfiles y respuestas

Los perfiles son fixtures deterministas aislados; no crean cuentas ni escriben datos de produccion.

| Perfil | Recomendacion aprendida | Score | Muestras | Confianza de aprendizaje | Siguiente tras guardar la primera |
| --- | --- | ---: | ---: | ---: | --- |
| Explorador atlantico | Rias Baixas atlantico | 83 | 7 | 43% | Tinto frutal ligero |
| Clasico estructurado | Rioja Reserva clasico | 81 | 3 | 25% | Blanco redondo |
| Principiante frutal | Tinto frutal ligero | 85 | 3 | 22% | Blanco redondo |

En el runtime real de aiRIM, la misma peticion de arroz con setas y verduras asadas hasta 30 EUR produjo respuestas diferenciadas:

| Perfil | Principal | Segura | Exploratoria | Latencia |
| --- | --- | --- | --- | ---: |
| Explorador atlantico | Ribeiro blanco con crianza contenida | Godello | Pinot Noir joven y ligero | 11,4 s |
| Clasico estructurado | Rioja Reserva | Ribera del Duero Crianza | Pinot Noir del Penedes con crianza | 9,2 s |
| Principiante frutal | Mencia del Bierzo | Pinot Noir | Orange wine catalan | 9,0 s |

Las respuestas repetidas usan confianza cualitativa y explicitan los datos que faltan; no presentan porcentajes del modelo como precision demostrada.

## Gate de reconocimiento

El build 65 conserva las mejoras locales de contrato y postprocesado, pero no cambia el hecho medido el 2026-09-28:

| Categoria | Precision | Recall | Gate |
| --- | ---: | ---: | --- |
| Etiqueta unica, 11 escenas | 0,7692 | 0,9091 | FAIL precision |
| Multietiqueta, 6 escenas | 0,5714 | 0,8889 | FAIL |
| Cartas de vino impresas, 2 escenas | 1,0000 | 0,7083 | FAIL recall |
| Pizarras densas, 2 escenas | 1,0000 | 1,0000 | PASS limitado |
| Carta de comida fotografiada, 1 escena | 1,0000 en resultados devueltos | 0,2407 | FAIL cobertura/segmentacion |

Por tanto, el cliente esta verde y el binario es reproducible, pero la identidad real no alcanza el umbral P0 de precision y recall >=0,90 en todas las categorias.

## Decision de TestFlight

**NO-GO temporal para subir el build 65.** La cuenta y la firma estan disponibles, pero faltan dos condiciones:

1. Autorizacion explicita para enviar los cinco materiales de QA al backend productivo de Matchrim y a su proveedor de vision.
2. Resultado real por referencia que alcance el gate o, si falla, correccion y repeticion antes de exportar/subir.

La autorizacion minima necesaria es: `Autorizo enviar los cinco archivos IMG_7547 2.HEIC, IMG_7548 2.HEIC, IMG_7552 2.HEIC, IMG_7553 2.HEIC e IMG_7605 2.jpg al backend de produccion de Matchrim y a su proveedor de vision para ejecutar el benchmark.`
