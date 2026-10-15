import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/pages/Profile.tsx', import.meta.url), 'utf8');
const file = ts.createSourceFile('Profile.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const helpers = new Map<string, string>();
const chart = new Map<string, string>();
const visit = (node: ts.Node) => {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
    const name = node.name.text;
    if (['clampProfileValue', 'normalizeProfileForDisplay'].includes(name)) helpers.set(name, node.getText(file));
    if (['activeValue', 'baseValue'].includes(name)) chart.set(name, node.initializer.getText(file));
  }
  ts.forEachChild(node, visit);
};
visit(file);
assert.equal(helpers.size, 2);
assert.equal(chart.size, 2, 'Test the actual chart expressions, not only their upstream helpers');
const code = [...helpers.values()].map(text => 'const ' + text + ';').join('\n') + `
  return { normalizeProfileForDisplay, chart: (item, isNative) => ({
    active: ${chart.get('activeValue')}, base: ${chart.get('baseValue')}
  }) };`;
const actual = new Function(ts.transpileModule(code, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText)() as {
  normalizeProfileForDisplay: (profile: Record<string, number>, native: boolean) => Record<string, number>;
  chart: (item: { activeValue: number; baseValue: number }, native: boolean) => { active: number; base: number };
};
const keys = ['potente', 'acidez', 'dulce', 'tanico', 'afrutado'];
let checks = 0;
for (const value of [0, .01, .4, .75, 1, 1.25, 2.333333, 3.6, 4.999, 5]) {
  for (const key of keys) {
    const profile = Object.fromEntries(keys.map(k => [k, k === key ? value : 3]));
    const native = actual.normalizeProfileForDisplay(profile, true);
    assert.equal(native[key], value, 'Native graph must retain the score input: ' + key + '=' + value);
    assert.deepEqual(actual.chart({ activeValue: native[key], baseValue: native[key] }, true), { active: value, base: value });
    const web = Math.round(Math.max(1, Math.min(5, value)) * 10) / 10;
    assert.equal(actual.normalizeProfileForDisplay(profile, false)[key], web, 'Existing web display is unchanged');
    checks += 3;
  }
}
const component = readFileSync(new URL('../src/components/AffinityExplanation.tsx', import.meta.url), 'utf8');
const cellar = readFileSync(new URL('../src/components/CellarWineAffinity.tsx', import.meta.url), 'utf8');
assert.match(component, /\{compact && \([\s\S]*?Falta: \{explanation\.missingData/);
assert.match(component, /catalogIdentityLinked \? 'Vinculada'/);
assert.match(component, /!catalogIdentityLinked && !identityReviewedByUser/);
assert.match(cellar, /catalogIdentityLinked=\{Boolean\(view\.attributes\)\}/);
checks += 4;
console.log(JSON.stringify({ checks, passed: checks, scope: 'Actual Profile chart AST and compact explanation callsite, synthetic boundaries; UI verified separately' }));
