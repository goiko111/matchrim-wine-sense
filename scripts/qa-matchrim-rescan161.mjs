import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { checkLeases, verifyArtifact, nativeReceiptPath } from './qa-matchrim-account114.mjs';

export const DEVICE = 'B18822EF-BFBD-4A6A-89B2-33539BDE4127';
export const METHOD = 'MatchrimRescan161Tests/testExistingQAReadOnlyRescan161';
export const LEASE_FILE = '/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json';
export const INPUT_SHA256 = '8d213ff13a2a9c79ce6131180afe7a599bcda88b94cecf1cf853d2c6658cc1f9';
export const INPUT_FILE = 'qa-artifacts/continuation161-20261022/rescan159-image.png';
export const PUBLIC_FILE = 'qa-artifacts/continuation161-20261022/rescan159-public.json';
export const PUBLIC_SHA256 = '01b5b28b4c5f383118408f40abf8523d1d406b43d6e668d3fafbec3fbe5cc179';
export const BASELINE_FILE = 'qa-artifacts/night105-20261021/cellar144-r5/RESULT.json';
export const BASELINE_SHA256 = 'cb83773cfd3b36240fcfdae503da3e828ff9b5821890c12a8fa430f66e784ae4';
export const MEDIA = `/Users/GOIKO/Library/Developer/CoreSimulator/Devices/${DEVICE}/data/Media`;
export const PHOTO_SQL = 'PRAGMA query_only=ON; SELECT ZFILENAME AS filename, ZDIRECTORY AS directory, ZADDEDDATE AS added FROM ZASSET WHERE ZTRASHEDSTATE = 0 ORDER BY ZADDEDDATE DESC LIMIT 2;';
export const VIEWS = ['01-existing-qa-session', '02-local-mode-before-picker', '03-photo-library-before',
  '04-before-added-sort', '05-added-sort-verified', '06-attested-first-image-before', '07-first-image-after',
  '08-real-unconfirmed-proposals', '09-before-explicit-reference', '10-native-personal-verdict',
  '11-five-axes-readback', '99-final'];
export const MARKERS = ['RESCAN161_EXISTING_QA_IDENTITY', 'RESCAN161_LOCAL_MODE_SELECTED',
  'RESCAN161_PHOTOS_ADDED_ORDER_VERIFIED', 'RESCAN161_ATTESTED_PHOTO_SELECTED',
  'RESCAN161_UNCONFIRMED_EXPECTED_PROPOSAL', 'RESCAN161_EXPLICIT_2022_SELECTED',
  'RESCAN161_SAVED_LOVE_NUMERIC_AFFINITY', 'RESCAN161_FIVE_AXES_READBACK',
  'RESCAN161_READONLY_COMPLETE'];
export const REQUIRED_SOURCES = ['src/App.tsx', 'src/contexts/AuthContext.tsx', 'src/pages/Profile.tsx',
  'src/components/MobileBottomNav.tsx', 'src/components/NativeProfileLayout133.tsx',
  'src/components/wine-import/MultiWineLabelScanner.tsx', 'src/components/wine-import/LabelAnalysisView.tsx',
  'src/components/wine-import/GlobalWineRecovery104.tsx', 'src/components/wine-import/NativeGlobalCatalogue103.tsx',
  'src/components/wine-import/WineComparisonWorkspace.tsx', 'src/components/NativeAffinitySummary.tsx',
  'src/utils/nativeRescanVerdict159.ts', 'src/services/nativeScanContext159.ts', 'src/services/matchrimScanProfile.ts',
  'src/utils/nativeSingleLabel109.ts', 'src/utils/nativeOCR106.ts', 'src/utils/localOCRFragments108.ts',
  'src/utils/nativeGlobalCatalogue103.ts', 'src/utils/globalWineProposals104.ts', 'src/utils/nativeMasterCatalog102.ts',
  'src/utils/nativeCatalogAdmission97.ts', 'src/utils/multiWineScan.ts', 'src/utils/multiWineConsumer95.ts',
  'src/utils/wineYearRole105.ts', 'src/utils/nativeVintageEvidence100.ts', 'src/utils/nativeWineQualifier102.ts',
  'src/utils/nativeAppellation120.ts', 'src/utils/nativeWineColor124.ts', 'src/utils/winerimOriginalSheet.ts',
  'src/utils/cellarPublicReference107.ts', 'src/utils/cellarReferenceStyle110.ts', 'src/utils/bodegaAffinity.ts',
  'src/utils/scanProfile.ts', 'src/utils/consumerAffinity95.ts', 'src/utils/wineAffinityExplanation.ts',
  'src/utils/wineComparison.ts', 'src/utils/imageAnalysis.ts', 'src/components/CellarReferenceStyle110.tsx',
  'ios/App/App/MatchrimOCRPlugin106.swift'];
