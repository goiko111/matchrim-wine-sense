import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import {
  activeRestaurantRows91, addRestaurantDocument91, completeRestaurantPage91, createRestaurantSession91,
  discardRestaurantRow91, editRestaurantRow91, removeRestaurantDocument91, restaurantRowForRequest91, restaurantRowOrigins91,
  type RestaurantSession91, type SourcedRestaurantRow91,
} from '../src/utils/restaurantSession91';
import { parseRestaurantRead91, parseRestaurantRequest91, type RestaurantRow91 } from '../supabase/functions/_shared/matchrim-restaurant91';
import { planRestaurantRanking91, runRestaurantRanking91 } from '../src/utils/restaurantRanking91';

let checks = 0;
const check = (name: string, run: () => void) => { run(); checks++; console.log(`PASS ${name}`); };
const banana = 'BANANA BOURBON DELIGHT';
const chocolate = 'CHOCOLATE LASAGNA';
// Literal OpenAI BBQ readings captured in matchrim92-openai-20261016/
// browser-real-food-rows-scoped.json and browser-real-food-results.txt.
const mention = 'SPECIALS *DESSERTS: BANANA BOURBON DELIGHT CHOCOLATE LASAGNA';
const bbq: RestaurantRow91[] = [
  { id: 'b:0', kind: 'food', name: banana, sourceText: `DESSERTS ${banana} $5`, price: 5, service: 'unknown' },
  { id: 'b:1', kind: 'food', name: chocolate, sourceText: `DESSERTS ${chocolate} $5`, price: 5, service: 'unknown' },
  { id: 'b:2', kind: 'food', name: banana, sourceText: mention, service: 'unknown' },
  { id: 'b:3', kind: 'food', name: chocolate, sourceText: mention, service: 'unknown' },
];
const session = (count = 1) => addRestaurantDocument91(createRestaurantSession91(), {
  id: 'food', kind: 'food', name: 'BBQ.pdf', digest: 'bbq', pageCount: count,
});
const complete = (state: RestaurantSession91, page: number, readings: RestaurantRow91[]) => {
  const pageId = `food-p${page}`;
  const parsed = parseRestaurantRead91({ rows: readings, partial: false, warnings: [] }, 'food', pageId);
  return completeRestaurantPage91(state, pageId, parsed.rows, parsed.partial, parsed.warnings);
};
const active = (state: RestaurantSession91, name = banana) => activeRestaurantRows91(state).filter(row => row.name === name);
const pageState = (state: RestaurantSession91, number: number, patch: Partial<RestaurantSession91['pages'][number]>) => ({
  ...state, pages: state.pages.map(page => page.number === number ? { ...page, ...patch } : page),
});
const projected = (state: RestaurantSession91) => activeRestaurantRows91(state).map(row => ({
  id: row.id, name: row.name, sourceText: row.sourceText, price: row.price, currency: row.currency,
  service: row.service, pageIds: row.pageIds, origins: restaurantRowOrigins91(row),
})).sort((a, b) => a.id.localeCompare(b.id));
const clone = <T,>(value: T): T => structuredClone(value);

check('Actual four BBQ readings become two dishes, keeping every same-page reading', () => {
  const state = complete(session(), 1, bbq);
  assert.equal(state.rows.length, 2);
  assert.equal(activeRestaurantRows91(state).length, 2);
  for (const name of [banana, chocolate]) {
    const [row] = active(state, name);
    assert.equal(row.price, 5);
    assert.equal(row.currency, undefined, '$ never implies USD');
    assert.equal(row.service, 'unknown');
    assert.deepEqual(row.pageIds, ['food-p1']);
    assert.deepEqual(restaurantRowOrigins91(row).map(origin => origin.row.sourceText), bbq.filter(item => item.name === name).map(item => item.sourceText));
    assert.equal(row.reviewed, false);
  }
});

check('Grouping and projection never mutate original input or previous state', () => {
  const initial = session();
  const before = clone(initial), readings = clone(bbq);
  const state = complete(initial, 1, readings);
  activeRestaurantRows91(state);
  assert.deepEqual(initial, before);
  assert.deepEqual(readings, bbq);
  assert.equal(restaurantRowOrigins91(state.rows[0]).length, 2);
});

