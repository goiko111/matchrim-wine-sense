import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { feedbackServerScope96, projectFeedbackServer96 } from './matchrim-feedback-server96-scope';
import { calculateLearnedMatchrimProfile95 as server, NATIVE_MATCHRIM_LEARNING_MODEL, readMatchrimLearningOptions96 } from '../supabase/functions/_shared/matchrim-profile95';
import { calculateLearnedMatchrimProfile as client } from '../src/utils/matchrimLearning';
import { cellarTrainingRows, makeCellarCatalogEvidence } from '../src/utils/bodegaAffinity';
import { restoreFoodDiagnostics96 } from './matchrim-food-diagnostics96-scope';

const prior = (file: string) => execFileSync('git', ['show', `983146c6d87a49bfa58aa503a166e0dc4e972ec1:${file}`], { encoding: 'utf8' });
const axes = ['potente', 'acidez', 'dulce', 'tanico', 'afrutado'] as const;
const all = (value: number) => ({ potente: value, acidez: value, dulce: value, tanico: value, afrutado: value });
let groups = 0, negatives = 0;
const check = (name: string, fn: () => void) => { fn(); groups++; console.log('PASS ' + name); };
const plain = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const old = { exports: {} as { calculateLearnedMatchrimProfile95: typeof server } };
vm.runInNewContext(ts.transpileModule(prior('supabase/functions/_shared/matchrim-profile95.ts'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText, old);
const wine = (rating: 'love' | 'ok' | 'not_for_me', value = 5, id = 'synthetic', date?: string) => {
  const row = { id, name: 'Synthetic bound wine', producer: 'Synthetic producer', vintage: null,
    region: '', country: '', rating, use_for_profile_training: true,
    sensory_attributes: { scale: 'winerim-0-5' as const, potencia: value, acidez: value, dulzura: value, taninos: value, afrutado: value } };
  return { ...row, place_details: { bodega_sensory_evidence: makeCellarCatalogEvidence(row, 'synthetic', row.sensory_attributes),
    ...(date ? { matchrim_rating_at: date } : {}) } };
};
const native = { evidenceStrength: 'native-v2' as const };

check('Eight whole-source inverses preserve owner/auth/cancellation/web and all unreviewed bytes', () => {
  for (const file of feedbackServerScope96) {
    const source = readFileSync(file, 'utf8'), historical = prior(file);
    const validate = (candidate: string) => assert.equal(projectFeedbackServer96(file, file === 'supabase/functions/scan-food-pairing/index.ts' ? restoreFoodDiagnostics96(candidate) : candidate), historical);
    validate(source);
    for (const changed of [source + '\n// unreviewed\n', source.replace(/matchrim/i, 'unreviewed')]) {
      assert.notEqual(changed, source); assert.throws(() => validate(changed)); negatives++;
    }
  }
  assert.throws(() => projectFeedbackServer96('unreviewed.ts', '')); negatives++;
});
check('Only the exact known tag opts in, including against objects/coercion/whitespace/case', () => {
  assert.equal(readMatchrimLearningOptions96(NATIVE_MATCHRIM_LEARNING_MODEL).evidenceStrength, 'native-v2');
  for (const tag of [undefined, null, '', false, 0, {}, [], ['native-evidence-strength-v2'],
    'NATIVE-EVIDENCE-STRENGTH-V2', 'native-evidence-strength-v2 ', { toString: () => NATIVE_MATCHRIM_LEARNING_MODEL }]) {
    const options = readMatchrimLearningOptions96(tag);
    assert.equal(options.evidenceStrength, 'legacy-v1');
    assert.deepEqual(server(all(1), [wine('ok')], options), plain(old.exports.calculateLearnedMatchrimProfile95(all(1), [wine('ok')])));
  }
});
check('Independent interior LOVE/OK/negative anchors and weighted confidence', () => {
  assert.deepEqual(server(all(1), [wine('love')], native), { profile: all(2.2), samples: 1, confidence: 8 });
  assert.deepEqual(server(all(1), [wine('ok')], native), { profile: all(1.3), samples: 1, confidence: 2 });
  assert.deepEqual(server(all(3), [wine('not_for_me')], native), { profile: all(2.5), samples: 1, confidence: 7 });
  assert.deepEqual(server(all(1), [wine('love')], native), server(all(1), [wine('love')]));
});
check('Native client/server profiles, samples/confidence and legacy exact results across signed/recency/multiple signals', () => {
  for (const base of [0, 0.25, 1, 2.5, 5]) for (const rating of ['love', 'ok', 'not_for_me'] as const) {
    for (const rows of [[], [wine(rating)], [wine(rating, 5, 'a'), wine(rating, 5, 'b')],
      [wine(rating, 0, 'old', '2026-01-01T00:00:00Z'), wine('love', 5, 'new', '2026-05-01T00:00:00Z')]]) {
      const snapshot = JSON.stringify(rows), learned = client(all(base), cellarTrainingRows(rows, true), native);
      assert.deepEqual(server(all(base), rows, native), { profile: learned.profile, samples: learned.samples, confidence: learned.confidence });
      assert.deepEqual(server(all(base), rows), plain(old.exports.calculateLearnedMatchrimProfile95(all(base), rows)));
      assert.equal(JSON.stringify(rows), snapshot);
    }
  }
});
check('Missing/bad evidence, opt-out, edited identity, unknown scale and nonfinite values remain abstention', () => {
  const row = wine('ok');
  for (const bad of [{ ...row, place_details: {} }, { ...row, name: 'edited' }, { ...row, use_for_profile_training: false },
    { ...row, sensory_attributes: { ...row.sensory_attributes, scale: 'unknown' } },
    ...[null, NaN, Infinity, -1, 6].map(value => ({ ...row, sensory_attributes: { ...row.sensory_attributes, potencia: value } }))]) {
    assert.deepEqual(server(all(0), [bad], native), { profile: all(0), samples: 0, confidence: 0 });
  }
});
check('Latest invalid or conflicting row cannot train twice and base never mutates', () => {
  const row = wine('ok'), base = all(1), snapshot = JSON.stringify(base);
  assert.equal(server(base, [row, row], native).samples, 1);
  for (const rows of [[row, { ...row, use_for_profile_training: false }], [{ ...row, rating: 'love' }, row]]) {
    assert.equal(server(base, rows, native).samples, 0);
  }
  assert.equal(JSON.stringify(base), snapshot);
});
check('Food actual context initializer preserves exact web keys/order and adds only native version', () => {
  const file = 'src/components/wine-import/FoodPairingScanner.tsx';
  const extract = (source: string) => {
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), expressions: string[] = [];
    const visit = (node: ts.Node) => {
      if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'context'
        && node.initializer?.getText(ast).includes('readMatchrimLocalProfile()')) expressions.push(node.initializer.getText(ast));
      ts.forEachChild(node, visit);
    };
    visit(ast); assert.equal(expressions.length, 1); return expressions[0];
  };
  const run = (code: string, native: boolean) => new Function('restaurantName', 'readMatchrimLocalProfile', 'isNative', 'NATIVE_MATCHRIM_LEARNING_MODEL',
    'return ' + code)('Synthetic restaurant', () => all(0), native, NATIVE_MATCHRIM_LEARNING_MODEL);
  const source = readFileSync(file, 'utf8');
  assert.equal(JSON.stringify(run(extract(source), false)), JSON.stringify(run(extract(prior(file)), false)));
  assert.deepEqual(run(extract(source), true), { restaurantName: 'Synthetic restaurant', matchrimProfile: all(0), matchrimLearningModel: NATIVE_MATCHRIM_LEARNING_MODEL });
});
console.log(JSON.stringify({ feedbackServer96: true, groups, exactSourceFiles: feedbackServerScope96.length,
  negativeSourceControls: negatives, axes: axes.length, networkCalls: 0, deployed: false }));
