import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Usage: node scripts/render-matchrim-native112-review.mjs REPORT.json PREPARED_DIR NEW_OUTPUT_DIR
// Inputs must be inside this repository's qa-artifacts; output basename: native112-review-<revision>.
const repo112 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const statuses = new Set(['complete', 'abstained', 'incomplete']);
const label = { complete: 'Completa', abstained: 'Abstencion', incomplete: 'Incompleta' };
const text = value => typeof value === 'string' ? value : '';
const finite = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const integer = value => Number.isSafeInteger(value) && value >= 0 && value <= 200;
const shown = value => finite(value) ? String(value) : 'No consta';
export const escapeHTML112 = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
export function csvCell112(value) {
  let cell = String(value ?? '');
  // Protect spreadsheet imports, including formula prefixes after whitespace/control bytes.
  if (/^[\s\u0000-\u001f\u007f]*[=+@-]/u.test(cell) || /^[\t\r\n]/.test(cell)) cell = "'" + cell;
  return '"' + cell.replaceAll('"', '""') + '"';
}
export function validateImageId112(id) {
  assert(typeof id === 'string' && /^img-\d{3}$/.test(id) && Number(id.slice(4)) >= 1 && Number(id.slice(4)) <= 200, 'INVALID_IMAGE_ID');
  return id;
}
export function qaPath112(repo, input) {
  assert(typeof input === 'string' && input.length > 0 && !/[\u0000-\u001f\\]/.test(input), 'INVALID_PATH');
  const target = path.resolve(repo, input), base = path.join(repo, 'qa-artifacts');
  assert(target.startsWith(base + path.sep), 'PATH_OUTSIDE_QA_ARTIFACTS');
  assert(!/(?:account[\W_]*114|private|secret|credential)/i.test(target), 'PRIVATE_PATH_FORBIDDEN');
  return target;
}
export function reviewPaths112(repo, report, prepared, output) {
  const paths = { report: qaPath112(repo, report), prepared: qaPath112(repo, prepared), output: qaPath112(repo, output) };
  assert(path.basename(paths.report) === 'REPORT.json', 'REPORT_NAME_REQUIRED');
  assert(path.basename(paths.prepared) === 'prepared', 'NEUTRAL_PREPARED_DIRECTORY_REQUIRED');
  assert(/^native112-review-[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(path.basename(paths.output)), 'OWN_OUTPUT_NAME_REQUIRED');
  assert(!paths.report.startsWith(paths.output + path.sep) && !paths.prepared.startsWith(paths.output + path.sep), 'OUTPUT_CONTAINS_INPUT');
  return paths;
}

export function reviewModel112(report) {
  assert(report && typeof report === 'object' && !Array.isArray(report), 'INVALID_REPORT');
  const summary = report.summary;
  assert(summary && typeof summary === 'object' && Array.isArray(report.rows) && report.rows.length <= 200, 'INVALID_REPORT_SCHEMA');
  assert(integer(summary.actualNativeVisionImages) && integer(summary.attempted), 'INVALID_CORPUS_COUNTS');
  assert(report.rows.length === summary.attempted && report.rows.length <= summary.actualNativeVisionImages, 'INCONSISTENT_ATTEMPTED_COUNT');
  assert(typeof summary.sourceIntegrityVerified === 'boolean' && typeof summary.complete === 'boolean', 'INVALID_INTEGRITY');
  assert(integer(summary.recognitionProxyDenominator), 'INVALID_DENOMINATOR');
  const seen = new Set();
  const rows = report.rows.map(row => {
    validateImageId112(row.imageId);
    assert(!seen.has(row.imageId), 'DUPLICATE_IMAGE_ID'); seen.add(row.imageId);
    assert(statuses.has(row.status) && typeof row.eligible === 'boolean', 'INVALID_SCENE_STATUS');
    assert(row.eligible === (row.status !== 'incomplete'), 'INCONSISTENT_SCENE_ELIGIBILITY');
    assert(Array.isArray(row.reading?.lines) && row.reading.lines.every(line => typeof line?.text === 'string'), 'INVALID_OCR_LINES');
    assert(Array.isArray(row.proposals) && row.proposals.length <= 3, 'INVALID_TOP_CANDIDATES');
    const proposals = row.proposals.map(proposal => {
      assert(typeof proposal?.name === 'string' && typeof proposal.row?.winery === 'string', 'INVALID_PROPOSAL');
      return { name: proposal.name, producer: proposal.row.winery, score: finite(proposal.score) ? proposal.score : null,
        missingProducer: proposal.missingProducer === true, vintageConflict: proposal.vintageConflict === true,
        corrections: Array.isArray(proposal.readingCorrections) ? proposal.readingCorrections.filter(value => typeof value === 'string') : [] };
    });
    return { id: row.imageId, status: row.status, eligible: row.eligible && summary.sourceIntegrityVerified,
      reason: text(row.reason), ocr: row.reading.lines.map(line => line.text),
      expectedName: text(row.expected?.name), expectedProducer: text(row.expected?.producer), proposals,
      ocrMs: finite(row.reading.totalMs) ? row.reading.totalMs : null,
      top1: typeof row.top1Hit === 'boolean' ? row.top1Hit : null,
      top3: typeof row.top3Hit === 'boolean' ? row.top3Hit : null };
  }).sort((a, b) => a.id.localeCompare(b.id));
  const denominator = rows.filter(row => row.eligible).length;
  assert(denominator === summary.recognitionProxyDenominator, 'DENOMINATOR_MISMATCH');
  const missing = summary.actualNativeVisionImages - rows.length;
  const complete = summary.complete && summary.sourceIntegrityVerified && missing === 0 && rows.every(row => row.eligible)
    && !(report.errors?.length) && !(report.failures?.length) && summary.held !== true;
  return { rows, denominator, missing, complete, summary, scope: text(report.scope), mode: text(report.mode),
    observedUTC: text(report.observedUTC), expectedLoadedAfterRanking: report.expectedLoadedAfterRanking === true };
}

export function renderReview112(report, { imagePrefix = 'prepared', reportSHA256 = '' } = {}) {
  assert(/^(?:\.\.\/)*[a-zA-Z0-9_./-]*prepared$/.test(imagePrefix) && !imagePrefix.includes('//'), 'INVALID_IMAGE_PREFIX');
  assert(reportSHA256 === '' || /^[a-f0-9]{64}$/.test(reportSHA256), 'INVALID_REPORT_DIGEST');
  const model = reviewModel112(report), h = escapeHTML112, s = model.summary;
  const bool = value => value === true ? 'Si' : value === false ? 'No' : 'No consta';
  const cards = model.rows.map(row => {
    const src = `${imagePrefix}/${validateImageId112(row.id)}.jpg`;
    const candidates = row.proposals.length ? `<ol>${row.proposals.map(item => `<li><strong>${h(item.name)}</strong> · ${h(item.producer)}<br>Puntuacion de orden: ${h(shown(item.score))} (no probabilidad ni afinidad). Productor incompleto: ${bool(item.missingProducer)}. Conflicto de anada: ${bool(item.vintageConflict)}.${item.corrections.length ? `<br>Correcciones propuestas: ${h(item.corrections.join('; '))}` : ''}</li>`).join('')}</ol>` : '<p>Sin candidatos propuestos.</p>';
    return `<article aria-labelledby="${row.id}"><h2 id="${row.id}">${row.id}: ${label[row.status]} (${row.status})</h2>
<div class="scene"><figure><a href="${h(src)}"><img src="${h(src)}" width="480" height="360" loading="lazy" alt="Imagen preparada ${row.id}; abrir original local"></a><figcaption>Imagen neutral preparada; no se descarga ni se copia.</figcaption></figure>
<div><p>Incluida en denominador proxy: <strong>${bool(row.eligible)}</strong>. Motivo: ${h(row.reason || 'No consta')}.</p>
<h3>OCR observado</h3>${row.ocr.length ? `<ul>${row.ocr.map(line => `<li class="ocr">${h(line)}</li>`).join('')}</ul>` : '<p>Lectura vacia.</p>'}
<h3>Metadatos esperados derivados del nombre de archivo</h3><p>${h(row.expectedName || 'No constan')} · ${h(row.expectedProducer || 'No consta productor')}. No son verdad terreno experta.</p>
<h3>Candidatos propuestos, no confirmados</h3>${candidates}
<p>Identidad confirmada: <strong>no consta en este esquema</strong>. Afinidad: no consta; no se calcula.</p>
<p>Coincidencia proxy top 1: ${bool(row.top1)}; top 3: ${bool(row.top3)}. No acredita identidad.</p>
<p>Tiempo OCR de escena (reading.totalMs): ${h(shown(row.ocrMs))} ms. No es latencia total: excluye busqueda, interfaz y red; no es una medida E2E ni de iPhone fisico. Otros tiempos de escena: no constan en el esquema.</p></div></div></article>`;
  }).join('\n');
  const counts = ['complete', 'abstained', 'incomplete'].map(status => `<tr><th scope="row">${label[status]} (${status})</th><td>${model.rows.filter(row => row.status === status).length}</td></tr>`).join('');
  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' file:; style-src 'unsafe-inline'; connect-src 'none'; script-src 'none'; base-uri 'none'; form-action 'none'">
<title>Revision QA native112</title><style>
*{box-sizing:border-box}body{margin:0;color:#202124;background:#fff;font:16px/1.5 system-ui,sans-serif;letter-spacing:0}main{max-width:1200px;margin:auto;padding:24px}h1{font-size:28px}h2{font-size:22px}h3{font-size:18px}article{border-top:2px solid #d7dcde;padding:20px 0}.scene{display:grid;grid-template-columns:minmax(0,480px) minmax(0,1fr);gap:24px}figure{margin:0;min-width:0}img{display:block;width:100%;height:360px;object-fit:contain;background:#f0f3f2}figcaption{font-size:14px}p,li,td,th{overflow-wrap:anywhere}li{margin-bottom:8px}.ocr{white-space:pre-wrap}table{border-collapse:collapse;width:100%}td,th{text-align:left;border-bottom:1px solid #bbc4c2;padding:8px}a{color:#075c49}a:focus-visible{outline:3px solid #b33b19;outline-offset:4px}@media(max-width:760px){main{padding:16px}.scene{grid-template-columns:minmax(0,1fr)}img{height:300px}h1{font-size:24px}}
</style></head><body><main><h1>Revision humana QA native112</h1>
<p>Estado del informe: <strong>${model.complete ? 'Completo' : 'Incompleto'}</strong>. Esto no es un aprobado de reconocimiento ni de full200.</p>
<p>Imagenes nativas declaradas: ${s.actualNativeVisionImages}/200; escenas presentes: ${model.rows.length}; pendientes sin fila: ${model.missing}. Denominador proxy elegible: <strong>${model.denominator}</strong>, nunca 200 por defecto. Integridad de fuentes declarada: ${bool(s.sourceIntegrityVerified)}.</p>
<table><caption>Estados de las escenas presentes</caption><thead><tr><th scope="col">Estado</th><th scope="col">Escenas</th></tr></thead><tbody>${counts}</tbody></table>
<h2>Alcance y procedencia</h2><p>Solo se transforma el REPORT.json suministrado. No se ejecuta OCR, modelo, red, consulta de catalogo ni subida de imagen. No se comprueban aqui los bytes ni las huellas de las imagenes o los recibos originales.</p>
<p>Segun el informe: modelStarts=${h(shown(s.modelStarts))}; imageUploads=${h(shown(s.imageUploads))}; publicGETStarts=${h(shown(s.publicGETStarts))}; cacheReads=${h(shown(s.cacheReads))}; cacheMetadataParity=${h(text(report.cacheMetadataParity) || 'No consta')}. Son declaraciones del informe, no una auditoria independiente.</p>
<p>Modo: ${h(model.mode || 'No consta')}; fecha declarada: ${h(model.observedUTC || 'No consta')}. Esperados cargados despues del ranking: ${bool(model.expectedLoadedAfterRanking)}. SHA-256 del REPORT.json: ${h(reportSHA256 || 'No suministrado')}.</p>
<p>Alcance declarado: ${h(model.scope || 'No consta en el informe')}.</p>
<p>Replay Vision de simulador no equivale a galeria E2E, iPhone fisico, precision automatica de identidad ni verdad terreno experta. Una abstencion valida puede entrar en el denominador; una escena incompleta no. Complete describe procesamiento, no acierto. Los candidatos siguen sin confirmar.</p>
${cards || '<p>No hay escenas disponibles para revisar.</p>'}</main></body></html>\n`;
  const headers = ['imagen', 'estado', 'elegible_proxy', 'motivo', 'ocr_observado', 'esperado_archivo_nombre_no_gt', 'esperado_archivo_productor_no_gt', 'candidatos_no_confirmados', 'identidad_confirmada', 'afinidad', 'ocr_ms_no_e2e', 'top1_proxy_no_identidad', 'top3_proxy_no_identidad', 'denominador_proxy', 'imagenes_declaradas', 'informe_completo_no_aprobado', 'report_sha256', 'alcance_declarado', 'modelStarts_declarados', 'imageUploads_declarados'];
  const records = model.rows.map(row => [row.id, row.status, bool(row.eligible), row.reason, row.ocr.join('\n'), row.expectedName, row.expectedProducer,
    row.proposals.map((item, index) => `${index + 1}. ${item.name} | ${item.producer} | score=${shown(item.score)} (no afinidad ni probabilidad)`).join('\n'),
    'No consta', 'No consta; no calculada', row.ocrMs ?? '', bool(row.top1), bool(row.top3), model.denominator, s.actualNativeVisionImages,
    bool(model.complete), reportSHA256, model.scope, shown(s.modelStarts), shown(s.imageUploads)]);
  return { html, csv: [headers, ...records].map(record => record.map(csvCell112).join(',')).join('\r\n') + '\r\n', model };
}

// Reject symlinks in every input/output ancestor, not merely lexical traversal.
export function verifyLocalPath112(repo, target, kind, io = fs) {
  const base = path.join(repo, 'qa-artifacts');
  const safe = target === base && kind === 'directory' ? base : qaPath112(repo, target);
  for (const current of [repo, base, ...path.relative(base, safe).split(path.sep).map((_, index, parts) => path.join(base, ...parts.slice(0, index + 1)))]) {
    const stat = io.lstatSync(current);
    assert(!stat.isSymbolicLink(), 'SYMLINK_FORBIDDEN');
    assert(current === safe ? (kind === 'file' ? stat.isFile() : stat.isDirectory()) : stat.isDirectory(), 'UNEXPECTED_PATH_TYPE');
  }
  assert(io.realpathSync(safe) === safe, 'NON_CANONICAL_PATH');
  return safe;
}
export function mainReview112(args = process.argv.slice(2), { repo = repo112, io = fs, log = console.log } = {}) {
  assert(args.length === 3, 'Usage: render-matchrim-native112-review.mjs REPORT.json PREPARED_DIR NEW_OUTPUT_DIR');
  const paths = reviewPaths112(repo, ...args);
  verifyLocalPath112(repo, paths.report, 'file', io);
  verifyLocalPath112(repo, paths.prepared, 'directory', io);
  verifyLocalPath112(repo, path.dirname(paths.output), 'directory', io);
  assert(!io.existsSync(paths.output), 'OUTPUT_EXISTS_NO_OVERWRITE');
  assert(io.statSync(paths.report).size <= 32 * 1024 * 1024, 'REPORT_TOO_LARGE');
  const bytes = io.readFileSync(paths.report), reportSHA256 = createHash('sha256').update(bytes).digest('hex');
  const imagePrefix = path.relative(paths.output, paths.prepared).split(path.sep).join('/');
  const result = renderReview112(JSON.parse(bytes.toString('utf8')), { imagePrefix, reportSHA256 });
  // Only inspect neutral image path metadata; never read, copy, fetch or transform image bytes.
  for (const row of result.model.rows) verifyLocalPath112(repo, path.join(paths.prepared, `${row.id}.jpg`), 'file', io);
  io.mkdirSync(paths.output, { mode: 0o700 });
  io.writeFileSync(path.join(paths.output, 'REVIEW.html'), result.html, { flag: 'wx', mode: 0o600 });
  io.writeFileSync(path.join(paths.output, 'REVIEW.csv'), result.csv, { flag: 'wx', mode: 0o600 });
  log(JSON.stringify({ output: paths.output, scenes: result.model.rows.length, denominator: result.model.denominator, complete: result.model.complete, reportSHA256 }));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { mainReview112(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
