import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const ALLOWED_PROJECT_REF = 'qpbmqvfnunkylvtvnyyx';
const projectRef = process.env.MATCHRIM_QA_PROJECT_REF || '';
const supabaseUrl = (process.env.MATCHRIM_QA_SUPABASE_URL || '').replace(/\/$/, '');
const serviceRoleKey = process.env.MATCHRIM_QA_SERVICE_ROLE_KEY || '';
const accountPassword = process.env.MATCHRIM_QA_ACCOUNT_PASSWORD || '';
const cohortId = process.env.MATCHRIM_QA_COHORT_ID || 'matchrim-pilot-2026-10-05';
const accountCount = Number(process.env.MATCHRIM_QA_ACCOUNT_COUNT || '10');
const winesPerAccount = Number(process.env.MATCHRIM_QA_WINES_PER_ACCOUNT || '60');
const outputPath = resolve(process.env.MATCHRIM_QA_OUTPUT || 'qa-artifacts/matchrim-qa-cohort/summary.json');

if (projectRef !== ALLOWED_PROJECT_REF || !supabaseUrl.includes(projectRef)) {
  throw new Error(`Refusing QA seed outside isolated staging ${ALLOWED_PROJECT_REF}`);
}
if (!serviceRoleKey || !accountPassword) {
  throw new Error('MATCHRIM_QA_SERVICE_ROLE_KEY and MATCHRIM_QA_ACCOUNT_PASSWORD are required');
}
if (!Number.isInteger(accountCount) || accountCount < 1 || accountCount > 100) {
  throw new Error('MATCHRIM_QA_ACCOUNT_COUNT must be an integer between 1 and 100');
}
if (!Number.isInteger(winesPerAccount) || winesPerAccount < 1 || winesPerAccount > 80) {
  throw new Error('MATCHRIM_QA_WINES_PER_ACCOUNT must be an integer between 1 and 80');
}

type Axes = { potente: number; acidez: number; dulce: number; tanico: number; afrutado: number };
type Segment = {
  id: string;
  profile: Axes;
  wineTypes: string[];
  tastes: string[];
  priceRange: string;
  pairings: string[];
  restrictions: string[];
};

const segments: Segment[] = [
  { id: 'principiante-frutal', profile: { potente: 2, acidez: 3, dulce: 2, tanico: 1, afrutado: 5 }, wineTypes: ['tinto', 'blanco'], tastes: ['fruta', 'suave'], priceRange: '10-20', pairings: ['tapas', 'pasta'], restrictions: [] },
  { id: 'clasico-estructurado', profile: { potente: 5, acidez: 3, dulce: 1, tanico: 5, afrutado: 3 }, wineTypes: ['tinto'], tastes: ['crianza', 'estructura'], priceRange: '20-40', pairings: ['carne', 'guiso'], restrictions: [] },
  { id: 'atlantico-fresco', profile: { potente: 2, acidez: 5, dulce: 1, tanico: 1, afrutado: 4 }, wineTypes: ['blanco'], tastes: ['fresco', 'mineral'], priceRange: '15-30', pairings: ['marisco', 'pescado'], restrictions: [] },
  { id: 'dulce-aromatico', profile: { potente: 2, acidez: 3, dulce: 5, tanico: 1, afrutado: 5 }, wineTypes: ['dulce', 'blanco'], tastes: ['aromatico', 'dulce'], priceRange: '10-25', pairings: ['postre', 'queso'], restrictions: [] },
  { id: 'explorador', profile: { potente: 4, acidez: 4, dulce: 1, tanico: 3, afrutado: 4 }, wineTypes: ['tinto', 'blanco', 'espumoso'], tastes: ['aventura', 'region'], priceRange: '15-45', pairings: ['menu degustacion'], restrictions: [] },
  { id: 'precio-consciente', profile: { potente: 3, acidez: 3, dulce: 2, tanico: 2, afrutado: 4 }, wineTypes: ['tinto', 'blanco'], tastes: ['valor', 'versatil'], priceRange: '8-15', pairings: ['diario'], restrictions: [] },
  { id: 'coleccionista', profile: { potente: 5, acidez: 4, dulce: 1, tanico: 5, afrutado: 2 }, wineTypes: ['tinto'], tastes: ['guarda', 'anada'], priceRange: '35-80', pairings: ['carne', 'queso curado'], restrictions: [] },
  { id: 'sumiller-servicio', profile: { potente: 4, acidez: 4, dulce: 1, tanico: 4, afrutado: 3 }, wineTypes: ['tinto', 'blanco', 'espumoso', 'generoso'], tastes: ['precision', 'servicio'], priceRange: '15-60', pairings: ['maridaje', 'copa'], restrictions: [] },
  { id: 'baja-vision', profile: { potente: 3, acidez: 2, dulce: 2, tanico: 2, afrutado: 4 }, wineTypes: ['tinto', 'blanco'], tastes: ['claro', 'familiar'], priceRange: '12-25', pairings: ['tapas'], restrictions: [] },
  { id: 'restriccion-alimentaria', profile: { potente: 2, acidez: 4, dulce: 1, tanico: 2, afrutado: 4 }, wineTypes: ['blanco', 'espumoso'], tastes: ['fresco', 'ligero'], priceRange: '12-30', pairings: ['vegetal', 'picante'], restrictions: ['vegano'] },
];

