import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import ts from 'typescript';
import { restoreLabelEvidence152, restoreLocalPrivacy152 } from './native-local-privacy152-scope.mjs';

const file = 'src/utils/nativePrivacy97.ts', source = fs.readFileSync(file, 'utf8');
const prior = execFileSync('git', ['show', 'd7d81e1:' + file], { encoding: 'utf8' });
assert.equal(restoreLocalPrivacy152(file, source), prior);
assert.equal(restoreLocalPrivacy152(file, prior), prior);
assert.equal(restoreLocalPrivacy152('other/nativePrivacy97.ts', source), source);
const guardFile = 'scripts/check-matchrim-native-scan99-scope.mjs';
let guard = fs.readFileSync(guardFile, 'utf8');
for (const [current, previous] of [
  ["import { restoreLabelEvidence152, restoreLocalPrivacy152 } from './native-local-privacy152-scope.mjs';\n", ''],
  ["const read = file => restoreLabelEvidence152(file, restoreLocalPrivacy152(file, readFileSync(new URL(file, root), 'utf8')));",
    "const read = file => readFileSync(new URL(file, root), 'utf8');"],
]) {
  assert.equal(guard.split(current).length, 2); guard = guard.replace(current, previous);
}
assert.equal(guard, execFileSync('git', ['show', 'c8c7a1e:' + guardFile], { encoding: 'utf8' }),
  'All original99 assertions, counts, mutation lists and report wording remain exact');
const mutations = [
  ['openai-local.v4', 'openai.v3'],
  ['solo el texto se consulta en Winerim', 'la foto se consulta en Winerim'],
  ['la foto no se envía', 'la foto se envía'],
  ['Apple Vision', 'Cloud Vision'],
  ['section.title ===', 'section.title !=='],
  ['index === 1', 'index === 0'],
  [' : item)', ' : "unreviewed")'],
];
for (const [from, to] of mutations) {
  assert(source.includes(from), from); const changed = source.replace(from, to);
  assert.notEqual(restoreLocalPrivacy152(file, changed), prior, 'Unknown source cannot inherit a historical pass');
}
assert.notEqual(restoreLocalPrivacy152(file, source + '\n// unreviewed152\n'), prior);
const ledgerFile = 'src/utils/labelScanSave.ts', ledger = fs.readFileSync(ledgerFile, 'utf8');
const ledgerBefore = execFileSync('git', ['show', 'd7d81e1:' + ledgerFile], { encoding: 'utf8' });
assert.equal(restoreLabelEvidence152(ledgerFile, ledger), ledgerBefore);
assert.equal(restoreLabelEvidence152(ledgerFile, ledgerBefore), ledgerBefore);
assert.equal(restoreLabelEvidence152('other/labelScanSave.ts', ledger), ledger);
const ledgerMutations = [
  ['confirmsCellarReferenceStyle110(data,', 'confirmsCellarReferenceStyle110(null,'],
  ['confirmsCellarPublicReference107(data,', 'confirmsCellarPublicReference107(null,'],
  ['user_id: ownerId,', 'user_id: "other",'],
  ['if (!isCurrent())', 'if (false)'],
  ["previous.status !== 'rejected'", "previous.status !== 'saved'"],
  ['result.ownerId !== batch.ownerId', 'false'],
];
for (const [from, to] of ledgerMutations) {
  assert(ledger.includes(from), from); const changed = ledger.replace(from, to);
  assert.notEqual(restoreLabelEvidence152(ledgerFile, changed), ledgerBefore);
}

// Execute the actual current pure policy with no imports or network host.
const context = vm.createContext({ exports: {} });
vm.runInContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
  context, { timeout: 1000 });
const policy = context.exports;
assert.equal(policy.NATIVE_SCAN_PRIVACY_KEY97, 'matchrim.scan_privacy_notice.openai-local.v4');
for (const phrase of ['OpenAI', 'Apple Vision', 'solo el texto se consulta en Winerim', 'la foto no se envía']) {
  assert(policy.NATIVE_SCAN_PROVIDER_NOTICE97.includes(phrase), phrase);
}
const sections = [{ title: 'Datos', items: ['untouched'] },
  { title: 'Servicios y encargados', items: ['Supabase', 'Old provider', 'TLS'] }];
const before = JSON.stringify(sections), actual = policy.nativePrivacySections97(sections);
assert.equal(JSON.stringify(sections), before);
assert.equal(actual[0], sections[0]);
assert.equal(actual[1].items[0], 'Supabase'); assert.equal(actual[1].items[2], 'TLS');
for (const phrase of ['OpenAI', 'Si eliges', 'Apple Vision', 'la foto no se envía', 'solo el texto leído']) {
  assert(actual[1].items[1].includes(phrase), phrase);
}
console.log(JSON.stringify({ exactHistoricalPairs: 4, originalGuardAssertionsUnchanged: true,
  rejectedUnknownSourceMutations: mutations.length + 1 + ledgerMutations.length, actualCurrentPolicyExecuted: true,
  networkCalls: 0, browser: false, device: false,
  scope: 'Frozen99 source proof is not current UI evidence. Actual97 consent and actual107/110 persistence tests remain separate.' }));
