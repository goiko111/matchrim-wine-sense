import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { nativeScan99Baseline, restoreNativeScan99, restoreNativeScan99Guard } from './native-scan99-scope.mjs';
import { restoreNativeHome98Guard } from './native-home98-scope.mjs';

const root = new URL('../', import.meta.url);
const scan = 'src/pages/Scan.tsx', svg = 'scripts/check-matchrim-scan-hub-svg96.mjs';
const heading = 'scripts/check-matchrim-scan-heading96.mjs', visual = 'scripts/native-visual98-scope.mjs';
const read = file => readFileSync(new URL(file, root), 'utf8');
const cache = new Map();
const prior = (file, revision = nativeScan99Baseline) => {
  const key = `${revision}:${file}`;
  if (!cache.has(key)) cache.set(key, execFileSync('git', ['show', key], { cwd: root, encoding: 'utf8' }));
  return cache.get(key);
};
const digest = source => createHash('sha256').update(source).digest('hex');
let passed = 0, negatives = 0;
const check = (name, run) => { run(); passed++; console.log('PASS ' + name); };
const functionSource = (file, name) => {
  const source = read(file), ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const found = ast.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.equal(found.length, 1, name); return found[0].getText(ast);
};
const loadFunctions = (source, globals) => {
  const context = vm.createContext({ exports: {}, ...globals });
  vm.runInContext(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText, context, { timeout: 1000 });
  return context;
};

check('Exactly the 21 added import/native-return lines restore every complete d7d81e1 Scan byte', () => {
  const source = read(scan), original = prior(scan);
  assert.equal(source.split('\n').length - original.split('\n').length, 21);
  assert.equal(restoreNativeScan99(scan, source), original);
  assert.equal(restoreNativeScan99(scan, original), original);
  for (const file of ['other/Scan.tsx', 'src/components/NativeScanHub99.tsx', 'src/pages/Restaurant.tsx']) {
    assert.equal(restoreNativeScan99(file, 'unrelated'), 'unrelated');
  }
});

check('Owner/generation/save/consent/identity/model-affinity/web/route mutations fail on current and restored Scan', () => {
  const mutations = [
    ['saveLifetime.current.generation === generation && context.isCurrent()', 'true'],
    ['user_id: user.id,', 'user_id: "foreign99",'],
    ['confirmedLabelInsertId(data, wine, user.id)', 'confirmedLabelInsertId(data, wine, "foreign99")'],
    ['name: wine.nombre,', 'name: "forged99",'],
    ['matchrim_affinity: wine.matchrim_affinity ?? null,', 'matchrim_affinity: 99,'],
    ['use_for_profile_training: false,', 'use_for_profile_training: true,'],
    ['<ScanPrivacyGate>', '<div>'],
    ['if (modeParam && !activeMode)', 'if (false)'],
    ['"wine-menu": "carta-vinos"', '"wine-menu": "wrong99"'],
    ['user && !isNative && <AppNav />', 'user && <AppNav />'],
  ];
  for (const source of [read(scan), prior(scan)]) {
    for (const [from, to] of mutations) {
      const candidate = source.replace(from, to); assert.notEqual(candidate, source, from);
      assert.throws(() => restoreNativeScan99(scan, candidate)); negatives++;
    }
    for (const candidate of [source + '\n// unreviewed99\n', source.replaceAll('\n', '\r\n')]) {
      assert.throws(() => restoreNativeScan99(scan, candidate)); negatives++;
    }
  }
});