const pair = (left: Partial<RestaurantRow91>, right: Partial<RestaurantRow91>) => [
  { ...bbq[0], ...left }, { ...bbq[0], id: 'variant', ...right },
];
for (const [label, left, right] of [
  ['prices', {}, { price: 6, sourceText: `DESSERTS ${banana} $6` }],
  ['currencies', { currency: 'USD', sourceText: `DESSERTS ${banana} USD 5` }, { currency: 'CAD', sourceText: `DESSERTS ${banana} CAD 5` }],
  ['known/unknown currency', { currency: 'USD', sourceText: `DESSERTS ${banana} USD 5` }, {}],
  ['services', { service: 'glass', sourceText: `DESSERTS ${banana} glass $5` }, { service: 'bottle', sourceText: `DESSERTS ${banana} bottle $5` }],
  ['known/unknown service', { service: 'glass', sourceText: `DESSERTS ${banana} glass $5` }, {}],
  ['producers', { producer: 'Maker A', sourceText: `DESSERTS ${banana} Maker A $5` }, { producer: 'Maker B', sourceText: `DESSERTS ${banana} Maker B $5` }],
  ['vintages', { vintage: '2020', sourceText: `DESSERTS ${banana} 2020 $5` }, { vintage: '2021', sourceText: `DESSERTS ${banana} 2021 $5` }],
  ['descriptions/preparations', { description: 'fried', sourceText: `DESSERTS ${banana} fried $5` }, { description: 'grilled', sourceText: `DESSERTS ${banana} grilled $5` }],
  ['unstructured preparations', { sourceText: `DESSERTS ${banana} fried $5` }, { sourceText: `DESSERTS ${banana} grilled $5` }],
  ['portion formats', { sourceText: `DESSERTS ${banana} $5 100 g` }, { sourceText: `DESSERTS ${banana} $5 200 g` }],
  ['availability', {}, { sourceText: `DESSERTS ${banana} $5 COMING SOON` }],
  ['conditional days', { sourceText: `DESSERTS ${banana} $5 weekends only` }, { sourceText: `DESSERTS ${banana} $5 Mondays only` }],
] as Array<[string, Partial<RestaurantRow91>, Partial<RestaurantRow91>]>) {
  check(`Conflicting ${label} remain separate`, () => assert.equal(active(complete(session(), 1, pair(left, right))).length, 2));
}

check('Same-name meat and sandwich do not merge even at the same price', () => {
  const rows: RestaurantRow91[] = [
    { id: 'meat', kind: 'food', name: 'BRISKET', sourceText: 'MEATS BRISKET $10', price: 10 },
    { id: 'sandwich', kind: 'food', name: 'BRISKET', sourceText: 'SANDWICHES BRISKET $10', price: 10 },
    { id: 'portion', kind: 'food', name: 'BRISKET', sourceText: 'MEATS BRISKET $10 1/2 LB', price: 10 },
  ];
  assert.equal(activeRestaurantRows91(complete(session(), 1, rows)).length, 3);
});

check('Unextracted conflicting prices and multiple formats are not erased', () => {
  const state = complete(session(), 1, pair(
    { price: undefined, sourceText: `DESSERTS ${banana} SM $5 / LG $9` },
    { price: undefined, sourceText: `DESSERTS ${banana} SM $6 / LG $9` },
  ));
  assert.equal(active(state).length, 2);
  assert.ok(active(state).every(row => row.price === undefined));
});

check('Missing price cannot bridge conflicting prices, in any row order', () => {
  const readings = [...bbq, { ...bbq[0], id: 'six', price: 6, sourceText: `DESSERTS ${banana} $6` }];
  for (let offset = 0; offset < readings.length; offset++) {
    const rotated = [...readings.slice(offset), ...readings.slice(0, offset)];
    const state = complete(session(), 1, rotated);
    assert.equal(active(state).length, 3);
    assert.deepEqual(active(state).map(row => row.price).sort(), [5, 6, undefined]);
    assert.equal(active(state, chocolate).length, 1);
    assert.equal(activeRestaurantRows91(state).flatMap(restaurantRowOrigins91).length, 5);
  }
});

