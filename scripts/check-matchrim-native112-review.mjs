import assert from 'node:assert/strict';
import { csvCell112, escapeHTML112, mainReview112, qaPath112, renderReview112, reviewModel112, reviewPaths112, validateImageId112, verifyLocalPath112 } from './render-matchrim-native112-review.mjs';

// Synthetic fixtures only: no report/image reads, disk writes, model, browser or network.
globalThis.fetch = () => { throw Error('NETWORK_FORBIDDEN'); };
let checks = 0;
const test = (name, run) => { run(); checks++; console.log('PASS', name); };
const scene = (id, status = 'complete') => ({ imageId: id, status, eligible: status !== 'incomplete',
  reading: { lines: [{ text: 'Synthetic <OCR> & "text"' }], totalMs: 12 },
  expected: { name: '=HYPERLINK("bad")', producer: 'Synthetic producer' },
  proposals: [{ name: '<script>alert(1)</script>', row: { winery: 'Synthetic & winery' }, score: 88 }], top1Hit: true, top3Hit: true });
const fixture = () => ({ summary: { actualNativeVisionImages: 20, attempted: 3, sourceIntegrityVerified: true, complete: false,
  recognitionProxyDenominator: 2, modelStarts: 0, imageUploads: 0 }, scope: 'Synthetic <scope>', mode: 'cache',
  rows: [scene('img-001'), scene('img-002', 'abstained'), scene('img-003', 'incomplete')] });

