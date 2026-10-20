import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import ts from 'typescript';
import { readMatchrimLearningOptions96, NATIVE_MATCHRIM_LEARNING_MODEL } from '../supabase/functions/_shared/matchrim-profile95';

const food = 'supabase/functions/scan-food-pairing/index.ts';
const prior = (file: string) => execFileSync('git', ['show', `22217624a70c024e8eb2318b4c841b2303f2f067:${file}`], { encoding: 'utf8' });
const shippedFood = execFileSync('git', ['show', `ea89a3fc8bdc58676a029ae1a1afdb4c679cb843:${food}`], { encoding: 'utf8' });
const once = (source: string, from: string, to: string) => { assert.equal(source.split(from).length, 2, `Expected exactly one reviewed source block: ${from}`); return source.replace(from, to); };
// Reviewed native-menu v11 delta only. Every other byte must still equal shipped v10.
const compactInverse: [string, string][] = [
  ['import { expandFoodPairingStyles, isFoodScanPayload,', 'import { isFoodScanPayload,'],
  ["const FUNCTION_VERSION = 'scan-food-pairing-2026-10-20-profile95-v11';", "const FUNCTION_VERSION = 'scan-food-pairing-2026-10-17-profile95-v10';"],
  ["    const compactMenu = mode === 'menu'\n      && readMatchrimLearningOptions96(matchrimLearningModel).evidenceStrength === 'native-v2';\n", ''],
  [`\${compactMenu ? '  "pairing_styles": [{ "id": 1, "nombre": "estilo orientativo", "tipo": "Blanco", "uvas": [], "razon": "hipotesis general breve de maridaje" }],\\n' : ''}`, ''],
  [`\${compactMenu ? '' : '      "match": null,\\n'}`, '      "match": null,\n'],
  ["      ${compactMenu ? '\"pairing_ids\": [1]' : `\"recomendaciones\": [", '      "recomendaciones": ['],
  ['      ]`}\n', '      ]\n'],
  ["- ${compactMenu ? 'Genera primero TODO el inventario de platos. Para maridaje usa un diccionario pairing_styles de hasta 12 estilos compartidos (id entero unico 1..12), y pairing_ids con hasta 2 ids distintos por plato. Reutiliza un id solo cuando el estilo realmente acompane al plato; [] si no hay una hipotesis justificada. No escribas recomendaciones, atributos ni match dentro de los platos ni del diccionario. Las razones de los estilos son generales, no afirman ingredientes no leidos. No reduzcas ni agrupes platos para caber en el diccionario.' : '2 recomendaciones de vino por plato.'}", '- 2 recomendaciones de vino por plato.'],
  ["      const failure = classifyNativeFoodProviderFailure96(error, req.signal);\n      const timedOut = compactMenu && failure === 'timeout_error';\n", ''],
  ['          version: FUNCTION_VERSION, failure,', '          version: FUNCTION_VERSION, failure: classifyNativeFoodProviderFailure96(error, req.signal),'],
  ['      return new Response(JSON.stringify({ error: limited ? "rate_limited" : timedOut ? "provider_timeout" : "provider_unavailable",\n        ...(timedOut ? { message: "La lectura ha tardado demasiado. Prueba con fotos mas cercanas de cada parte de la carta." } : {}), recoverable: true,', '      return new Response(JSON.stringify({ error: limited ? "rate_limited" : "provider_unavailable", recoverable: true,'],
  ['        status: limited ? 429 : timedOut ? 504 : 502,', '        status: limited ? 429 : 502,'],
  ['    const payload = compactMenu ? expandFoodPairingStyles(parsed.value) : parsed.value;\n    if (!payload || !isFoodScanPayload(payload))', '    if (!isFoodScanPayload(parsed.value))'],
  ['      payload.dishes,\n      payload.coverage,', '      parsed.value.dishes,\n      parsed.value.coverage,'],
  ['        summary: payload.summary ?? "",', '        summary: parsed.value.summary ?? "",'],
];
function restoreFoodCompact96(source: string) {
  if (source === shippedFood) return source;
  for (const [current, previous] of compactInverse) source = once(source, current, previous);
  assert.equal(source, shippedFood, 'Exact native-menu compact/timeout inverse to ea89; auth/profile/learning/default/provider unchanged');
  return source;
}
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
  source = restoreFoodCompact96(source);
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
assert.equal(actual.split(helper).length, 2);
const currentLog = newLog.replace('failure: classifyNativeFoodProviderFailure96(error, req.signal)', 'failure');
assert.equal(actual.split(currentLog).length, 2);
const lines: unknown[][] = [], api: { log?: (error: unknown, aborted: boolean, model: unknown) => void } = {};
vm.runInNewContext(ts.transpileModule(helper + `exports.log=(error,aborted,matchrimLearningModel)=>{const req={signal:{aborted}};const failure=classifyNativeFoodProviderFailure96(error,req.signal);${currentLog}};`, {}).outputText,
  { exports: api, Error, DOMException, readMatchrimLearningOptions96, FUNCTION_VERSION: 'scan-food-pairing-2026-10-20-profile95-v11', console: { error: (...values: unknown[]) => lines.push(values) } });