check('All page completion orders produce the same groups, IDs and original readings', () => {
  const orders = [[1, 2, 3], [3, 2, 1], [2, 1, 3], [2, 3, 1], [1, 3, 2], [3, 1, 2]];
  let expected: ReturnType<typeof projected> | undefined;
  for (const order of orders) {
    let state = session(3);
    for (const number of order) state = complete(state, number, number === 2 ? bbq.slice(2) : bbq.slice(0, 2));
    assert.equal(activeRestaurantRows91(state).length, 2);
    assert.ok(activeRestaurantRows91(state).every(row => restaurantRowOrigins91(row).length === 3));
    if (expected) assert.deepEqual(projected(state), expected);
    else expected = projected(state);
  }
});

const menuRows = (section: string): RestaurantRow91[] => Array.from({ length: 12 }, (_, ordinal) => {
  const name = `${section} dish ${ordinal + 1}`;
  return { id: `hash-${(ordinal * 5) % 12}`, kind: 'food', name, sourceText: name };
});

check('Twelve pages completed in reverse display in page order with numeric source ordinals, not lexical IDs', () => {
  const readInOrder = (order: number[]) => {
    let state = session(12);
    for (const number of order) {
      const readings = menuRows(`Page ${number}`);
      state = complete(state, number, [...readings, readings[0]]);
    }
    return state;
  };
  const pageNumbers = Array.from({ length: 12 }, (_, index) => index + 1);
  const forward = readInOrder(pageNumbers);
  const reverse = readInOrder([...pageNumbers].reverse());
  const expected = pageNumbers.flatMap(number => menuRows(`Page ${number}`).map(row => row.name));
  assert.deepEqual(reverse.rows.map(row => row.name), expected);
  assert.deepEqual(activeRestaurantRows91(reverse).map(row => row.name), expected);
  assert.deepEqual(activeRestaurantRows91(reverse).map(row => row.id), activeRestaurantRows91(forward).map(row => row.id));
  assert.deepEqual(projected(reverse), projected(forward));
  for (const number of pageNumbers) {
    const rows = activeRestaurantRows91(reverse).filter(row => row.pageIds.includes(`food-p${number}`));
    assert.deepEqual(rows.map(row => restaurantRowOrigins91(row)[0].ordinal), Array.from({ length: 12 }, (_, index) => index));
    assert.deepEqual(restaurantRowOrigins91(rows[0]).map(origin => origin.ordinal), [0, 12]);
  }
});

check('Grouped rows use their earliest visible document/page reading while keeping lexical identity stable', () => {
  const first = menuRows('First document'), second = menuRows('Second document');
  first[2] = bbq[0];
  second[10] = bbq[0];
  let expectedIds: string[] | undefined;
  for (const completionOrder of [['z-menu', 'a-menu'], ['a-menu', 'z-menu']]) {
    let state = createRestaurantSession91();
    for (const id of ['z-menu', 'a-menu']) state = addRestaurantDocument91(state, {
      id, kind: 'food', name: `${id}.pdf`, digest: id, pageCount: 1,
    });
    for (const id of completionOrder) {
      const pageId = `${id}-p1`;
      const parsed = parseRestaurantRead91({ rows: id === 'z-menu' ? first : second, partial: false, warnings: [] }, 'food', pageId);
      state = completeRestaurantPage91(state, pageId, parsed.rows, false, []);
    }
    const displayed = activeRestaurantRows91(state);
    assert.deepEqual(displayed.map(row => row.name), [...first, ...second.filter(row => row.name !== banana)].map(row => row.name));
    const [grouped] = active(state);
    assert.equal(grouped.id, 'a-menu-p1:10', 'display order must not rebind the stable grouping ID');
    assert.deepEqual(grouped.pageIds, ['z-menu-p1', 'a-menu-p1']);
    assert.deepEqual(restaurantRowOrigins91(grouped).map(origin => origin.ordinal), [2, 10]);
    if (expectedIds) assert.deepEqual(displayed.map(row => row.id), expectedIds);
    else expectedIds = displayed.map(row => row.id);
    const excluded = { ...state, pages: state.pages.map(page => page.documentId === 'z-menu' ? { ...page, enabled: false } : page) };
    assert.deepEqual(activeRestaurantRows91(excluded).map(row => row.name), second.map(row => row.name));
    assert.equal(active(excluded)[0].id, grouped.id);
    const reordered = { ...state, pages: [...state.pages].reverse() };
    assert.deepEqual(activeRestaurantRows91(reordered).map(row => row.name), [...second, ...first.filter(row => row.name !== banana)].map(row => row.name));
    assert.equal(active(reordered)[0].id, grouped.id);
  }
});