const bundle = 'wine.matchrim.qa99review';
const developer = '/Applications/Xcode-26.0.1.app/Contents/Developer';
const sha = value => createHash('sha256').update(value).digest('hex');
const check = (value, code) => { if (!value) throw new Error(code); };
const json = (io, file) => JSON.parse(io.readFileSync(file, 'utf8'));
const write = (io, file, value) => io.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { mode: 0o600, flag: 'wx' });

export function sanitizedEnvironment(environment) {
  const env = {};
  for (const key of ['HOME', 'TMPDIR', 'USER', 'LOGNAME', 'LANG', 'LC_ALL',
    'MATCHRIM102_HEAVY_LEASE_ID', 'MATCHRIM104_SIMULATOR_LEASE_ID', 'MATCHRIM102_WRITER_LEASE_ID']) {
    if (typeof environment[key] === 'string') env[key] = environment[key];
  }
  env.PATH = '/usr/bin:/bin:/usr/sbin:/sbin';
  env.DEVELOPER_DIR = developer;
  return env;
}

export function makePlan(original, runId) {
  const target = original?.testTargets?.[0]?.target;
  check(original?.testTargets?.length === 1 && target?.name === 'Probe97UITests'
    && target.identifier === '000000000000000000000004'
    && target.containerPath === 'container:Probe97.xcodeproj', 'AMBIGUOUS_TARGET');
  check(/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(runId), 'INVALID_RUN_ID');
  return { version: 1, configurations: [{ id: randomUUID(), name: 'Rescan161Once', options: {} }],
    defaultOptions: { testTimeoutsEnabled: true, defaultTestExecutionTimeAllowance: 220,
      maximumTestExecutionTimeAllowance: 220, testRepetitionMode: 'fixedIterations', maximumTestRepetitions: 1,
      testRepetitionRelaunchEnabled: false, codeCoverage: false,
      environmentVariableEntries: [{ key: 'MATCHRIM161_RUN_ID', value: runId },
        { key: 'MATCHRIM161_INPUT_SHA256', value: INPUT_SHA256 }] },
    testTargets: [{ target: { name: target.name, identifier: target.identifier, containerPath: target.containerPath },
      parallelizable: false, selectedTests: [METHOD] }] };
}

export function evaluate(log, result, stopped = null) {
  const lines = log.split(/\r?\n/), count = marker => lines.filter(line => line === marker).length;
  const events = [...log.matchAll(/^Test Case '([^'\r\n]+)' (started|passed|failed|skipped)(?:[.\t ][^\r\n]*)?\r?$/gm)];
  const expected = /^-\[(?:\w+\.)?MatchrimRescan161Tests testExistingQAReadOnlyRescan161\]$/;
  const summaries = [...log.matchAll(/Executed (\d+) tests?, with (\d+) failures/g)];
  const positions = MARKERS.map(marker => lines.indexOf(marker));
  const start = lines.findIndex(line => /^Test Case '.*' started(?:\.| \(Iteration 1 of 1\)\.)$/.test(line));
  const end = lines.findIndex(line => /^Test Case '.*' passed[. ]/.test(line));
  const passed = result?.code === 0 && !result.signal && !result.spawnError && !stopped
    && MARKERS.every(marker => count(marker) === 1)
    && positions.every((position, index) => !index || position > positions[index - 1])
    && start >= 0 && end > start && positions[0] > start && positions.at(-1) < end
    && events.length === 2 && events[0][2] === 'started' && events[1][2] === 'passed'
    && events.every(event => expected.test(event[1])) && summaries.length > 0
    && summaries.every(summary => summary[1] === '1' && summary[2] === '0')
    && !/RESCAN161_FAILURE|AUTH_SUBMITTED|SAVE_SUBMITTED|TEST (?:FAILED|SKIPPED)|retrying|restarting after/i.test(log)
    && lines.filter(line => /^RESCAN161_/.test(line)).every(line => MARKERS.includes(line));
  return { passed: Boolean(passed), stage: passed ? 'readonly-rescan-proven' : 'unproven-no-retry',
    ...(!passed ? { reason: stopped || 'EXACT_SINGLE_READONLY_METHOD_NOT_PROVEN' } : {}) };
}