const timeout = new Error('SYNTHETIC_PRIVATE_MARKER'); timeout.name = 'TimeoutError';
const abort = new Error('SYNTHETIC_PRIVATE_MARKER'); abort.name = 'AbortError';
const cases: [unknown, boolean, string][] = [[timeout, false, 'timeout_error'], [abort, true, 'client_abort'], [abort, false, 'provider_unavailable'],
  [new DOMException('SYNTHETIC_PRIVATE_MARKER', 'AbortError'), true, 'client_abort'], [{ name: 'TimeoutError', message: 'SYNTHETIC_PRIVATE_MARKER' }, false, 'provider_unavailable'],
  [new Error('SYNTHETIC_PRIVATE_MARKER'), false, 'provider_unavailable'], [null, false, 'provider_unavailable'], [true, true, 'provider_unavailable']];
for (const [error, aborted, expected] of cases) {
  lines.length = 0; api.log!(error, aborted, NATIVE_MATCHRIM_LEARNING_MODEL);
  assert.deepEqual(JSON.parse(JSON.stringify(lines)), [['Food AI provider failure', { version: 'scan-food-pairing-2026-10-20-profile95-v11', failure: expected }]]);
  assert(!JSON.stringify(lines).includes('SYNTHETIC_PRIVATE_MARKER'));
}
for (const model of [undefined, 'native-v2', 'native-evidence-strength-v2 ']) {
  lines.length = 0; api.log!(timeout, false, model); assert.deepEqual(lines, [['Food AI provider unavailable']]);
}
for (const changed of [actual + '\n// unreviewed\n', actual.replace('&& signal.aborted', '&& true'), actual.replace('version: FUNCTION_VERSION, failure,', 'version: FUNCTION_VERSION, failure: error,'),
  actual.replace('dishes: [], scan_version: FUNCTION_VERSION', 'dishes: [], scan_version: "changed"')]) assert.throws(() => restoreFoodDiagnostics96(changed));
export const foodDiagnosticControls96 = { runtimeCases: cases.length + 3, rejectedMutations: 4, HTTP: 0, responseBodyWholeInverse: true };

const compactMutations: [string, string][] = [
  ["mode === 'menu'\n      &&", "mode !== 'dish'\n      &&"],
  ["const timedOut = compactMenu && failure === 'timeout_error';", "const timedOut = failure === 'timeout_error';"],
  ['if (!payload || !isFoodScanPayload(payload))', 'if (!payload)'],
  ['maxTokens = scanRegion ? 8192 : 16384', 'maxTokens = scanRegion ? 16384 : 16384'],
  [".eq('user_id', user.id)", ".eq('user_id', 'SPOOF')"],
  ['readMatchrimLearningOptions96(matchrimLearningModel));', 'readMatchrimLearningOptions96(undefined));'],
  ['normalizeFoodScan(', 'normalizeUnreviewedFood('],
  ['atributos: null })),', 'atributos: {} })),'],
  ['readMatchrimProfile95(matchrimProfile)', 'matchrimProfile'],
];
for (const [from, to] of compactMutations) {
  const changed = once(actual, from, to);
  assert.notEqual(changed, actual);
  assert.throws(() => restoreFoodDiagnostics96(changed));
}
export const foodCompactScopeControls96 = { baseline: 'ea89a3fc8bdc58676a029ae1a1afdb4c679cb843',
  exactInverseBlocks: compactInverse.length, rejectedMutations: compactMutations.length,
  runtimeHandlerProjected: false, HTTP: 0 };
