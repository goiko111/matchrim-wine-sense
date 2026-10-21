# Catalogo Y200 Etiquetas: Continuacion Sin Ampliar Gasto

Continua `aa150d1`, despues de la subida de1.0(99). El propietario pide avanzar con catalogo completo y200 etiquetas sin tocar la web ni ampliar el gasto autorizado. Este bloque no cambia ni vuelve a subir la99: contiene un arreglo para un futuro candidato y un diagnostico local nuevo de los200 originales existentes.

## Resultado Real

- **200/200 imagenes** preparadas por el modulo real `imageAnalysis.ts`, con sus limites nativos actuales y fondo blanco, y leidas por Apple Vision revision3 accurate, secuencialmente y sin nombres esperados/customWords.
- **0 errores** de lectura/hash/OCR;198 devuelven texto y2 siguen sin texto (`img-063`, `img-162`). El segundo paso NO es el reconocedor de produccion de Matchrim/OpenAI ni un benchmark canonico.
- **6 GET publicos anonimos** de Winerim, tres consultas, sin claves, cookies ni llamadas a modelos. Confirman Library parcial y revelan una contradiccion concreta de anada. No se accede a administracion ni se copia su sesion.
- **Un fallo de identidad reproducido y corregido** en admision nativa y selector nativo: nombre terminado en2023 con anada explicita2022 podia verificarse. Se exige revision antes de leer atributos sensoriales. No se elige cual de los dos anos es correcto.
- **0 nuevas peticiones de IA de pago**,0 turnos Lovable,0 deploys,0 publicaciones web y0 escrituras en cuentas/vinos de produccion.

##200 Imagenes: Expected / Actual

| Medida de solape textual, NO precision canonica | Originales, OCR previo | JPEG nativo actual, OCR nuevo |
| --- | ---: | ---: |
| Procesadas / hash correcto |200/200 |200/200 |
| Imagenes con texto |198 |198 |
| Nombre completo normalizado presente |64 |63 |
| Todos los tokens del nombre presentes |89 |86 |
| Bodega completa normalizada presente |96 |95 |
| Nombre y bodega completos presentes |38 |39 |
| Mediana por imagen |95.578ms |92.044ms |
| p95 por imagen |182.348ms |196.250ms |

No hay mejora global demostrada de reconocimiento por esta preparacion. Los JPEG nativos y los originales no son los mismos pixeles: cambia la composicion/transcodificacion y, en tres fuentes multiframe, el frame del navegador puede diferir del frame0 del OCR anterior. No se atribuye causalmente el resultado solo al fondo blanco. Confianza OCR no significa confianza de identidad, y estas latencias locales no son latencia E2E de la app.

Las dos imagenes vacias se inspeccionaron visualmente: packshots de108x520 y146x520, con tipografia muy estilizada/texto pequeno. El fondo ya es blanco; eso no recupera detalle inexistente. No se inventaron candidatos a partir de las formas de la etiqueta ni de los nombres del manifest.

`native-prepared-ocr-r2/COMPARISON.json` contiene200 filas por imagen y separa `canonicalIdentityPrecision:null` y `canonicalIdentityRecall:null`. Los nombres/bodegas/MantalakID del manifest entran solo DESPUES de que termine OCR, para evaluar solape textual. No se construye un indice cerrado con las respuestas esperadas para aparentar reconocimiento.

## Catalogo Publico: Observacion Actual

| Consulta | Respuesta observada | Consecuencia |
| --- | --- | --- |
| Chivite |3 propuestas; una combina nombre `Chivite Coleccion125 Blanco2023` y vintage2022 | Inconsistencia real que no debe convertirse en ficha/afinidad fiable |
| Chivite La Zorrera |Library279839, La Zorrera2019 | No resuelve Mantalak180278/2015 ni autoriza tomar sus atributos |
| Vidure |Vacio en Library | No demuestra ausencia del maestro Mantalak |

La proyeccion de identidad se conserva en `qa-fixtures/consumer95/catalogue-vintage100.observed.json`. Es una observacion de consola de6GET, no un cuerpo HTTP crudo firmado. Las respuestas sensoriales del test de regresion son SINTETICAS y estan etiquetadas como tales; no se atribuyen a esa consulta publica.

La consulta dirigida actual del conector GitHub para `winerim-backend` no devuelve repositorios instalados. Eso describe el acceso del conector, no prueba que el repositorio no exista. No se vuelve a auditar todo GitHub ni se prueban rutas de API inventadas.

## Defecto Corregido Y Alcance

