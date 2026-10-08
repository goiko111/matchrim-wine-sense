const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const inventory = read('baseline-manifest.json');
const rows = [];
const add = (feature, environment, persona, steps, expected, observed, status, evidence, version = '72-local-QA') =>
  rows.push({ id: `F${String(rows.length + 1).padStart(3, '0')}`, feature, version, environment, persona, steps, expected, observed, status, evidence });
for (const result of read('ui/local-final/results.json').results.filter(row => /^(anon|auth)-route-/.test(row.case))) {
  add(`Ruta ${result.details.requested}`, 'browser-local-mock', result.case.startsWith('anon') ? 'anonymous with cached synthetic profile' : 'synthetic member',
    ['Abrir ruta', 'Esperar carga', 'Comprobar pantalla o guard y overflow'], 'Pantalla no vacia; guard correcto; sin desbordamiento', result.details,
    result.status, 'ui/local-final/results.json', '72-local snapshot dist-final');
}
for (const [file, phase] of [['workflows/results.json','local final guide snapshot'], ['extended-final/results.json','local final guide snapshot']]) {
  for (const row of read(file)) add(row.case, 'browser-local-mock', 'synthetic adult account or guest',
    ['Ejecutar flujo del harness', 'Comprobar estado y peticiones interceptadas'], 'Contrato del caso cumplido sin backend real', row.observed,
    row.status, file, `72-local ${phase}`);
}
for (const row of read('scanner-regressions/ui-qa-results.json')) {
  add(row.case, 'browser-local-vision-fixture', 'consumer / sommelier synthetic context', ['Foto local', 'Fixture de vision', 'Interaccion y validacion del caso'],
    row.expected, row.actual, String(row.actual).startsWith('PASS') ? 'PASS' : 'FAIL', 'scanner-regressions/ui-qa-results.json', '72-local scanner snapshot');
}
for (const row of read('simulation/local-fixed-report.json').regressions) add(row.id, 'pure-local-engine', 'missing or invalid profile',
  ['Invocar motor o lector de cache'], row.expected, row.observed, row.status, 'simulation/local-fixed-report.json');
add('1000 secuencias longitudinales', 'pure-local-engine', '1000 unique synthetic taste vectors / 24 archetypes', ['Guardar', 'Puntuar', 'Editar misma referencia', 'Repetir identico', 'Borrar', 'Excluir'],
  '20 eventos por perfil, repeticion idempotente, rango/confianza/snapshots coherentes', { profiles: 1000, events: 20000, assertions:124041, failedRegressions:0 }, 'PASS','simulation/local-fixed-report.json');
add('Explicacion: datos faltantes, positivo/negativo, procedencia', 'pure-local-engine + drawer fixtures', 'casual / expert', ['Construir insights con y sin datos', 'Abrir drawer'],
  'No inventar dimensiones ni precision; separar perfil/datos/inferencia', 'Contrato de insights y drawer PASS; no valida fichas verdaderas o gusto humano', 'PASS', 'workspace/scripts/check-integral-regressions.ts');