check('Manual entries retain insertion order across reverse page completion, corrections and deletion', () => {
  const manual = (id: string): SourcedRestaurantRow91 => ({ id, kind: 'food', name: id, sourceText: id, manual: true, reviewed: true, pageIds: [] });
  let state = session(2);
  state = { ...state, rows: [manual('manual-z'), manual('manual-a')] };
  state = complete(state, 2, menuRows('Second page'));
  state = { ...state, rows: [...state.rows, manual('manual-m')] };
  state = complete(state, 1, menuRows('First page'));
  const expectedManualIds = ['manual-z', 'manual-a', 'manual-m'];
  const assertManualOrder = () => {
    assert.deepEqual(state.rows.filter(row => row.manual).map(row => row.id), expectedManualIds);
    assert.deepEqual(activeRestaurantRows91(state).slice(-3).map(row => row.id), expectedManualIds);
  };
  assertManualOrder();
  assert.deepEqual(activeRestaurantRows91(state).slice(0, 24).map(row => row.name), [...menuRows('First page'), ...menuRows('Second page')].map(row => row.name));
  state = editRestaurantRow91(state, 'manual-a', { name: 'Corrected manual entry' });
  state = editRestaurantRow91(state, activeRestaurantRows91(state)[10].id, { description: 'Reviewed position ten' });
  assertManualOrder();
  assert.equal(activeRestaurantRows91(state)[10].description, 'Reviewed position ten');
  state = complete(state, 1, [...menuRows('First page')].reverse());
  assertManualOrder();
  assert.deepEqual(activeRestaurantRows91(state).slice(0, 12).map(row => row.name), menuRows('First page').map(row => row.name).reverse());
  state = removeRestaurantDocument91(state, 'food');
  assertManualOrder();
});

check('Legacy drafts use saved reading order when origin ordinals are absent, even with scrambled IDs', () => {
  for (const hasOrigins of [false, true]) {
    const readings = menuRows('Legacy menu');
    let state = session(2);
    state = { ...state, pages: state.pages.map(page => ({ ...page, status: 'read' })), rows: readings.map(row => ({
      ...row, reviewed: false, pageIds: ['food-p1'],
      ...(hasOrigins ? { origins: [{ pageId: 'food-p1', row }] } : {}),
    })) };
    const original = clone(state);
    assert.deepEqual(activeRestaurantRows91(state).map(row => row.name), readings.map(row => row.name));
    assert.deepEqual(activeRestaurantRows91(state).map(row => restaurantRowOrigins91(row)[0].ordinal), Array.from({ length: 12 }, (_, index) => index));
    assert.deepEqual(state, original, 'legacy display projection is immutable');
    state = complete(state, 2, menuRows('Later page'));
    state = editRestaurantRow91(state, readings[10].id, { description: 'Legacy position ten' });
    assert.deepEqual(activeRestaurantRows91(state).map(row => row.name), [...readings, ...menuRows('Later page')].map(row => row.name));
    assert.equal(activeRestaurantRows91(state)[10].description, 'Legacy position ten');
    assert.deepEqual(state.rows.slice(0, 12).map(row => restaurantRowOrigins91(row)[0].ordinal), Array.from({ length: 12 }, (_, index) => index));
  }
});

check('Disabling/re-enabling a priced page recomputes the price and visible provenance', () => {
  let state = complete(complete(session(2), 1, bbq.slice(0, 2)), 2, bbq.slice(2));
  const stored = clone(state);
  state = pageState(state, 1, { enabled: false });
  const [row] = active(state);
  assert.equal(row.price, undefined);
  assert.equal(row.currency, undefined);
  assert.equal(row.sourceText, mention);
  assert.deepEqual(row.pageIds, ['food-p2']);
  assert.equal(restaurantRowOrigins91(row).length, 1);
  assert.equal(active(pageState(state, 1, { enabled: true }))[0].price, 5);
  assert.deepEqual(state.rows, stored.rows, 'disabled origins remain in the draft, not the projection');
});

