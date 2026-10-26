import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
const file = 'src/components/wine-import/MultiWineLabelScanner.tsx';
const expression = source => {
  const tree = ts.createSourceFile('scanner.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), found = [];
  const visit = node => {
    if (ts.isJsxAttribute(node) && node.name.getText(tree) === 'aria-label'
      && node.initializer && ts.isJsxExpression(node.initializer) && node.initializer.expression
      && node.initializer.expression.getText(tree).includes('Abrir detalle de ${group.candidate.name}')) found.push(node.initializer.expression);
    ts.forEachChild(node, visit);
  };
  visit(tree); assert.equal(found.length, 1); return found[0].getText(tree);
};
const current = expression(fs.readFileSync(file, 'utf8'));
const previous = expression(execFileSync('git', ['show', `ae8ec22:${file}`], { encoding: 'utf8' }));
const group = { candidate: { name: 'La Migratoria', producer: 'Bodegas Frontonio', vintage: 2023 } };
const consumer = { identityLabel: 'Referencia del catálogo Winerim', affinityLabel: 'Sin datos suficientes',
  affinityValue: 'Sin calcular', pending: { summary: 'Datos sensoriales insuficientes' } };
const run = (value, patch = {}) => vm.runInNewContext(value, { isNative: true, group, consumer,
  personalVerdict: null, personalVerdictTitle159: value => value.title, ...patch }, { timeout: 1000 });
assert.equal(run(previous), 'Abrir detalle de La Migratoria');
assert(!run(previous).includes('Sin calcular'), 'Retained pre266 RED: score missing from accessible name');
const label = run(current);
for (const text of ['La Migratoria', 'Bodegas Frontonio', 'Añada indicada: 2023', consumer.identityLabel, consumer.affinityValue, consumer.pending.summary]) assert(label.includes(text));
assert(run(current, { consumer: { ...consumer, affinityValue: '≈82/100', affinityLabel: 'Afinidad orientativa', pending: null } }).includes('≈82/100'));
assert(run(current, { personalVerdict: { title: 'Te gustó: valoración guardada' } }).includes('Te gustó: valoración guardada'));
assert(!run(current, { group: { candidate: { ...group.candidate, vintage: null } } }).includes('Añada'));
assert.equal(run(current, { isNative: false, consumer: null }), run(previous));
console.log('PASS266 actual JSX accessible identity/year/affinity/gap/personal-rating, retained old RED and exact web label;0network');