check('Native99 owner/actions/routes/analytics and native-only early return are literal, not blanket AST drops', () => {
  const source = read(scan), importLine = 'import { NativeScanHub99 } from "@/components/NativeScanHub99";\n';
  for (const [from, to] of [
    ['if (isNative && !activeMode)', 'if (isNative)'],
    ['if (isNative && !activeMode)', 'if (!activeMode)'],
    ['ownerId={user?.id ?? null}', 'ownerId={null}'],
    ['options={scanOptions}', 'options={[]}'],
    ['metadata: { option: mode }', 'metadata: { option: "label" }'],
    ['navigate(`/escanear/${scanModePaths[mode]}`)', 'navigate("/escanear/etiqueta")'],
    ['onOpenRestaurant={() => navigate("/restaurante")}', 'onOpenRestaurant={() => navigate("/escanear/plato")}'],
    ['onOpenRecent={(route) => navigate(route)}', 'onOpenRecent={() => undefined}'],
  ]) {
    const candidate = source.replace(from, to); assert.notEqual(candidate, source, from);
    assert.throws(() => restoreNativeScan99(scan, candidate)); negatives++;
  }
  for (const candidate of [source.replace(importLine, ''), source.replace(importLine, importLine + importLine)]) {
    assert.throws(() => restoreNativeScan99(scan, candidate)); negatives++;
  }
  const ast = ts.createSourceFile(scan, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), branches = [];
  const visit = node => {
    if (ts.isIfStatement(node) && node.expression.getText(ast) === 'isNative && !activeMode') branches.push('  ' + node.getText(ast) + '\n\n');
    ts.forEachChild(node, visit);
  };
  visit(ast); assert.equal(branches.length, 1);
  const routeGuard = '  if (modeParam && !activeMode) {\n    return <Navigate to="/escanear" replace />;\n  }\n\n';
  const movedBranch = source.replace(routeGuard + branches[0], branches[0] + routeGuard);
  const movedImport = source.replace(importLine, '').replace('const scanModes =', importLine + '\nconst scanModes =');
  for (const candidate of [movedBranch, movedImport]) {
    assert.notEqual(candidate, source); assert.throws(() => restoreNativeScan99(scan, candidate)); negatives++;
  }
});

check('Actual SVG96 inverse executes on Scan99 before every old undo count and e3fd pin, without mounting children', () => {
  // Execute only these actual pure functions, never the module's transitive test runners.
  const context = loadFunctions(functionSource(heading, 'restoreNativeScanHeading96') + '\n'
    + functionSource(svg, 'restoreNativeHubSvg96'), {
    assert, hash: digest, restoreNativeScan99, hubFile: 'src/components/wine-import/ScanHub.tsx',
  });
  for (const source of [read(scan), prior(scan)]) {
    assert.equal(context.exports.restoreNativeHubSvg96(scan, source), prior(scan, 'e3fd4c73913469a3f084be7f1296b17fe7c3ac70'));
  }
  for (const [from, to] of [[' aria-hidden="true" focusable="false"', ' aria-hidden="true"'],
    ['              isNative={isNative}\n', '']]) {
    const source = read(scan), candidate = source.replace(from, to); assert.notEqual(candidate, source, from);
    assert.throws(() => context.exports.restoreNativeHubSvg96(scan, candidate)); negatives++;
  }
});

