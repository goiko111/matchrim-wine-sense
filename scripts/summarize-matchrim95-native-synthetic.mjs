import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const [resultPath, attachmentDirectory, manifestPath, outputPath, countValue] = process.argv.slice(2);
const count = Number(countValue);
if (![5, 50].includes(count) || ![resultPath, attachmentDirectory, manifestPath, outputPath].every(value => value && path.isAbsolute(value))
  || fs.existsSync(outputPath)) throw new Error('Provide absolute xcresult, exported attachments, frozen manifest, new JSON output, and count5/50');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const manifestBytes = fs.readFileSync(manifestPath);
const manifest = JSON.parse(manifestBytes);
assert.equal(manifest.bundle, 'wine.matchrim.qa95synthetic');
assert.equal(manifest.origin, 'http://127.0.0.1:4605');
const summary = JSON.parse(execFileSync('/usr/bin/xcrun', ['xcresulttool', 'get', 'test-results', 'summary', '--path', resultPath,
  '--format', 'json'], { encoding: 'utf8' }));
assert.equal(summary.result, 'Passed'); assert.equal(summary.failedTests, 0); assert.equal(summary.totalTestCount, 1);
const exportBytes = fs.readFileSync(path.join(attachmentDirectory, 'manifest.json'));
const exports = JSON.parse(exportBytes);
const attachments = exports.flatMap(item => item.attachments);
const receipts = attachments.filter(item => /^persona-\d+-complete-synthetic-receipt/.test(item.suggestedHumanReadableName));
const indices = count === 5 ? [0, 31, 32, 40, 49] : Array.from({ length: 50 }, (_, index) => index);
assert.equal(receipts.length, indices.length);
const rows = receipts.map(item => {
  const bytes = fs.readFileSync(path.join(attachmentDirectory, item.exportedFileName));
  const receipt = JSON.parse(bytes);
  assert.equal(item.deviceId, 'B18822EF-BFBD-4A6A-89B2-33539BDE4127');
  assert.equal(receipt.bootCount, 2); assert.equal(receipt.actualQuizCount, 1);
  assert.equal(receipt.quizReceiptMatches, true); assert.deepEqual(receipt.quizResults, [receipt.expectedQuiz]);
  assert.equal(receipt.secondaryQuizCount, 0); assert.equal(receipt.currentOwner, null);
  assert.equal(receipt.externalForwardCount, 0);
  for (const key of ['blocked', 'safetyErrors', 'unmodeled']) assert.deepEqual(receipt[key], []);
  assert.deepEqual(receipt.storage, { authPresent: false, quizAnswersPresent: false, quizResultPresent: false, scanHistoryPresent: false });
  const counts = { quizInserts: 0, logouts: 0, loginAttempts: 0, controlledCellarFailures: 0, controlledLoginFailures: 0 };
  for (const request of receipt.requests) {
    if (request.path === '/rest/v1/quiz_results' && request.method === 'POST') counts.quizInserts++;
    if (request.path === '/auth/v1/logout' && request.method === 'POST') counts.logouts++;
    if (request.path === '/auth/v1/token' && request.method === 'POST') counts.loginAttempts++;
    if (request.path === '/rest/v1/user_wines' && request.status === 503) counts.controlledCellarFailures++;
    if (request.path === '/auth/v1/token' && request.status === 400) counts.controlledLoginFailures++;
    if (request.counts) assert.equal(request.counts.matches, true);
  }
  assert.deepEqual(counts, { quizInserts: 1, logouts: 2, loginAttempts: 2, controlledCellarFailures: 1, controlledLoginFailures: 1 });
  return { persona: receipt.persona, quizVector: receipt.quizResults[0], counts, bootCount: 2, receiptSha256: sha(bytes),
    screenshot: attachments.find(attachment => attachment.suggestedHumanReadableName.startsWith(`persona-${receipt.persona}-complete_`))?.exportedFileName,
    exportedReceipt: item.exportedFileName };
}).sort((left, right) => left.persona - right.persona);
assert.deepEqual(rows.map(row => row.persona), indices);
const report = { passed: true, resultPath, oneXCTestBody: true, completedNativePersonas: count, secondaryOwnerChecks: count,
  actualNativeAnswerClicks: 20 * count, rows, manifestSha256: sha(manifestBytes), profilesSha256: manifest.profilesSha256,
  exportManifestSha256: sha(exportBytes), frozenAssetDirectory: manifest.buildPath,
  durationSeconds: summary.finishTime - summary.startTime, realUsers: 0, realAuthCalls: 0, hostedRecognitionCalls: 0,
  scope: 'Actual native WebKit UI plus loopback synthetic transport. Not predictive taste accuracy, real accounts, provider recognition, RLS, physical-phone or release-bundle approval.' };
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ passed: report.passed, completedNativePersonas: count, actualNativeAnswerClicks: report.actualNativeAnswerClicks, outputPath }));