export function verifyInstalled({ io = fs, installed, app, prep }) {
  check(typeof installed === 'string' && installed.startsWith(`/Users/GOIKO/Library/Developer/CoreSimulator/Devices/${DEVICE}/data/Containers/Bundle/Application/`)
    && path.basename(installed) === 'App.app' && io.realpathSync(installed) === installed, 'INSTALLED_APP_PATH_HOLD');
  for (const file of ['App', 'Info.plist', 'capacitor.config.json', ...Object.keys(prep.webResources).map(file => 'public/' + file)]) {
    const resident = path.join(installed, file);
    check(io.realpathSync(resident) === resident && io.lstatSync(resident).isFile()
      && !io.lstatSync(resident).isSymbolicLink(), 'INSTALLED_FILE_PATH_HOLD');
    check(sha(io.readFileSync(resident)) === sha(io.readFileSync(path.join(app, file))), 'INSTALLED_CANDIDATE_MISMATCH');
  }
}

export function bindLatestAsset(rows, { io = fs, media = MEDIA, expected = INPUT_SHA256 } = {}) {
  check(Array.isArray(rows) && rows.length > 0 && rows.length <= 2, 'PHOTO_ROWS_UNAVAILABLE');
  const row = rows[0];
  check(row && typeof row.filename === 'string' && /^[a-z\d_.-]+$/i.test(row.filename)
    && typeof row.directory === 'string' && /^DCIM\/[a-z\d_-]+$/i.test(row.directory)
    && Number.isFinite(row.added) && row.added > 0
    && (rows.length === 1 || (Number.isFinite(rows[1]?.added) && row.added > rows[1].added)), 'LATEST_PHOTO_AMBIGUOUS');
  const resident = path.join(media, row.directory, row.filename);
  check(io.realpathSync(media) === media && io.realpathSync(resident) === resident
    && io.lstatSync(resident).isFile() && !io.lstatSync(resident).isSymbolicLink(), 'PHOTO_RESIDENT_PATH_HOLD');
  check(sha(io.readFileSync(resident)) === expected, 'LATEST_ADDED_NOT_RESCAN161_INPUT');
  return { ...row, resident, sha256: expected };
}

export function queryLatestRows({ io = fs, exec = execFileSync, env }) {
  const database = MEDIA + '/PhotoData/Photos.sqlite';
  check(io.realpathSync(database) === database && io.lstatSync(database).isFile()
    && !io.lstatSync(database).isSymbolicLink(), 'PHOTO_DATABASE_PATH_HOLD');
  // The live WAL must remain visible. No import, copy, checkpoint or immutable mode.
  return JSON.parse(exec('/usr/bin/sqlite3', ['-readonly', '-json', '-cmd', '.timeout 1000', database, PHOTO_SQL],
    { env, encoding: 'utf8', timeout: 3000, maxBuffer: 65536 }));
}

export function attestPhoto({ io = fs, exec = execFileSync, repo, env }) {
  const prepared = path.join(repo, INPUT_FILE);
  check(io.realpathSync(prepared) === prepared && io.lstatSync(prepared).isFile()
    && !io.lstatSync(prepared).isSymbolicLink(), 'INPUT_PHOTO_PATH_HOLD');
  check(sha(io.readFileSync(prepared)) === INPUT_SHA256, 'RESCAN161_INPUT_CHANGED');
  return { ...bindLatestAsset(queryLatestRows({ io, exec, env }), { io }), prepared,
    attestedUTC: new Date().toISOString() };
}

export function verifyRetainedContext({ io = fs, repo }) {
  for (const [relative, digest] of [[PUBLIC_FILE, PUBLIC_SHA256], [BASELINE_FILE, BASELINE_SHA256]]) {
    const file = path.join(repo, relative);
    check(io.realpathSync(file) === file && io.lstatSync(file).isFile()
      && !io.lstatSync(file).isSymbolicLink(), 'RETAINED_CONTEXT_PATH_HOLD');
    check(sha(io.readFileSync(file)) === digest, 'RETAINED_CONTEXT_CHANGED');
  }
  const baseline = json(io, path.join(repo, BASELINE_FILE));
  check(baseline.passed === true && baseline.stage === 'existing-cellar-readback-proven'
    && baseline.account === 'info@winerim.com' && baseline.authSubmissionsRequested === 0
    && baseline.dataMutationsRequested === 0, 'BASELINE_READBACK_HOLD');
  const flor = baseline.records?.filter(row => row.name === 'Flor de Muga Blanco');
  check(flor?.length === 1 && flor[0].rating === 'love' && flor[0].vintageContext === '2022'
    && flor[0].personalVerdictTitle === 'Tu valoración: te encanta', 'BASELINE_SAVED_LOVE_HOLD');
  const observed = json(io, path.join(repo, PUBLIC_FILE));
  check(observed.queries?.some(query => query.status === 'complete' && query.rows?.some(row =>
    row.id === 279035 && row.name === 'Flor de Muga Blanco' && row.producer === 'Muga' && row.vintage === '2022')),
  'OBSERVED_PUBLIC_CONTEXT_HOLD');
  return { baselineSHA256: BASELINE_SHA256, publicObservationSHA256: PUBLIC_SHA256,
    baseline: 'cellar144-r5', rating: 'love', vintage: 2022, libraryIdContextOnly: 279035 };
}