check('Queued, reading and failed reanalysis cannot leak the previous price', () => {
  const state = complete(complete(session(2), 1, bbq.slice(0, 2)), 2, bbq.slice(2));
  for (const status of ['queued', 'reading', 'error'] as const) {
    const [row] = active(pageState(state, 1, { status }));
    assert.equal(row.price, undefined);
    assert.deepEqual(row.pageIds, ['food-p2']);
  }
  const reanalyzed = complete(state, 1, []);
  assert.equal(active(reanalyzed)[0].price, undefined);
  assert.ok(reanalyzed.rows.every(row => !row.pageIds.includes('food-p1')));
});

check('Reanalysis replaces all same-page originals rather than appending old prices', () => {
  let state = complete(session(2), 1, bbq);
  state = complete(state, 2, bbq.slice(2));
  state = complete(state, 1, bbq.slice(0, 2).map(row => ({ ...row, price: 7, sourceText: `DESSERTS ${row.name} $7` })));
  assert.equal(active(state)[0].price, 7);
  assert.equal(restaurantRowOrigins91(active(state)[0]).length, 2);
  assert.ok(state.rows.flatMap(restaurantRowOrigins91).every(origin => origin.row.price !== 5));
  assert.equal(new Set(state.rows.map(row => row.id)).size, state.rows.length);
});

check('Deleting a priced document drops its price and every removed origin permanently', () => {
  let state = complete(session(), 1, bbq.slice(0, 2));
  state = addRestaurantDocument91(state, { id: 'mentions', kind: 'food', name: 'specials.jpg', digest: 'special', pageCount: 1 });
  state = completeRestaurantPage91(state, 'mentions-p1', bbq.slice(2), false, []);
  state = removeRestaurantDocument91(state, 'food');
  const [row] = active(state);
  assert.equal(row.price, undefined);
  assert.equal(row.sourceText, mention);
  assert.deepEqual(row.pageIds, ['mentions-p1']);
  assert.ok(state.rows.flatMap(restaurantRowOrigins91).every(origin => origin.pageId === 'mentions-p1'));
  assert.equal(removeRestaurantDocument91(state, 'mentions').rows.length, 0);
});

check('Corrections preserve originals and do not freeze an inherited price', () => {
  let state = complete(complete(session(2), 1, bbq.slice(0, 2)), 2, bbq.slice(2));
  state = { ...state, pairs: [{ foodId: active(state)[0].id, wineId: 'wine', band: 'possible', positives: ['test'], frictions: [], missing: [], evidence: 'model_inference' }] };
  const revision = state.revision;
  const originals = clone(restaurantRowOrigins91(active(state)[0]));
  state = editRestaurantRow91(state, active(state)[0].id, { name: 'Corrected dessert', description: 'User preparation', id: 'forbidden', kind: 'wine', sourceText: 'forbidden' });
  assert.equal(state.pairs.length, 0);
  assert.ok(state.revision > revision);
  const [corrected] = active(state, 'Corrected dessert');
  assert.equal(corrected.kind, 'food');
  assert.notEqual(corrected.id, 'forbidden');
  assert.deepEqual(restaurantRowOrigins91(corrected), originals);
  assert.equal(corrected.reviewed, true);
  assert.equal(active(state, chocolate).length, 1, 'editing one dish does not split a sibling dessert');
  state = pageState(clone(state), 1, { enabled: false });
  assert.equal(active(state, 'Corrected dessert')[0].price, undefined);
  assert.equal(active(state, 'Corrected dessert')[0].description, 'User preparation');
  state = complete(state, 1, []);
  assert.equal(active(state, 'Corrected dessert')[0].price, undefined);
  assert.deepEqual(active(state, 'Corrected dessert')[0].pageIds, ['food-p2']);
});

check('Editing a visible group does not attach corrections to excluded origins', () => {
  let state = complete(complete(session(2), 1, bbq.slice(0, 2)), 2, bbq.slice(2));
  state = pageState(state, 1, { enabled: false });
  state = editRestaurantRow91(state, active(state)[0].id, { name: 'Only visible mention' });
  state = pageState(state, 1, { enabled: true });
  assert.deepEqual(active(state, 'Only visible mention')[0].pageIds, ['food-p2']);
  assert.equal(active(state)[0].reviewed, false);
  assert.equal(active(state)[0].price, 5);
});

