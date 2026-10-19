import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as scan from '../src/utils/multiWineScan';
import * as policy from '../src/utils/scanAnalysisPolicy';
import * as identity from '../src/utils/winerimLabelIdentity';
import * as picker from '../src/utils/winerimCandidateSearch95';
import { canLookupWinerimOriginal, catalogWineFromVerifiedSheet, isVerifiedWinerimSheetForIdentity,
  lookupWinerimOriginalSheet } from '../src/utils/winerimOriginalSheet';
import { nativeLabelKeyboard96, restoreNativeLabelKeyboard96 } from './check-matchrim-label-keyboard96';
import { restoreManualLookup96, restoreManualLookupGuard96, manualLookup96Result } from './check-matchrim-manual-lookup-bridge96.mjs';

// Synthetic contracts only. No images, ground truth, private paths or real API.
const baseline = 'ebee038059778f1f10bdb5dd647bccb8324fb580';
const before = (path: string) => execFileSync('git', ['show', `${baseline}:${path}`], { encoding: 'utf8' });
const current = (path: string) => restoreManualLookupGuard96(path, restoreManualLookup96(path, readFileSync(path, 'utf8')));
const labelUi96 = {
  path: 'src/components/wine-import/MultiWineLabelScanner.tsx',
  revision: '2dc2246207e600d1767637803891383f2aaad60c',
  beforeHash: 'bc496d943d6ed7631c3505e1b63f11a18c0e641a31f2cf6a9ae9763773ae4146',
  currentHash: '9d2123e37af1de7d69a55c3f9dd333b04ef7c5f6940ccc747bc27117737c860f',
  priorNativeClassHash: 'b48b9fb5ac81cfb3eeb329f3e99b9709d5a0c22851bdf049280031784efcd11a',
};
const keyboard96 = { path: 'scripts/check-matchrim-label-keyboard96.ts',
  testHash: '54a47abda40574d0b74551825f50ddb87042306fd95755aa8a2f85d4c56339c3' };
