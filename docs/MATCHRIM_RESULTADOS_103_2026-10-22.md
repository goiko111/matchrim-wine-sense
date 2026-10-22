# Matchrim 103: Resultados De La Noche

Estado de cierre: 22/10/2026, ventana hasta las 04:00 Madrid. No es un aprobado global de release.

## Cambios Reales

- Recuperacion nativa local con Apple Vision y propuestas del catalogo publico global de Winerim, separadas de la confirmacion de identidad.
- Inicio visual con botellas, aiRIM en la navegacion y Escanear reducido a Botellas, Carta de vinos y Comida y vino.
- Resultados densos con pins y lista; comparador con texto que puede envolver sin tapar sus controles.
- Busqueda incompleta claramente distinta de un vino que no existe; sin inventar ausencias ni identidades.
- Scores, historial y cinco factores expuestos como frases accesibles; disclosures sin botones de texto duplicados.
- Correccion153 compilada, comprobada visualmente y validada mediante regresion nativa estricta: una valoracion guardada prevalece tambien en el titular de la explicacion expandida. El porcentaje no reemplaza lo que la persona ya dijo.

## QA Verificado

| Prueba | Resultado y limite |
| --- | --- |
| Typecheck, bundle e instalacion nativa103 | PASS, candidato16 / fuente495c001; sin fixtures ni servidor preview |
| Perfil, Inicio, aiRIM, Escanear y Bodega | PASS en candidato15: cuatro tipos de auditoria Apple sin exclusiones, cinco primeras vistas; no certifica todo el scroll ni VoiceOver hablado |
| Perfil con texto maximo | PASS candidato15; ajuste original restaurado; dos capturas revisadas |
| Dos vinos guardados y explicacion de cinco factores | PASS candidato16/fuente495c001, cellar144-r5: cinco dimensiones nombradas, dos auditorias sin exclusiones y19 adjuntos; no valida una nueva escritura |
| Titulares153 y singular -1 punto | PASS estricto en ambos vinos y revision directa del simulador; tres capturas privadas, sin alterar sus puntuaciones |
| Vitrina/lista/comparador 2-5 |10 capturas controladas y revision visual acotada; no son reconocimiento real de una vitrina |
| Galeria -> Vision -> catalogo -> eleccion explicita -> afinidad | Recorrido nativo real aprobado en fuente anterior0173c17; Terre d'Aigle2020 seleccionado,66/100; no se certifico la anada desde la foto ni se guardo un vino |
|50 perfiles | Sinteticos: consistencia matematica y aislamiento, no50 personas ni50 cuentas reales |
| iPhone fisico | No utilizado esta noche; QA de esta tanda en simulador |
| Archivo iOS firmado103 | PASS archive103-r2 sobre candidato16/fuente495c001; no exportado ni subido a TestFlight |
| Bodega con texto maximo | NO APROBADO: cellar144-max158-r1 agota su reveal acotado al volver a la puntuacion; captura/AX retenidas. MAX158-HOST confirma aplicado maximo y restauracion exacta a large. No demuestra por si solo un bloqueo de scroll de la app |

Cuenta real de QA con valoraciones expresamente sinteticas, no feedback de consumidores. Perfil activo observado: intensidad1,4; acidez4,0; dulzor2,0; tanino1,1; fruta3,3 sobre5.

| Vino guardado | Valoracion | Estilo actual | Historial expuesto |
| --- | --- | ---: | --- |
| Flor de Muga Blanco2022 | Me encanta |71/100 | Primera registrada68, +3; falta inicial-al-guardar |
| Manzanilla La Gitana | No es para mi |71/100 | Al guardar72, -1 |

Que ambos tengan71 no demuestra que prediga bien el gusto: por eso el veredicto personal tiene prioridad y no se altera para hacer coincidir la cifra.

## Resultados De Las 200 Etiquetas