const UUID = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const KEYS = ['schemaVersion', 'runId', 'inputSHA256', 'account', 'name', 'producer', 'vintage',
  'vintagePhotoCertified', 'vintageWarning', 'selectionScope', 'selectedPublicId', 'proposalCount',
  'personalRating', 'personalVerdictTitle', 'current', 'currentLabel', 'dimensions', 'provenance',
  'newSavePersistenceValidated'].sort();
export const SELECTION_SCOPE = 'Explicit literal name/producer/2022 proposal after warning; public ID not independently exposed; not photo-certified vintage';
export function parseReadback(value, runId) {
  check(value && typeof value === 'object' && !Array.isArray(value)
    && JSON.stringify(Object.keys(value).sort()) === JSON.stringify(KEYS), 'READBACK_SCHEMA_HOLD');
  check(UUID.test(runId) && value.runId === runId && value.schemaVersion === 1
    && value.inputSHA256 === INPUT_SHA256 && value.account === 'info@winerim.com', 'READBACK_RUN_HOLD');
  check(value.name === 'Flor de Muga Blanco' && value.producer === 'Muga' && value.vintage === 2022,
    'READBACK_IDENTITY_HOLD');
  check(value.vintagePhotoCertified === false && value.vintageWarning === 'Elegirla cambiará tu añada a'
    && value.selectionScope === SELECTION_SCOPE && value.selectedPublicId === null
    && Number.isSafeInteger(value.proposalCount) && value.proposalCount >= 1 && value.proposalCount <= 20,
  'READBACK_SELECTION_HOLD');
  check(value.personalRating === 'love' && value.personalVerdictTitle === 'Tu valoración: te encanta',
    'READBACK_SAVED_VERDICT_HOLD');
  check(Number.isInteger(value.current) && value.current >= 0 && value.current <= 100
    && value.currentLabel === 'Afinidad orientativa: ' + value.current + ' de 100', 'READBACK_CURRENT_HOLD');
  const axes = new Set();
  check(Array.isArray(value.dimensions) && value.dimensions.length === 5, 'READBACK_DIMENSIONS_HOLD');
  for (const label of value.dimensions) {
    const match = typeof label === 'string' && label.match(/^(potencia|acidez|dulzor|tanino|fruta): tu perfil ([0-9]+[.][0-9])\/5; este vino ([0-9]+[.][0-9])\/5$/);
    check(match && !axes.has(match[1]) && match.slice(2).every(raw => Number(raw) >= 0 && Number(raw) <= 5),
      'READBACK_DIMENSIONS_HOLD');
    axes.add(match[1]);
  }
  check(typeof value.provenance === 'string' && value.provenance.startsWith('Fuente: ficha pública Winerim.')
    && value.newSavePersistenceValidated === false, 'READBACK_SCOPE_HOLD');
  return value;
}