const wineCatalog = [
  ['QA Atlantico', 'Bodega QA Norte', 'Rias Baixas', 'Espana', ['Albarino'], 2, 5, 1, 1, 4, 18],
  ['QA Godello', 'Bodega QA Sil', 'Valdeorras', 'Espana', ['Godello'], 3, 4, 1, 1, 4, 23],
  ['QA Rioja Reserva', 'Bodega QA Clasica', 'Rioja', 'Espana', ['Tempranillo'], 5, 3, 1, 5, 3, 31],
  ['QA Mencia', 'Bodega QA Bierzo', 'Bierzo', 'Espana', ['Mencia'], 3, 4, 1, 2, 4, 17],
  ['QA Garnacha', 'Bodega QA Campo', 'Campo de Borja', 'Espana', ['Garnacha'], 4, 3, 2, 3, 5, 14],
  ['QA Moscatel', 'Bodega QA Sol', 'Malaga', 'Espana', ['Moscatel'], 2, 3, 5, 1, 5, 16],
  ['QA Nebbiolo', 'Bodega QA Langhe', 'Barolo', 'Italia', ['Nebbiolo'], 5, 5, 1, 5, 2, 49],
  ['QA Pinot Noir', 'Bodega QA Cote', 'Borgona', 'Francia', ['Pinot Noir'], 3, 4, 1, 2, 4, 38],
  ['QA Riesling Seco', 'Bodega QA Mosel', 'Mosel', 'Alemania', ['Riesling'], 2, 5, 2, 1, 5, 21],
  ['QA Chardonnay', 'Bodega QA Calma', 'Penedes', 'Espana', ['Chardonnay'], 3, 3, 2, 1, 4, 19],
  ['QA Cava Brut', 'Bodega QA Burbujas', 'Cava', 'Espana', ['Xarel-lo', 'Macabeo'], 2, 4, 1, 1, 4, 15],
  ['QA Amontillado', 'Bodega QA Marco', 'Jerez', 'Espana', ['Palomino'], 5, 4, 1, 2, 2, 28],
] as const;

const headers = {
  apikey: serviceRoleKey,
  authorization: `Bearer ${serviceRoleKey}`,
  'content-type': 'application/json',
};

const request = async (path: string, init: RequestInit = {}) => {
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers || {}) },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${init.method || 'GET'} ${path}: ${response.status} ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : null;
};

const rest = async (table: string, method: string, body?: unknown, query = '') => request(
  `/rest/v1/${table}${query}`,
  {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      'Content-Profile': 'matchrim_qa',
      'Accept-Profile': 'matchrim_qa',
      Prefer: method === 'POST' ? 'resolution=merge-duplicates,return=minimal' : 'return=minimal',
    },
  },
);