check('Editing a reviewed subset keeps distinct IDs and independently scoped corrections', () => {
  let state = complete(complete(session(2), 1, bbq.slice(0, 2)), 2, bbq.slice(2));
  state = editRestaurantRow91(state, active(state)[0].id, { name: 'First correction' });
  state = pageState(state, 1, { enabled: false });
  state = editRestaurantRow91(state, active(state, 'First correction')[0].id, { name: 'Second correction' });
  state = pageState(state, 1, { enabled: true });
  assert.equal(new Set(state.rows.map(row => row.id)).size, state.rows.length);
  assert.equal(new Set(activeRestaurantRows91(state).map(row => row.id)).size, state.rows.length);
  assert.deepEqual(active(state, 'First correction')[0].pageIds, ['food-p1']);
  assert.deepEqual(active(state, 'Second correction')[0].pageIds, ['food-p2']);
  assert.equal(active(state, 'Second correction')[0].price, undefined);
});

check('Explicitly clearing a price survives draft cloning and origin replacement', () => {
  let state = complete(complete(session(2), 1, bbq.slice(0, 2)), 2, bbq.slice(2));
  state = editRestaurantRow91(state, active(state)[0].id, { price: undefined, currency: undefined });
  state = clone(state);
  assert.equal(active(state)[0].price, undefined);
  state = complete(state, 2, []);
  assert.equal(active(state)[0].price, undefined);
  assert.equal(restaurantRowOrigins91(active(state)[0])[0].row.price, 5, 'original price is still evidence, not the correction');
});

check('An explicitly reviewed price also disappears when its supporting source is excluded', () => {
  let state = complete(complete(session(2), 1, bbq.slice(0, 2)), 2, bbq.slice(2));
  state = editRestaurantRow91(state, active(state)[0].id, { price: 5 });
  assert.equal(active(state)[0].price, 5);
  state = pageState(state, 1, { enabled: false });
  assert.equal(active(state)[0].price, undefined);
  parseRestaurantRequest91({ operation: 'rank', foods: activeRestaurantRows91(state).map(restaurantRowForRequest91), wines: [] });
});

check('Discard removes the whole visible group, including legacy individually stored duplicates', () => {
  let state = complete(session(), 1, bbq);
  state = discardRestaurantRow91(state, active(state)[0].id);
  assert.equal(active(state).length, 0);
  assert.equal(active(state, chocolate).length, 1, 'discarding one item cannot split its sibling');
  const parsed = parseRestaurantRead91({ rows: bbq, partial: false, warnings: [] }, 'food', 'food-p1').rows;
  state = { ...session(), pages: state.pages, rows: parsed.map(row => ({ ...row, reviewed: false, pageIds: ['food-p1'] })) };
  state = discardRestaurantRow91(state, active(state)[0].id);
  assert.equal(active(state).length, 0);
  assert.equal(active(state, chocolate).length, 1);
});

check('Discard targets the currently visible origins when its representative page is excluded', () => {
  let state = complete(complete(session(2), 1, bbq.slice(0, 2)), 2, bbq.slice(2));
  state = pageState(state, 1, { enabled: false });
  state = discardRestaurantRow91(state, active(state)[0].id);
  assert.equal(active(state).length, 0);
  state = complete(state, 1, []);
  assert.equal(active(state).length, 0, 'deleted visible origins cannot resurrect after another page is re-read');
});

check('A page disappearing from a draft cannot leave active price or provenance', () => {
  let state = complete(complete(session(2), 1, bbq.slice(0, 2)), 2, bbq.slice(2));
  state = { ...state, pages: state.pages.filter(page => page.number !== 1) };
  assert.equal(active(state)[0].price, undefined);
  assert.deepEqual(active(state)[0].pageIds, ['food-p2']);
});

check('Removing a conflicting price resolves a previously ambiguous mention from remaining evidence', () => {
  let state = complete(complete(session(3), 1, bbq.slice(0, 2)), 2, bbq.slice(2));
  state = complete(state, 3, [{ ...bbq[0], sourceText: `DESSERTS ${banana} $6`, price: 6 }]);
  assert.equal(active(state).length, 3);
  state = complete(state, 1, []);
  assert.equal(active(state).length, 1);
  assert.equal(active(state)[0].price, 6);
  assert.equal(restaurantRowOrigins91(active(state)[0]).length, 2);
});

