import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';
import React from 'react';
import * as jsx from 'react/jsx-runtime';

const source = fs.readFileSync('src/pages/Profile.tsx', 'utf8');
const tree = ts.createSourceFile('Profile.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const summaries = new Map();
const visit = node => {
  if (ts.isJsxElement(node) && node.openingElement.tagName.getText(tree) === 'details') {
    const id = node.openingElement.attributes.properties.find(attribute => attribute.name?.getText(tree) === 'data-testid')?.initializer?.text;
    if (['native-profile-learning133', 'native-profile-passport133'].includes(id)) {
      const children = node.children.filter(ts.isJsxElement).filter(child => child.openingElement.tagName.getText(tree) === 'summary');
      assert.equal(children.length, 1); assert(!summaries.has(id)); summaries.set(id, children[0].getText(tree));
    }
  }
  ts.forEachChild(node, visit);
}; visit(tree); assert.equal(summaries.size, 2);
const visible = node => Array.isArray(node) ? node.map(visible).join('') : React.isValidElement(node)
  ? visible(node.props.children) : node == null || typeof node === 'boolean' ? '' : String(node);
let cases = 0;
for (const [id, expression] of summaries) {
  for (const samples of id.includes('learning') ? [1, 2, 12, 100, 1000] : [1]) {
    const context = { exports: {}, learnedProfile: { samples }, require: name => { assert.equal(name, 'react/jsx-runtime'); return jsx; } };
    vm.runInNewContext(ts.transpileModule('exports.element = ' + expression + ';', {
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText, context);
    const element = context.exports.element;
    assert.equal(element.type, 'summary');
    assert(element.props.className.includes('min-h-11'));
    const children = React.Children.toArray(element.props.children);
    assert.equal(children.length, 1); assert.equal(children[0].type, 'span');
    assert.equal(children[0].props['aria-hidden'], 'true');
    assert.equal(element.props['aria-label'], visible(children));
    assert.equal(element.props['aria-label'], id.includes('learning')
      ? `Aprendizaje: ${samples} vino${samples === 1 ? '' : 's'} valorado${samples === 1 ? '' : 's'}` : 'Mi código Matchrim');
    cases++;
  }
}
console.log(JSON.stringify({ nativeDisclosureCases: cases, networkCalls: 0, dataWrites: 0,
  scope: 'Actual native-only Profile summary JSX/React semantics and unchanged visible labels. No UIKit AX, touch or VoiceOver speech approval; native138 rerun required.' }));
