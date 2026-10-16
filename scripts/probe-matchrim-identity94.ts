import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { lookupWinerimOriginalSheet, catalogWineFromVerifiedSheet } from '../src/utils/winerimOriginalSheet';
import { applyScanWineEvidence, applyMenuWineEvidence } from '../src/utils/scanWineEvidence';
import { normalizeWineCandidates } from '../src/utils/multiWineScan';
import { isMenuIdentityConfirmed, type MenuScanWine } from '../src/utils/wineMenuScan';

if (!process.argv.includes('--live')) { console.log('Use --live --output=<private-directory> for public GET-only catalog checks. No models/files/accounts.'); process.exit(0); }
const output = process.argv.find(arg => arg.startsWith('--output='))?.slice(9);
assert.ok(output?.startsWith('/'));
const cases = [
  { id: 'public-nv-control', name: 'Manzanilla La Gitana', producer: 'Bodegas Hidalgo La Gitana', vintage: null, region: 'Jerez-Xérès-Sherry', country: 'Spain', expected: 'verified' },
  { id: 'public-vintage-control', name: 'Whispering Angel Rosé', producer: "Château d'Esclans", vintage: 2024, expected: 'verified' },
  { id: 'missing-vintage-control', name: 'Whispering Angel Rosé', producer: "Château d'Esclans", vintage: null, expected: 'not-found' },
  { id: 'wrong-producer-control', name: 'Manzanilla La Gitana', producer: 'Bodega Ejemplo', vintage: null, expected: 'not-found' },
];
const reads: { case: string; url: string; status: number; elapsedMs: number; cors: string | null; body: unknown }[] = [];
const results = [];
for (const item of cases) {
  const start = performance.now();
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.origin, 'https://app.winerim.com'); assert.equal(init?.method, 'GET');
    assert.equal(init.credentials, 'omit'); assert.equal(init.body, undefined);
    assert.ok(reads.filter(row => row.case === item.id).length < 3);
    const requested = performance.now();
    const response = await fetch(input, { ...init, headers: { ...init.headers, Origin: 'capacitor://localhost' } });
    const body = await response.clone().json();
    reads.push({ case: item.id, url: url.href, status: response.status, elapsedMs: Math.round(performance.now() - requested),
      cors: response.headers.get('access-control-allow-origin'), body });
    return response;
  };
  const result = await lookupWinerimOriginalSheet(item, undefined, fetcher);
  assert.equal(result.status, item.expected);
  const catalog = result.status === 'verified' ? catalogWineFromVerifiedSheet(item, result.sheet) : null;
  const profile = { potente: 2, acidez: 4, dulce: 1, tanico: 0, afrutado: 1 };
  const candidate = normalizeWineCandidates({ candidates: [{ ...item, confidence: .78 }] }, item.id)[0];
  const label = applyScanWineEvidence(candidate, profile, catalog);
  const menu = applyMenuWineEvidence({ nombre: item.name, productor: item.producer, anada: item.vintage,
    region: item.region ?? null, pais: item.country ?? null, confidence: .78, dudas: ['Señal OCR media'],
    precio: null, tipo: '', descripcion: null } as MenuScanWine, profile, catalog);
  assert.equal(label.affinity, menu.compatibilidad);
  assert.equal(typeof label.affinity === 'number', result.status === 'verified');
  results.push({ input: item, elapsedMs: Math.round(performance.now() - start), status: result.status,
    sheet: result.status === 'verified' ? result.sheet : null, labelAffinity: label.affinity,
    menuAffinity: menu.compatibilidad, menuIdentityConfirmed: isMenuIdentityConfirmed(menu), sourceSignal: menu.confidence });
}
const report = { observedAt: new Date().toISOString(), results, reads, filesSent: 0, mutations: 0, paidModelCalls: 0,
  scope: 'Four explicit catalog identity controls, two real original details and one synthetic taste profile. Not fresh OCR/photo identity precision, human preference accuracy or global catalog coverage.' };
fs.mkdirSync(output!, { recursive: true });
fs.writeFileSync(path.join(output!, 'live-catalog94.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ output, reads: reads.length, results: results.map(({ input, sheet, ...rest }) => ({ ...rest, id: input.id, catalogId: sheet?.id })) }, null, 2));