for (const [name, steps] of [
  ['Navegacion principal y aiRIM en menu', ['Abrir 5 tabs', 'Verificar safe area y targets']],
  ['Cinco modos de captura', ['Abrir selector de modos']],
  ['Escaner rotacion/background', ['Retrato', 'Paisaje', 'Background/reabrir']],
  ['Accesibilidad nativa acotada', ['Dynamic Type', 'Audit dynamicType/textClipped Home y aiRIM']],
]) add(name,'physical iPhone installed 72','existing device; no synthetic accounts inserted',steps,'Sin crash o solape en recorrido acotado','XCTest PASS; no seleccion de fototeca ni validacion de recomendacion','PASS','native/physical72.xcresult','TestFlight 1.0 (72)');
add('Arranque repetido y safe area', 'dedicated iOS simulator', 'baseline 72', ['Cinco arranques', 'Esperar navegacion visible'], 'Maximo <=5 s', 'Maximo 5.803889 s; incluye espera XCTest/navegacion, no CPU startup puro', 'FAIL', 'simulator72.log', 'baseline 1.0 (72)');
const nativeLog = fs.readFileSync(path.join(root, 'guide-simulator-delivery.log'),'utf8');
add('Guia nativa local, giro, salto y reapertura', 'dedicated iOS simulator local fake-backend build', 'anonymous with very large text',
  ['Tres pasos', 'Rotar', 'Saltar', 'Reabrir app', 'Abrir Ayuda'], 'Controles visibles y guia no repetida tras salto', nativeLog.includes('** TEST SUCCEEDED **') ? 'XCTest PASS' : 'Ver log; no certificacion hasta terminar',
  nativeLog.includes('** TEST SUCCEEDED **') ? 'PASS' : 'NOT_RUN', 'guide-simulator-delivery.log');
const pending = [
  ['Identidad canonica independiente actual 72', 'real provider benchmark', 'Repetir dataset existente en entorno autorizado y medir bodega/cuvee/anada/precio', 'Recorded Sep-01 multi P .50/R .8889; no es medicion de 72; GT de expositor incompleto', 'recognition-replay.json'],
  ['Barolo omitido', 'recorded real production 72', 'Reconocer todas las 16 referencias de IMG_7547', '15/16; Barolo Marchesi di Barolo ausente', '../matchrim72/expected-actual-before-after.json'],
  ['Segunda pagina y fallback 500', 'recorded real production 72', '32 filas recuperadas; identidad y precios correctos', '32 nombres; 19 sin atributos. Recuperacion por crops tras 500; no nuevo rerun', '../matchrim72/real-production-fixed/real-e2e-report.json'],
  ['Expositor: identidad, recuento, duplicados y ocultas', 'real vision', 'Ground truth por referencia legible y no legible', '60 regiones y 20 scores previos, sin anotacion exhaustiva; no equivale a 60 identidades', '../matchrim72/STATUS.md'],
  ['Camara/fototeca nativas y permisos denegados/revocados', 'physical iOS', 'Capturar/seleccionar/denegar/revocar y recuperar', 'Entradas comprobadas; picker y envio fisico no realizados en este lote', 'native/physical72.xcresult'],
  ['Persistencia y aislamiento entre dos usuarios/dispositivos', 'real isolated backend', 'Login/logout A/B, restaurar, RLS y no cruzar filas', 'Cache local cubierta; mock no prueba RLS ni persistencia real', 'workflows/results.json'],
  ['Recuperacion y confirmacion email via deep link nativo', 'real isolated auth', 'Recibir email y abrir callback iOS', 'Solo request/reset local; no email real enviado', 'workflows/results.json'],
  ['Borrado efectivo de cuenta y plazo', 'real backend owner gate', 'Eliminar Auth, filas y fotos, comprobar recibo', 'UI solicita borrado; no se certifica ejecucion de la solicitud', 'workflows/results.json'],
  ['Consentimiento restaurante y proyeccion de lead', 'real backend + policy review', 'No compartir perfil/foto con captacion; solo nombre/ciudad consentidos', 'Opt-in local correcto; fila privada tambien contiene perfil y codigo. RLS por fila no garantiza proyeccion de columnas. Gate de privacidad', 'workspace/src/pages/UseMatchrim.tsx'],
  ['Paridad de datos ausentes con Edge Functions', 'versioned real backend', 'Mismos null/empty guards que cliente', 'Helper local corregido; 6/6 paridad PASS. Hash v72 previo verificado: null/blank/false/[] entrenan una muestra. Runtime sin desplegar', 'edge-parity.json'],
  ['VoiceOver manual integral y contraste', 'physical iOS', 'Leer y operar todos los flujos/focus/drawers/teclado', 'Nombres basicos + audit acotado no certifican recorrido completo', 'scanner-regressions/ui-qa-results.json'],
  ['Memoria, energia y red lenta reales', 'physical measurement', 'Trace acotado de fotos grandes y cancelacion', 'No medidos. Latencias proveedor preservadas; browser fixtures no valen para rendimiento de red real', '../matchrim72/STATUS.md'],
  ['Calidad sensorial de recomendaciones', 'human study', 'Recomendaciones holdout + cata ciega y preferencias observadas', '1000 perfiles sinteticos NO prueban satisfaccion o gusto humano', 'HUMAN_STUDY.md'],
];
for (const [name,environment,expected,observed,evidence] of pending) add(name,environment,'authorized QA account / independent evaluator', ['Gate acotado antes de ampliar coste o permisos'], expected, observed,'BLOCKED',evidence,'72 real gate, not certified');
for (const [feature,expected,observed,evidence] of [
  ['Admin/CSV/DataViewer/WineSearch/WineImport operaciones privilegiadas','Fixtures admin en sandbox, importacion/exportacion/rollback','Guards de las cinco entradas cubiertos; operaciones no ejecutadas ni inventadas','workspace/src/App.tsx'],
  ['Ficha de vino con catalogo real y enlaces tienda/carta','Datos, fuentes, imagen y destino correcto','Caso no encontrado PASS; ficha poblada/transaccion externa no certificadas','workspace/src/pages/WineDetail.tsx'],
  ['Preferencias por idioma y oscuro','EN/ES completos; oscuro solo si existe','Corpus incluye EN, browser ES. UI/i18n parcial revisada, no QA EN completo ni modo oscuro certificado','workspace/src/i18n'],
  ['Historial de scans entre dispositivos','Reabrir foto/resultado tras cambio de dispositivo','Cache y UI locales; backend remoto del historial no certificado','workspace/src/utils/scanHistory.ts'],
]) add(feature,'source-reviewed; functional residual','owner/specialist', ['Revisar entrada y codigo', 'Gate de prueba pendiente'],expected,observed,'NOT_RUN',evidence);
const counts = Object.fromEntries(['PASS','FAIL','BLOCKED','NOT_RUN'].map(status => [status,rows.filter(row=>row.status===status).length]));
const report = { task:'MATCHRIM72-QA-20261007', generatedAt:new Date().toISOString(), baseline:inventory.baseline,
  allDeclaredRoutesInventoried:26, routeAuthRenderCases:52, qualification:'Row counts are coverage units, not people or a global product completion percentage. PASS mock != PASS real.', counts, rows };
