const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');

const base = 'e3fd4c73913469a3f084be7f1296b17fe7c3ac70';
const file = 'supabase/functions/scan-food-pairing/index.ts';
const before = execFileSync('git', ['show', `${base}:${file}`], { encoding: 'utf8' });
const after = readFileSync(file, 'utf8');
const profileFile = 'supabase/functions/_shared/matchrim-profile95.ts';
const profile = readFileSync(profileFile, 'utf8');
const structuredFile = 'supabase/functions/_shared/structured-response.ts';
const structured = readFileSync(structuredFile, 'utf8');
const providerFile = 'supabase/functions/_shared/matchrim-ai-provider.ts';
const provider = readFileSync(providerFile, 'utf8');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const parse = text => ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
const js = text => ts.transpileModule(text, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
function declaration(text, name) {
  const tree = parse(text);
  const found = tree.statements.flatMap(statement => ts.isVariableStatement(statement)
    ? [...statement.declarationList.declarations] : []).filter(node => node.name.getText(tree) === name);
  assert.equal(found.length, 1, `one actual declaration: ${name}`);
  return found[0];
}
function definition(text, name) {
  const tree = parse(text);
  return `const ${declaration(text, name).getText(tree)};`;
}
function catchBlock(text) {
  const tree = parse(text);
  const found = [];
  function visit(node) {
    if (ts.isCatchClause(node) && node.getText(tree).includes('provider_unavailable')) found.push(node);
    ts.forEachChild(node, visit);
  }
  visit(tree);
  assert.equal(found.length, 1);
  return found[0].block.getText(tree);
}
const helperStatement = (() => {
  const tree = parse(after);
  return tree.statements.find(statement => ts.isVariableStatement(statement)
    && statement.declarationList.declarations.some(node => node.name.getText(tree) === 'classifyNativeFoodProviderFailure96'));
})();
assert.ok(helperStatement);
const comment = '// Observed error/signal only; this does not establish an upstream root cause.\n';
const helper = comment + helperStatement.getText(parse(after)) + '\n\n';
const oldLog = '      console.error("Food AI provider unavailable");';
const newLog = `      if (readMatchrimLearningOptions96(matchrimLearningModel).evidenceStrength === 'native-v2') {
        console.error("Food AI provider failure", {
          version: FUNCTION_VERSION, failure: classifyNativeFoodProviderFailure96(error, req.signal),
        });
      } else {
        console.error("Food AI provider unavailable");
      }`;
assert.equal(after.split(helper).length, 2);
assert.equal(after.split(newLog).length, 2);
assert.equal(after.replace(helper, '').replace(newLog, oldLog), before,
  'Complete byte inverse: only the helper and native-only logging branch may change');
assert.equal(profile, execFileSync('git', ['show', `${base}:${profileFile}`], { encoding: 'utf8' }));
assert.equal(provider, execFileSync('git', ['show', `${base}:${providerFile}`], { encoding: 'utf8' }));
assert.equal(structured, execFileSync('git', ['show', `${base}:${structuredFile}`], { encoding: 'utf8' }));

function load(text, native) {
  const logs = [];
  const context = vm.createContext({ Error, SyntaxError, TypeError, DOMException, Response,
    console: { error: (...args) => logs.push(args) }, exports: {} });
  vm.runInContext(js(structured), context, { timeout: 1000 });
  Object.assign(context, context.exports);
  const constants = ['NATIVE_MATCHRIM_LEARNING_MODEL', 'readMatchrimLearningOptions96'].map(name => definition(profile, name)).join('\n');
  const local = ['corsHeaders', 'FUNCTION_VERSION', 'invalidModelResponse'].map(name => definition(text, name)).join('\n');
  vm.runInContext(js(`${constants}\n${local}\n${native ? definition(text, 'classifyNativeFoodProviderFailure96') : ''}
    globalThis.invoke = (error, matchrimLearningModel, signal) => {
      const req = { signal };
      ${catchBlock(text)}
    };`), context, { timeout: 1000 });
  return { invoke: context.invoke, logs };
}
const baseline = load(before, false);
const candidate = load(after, true);
const cases = [];
const marker = 'PRIVATE_PROMPT_KEY_PROVIDER_BODY_MUST_NOT_LOG';
const inputs = [
  ['timeout', new DOMException(marker, 'TimeoutError'), false, 'timeout_error'],
  ['named-Error-timeout', Object.assign(new Error(marker), { name: 'TimeoutError' }), false, 'timeout_error'],
  ['client-abort', new DOMException(marker, 'AbortError'), true, 'client_abort'],
  ['unattributed-abort', new DOMException(marker, 'AbortError'), false, 'provider_unavailable'],
  ['unrelated-error-with-aborted-request', new Error(marker), true, 'provider_unavailable'],
  ['provider-error', new Error(marker), false, 'provider_unavailable'],
  ['rate-limit', new Error(`Demasiadas solicitudes ${marker}`), false, 'provider_unavailable'],
  ['plain-object-cannot-attest-timeout', { name: 'TimeoutError', message: marker }, false, 'provider_unavailable'],
  ['untyped-null', null, false, 'provider_unavailable'],
  ['syntax', new SyntaxError(marker), false, null],
  ['typeerror-existing-422', new TypeError(marker), false, null],
];
const tags = [undefined, null, '', 'native-v2', 'native-evidence-strength-v2 ', 'NATIVE-EVIDENCE-STRENGTH-V2',
  { model: 'native-evidence-strength-v2' }, 'native-evidence-strength-v2'];
(async () => {
  for (const [id, error, aborted, failure] of inputs) for (const tag of tags) {
    baseline.logs.length = 0;
    candidate.logs.length = 0;
    const signal = { aborted };
    const oldResponse = baseline.invoke(error, tag, signal);
    const newResponse = candidate.invoke(error, tag, signal);
    assert.equal(newResponse.status, oldResponse.status);
    assert.deepEqual([...newResponse.headers], [...oldResponse.headers]);
    assert.equal(await newResponse.text(), await oldResponse.text(), 'Public payload remains byte-identical');
    const native = tag === 'native-evidence-strength-v2';
    if (failure === null) assert.equal(candidate.logs.length, 0, 'Existing early invalid-JSON branch unchanged');
    else if (!native) assert.equal(JSON.stringify(candidate.logs), JSON.stringify(baseline.logs), 'Default/unknown/web tags preserve logs exactly');
    else {
      assert.equal(candidate.logs.length, 1);
      assert.equal(candidate.logs[0][0], 'Food AI provider failure');
      const record = candidate.logs[0][1];
      assert.deepEqual(Object.keys(record).sort(), ['failure', 'version']);
      assert.equal(record.failure, failure);
      assert.equal(record.version, 'scan-food-pairing-2026-10-17-profile95-v10');
    }
    assert.ok(!JSON.stringify(candidate.logs).includes(marker), 'No messages, payloads, prompts, bodies or credentials logged');
    cases.push({ id, tag: tag ?? 'absent-or-null', aborted, passed: true,
      status: newResponse.status, expectedDiagnostic: native ? failure : 'LEGACY_UNCHANGED' });
  }
  const mutations = [
    ['timeout-classification-lost', after.replace("return 'timeout_error';", "return 'provider_unavailable';"),
      new DOMException(marker, 'TimeoutError'), false, 'native-evidence-strength-v2', logs =>
        assert.equal(logs[0][1].failure, 'timeout_error')],
    ['abort-without-observed-request-cancellation', after.replace(" && signal.aborted)", ")"),
      new DOMException(marker, 'AbortError'), false, 'native-evidence-strength-v2', logs =>
        assert.equal(logs[0][1].failure, 'provider_unavailable')],
    ['opt-in-inverted', after.replace(".evidenceStrength === 'native-v2'", ".evidenceStrength !== 'native-v2'"),
      new Error(marker), false, undefined, logs =>
        assert.equal(JSON.stringify(logs), JSON.stringify([['Food AI provider unavailable']]))],
    ['private-error-message-leaked', after.replace('version: FUNCTION_VERSION, failure:', 'detail: String(error), version: FUNCTION_VERSION, failure:'),
      new Error(marker), false, 'native-evidence-strength-v2', logs =>
        assert.ok(!JSON.stringify(logs).includes(marker))],
  ];
  const mutationResults = [];
  for (const [id, text, error, aborted, tag, oracle] of mutations) {
    assert.notEqual(text, after, id);
    const mutant = load(text, true);
    mutant.invoke(error, tag, { aborted });
    assert.throws(() => oracle(mutant.logs), undefined, `${id}: the wrong behavior must fail`);
    mutationResults.push({ id, rejected: true });
  }
  console.log(JSON.stringify({ passed: true, total: cases.length, cases,
    mutationControls: mutationResults,
    fullHandlerByteInverse: true, defaultWebAndAllPublicResponsesUnchanged: true,
    sharedProviderProfileStructuredBytesUnchanged: true, errorRootCauseEstablished: false,
    networkCalls: 0, SDK: false, deployed: false,
    source: { base, handlerSha256: hash(after), baselineSha256: hash(before),
      profileSha256: hash(profile), providerSha256: hash(provider), structuredSha256: hash(structured) },
    scope: 'Actual diagnostic helper and actual catch blocks plus real structured-response/read-model functions; not a full auth/profile/success-handler run.' }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
