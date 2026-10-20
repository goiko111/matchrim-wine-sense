import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { restoreNativeMenuListAction96 } from './check-matchrim-menu-list-action96.mjs';
import { restoreNativeConsentEntry96 } from './check-matchrim-native-consent-entry96.mjs';
import { restoreMenuEditShortcutPackage96 } from './check-matchrim-menu-edit-shortcut96.mjs';
import { restoreMenuEditorKeyboardGuard96 } from './check-matchrim-menu-editor-keyboard96.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const prior = file => execFileSync('git', ['show', '26d48c6b5661c9236f3bdd97fe6b81587361caeb:' + file], { cwd: root, encoding: 'utf8' });
const once = (value, from, to) => { assert.equal(value.split(from).length, 2, from); return value.replace(from, to); };
const tail = ' && node scripts/check-matchrim-menu-list-action96.mjs && node scripts/check-matchrim-native-consent-entry96.mjs && node scripts/check-matchrim-native-menu-entry-bridge96.mjs';
export function restoreMenuEntrySource96(file, value) {
  if (file === 'src/components/wine-import/WineMenuScanner.tsx' && value.includes('role="listitem"')) return restoreNativeMenuListAction96(value);
  if (file === 'src/components/ScanPrivacyGate.tsx' && value.includes('const justAcceptedRef =')) return restoreNativeConsentEntry96(value);
  return value;
}
export function restoreMenuEntryPackage96(value) {
  value = restoreMenuEditShortcutPackage96(value);
  const before = prior('package.json');
  if (value === before || !value.includes('node scripts/check-matchrim-menu-list-action96.mjs')) return value;
  const command = JSON.parse(before).scripts['test:closure96'];
  value = once(value, command + tail, command);
  assert.equal(value, before, 'Exact26 package plus three appended offline leaves only');
  return value;
}
const changes = {
  'scripts/check-matchrim-menu-reading96.ts': [
    ["import { restoreMenuEntrySource96 } from './check-matchrim-native-menu-entry-bridge96.mjs';\n", ''],
    ["const source = restoreMenuEntrySource96('src/components/wine-import/WineMenuScanner.tsx', readFileSync(new URL('../src/components/wine-import/WineMenuScanner.tsx', import.meta.url), 'utf8'));", "const source = readFileSync(new URL('../src/components/wine-import/WineMenuScanner.tsx', import.meta.url), 'utf8');"],
  ],
  'scripts/check-matchrim-menu-comparator-return96.mjs': [
    ["import { restoreMenuEntrySource96, restoreMenuEntryGuard96, restoreMenuEntryPackage96 } from './check-matchrim-native-menu-entry-bridge96.mjs';\n", ''],
    ["  source = restoreMenuEntrySource96(file, source);\n", ''],
    ["const source = restoreMenuEntrySource96(file, fs.readFileSync(path.join(root, file), 'utf8')), checks = [];", "const source = fs.readFileSync(path.join(root, file), 'utf8'), checks = [];"],
    ["let guard = restoreMenuEntryGuard96(guardFile, fs.readFileSync(path.join(root, guardFile), 'utf8'));", "let guard = fs.readFileSync(path.join(root, guardFile), 'utf8');"],
    ["const pkg = restoreMenuEntryPackage96(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));", "const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');"],
    ["const scope = restoreMenuEntryGuard96(scopeFile, fs.readFileSync(path.join(root, scopeFile), 'utf8'));", "const scope = fs.readFileSync(path.join(root, scopeFile), 'utf8');"],
  ],
  'scripts/check-matchrim-menu-results-first96.mjs': [
    ["import { restoreMenuEntrySource96 } from './check-matchrim-native-menu-entry-bridge96.mjs';\n", ''],
    ["const source = restoreMenuEntrySource96(file, readFileSync(path.join(root, file), 'utf8')), current = initializers(source);", "const source = readFileSync(path.join(root, file), 'utf8'), current = initializers(source);"],
  ],
  'scripts/check-matchrim-scan-privacy96.mjs': [
    ["import { restoreMenuEntrySource96 } from './check-matchrim-native-menu-entry-bridge96.mjs';\n", ''],
    ["  source = restoreMenuEntrySource96(file, source);\n", ''],
    ["const source = restoreMenuEntrySource96(file, readFileSync(root + file, 'utf8')), groups = [];", "const source = readFileSync(root + file, 'utf8'), groups = [];"],
  ],
  'scripts/matchrim-menu-results-first96-scope.mjs': [
    ["import { restoreMenuEntryGuard96, restoreMenuEntryPackage96 } from './check-matchrim-native-menu-entry-bridge96.mjs';\n", ''],
    ["  value = restoreMenuEntryPackage96(value);\n", ''],
    ["  value = restoreMenuEntryGuard96(file, value);\n", ''],
  ],
};
export function restoreMenuEntryGuard96(file, value) {
  if (file === 'scripts/check-matchrim-scan-privacy96.mjs') value = restoreMenuEditorKeyboardGuard96(file, value);
  const replacements = changes[file];
  if (!replacements || !value.includes("from './check-matchrim-native-menu-entry-bridge96.mjs'")) return value;
  for (const [from, to] of replacements) value = once(value, from, to);
  assert.equal(value, prior(file), 'All prior26 assertions, counts, mutations and runtime-source guards exact: ' + file);
  return value;
}
export function runNativeMenuEntryBridge96() {
  const checks = [], test = (name, run) => { run(); checks.push(name); };
  for (const file of ['src/components/wine-import/WineMenuScanner.tsx', 'src/components/ScanPrivacyGate.tsx']) test('Exact new presentation/entry inverse: ' + file, () => {
    assert.equal(restoreMenuEntrySource96(file, fs.readFileSync(path.join(root, file), 'utf8')), prior(file));
  });
  for (const file of Object.keys(changes)) {
    const current = fs.readFileSync(path.join(root, file), 'utf8');
    test('Whole old26 guard inverse: ' + file, () => assert.equal(restoreMenuEntryGuard96(file, current), prior(file)));
    test('Reject arbitrary old guard assertion change: ' + file, () => assert.throws(() => restoreMenuEntryGuard96(file, current + '\n// unrelated guard edit\n')));
  }
  const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');
  test('Exact old command prefix and dependencies; append only three actual leaves', () => assert.equal(restoreMenuEntryPackage96(pkg), prior('package.json')));
  test('Reject old dependency/package change', () => assert.throws(() => restoreMenuEntryPackage96(pkg.replace('"private": true', '"private": false'))));
  test('Reject skipped leaf', () => assert.throws(() => restoreMenuEntryPackage96(pkg.replace(' && node scripts/check-matchrim-native-consent-entry96.mjs', ''))));
  test('No projection for unrelated paths', () => assert.equal(restoreMenuEntrySource96('src/pages/Index.tsx', 'unrelated'), 'unrelated'));
  return { passed: checks.length, failed: 0, checks, oldAssertionsRemoved: 0, oldCountsChanged: 0, whole26GuardInverses: Object.keys(changes).length,
    scope: 'Two separately executed actual-current leaves, exact historical projections, no browser/UIKit or recognition claim.' };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(runNativeMenuEntryBridge96()));
