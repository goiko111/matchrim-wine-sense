import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  buildCanonicalWineIdentity,
  isSameWineIdentity,
  selectUnseenWineRecommendations,
} from '../src/utils/matchrimRecommendations';

const canonical = buildCanonicalWineIdentity({
  name: '  Viña Tondonia Reserva ',
  producer: 'R. López de Heredia',
  vintage: 2012,
});
assert.equal(canonical, 'vinatondoniareserva|rlopezdeheredia|2012');
assert.equal(canonical, buildCanonicalWineIdentity({
  name: 'VINA-TONDONIA, RESERVA',
  winery: 'R LOPEZ DE HEREDIA',
  vintage: '2012',
}));

assert.equal(isSameWineIdentity(
  { name: 'Viña Tondonia Reserva', producer: null, vintage: 2012 },
  { name: 'Vina Tondonia Reserva', producer: 'R. López de Heredia', vintage: 2012 },
), true, 'The client can reconcile an OCR row whose producer is initially unknown');

assert.equal(isSameWineIdentity(
  { name: 'Viña Tondonia Reserva', producer: 'R. López de Heredia', vintage: 2012 },
  { name: 'Viña Tondonia Reserva', producer: 'R. López de Heredia', vintage: 2011 },
), false, 'Different vintages remain distinct cellar references');

const selection = selectUnseenWineRecommendations([
  { id: 'ocr', name: 'Viña Tondonia Reserva', vintage: 2012 },
  { id: 'canonical', name: 'Vina Tondonia Reserva', producer: 'R Lopez de Heredia', vintage: 2012 },
  { id: 'other-vintage', name: 'Vina Tondonia Reserva', producer: 'R Lopez de Heredia', vintage: 2011 },
], []);
assert.deepEqual(selection.recommendations.map((wine) => wine.id), ['ocr', 'other-vintage']);

const migration = readFileSync(
  'supabase/migrations/20260929040430_matchrim_user_wines_canonical_identity.sql',
  'utf8',
);
assert.match(migration, /GENERATED ALWAYS AS/);
assert.match(migration, /canonical duplicates; migration stopped without merging user data/);
assert.match(migration, /CREATE UNIQUE INDEX user_wines_user_canonical_identity_uidx/);

console.log(JSON.stringify({
  canonical,
  exactDuplicateGuard: true,
  unknownProducerClientReconciliation: true,
  differentVintageRemainsDistinct: true,
  migrationApplied: false,
  requiredNextEnvironment: 'isolated staging with duplicate preflight',
}, null, 2));
