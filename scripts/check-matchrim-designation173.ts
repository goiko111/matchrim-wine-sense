import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { hasMissingVisibleQualifier102 } from '../src/utils/nativeWineQualifier102';
import { rankGlobalProposals104 } from '../src/utils/globalWineProposals104';

let groups = 0;
const test = (name: string, body: () => void) => { body(); groups++; console.log('PASS', name); };
test('Standalone observed Valpolicella designations cannot become a generic same-producer reference', () => {
  for (const evidence of [['AMARONE'], ['RECIOTO'], ['RIPASSO'], ['AMARONE DELLA VALPOLICELLA DOCG'], ['VALPOLICELLA RIPASSO DOC']]) {
    assert(hasMissingVisibleQualifier102({ name: 'Atlas Valpolicella', evidence }));
    assert(hasMissingVisibleQualifier102({ name: 'Atlas Rosso', evidence }));
  }
});
test('The corresponding literal designation is kept without inventing missing qualifiers or a vintage', () => {
  for (const name of ['Amarone della Valpolicella', 'Recioto della Valpolicella', 'Valpolicella Ripasso'])
    assert(!hasMissingVisibleQualifier102({ name: 'Atlas ' + name, evidence: [name.toUpperCase()] }));
  assert(hasMissingVisibleQualifier102({ name: 'Atlas Valpolicella Ripasso', evidence: ['AMARONE'] }));
  assert(hasMissingVisibleQualifier102({ name: 'Atlas Amarone', evidence: ['RECIOTO'] }));
  assert(hasMissingVisibleQualifier102({ name: 'Atlas Amarone', evidence: ['AMARONE CLASSICO RISERVA'] }));
  assert(!hasMissingVisibleQualifier102({ name: 'Atlas Amarone Classico Riserva', evidence: ['AMARONE CLASSICO RISERVA DOCG'] }));
  assert(!hasMissingVisibleQualifier102({ name: 'Atlas Amarone Valpolicella', evidence: ['AMARONE DELLA VALPOLICELLA'] }));
});
test('Brand names, prose, partial spellings and substrings are not standalone designation evidence', () => {
  for (const text of ['Amarone Cellars', 'Ripasso House', 'Named after the Amarone tradition', 'AMARON', 'AMARONE / RIPASSO'])
    assert(!hasMissingVisibleQualifier102({ name: 'Atlas Valpolicella', evidence: [text] }));
  assert(hasMissingVisibleQualifier102({ name: 'Atlas Gramarone', evidence: ['AMARONE'] }));
});
test('Existing standalone cru and quoted-climat protection remains unchanged', () => {
  assert(hasMissingVisibleQualifier102({ name: 'Atlas Chablis', evidence: ['Grand Cru'] }));
  assert(!hasMissingVisibleQualifier102({ name: 'Atlas Chablis Grand Cru', evidence: ['Grand Cru'] }));
  assert(hasMissingVisibleQualifier102({ name: 'Atlas Premier Cru', evidence: ['Premier Cru "Les Etoiles"'] }));
});
test('The actual retained060 OCR cannot propose its broad Valpolicella neighbor', () => {
  const report = JSON.parse(fs.readFileSync('qa-artifacts/night105-20261021/native112-corpus200-r13/REPORT.json', 'utf8'));
  assert(report.summary.sourceIntegrityVerified);
  const scene = report.rows.find((value: { imageId: string }) => value.imageId === 'img-060');
  const evidence = scene.reading.lines.map((line: { text: string }) => line.text);
  assert(evidence.includes('AMARONE'));
  const folder = 'qa-artifacts/night105-20261021/public-browse172-r1';
  const receipts = JSON.parse(fs.readFileSync(folder + '/REQUESTS.json', 'utf8'));
  let neighbor;
  for (const receipt of receipts) if (new URL(receipt.url).searchParams.get('text') === 'BERTANI' && receipt.status === 200) {
    assert(/^response-\d{3}\.json$/.test(receipt.body));
    const bytes = fs.readFileSync(folder + '/' + receipt.body);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), receipt.sha256);
    const found = JSON.parse(bytes.toString()).results.find((row: { id: number }) => row.id === 236950);
    if (found) neighbor = found;
  }
  assert(neighbor, 'Preserve the original false-positive receipt');
  assert.equal(neighbor.name, 'Bertani Valpolicella');
  assert.deepEqual(rankGlobalProposals104(evidence, [neighbor], scene.candidateVintage), []);
});
console.log(JSON.stringify({ groups, passed: true, realGET: 0, modelStarts: 0,
  scope: 'Observed designation guard and retained false-positive regression; not identity recovery or sensory calibration' }));