const listQaUsers = async () => {
  const payload = await request('/auth/v1/admin/users?page=1&per_page=1000');
  return Array.isArray(payload?.users) ? payload.users : [];
};

const createUser = (index: number, segment: Segment) => request('/auth/v1/admin/users', {
  method: 'POST',
  body: JSON.stringify({
    email: `matchrim.qa.${cohortId}.${String(index + 1).padStart(3, '0')}@example.invalid`,
    password: accountPassword,
    email_confirm: true,
    user_metadata: { qa_cohort: cohortId, qa_segment: segment.id, synthetic: true },
    app_metadata: { qa_cohort: cohortId },
  }),
});

const dateFor = (accountIndex: number, itemIndex: number) => {
  const start = Date.UTC(2025, 9, 5);
  return new Date(start + (itemIndex * 6 + accountIndex % 6) * 86_400_000).toISOString();
};

const distanceScore = (profile: Axes, wine: typeof wineCatalog[number]) => {
  const values = [wine[5], wine[6], wine[7], wine[8], wine[9]];
  const targets = [profile.potente, profile.acidez, profile.dulce, profile.tanico, profile.afrutado];
  const distance = values.reduce((sum, value, index) => sum + Math.abs(value - targets[index]), 0) / 5;
  return Math.max(35, Math.min(96, Math.round(96 - distance * 14)));
};

const buildWineRows = (userId: string, segment: Segment, accountIndex: number) => Array.from(
  { length: winesPerAccount },
  (_, itemIndex) => {
    const wine = wineCatalog[(itemIndex * 5 + accountIndex * 3) % wineCatalog.length];
    const affinity = distanceScore(segment.profile, wine);
    const status = itemIndex % 10 === 0 ? 'wishlist' : itemIndex % 9 === 0 ? 'cellar' : 'tasted';
    const rating = status !== 'tasted' ? null : affinity >= 80 ? 'love' : affinity >= 62 ? 'ok' : 'not_for_me';
    const createdAt = dateFor(accountIndex, itemIndex);
    return {
      user_id: userId,
      name: `${wine[0]} ${2020 + (itemIndex % 5)}`,
      producer: wine[1],
      region: wine[2],
      country: wine[3],
      grape_varieties: wine[4],
      vintage: 2020 + (itemIndex % 5),
      rating,
      sensory_attributes: {
        potencia: wine[5], acidez: wine[6], dulzura: wine[7], taninos: wine[8], afrutado: wine[9],
      },
      use_for_profile_training: Boolean(rating),
      matchrim_affinity: affinity,
      place_details: { qa_cohort: cohortId, synthetic: true, upload_kind: ['label', 'multi', 'menu', 'board'][itemIndex % 4] },
      status,
      price: wine[10] + (itemIndex % 4),
      quantity: status === 'cellar' ? 1 + (itemIndex % 3) : 1,
      is_favorite: rating === 'love' && itemIndex % 3 === 0,
      personal_note: `Synthetic ${segment.id} observation ${itemIndex + 1}`,
      tasting_notes: rating ? `QA evidence for ${rating}` : null,
      consumption_date: status === 'tasted' ? createdAt.slice(0, 10) : null,
      consumption_place_type: itemIndex % 3 === 0 ? 'restaurant' : 'home',
      consumption_place: itemIndex % 3 === 0 ? `QA Restaurant ${accountIndex % 5}` : 'QA Home',
      created_at: createdAt,
      updated_at: createdAt,
    };
  },
);

