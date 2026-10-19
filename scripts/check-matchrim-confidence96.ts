import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { evaluateCandidateGrounding } from '../supabase/functions/analyze-wine-region/grounding';
import { optionalScanNumber } from '../supabase/functions/_shared/matchrim-scan-values';

const path = 'supabase/functions/analyze-wine-region/index.ts';
const before = execFileSync('git', ['show', `06d56c76af9135559926e99b321ed8b00225c229:${path}`], { encoding: 'utf8' });
const current = readFileSync(path, 'utf8');
const oldLine = '  let confidence = clamp(Number(raw.confidence) || 0.35, 0, 1);';
const newLine = '  let confidence = clamp(optionalScanNumber(raw.confidence) ?? 0, 0, 1);';
assert.equal(current.split(newLine).length, 2);
assert.equal(current.replace(newLine, oldLine), before, 'Only the confidence fallback changes');

type Candidate = Record<string, unknown> & { confidence: number };
const load = (source: string) => {
  const parsed = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
  const names = new Set(['clamp', 'stringArray', 'normalizeCandidate']);
  const statements = parsed.statements.filter(statement => ts.isVariableStatement(statement)
    && statement.declarationList.declarations.some(declaration =>
      ts.isIdentifier(declaration.name) && names.has(declaration.name.text)));
  assert.equal(statements.length, 3);
  const code = ts.transpileModule(statements.map(statement => statement.getText(parsed)).join('\n'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  return vm.runInNewContext(code + '\nnormalizeCandidate;', {
    optionalScanNumber, evaluateCandidateGrounding,
  }) as (value: unknown, visibleText: string[]) => Candidate | null;
};
const baseline = load(before);
const normalize = load(current);
const visible = ['Pago de Cirsus', 'CUVEE ESPECIAL', '2021'];
const candidate = {
  name: 'Pago de Cirsus Cuvee Especial', producer: 'Pago de Cirsus', vintage: 2021,
  evidence: ['Pago de Cirsus', '2021'], inferred_fields: [], uncertainty_reasons: [],
};
assert.equal(baseline({ ...candidate, confidence: 0 }, visible)?.confidence, 0.35,
  'The prior zero-to-filler defect is actually reproduced');
for (const confidence of [0, 0.35, 0.71, 0.72, 0.78, 1]) {
  assert.equal(normalize({ ...candidate, confidence }, visible)?.confidence, confidence);
  if (confidence !== 0) assert.equal(JSON.stringify(normalize({ ...candidate, confidence }, visible)),
    JSON.stringify(baseline({ ...candidate, confidence }, visible)));
}
for (const confidence of [undefined, null, '', ' ', false, true, {}, [], Number.NaN, Infinity, -Infinity, 'not-a-number']) {
  assert.equal(normalize({ ...candidate, confidence }, visible)?.confidence, 0,
    `Invalid/missing confidence must not acquire a positive signal: ${String(confidence)}`);
}
for (const [confidence, expected] of [['0', 0], ['0.78', 0.78], [-1, 0], [2, 1]] as const) {
  assert.equal(normalize({ ...candidate, confidence }, visible)?.confidence, expected);
}
for (const confidence of [0, 0.9, true, undefined]) {
  assert.equal(normalize({ ...candidate, confidence }, []), null);
  assert.equal(normalize({ ...candidate, name: 'Unrelated Brand', producer: null, vintage: null, confidence }, visible), null);
}
const ungrounded = normalize({ ...candidate, name: 'Pago de Cirsus Invented', confidence: 1 }, visible);
assert(ungrounded && ungrounded.confidence <= 0.55, 'Existing ungrounded-name cap remains');
assert.equal(normalize({ ...candidate, confidence: 0.9 }, visible)?.sensory_attributes, null);
console.log('Confidence96: prior defect reproduced; actual normalizer zero/invalid/valid/bounds/grounding controls PASS. No model calls or accuracy claim.');