-200 imagenes leidas mediante Vision real en simulador, sin palabras esperadas inyectadas;196 lecturas no vacias y cuatro vacias.
- OCR solo: mediana452ms, p95:655ms; no es tiempo total de escaneo.
- Ultimo replayr9:141 escenas elegibles y59 incompletas,38 listas de candidatos,30 coincidencias esperadas top1 y32 top3.
- Frente al replayr6, top1 pasa de29 a30 sobre141 escenas elegibles; top3 permanece32 y las59 incompletas siguen abiertas. Es una mejora acotada, no reconocimiento de las200 identidades.
- Son coincidencias contra nombres de archivo, no precision/recall de identidad contra verdad terreno experta. Seis listas no contienen el esperado; algunas discrepancias requieren adjudicar metadatos.
- El replay finalr9 verifica todas las fuentes actuales, con417 lecturas de cache, cero consultas nuevas y cero entradas ausentes. Sus metricas no mejoran respecto a r8. El anterior control24/25 y su fallo se conservan, no se reetiquetan como aprobados.
- El campo antiguo `nonemptyOCR=137` cuenta solo escenas elegibles; las196 lecturas globales incluyen las escenas incompletas. No se cambia el denominador ni se reescriben los informes anteriores.

Desglose del replayr9, sin atribuir causas no demostradas:

| Escenas | Resultado observable |
| ---: | --- |
|38 | Lista propuesta;32 contienen el esperado en top3 |
|38 | Consultas completas sin filas; no demuestra ausencia del vino en Winerim |
|59 | Hay filas, pero ninguna supera las reglas actuales de admision |
|6 | Abstencion: cuatro lecturas vacias y dos lecturas sin consulta admisible |
|59 | Consulta incompleta; todas tienen OCR no vacio y quedan fuera del denominador proxy |

Estados de consulta agregados:298 completos,47 parciales,25 no disponibles y dos incompletos. Son consultas, no escenas ni peticiones HTTP; una escena puede tener dos consultas y cada consulta varias paginas.

## Limites Que Impiden La Subida

1. Catalogo publico global integrado no equivale a cobertura completa del maestro administrativo Mantalak ni a ficha sensorial verificada por anada para cada vino.
2. Las200 identidades siguen sin estar validadas: reconocer texto no es identificar un vino.
3. Bodega respeta la valoracion personal, pero falta llevar ese veredicto exacto al reescaneo del mismo vino, con aislamiento por propietario/anada/productor.
4. Flor de Muga tiene primera afinidad registrada68, no una inicial-al-guardar acreditada. No se rellena retroactivamente.
5. Firma y comprobacion153 final aprobadas, pero no sustituyen los gates de identidad e inteligencia anteriores. No se ha subido103 ni se reutiliza la excepcion de beta limitada100.
6. Una nueva consulta publica de Arrels, texto visible en016, devuelve HTTP500. El cliente real, probado con esa respuesta guardada y sin red nueva, lo clasifica como no disponible, no como vino inexistente. Sin reintento ni imagen enviada.
7. Falta cerrar el recorrido de Bodega con texto maximo: el probe actual barre cuatro veces en cada direccion y no alcanza de nuevo el score, que queda por encima del viewport. La pantalla y los cinco factores siguen en el arbol accesible. No se rebaja esta prueba ni se confunde el PASS normal con un PASS a texto maximo.

## Gasto Y Proteccion

Cero nuevas llamadas de IA desde Matchrim, imagenes enviadas al proveedor, turnos de Lovable, despliegues o publicaciones web esta noche. El limite autorizado no se amplia.301 GET publicos gratuitos de CLI acumulados; GET ordinarios de la app no instrumentados. No se modifica main; index.css y search-wines siguen exactos a db6a181.

Evidencias y fallos conservados: `qa-artifacts/night105-20261021`. Revision navegable de las200 escenas: `native112-review-corpus200-r6/REVIEW.html`, conCSV equivalente. Capturas corregidas: `manual156-ui/gitana-verdict153-clean.png` y `flor-verdict153-clean.png`. Detalle historico: `docs/MATCHRIM_NIGHT_105_2026-10-21.md`.
