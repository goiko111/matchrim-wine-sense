import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { checkLeases, verifyArtifact, nativeReceiptPath } from './qa-matchrim-account114.mjs';

export const DEVICE = 'B18822EF-BFBD-4A6A-89B2-33539BDE4127';
export const METHOD = 'MatchrimCellar144Tests/testExistingQAReadOnlyCellar144';
export const LEASE_FILE = '/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json';
export const VIEWS = ['01-profile', '02-bodega-before-category', '03-probados',
  '04-rating-first', '05-rating-first', '06-flor-readback', '07-gitana-readback'];
export const MARKERS = ['CELLAR144_EXISTING_QA_IDENTITY', 'CELLAR144_PROBADOS_KNOWN_CARDS',
  'CELLAR144_FLOR_READBACK', 'CELLAR144_GITANA_READBACK', 'CELLAR144_READONLY_COMPLETE'];
export const REQUIRED_SOURCES = ['src/App.tsx', 'src/pages/Profile.tsx', 'src/pages/MyWines.tsx',
  'src/components/MobileBottomNav.tsx', 'src/components/NativeProfileLayout133.tsx',
  'src/components/NativeCellarToolbar98.tsx', 'src/components/NativeCellarItem98.tsx',
  'src/components/CellarWineAffinity.tsx', 'src/components/CellarReferenceStyle110.tsx',
  'src/components/NativeAffinitySummary.tsx', 'src/components/AffinityExplanation.tsx',
  'src/components/NativeWinePhoto98.tsx', 'src/utils/bodegaAffinity.ts',
  'src/utils/cellarReferenceStyle110.ts', 'src/utils/cellarPublicReference107.ts',
  'src/utils/consumerAffinity95.ts', 'src/utils/wineAffinityExplanation.ts',
  'src/utils/scanProfile.ts', 'src/utils/winerimOriginalSheet.ts', 'src/contexts/AuthContext.tsx'];
export const WINES = [
  { name: 'Flor de Muga Blanco', rating: 'love', ratingLabel: 'Ya sabes que te gusta',
    libraryIdContextOnly: 279035, vintageContext: '2022', evidenceName: '06-flor-readback', attachment: 'flor-record' },
  { name: 'Manzanilla La Gitana', rating: 'not_for_me', ratingLabel: 'Ya sabes que no te gusta',
    libraryIdContextOnly: 278688, vintageContext: 'NV', evidenceName: '07-gitana-readback', attachment: 'gitana-record' },
];
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
  return { version: 1, configurations: [{ id: randomUUID(), name: 'Cellar144Once', options: {} }],
    defaultOptions: { testTimeoutsEnabled: true, defaultTestExecutionTimeAllowance: 220,
      maximumTestExecutionTimeAllowance: 220, testRepetitionMode: 'fixedIterations', maximumTestRepetitions: 1,
      testRepetitionRelaunchEnabled: false, codeCoverage: false,
      environmentVariableEntries: [{ key: 'MATCHRIM144_RUN_ID', value: runId }] },
    testTargets: [{ target: { name: target.name, identifier: target.identifier, containerPath: target.containerPath },
      parallelizable: false, selectedTests: [METHOD] }] };
}

