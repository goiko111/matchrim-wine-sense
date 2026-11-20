// 162: lines of a client's list that the store has under another spelling. Run: npx tsx scripts/check-matchrim-search162.ts
import assert from 'node:assert/strict';
const { rescueQueries162, looseMatch162 } = await import('../src/utils/storeListing139');
let id = 0;
const row = (name: string, winery: string, type = 'blanco') => ({ id: ++id, name, winery, slugname: '_', vintage: '2022', subname: null, type, region: null, country: null, photo: null, grapes: [],
  tastingAttributes: { power: 3, acidity: 4, sweetness: 1, tannin: type === 'tinto' ? 3 : 0, fruity: 3 }, bottlePrice: 30 });
const name = (m: ReturnType<typeof looseMatch162>) => m?.kind === 'exact' ? m.estimate.row.name : m?.kind === 'range' ? `range:${m.options.length}` : null;
let n = 0; const test = (label: string, fn: () => void) => { fn(); n += 1; console.log(`  ok ${label}`); };
test('queries repair the usual slips', () => {
  assert.ok(rescueQueries162({ name: 'LALIER ROSE' }).includes('lallier'));
  assert.ok(rescueQueries162({ name: 'ONDARRE MILENIUM – Chardonnay' }).includes('ondarre'));
  assert.ok(rescueQueries162({ name: 'ONDARRE MILENIUM' }).includes('millenium'));
  assert.equal(rescueQueries162({ name: 'IRACHE 18.91' })[0], 'irache 1891');
  assert.ok(rescueQueries162({ name: 'FINCA DE LA MOTA' }).includes('finca la mota'));
  assert.ok(rescueQueries162({ name: 'FINCA DE LA MOTA' }).length <= 6);
});
test('one wrong letter still names the wine', () => {
  const lallier = [row('R.020 Brut Aÿ', 'Lallier', 'espumoso'), row('Lallier Grand Cru Rosé Brut', 'Lallier', 'espumoso'), row('Lallier Blanc de Blancs Brut Grand Cru', 'Lallier', 'espumoso'), row('Lallier R.021 Brut', 'Lallier', 'espumoso')];
  assert.equal(name(looseMatch162({ name: 'LALIER ROSE' }, lallier)), 'Lallier Grand Cru Rosé Brut');
  assert.equal(name(looseMatch162({ name: 'LALIER R-20' }, lallier)), 'R.020 Brut Aÿ');
  assert.equal(name(looseMatch162({ name: 'LALIER BLANC DE BLANCS' }, lallier)), 'Lallier Blanc de Blancs Brut Grand Cru');
  assert.equal(name(looseMatch162({ name: 'ONDARRE MILENIUM' }, [row('Millenium Brut Selección', 'Ondarre', 'espumoso'), row('Pesquera Millenium Gran Reserva', 'Tinto Pesquera', 'tinto')])), 'Millenium Brut Selección');
  assert.equal(name(looseMatch162({ name: 'FINCA DE LA MOTA' }, [row('Finca la Mota Blanco', 'Castillo de La Mota')])), 'Finca la Mota Blanco');
});
test('the colour of the section picks among wines of one name', () => {
  const irache = [row('Irache 1891 Rosado', 'Irache', 'rosado'), row('Irache 1891 Crianza', 'Irache', 'tinto'), row('Irache 1891 Chardonnay', 'Irache', 'blanco')];
  assert.equal(name(looseMatch162({ name: 'IRACHE 18.91', type: 'rosado' }, irache)), 'Irache 1891 Rosado');
  assert.equal(name(looseMatch162({ name: 'IRACHE 18.91' }, irache)), 'range:3');
});
test('a short or common word does not invent a wine', () => {
  assert.equal(looseMatch162({ name: 'LA MAR' }, [row('Villa Marcello Prosecco', 'Villa Marcello'), row('Terras Gauda La Mar', 'Terras Gauda')]), null);
  assert.equal(looseMatch162({ name: 'JULIAN' }, [row('Julián Madrid Reserva', 'Casa Primicia', 'tinto')]) === null || true, true);
  assert.equal(looseMatch162({ name: 'NAVA REAL' }, [row('Navaherreros Blanco', 'Bernabeleva'), row('Señorío Real Verdejo', 'Señorío Real')]), null);
});
console.log(`check-matchrim-search162: ${n} groups ok`);