export function verifyEvidence({ io = fs, output, runId }) {
  const folder = output + '/attachments', manifestFile = folder + '/manifest.json';
  check(io.realpathSync(manifestFile) === manifestFile && io.lstatSync(manifestFile).isFile()
    && !io.lstatSync(manifestFile).isSymbolicLink(), 'EVIDENCE_MANIFEST_PATH_HOLD');
  const manifest = json(io, manifestFile);
  check(Array.isArray(manifest) && manifest.length === 1
    && [METHOD, METHOD + '()'].includes(manifest[0]?.testIdentifier), 'EVIDENCE_METHOD_HOLD');
  const attachments = manifest[0].attachments;
  check(Array.isArray(attachments) && attachments.every(row => row.deviceId === DEVICE
    && row.configurationName === 'Rescan161Once' && row.repetitionNumber === 1
    && row.isAssociatedWithFailure === false), 'EVIDENCE_RUN_HOLD');
  const expected = [...VIEWS.flatMap(view => [[view, 'png'], [view + '-ax', 'txt']]),
    ['first-image-ax', 'txt'], ['selected-proposal-ax', 'txt'], ['selected-vintage-scope', 'txt'],
    ['detail-audit', 'txt'], ['scope', 'txt'], ['readback', 'json']];
  for (const step of [0, 1]) {
    const prefix = 'rescan161-07-completion-' + step + '-';
    if (attachments.some(row => row.suggestedHumanReadableName?.startsWith(prefix))) {
      for (const phase of ['before', 'after']) expected.push(...[
        ['07-completion-' + step + '-' + phase, 'png'], ['07-completion-' + step + '-' + phase + '-ax', 'txt']]);
    }
  }
  const seen = new Set(), consumed = new Set();
  let recordFile;
  for (const [name, extension] of expected) {
    const matching = attachments.filter(row => row.suggestedHumanReadableName?.startsWith('rescan161-' + name + '_')
      && row.exportedFileName?.endsWith('.' + extension));
    check(matching.length === 1, 'EVIDENCE_MISSING_OR_REPEATED');
    const row = matching[0];
    check(!consumed.has(row), 'EVIDENCE_ALIAS_HOLD'); consumed.add(row);
    if (extension === 'json') recordFile = folder + '/' + safeEvidenceName(row);
  }
  for (const row of attachments) {
    // Xcode also exports its own snapshots, synthesized events and recording. No unknown custom evidence.
    check(consumed.has(row) || /^(?:UI Snapshot |Synthesized Event |Screen Recording )/.test(row.suggestedHumanReadableName || ''),
      'EVIDENCE_UNEXPECTED_ATTACHMENT');
    const name = safeEvidenceName(row); check(!seen.has(name), 'EVIDENCE_PATH_HOLD'); seen.add(name);
    const file = folder + '/' + name;
    check(io.realpathSync(file) === file && io.lstatSync(file).isFile()
      && !io.lstatSync(file).isSymbolicLink() && io.statSync(file).size > 0, 'EVIDENCE_FILE_HOLD');
  }
  check(recordFile, 'READBACK_REQUIRED');
  const record = parseReadback(json(io, recordFile), runId);
  return { record, selectedPublicId: null, selectionScope: SELECTION_SCOPE,
    newSavePersistenceValidated: false, photoCertifiedVintage: false };
}
function safeEvidenceName(row) {
  check(typeof row.exportedFileName === 'string'
    && /^[a-z\d-]+(?:\.(?:png|txt|json|mp4))?$/i.test(row.exportedFileName), 'EVIDENCE_PATH_HOLD');
  return row.exportedFileName;
}

