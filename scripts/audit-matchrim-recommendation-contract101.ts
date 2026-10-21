import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { validateWinerimOriginalSensory } from '../src/utils/winerimOriginalSheet';
import { calculateLocalMatchrimAffinity } from '../src/utils/wineAffinityExplanation';

globalThis.fetch = async () => { throw new Error('OFFLINE_RESPONSE_REPLAY_ONLY'); };
const root = fs.realpathSync(process.argv[2]);
const output = path.join(root, 'RECOMMENDATION-CONTRACT.json');
assert(!fs.existsSync(output));
const raw = fs.readFileSync(path.join(root, 'global-recommendations-schema-r2.body.json'));
const receipt = JSON.parse(fs.readFileSync(path.join(root, 'global-recommendations-schema-r2.json'), 'utf8'));
assert.equal(receipt.status, 200);
assert.equal(createHash('sha256').update(raw).digest('hex'), receipt.bodySHA256);
const data = JSON.parse(raw.toString());
const source = fs.readFileSync('src/services/winerimApi.ts', 'utf8');
const ast = ts.createSourceFile('winerimApi.ts', source, ts.ScriptTarget.Latest, true);
let declaration: ts.VariableDeclaration | undefined;
const visit = (node: ts.Node) => {
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'extractWineResults') declaration = node;
  ts.forEachChild(node, visit);
};
visit(ast);
assert(declaration, 'Replay the real service extractor, not a replacement implementation');
const executable = ts.transpileModule(`const ${declaration.getText(ast)}; extractWineResults;`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;
type Row = { id: number; name: string; tastingAttributes: unknown };
const extract = vm.runInNewContext(executable, {}, { timeout: 1000 }) as (input: unknown) => Row[];
const rows = extract(data);
assert.equal(data.wines.home.length, 12);
assert.equal(data.wines.detail.length, 30);
assert.equal(rows.length, 30);
assert.deepEqual(Array.from(rows, wine => wine.id), data.wines.detail.map((wine: Row) => wine.id));
assert.equal(extract({ wines: { home: data.wines.home } }).length, 12);
assert.equal(extract({ wines: {} }).length, 0);
const profile = { potente: 5, acidez: 4, dulce: 3, tanico: 5, afrutado: 3 };
const evaluated = rows.map(wine => {
  const sensory = validateWinerimOriginalSensory(wine.tastingAttributes);
  const affinity = sensory ? calculateLocalMatchrimAffinity(profile, { ...sensory, scale: 'winerim-0-5' }) : null;
  return { id: wine.id, validSensory: Boolean(sensory), affinity };
});
const report = {
  observedUTC: new Date().toISOString(), responseSHA256: receipt.bodySHA256,
  extractorSHA256: createHash('sha256').update(declaration.getText(ast)).digest('hex'),
  scope: 'Observed global recommendation response replay, not image identity, original-fiche verification or human taste validation',
  extractorChecks: 6, detailRows: rows.length,
  compatibleUniverseReported: data.totals.compatibleUniverse,
  validSensoryRows: evaluated.filter(wine => wine.validSensory).length,
  finiteLocalAffinityRows: evaluated.filter(wine => typeof wine.affinity === 'number' && Number.isFinite(wine.affinity)).length,
  networkCalls: 0, paidCalls: 0, productionWrites: 0, evaluated,
};
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ ...report, evaluated: undefined }));