Antes, la reproduccion offline con la identidad observada daba `proposals`, despues `verified` y tres GET sinteticos; la admision automatica tambien devolvia true. Despues devuelve `refine`, `identity-required`, cero GET de confirmacion y admision false.

`nativeVintageEvidence100.ts` compara un sufijo de nombre con forma de ano1900-2099 (incluidos parentesis/corchetes) con la anada explicita. Diferencia significa **abstenerse para revision**, no corregir datos ni afirmar que el vino es invalido. Cuvees numeradas como125/904 y nombres como1864 no se confunden con anadas; una cuvee cuyo nombre termine en1902 pero indique otra anada tambien necesita revision bajo esta regla conservadora.

El cambio se limita a `nativeCatalogAdmission97` y al selector `winerimCandidateSearch95`, montado solo por su wrapper nativo. No se cambia `isSafeCanonicalLabelMatch`, el lector compartido `winerimOriginalSheet`, la formula de afinidad, sus pesos, los datos existentes, el HTML/CSS ni el backend. No es una reparacion global del catalogo de origen ni de todos los consumidores legacy del lector compartido. Las inconsistencias se retienen, no se reescriben anadas en produccion.

## Pruebas Y Evidencias

Raiz privada: `/Users/GOIKO/2matchrim76-recognition-20261008/qa-artifacts/catalogue100-20261021/`.

- `vintage-before.log`: defecto real de contrato reproducido con transporte sintetico, FAIL conservado.
- `vintage-after.log` y `vintage-final.log`:16 checks nuevos PASS; anadas iguales/distintas, parentesis, numeros de cuvee, cero sensorial y ausencia de dispatch al rechazar.
- `admission-regression.log`:38 checks PASS de admision nativa.
- `picker-regression.log`:108 checks PASS del selector/controlador y flujos aislados.
- `native-web-scope-r2.log`:20 checks PASS, web anterior y wiring nativo preservados. El intento inicial sin loader TS fallo antes de ejecutar el test; se conserva en `native-web-scope-initial.log`.
- `typecheck.log`:tsc PASS. `lint.log`:lint focal PASS, sin errores ni warnings en los archivos revisados.
- `native-prepared-ocr-r2/REPORT.json`,200 JPEG derivados y200 recibos OCR, logs de compilacion/OCR,200 comparaciones y los hashes de fuente/inputs. El runner usa el modulo real de preparacion en Chromium headless aislado: proxy cerrado, DNS sin salida, rutas y WebSockets bloqueados; Swift se ejecuta en sandbox sin red. Playwright Python no estaba instalado en ninguno de los dos runtimes disponibles: se reutiliza la dependencia Node existente del repositorio, sin instalar paquetes.
- `native-prepared-ocr-r1/FAILURE.json`: el guard inicial detecto el alias historico de iCloud que ahora resuelve a Documents/Codex. El segundo intento enlaza solo esa reubicacion exacta, conserva ambas rutas y verifica los200 SHA originales. No se extrae de nuevo el ZIP ni se modifica el dataset.

No se repite QA visual o fisico, ni build iOS/TestFlight para estos cambios: no hay nueva pantalla, y este bloque no se presenta como un candidato distribuido. La99 ya subida no contiene el nuevo guard de anada.

## Presupuesto Y Gate Restante

Se mantiene **20 etiquetas piloto /50 starts de pago /15EUR**. El estado historico conserva10 starts demostrados mas24 slots SDK no cerrados:34 comprometidos y10.20EUR provisionados, NO factura. La cuenta SDK real sigue unknown. El nuevo trabajo no consume esos slots ni levanta la retencion por falta de quietud demostrada del cliente anterior. No se ejecuta un modelo gratis ficticio ni se extrapolan los resultados del OCR local a200 identidades verificadas.

El gate del maestro no ha cambiado: hace falta el contrato de lectura autorizado, o el repositorio y revision desplegada, del backend Symfony de `app.winerim.com` (`winerim-backend` / `winerim-backend-production`). Debe devolver identidad Mantalak, anada solicitada/resuelta, atributos0-5 y procedencia, paginacion/completitud y mapeo real nullable a ficha publica. El frontend `goiko111/matchrim-wine-sense`, la Library y una sesion administrativa no sustituyen ese contrato.

Siguiente bloque operativo: conectar ese contrato cuando sea accesible; entretanto, conservar la separacion entre OCR, identidad, ficha y afinidad. No se declara terminado el benchmark real200 ni aprobado el catalogo completo.
