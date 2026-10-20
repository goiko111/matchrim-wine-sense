import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import ts from 'typescript';
import { readMatchrimLearningOptions96, NATIVE_MATCHRIM_LEARNING_MODEL } from '../supabase/functions/_shared/matchrim-profile95';

const food = 'supabase/functions/scan-food-pairing/index.ts';
const prior = (file: string) => execFileSync('git', ['show', `22217624a70c024e8eb2318b4c841b2303f2f067:${file}`], { encoding: 'utf8' });
const once = (source: string, from: string, to: string) => { assert.equal(source.split(from).length, 2); return source.replace(from, to); };
const helper = `// Observed error/signal only; this does not establish an upstream root cause.
const classifyNativeFoodProviderFailure96 = (error: unknown, signal: AbortSignal) => {
  const namedError = error instanceof Error || error instanceof DOMException;
  if (namedError && error.name === 'TimeoutError') return 'timeout_error';
  if (namedError && error.name === 'AbortError' && signal.aborted) return 'client_abort';
  return 'provider_unavailable';
};

`;
const oldLog = '      console.error("Food AI provider unavailable");';
const newLog = `      if (readMatchrimLearningOptions96(matchrimLearningModel).evidenceStrength === 'native-v2') {
        console.error("Food AI provider failure", {
          version: FUNCTION_VERSION, failure: classifyNativeFoodProviderFailure96(error, req.signal),
        });
      } else {
        console.error("Food AI provider unavailable");
      }`;
export function restoreFoodDiagnostics96(source: string) {
  const before = prior(food);
  if (source === before) return source;
  source = once(once(source, helper, ''), newLog, oldLog);
  assert.equal(source, before, 'Only exact helper/native log inverse; entire Food response/auth/provider/default body unchanged');
  return source;
}
export function restoreFoodDiagnosticsGuard96(source: string) {
  source = once(source, "import { restoreFoodDiagnostics96 } from './matchrim-food-diagnostics96-scope';\n", '');
  source = once(source, "projectFeedbackServer96(file, file === 'supabase/functions/scan-food-pairing/index.ts' ? restoreFoodDiagnostics96(candidate) : candidate)", 'projectFeedbackServer96(file, candidate)');
  assert.equal(source, prior('scripts/check-matchrim-feedback-server96.ts'), 'Every prior backend assertion/count/negative exact');
  return source;
}

// Execute the actual uniquely-bound helper and catch logging, without transport.
const actual = readFileSync(food, 'utf8');
restoreFoodDiagnostics96(actual);
assert.equal(actual.split(helper).length, 2); assert.equal(actual.split(newLog).length, 2);
const lines: unknown[][] = [], api: { log?: (error: unknown, aborted: boolean, model: unknown) => void } = {};
vm.runInNewContext(ts.transpileModule(helper + `exports.log=(error,aborted,matchrimLearningModel)=>{const req={signal:{aborted}};${newLog}};`, {}).outputText,
  { exports: api, Error, DOMException, readMatchrimLearningOptions96, FUNCTION_VERSION: 'scan-food-pairing-2026-10-17-profile95-v10', console: { error: (...values: unknown[]) => lines.push(values) } });
const timeout = new Error('SYNTHETIC_PRIVATE_MARKER'); timeout.name = 'TimeoutError';
const abort = new Error('SYNTHETIC_PRIVATE_MARKER'); abort.name = 'AbortError';
const cases: [unknown, boolean, string][] = [[timeout, false, 'timeout_error'], [abort, true, 'client_abort'], [abort, false, 'provider_unavailable'],
  [new DOMException('SYNTHETIC_PRIVATE_MARKER', 'AbortError'), true, 'client_abort'], [{ name: 'TimeoutError', message: 'SYNTHETIC_PRIVATE_MARKER' }, false, 'provider_unavailable'],
  [new Error('SYNTHETIC_PRIVATE_MARKER'), false, 'provider_unavailable'], [null, false, 'provider_unavailable'], [true, true, 'provider_unavailable']];
for (const [error, aborted, expected] of cases) {
  lines.length = 0; api.log!(error, aborted, NATIVE_MATCHRIM_LEARNING_MODEL);
  assert.deepEqual(JSON.parse(JSON.stringify(lines)), [['Food AI provider failure', { version: 'scan-food-pairing-2026-10-17-profile95-v10', failure: expected }]]);
  assert(!JSON.stringify(lines).includes('SYNTHETIC_PRIVATE_MARKER'));
}
for (const model of [undefined, 'native-v2', 'native-evidence-strength-v2 ']) {
  lines.length = 0; api.log!(timeout, false, model); assert.deepEqual(lines, [['Food AI provider unavailable']]);
}
for (const changed of [actual + '\n// unreviewed\n', actual.replace('&& signal.aborted', '&& true'), actual.replace('failure: classifyNativeFoodProviderFailure96(error, req.signal)', 'failure: error'),
  actual.replace('dishes: [], scan_version: FUNCTION_VERSION', 'dishes: [], scan_version: "changed"')]) assert.throws(() => restoreFoodDiagnostics96(changed));
export const foodDiagnosticControls96 = { runtimeCases: cases.length + 3, rejectedMutations: 4, HTTP: 0, responseBodyWholeInverse: true };