const seedAccount = async (user: any, index: number, segment: Segment) => {
  const userId = user.id as string;
  const email = user.email as string;
  const profile = segment.profile;
  const ownedTables = ['app_events', 'restaurant_matchrim_sessions', 'dietary_preferences', 'wine_preferences', 'user_wines', 'quiz_results'];
  for (const table of ownedTables) await rest(table, 'DELETE', undefined, `?user_id=eq.${userId}`);
  await rest('profiles', 'POST', [{
    id: userId,
    email,
    first_name: `QA${String(index + 1).padStart(3, '0')}`,
    last_name: segment.id,
    name: `QA ${segment.id} ${index + 1}`,
    birth_date: '1985-01-01',
    location: 'QA isolated staging',
    preferred_language: index % 10 === 9 ? 'en' : 'es',
    privacy_accepted: true,
    terms_accepted: true,
  }]);
  await rest('quiz_results', 'POST', [{ user_id: userId, ...profile, profile_description: `Synthetic ${segment.id}` }]);
  await rest('wine_preferences', 'POST', [{
    user_id: userId,
    wine_types: segment.wineTypes,
    taste_preferences: segment.tastes,
    price_range: segment.priceRange,
    experience_type: index % 10 === 7 ? ['professional', 'restaurant'] : ['consumer'],
  }]);
  await rest('dietary_preferences', 'POST', [{
    user_id: userId,
    dietary_restrictions: segment.restrictions,
    food_pairings: segment.pairings,
  }]);
  const wineRows = buildWineRows(userId, segment, index);
  await rest('user_wines', 'POST', wineRows);
  await rest('restaurant_matchrim_sessions', 'POST', Array.from({ length: 3 }, (_, sessionIndex) => ({
    user_id: userId,
    restaurant_name: `QA Restaurant ${sessionIndex + 1}`,
    restaurant_address: 'Synthetic staging only',
    restaurant_place_id: `${cohortId}-${index + 1}-${sessionIndex + 1}`,
    is_winerim_restaurant: sessionIndex === 0,
    matchrim_code: `QA-${segment.id.toUpperCase().slice(0, 8)}`,
    matchrim_profile: profile,
    menu_scan_used: true,
    wines_detected: 8 + sessionIndex * 4,
    source: cohortId,
  })));
  await rest('app_events', 'POST', Array.from({ length: 25 }, (_, eventIndex) => ({
    user_id: userId,
    event_name: ['scan_started', 'scan_completed', 'wine_rated', 'comparison_opened', 'airim_opened'][eventIndex % 5],
    route: ['/escanear/etiqueta', '/escanear/carta-vinos', '/my-wines', '/inteligencia-liquida'][eventIndex % 4],
    platform: eventIndex % 4 === 0 ? 'ios' : 'qa-automation',
    app_version: '1.0.68-qa',
    metadata: { qa_cohort: cohortId, synthetic: true, sequence: eventIndex + 1 },
    created_at: dateFor(index, eventIndex),
  })));
  return {
    userId,
    email,
    segment: segment.id,
    wines: wineRows.length,
    ratedWines: wineRows.filter((wine) => wine.rating).length,
    events: 25,
    restaurantSessions: 3,
  };
};

const main = async () => {
  const existingUsers = await listQaUsers();
  const byEmail = new Map(existingUsers.map((user: any) => [user.email, user]));
  const accounts = [];
  for (let index = 0; index < accountCount; index += 1) {
    const segment = segments[index % segments.length];
    const email = `matchrim.qa.${cohortId}.${String(index + 1).padStart(3, '0')}@example.invalid`;
    const user = byEmail.get(email) || await createUser(index, segment);
    accounts.push(await seedAccount(user, index, segment));
    process.stdout.write(`[${index + 1}/${accountCount}] ${segment.id}: seeded\n`);
  }
  const summary = {
    projectRef,
    schema: 'matchrim_qa',
    cohortId,
    synthetic: true,
    productionTouched: false,
    accountCount,
    segmentCount: segments.length,
    quizResults: accountCount,
    userWines: accountCount * winesPerAccount,
    ratedWines: accounts.reduce((sum, account) => sum + account.ratedWines, 0),
    restaurantSessions: accountCount * 3,
    appEvents: accountCount * 25,
    passwordRecorded: false,
    accounts,
  };
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify({ ...summary, accounts: undefined }, null, 2));
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
