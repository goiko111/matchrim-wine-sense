import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const repo = new URL('../', import.meta.url).pathname.replace(/\/$/, '');
const require = createRequire(repo + '/package.json');
const ts = require('typescript');
const file = repo + '/src/data/quizData.ts', source = fs.readFileSync(file, 'utf8');
const module = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
} }).outputText, { module, exports: module.exports, require: id => {
  assert(id.startsWith('@/assets/quiz/') && id.endsWith('.jpg'));
  return { __esModule: true, default: id };
} }, { timeout: 1000 });
const { questions, calculateProfile } = module.exports;
const axes = ['potente', 'acidez', 'dulce', 'tanico', 'afrutado'];
const totals = Object.fromEntries(axes.map(axis => [axis, questions.reduce((sum, q) => sum + q.scores[axis], 0)]));
const weightDifferences = questions.filter(q => q.scores.potente !== q.scores.tanico)
  .map(q => ({ id: q.id, question: q.text, power: q.scores.potente, tannin: q.scores.tanico }));
const seen = new Set(), pairs = new Map();
let equal = 0, maxDifference = 0, sumX = 0, sumY = 0, sumXX = 0, sumYY = 0, sumXY = 0;
for (let index = 1; index <= 10000; index++) {
  let state = (index * 0x9e3779b9) >>> 0;
  const answers = {};
  for (const question of questions) {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    answers[question.id] = ['si', 'indiferente', 'no'][(state >>> 0) % 3];
  }
  seen.add(JSON.stringify(answers));
  const profile = calculateProfile(answers), x = profile.potente, y = profile.tanico;
  assert(axes.every(axis => Number.isInteger(profile[axis]) && profile[axis] >= 0 && profile[axis] <= 5));
  if (x === y) equal++;
  maxDifference = Math.max(maxDifference, Math.abs(x - y));
  pairs.set(`${x},${y}`, (pairs.get(`${x},${y}`) ?? 0) + 1);
  sumX += x; sumY += y; sumXX += x*x; sumYY += y*y; sumXY += x*y;
}
assert.equal(seen.size, 10000);
assert.equal(weightDifferences.length, 1);
assert.equal(weightDifferences[0].id, 19);
assert.equal(totals.potente, totals.tanico + 1);
const rawMaxDifference = 5 / totals.potente;
assert(rawMaxDifference < 1);
assert(maxDifference <= 1);
const n = seen.size;
console.log(JSON.stringify({ recordedUTC: new Date().toISOString(), source: file,
  sourceSHA256: createHash('sha256').update(source).digest('hex'),
  scope: 'Read-only structural audit of the actual quiz scoring function.10000distinct synthetic answer vectors, not humans, wine-tasting feedback or predictive validation. No product/user-profile changes.',
  questions: questions.length, totals, weightDifferences,
  syntheticVectors: n, equalPowerTannin: equal, equalFraction: equal/n,
  maxObservedRoundedDifference: maxDifference,
  correlation: (n*sumXY-sumX*sumY)/Math.sqrt((n*sumXX-sumX*sumX)*(n*sumYY-sumY*sumY)),
  observedPairs: Object.fromEntries([...pairs].sort()),
  analyticalBound: { rawDifferenceAtMost: rawMaxDifference, roundedDifferenceAtMost: 1,
    proof: 'All weights match except curry power=tannin+1. Let T be tannin weighted sum, t its maximum, c the curry multiplier in[0,1]. Raw difference=5*(c*t-T)/(t*(t+1)), bounded by5/(t+1). Rounding cannot create independently separated body/tannin axes.' },
  finding: 'Initial quiz cannot express body/tannin preferences more than1point apart. Do not present structural consistency as evidence of actual taste prediction or silently recalibrate stored profiles.',
  externalCalls: 0, productChanges: false, realAccounts: false, spend: 0 }, null, 2));
