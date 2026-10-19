import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const baseline = 'c7290838df1669d051eaf26f4ebca0cd538fd715';
const file = 'src/components/wine-import/WineMenuScanner.tsx';
const prior = name => execFileSync('git', ['show', `${baseline}:${name}`], { cwd: root, encoding: 'utf8' });
const before = prior(file);
const once = (source, from, to) => {
  assert.equal(source.split(from).length, 2, 'Unique exact header amendment: ' + from);
  return source.replace(from, to);
};
const notice = `                            {isNative && !isLiteralWineStyle95(selectedPinWine) && !catalogWineFromVerifiedSheet({
                              name: selectedPinWine.nombre, producer: selectedPinWine.productor, vintage: selectedPinWine.anada,
                              region: selectedPinWine.region, country: selectedPinWine.pais, inferredFields: selectedPinWine.campos_inferidos,
                            }, selectedPinWine.originalSheet) && <p className="text-sm text-stone-600">Nombre leído por confirmar</p>}
`;
const header = "\t                  <div className={isNative ? 'max-h-[28vh] min-w-0 flex-1 overflow-y-auto' : 'min-w-0'}>\n";
const body = "              <div role=\"region\" aria-label=\"Contenido del vino\" tabIndex={0} className={isNative ? 'min-h-[min(30vh,240px)] min-w-0 flex-1 overflow-y-auto break-words p-[16px]' : 'min-h-0 min-w-0 flex-1 overflow-y-auto break-words p-4'}>\n";
export const MENU_MAX_HEADER96_TAIL = ' && node scripts/check-matchrim-menu-max-header96.mjs';

export function restoreMenuMaxHeader96(source) {
  if (source === before) return source;
  source = once(source, 'max-h-[40vh] min-w-0 flex-1 overflow-y-auto', 'max-h-[28vh] min-w-0 flex-1 overflow-y-auto');
  source = once(source, 'min-h-[44px] min-w-0 flex-1 overflow-y-auto break-words p-[16px]', 'min-h-[min(30vh,240px)] min-w-0 flex-1 overflow-y-auto break-words p-[16px]');
  source = once(source, body + notice, body);
  source = once(source, header, header + notice);
  assert.equal(source, before, 'Whole frozen c729 inverse: web, handlers, identity, scores, opener and footer exact');
  return source;
}

export function restoreMenuMaxHeaderPackage96(source) {
  const old = prior('package.json');
  if (source === old) return source;
  const command = JSON.parse(old).scripts['test:closure96'];
  source = once(source, command + MENU_MAX_HEADER96_TAIL, command);
  assert.equal(source, old, 'Only one closure-tail registration; every old assertion/dependency retained');
  return source;
}

export function runMenuMaxHeader96() {
  const source = fs.readFileSync(path.join(root, file), 'utf8'), checks = [];
  const test = (name, run) => { run(); checks.push(name); };
  test('Explicit prior source SHA', () => assert.equal(createHash('sha256').update(before).digest('hex'), '8e8185f168223e4d3d77d1e5a9addcef72ca14f9528ba613f74060e76aec5472'));
  test('Whole source inverse exact', () => restoreMenuMaxHeader96(source));
  test('Frozen source is the only unmodified inverse', () => assert.equal(restoreMenuMaxHeader96(before), before));
  test('One unchanged native pending notice, first in body before profile and affinity', () => {
    assert.equal(source.split(notice).length, 2);
    assert(source.includes(body.replace('min-h-[min(30vh,240px)]', 'min-h-[44px]') + notice + '                {renderProfileRecovery()}'));
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const nodes = [];
    const walk = node => { if (ts.isJsxElement(node) && node.openingElement.tagName.getText(tree) === 'p' && node.getText(tree).includes('Nombre leído por confirmar')) nodes.push(node); ts.forEachChild(node, walk); };
    walk(tree); assert.equal(nodes.length, 1);
    assert(nodes[0].parent.getText(tree).startsWith('isNative && !isLiteralWineStyle95'));
  });
  test('Actual existing title/body each retain scrolling; no font cap, observer or extra controller', () => {
    assert(source.includes("'max-h-[40vh] min-w-0 flex-1 overflow-y-auto' : 'min-w-0'"));
    assert(source.includes("'min-h-[44px] min-w-0 flex-1 overflow-y-auto break-words p-[16px]'"));
  });
  const guardFile = 'scripts/check-matchrim-menu-edit-shortcut96.mjs';
  test('Historical guard amended only by explicit inverse calls', () => {
    let guard = fs.readFileSync(path.join(root, guardFile), 'utf8');
    guard = once(guard, "import { restoreMenuMaxHeader96, restoreMenuMaxHeaderPackage96 } from './check-matchrim-menu-max-header96.mjs';\n", '');
    guard = once(guard, '  value = restoreMenuMaxHeader96(value);\n', '');
    guard = once(guard, '  value = restoreMenuMaxHeaderPackage96(value);\n', '');
    guard = once(guard, "const pkg = restoreMenuMaxHeaderPackage96(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));", "const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');");
    assert.equal(guard, prior(guardFile), 'All original assertions, mutations, render and closure checks retained');
  });
  test('Only appended public leaf, old package exact', () => restoreMenuMaxHeaderPackage96(fs.readFileSync(path.join(root, 'package.json'), 'utf8')));
  const mutations = [
    ['max-h-[40vh]', 'max-h-[39vh]'], ['min-h-[44px] min-w-0 flex-1', 'min-h-[43px] min-w-0 flex-1'],
    ['Nombre leído por confirmar</p>', 'Nombre confirmado</p>'],
    ['isNative && !isLiteralWineStyle95(selectedPinWine)', '!isLiteralWineStyle95(selectedPinWine)'],
    ['<DrawerTitle className=', '<DrawerTitle title="new" className='],
    ['aria-label="Cerrar detalle"', 'aria-label="Cerrar"'], ['detailNextRef', 'unreviewedNextRef'],
    ['onClick={(event) => openWineDetail(index, event.currentTarget)}', 'onClick={() => openWineDetail(index)}'],
    ["'min-h-0 min-w-0 flex-1 overflow-y-auto break-words p-4'", "'min-h-0 overflow-hidden'"],
    ['const getWineDecision = (wine: ScannedWine) => {', 'const getWineDecision = (wine: ScannedWine) => { return {score:99};'],
  ];
  for (const [from, to] of mutations) test('Reject undeclared source mutation: ' + from, () => {
    assert(source.includes(from)); assert.throws(() => restoreMenuMaxHeader96(source.replace(from, to)));
  });
  return { passed: checks.length, failed: 0, checks, negativeControls: mutations.length, wholeC729Inverse: true,
    scope: 'Source and AST only; existing guard executes complete web JSX parity separately. Browser geometry and UIKit are separate.', SDK: 0, network: 0 };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(runMenuMaxHeader96()));