check('Both legacy render readers and the guard bridge restore their entire reviewed source, preserving all cases', () => {
  for (const file of [svg, heading]) {
    assert.equal(restoreNativeScan99Guard(file, read(file)), prior(file));
    assert.equal(restoreNativeScan99Guard(file, prior(file)), prior(file));
  }
  const projectedVisual = restoreNativeScan99Guard(visual, read(visual));
  assert.equal(digest(projectedVisual), '3a660b55d14b4154c094a7a6dddd7c938d35438777cbb3a4119f417bebd6ff7b');
  assert.equal(restoreNativeHome98Guard(visual, projectedVisual), prior(visual));
  const manual = JSON.parse(read('scripts/matchrim-manual-lookup96-scope.json'));
  const row = manual.files.find(item => item.file === svg && item.kind === 'guard'); assert.ok(row);
  const editsAst = ts.createSourceFile(heading, prior(heading), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const edits = editsAst.statements.find(node => ts.isVariableStatement(node)
    && node.declarationList.declarations.some(declaration => declaration.name.getText(editsAst) === 'guardEdits'));
  assert.ok(edits);
  const context = loadFunctions(edits.getText(editsAst) + '\n' + functionSource(heading, 'restoreNativeHeadingGuard96'), {
    assert, svgGuard: svg, lookupGuard: 'scripts/check-matchrim-manual-lookup-bridge96.mjs',
    restoreMenuResultsGuard96: (_file, source) => source,
    previous: file => prior(file, 'df2d5b168515b59931c3360597a07d9a1f38e4f0'),
    once: (source, from, to) => { assert.equal(source.split(from).length, 2); return source.replace(from, to); },
  });
  let source = context.exports.restoreNativeHeadingGuard96(svg, restoreNativeScan99Guard(svg, read(svg)));
  assert.equal(digest(source), row.afterHash);
  for (const hunk of row.hunks.slice().reverse()) {
    assert.equal(source.split(hunk.after).length, 2); source = source.replace(hunk.after, hunk.before);
  }
  assert.equal(digest(source), row.beforeHash);
  assert.equal(source, prior(svg, manual.baseline));
  assert.equal(row.beforeHash, '011785b7ac48e6c3d8517b25b132b689b230ff899c8e121afc5234801979b59d');
});

check('Old baseline/case/count/pin/negative assertions and honest legacy reports reject directed guard mutations', () => {
  const mutations = [
    [svg, 'groups: 7, rejectedMutations: 5', 'groups: 6, rejectedMutations: 5'],
    [svg, 'assert.equal(controls.length, 7);', 'assert.equal(controls.length, 6);'],
    [svg, 'assert.equal(mutations.length, 5);', 'assert.equal(mutations.length, 4);'],
    [svg, "const baselineRevision = 'e3fd4c73913469a3f084be7f1296b17fe7c3ac70';", "const baselineRevision = 'HEAD';"],
    [svg, '  source = restoreNativeScan99(file, source);', '  source = source;'],
    [svg, 'restoreNativeScan99(f, read(path.join(root, f)))', 'read(path.join(root, f))'],
    [svg, 'Legacy Scan96 after the exact Scan99 inverse', 'Actual current Scan99 UI'],
    [heading, 'assert.equal(actual[scanFile], before[scanFile]);', 'assert.ok(true);'],
    [heading, 'restoreNativeScan99(file, read(file))', 'read(file)'],
    [heading, 'Legacy Scan96 after the exact Scan99 inverse', 'Actual current Scan99 UI'],
    [visual, '  source = restoreNativeScan99Guard(file, source);', '  source = source;'],
    [svg, '  source = restoreNativeScan99(file, source);\n  source = restoreNativeScanHeading96(file, source);',
      '  source = restoreNativeScanHeading96(file, source);\n  source = restoreNativeScan99(file, source);'],
    [visual, '  source = restoreNativeScan99Guard(file, source);\n  source = restoreNativeHome98Guard(file, source);',
      '  source = restoreNativeHome98Guard(file, source);\n  source = restoreNativeScan99Guard(file, source);'],
  ];
  for (const [file, from, to] of mutations) {
    const source = read(file), candidate = source.replace(from, to); assert.notEqual(candidate, source, from);
    assert.throws(() => restoreNativeScan99Guard(file, candidate)); negatives++;
  }
  for (const file of [svg, heading, visual]) for (const source of [read(file), prior(file)]) {
    assert.throws(() => restoreNativeScan99Guard(file, source + '\n// unchecked99\n')); negatives++;
  }
});

check('Frozen guard data, original child, closure command and pipeline/privacy sources remain byte exact', () => {
  for (const file of ['scripts/matchrim-manual-lookup96-scope.json', 'scripts/native-label97-scope.json',
    'scripts/check-matchrim-scan-hub96.ts', 'scripts/check-matchrim-consumer95-native-layout.ts', 'package.json',
    'src/components/wine-import/ScanHub.tsx', 'src/components/ScanPrivacyGate.tsx', 'src/utils/nativePrivacy97.ts',
    'src/utils/labelScanSave.ts', 'src/utils/scanHistory.ts', 'src/components/MobileBottomNav.tsx']) {
    assert.equal(read(file), prior(file), file);
  }
});

console.log(JSON.stringify({ nativeScan99Scope: true, passed, failed: 0, baseline: nativeScan99Baseline,
  literalAddedLines: 21, wholeSourceInverses: 1, guardReaderInverses: 3, negativeControls: negatives,
  oldAssertionsRemoved: 0, oldCountsChanged: 0, actualSvgInverseExecuted: true, legacyReadersExplicit: true,
  currentNativeUiEvidence: false, targetedChildRun: false, fullClosureRun: false,
  networkCalls: 0, browser: false, device: false }));