fs.writeFileSync(path.join(root,'coverage.json'),JSON.stringify(report,null,2));
fs.writeFileSync(path.join(root,'COVERAGE.md'), '# Matriz de cobertura\n\nVersiones y entornos por fila. PASS local no sustituye backend/vision/dispositivo/humanos. Inventario: 26 rutas; 52 casos de render/guard anonimo + cuenta ficticia. Conteos: '+JSON.stringify(counts)+'.\n\n| ID | Funcion | Entorno / version | Estado | Esperado | Observado | Evidencia |\n| --- | --- | --- | --- | --- | --- | --- |\n'+rows.map(row => {
  const clean=value=> (typeof value==='string'?value:JSON.stringify(value)).replaceAll('|','/').replaceAll('\n',' ');
  return `| ${row.id} | ${clean(row.feature)} | ${row.environment} / ${row.version} | ${row.status} | ${clean(row.expected)} | ${clean(row.observed)} | [fuente](${row.evidence}) |`;
}).join('\n')+'\n\nPasos y persona completos en coverage.json. Los gates BLOCKED necesitan autorizacion o validacion externa; NOT_RUN conserva pruebas funcionales especificas pendientes, no se marca verde por inspeccionar codigo.\n');
console.log(JSON.stringify({rows:rows.length,counts}));
