# Matchrim: Precision Monetaria Sin Redondeo Silencioso

Tercer delta local sobre `5b789a75ed636cb224d5f33dd4f4a1da7f9cc919`, sin publicacion, backend, datos reales o version iOS nueva.

| Before | After | Why |
| --- | --- | --- |
| 1,25JPY se aplica y aparece como1JPY | Borrador intacto, error explicito y Aplicar deshabilitado | Metadata y dinero visible no pueden discrepar |
| Cualquier moneda usa regla generica de dos decimales | Minor units de Intl del runtime; JPY entero | Regla de moneda, no conversion |
| Float dudoso puede entrar en budget/valor/scalar | Unidad invalida excluida; otra unidad valida permanece | No recomendar por un precio redondeado |
| Lectura antigua pierde precision al mostrarla | Valor original exacto y precision pendiente | Conservar evidencia sin acreditarla |
| EPS relativo admite fracciones extra grandes o residuo0.1+0.2 | Roundtrip exacto a unidad monetaria | No confundir precision sobrante con ruido aceptable |

La regla se consulta mediante Intl.NumberFormat.resolvedOptions, sin tabla nueva de tipos de cambio. La especificacion de [CurrencyDigits](https://tc39.es/ecma402/#sec-currencydigits) define la precision de moneda; se comprobo el runtime para las12 opciones existentes. No se incorporan monedas ni se hacen consultas de mercado. El parser sigue rechazando formatos mixtos/exponentes/negativos y admite cero.125,00JPY equivale exactamente al entero125;1,25JPY no.

Resolver directo y snapshot manual validan importe/moneda/unidad. La lectura original no se borra. Precio financiero solo EUR/botella/evidencia confirmada, y ahora tambien precision valida. Lector de carta/Bodega muestra importes dudosos sin redondearlos y estado pendiente; adapter comparador oculta la unidad invalida sin borrar una valida. Identidad, estilos, afinidad, aprendizaje, SDK/ledger/owner y schemas de backend no se cambian.

## Pruebas

-16/16 controles aislados,131/131checks,12monedas y retrato/paisaje/320px-200%. Es el componente real con datos sinteticos, no App/auth/camera/backend.
-40/40 recorridos de App-precio710checks y20/20 App-estilo264checks sobre una fuente congelada anterior al ultimo roundtrip aritmetico.
-Ultimo candidato:180/180 contratos de precision,123/123 contratos de precios y12/12 regresiones focalizadas (4controles34checks,4App-precio77checks,4App-estilo54checks). La unica diferencia post matriz completa es el quantum; fuente anterior conservada en menuPriceReview-before-quantum.ts.txt. No se atribuye toda la matriz anterior a bytes finales distintos.
-Release tests/typecheck/lint/build pasan.0errores106warnings heredados. Build web146ficheros, sin qa-pages, iOS ni distribucion.2694entradas anteriores permanecen byte-identicas.

Before: JPY falla en dos orientaciones con metadata1.25/visible1JPY. Primer probe incluia un check constante de cero; se sustituyo por borrar el campo y comprobar Aplicar deshabilitado. No se usa ese check como evidencia. Quantum:178/180 reproduce dos tolerancias erroneas;180/180 tras corregir. Todos los rojos se conservan.

Evidencia: `qa-evidence/matchrim-price-currency-precision-2026-10-13/` con before/,primary-final/,app-*-regression/,quantum-*/,contracts-final.json,validation-final/,summary.json,manifest.json y fuentes.314entradas,257PNG incluyendo previas. Cero proveedor, escrituras alojadas, cuentas reales, perfil positivo o dato humano.

Reproduccion: QAcomponent scripts/qa-matchrim-price-currency-precision-oct13.py sobre Vite4477 y /scripts/qa-pages/menu-price.html. Contrato npx tsx scripts/check-matchrim-price-currency-precision-oct13.ts <nuevo-json>. App via harnesses anteriores con boton visible/FileChooser y egress interceptado; nunca contra backend real. Probe no esta en bundle de distribucion.

Gates externas/globales sin cerrar: modelo/canonical/recall reales, resultados humanos, hosted/RLS, Safari/VoiceOver/DynamicType/iPhone, memoria nativa, integracion revisada del patch cloud, build combinado/firma/Apple/TestFlight. No se declara Matchrim listo ni se transforma simulacion de cliente en estudio de10.000personas.
