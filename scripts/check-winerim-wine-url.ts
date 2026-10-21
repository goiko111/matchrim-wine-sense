import assert from 'node:assert/strict';
import { buildWinerimWineFichaUrl, generateWinerimSlug } from '../src/utils/winerimWineUrl';

assert.equal(
  buildWinerimWineFichaUrl({ id: 139866, name: '33° Cosecha Tardía', slugname: '33-Cosecha-Tardia' }),
  'https://web.winerim.com/matchrim/store/139866/33-Cosecha-Tardia',
);
assert.equal(
  buildWinerimWineFichaUrl({ id: '97061', name: 'x', slugname: 'Luigi-Einaudi-Barolo-Chinato' }, 'https://web.winerim.com/'),
  'https://web.winerim.com/matchrim/store/97061/Luigi-Einaudi-Barolo-Chinato',
);
// Without slugname the slug is generated like the backend does (accents out, Title-Case, _vintage).
assert.equal(generateWinerimSlug('33° Cosecha Tardía'), '33-Cosecha-Tardia');
assert.equal(generateWinerimSlug('La Guiraude', 2019), 'La-Guiraude_2019');
assert.equal(
  buildWinerimWineFichaUrl({ id: 5, name: 'La Guiraude', vintage: 2019 }, 'https://example.test'),
  'https://example.test/matchrim/store/5/La-Guiraude_2019',
);
console.log('Winerim wine url checks passed');