export function evaluate(log, result, stopped = null) {
  const lines = log.split(/\r?\n/), count = marker => lines.filter(line => line === marker).length;
  const events = [...log.matchAll(/^Test Case '([^'\r\n]+)' (started|passed|failed|skipped)(?:[.\t ][^\r\n]*)?\r?$/gm)];
  const expected = /^-\[(?:\w+\.)?MatchrimCellar144Tests testExistingQAReadOnlyCellar144\]$/;
  const summaries = [...log.matchAll(/Executed (\d+) tests?, with (\d+) failures/g)];
  const positions = MARKERS.map(marker => lines.indexOf(marker));
  const start = lines.findIndex(line => /^Test Case '.*' started\./.test(line));
  const end = lines.findIndex(line => /^Test Case '.*' passed[. ]/.test(line));
  const passed = result?.code === 0 && !result.signal && !result.spawnError && !stopped
    && MARKERS.every(marker => count(marker) === 1)
    && positions.every((position, index) => !index || position > positions[index - 1])
    && start >= 0 && end > start && positions[0] > start && positions.at(-1) < end
    && events.length === 2 && events[0][2] === 'started' && events[1][2] === 'passed'
    && events.every(event => expected.test(event[1])) && summaries.length > 0
    && summaries.every(summary => summary[1] === '1' && summary[2] === '0')
    && !/CELLAR144_FAILURE|AUTH_SUBMITTED|SAVE_SUBMITTED|TEST (?:FAILED|SKIPPED)|retrying|restarting after/i.test(log)
    && lines.filter(line => /^CELLAR144_/.test(line)).every(line => MARKERS.includes(line));
  return { passed: Boolean(passed), stage: passed ? 'existing-cellar-readback-proven' : 'unproven-no-retry',
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

const score = value => Number.isInteger(value) && value >= 0 && value <= 100;
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const UUID = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const RECORD_KEYS = ['schemaVersion', 'runId', 'account', 'name', 'rating', 'ratingLabel',
  'libraryIdContextOnly', 'vintageContext', 'vintageEvidence', 'categoryLabel', 'current',
  'currentLabel', 'scoreKind', 'initialPresent', 'initial', 'initialLabel', 'initialUnavailableReason',
  'firstVerifiedLabels', 'explanation', 'provenance', 'evidenceName', 'newSavePersistenceValidated'].sort();

export function parseReadback(value, expected, runId) {
  check(value && typeof value === 'object' && !Array.isArray(value)
    && JSON.stringify(Object.keys(value).sort()) === JSON.stringify(RECORD_KEYS), 'READBACK_SCHEMA_HOLD');
  check(UUID.test(runId) && value.runId === runId && value.schemaVersion === 1
    && value.account === 'info@winerim.com' && value.newSavePersistenceValidated === false, 'READBACK_RUN_HOLD');
  for (const key of ['name', 'rating', 'ratingLabel', 'libraryIdContextOnly', 'vintageContext', 'evidenceName']) {
    check(value[key] === expected[key], 'READBACK_IDENTITY_HOLD');
  }
  check(expected.vintageContext === '2022' ? value.vintageEvidence === '2022'
    : value.vintageEvidence === 'NV not independently exposed by this UI', 'READBACK_VINTAGE_HOLD');
  check(/^Probados[0-9]+$/.test(value.categoryLabel) && score(value.current), 'READBACK_CURRENT_HOLD');
  const byStyle = value.scoreKind === 'reference-style';
  check(byStyle || value.scoreKind === 'exact-affinity', 'READBACK_KIND_HOLD');
  check(value.currentLabel === '\u2248' + value.current + '/100' + (byStyle ? ' para ti' : ''), 'READBACK_CURRENT_LABEL_HOLD');
  check(typeof value.initialPresent === 'boolean', 'READBACK_INITIAL_FLAG_HOLD');
  if (value.initialPresent) {
    check(score(value.initial) && nonempty(value.initialLabel) && value.initialUnavailableReason === null, 'READBACK_INITIAL_HOLD');
    const match = value.initialLabel.match(byStyle ? /^Al guardar: \u2248([0-9]{1,3})\/100 por estilo\.(?:.*)$/
      : /^Al guardar: ([0-9]{1,3})\/100(?:.*)$/);
    check(match && Number(match[1]) === value.initial, 'READBACK_INITIAL_LABEL_HOLD');
  } else {
    check(value.initial === null && value.initialLabel === null
      && value.initialUnavailableReason === 'Initial-at-save not exposed in this readback; historical data gap',
    'READBACK_INITIAL_UNAVAILABLE_HOLD');
  }
  check(Array.isArray(value.firstVerifiedLabels) && value.firstVerifiedLabels.every(label =>
    typeof label === 'string' && /^Primera afinidad registrada:/.test(label)), 'READBACK_FIRST_VERIFIED_HOLD');
  check(Array.isArray(value.explanation) && value.explanation.length > 0 && value.explanation.every(nonempty)
    && nonempty(value.provenance) && value.provenance.includes(byStyle
      ? 'La ficha pública no especifica' : 'Basado en tu perfil y en la ficha de este vino.'), 'READBACK_PROVENANCE_HOLD');
  return value;
}

export function verifyEvidence({ io = fs, output, runId }) {
  const folder = output + '/attachments', manifest = json(io, folder + '/manifest.json');
  check(Array.isArray(manifest) && manifest.length === 1
    && [METHOD, METHOD + '()'].includes(manifest[0]?.testIdentifier), 'EVIDENCE_METHOD_HOLD');
  const attachments = manifest[0].attachments;
  check(Array.isArray(attachments) && attachments.every(row => row.deviceId === DEVICE
    && row.configurationName === 'Cellar144Once' && row.repetitionNumber === 1
    && !row.isAssociatedWithFailure), 'EVIDENCE_RUN_HOLD');
  const expected = [...VIEWS.flatMap(view => [[view, 'png'], [view + '-ax', 'txt']]),
    ['scope', 'txt'], ...WINES.map(wine => [wine.attachment, 'json'])];
  check(attachments.length === expected.length, 'EVIDENCE_COUNT_HOLD');
  const seen = new Set(), records = [];
  for (const [name, extension] of expected) {
    const matching = attachments.filter(row => row.suggestedHumanReadableName?.startsWith('cellar144-' + name + '_')
      && row.exportedFileName?.endsWith('.' + extension));
    check(matching.length === 1, 'EVIDENCE_MISSING_OR_REPEATED');
    const fileName = matching[0].exportedFileName;
    check(/^[a-z\d-]+\.(?:png|txt|json)$/i.test(fileName) && !seen.has(fileName), 'EVIDENCE_PATH_HOLD');
    seen.add(fileName);
    const file = folder + '/' + fileName;
    check(io.realpathSync(file) === file && !io.lstatSync(file).isSymbolicLink() && io.lstatSync(file).isFile()
      && io.statSync(file).size > 0, 'EVIDENCE_FILE_HOLD');
    if (extension === 'json') records.push(parseReadback(json(io, file), WINES.find(wine => wine.attachment === name), runId));
  }
  check(records.length === 2 && new Set(records.map(row => row.name)).size === 2, 'BOTH_READBACKS_REQUIRED');
  return { records, historicalDataGap: records.some(row => !row.initialPresent),
    initialUnavailableFor: records.filter(row => !row.initialPresent).map(row => row.name),
    initialCurrentNewSavePersistenceValidated: false };
}

export async function runCellar144({ argv = process.argv.slice(2), repo = process.cwd(), io = fs,
  exec = execFileSync, start = spawn, environment = process.env, now = Date.now,
  timers = { setTimeout, clearTimeout, setInterval, clearInterval },
  killGroup = (pid, signal) => process.kill(-pid, signal) } = {}) {
  const env = sanitizedEnvironment(environment), base = path.join(repo, 'qa-artifacts/night105-20261021');
  const deadline = now() + 240000;
  const receipt = { passed: false, stage: 'preflight', startedUTC: new Date().toISOString(), device: DEVICE, bundle,
    account: 'info@winerim.com', authSubmissionsRequested: 0, dataMutationsRequested: 0,
    analysisOrMatchingActionsRequested: 0, harnessNetworkRequests: 0,
    initialCurrentNewSavePersistenceValidated: false, historicalDataGap: null,
    scope: 'Existing literal QA account; Probados; only Flor de Muga Blanco2022 and Manzanilla La GitanaNV. Current and initial-at-save are parsed only from exposed UI labels; a first-verified score is not a saved initial. No new-save persistence or taste-accuracy assertion. No auth, save, rating, stock, edit, delete, logout, quiz, reanalysis, photo or model action. No network request issued by harness. App background reads and image lookups may occur; no packet-level network-zero claim.',
    privacy: 'Private screenshot, AX, JSON readbacks, logs, xcresult and exclusive-create receipt. No session or credential files read.' };
  let output, prep, app, installed, created = false;
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
      watcher = timers.setInterval(() => { try { guard(); verify(); } catch { stop('LEASE_DISK_OR_SOURCE_HOLD'); } }, 2000);
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
    check(environment.MATCHRIM144_RUN_READONLY === 'YES', 'EXPLICIT_FUTURE_RUNTIME_AUTHORIZATION_REQUIRED');
    check(argv.length === 3 && argv.every(value => typeof value === 'string' && value.length), 'EXPECTED_PREP_APP_OUTPUT');
    app = path.resolve(repo, argv[1]); output = path.resolve(repo, argv[2]);
    check(path.dirname(output) === base && /^cellar144-[\w-]+$/.test(path.basename(output)) && !io.existsSync(output), 'FRESH_OUTPUT_REQUIRED');
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
    installed = execute('/usr/bin/xcrun', ['simctl', 'get_app_container', DEVICE, bundle, 'app'], { encoding: 'utf8' }).trim();
    verify();
    const probe = path.join(repo, 'scripts/MatchrimCellar144Probe.swift');
    const harness = path.join(repo, 'qa-artifacts/native99-20261021/native-audit-project');
    for (const file of [prepFile, nativeReceiptPath(app), probe,
      ...['qa-matchrim-cellar144.mjs', 'check-matchrim-cellar144.mjs', 'qa-matchrim-account114.mjs'].map(name => path.join(repo, 'scripts', name))]) {
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
    receipt.build = prep.build; receipt.sourceCommit = prep.commit; receipt.runId = runId; receipt.probeSHA256 = pins.get(probe);
    const common = ['-project', project + '/Probe97.xcodeproj', '-scheme', 'Probe97', '-testPlan', 'Probe97',
      '-only-test-configuration', 'Cellar144Once', '-destination', 'id=' + DEVICE, '-derivedDataPath', output + '/derived',
      '-collect-test-diagnostics', 'never', '-parallel-testing-enabled', 'NO', '-disableAutomaticPackageResolution', '-skipPackageUpdates',
      '-jobs', '1', 'CODE_SIGNING_ALLOWED=NO', 'PRODUCT_BUNDLE_IDENTIFIER=wine.matchrim.qa144.cellar.uitests', 'ONLY_ACTIVE_ARCH=YES'];
    receipt.stage = 'compile';
    const compiled = await run('compile', ['build-for-testing', ...common]);
    check(compiled.result.code === 0 && !compiled.result.signal && !compiled.result.spawnError && !compiled.stopped
      && !/CELLAR144_|Test Case '|AUTH_SUBMITTED|SAVE_SUBMITTED/.test(compiled.log), 'COMPILE_PREFLIGHT_FAILED');
    receipt.stage = 'runtime';
    const executed = await run('runtime', ['test-without-building', ...common, '-resultBundlePath', output + '/result.xcresult',
      '-only-testing:' + plan.testTargets[0].target.name + '/' + METHOD]);
    Object.assign(receipt, evaluate(executed.log, executed.result, executed.stopped));
    guard(); verify();
    check(io.existsSync(output + '/result.xcresult'), 'RESULT_BUNDLE_UNAVAILABLE');
    execute('/usr/bin/xcrun', ['xcresulttool', 'export', 'attachments', '--path', output + '/result.xcresult',
      '--output-path', output + '/attachments'], { encoding: 'utf8', timeout: 10000 });
    guard(); verify();
    if (receipt.passed) Object.assign(receipt, verifyEvidence({ io, output, runId }));
  } catch (error) {
    receipt.passed = false;
    if (receipt.stage === 'existing-cellar-readback-proven') receipt.stage = 'post-runtime-evidence-hold';
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
  const { receipt } = await runCellar144();
  console.log(JSON.stringify({ passed: receipt.passed, stage: receipt.stage, reason: receipt.reason }));
  process.exitCode = receipt.passed ? 0 : 1;
}

