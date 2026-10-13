import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { Progress } from '../src/components/ui/progress';

const output = process.argv[2];
if (!output) throw Error('Pass local primitive output directory');
mkdirSync(output, { recursive: true });
const definitions = [
  { id: 'styles-import', path: 'src/components/WineStylesCSVImporter.tsx', index: 0, name: 'Progreso de importaci\u00f3n de estilos de vino', role: 'progressbar' },
  { id: 'csv-import', path: 'src/components/csv/ImportProgress.tsx', index: 0, name: 'Progreso de importacion CSV', role: 'progressbar' },
  { id: 'label-scan', path: 'src/components/wine-import/MultiWineLabelScanner.tsx', index: 0, name: 'Progreso estimado del escaneo de etiquetas', role: 'progressbar' },
  { id: 'food-scan', path: 'src/components/wine-import/FoodPairingScanner.tsx', index: 0, name: 'Progreso del an\u00e1lisis de comida', role: 'progressbar' },
  { id: 'profile-confidence', path: 'src/pages/Profile.tsx', index: 0, name: 'Confianza del perfil aprendido', role: 'meter' },
  { id: 'learning-confidence', path: 'src/pages/MyWines.tsx', index: 0, name: 'Confianza del aprendizaje de gustos', role: 'meter' },
  { id: 'stored-affinity', path: 'src/pages/MyWines.tsx', index: 1, name: 'Afinidad orientativa de Elemento de prueba', role: 'meter' },
  { id: 'label-affinity', path: 'src/components/wine-import/WineLabelOCRImport.tsx', index: 0, name: 'Afinidad orientativa del candidato', role: 'meter' },
] as const;
type Case = {
  id: string; props: React.ComponentProps<typeof Progress>; role: string; name: string;
  expectedNow: number | null; expectedText: string | null; consumer?: string;
};
const cases: Case[] = [
  ...[0, 24, 42, 100, 12.5].map(value => ({ id: 'primitive-' + value, props: { value, 'aria-label': 'Primitiva ' + value }, role: 'progressbar', name: 'Primitiva ' + value, expectedNow: value, expectedText: Math.round(value) + '%' })),
  { id: 'unknown-null', props: { value: null, 'aria-label': 'Primitiva desconocida' }, role: 'progressbar', name: 'Primitiva desconocida', expectedNow: null, expectedText: null },
  { id: 'unknown-undefined', props: { 'aria-label': 'Primitiva sin valor' }, role: 'progressbar', name: 'Primitiva sin valor', expectedNow: null, expectedText: null },
  { id: 'custom-text', props: { value: 30, 'aria-label': 'Primitiva con texto', getValueLabel: value => value + ' unidades de prueba' }, role: 'progressbar', name: 'Primitiva con texto', expectedNow: 30, expectedText: '30 unidades de prueba' },
];
for (const definition of definitions) {
  const source = readFileSync(definition.path, 'utf8'), tree = ts.createSourceFile(definition.path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const uses: ts.JsxAttributes[] = [];
  const visit = (node: ts.Node) => {
    if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) && node.tagName.getText(tree) === 'Progress') uses.push(node.attributes);
    ts.forEachChild(node, visit);
  };
  visit(tree); const attributes = uses[definition.index]; if (!attributes) throw Error('Missing existing consumer ' + definition.id);
  const props: Record<string, unknown> = { value: 42 };
  for (const attribute of attributes.properties) {
    if (!ts.isJsxAttribute(attribute)) continue;
    const name = attribute.name.getText(tree);
    if (!['role', 'aria-label', 'className'].includes(name) || !attribute.initializer) continue;
    if (ts.isStringLiteral(attribute.initializer)) props[name] = attribute.initializer.text;
    else if (ts.isJsxExpression(attribute.initializer) && attribute.initializer.expression) {
      const expression = ts.transpileModule('(' + attribute.initializer.expression.getText(tree) + ')', { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
      props[name] = vm.runInNewContext(expression, { wine: { name: 'Elemento de prueba' } });
    }
  }
  cases.push({
    id: definition.id, props: props as React.ComponentProps<typeof Progress>, role: definition.role,
    name: definition.name, expectedNow: 42, expectedText: '42%', consumer: definition.path,
  });
}
const sections = cases.map(item => renderToStaticMarkup(
  <section data-case={item.id} style={{ padding: '12px 0', borderBottom: '1px solid #ddd' }}>
    <h2 style={{ fontSize: '14px', margin: '0 0 8px', fontWeight: 500 }}>{item.id}</h2>
    <Progress {...item.props} />
  </section>,
)).join('');
const html = '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/index.css?direct"></head><body style="margin:16px;background:white;font-family:system-ui">' + sections + '</body></html>';
writeFileSync(join(output, 'primitives.html'), html);
const files = ['src/components/ui/progress.tsx', ...new Set(definitions.map(item => item.path)), 'node_modules/@radix-ui/react-progress/dist/index.mjs'];
writeFileSync(join(output, 'primitive-cases.json'), JSON.stringify({
  scope: 'Isolated actual React/Radix SSR component with primitive numeric inputs, no user/wine/profile/recognition data or mounted app state.',
  cases: cases.map(({ props, ...item }) => ({ ...item, syntheticPrimitiveValue: props.value ?? null })),
  hashes: Object.fromEntries(files.map(path => [path, createHash('sha256').update(readFileSync(path)).digest('hex')])),
  htmlSha256: createHash('sha256').update(html).digest('hex'),
  installedRadixVersion: '1.1.0',
}, null, 2) + '\n');
console.log(JSON.stringify({ cases: cases.length, consumers: definitions.length, output }));
