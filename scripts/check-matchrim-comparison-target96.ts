import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';

const path = 'src/index.css';
const before = execFileSync('git', ['show', `06d56c76af9135559926e99b321ed8b00225c229:${path}`], { encoding: 'utf8' });
const current = readFileSync(path, 'utf8');
const start = '\n/* Native comparison checkbox: compact indicator, full accessible touch target. */';
const end = '/* End native comparison checkbox touch target. */\n';
const scope = 'html.matchrim-native-platform section[aria-labelledby="wine-comparison-title"] button[role="checkbox"]';

const check = (css: string) => {
  assert.equal(css.split(start).length, 2);
  assert.equal(css.split(end).length, 2);
  assert(css.endsWith(end));
  const offset = css.indexOf(start);
  assert.equal(css.slice(0, offset), before, 'All pre-existing stylesheet bytes remain exact');
  const rules: postcss.Rule[] = [];
  postcss.parse(css.slice(offset)).walkRules(rule => { rules.push(rule); });
  assert.deepEqual(rules.map(rule => rule.selector), [scope, `${scope}::before`,
    `${scope}[data-state="checked"]::before`, `${scope} > span`]);
  const declarations = (rule: postcss.Rule) => {
    const result: Record<string, string> = {};
    rule.walkDecls(declaration => {
      assert.equal(result[declaration.prop], undefined, 'No conflicting duplicate declaration');
      result[declaration.prop] = declaration.value;
    });
    return result;
  };
  assert.deepEqual(declarations(rules[0]), {
    position: 'relative', display: 'grid', width: '44px', height: '44px',
    'place-items': 'center', border: '0', 'border-radius': '6px', background: 'transparent',
  });
  assert.deepEqual(declarations(rules[1]), {
    position: 'absolute', width: '20px', height: '20px',
    border: '1px solid hsl(var(--primary))', 'border-radius': '3px',
    background: 'hsl(var(--background))', content: '""',
  });
  assert.deepEqual(declarations(rules[2]), { background: 'hsl(var(--primary))' });
  assert.deepEqual(declarations(rules[3]), { position: 'relative' });
};

check(current);
const offset = current.indexOf(start);
const prefix = current.slice(0, offset);
const suffix = current.slice(offset);
for (const changedSuffix of [
  suffix.replace('width: 44px;', 'width: 43px;'),
  suffix.replace('height: 44px;', 'height: 43px;'),
  suffix.replace('width: 20px;', 'width: 19px;'),
  suffix.replace(scope, scope.replace('html.matchrim-native-platform ', '')),
  suffix.replace(scope, scope.replace('wine-comparison-title', 'unrelated-title')),
]) {
  assert.notEqual(changedSuffix, suffix);
  assert.throws(() => check(prefix + changedSuffix));
}
assert.throws(() => check(current.replace('/* End native accessibility scan hub. */',
  '/* Unreviewed existing style edit. */')));

const component = 'src/components/wine-import/WineComparisonWorkspace.tsx';
assert.equal(readFileSync(component, 'utf8'), execFileSync('git', ['show',
  `06d56c76af9135559926e99b321ed8b00225c229:${component}`], { encoding: 'utf8' }),
'Selection, callbacks, labels, pricing and web markup are unchanged');

console.log('Comparison target96: CSS scope/inverse, 44px target, 20px indicator and six directed negatives PASS. Not UIKit geometry proof.');