const labelClassAmendments96: [string, string][] = [
  ['className="matchrim-pressable flex min-h-16 w-full items-center gap-3 px-3 py-3 text-left hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-800"',
    `className={isNative
                      ? 'matchrim-pressable flex min-h-16 w-full min-w-0 flex-col items-stretch gap-2 px-3 py-3 text-left hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-800'
                      : 'matchrim-pressable flex min-h-16 w-full items-center gap-3 px-3 py-3 text-left hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-800'}`],
  ['className="min-w-0 flex-1"', "className={isNative ? 'min-w-0 w-full' : 'min-w-0 flex-1'}"],
  ['className="shrink-0 text-right"', "className={isNative ? 'min-w-0 w-full text-left [overflow-wrap:anywhere]' : 'shrink-0 text-right'}"],
  ['className="flex min-h-16 w-full items-start gap-3 px-3 py-3 text-left focus-visible:ring-2 focus-visible:ring-red-800"',
    `className={isNative
                        ? 'flex min-h-16 w-full min-w-0 flex-col items-stretch gap-2 px-3 py-3 text-left focus-visible:ring-2 focus-visible:ring-red-800'
                        : 'flex min-h-16 w-full items-start gap-3 px-3 py-3 text-left focus-visible:ring-2 focus-visible:ring-red-800'}`],
  ['className="min-w-0"', "className={isNative ? 'min-w-0 w-full [overflow-wrap:anywhere]' : 'min-w-0'}"],
];
const restoreLabelClasses96 = (source: string) => {
  for (const [original, revised] of labelClassAmendments96) {
    assert.equal(source.split(revised).length - 1, 1, `Exactly one reviewed class amendment: ${original}`);
    source = source.replace(revised, original);
  }
  return source;
};
const labelWebProjection96 = (source: string) => {
  const tree = ts.createSourceFile(labelUi96.path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let projected = 0;
  const transformed = ts.transform(tree, [context => {
    const visit: ts.Visitor = node => {
      if (ts.isJsxAttribute(node) && node.name.getText(tree) === 'className'
        && node.initializer && ts.isJsxExpression(node.initializer)) {
        const value = node.initializer.expression;
        if (value && ts.isConditionalExpression(value) && ts.isIdentifier(value.condition)
          && value.condition.text === 'isNative' && ts.isStringLiteral(value.whenTrue) && ts.isStringLiteral(value.whenFalse)) {
          projected++;
          return context.factory.updateJsxAttribute(node, node.name, context.factory.createStringLiteral(value.whenFalse.text));
        }
      }
      return ts.visitEachChild(node, visit, context);
    };
    return root => ts.visitNode(root, visit) as ts.SourceFile;
  }]);
  try { return { source: ts.createPrinter({ removeComments: true }).printFile(transformed.transformed[0]), projected }; }
  finally { transformed.dispose(); }
};
let labelUi96Result: { classAmendments: number; rejectedMutations: number; exactSourceRestored: boolean; fullWebAstEqual: boolean } | undefined;
let nativeKeyboardBridge: object | undefined;
const groups: string[] = [];
const check = async (name: string, run: () => void | Promise<void>) => { await run(); groups.push(name); console.log('PASS', name); };
const oldFetch = globalThis.fetch;
let forbiddenFetches = 0;
globalThis.fetch = async () => { forbiddenFetches++; throw new Error('Real transport forbidden in recognition96 units'); };

const ast = (path: string, text: string) => ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const printer = ts.createPrinter({ removeComments: true });
const initializer = (file: ts.SourceFile, name: string): ts.Expression => {
  for (const statement of file.statements) if (ts.isVariableStatement(statement)) {
    for (const declaration of statement.declarationList.declarations) {
      if (declaration.name.getText(file) === name && declaration.initializer) return declaration.initializer;
    }
  }
  throw new Error(`Missing actual initializer: ${name}`);
};
const outside = (file: ts.SourceFile, names: string[]) => file.statements.filter(statement => {
  if (ts.isImportDeclaration(statement) && statement.moduleSpecifier.getText(file) === "'./winerimLabelIdentity'") return false;
  return !ts.isVariableStatement(statement) || !statement.declarationList.declarations.some(value => names.includes(value.name.getText(file)));
}).map(statement => printer.printNode(ts.EmitHint.Unspecified, statement, file));
const oldMulti = ast('multi.ts', before('src/utils/multiWineScan.ts'));
const newMulti = ast('multi.ts', current('src/utils/multiWineScan.ts'));
const restoredC5Multi = current('src/utils/multiWineScan.ts')
  .replace("import { hasWinerimGeographyConflict, type WinerimOriginalSheet } from './winerimOriginalSheet';", "import type { WinerimOriginalSheet } from './winerimOriginalSheet';")
  .replace(`const hasUnresolvedProducerGeographyConflict = ${initializer(newMulti, 'hasUnresolvedProducerGeographyConflict').getText(newMulti)};\n\n`, '')
  .replace('  if (hasUnresolvedProducerGeographyConflict(left, right)) return true;\n', '')
  .replace('      const geographicSplit = canGroup && groups.some(group => buildCanonicalWineKey(group.candidate) === canonicalKey\n        && members.get(group)?.some(member => hasUnresolvedProducerGeographyConflict(member, candidate)));\n', '')
  .replace('key: canGroup && !geographicSplit ?', 'key: canGroup ?');
const oldPolicy = ast('policy.ts', before('src/utils/scanAnalysisPolicy.ts'));
const newPolicy = ast('policy.ts', current('src/utils/scanAnalysisPolicy.ts'));
const makeRegions = (count = 36): scan.ScanRegion[] => Array.from({ length: count }, (_, i) => ({
  id: `synthetic-${i}`, index: i + 1, objectType: 'bottle',
  box: { x: i % 3 * 33, y: Math.floor(i / 3) % 3 * 33, width: 8, height: 10 },
  detectionConfidence: .8 + Math.floor(i / 9) * .02,
  quality: { glare: 'low', occlusion: 'low', legibility: 'good' }, status: 'pending',
  candidates: [], selectedCandidateId: null, duplicateCount: 1,
}));
const cell = (row: scan.ScanRegion) => Math.min(2, Math.floor((row.box.y + row.box.height / 2) * 3 / 100)) * 3
  + Math.min(2, Math.floor((row.box.x + row.box.width / 2) * 3 / 100));
const row = { id: 123, name: 'Synthetic Luna Reserva', subname: null, winery: 'Synthetic Estate', vintage: null,
  slugname: 'Synthetic-Luna-Reserva', type: 'tinto', region: 'Synthetic Valley', country: 'ZZ',
  tastingAttributes: { power: 0, acidity: .4, sweetness: 1, tannin: 0, fruity: 5 }, grapes: [] };
const uuid = 'b653e084-e8e1-448c-bc03-507a1cea3810';
const net = (rows: unknown[] = [row], detail: unknown = row, count = rows.length) => {
  const calls: URL[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(String(input)); calls.push(url);
    assert.equal(url.origin, 'https://app.winerim.com'); assert.equal(url.username + url.password, '');
    assert.equal(init?.method, 'GET'); assert.equal(init?.credentials, 'omit'); assert.equal(init?.redirect, 'error');
    assert.equal(init?.referrerPolicy, 'no-referrer');
    assert.deepEqual([...new Headers(init?.headers).keys()], ['accept']);
    assert.ok(init?.signal instanceof AbortSignal);
    let response: unknown;
    if (url.pathname === '/api/v1/whoami/slugname') response = { restaurant: uuid };
    else if (url.pathname === `/api/v1/restaurant/${uuid}/wines`) response = { page: 1, count, results: rows };
    else { assert.equal(url.pathname, `/api/v1/restaurant/${uuid}/wines/${row.id}/${row.slugname}`); response = detail; }
    return new Response(JSON.stringify(response), { headers: { 'Content-Type': 'application/json' } });
  };
  return { calls, fetcher };
};
const groupingCandidate = (patch: Partial<scan.WineCandidate> = {}): scan.WineCandidate => ({
  id: 'synthetic-candidate', name: row.name, producer: null, vintage: null, region: 'Synthetic East', country: 'AA',
  grapes: [], alcohol: null, confidence: .91, source: 'label', evidence: ['synthetic literal name'],
  uncertaintyReasons: ['Producer needs review'], inferredFields: ['producer'], affinity: null, ...patch,
});
const groupingRegions = (candidates: scan.WineCandidate[]): scan.ScanRegion[] => candidates.map((candidate, index) => ({
  ...makeRegions(candidates.length)[index], id: `synthetic-group-${index}`, candidates: [candidate],
  selectedCandidateId: candidate.id, status: scan.determineRegionStatus([candidate]),
}));

try {
  await check('All multi-scan detector/crop/confirmation/concurrency AST outside normalization and precise C6 grouping remains unchanged', () => {
    const restored = ast('multi.ts', restoredC5Multi);
    assert.deepEqual(outside(restored, ['normalizeWineCandidates']), outside(oldMulti, ['normalizeWineCandidates']));
  });
  await check('C6 restores full exact C5 source by removing only the domain import, narrow conflict helper/gate and split-key protection', () => {
    assert.equal(createHash('sha256').update(restoredC5Multi).digest('hex'), 'a0ceb3d1d0266bcd44780217017d06c1a4fb721d8e12af54f4f2de0df919a0dd');
    const restored = ast('multi.ts', restoredC5Multi);
    for (const name of ['hasWineIdentityConflict', 'groupDuplicateWines']) {
      assert.equal(initializer(restored, name).getText(restored), initializer(oldMulti, name).getText(oldMulti), 'All existing producer/vintage/canonical/member bridge checks remain exact');
    }
  });
  await check('Cleared wrong-role producers with conflicting supplied geography remain two uncertain groups with unique UI keys', () => {
    const raw = (producer: string, country: string) => ({ name: row.name, producer, region: producer, country, confidence: .93,
      evidence: ['synthetic literal name', 'synthetic location'], vintage: null });
    const candidates = [scan.normalizeWineCandidates({ candidates: [raw('PlaceAlpha', 'AA')] }, 'a')[0],
      scan.normalizeWineCandidates({ candidates: [raw('PlaceBeta', 'BB')] }, 'b')[0]];
    const regions = groupingRegions(candidates), groups = scan.groupDuplicateWines(regions);
    assert.equal(groups.length, 2); assert.equal(new Set(groups.map(group => group.key)).size, 2);
    assert.equal(scan.areLikelyDuplicateWines(...candidates as [scan.WineCandidate, scan.WineCandidate]), false);
    assert.ok(regions.every(region => region.status === 'uncertain'));
    assert.deepEqual(groups.flatMap(group => group.regionIds).sort(), regions.map(region => region.id).sort());
    assert.ok(candidates.every(candidate => candidate.producer === null && candidate.inferredFields.includes('producer') && candidate.affinity === null && !candidate.canonicalId));
    assert.equal(scan.getConfirmableWineGroups(regions).length, 0);
  });
  await check('An inferred producer on either side and established producer aliases trigger only explicit geographic conflicts', () => {
    for (const field of ['producer', 'productor', 'winery', 'bodega']) {
      const left = groupingCandidate({ inferredFields: [field] }), right = groupingCandidate({ inferredFields: [], country: 'BB' });
      assert.equal(scan.groupDuplicateWines(groupingRegions([left, right])).length, 2);
      assert.equal(scan.groupDuplicateWines(groupingRegions([right, left])).length, 2);
    }
    const geographicConflictOnly = [groupingCandidate(), groupingCandidate({ region: 'Synthetic West' })];
    assert.equal(scan.groupDuplicateWines(groupingRegions(geographicConflictOnly)).length, 2);
  });
  await check('Same geography, existing country aliases and compatible region subsets retain legitimate duplicate groups', () => {
    for (const pair of [
      [groupingCandidate(), groupingCandidate()],
      [groupingCandidate({ country: 'Italy' }), groupingCandidate({ country: 'Italia' })],
      [groupingCandidate({ region: 'Synthetic Valley' }), groupingCandidate({ region: 'Upper Synthetic Valley' })],
    ]) {
      assert.equal(scan.groupDuplicateWines(groupingRegions(pair)).length, 1);
      assert.equal(scan.areLikelyDuplicateWines(...pair as [scan.WineCandidate, scan.WineCandidate]), true);
    }
  });
  await check('Unknown or explicitly inferred geography cannot manufacture a conflict; legacy grouping without inferred producers remains exact', () => {
    for (const pair of [
      [groupingCandidate({ region: null, country: null }), groupingCandidate()],
      [groupingCandidate({ region: 'Synthetic West', inferredFields: ['producer', 'region'] }), groupingCandidate()],
      [groupingCandidate({ country: 'BB', inferredFields: ['producer', 'country'] }), groupingCandidate()],
      [groupingCandidate({ country: 'BB', inferredFields: ['producer', 'pa\u00eds'] }), groupingCandidate()],
      [groupingCandidate({ inferredFields: [] }), groupingCandidate({ region: 'Synthetic West', country: 'BB', inferredFields: [] })],
    ]) assert.equal(scan.groupDuplicateWines(groupingRegions(pair)).length, 1);
  });
  await check('An incomplete strongest representative cannot bridge conflicting geography retained by another group member', () => {
    const east = groupingCandidate({ confidence: .8 }), incomplete = groupingCandidate({ region: null, country: null, confidence: .99 }),
      west = groupingCandidate({ region: 'Synthetic West', confidence: .9 });
    const groups = scan.groupDuplicateWines(groupingRegions([east, incomplete, west]));
    assert.equal(groups.length, 2); assert.equal(new Set(groups.map(group => group.key)).size, 2);
    assert.deepEqual(groups[0].regionIds, ['synthetic-group-0', 'synthetic-group-1']);
    assert.equal(groups[0].candidate, incomplete); assert.deepEqual(groups[1].regionIds, ['synthetic-group-2']);
  });
  await check('Proper producer/manual/canonical positive duplicates and explicit producer/year/ID conflicts retain existing behavior', () => {
    const proper = groupingCandidate({ producer: 'Synthetic Estate', inferredFields: [], uncertaintyReasons: [] });
    const manual = scan.correctWineCandidateIdentity(groupingCandidate(), { name: row.name, producer: 'Synthetic Estate' });
    for (const pair of [[proper, { ...proper }], [manual, { ...manual }],
      [{ ...proper, canonicalId: 'synthetic-record-a' }, { ...proper, canonicalId: 'synthetic-record-a' }]]) {
      assert.equal(scan.groupDuplicateWines(groupingRegions(pair)).length, 1);
      assert.ok(pair.every(candidate => candidate.affinity === null));
    }
    for (const pair of [[proper, { ...proper, producer: 'Different Estate' }],
      [{ ...proper, vintage: 2020 }, { ...proper, vintage: 2021 }],
      [{ ...proper, canonicalId: 'synthetic-record-a' }, { ...proper, canonicalId: 'synthetic-record-b' }]]) {
      assert.equal(scan.groupDuplicateWines(groupingRegions(pair)).length, 2);
    }
    const corrected = scan.correctWineCandidateIdentity(groupingCandidate(), { producer: 'Synthetic Estate' });
    assert.deepEqual(corrected.inferredFields, []); assert.equal(corrected.region, null); assert.equal(corrected.country, null);
    assert.equal(corrected.affinity, null); assert.equal(corrected.canonicalId, null);
  });
  await check('C6 grouping does not mutate uncertainty, literal geography, confidence, source, sensory or save evidence', () => {
    const regions = groupingRegions([groupingCandidate(), groupingCandidate({ region: 'Synthetic West' })]);
    const snapshot = JSON.stringify(regions); scan.groupDuplicateWines(regions); scan.getConfirmableWineGroups(regions);
    assert.equal(JSON.stringify(regions), snapshot);
    assert.equal(scan.getConfirmableWineGroups(regions).length, 0);
  });
  await check('All policy preflight/quality/budget/cancel/continuation AST outside first-batch scheduling remains unchanged', () => {
    assert.deepEqual(outside(newPolicy, ['planRegionAnalysis']), outside(oldPolicy, ['planRegionAnalysis']));
  });
  await check('Canonical identity AST adds only the declared producer-role rejection', () => {
    const path = 'src/utils/winerimLabelIdentity.ts', old = ast(path, before(path)), now = ast(path, current(path));
    assert.deepEqual(outside(now, ['hasLabelProducerRoleConflict', 'isSafeCanonicalLabelMatch']), outside(old, ['isSafeCanonicalLabelMatch']));
    const oldMatch = initializer(old, 'isSafeCanonicalLabelMatch').getText(old);
    const newMatch = initializer(now, 'isSafeCanonicalLabelMatch').getText(now);
    const guard = '\n  if (hasLabelProducerRoleConflict(input, candidate) || hasLabelProducerRoleConflict(candidate, input)) return false;';
    assert.equal(newMatch.split(guard).length, 2); assert.equal(newMatch.replace(guard, ''), oldMatch);
  });
  await check('Picker full source changes only private geography validation, never requests/detail/owner acceptance', () => {
    const path = 'src/utils/winerimCandidateSearch95.ts';
    const restored = current(path)
      .replace("import { hasLabelProducerRoleConflict } from './winerimLabelIdentity';\n", '')
      .replace('  country: publicText(160).nullable().optional(),\n', '')
      .replace("'type', 'region', 'country']", "'type', 'region']")
      .replace('  if (hasLabelProducerRoleConflict({ producer: wine.winery, region: wine.region, country: wine.country })) return null;\n', '');
    assert.equal(restored, before(path));
  });
  await check('Actual scanner lifecycle closures and crop geometry stay byte exact', () => {
    const scanner = current(labelUi96.path), original = before(labelUi96.path);
    const historical = execFileSync('git', ['show', `${labelUi96.revision}:${labelUi96.path}`], { encoding: 'utf8' });
    const sha = (source: string) => createHash('sha256').update(source).digest('hex');
    assert.equal(sha(original), labelUi96.beforeHash);
    assert.equal(historical, original, 'The complete reviewed2dc scanner is still the original ebee scanner');
    assert.equal(sha(scanner), labelUi96.currentHash, 'Exact frozen C native-list UI source');
    assert.equal(sha(restoreNativeLabelKeyboard96(scanner)), labelUi96.priorNativeClassHash, 'Declared3a native keyboard/count inverse restores whole05ca/b48');
    const legacyWeb = labelWebProjection96(original);
    assert.equal(legacyWeb.projected, 0);
    const prove = (source: string) => {
      const classSource = restoreNativeLabelKeyboard96(source);
      assert.equal(restoreLabelClasses96(classSource), original, 'After the declared keyboard inverse, every byte outside the five exact native classes, including every callback, remains unchanged');
      const web = labelWebProjection96(classSource);
      assert.equal(web.projected, 5);
      assert.equal(web.source, legacyWeb.source, 'After the declared keyboard inverse, complete web-false module AST, text, attributes and callbacks remain unchanged');
    };
    prove(scanner);
    const mutations: [string, string, string][] = labelClassAmendments96.map(([, revised], index) =>
      [`native class ${index + 1}`, revised, revised.replace('min-w-0', 'min-w-[1px]')]);
    mutations.push(
      ['web class', "'min-w-0 flex-1'", "'min-w-0 w-1'"],
      ['callback', 'onClick={() => setSelectedRegionId(regions.find', 'onClick={() => setSelectedRegionId(regions.filter'],
      ['threshold', 'candidate.confidence >= 0.72', 'candidate.confidence >= 0.71'],
      ['crop', 'cropImageRegionWithQuality(', 'cropImageRegion('],
      ['ARIA', 'Abrir detalle de ${group.candidate.name}', 'Detalle ${group.candidate.name}'],
      ['raw affinity bypass', 'isNative ? consumer?.affinityValue :', 'isNative ? group.candidate.affinity :'],
      ['fabricated score', 'isNative ? consumer?.affinityValue :', "isNative ? '99/100' :"],
      ['native gate inversion', 'className={isNative\n', 'className={!isNative\n'],
      ['missing amendment', labelClassAmendments96[1][1], labelClassAmendments96[1][0]],
      ['duplicate amendment', labelClassAmendments96[1][1], labelClassAmendments96[1][1] + labelClassAmendments96[1][1]],
    );
    for (const [name, from, to] of mutations) {
      assert.ok(scanner.includes(from), `Applicable negative control: ${name}`);
      const changed = scanner.replace(from, to);
      assert.notEqual(changed, scanner, name);
      assert.throws(() => prove(changed), undefined, `Scope proof must reject ${name} independently of the source fingerprint`);
    }
    assert.equal(mutations.length, 15);
    assert.equal(current('src/utils/imageCropGeometry.ts'), before('src/utils/imageCropGeometry.ts'));
    labelUi96Result = { classAmendments: 5, rejectedMutations: mutations.length, exactSourceRestored: true, fullWebAstEqual: true };
  });
  await check('Declared native keyboard/count bridge runs all five original proxy groups and rejects14 gate/ref/copy/handler/crop leaks', () => {
    assert.equal(createHash('sha256').update(current(keyboard96.path)).digest('hex'), keyboard96.testHash);
    const output = execFileSync(process.execPath, ['--import', 'tsx', keyboard96.path], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60_000, maxBuffer: 1024 * 1024,
    });
    assert.equal(output.split('\n').filter(line => line.startsWith('PASS ')).length, 5);
    const report = JSON.parse(output.trim().split('\n').at(-1)!);
    assert.equal(report.passed, true); assert.equal(report.groups, 5); assert.equal(report.baseline, '05ca1e2');
    assert.equal(report.sourceSha256, labelUi96.currentHash); assert.equal(report.SDKOrNativeRuntimeUsed, false);
    assert.equal(report.appOrProviderCalls, 0); assert.equal(report.ui, null);
    assert.deepEqual(report.nativeKeyboardBridge, { ...nativeLabelKeyboard96, earlyNativeGuard: true,
      refsUndefinedOnWeb: true, whole05caSourceRestored: true, rejectedMutations: 14 });
    nativeKeyboardBridge = { ...keyboard96, ...report.nativeKeyboardBridge, childGroups: 5 };
  });
  await check('Original helper source adds only symmetric producer-role gates before the exact-name shortcut', () => {
    const path = 'src/utils/winerimOriginalSheet.ts';
    const added = '  !hasLabelProducerRoleConflict(input, wine)\n  && !hasLabelProducerRoleConflict(wine, input)\n  && (';
    assert.equal(current(path).split(added).length, 2);
    const restored = current(path)
      .replace('canonicalProducerKey, hasLabelProducerRoleConflict, isSafeCanonicalLabelMatch', 'canonicalProducerKey, isSafeCanonicalLabelMatch')
      .replace(added, '  (');
    assert.equal(restored, before(path), 'All GET, parser, timeout, scale, vintage and other identity logic remains byte exact');
  });
  await check('Only complete supplied geographic values conflict, with diacritic and slash normalization', () => {
    for (const value of [{ producer: 'Valley', region: 'Valley' }, { producer: 'ZZ', country: 'ZZ' },
      { producer: 'Valley', region: 'Valley / ZZ' }, { producer: 'Valley ZZ', region: 'Valley', country: 'ZZ' },
      { producer: 'Region de Prueba', region: 'Regi\u00f3n de Prueba' }]) assert.equal(identity.hasLabelProducerRoleConflict(value), true);
    for (const producer of ['Bodegas Valley', 'Valley Alta', 'ZZ Estate']) {
      const value = { name: row.name, producer, region: 'Valley', country: 'ZZ' };
      assert.equal(identity.hasLabelProducerRoleConflict(value), false); assert.equal(identity.isSafeCanonicalLabelMatch(value, value), true);
    }
  });
  await check('A location supplied only by the returned source cannot complete canonical winery evidence', () => {
    assert.equal(identity.isSafeCanonicalLabelMatch({ name: row.name, producer: 'Valley' },
      { name: row.name, producer: 'Valley', region: 'Valley' }), false);
    assert.equal(canLookupWinerimOriginal({ name: row.name, producer: 'ZZ', country: 'ZZ' }), false);
  });
  await check('Wrong-role normalization preserves literal name/evidence/confidence/unknown vintage but removes winery authority', () => {
    const payload = { candidates: [{ name: row.name, producer: 'Valley', region: 'Valley', confidence: .91, vintage: null,
      evidence: ['Synthetic Luna Reserva', 'Zone: Valley'], affinity: 99, canonicalId: 'forged', sensory_attributes: { potencia: 4 } }] };
    const result = scan.normalizeWineCandidates(payload, 'synthetic')[0];
    assert.equal(result.name, row.name); assert.equal(result.producer, null); assert.equal(result.region, 'Valley');
    assert.equal(result.confidence, .91); assert.equal(result.vintage, null); assert.equal(result.source, 'label');
    assert.deepEqual(result.evidence, payload.candidates[0].evidence); assert.ok(result.inferredFields.includes('producer'));
    assert.equal(result.affinity, null); assert.equal(result.canonicalId, undefined); assert.equal(result.sensorySource, 'inference');
    assert.equal(scan.determineRegionStatus([result]), 'uncertain');
  });
  await check('Unknown producer stays unknown and generic grape/style cannot be promoted by a geographic producer', () => {
    const [valid] = scan.normalizeWineCandidates({ candidates: [{ name: row.name, producer: null, region: 'Valley' }] }, 'r');
    assert.equal(valid.producer, null); assert.equal(valid.region, 'Valley'); assert.equal(valid.affinity, null);
    assert.deepEqual(scan.normalizeWineCandidates({ candidates: [{ name: 'Prosecco', producer: 'Valley', region: 'Valley' }] }, 'r'), []);
    assert.deepEqual(scan.normalizeWineCandidates({ candidates: [], visible_text: ['partial'] }, 'r'), []);
  });
  await check('Proper winery positive retains qualifier/vintage checks and canonical ambiguity rejection', () => {
    const value = { name: row.name, producer: row.winery, vintage: 2021 };
    assert.equal(identity.isSafeCanonicalLabelMatch(value, value), true);
    for (const patch of [{ name: 'Synthetic Luna Gran Reserva' }, { producer: 'Other Estate' }, { vintage: 2022 }]) {
      assert.equal(identity.isSafeCanonicalLabelMatch(value, { ...value, ...patch }), false);
    }
    assert.equal(identity.hasAmbiguousCanonicalMatches(value, [{ ...value, id: '1' }, { ...value, id: '2' }]), true);
  });
  await check('Dense first12 includes all nine occupied cells without adding analyses', () => {
    const regions = makeRegions(), plan = policy.planRegionAnalysis(regions, 2400, 2400);
    assert.equal(plan.automatic.length, 12); assert.equal(plan.deferred.length, 24);
    assert.equal(new Set(plan.automatic.map(cell)).size, 9);
    for (const selected of plan.automatic.slice(0, 9)) assert.equal(selected.id, `synthetic-${27 + cell(selected)}`);
  });
  await check('Selection preserves IDs/indexes, immutable inputs and deterministic per-cell quality order', () => {
    const regions = makeRegions(), snapshot = JSON.stringify(regions), plan = policy.planRegionAnalysis(regions, 2400, 2400);
    assert.equal(JSON.stringify(regions), snapshot);
    for (const selected of plan.automatic) assert.ok(regions.includes(selected));
    const combined = [...plan.automatic, ...plan.deferred];
    assert.equal(new Set(combined.map(region => region.id)).size, regions.length);
    for (const region of combined) assert.equal(region.index, regions.find(original => original.id === region.id)!.index);
    assert.deepEqual(policy.planRegionAnalysis([...regions].reverse(), 2400, 2400).automatic.map(region => region.id), plan.automatic.map(region => region.id));
  });
  await check('Small scenes and a single occupied cell retain actual existing quality priority', () => {
    for (const regions of [makeRegions(8), makeRegions(20).map(region => ({ ...region, box: { x: 0, y: 0, width: 8, height: 10 } }))]) {
      assert.deepEqual(policy.planRegionAnalysis(regions, 2400, 2400).automatic.map(region => region.id),
        scan.prioritizeRegionsForAnalysis(regions).slice(0, 12).map(region => region.id));
    }
  });
  await check('Spatial fairness never overrides64px preflight, automatic poor-text or exposure guards', () => {
    const regions = makeRegions(), poor = { ...regions[0], quality: { ...regions[0].quality, legibility: 'poor' as const } };
    const small = { ...regions[1], box: { x: 0, y: 0, width: 6.3, height: 10 } };
    assert.equal(policy.regionPreflight(small, 1000, 1000)?.code, 'resolution');
    assert.equal(policy.regionPreflight(small, 1000, 1000, true)?.code, 'resolution');
    const plan = policy.planRegionAnalysis([poor, small, ...regions.slice(2)], 1000, 1000);
    assert.equal(plan.automatic.some(region => region.id === poor.id || region.id === small.id), false);
    assert.equal(policy.cropQualityDeferral({ brightness: 250, contrast: 20 })?.code, 'exposure');
    assert.equal(policy.cropQualityDeferral({ brightness: 100, contrast: 7 })?.code, 'exposure');
  });
  await check('Continuation submits every eligible synthetic region once, excluding attempted or discarded work', () => {
    let regions = makeRegions(); const submitted: string[] = [];
    for (let i = 0; i < 3; i++) {
      const plan = policy.planAdditionalRegionAnalysis(regions, 2400, 2400);
      assert.equal(plan.automatic.length, 12); submitted.push(...plan.automatic.map(region => region.id));
      const completed = new Set(plan.automatic.map(region => region.id));
      const deferred = new Map(plan.deferred.map(region => [region.id, region]));
      regions = regions.map(region => completed.has(region.id) ? { ...region, status: 'uncertain' } : deferred.get(region.id) ?? region);
    }
    assert.equal(new Set(submitted).size, 36);
    assert.equal(policy.planAdditionalRegionAnalysis(regions, 2400, 2400).automatic.length, 0);
    for (const status of ['recognized', 'uncertain', 'unrecognized', 'discarded', 'analyzing'] as const) {
      assert.equal(policy.planAdditionalRegionAnalysis([{ ...makeRegions(1)[0], status }], 2400, 2400).automatic.length, 0);
    }
  });
  await check('Operational budgets and abort guards stay12 automatic/24 Edge/four manual with no extra reservation', () => {
    assert.equal(policy.MAX_AUTOMATIC_REGION_ANALYSES, 12); assert.equal(policy.MAX_SCAN_EDGE_REQUESTS, 24);
    assert.equal(policy.MAX_MANUAL_REGION_REQUESTS, 4);
    const controller = new AbortController(), budget = policy.createScanRequestBudget();
    for (let i = 0; i < 24; i++) budget.reserve(controller.signal);
    assert.throws(() => budget.reserve(controller.signal), policy.ScanRequestLimitError);
    controller.abort(); const aborted = policy.createScanRequestBudget();
    assert.throws(() => aborted.reserve(controller.signal), { name: 'AbortError' }); assert.equal(aborted.used, 0);
  });
  await check('Public query returns only seven identity fields, never sensory, country, photo, price or profile', async () => {
    const mock = net([{ ...row, photo: 'never-fetched', profile: 'synthetic', price: 99 }]);
    const result = await picker.searchWinerimCandidates95('Synthetic Luna', undefined, mock.fetcher);
    assert.equal(result.status, 'proposals'); assert.equal(mock.calls.length, 2);
    if (result.status !== 'proposals') throw new Error('Expected proposals');
    assert.deepEqual(Object.keys(result.proposals[0]).sort(), ['id', 'name', 'region', 'slug', 'type', 'vintage', 'winery']);
    assert.equal(result.proposals[0].vintage, null);
  });
  await check('Geographic catalogue winery roles return refine rather than an identity proposal', async () => {
    for (const patch of [{ winery: row.region }, { winery: row.country, region: null }]) {
      const mock = net([{ ...row, ...patch }]);
      assert.equal((await picker.searchWinerimCandidates95('Synthetic Luna', undefined, mock.fetcher)).status, 'refine');
      assert.equal(mock.calls.length, 2);
    }
  });
  await check('Exact independent E counterexample: absent input geography cannot bypass source producer-role rejection', async () => {
    const input = { name: 'Synthetic Estate Cuvee', producer: 'Synthetic Valley', vintage: null, region: null, country: null };
    const source = { id: '123', name: input.name, producer: input.producer, vintage: null, region: 'Synthetic Valley', country: 'ZZ' };
    const sheet = { ...source, grapes: [], url: 'https://web.winerim.com/the-library/wines/123/synthetic-estate-cuvee', detailVerified: true };
    const raw = { id: 123, name: input.name, winery: input.producer, vintage: null, region: source.region, country: source.country,
      slugname: 'synthetic-estate-cuvee', type: 'tinto', grapes: [],
      tastingAttributes: { power: 0, acidity: 1, sweetness: 2, tannin: 3, fruity: 4 } };
    assert.equal(identity.hasLabelProducerRoleConflict(source), true);
    assert.equal(identity.isSafeCanonicalLabelMatch(input, source), false);
    assert.equal(canLookupWinerimOriginal(input), true, 'Unknown input geography alone is not a reason to guess a conflict');
    assert.equal(isVerifiedWinerimSheetForIdentity(input, sheet), false);
    assert.equal(catalogWineFromVerifiedSheet(input, sheet), null);
    const mock = net([raw], raw);
    assert.equal((await lookupWinerimOriginalSheet(input, undefined, mock.fetcher)).status, 'not-found');
    assert.equal(mock.calls.length, 2, 'The invalid list record cannot start a detail request');
    const proposals = net([raw], raw);
    assert.equal((await picker.searchWinerimCandidates95(input.name, undefined, proposals.fetcher)).status, 'refine');
    assert.equal(proposals.calls.length, 2);
  });
  await check('Country-only source role conflict cannot verify even when input and source names/producers are exact', async () => {
    const input = { name: row.name, producer: 'ZZ', vintage: null };
    const raw = { ...row, winery: 'ZZ', region: null, country: 'ZZ' };
    const sheet = { id: '123', name: row.name, producer: 'ZZ', vintage: null, region: null, country: 'ZZ',
      grapes: [], url: `https://web.winerim.com/the-library/wines/123/${row.slugname}`, detailVerified: true };
    assert.equal(canLookupWinerimOriginal(input), true);
    assert.equal(isVerifiedWinerimSheetForIdentity(input, sheet), false);
    const mock = net([raw], raw);
    assert.equal((await lookupWinerimOriginalSheet(input, undefined, mock.fetcher)).status, 'not-found');
    assert.equal(mock.calls.length, 2);
  });
  await check('A role conflict first disclosed by independent detail fails before verified output', async () => {
    const input = { name: row.name, producer: 'Synthetic Valley', vintage: null };
    const search = { ...row, winery: input.producer, region: null, country: null };
    const detail = { ...search, region: 'Synthetic Valley', country: 'ZZ' };
    const mock = net([search], detail);
    assert.equal((await lookupWinerimOriginalSheet(input, undefined, mock.fetcher)).status, 'ambiguous');
    assert.equal(mock.calls.length, 3);
  });
  await check('Proper Estate source remains independently verifiable without input geography and retains exact0/decimal/NV', async () => {
    const input = { name: row.name, producer: row.winery, vintage: null };
    const mock = net();
    const result = await lookupWinerimOriginalSheet(input, undefined, mock.fetcher);
    assert.equal(result.status, 'verified'); assert.equal(mock.calls.length, 3);
    if (result.status !== 'verified') throw new Error('Expected proper Estate detail');
    assert.equal(isVerifiedWinerimSheetForIdentity(input, result.sheet), true);
    assert.equal(catalogWineFromVerifiedSheet(input, result.sheet)?.verifiedOriginalSheet, result.sheet);
    assert.deepEqual(result.sheet.sensoryAttributes, row.tastingAttributes);
    assert.equal(result.sheet.sensoryAttributes?.power, 0); assert.equal(result.sheet.sensoryAttributes?.acidity, .4);
    assert.equal(result.sheet.sensoryAttributes?.tannin, 0); assert.equal(result.sheet.vintage, null);
  });
  await check('More than20, incomplete, malformed and duplicate rows retain refine; empty is query-scoped only', async () => {
    for (const [rows, count] of [[[row], 21], [[row], 2], [[row, row], 2], [[{ ...row, winery: null }], 1]] as [unknown[], number][]) {
      const mock = net(rows, row, count);
      assert.equal((await picker.searchWinerimCandidates95('Synthetic Luna', undefined, mock.fetcher)).status, 'refine');
    }
    const mock = net([]); assert.equal((await picker.searchWinerimCandidates95('Missing literal', undefined, mock.fetcher)).status, 'empty');
  });
  await check('Only explicit selected strict detail preserves original0/decimal and an unknown vintage', async () => {
    const mock = net(), result = await picker.searchWinerimCandidates95('Synthetic Luna', undefined, mock.fetcher);
    assert.equal(mock.calls.length, 2);
    if (result.status !== 'proposals') throw new Error('Expected proposals');
    const selected = await picker.confirmWinerimCandidate95(result.proposals[0], undefined, mock.fetcher);
    assert.equal(selected.status, 'verified');
    if (selected.status !== 'verified') throw new Error('Expected verified strict fixture');
    assert.equal(selected.sheet.vintage, null); assert.equal(selected.sheet.sensoryAttributes?.power, 0);
    assert.equal(selected.sheet.sensoryAttributes?.acidity, .4); assert.equal(selected.sheet.sensoryAttributes?.tannin, 0);
    assert.equal('affinity' in selected.sheet, false);
  });
  await check('A selected unknown year cannot borrow a year from a conflicting source detail', async () => {
    const mock = net([row], { ...row, vintage: '2021' });
    const result = await picker.searchWinerimCandidates95('Synthetic Luna', undefined, mock.fetcher);
    if (result.status !== 'proposals') throw new Error('Expected proposals');
    assert.notEqual((await picker.confirmWinerimCandidate95(result.proposals[0], undefined, mock.fetcher)).status, 'verified');
  });
  await check('URL/control queries and precancelled owner cannot send requests; hung transport remains bounded', async () => {
    const mock = net();
    for (const query of ['https://synthetic.invalid', '//synthetic.invalid', 'bad\u0000query']) {
      assert.equal((await picker.searchWinerimCandidates95(query, undefined, mock.fetcher)).status, 'invalid-query');
    }
    const controller = new AbortController(); controller.abort();
    await assert.rejects(picker.searchWinerimCandidates95('Synthetic Luna', controller.signal, mock.fetcher), { name: 'AbortError' });
    assert.equal(mock.calls.length, 0);
    let calls = 0;
    assert.equal((await picker.searchWinerimCandidates95('Synthetic Luna', undefined, async () => { calls++; return new Promise<Response>(() => {}); }, 5)).status, 'unavailable');
    assert.equal(calls, 1);
  });
  assert.equal(forbiddenFetches, 0);
  console.log(JSON.stringify({ passed: groups.length, failed: 0, baseline, groups, remoteCalls: 0, paidCalls: 0,
    nativeLabelUi96: { ...labelUi96, ...labelUi96Result }, nativeManualLookup96: manualLookup96Result,
    nativeKeyboardBridge,
    scope: 'Synthetic actual-helper/AST contracts only. No image, GT, private corpus, fresh OCR, global catalogue, owner account, native UI or human-taste claims.' }));
} finally { globalThis.fetch = oldFetch; }