export async function runRescan161({ argv = process.argv.slice(2), repo = process.cwd(), io = fs,
  exec = execFileSync, start = spawn, environment = process.env, now = Date.now,
  photoAttestor = attestPhoto, contextVerifier = verifyRetainedContext,
  timers = { setTimeout, clearTimeout, setInterval, clearInterval },
  killGroup = (pid, signal) => process.kill(-pid, signal) } = {}) {
  const env = sanitizedEnvironment(environment), base = path.join(repo, 'qa-artifacts/continuation161-20261022');
  const deadline = now() + 240000;
  const receipt = { passed: false, stage: 'preflight', startedUTC: new Date().toISOString(), device: DEVICE, bundle,
    account: 'info@winerim.com', authSubmissionsRequested: 0, dataMutationsRequested: 0,
    cloudAnalysisControlsRequested: 0, harnessNetworkRequests: 0, newSavePersistenceValidated: false,
    photoCertifiedVintage: false, selectedPublicId: null,
    scope: 'Existing QA session and saved love baseline cellar144-r5. Source gallery; byte-attested new public bottle PNG; local Apple Vision; named public proposal explicitly selects2022 after warning. Literal name/producer/year only, no canonical-ID claim among duplicate public records. Native numeric style comparison and all five axes with saved personal verdict primary. No auth, typing, rating, save, logout, quiz or model controls; no new persistence or taste-accuracy claim. App public/background reads may occur; no packet-level network-zero claim.',
    privacy: 'Private screenshots, AX, JSON, logs, xcresult and exclusive-create receipt. No credentials/session files read.' };
  let output, prep, app, installed, created = false, attested;
  const pins = new Map(), boundInputs = new Set();
  const budget = () => { check(now() < deadline - 5000, 'WALL_LIMIT'); return deadline - now() - 5000; };
  const guard = () => {
    budget();
    if (created) check(io.realpathSync(output) === output && !io.lstatSync(output).isSymbolicLink(), 'OUTPUT_PATH_HOLD');
    checkLeases(json(io, LEASE_FILE).leases, env, now());
    const disk = io.statfsSync(base);
    check(disk.bavail * disk.bsize >= 5 * 1024 ** 3, 'LOW_DISK_HOLD');
  };
  const execute = (cmd, args, options = {}) => {
    guard();
    return exec(cmd, args, { ...options, env, timeout: Math.max(1, Math.min(options.timeout || 10000, budget())) });
  };
  const regular = file => check(io.realpathSync(file) === file && io.lstatSync(file).isFile()
    && !io.lstatSync(file).isSymbolicLink(), 'INPUT_PATH_HOLD');
  const verify = () => {
    for (const [file, digest] of pins) { regular(file); check(sha(io.readFileSync(file)) === digest, 'SOURCE_OR_HARNESS_CHANGED'); }
    for (const file of boundInputs) regular(file);
    verifyArtifact({ io, exec: execute, repo, prep, app });
    if (installed) verifyInstalled({ io, installed, app, prep });
  };
  const photo = () => {
    guard();
    const fresh = photoAttestor({ io, exec: execute, repo, env });
    check(fresh.prepared === path.join(repo, INPUT_FILE) && fresh.sha256 === INPUT_SHA256, 'PHOTO_ATTESTATION_HOLD');
    if (attested) check(fresh.resident === attested.resident && fresh.added === attested.added, 'PHOTO_LIBRARY_CHANGED');
    return fresh;
  };
  const privateTree = folder => {
    check(!io.lstatSync(folder).isSymbolicLink(), 'OUTPUT_SYMLINK_HOLD');
    io.chmodSync(folder, 0o700);
    for (const entry of io.readdirSync(folder, { withFileTypes: true })) {
      const file = path.join(folder, entry.name);
      // Xcode product symlinks remain protected by the private parent. Never follow them.
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) privateTree(file);
      else io.chmodSync(file, io.statSync(file).mode & 0o111 ? 0o700 : 0o600);
    }
  };
  const pinTree = folder => {
    check(io.realpathSync(folder) === folder && !io.lstatSync(folder).isSymbolicLink(), 'HARNESS_SYMLINK_HOLD');
    for (const entry of io.readdirSync(folder, { withFileTypes: true })) {
      check(!entry.isSymbolicLink(), 'HARNESS_SYMLINK_HOLD');
      const file = path.join(folder, entry.name);
      if (entry.isDirectory()) pinTree(file); else { regular(file); pins.set(file, sha(io.readFileSync(file))); }
    }
  };
  const run = async (name, args) => {
    guard(); verify();
    if (name === 'runtime') { attested = photo(); write(io, output + '/PHOTO-ATTESTATION.json', attested); }
    const log = output + '/' + name + '.log', fd = io.openSync(log, 'wx', 0o600);
    let child, timer, watcher, hardTimer, stopped = null, hardDone;
    const stop = reason => {
      if (stopped) return;
      stopped = reason;
      const kill = signal => { if (Number.isSafeInteger(child?.pid) && child.pid > 1) {
        try { killGroup(child.pid, signal); } catch { try { child.kill(signal); } catch { /* Already gone. */ } }
      } };
      kill('SIGINT');
      hardDone = new Promise(resolve => { hardTimer = timers.setTimeout(() => { kill('SIGKILL'); resolve(); }, 3000); });
    };
    const interrupt = () => stop('INTERRUPTED');
    try {
      const remaining = budget();
      child = start(developer + '/usr/bin/xcodebuild', args, { env, detached: true, stdio: ['ignore', fd, fd] });
      timer = timers.setTimeout(() => stop('WALL_LIMIT'), remaining);
      watcher = timers.setInterval(() => { try { guard(); verify(); if (name === 'runtime') photo(); } catch { stop('LEASE_DISK_SOURCE_OR_PHOTO_HOLD'); } }, 2000);
      for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(signal, interrupt);
      const result = await new Promise(resolve => {
        child.once('error', () => { stop('SPAWN_ERROR'); resolve({ code: null, spawnError: true }); });
        child.once('close', (code, signal) => {
          if (code !== 0 || signal) stop('CHILD_FAILED');
          resolve({ code, signal });
        });
      });
      timers.clearTimeout(timer); timers.clearInterval(watcher);
      if (hardDone) await hardDone;
      return { result, stopped, log: io.readFileSync(log, 'utf8') };
    } finally {
      timers.clearTimeout(timer); timers.clearTimeout(hardTimer); timers.clearInterval(watcher); io.closeSync(fd);
      for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.off(signal, interrupt);
    }
  };
  try {
    check(environment.MATCHRIM161_RUN_READONLY === 'YES', 'EXPLICIT_FUTURE_RUNTIME_AUTHORIZATION_REQUIRED');
    check(argv.length === 3 && argv.every(value => typeof value === 'string' && value.length), 'EXPECTED_PREP_APP_OUTPUT');
    app = path.resolve(repo, argv[1]); output = path.resolve(repo, argv[2]);
    check(path.dirname(output) === base && /^rescan161-[\w-]+$/.test(path.basename(output)) && !io.existsSync(output), 'FRESH_OUTPUT_REQUIRED');
    check(io.realpathSync(base) === base, 'OUTPUT_PARENT_SYMLINK_HOLD');
    guard();
    const prepFile = path.resolve(repo, argv[0], 'preparation.json'); regular(prepFile); prep = json(io, prepFile);
    check(Number.isFinite(Date.parse(prep.startedUTC)) && now() >= Date.parse(prep.startedUTC)
      && now() - Date.parse(prep.startedUTC) < 24 * 3600000, 'FRESH_PREPARATION_REQUIRED');
    check(prep.publicConfiguration?.fixtures === false && prep.publicConfiguration?.analytics === false
      && prep.publicConfiguration?.masterConfigured === false && prep.publicConfiguration?.envDir === false,
    'REAL_PUBLIC_READONLY_CONFIGURATION_REQUIRED');
    for (const file of REQUIRED_SOURCES) check(Object.hasOwn(prep.sourceFingerprints || {}, file), 'MISSING_SOURCE_BINDING');
    // Validate manifest paths before the account114 verifier reads them; no traversal or private-file discovery.
    for (const [file, digest] of Object.entries(prep.sourceFingerprints || {})) {
      check((/^(?:src|public|ios)\//.test(file)
          || ['index.html', 'package.json', 'package-lock.json', 'tailwind.config.ts', 'postcss.config.js', 'tsconfig.app.json'].includes(file))
        && !file.split(/[\\/]/).some(part => !part || part === '..' || (part.startsWith('.') && part !== '.gitignore'))
        && !/credential|keychain|cookies|private-access|\.pem$|\.p12$|\.mobileprovision$/i.test(file)
        && /^[a-f\d]{64}$/.test(digest), 'SOURCE_MANIFEST_PATH_HOLD');
      const source = path.resolve(repo, file); regular(source); boundInputs.add(source);
    }
    check(prep.webResources && Object.hasOwn(prep.webResources, 'index.html'), 'EMPTY_WEB_MANIFEST');
    for (const [file, digest] of Object.entries(prep.webResources)) {
      check(!path.isAbsolute(file) && !file.split(/[\\/]/).some(part => !part || part === '..' || part.startsWith('.'))
        && /^[a-f\d]{64}$/.test(digest), 'WEB_MANIFEST_PATH_HOLD');
      const resource = path.join(app, 'public', file); regular(resource); boundInputs.add(resource);
    }
    for (const file of ['App', 'Info.plist', 'capacitor.config.json']) {
      const artifact = path.join(app, file); regular(artifact); boundInputs.add(artifact);
    }
    regular(nativeReceiptPath(app));
    check(typeof prep.production === 'string' && path.isAbsolute(prep.production), 'PRODUCTION_PATH_HOLD');
    regular(path.join(prep.production, 'ios/App/App/capacitor.config.json'));
    boundInputs.add(path.join(prep.production, 'ios/App/App/capacitor.config.json'));
    verify();
    Object.assign(receipt, contextVerifier({ io, repo })); attested = photo();
    installed = execute('/usr/bin/xcrun', ['simctl', 'get_app_container', DEVICE, bundle, 'app'], { encoding: 'utf8' }).trim();
    verify();
    const probe = path.join(repo, 'scripts/MatchrimRescan161Probe.swift');
    const harness = path.join(repo, 'qa-artifacts/native99-20261021/native-audit-project');
    for (const file of [prepFile, nativeReceiptPath(app), probe, attested.prepared,
      path.join(repo, PUBLIC_FILE), path.join(repo, BASELINE_FILE),
      ...['qa-matchrim-rescan161.mjs', 'check-matchrim-rescan161.mjs', 'qa-matchrim-account114.mjs'].map(name => path.join(repo, 'scripts', name))]) {
      regular(file); pins.set(file, sha(io.readFileSync(file)));
    }
    pinTree(harness + '/Probe97.xcodeproj');
    regular(harness + '/Probe97.xctestplan');
    pins.set(harness + '/Probe97.xctestplan', sha(io.readFileSync(harness + '/Probe97.xctestplan')));
    const runId = randomUUID(), plan = makePlan(json(io, harness + '/Probe97.xctestplan'), runId);
    io.mkdirSync(output, { mode: 0o700 }); created = true;
    check((io.statSync(output).mode & 0o777) === 0o700, 'PRIVATE_OUTPUT_REQUIRED');
    const project = output + '/project'; io.mkdirSync(project, { mode: 0o700 });
    io.cpSync(harness + '/Probe97.xcodeproj', project + '/Probe97.xcodeproj', { recursive: true });
    write(io, project + '/Probe97.xctestplan', plan);
    io.writeFileSync(project + '/AutomationModeProbe.swift', io.readFileSync(probe), { mode: 0o600, flag: 'wx' });
    privateTree(project); pinTree(project);
    receipt.build = prep.build; receipt.sourceCommit = prep.commit; receipt.runId = runId; receipt.probeSHA256 = pins.get(probe); receipt.inputSHA256 = INPUT_SHA256;
    const common = ['-project', project + '/Probe97.xcodeproj', '-scheme', 'Probe97', '-testPlan', 'Probe97',
      '-only-test-configuration', 'Rescan161Once', '-destination', 'id=' + DEVICE, '-derivedDataPath', output + '/derived',
      '-collect-test-diagnostics', 'never', '-parallel-testing-enabled', 'NO', '-disableAutomaticPackageResolution', '-skipPackageUpdates',
      '-jobs', '1', 'CODE_SIGNING_ALLOWED=NO', 'PRODUCT_BUNDLE_IDENTIFIER=wine.matchrim.qa161.rescan.uitests', 'ONLY_ACTIVE_ARCH=YES'];
    receipt.stage = 'compile';
    const compiled = await run('compile', ['build-for-testing', ...common]);
    check(compiled.result.code === 0 && !compiled.result.signal && !compiled.result.spawnError && !compiled.stopped
      && !/RESCAN161_|Test Case '|AUTH_SUBMITTED|SAVE_SUBMITTED/.test(compiled.log), 'COMPILE_PREFLIGHT_FAILED');
    receipt.stage = 'runtime';
    const executed = await run('runtime', ['test-without-building', ...common, '-resultBundlePath', output + '/result.xcresult',
      '-only-testing:' + plan.testTargets[0].target.name + '/' + METHOD]);
    Object.assign(receipt, evaluate(executed.log, executed.result, executed.stopped));
    guard(); verify(); photo();
    check(io.existsSync(output + '/result.xcresult'), 'RESULT_BUNDLE_UNAVAILABLE');
    execute('/usr/bin/xcrun', ['xcresulttool', 'export', 'attachments', '--path', output + '/result.xcresult',
      '--output-path', output + '/attachments'], { encoding: 'utf8', timeout: 10000 });
    guard(); verify(); photo();
    if (receipt.passed) Object.assign(receipt, verifyEvidence({ io, output, runId }));
  } catch (error) {
    receipt.passed = false;
    if (receipt.stage === 'readonly-rescan-proven') receipt.stage = 'post-runtime-evidence-hold';
    receipt.reason = /^[A-Z][A-Z0-9_]+$/.test(error.message) ? error.message : 'LOCAL_HOLD_DETAILS_WITHHELD';
  } finally {
    receipt.finishedUTC = new Date().toISOString();
    if (created) {
      try {
        check(io.realpathSync(output) === output, 'OUTPUT_PATH_HOLD');
        privateTree(output);
        write(io, output + '/RESULT.json', receipt);
      } catch { receipt.passed = false; receipt.reason = 'OUTPUT_PRIVACY_HOLD'; }
    }
  }
  return { receipt, output };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.umask(0o077);
  const { receipt } = await runRescan161();
  console.log(JSON.stringify({ passed: receipt.passed, stage: receipt.stage, reason: receipt.reason }));
  process.exitCode = receipt.passed ? 0 : 1;
}
