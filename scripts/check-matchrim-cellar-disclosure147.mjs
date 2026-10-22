import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';

const file = 'src/pages/MyWines.tsx';
const before = execFileSync('git', ['show', '99c8dcf:' + file], { encoding: 'utf8' });
const source = fs.readFileSync(file, 'utf8');
const oldSummary = '<summary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-stone-700">Tu perfil de gustos</summary>';
const summary = '<summary aria-label="Tu perfil de gustos" className="min-h-11 cursor-pointer py-3 text-sm font-medium text-stone-700"><span aria-hidden="true">Tu perfil de gustos</span></summary>';
const inverse = candidate => {
  assert.equal(candidate.split(summary).length, 2);
  assert.equal(candidate.replace(summary, oldSummary), before, 'Every other MyWines byte, web branch, handler and storage path stays unchanged');
};
inverse(source);
for (const candidate of [source + '\n// unrelated\n', source.replace('isNative && <details', 'false && <details'),
  source.replace('aria-hidden="true">Tu perfil de gustos', 'aria-hidden="false">Tu perfil de gustos'),
  source.replace('aria-label="Tu perfil de gustos"', 'aria-label="Incomplete"')]) {
  assert.notEqual(candidate, source); assert.throws(() => inverse(candidate));
}
const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const matches = [];
const visit = node => {
  if (ts.isJsxElement(node) && node.openingElement.tagName.getText(tree) === 'details'
    && node.openingElement.attributes.getText(tree).includes('native-cellar-learning97')) matches.push(node);
  ts.forEachChild(node, visit);
}; visit(tree); assert.equal(matches.length, 1);
const owner = matches[0].parent;
assert(ts.isBinaryExpression(owner)); assert.equal(owner.left.getText(tree), 'isNative');
assert.equal(owner.operatorToken.kind, ts.SyntaxKind.AmpersandAmpersandToken);
const summaries = matches[0].children.filter(ts.isJsxElement).filter(child => child.openingElement.tagName.getText(tree) === 'summary');
assert.equal(summaries.length, 1); assert.equal(summaries[0].getText(tree), summary);
const context = { exports: {}, require: name => { assert.equal(name, 'react/jsx-runtime'); return jsx; } };
vm.runInNewContext(ts.transpileModule('exports.item = ' + summary + ';', {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
}).outputText, context);
const item = context.exports.item;
assert.equal(item.type, 'summary'); assert.equal(item.props['aria-label'], 'Tu perfil de gustos');
assert(item.props.className.includes('min-h-11'));
assert.equal(item.props.children.type, 'span'); assert.equal(item.props.children.props['aria-hidden'], 'true');
assert.equal(item.props.children.props.children, item.props['aria-label']);
console.log(JSON.stringify({ exactWholeFileInverse: true, rejectedMutations: 4, nativeSummaryCases: 1,
  networkCalls: 0, writes: 0, scope: 'Only one native-gated summary changes. Runtime UIKit AX and spoken VoiceOver still require verification.' }));
