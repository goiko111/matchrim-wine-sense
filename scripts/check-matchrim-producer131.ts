// 131: when only the producer is read, the first screen shows six of that producer's wines, never more than six,
// and any mix of producers keeps three. Run: npx tsx scripts/check-matchrim-producer131.ts
import assert from 'node:assert/strict';
import { candidateDecision286, rankCandidates286 } from '../src/utils/candidateRecognition286';

const row = (id: number, name: string, winery: string) => ({ id, name, winery, slugname: `w-${id}`, vintage: null, subname: null,
  type: 'espumoso', region: 'Cava', country: 'ES', photo: null }) as any;
const mestres = ['Visol Gran Reserva Brut Nature', 'Coquet Brut Nature', 'Elena de Mestres', 'Rosat de Mestres', 'Clos Damiana', 'Mas Vía', 'Cupatge 80 Aniversari', 'Clos Nostre Senyor']
  .map((name, index) => row(index + 1, `Mestres ${name}`, 'Mestres'));
const only = candidateDecision286(rankCandidates286(['Mestres', 'Mestres'], mestres));
assert.equal(only.mode, 'choose'); if (only.mode !== 'choose') throw 0;
assert.equal(only.shown.length, 6); assert.equal(only.more.length, 2);
const mixed = [...mestres.slice(0, 2), row(20, 'Gramona Imperial', 'Gramona'), row(21, 'Recaredo Terrers', 'Recaredo'), row(22, 'Mestres Mas Vía', 'Mestres')];
const mix = candidateDecision286(rankCandidates286(['Brut Nature Gran Reserva', 'Cava', 'Imperial', 'Terrers'], mixed));
if (mix.mode === 'choose') assert(mix.shown.length === 3 || new Set(mix.shown.slice(0, 3).map(c => c.row.winery)).size === 1);
const three = candidateDecision286(rankCandidates286(['Mestres'], mestres.slice(0, 3)));
if (three.mode === 'choose') assert.equal(three.shown.length, 3);
console.log('producer131: 3/3 PASS');
