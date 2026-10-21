import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { safeWineImageUrl98 } from '../src/utils/wineImage98';
import { confirmsWineMutation } from '../src/utils/matchrimWineMutation';

const source = ts.createSourceFile('MyWines.tsx', readFileSync('src/pages/MyWines.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let body = '';
const visit = (node: ts.Node) => {
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'resolveCellarWine') body = node.initializer!.getText(source);
  ts.forEachChild(node, visit);
};
visit(source); assert(body);
const code = ts.transpileModule(`globalThis.run = ${body};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const photo = 'https://images.example.test/verified-detail.png';
type Options = { native?: boolean; existing?: string; photo?: string | null; mismatch?: boolean; current?: boolean; sensory?: boolean };
async function exercise(options: Options = {}) {
  const native = options.native !== false;
  const attributes = options.sensory === false ? null : { power: 0, acidity: 3.2, sweetness: 0, tannin: 1, fruity: 4 };
  const wine = { id: 'qa-wine', name: 'Luna Reserva', producer: 'Bodega Ejemplo', vintage: 2021,
    image_url: options.existing || null, rating: null, use_for_profile_training: false };
  const events: { update?: Record<string, unknown>; select?: string; merge: boolean; error: boolean; finished: boolean } = { merge: false, error: false, finished: false };
  const query = { eq() { return query; }, select(value: string) { events.select = value; return query; },
    async single() { return { error: null, data: { id: wine.id, ...events.update,
      ...(options.mismatch ? { image_url: 'https://images.example.test/wrong.png' } : {}) } }; } };
  const context = vm.createContext({
    AbortController, isNative: native, Capacitor: { isNativePlatform: () => native },
    beginWineAction: () => ({ ownerId: 'qa-owner', isCurrent: () => options.current !== false, finish() { events.finished = true; } }),
    findWinerimWineForLabel: async () => ({ wine: { id: 'canonical-123', photo: options.photo === undefined ? photo : options.photo, tastingAttributes: attributes } }),
    findOriginalWinerimWineForLabel: async () => null,
    applyScanWineEvidence: () => ({ sensorySource: attributes ? 'catalog' : null, sensoryAttributes: attributes }),
    normalizeSensoryAttributesTo5: (value: unknown) => value,
    makeCellarCatalogEvidence: () => ({ id: 'verified-sensory' }),
    loadMatchrimScanProfile: async () => ({ profile: { potente: 3 } }),
    withCellarInitialAffinity: () => ({ fixtureInitial: 71 }),
    cellarAffinityView: () => ({ current: 71 }), safeWineImageUrl98, confirmsWineMutation,
    readCellarSensoryEvidence: () => true,
    readCellarInitialAffinity: (value: { place_details: unknown }) => value.place_details,
    normalizeUserWine: (value: unknown) => value,
    supabase: { from(table: string) { assert.equal(table, 'user_wines'); return { update(value: Record<string, unknown>) { events.update = value; return query; } }; } },
    setCellarProfile() {}, setWines(updater: (rows: unknown[]) => unknown[]) { events.merge = true; updater([wine]); },
    toast: { info() {}, success() {}, error() { events.error = true; } }, console: { error() {} },
  });
  vm.runInContext(code, context);
  await context.run(wine);
  assert(events.finished, 'Action lifetime always finishes');
  return events;
}
let checks = 0;
async function check(name: string, run: () => Promise<void>) { await run(); checks++; console.log('PASS', name); }
await check('Actual native closure fills a missing photo and demands exact photo readback', async () => {
  const result = await exercise(); assert.equal(result.update?.image_url, photo);
  assert(result.select?.includes('image_url')); assert(result.merge); assert(!result.error);
});
await check('Existing owner photo is never replaced by catalogue enrichment', async () => {
  const result = await exercise({ existing: 'https://images.example.test/owned.jpg' });
  assert.equal(Object.hasOwn(result.update!, 'image_url'), false); assert(result.merge);
});
await check('Web mutation payload and readback do not acquire a photo field', async () => {
  const result = await exercise({ native: false }); assert.equal(Object.hasOwn(result.update!, 'image_url'), false);
  assert(!result.select?.includes('image_url')); assert(result.merge);
});
await check('Missing or unsafe catalogue photo never gets persisted', async () => {
  for (const value of [null, '', 'javascript:alert(1)', 'data:image/png;base64,AA==']) {
    const result = await exercise({ photo: value }); assert.equal(Object.hasOwn(result.update!, 'image_url'), false); assert(result.merge);
  }
});
await check('A mismatching persistence readback cannot update the local wine', async () => {
  const result = await exercise({ mismatch: true }); assert(result.error); assert(!result.merge);
});
await check('A stale owner or absent verified sensory data sends no write', async () => {
  for (const options of [{ current: false }, { sensory: false }]) {
    const result = await exercise(options); assert.equal(result.update, undefined); assert(!result.merge);
  }
});
console.log(JSON.stringify({ checks, passed: checks, scope: 'Actual MyWines enrichment closure with controlled existing identity/sensory bindings and actual scalar mutation confirmation. Offline; not hosted persistence or recognition.' }));