check('All original descriptions, prices, formats and notes survive grouping and cloning', () => {
  const readings = bbq.map(row => ({ ...row, description: row.name, notes: [row.name] }));
  const state = clone(complete(session(), 1, readings));
  const originals = state.rows.flatMap(restaurantRowOrigins91).map(origin => JSON.parse(JSON.stringify(origin.row))).sort((a, b) => a.id.localeCompare(b.id));
  const expected = parseRestaurantRead91({ rows: readings, partial: false, warnings: [] }, 'food', 'food-p1').rows;
  assert.deepEqual(originals, expected);
});

check('Manual and reviewed entries never auto-merge or absorb new page readings', () => {
  let state = complete(session(2), 1, [bbq[0]]);
  state = editRestaurantRow91(state, active(state)[0].id, { name: banana });
  const manual: SourcedRestaurantRow91 = { ...bbq[0], id: 'manual-food', manual: true, reviewed: true, pageIds: [] };
  state = { ...state, rows: [...state.rows, manual] };
  state = complete(state, 2, [bbq[0]]);
  assert.equal(active(state).length, 3);
  state = complete(state, 1, [bbq[0]]);
  assert.equal(active(state).length, 2, 'reviewed origin is replaced, not resurrected on re-read');
  assert.equal(active(state).filter(row => row.manual).length, 1);
  state = removeRestaurantDocument91(state, 'food');
  assert.deepEqual(state.rows, [manual]);
});

check('Duplicate input IDs remain unique, including across protected origins', () => {
  let state = completeRestaurantPage91(session(2), 'food-p1', [bbq[0]], false, []);
  state = editRestaurantRow91(state, active(state)[0].id, { name: banana });
  state = completeRestaurantPage91(state, 'food-p2', [bbq[0], { ...bbq[0], price: 6, sourceText: `DESSERTS ${banana} $6` }], false, []);
  assert.equal(new Set(state.rows.map(row => row.id)).size, 3);
  assert.equal(new Set(state.rows.flatMap(restaurantRowOrigins91).map(origin => origin.row.id)).size, 3);
});

check('Version-1 drafts without new fields still project, edit and reanalyze safely', () => {
  const parsed = parseRestaurantRead91({ rows: bbq, partial: false, warnings: [] }, 'food', 'food-p1').rows;
  let state = session(2);
  state = { ...state, pages: state.pages.map(page => ({ ...page, status: 'read' })), rows: parsed.map(row => ({ ...row, reviewed: false, pageIds: ['food-p1'] })) };
  assert.equal(activeRestaurantRows91(state).length, 2);
  assert.ok(state.rows.every(row => row.origins === undefined));
  state = editRestaurantRow91(state, active(state)[0].id, { name: 'Legacy correction' });
  assert.equal(active(state, 'Legacy correction')[0].reviewed, true);
  state = complete(state, 1, []);
  assert.equal(state.rows.length, 0);
  assert.equal(state.version, 1);
});

check('Legacy reviewed identity survives without new metadata and remains protected', () => {
  let state = complete(session(2), 1, [bbq[0]]);
  state = { ...state, rows: state.rows.map(({ origins: _origins, correction: _correction, ...row }) => ({ ...row, name: 'Legacy user name', reviewed: true })) };
  state = complete(state, 2, [bbq[0]]);
  assert.equal(activeRestaurantRows91(state).length, 2);
  assert.equal(active(state, 'Legacy user name')[0].reviewed, true);
});

check('Wine exact-source policy stays unchanged; producer/vintage variants stay separate', () => {
  let state = addRestaurantDocument91(createRestaurantSession91(), { id: 'wine', kind: 'wine', name: 'wine.pdf', digest: 'wine', pageCount: 2 });
  const wine: RestaurantRow91 = { id: 'wine:0', kind: 'wine', name: 'Roda I', producer: 'Roda', vintage: '2020', sourceText: 'Roda I 2020 botella 70 EUR', price: 70, currency: 'EUR', service: 'bottle' };
  state = completeRestaurantPage91(state, 'wine-p1', [wine], false, []);
  state = completeRestaurantPage91(state, 'wine-p2', [{ ...wine, id: 'wine:1' }, { ...wine, id: 'wine:2', sourceText: 'SPECIALS Roda I 2020 botella 70 EUR' }, { ...wine, id: 'wine:3', vintage: '2021' }, { ...wine, id: 'wine:4', producer: 'Other' }], false, []);
  assert.equal(activeRestaurantRows91(state).length, 4);
  assert.equal(restaurantRowOrigins91(state.rows.find(row => row.id === 'wine:0')!).length, 2);
});

