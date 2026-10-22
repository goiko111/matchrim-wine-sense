# Matchrim 103: Resultados De La Noche

Estado provisional: 22/10/2026, 03:19 Madrid. No es un aprobado global de release.

## Cambios Reales

- Recuperacion nativa local con Apple Vision y propuestas del catalogo publico global de Winerim, separadas de la confirmacion de identidad.
- Inicio visual con botellas, aiRIM en la navegacion y Escanear reducido a Botellas, Carta de vinos y Comida y vino.
- Resultados densos con pins y lista; comparador con texto que puede envolver sin tapar sus controles.
- Busqueda incompleta claramente distinta de un vino que no existe; sin inventar ausencias ni identidades.
- Scores, historial y cinco factores expuestos como frases accesibles; disclosures sin botones de texto duplicados.
- Correccion153 compilada y comprobada visualmente en el simulador: una valoracion guardada prevalece tambien en el titular de la explicacion expandida. El porcentaje no reemplaza lo que la persona ya dijo. Pendiente la regresion nativa estricta final.

## QA Verificado

| Prueba | Resultado y limite |
| --- | --- |
| Typecheck, bundle e instalacion nativa103 | PASS, candidato16 / fuente495c001; sin fixtures ni servidor preview |
| Perfil, Inicio, aiRIM, Escanear y Bodega | PASS en candidato15: cuatro tipos de auditoria Apple sin exclusiones, cinco primeras vistas; no certifica todo el scroll ni VoiceOver hablado |
| Perfil con texto maximo | PASS candidato15; ajuste original restaurado; dos capturas revisadas |
| Dos vinos guardados y explicacion de cinco factores | PASS candidato15; dos auditorias y19 adjuntos; regresion153 aun pendiente |
| Titulares153 y singular -1 punto | Revision directa del simulador: ambos vinos correctos en el area visible; tres capturas privadas; no sustituye la auditoria automatizada153 |
| Vitrina/lista/comparador 2-5 |10 capturas controladas y revision visual acotada; no son reconocimiento real de una vitrina |
| Galeria -> Vision -> catalogo -> eleccion explicita -> afinidad | Recorrido nativo real aprobado en fuente anterior0173c17; Terre d'Aigle2020 seleccionado,66/100; no se certifico la anada desde la foto ni se guardo un vino |
|50 perfiles | Sinteticos: consistencia matematica y aislamiento, no50 personas ni50 cuentas reales |
| iPhone fisico | No utilizado esta noche; QA de esta tanda en simulador |

## Resultados De Las 200 Etiquetas

-200 imagenes leidas mediante Vision real en simulador, sin palabras esperadas inyectadas;196 lecturas no vacias y cuatro vacias.
- OCR solo: mediana452ms, p95:655ms; no es tiempo total de escaneo.
- Ultimo replayr8:141 escenas elegibles y59 incompletas,38 listas de candidatos,30 coincidencias esperadas top1 y32 top3.
- Son coincidencias contra nombres de archivo, no precision/recall de identidad contra verdad terreno experta. Seis listas no contienen el esperado; algunas discrepancias requieren adjudicar metadatos.
- Un control de cierre encontro24/25 huellas actuales iguales; la distinta es la presentacion146 de busqueda incompleta. Se requiere un replay final cache-only para ligar tambien esa fuente actual, sin nuevas consultas.
- El campo antiguo `nonemptyOCR=137` cuenta solo escenas elegibles; las196 lecturas globales incluyen las escenas incompletas. No se cambia el denominador ni se reescriben los informes anteriores.

Desglose del replayr8, sin atribuir causas no demostradas:

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
5. Archivo firmado actualizado y comprobacion153 final: pendientes. No se ha subido103 ni se reutiliza la excepcion de beta limitada100.

## Gasto Y Proteccion

Cero nuevas llamadas de IA desde Matchrim, imagenes enviadas al proveedor, turnos de Lovable, despliegues o publicaciones web esta noche. El limite autorizado no se amplia.300 GET publicos gratuitos de CLI acumulados; GET ordinarios de la app no instrumentados. No se modifica main; index.css y search-wines siguen exactos a db6a181.

Evidencias y fallos conservados: `qa-artifacts/night105-20261021`. Detalle historico: `docs/MATCHRIM_NIGHT_105_2026-10-21.md`.
