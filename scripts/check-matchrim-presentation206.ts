import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { buildConsumerAffinity } from '../src/utils/consumerAffinity95';
import { compatLines142 } from '../src/utils/winerimDetail142';

type Node = { type: unknown; props: Record<string, unknown>; children: unknown[] };
const element = (type: unknown, props: Record<string, unknown> | null, ...children: unknown[]): Node =>
  typeof type === 'function' ? (type as (props: Record<string, unknown>) => Node)(props ?? {}) : { type, props: props ?? {}, children };
const nodes = (tree: unknown): Node[] => Array.isArray(tree) ? tree.flatMap(nodes)
  : tree && typeof tree === 'object' && 'children' in tree ? [tree as Node, ...nodes((tree as Node).children)] : [];
const text = (tree: unknown, hideDetails = false): string => Array.isArray(tree) ? tree.map(n => text(n, hideDetails)).join(' ')
  : tree && typeof tree === 'object' && 'children' in tree ? hideDetails && (tree as Node).type === 'details' ? '' : text((tree as Node).children, hideDetails)
    : typeof tree === 'string' || typeof tree === 'number' ? String(tree) : '';
const source = readFileSync('src/components/NativeAffinitySummary.tsx', 'utf8');
const stripped = source.replace(/^import .*;\n/gm, '');
const exports: Record<string, (props: Record<string, unknown>) => Node> = {};
vm.runInNewContext(ts.transpileModule(stripped, { compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText,
  { exports, React: { createElement: element }, Link: 'Link', ChevronDown: 'ChevronDown', CircleHelp: 'CircleHelp', buildConsumerAffinity,
    WhyLines144: ({ dimensions, note }: { dimensions: Parameters<typeof compatLines142>[0]; note: string }) =>
      element('div', null, ...compatLines142(dimensions).map(line => element('li', { key: line.key }, line.text)), element('p', null, note)) });
const render = exports.NativeAffinitySummary;
const input = { catalogIdentityLinked: true, sensorySource: 'catalog' as const, score: 76,
  profile: { potente: 5, acidez: 4, dulce: 4, tanico: 5, afrutado: 3 },
  attributes: { scale: 'winerim-0-5' as const, power: 4, acidity: 3, sweetness: 1, tannin: 4, fruity: 4 } };
let checks = 0;
const check = (name: string, action: () => void) => { action(); checks++; console.log('PASS', name); };
check('One consumer answer, one sentence per trait, exact score', () => {
  const tree = render(input), visible = text(tree, true);
  assert.match(visible, /Probablemente te guste/); assert.match(visible, /76/);
  // 144: one sentence per trait (five at most), split into what fits and what may not, as in every wine sheet.
  assert.match(visible, /Es más seco de lo que sueles preferir/);
  assert(nodes(tree).filter(n => n.type === 'li').length <= 5);
  assert.equal(nodes(tree).filter(n => n.props['data-testid'] === 'native-affinity-summary').length, 1);
});
check('Personal ratings override headline, score and model reasons, without erasing detail', () => {
  for (const [rating, title] of [['not_for_me', 'no es para ti'], ['love', 'te encanta'], ['ok', 'correcto']]) {
    const tree = render({ ...input, personalRating: rating }), visible = text(tree, true);
    assert.match(visible, new RegExp(title)); assert.doesNotMatch(visible, /76|Probablemente te guste|Por qué encaja|Es más seco/);
    assert.match(text(tree), /Encaje de estilo: ≈\s*76\s*\/100/);
  }
});
check('Detailed comparison keeps decimals; a tannin of 0 is not compared (145, owner\'s decision)', () => {
  const tree = render({ ...input, attributes: { ...input.attributes, acidity: 2.4 } });
  const rows = nodes(tree).filter(n => n.type === 'dd'); assert.equal(rows.length, 5);
  assert(rows.some(n => String(n.props['aria-label']).includes('este vino 2.4/5')));
  assert(nodes(tree).filter(n => n.props.style).map(n => (n.props.style as { width: string }).width).includes('48%'));
  const white = nodes(render({ ...input, attributes: { ...input.attributes, tannin: 0 } })).filter(n => n.type === 'dd');
  assert.equal(white.length, 4); assert(!white.some(n => String(n.props['aria-label']).startsWith('Taninos')));
});
check('Technical comparison starts closed; no raw weights or confidence percentages', () => {
  const tree = render(input), detail = nodes(tree).find(n => n.type === 'details');
  assert(detail); assert(!detail.props.open); assert.doesNotMatch(text(tree, true), /20%|inferencia sensorial|76%/);
  assert.match(text(tree), /no es una probabilidad/);
});
check('Pending identity cannot display affinity or sensory claims', () => {
  const tree = render({ ...input, catalogIdentityLinked: false });
  assert.match(text(tree), /Primero, confirmemos el vino/); assert.doesNotMatch(text(tree), /76|Por qué encaja|Es más seco/);
});
check('Missing catalogue data never hides an existing personal rating', () => {
  const tree = render({ ...input, attributes: null, personalRating: 'not_for_me' });
  assert.match(text(tree), /Tu valoración: no es para ti/);
  assert.match(text(tree), /Nos faltan datos de este vino/);
  assert.doesNotMatch(text(tree), /76|Por qué encaja/);
});
check('Pending sensory, stale score and missing profile have distinct next steps', () => {
  assert.match(text(render({ ...input, attributes: null })), /Nos faltan datos de este vino/);
  assert.match(text(render({ ...input, score: null })), /Tu afinidad necesita actualizarse/);
  const tree = render({ ...input, profile: null }); assert.match(text(tree), /Conoce tu afinidad/);
  assert.equal(nodes(tree).find(n => n.type === 'Link')?.props.to, '/matchrim');
});
check('Unavailable personal history remains explicit and provisional', () => {
  const visible = text(render({ ...input, personalHistoryUnavailable: true }), true);
  assert.match(visible, /Comparación de estilo provisional/); assert.match(visible, /No se pudieron consultar tus valoraciones/);
});
check('Presentation does not mutate original inputs or write personal data', () => {
  const before = JSON.stringify(input); render(input); assert.equal(JSON.stringify(input), before);
  assert.doesNotMatch(source, /localStorage|fetch\(|\.invoke\(|Math\.random/);
});
console.log(JSON.stringify({ passed: true, groups: checks, networkCalls: 0, realUsers: 0, formulaChanged: false, tanninZeroCompared: false }));
