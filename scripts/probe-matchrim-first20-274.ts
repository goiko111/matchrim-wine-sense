import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createReader194 } from './probe-matchrim-master194';
import { usableMasterKey191 } from './probe-matchrim-master191';
import { parseMasterDetail188 } from '../src/utils/nativeMasterContract188';
import { describeMasterSensory195 } from '../src/utils/nativeMasterReference195';

const manifestFile = 'qa-artifacts/lovable-connection101-20261021/EXACT200-CATALOGUE-COVERAGE.json';
const manifestHash = '7d018e648e5e7ab23aa0bffad826a03f501f2a29cc60ee090f4bf7d3d787e254';
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
type Entry274 = { imageId: string; canonicalId: number; expectedNameForAudit: string; expectedProducerForAudit: string; url: string };
export const plan274 = (): Entry274[] => {
  const bytes = fs.readFileSync(manifestFile); assert.equal(sha(bytes), manifestHash);
  const rows = JSON.parse(bytes.toString()).rows.slice(0, 20);
  assert.deepEqual(rows.map((row: { image_id: string }) => row.image_id),
    Array.from({ length: 20 }, (_, i) => `img-${String(i + 1).padStart(3, '0')}`));
  const plan = rows.filter((row: { mantalak_id: string }) => Number(row.mantalak_id) !== 217480)
    .map((row: { image_id: string; mantalak_id: string; expected_name: string; expected_producer: string }) => {
      const id = Number(row.mantalak_id); assert(Number.isSafeInteger(id) && id > 0);
      return { imageId: row.image_id, canonicalId: id, expectedNameForAudit: row.expected_name,
        expectedProducerForAudit: row.expected_producer, url: `https://app.winerim.com/api/v1/matchrim/wines/${id}` };
    });
  assert.equal(plan.length, 19); assert.equal(new Set(plan.map((row: Entry274) => row.canonicalId)).size, 19);
  return plan;
};
export const authorization274 = (value: unknown) => {
  const auth = value as Record<string, unknown>;
  assert(auth && auth.humanApproved === true && auth.maximumRequests === 19 && auth.maximumAdditionalEUR === 0
    && auth.noModelsImagesLovableOrWrites === true && auth.manifestSHA256 === manifestHash
    && auth.exactHumanReply === 'Sí, hasta 19 lecturas gratuitas', 'EXPLICIT_19_READ_APPROVAL_REQUIRED');
};
export const summarizeDetail274 = (entry: Entry274, raw: unknown) => {
  const wine = parseMasterDetail188(raw, entry.canonicalId); assert(wine, 'DETAIL_SCHEMA_OR_ID_REJECTED');
  const description = describeMasterSensory195(wine, null);
  return { imageId: entry.imageId, canonicalId: wine.mantalakWineId, name: wine.name, winery: wine.winery,
    declaredVintages: wine.vintages, sensoryRows: wine.tastingAttributes.attributesByVintage.length,
    sourceKnownRows: wine.tastingAttributes.attributesByVintage.filter(row => row.source !== null).length,
    genericSensoryAxes: description.axes, perAxisProvenanceAvailable: description.perAxisProvenanceAvailable,
    expectedNameForAudit: entry.expectedNameForAudit, expectedProducerForAudit: entry.expectedProducerForAudit,
    photoDownloaded: false, photoIdentityConfirmed: false, affinityGranted: false, learningGranted: false };
};

const main = async () => {
  const plan = plan274();
  if (process.argv[2] !== '--live-19') {
    console.log(JSON.stringify({ mode: 'PLAN_ONLY', requests: 0, keychainReads: 0,
      maximumNewReads: 19, reusedKnownCanonicalId: 217480, plan })); return;
  }
  const base = 'qa-artifacts/first20-274-20261027';
  const authorization = fs.readFileSync(path.join(base, 'HUMAN-AUTHORIZATION.json'));
  authorization274(JSON.parse(authorization.toString()));
  const guard = () => {
    const leases = JSON.parse(fs.readFileSync('/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json', 'utf8')).leases;
    for (const [resource, key] of [['mac-desktop', 'MATCHRIM274_DESKTOP_LEASE_ID'], ['writer-matchrim-native99', 'MATCHRIM102_WRITER_LEASE_ID']]) {
      const lease = leases[resource];
      assert(lease?.owner === '019f9da7-ae96-7c60-a1b4-fafb75b04d6d'
        && lease.leaseId === process.env[key] && lease.reviewAfter * 1000 > Date.now(), 'OWN_RESOURCE_REQUIRED');
    }
    assert.equal(sha(fs.readFileSync(manifestFile)), manifestHash);
    assert.equal(sha(fs.readFileSync(path.join(base, 'HUMAN-AUTHORIZATION.json'))), sha(authorization));
  };
  guard();
  const output = path.join(base, 'live-r1'); assert(!fs.existsSync(output), 'NO_AUTOMATIC_RESET_OR_RETRY');
  fs.mkdirSync(output, { mode: 0o700 });
  const save = (name: string, value: unknown) => fs.writeFileSync(path.join(output, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  save('STARTED.json', { startedUTC: new Date().toISOString(), maximumNewReads: 19,
    manifestSHA256: manifestHash, authorizationSHA256: sha(authorization), identitySource: 'Supplied Mantalak IDs, not recognition', plan });
  let key = '', attempts = 0, halted = false;
  const rows: ReturnType<typeof summarizeDetail274>[] = [];
  try {
    try { key = execFileSync('/usr/bin/security', ['find-generic-password', '-a', 'goiko', '-s', 'wine.matchrim.goiko-api', '-w'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000, maxBuffer: 4096 }).trim(); }
    catch { throw Error('KEYCHAIN_UNAVAILABLE'); }
    assert(usableMasterKey191(key)); guard();
    const reader = createReader194({ key, fetcher: fetch,
      claim: (index, label, url) => { guard(); assert(index <= 19 && url === plan[index - 1].url);
        save(`${String(index).padStart(2, '0')}-RESERVED.json`, { index, label, url, atUTC: new Date().toISOString() }); attempts = index; },
      record: (receipt, payload) => { const n = String(receipt.index).padStart(2, '0');
        save(`${n}-RECEIPT.json`, receipt); if (payload !== undefined) save(`${n}-BODY.json`, payload); },
    });
    for (const entry of plan) {
      guard(); const raw = await reader.read(entry.imageId + '-manifest-detail', entry.url);
      rows.push(summarizeDetail274(entry, raw)); guard();
    }
  } catch { halted = true; }
  finally {
    key = '';
    save('RESULT.json', { passed: !halted && rows.length === 19, halted, attempts, maximumNewReads: 19,
      rows, models: 0, photosDownloaded: 0, databaseWrites: 0, additionalEUR: 0,
      photoIdentitiesConfirmed: 0, affinityGranted: false, webOrBackendChanged: false,
      scope: 'Canonical details by supplied manifest IDs; not photo recognition, vintage validation or full catalogue coverage',
      existing217480Receipt: 'qa-fixtures/hosted258/RESULT.json', finishedUTC: new Date().toISOString() });
  }
  console.log(JSON.stringify({ output, halted, attempts, validatedDetails: rows.length, models: 0, additionalEUR: 0 }));
  if (halted) process.exitCode = 1;
};
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main().catch(() => { console.error('FIRST20_274_STOPPED_NO_SECRET_LOGGED'); process.exitCode = 1; });