test('Incomplete coverage never becomes full200 pass; abstentions count, incomplete scenes do not', () => {
  const { html, csv, model } = renderReview112(fixture());
  assert.equal(model.denominator, 2); assert.equal(model.missing, 17); assert.equal(model.complete, false);
  assert(html.includes('20/200')); assert(html.includes('Incompleto')); assert(html.includes('Abstencion (abstained)'));
  assert(html.includes('Denominador proxy elegible: <strong>2</strong>'));
  assert(csv.includes('"incomplete","No"'));
  const report = fixture(); report.summary.complete = true;
  assert.equal(reviewModel112(report).complete, false);
});
test('Complete subset is not a recognition pass; missing integrity removes every eligible row', () => {
  const report = fixture(); report.rows = [scene('img-001')];
  Object.assign(report.summary, { actualNativeVisionImages: 1, attempted: 1, recognitionProxyDenominator: 1, complete: true });
  assert.equal(reviewModel112(report).complete, true);
  assert(renderReview112(report).html.includes('no es un aprobado'));
  report.summary.sourceIntegrityVerified = false; report.summary.recognitionProxyDenominator = 0;
  assert.equal(reviewModel112(report).denominator, 0); assert.equal(reviewModel112(report).complete, false);
});
test('HTML escaping, no remote resource interpolation, semantic headings and contained fixed images', () => {
  const report = fixture(); report.rows[0].reading.lines[0].text = '<img src="https://bad.invalid/a" onerror="x">';
  report.rows[0].receipt = 'https://bad.invalid/private'; report.rows[0].imageURL = 'https://bad.invalid/img.jpg';
  const { html } = renderReview112(report);
  assert.equal(escapeHTML112('&<>"\''), '&amp;&lt;&gt;&quot;&#39;');
  assert(!html.includes('<script>')); assert(!html.includes('src="https:')); assert(!html.includes('onerror="'));
  assert(!html.includes('bad.invalid/private')); assert(html.includes('&lt;script&gt;'));
  for (const required of ['lang="es"', '<h1>', '<h2', '<h3>', '<caption>', 'scope="col"', 'object-fit:contain', 'width="480" height="360"', 'connect-src \'none\'', 'prepared/img-001.jpg']) assert(html.includes(required), required);
});
test('CSV quotes and formula prefixes including controls are neutralized', () => {
  for (const value of ['=1+1', '+1', '-1', '@SUM(A1)', ' \t=1', '\r\n+1', '\u0000=1']) assert(csvCell112(value).startsWith('"\''), value);
  assert.equal(csvCell112('a,"b"\nc'), '"a,""b""\nc"');
  assert(renderReview112(fixture()).csv.includes('"\'=HYPERLINK(""bad"")"'));
});
test('Proposals remain unconfirmed, scores never become affinity; OCR timing stays scoped', () => {
  const { html, csv } = renderReview112(fixture());
  for (const required of ['no confirmados', 'no consta en este esquema', 'no probabilidad ni afinidad', 'No son verdad terreno experta', 'reading.totalMs', 'excluye busqueda', 'imageUploads=0']) assert(html.includes(required), required);
  assert(csv.includes('No consta; no calculada'));
  const report = fixture(); delete report.rows[0].reading.totalMs;
  assert(renderReview112(report).html.includes('No consta ms'));
});
test('Malformed IDs, duplicates, status, denominator and excessive candidates fail closed', () => {
  for (const id of ['img-000', 'img-201', '../img-001', 'img-001.jpg', 'img-001"', 'https://bad']) assert.throws(() => validateImageId112(id));
  for (const mutate of [r => { r.rows[1].imageId = 'img-001'; }, r => { r.rows[0].status = 'passed'; },
    r => { r.rows[2].eligible = true; }, r => { r.summary.recognitionProxyDenominator = 200; },
    r => { r.rows[0].proposals = Array(4).fill(r.rows[0].proposals[0]); }, r => { r.summary.attempted = 200; }]) {
    const report = fixture(); mutate(report); assert.throws(() => renderReview112(report));
  }
  for (const imagePrefix of ['https://bad/prepared', '//bad/prepared', 'prepared"', 'prepared/../private', 'data:prepared']) assert.throws(() => renderReview112(fixture(), { imagePrefix }));
});
test('Paths limited to QA, neutral prepared names, owned outputs and no account114/private access', () => {
  const repo = '/memory/repo';
  for (const value of ['/etc/passwd', 'qa-artifacts/../../outside', 'qa-artifacts/account114/REPORT.json', 'qa-artifacts/account-114/REPORT.json', 'qa-artifacts/private/REPORT.json', 'qa-artifacts/secret.json']) assert.throws(() => qaPath112(repo, value));
  const args = ['qa-artifacts/run112/REPORT.json', 'qa-artifacts/public/prepared', 'qa-artifacts/native112-review-r1'];
  assert.equal(reviewPaths112(repo, ...args).output, '/memory/repo/qa-artifacts/native112-review-r1');
  assert.throws(() => reviewPaths112(repo, args[0], args[1], 'qa-artifacts/old-evidence'));
  assert.throws(() => reviewPaths112(repo, args[0], 'qa-artifacts/portraits', args[2]));
});
test('Symlinks and noncanonical ancestors rejected using memory-only filesystem doubles', () => {
  const repo = '/memory/repo', target = repo + '/qa-artifacts/run112/REPORT.json';
  const io = { lstatSync: current => ({ isSymbolicLink: () => current.endsWith('/run112'), isFile: () => current === target, isDirectory: () => current !== target }), realpathSync: current => current };
  assert.throws(() => verifyLocalPath112(repo, target, 'file', io), /SYMLINK/);
  io.lstatSync = current => ({ isSymbolicLink: () => false, isFile: () => current === target, isDirectory: () => current !== target });
  assert.equal(verifyLocalPath112(repo, target, 'file', io), target);
  assert.equal(verifyLocalPath112(repo, repo + '/qa-artifacts', 'directory', io), repo + '/qa-artifacts');
  io.realpathSync = () => '/private/elsewhere'; assert.throws(() => verifyLocalPath112(repo, target, 'file', io), /CANONICAL/);
});
test('CLI writes only two owned files exclusively; reruns preserve evidence (all IO mocked)', () => {
  const repo = '/memory/repo', qa = repo + '/qa-artifacts', output = qa + '/native112-review-r1';
  const report = qa + '/run112/REPORT.json', prepared = qa + '/images/prepared';
  const files = new Map([[report, Buffer.from(JSON.stringify(fixture()))]]);
  const directories = new Set([repo, qa, qa + '/run112', qa + '/images', prepared]);
  for (const id of ['001', '002', '003']) files.set(`${prepared}/img-${id}.jpg`, Buffer.from('NOT_READ'));
  let reads = 0;
  const io = {
    lstatSync: current => { assert(files.has(current) || directories.has(current), current); return {
      isSymbolicLink: () => false, isFile: () => files.has(current), isDirectory: () => directories.has(current) }; },
    realpathSync: current => current, existsSync: current => files.has(current) || directories.has(current),
    statSync: current => ({ size: files.get(current).length }),
    readFileSync: current => { assert.equal(current, report); reads++; return files.get(current); },
    mkdirSync: (current, options) => { assert.equal(current, output); assert(!directories.has(current)); assert.equal(options.mode, 0o700); directories.add(current); },
    writeFileSync: (current, value, options) => {
      assert([output + '/REVIEW.html', output + '/REVIEW.csv'].includes(current));
      assert.equal(options.flag, 'wx'); assert.equal(options.mode, 0o600); assert(!files.has(current)); files.set(current, value);
    },
  };
  const args = [report, prepared, output], deps = { repo, io, log: () => undefined };
  mainReview112(args, deps); assert.equal(reads, 1);
  const snapshot = [...files]; assert(files.get(output + '/REVIEW.html').includes('../images/prepared/img-001.jpg'));
  assert.throws(() => mainReview112(args, deps), /NO_OVERWRITE/); assert.deepEqual([...files], snapshot);
});
console.log(JSON.stringify({ passed: true, checks, diskWrites: 0, artifactReads: 0, networkCalls: 0, modelStarts: 0 }));