check('API whitelist drops all local provenance while keeping review/manual safeguards', () => {
  const state = complete(session(), 1, bbq);
  const corrected = editRestaurantRow91(state, active(state)[0].id, { name: 'Declared dessert' });
  const foods = activeRestaurantRows91(corrected).map(restaurantRowForRequest91);
  assert.ok(foods.every(row => !['origins', 'pageIds', 'correction', 'mentionedNames', 'ordinal'].some(key => key in row)));
  assert.equal(foods.find(row => row.name === 'Declared dessert')?.reviewed, true);
  const wine = restaurantRowForRequest91({ id: 'manual-wine', kind: 'wine', name: 'Roda I', sourceText: 'Roda I', manual: true, reviewed: true });
  const request = parseRestaurantRequest91({ operation: 'rank', foods, wines: [wine] });
  assert.equal(request.operation, 'rank');
  assert.equal(wine.manual, true);
  if (request.operation === 'rank') assert.deepEqual(parseRestaurantRequest91(request), request);
});

check('Grouping never concatenates sourceText past the strict 2400-character API bound', () => {
  const prefix = `DESSERTS ${banana} $5 `;
  const sourceText = prefix + 'x'.repeat(2400 - prefix.length);
  const reading = { ...bbq[0], sourceText };
  const state = complete(complete(session(2), 1, [reading]), 2, [reading]);
  const [row] = active(state);
  assert.equal(row.sourceText.length, 2400);
  assert.equal(restaurantRowOrigins91(row).length, 2);
  assert.ok(restaurantRowOrigins91(row).every(origin => origin.row.sourceText === sourceText));
  parseRestaurantRequest91({ operation: 'rank', foods: [restaurantRowForRequest91(row)], wines: [] });
  assert.throws(() => complete(session(), 1, [{ ...reading, sourceText: `${sourceText}x` }]));
});

let wireCalls = 0;
await runRestaurantRanking91(planRestaurantRanking91(
  activeRestaurantRows91(complete(session(), 1, bbq)).map(restaurantRowForRequest91),
  [{ id: 'wine', kind: 'wine', name: 'Roda I', sourceText: 'Roda I' }], {},
), new AbortController().signal, async body => {
  wireCalls++;
  for (const row of [...body.foods as RestaurantRow91[], ...body.wines as RestaurantRow91[]]) {
    assert.equal('origins' in row, false);
    assert.equal('pageIds' in row, false);
    assert.equal('correction' in row, false);
  }
  parseRestaurantRequest91(body);
  return { pairs: [], warnings: [] };
}, () => {});
check('Offline ranking sender receives only wire rows, once, with corrected counts', () => assert.equal(wireCalls, 1));

check('Restaurant UI uses the whitelist and shows every original reading', () => {
  const source = readFileSync('src/pages/Restaurant.tsx', 'utf8');
  assert.match(source, /planRestaurantRanking91\(foods\.map\(restaurantRowForRequest91\), wines\.map\(restaurantRowForRequest91\)/);
  assert.match(source, /restaurantRowOrigins91\(row\)\.map/);
  assert.match(source, /origin\.row\.sourceText/);
  assert.match(source, /origin\.row\.price/);
  assert.match(source, /readingDetails\(food\)/);
});

check('Strict focused TypeScript check has no diagnostics', () => {
  const program = ts.createProgram(['src/utils/restaurantSession91.ts', 'scripts/check-matchrim-restaurant-dedup93.ts'], {
    noEmit: true, strict: true, skipLibCheck: true, allowImportingTsExtensions: true,
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
  });
  const errors = ts.getPreEmitDiagnostics(program);
  assert.equal(errors.length, 0, ts.formatDiagnosticsWithColorAndContext(errors, {
    getCanonicalFileName: path => path, getCurrentDirectory: () => process.cwd(), getNewLine: () => '\n',
  }));
});
console.log(`Restaurant dedup93: ${checks} checks PASS. Offline fixtures/stubs only; no models, network, datasets or deployment.`);
