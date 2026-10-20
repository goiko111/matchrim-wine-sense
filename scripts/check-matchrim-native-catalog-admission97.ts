import assert from 'node:assert/strict';
import { canAdmitNativeCatalogLookup97, type NativeCatalogAdmissionCandidate97 } from '../src/utils/nativeCatalogAdmission97';

let checks = 0;
const check = (name: string, work: () => void) => { work(); checks++; console.log('PASS', name); };
const base = {
  name: 'Aurora Cuvee Especial', producer: 'Bodegas Monte Claro S.A.', vintage: 2020,
  region: 'Navarra', country: 'ES', inferredFields: [], confidence: 0.72,
  evidence: ['AURORA CUVEE ESPECIAL', 'MONTE CLARO', '2020'],
  uncertaintyReasons: ['Reflejos en la botella', 'No se distingue la uva'],
};
const admit = (updates: Record<string, unknown> = {}) => canAdmitNativeCatalogLookup97({ ...base, ...updates } as NativeCatalogAdmissionCandidate97);
const realFetch = globalThis.fetch;
let networkAttempts = 0;
globalThis.fetch = async () => { networkAttempts++; throw new Error('Network forbidden'); };
try {
  check('Exact threshold and literal complete identity admit despite quality/non-identity doubts', () => assert.equal(admit(), true));
  check('No uncertainty prose is treated as catalogue evidence', () => {
    assert.equal(admit({ evidence: ['Reflejos en la botella', 'No se distingue la uva'] }), false);
  });
  for (const confidence of [0, 0.719999, NaN, Infinity, -Infinity, undefined, null, '0.9', true]) {
    check(`Confidence is finite numeric >=.72, without coercion: ${String(confidence)}`, () => assert.equal(admit({ confidence }), false));
  }
  check('A high confidence cannot replace missing distinctive name tokens', () => {
    assert.equal(admit({ confidence: 1, evidence: ['Aurora', 'Monte Claro', '2020'] }), false);
  });
  check('All producer tokens must be literal too', () => {
    assert.equal(admit({ evidence: ['Aurora Cuvee Especial', 'Monte', '2020'] }), false);
  });
  check('Each independently specified identity word/year is necessary', () => {
    for (const missing of ['Aurora', 'Cuvee', 'Especial', 'Monte', 'Claro', '2020']) {
      const evidence = base.evidence.map(fragment => fragment.split(' ').filter(word => word.toLowerCase() !== missing.toLowerCase()).join(' '));
      assert.equal(admit({ evidence }), false, `Missing literal ${missing}`);
    }
  });
  check('Substring/partial tokens never count as complete words', () => {
    assert.equal(admit({ evidence: ['Superaurora Cuvee Especial', 'Monte Claro', '2020'] }), false);
    assert.equal(admit({ evidence: ['Aurora Cuvee Especial', 'Montes Claros', '2020'] }), false);
  });
  check('Dotted letters never certify an unrelated Juve & Camps identity', () => {
    assert.equal(admit({ name: 'Juve & Camps Reserva', producer: 'Juve & Camps', evidence: ['D.E.U.T.Z', 'RESERVA 2020'] }), false);
    assert.equal(admit({ name: 'Deutz', producer: 'Deutz', evidence: ['D.E.U.T.Z', '2020'] }), false);
    assert.equal(admit({ name: 'D.E.U.T.Z', producer: 'Juve & Camps', evidence: ['D.E.U.T.Z', 'Juve & Camps 2020'] }), false);
  });
  check('A fully literal ordinary brand is not denied solely for having one token', () => {
    assert.equal(admit({ name: 'Deutz', producer: 'Deutz', evidence: ['DEUTZ', '2020'] }), true);
  });
  check('Accent/case normalization and legal wrappers are not wine aliases', () => {
    assert.equal(admit({ name: 'Aurora Cuvee Especial', evidence: ['AURORA CUVEE ESPECIAL', 'Monte Claro', '2020'] }), true);
    assert.equal(admit({ name: 'Juv\u00e9 & Camps Reserva', producer: 'Juv\u00e9 & Camps', evidence: ['JUVE & CAMPS RESERVA', '2020'] }), true);
    assert.equal(admit({ producer: 'Monte Claro Estates' }), false);
  });
  check('Single-letter brand/producer initials are not silently dropped from a longer identity', () => {
    assert.equal(admit({ name: 'X Aurora Cuvee Especial' }), false);
    assert.equal(admit({ producer: 'J. Monte Claro' }), false);
    assert.equal(admit({ producer: 'J. Monte Claro', evidence: ['Aurora Cuvee Especial', 'J Monte Claro 2020'] }), true);
  });
  check('Punctuation-only changes cannot create a second independent fragment', () => {
    assert.equal(admit({ name: 'Deutz', producer: 'Deutz', vintage: null, evidence: ['DEUTZ', 'D.E.U.T.Z'] }), false);
  });
  for (const field of ['name', 'nombre', 'producer', 'productor', 'winery', 'bodega', 'vintage', 'anada', 'a\u00f1ada', 'year']) {
    check(`Inferred identity denies lookup even with full evidence: ${field}`, () => assert.equal(admit({ inferredFields: [field] }), false));
  }
  check('Explicit vintage requires a whole literal year, never a similar or partial year', () => {
    for (const evidence of [['Aurora Cuvee Especial', 'Monte Claro'], ['Aurora Cuvee Especial', 'Monte Claro 2019'], ['Aurora Cuvee Especial', 'Monte Claro 12020']]) {
      assert.equal(admit({ evidence }), false);
    }
  });
  check('An explicitly absent vintage permits lookup without manufacturing a year', () => {
    assert.equal(admit({ vintage: null, evidence: ['Aurora Cuvee Especial', 'Monte Claro'] }), true);
  });
  check('At least two distinct nonempty backend fragments; casing/punctuation are not extra evidence', () => {
    for (const evidence of [[], ['Aurora Cuvee Especial Monte Claro 2020'], ['', ' ', 'Aurora Cuvee Especial Monte Claro 2020'],
      ['Aurora Cuvee Especial Monte Claro 2020', 'AURORA CUVEE ESPECIAL MONTE CLARO 2020!!!'],
      ['Aurora Cuvee Especial Monte Claro 2020', null]]) assert.equal(admit({ evidence }), false);
  });
  check('Distinct fragments may support tokens jointly, without concatenating partial letters', () => {
    assert.equal(admit({ evidence: ['Aurora Cuvee', 'Especial Monte Claro 2020'] }), true);
    assert.equal(admit({ evidence: ['Auro ra Cuvee', 'Especial Monte Claro 2020'] }), false);
  });
  check('Geography cannot masquerade as a producer', () => {
    assert.equal(admit({ producer: 'Navarra', evidence: ['Aurora Cuvee Especial', 'Navarra 2020'] }), false);
    assert.equal(admit({ producer: 'ES', evidence: ['Aurora Cuvee Especial', 'ES 2020'] }), false);
  });
  check('Nonidentity inferred geography is not promoted to identity', () => {
    assert.equal(admit({ inferredFields: ['region', 'country', 'grapes'], region: null, country: null }), true);
  });
  check('Existing identity/safe-input guard is mandatory', () => {
    for (const update of [{ name: '' }, { producer: null }, { vintage: '20/21' }, { inferredFields: 'producer' }, { name: 'Whisky' }]) {
      assert.equal(admit(update), false);
    }
    assert.equal(canAdmitNativeCatalogLookup97(null as unknown as NativeCatalogAdmissionCandidate97), false);
  });
  check('No mutation/confidence elevation/sheet/affinity output or network side effect', () => {
    const frozen = Object.freeze({ ...base, evidence: Object.freeze([...base.evidence]), inferredFields: Object.freeze([]),
      uncertaintyReasons: Object.freeze([...base.uncertaintyReasons]) });
    const before = JSON.stringify(frozen);
    assert.equal(canAdmitNativeCatalogLookup97(frozen), true);
    assert.equal(JSON.stringify(frozen), before);
    assert.equal(frozen.confidence, 0.72);
    assert.equal(networkAttempts, 0);
  });
  console.log(JSON.stringify({ passed: checks, failed: 0, remoteCalls: networkAttempts,
    scope: 'Pure native GET admission only; not OCR truth, global catalogue coverage, verified identity, original sheet or sensory affinity.' }));
} finally { globalThis.fetch = realFetch; }
