import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as comparison from '../src/utils/wineComparison';
import * as money from '../src/utils/scanMoney';
import { buildAiRimContextGuidance } from '../src/utils/aiRimContextGuide';
import { manualWineIdentityNotice } from '../src/utils/manualWineIdentityNotice';
import { confirmWineCandidateIdentity, correctWineCandidateIdentity, normalizeWineCandidates } from '../src/utils/multiWineScan';
import { ImagePreparationError } from '../src/utils/imageAnalysis';
import { openAi92LegacyHandlers } from './matchrim-openai92-scope';
import { restoreNativeHubSvg96 } from './check-matchrim-scan-hub-svg96.mjs';
import { restoreNativeScanPrivacy96 } from './check-matchrim-scan-privacy96.mjs';
import { restoreNativeCellar97 } from './native-cellar97-scope.mjs';
import { restoreNativePolicy97 } from './native-policy97-scope.mjs';
import { restoreNativeSearch97 } from './native-search97-scope.mjs';
import { restoreNativeAuth97 } from './native-auth97-scope.mjs';

const snapshot = '0c1a29728fb2f6b7f033b7d5e68bc8ea8e5335b1';
const localRelease = '89d478d6a391c4594fa09d815bb6546fb874231b';
const localPricePaths = new Set(['src/utils/menuWineSave.ts', 'src/utils/scanWineEvidence.ts', 'src/utils/wineMenuScan.ts']);
const localOnlyPaths = ['src/components/wine-import/MenuPriceEditor.tsx', 'src/utils/menuPriceReview.ts', 'src/utils/menuWineSimilarity.ts'];
const manifestPath = 'docs/MATCHRIM_CLOUD_SOURCE_MANIFEST_2026-10-13.json';
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
assert.equal(readFileSync(manifestPath, 'utf8'), execFileSync('git', ['show', `${snapshot}:${manifestPath}`], { encoding: 'utf8' }));
assert.equal(manifest.localProductSourceCommit, '3e75f30abc79c6262f96b06515437aec1e728a90');
const hash = (data: Buffer) => createHash('sha256').update(data).digest('hex');
const search97Path = 'src/components/wine-import/WineSearchBar.tsx';
const search97Source = readFileSync(search97Path, 'utf8');
assert.equal(restoreNativeSearch97(search97Path, search97Source),
  execFileSync('git', ['show', `8327ee7e31fe73ab8edd90303de514147d13978d:${search97Path}`], { encoding: 'utf8' }),
  'Whole legacy search remains immutable beneath the reviewed native97 wrapper');
for (const candidate of [search97Source + '\n// undeclared search change\n',
  search97Source.replace('Capacitor.isNativePlatform()', 'false'),
  search97Source.replace('LegacyWineSearchBar97 {...props}', 'LegacyWineSearchBar97')]) {
  assert.notEqual(candidate, search97Source);
  assert.throws(() => restoreNativeSearch97(search97Path, candidate), undefined,
    'Native97 search inverse must reject wrapper or legacy source mutations');
}
const pre95 = 'c25b28287d431e50239e45a25baebe8965f5077d';
const guidePath = 'src/components/AiRimContextGuide.tsx';
const comparisonPath = 'src/components/wine-import/WineComparisonWorkspace.tsx';
const reviewed95 = new Map([
  [guidePath, { before: 'e2a92d630804fc8367735d3203b1e2c9d3a5cedc57f51c375962e4536fb7a7e0',
    current: 'e3238840bce8d6eee3fce45222490160ff9943aa4b84664770ecb0190e399eb9' }],
  [comparisonPath, { before: '1c07656820e1fc6df9795586a67d13e9ef315c2055b931d1c1b408ea75308518',
    current: '6ba543f62c49c4e58893a8d9ab3ae28259a43a105aacbf0221476bcb75e41d65' }],
  ['src/components/MatchrimPassport.tsx', { before: '1cea27eb1d4d3824393a29138e3d6a122cc59685a6d5a2032d8ef41ff9e1cc31', current: '938cd0de8454bbf70989dcfdd081bec36c7cdc6f69d8901d8621fb6736dccbde' }],
  ['src/components/WineCard.tsx', { before: '1eb6ac4caa64fe4509ffda6437d4d9483db906621a1ffe0851259ecd400535eb', current: 'ca00045cda8f75d94abad0e54c0ca5a7ce9e1d13874f57af0227354754d680d8' }],
  ['src/components/registration/BasicInfoStep.tsx', { before: '53df5bf02b66d972de349d508433467907cb8159b314dae6e650aeb50c810839', current: '892c6447002b4228a374f049b15833235544b1d4b447c6bbde3c4a1a7d4fea2b' }],
  ['src/components/registration/FinalStep.tsx', { before: 'dfedbd85d9a51bae67667eadb8da9804ac0b47328213bb7e21914cd1a4f02c64', current: 'b386288dc02ac9d1a2af4e3b600c1c7c9fbbb434fd453d7bfa5f554aba912efb' }],
  ['src/components/registration/WinePreferencesStep.tsx', { before: 'f8dec966ad8cc058f87b2807a78bcf3d8ef696035e0f1daa01ba2f541e1f830a', current: '8419eb2173debf1c6637b0093bce221833e45933b6f85acc03ba9d8a1d880360' }],
  ['src/components/ui/sonner.tsx', { before: '4c5e443dc1e9ecc5541b77415f4a57a041c513cfdbcb276a35bffdf74a9e31b0', current: '08d9032738c6ad47f72179964b14126362d7c5b325199321a18403753c4cbd5c' }],
  ['src/components/ui/toast.tsx', { before: '99f9f4a3e897f71d89b01c6772b2f5db51b888cecb2c8214fb2c2dbb2b3e6356', current: '051da9ea8abe0cc25a22b92fc4b915686e12db83d67c3fb109a9fd69a7d97301' }],
  ['src/components/ui/toaster.tsx', { before: '1348f1a1f9820e2f1394b93cecc156a7e22f03636ab9270753985549aae2be74', current: '046d32048dde1cf93ae7313c55c3d26513a4a367fc4237c5a334b29c6be0733f' }],
  ['src/pages/Auth.tsx', { before: '997810059e4006d4bfc260e7cca6c56042a934445163693115a3be1148ef8fc7', current: 'fd0d99adc829afdf619de56a0084813821d80d7be1e7f480eec0c136042c47de' }],
  ['src/pages/ForgotPassword.tsx', { before: '2c5f053bc2a9375d03df37f6b328aa12b4d126e657353e4040c29d8dbf3758fb', current: 'b519ef352e4367d2967d66d57ac7a8cce984de106a099134a8c6011415c3c611' }],
  ['src/pages/Registration.tsx', { before: '9618c565f027c0dafb75c925c732b598ba7319a3343daf65d054317528be1934', current: '7261fcbf98b5cf7ce9825471503e868f4d7aed1dad3729b1b4eb18c8325e819d' }],
  ['src/contexts/AuthContext.tsx', { before: '29d5d2a7378a227591e3b78354f91f658c71c8d7d4fef6e24eba9d0bdb857863', current: '2736a90c8e1c57df0c3fdd44a2eebdc8a9a7decadab889813f24c04431ed8d1e' }],
  ['src/components/NativeAccountActions.tsx', { before: 'a36e1e671fd876cc070dbe154429e6a9d21a7edf0d5a379566f8a2a984bedc43', current: '1168b0d99ef442998350625d39039fceb4ac034fa99f3255c8fc0cd9ce5ded7b' }],
  ['src/pages/MyWines.tsx', { before: 'd5bc7c18ec8a29c4bd6d6a6cd624cfd81e6e54054ffda11709f1f1b0035d138c', current: '90be420fb0fae1dedf75f406130f7e0781410a67151ec55d12ce9e59bbbd29da' }],
  ['src/components/NativeAppHome.tsx', { before: '9447712478b1a3119819c59059f6d2f59224ece08ed079d1252f1ce2e2baff28', current: '04d35a6fcfb4536b060fa701e86a168b81ac7320368ef7e3eae3a689a46cfca1' }],
  ['src/pages/Index.tsx', { before: '66a5b0427ef655e3c2f51320d04806d3e3e83969b54c24f19800b443ed386e6b', current: 'b1a031e515e0384307f2813696be0ba56510a13b30220b0e0f62d179924543f8' }],
  ['src/pages/UseMatchrim.tsx', { before: '540c19f7fb8547cfc720b1700aae5f54c1230a5c4be9308323e747b2f65c3ae5', current: '320d4da2dd16da7b38fd1f0b19ec56d1c874e04d19f5a048755c92a08b32a4f4' }],
  ['src/components/wine-import/WineShopLinkAdvisor.tsx', { before: 'a7b9ddd9db73b93bd20b229ccb388efe46d75319ded8d723150fd1933ed60471', current: '17529a6c6285fbf0d348981b1b01e42b73d7816539033c92b7d3934ef6b1da0f' }],
  ['src/pages/Restaurant.tsx', { before: 'ea5da2c5320c9e0475e286be34c0ef4edab9dbc1f1f0a7563603d31ebdfecc9b', current: '0dfa74ac51fa1aa033d909b5e5e429599579e95547bd15a9c36e5dff86f6a918' }],
]);
const learningImportPaths96 = new Set(['src/pages/Index.tsx', 'src/pages/UseMatchrim.tsx']);
const projectLearningImport96 = (source: string) => {
  const current = "import { calculateLearnedMatchrimProfile, type TrainableWine } from '@/utils/matchrimLearningPlatform';";
  const previous = current.replace('matchrimLearningPlatform', 'matchrimLearning');
  assert.equal(source.split(current).length, 2, 'Exactly one native learning wrapper import');
  return source.replace(current, previous);
};
const assertReviewedClient96 = (path: string, source: string) => {
  source = restoreNativeAuth97(path, source);
  source = restoreNativeCellar97(path, restoreNativePolicy97(path, source));
  const expected = reviewed95.get(path);
  assert.ok(expected);
  const projected = learningImportPaths96.has(path) ? projectLearningImport96(source) : source;
  assert.equal(hash(Buffer.from(projected)), expected.current, `Exact reviewed95 source after bounded import inverse: ${path}`);
};
for (const [path, fingerprints] of reviewed95) {
  assert.equal(hash(execFileSync('git', ['show', `${pre95}:${path}`])), fingerprints.before, `Pre95 source: ${path}`);
  assertReviewedClient96(path, readFileSync(path, 'utf8'));
}
for (const path of learningImportPaths96) {
  const source = readFileSync(path, 'utf8');
  for (const candidate of [source.replace('matchrimLearningPlatform', 'unreviewedLearning'), source + '\n// unreviewed lifetime change\n']) {
    assert.notEqual(candidate, source);
    assert.throws(() => assertReviewedClient96(path, candidate), undefined, 'Entire source outside the one import remains protected');
  }
}
// These reviewed native clients are not exempted by path: their full hashes above
// and actual-body/native/web parity suites below must both match. R5's explicit
// source freeze adds the two signout clients and strengthens the prior broad
// build83/84 allowances for current-profile recommendations and cellar targets.
// The31e native layout/serving amendment also requires exact five-source pairs,
// full web JSX/lifetime parity and actual public menu merge/resolver units.
const reviewed95Suites = [
  ['scripts/check-matchrim-consumer95-auth.ts', 24],
  ['scripts/check-matchrim-consumer95-passport.ts', 4],
  ['scripts/check-matchrim-consumer95-toast.ts', 7],
  ['scripts/check-matchrim-consumer95-native-recommendation.ts', 40],
  ['scripts/check-matchrim-consumer95-signout.ts', 8],
  ['scripts/check-matchrim-consumer95-cellar-targets.ts', 6],
  ['scripts/check-matchrim-consumer95-cellar-dialog.ts', 4],
  ['scripts/check-matchrim-consumer95-native-layout.ts', 15],
  ['scripts/check-matchrim-consumer95-menu-serving.ts', 29],
  ['scripts/check-matchrim-native-home-accessibility96.ts', 12],
  ['scripts/check-matchrim-recognition96.ts', 36],
] as const;
const reviewed95SuiteResults = reviewed95Suites.map(([path, minimum]) => {
  const output = execFileSync(process.execPath, ['--import', 'tsx', path], { encoding: 'utf8' });
  const report = output.trim().startsWith('{') ? JSON.parse(output) : null;
  if (report) assert.equal(report.failed, 0, `No failed reviewed95 oracles: ${path}`);
  const groups = report?.passed ?? output.split('\n').filter(line => line.startsWith('PASS ')).length;
  assert.equal(groups, minimum, `Reviewed95 actual behavior/parity groups: ${path}`);
  return { path, groups };
});
// Only these client lifetimes may change in this block; detector, scoring, catalog,
// corpus and hosted functions stay fingerprint protected. The original snapshot
// is checked for all paths even when a client lifetime is subsequently amended.
const allowedClientChanges = new Set(['src/components/wine-import/MultiWineLabelScanner.tsx', 'src/utils/imageAnalysis.ts', 'src/components/wine-import/WineMenuScanner.tsx', 'src/pages/Scan.tsx', 'src/components/wine-import/WineComparisonWorkspace.tsx']);
// Build 83 adds native keyboard/layout, quiz navigation and original-sheet provenance.
// Retain the historical snapshot proof and fingerprint every unaffected product file.
const build83Changes = new Set(['package-lock.json', 'capacitor.config.ts', 'src/App.tsx', 'src/main.tsx', 'src/index.css',
  'src/components/ui/button.tsx', 'src/components/AiRimConversation.tsx', 'src/components/QuizIntro.tsx',
  'src/components/QuizQuestion.tsx', 'src/pages/Matchrim.tsx', 'src/pages/MyWines.tsx', 'src/pages/UseMatchrim.tsx',
  'src/services/winerimApi.ts', 'src/utils/multiWineScan.ts', 'src/utils/scanProfile.ts',
  'src/utils/scanWineEvidence.ts', 'src/utils/wineMenuScan.ts']);
build83Changes.add('src/utils/matchrimLocalProfile.ts');
build83Changes.add('src/utils/matchrimLearning.ts');
build83Changes.add('src/utils/edgeFunctionResilience.ts');
build83Changes.add('src/components/wine-import/WineLabelOCRImport.tsx');
build83Changes.add('src/utils/wineAffinityExplanation.ts');
// Build84's explicitly requested native cellar/restaurant semantics. Historical
// source fingerprints and every unaffected module remain verified below.
const build84Changes = new Set(['src/components/MatchrimFunction.tsx', 'src/components/wine-import/FoodPairingScanner.tsx',
  'src/components/wine-import/WineSearchBar.tsx', 'src/pages/LiquidIntelligence.tsx', 'src/pages/Index.tsx',
  'src/pages/Profile.tsx', 'src/services/matchrimScanProfile.ts', 'src/utils/winerimLabelIdentity.ts',
  'src/utils/labelScanSave.ts', 'src/utils/matchrimEdgeRouting.ts', 'src/components/NativeAppHome.tsx']);
const build85LearningPath = 'supabase/functions/_shared/matchrim-learning.ts';
const build85Changes = new Set(['src/components/QuizResults.tsx']);
// QA88 repairs the video request lifetime and exposes the existing affinity
// evidence. Dedicated contract checks cover these explicitly reviewed clients.
const remediation88Changes = new Set(['src/components/AffinityExplanation.tsx',
  'src/components/CellarWineAffinity.tsx', 'src/components/SpecialMomentsFlow.tsx',
  'src/components/WineRecommendationCard.tsx', 'src/lib/aiRimStream.ts']);
// QA89 explicitly revises bounded continuation, typed vision/food errors and
// original-Library identity binding. Corpus, quiz, scorer and learner stay frozen.
const remediation89Changes = new Set(['src/utils/scanAnalysisPolicy.ts', 'src/utils/invokeEdgeFunction.ts',
  'src/utils/regionAnalysisError.ts', 'src/utils/winerimOriginalSheet.ts',
  'src/components/WinerimOriginalSheet.tsx', 'src/components/WinerimSheetLookup.tsx',
  'supabase/functions/detect-wine-regions/index.ts', 'supabase/functions/analyze-wine-region/index.ts',
  'supabase/functions/scan-food-pairing/index.ts', 'supabase/functions/scan-food-pairing/contract.ts',
  'supabase/functions/scan-wine-menu/index.ts',
  'supabase/functions/_shared/matchrim-ai-provider.ts']);
// The owner explicitly requested every AI caller move to the dedicated OpenAI key.
// The focused AST guard verifies prompts and auth/catalog queries before exemption.
execFileSync(process.execPath, ['--import', 'tsx', 'scripts/check-matchrim-openai92-routing.ts']);
const openAi92Changes = new Set(openAi92LegacyHandlers.map(name => `supabase/functions/${name}/index.ts`));
execFileSync(process.execPath, ['--import', 'tsx', 'scripts/check-matchrim-catalog93.ts']);
const catalog93Changes = new Set(['supabase/functions/_shared/matchrim-catalog-search-v75.ts']);
// QA90 changes only this parser's disclosure count, not schema, scores or data.
const qa90FoodDisclosure = 'src/utils/foodScanResponse.ts';
const qa90NativeNavigation = 'src/components/MobileBottomNav.tsx';
execFileSync(process.execPath, ['--import', 'tsx', 'scripts/check-matchrim-native-type90.ts']);
const priorFoodResponse = execFileSync('git', ['show', `8f52291:${qa90FoodDisclosure}`], { encoding: 'utf8' });
const oldFoodSummary = 'summary: `${parsed.data.dishes.length} platos devueltos. La cobertura de la carta no está verificada.`,';
const newFoodSummary = 'summary: `${parsed.data.dishes.length} lecturas devueltas. La cobertura y disponibilidad no están verificadas.`,';
assert.equal(priorFoodResponse.split(oldFoodSummary).length, 2, 'Exactly one reviewed summary delta');
assert.equal(readFileSync(qa90FoodDisclosure, 'utf8'), priorFoodResponse.replace(oldFoodSummary, newFoodSummary),
  'QA90 retains the full food parser outside its explicit reading/availability disclosure');
const priorLearning = execFileSync('git', ['show', `598dda8:${build85LearningPath}`], { encoding: 'utf8' });
assert.equal(readFileSync(build85LearningPath, 'utf8'), priorLearning.replace(
  'if (numeric === null) return null;', 'if (numeric === null || numeric < 0) return null;'),
  'Only the negative-sensory guard changes the shared learner; formulas and weights remain identical');
for (const path of localOnlyPaths) {
  assert.equal(readFileSync(path, 'utf8'), execFileSync('git', ['show', `${localRelease}:${path}`], { encoding: 'utf8' }), `Published-beta price/style source retained: ${path}`);
}
const stripLayoutClasses = (source: string) => source.replace(/className="[^"]*"/g, 'className="[layout]"');
assert.equal(stripLayoutClasses(execFileSync('git', ['show', `${pre95}:${comparisonPath}`], { encoding: 'utf8' })), stripLayoutClasses(execFileSync('git', ['show', `${snapshot}:${comparisonPath}`], { encoding: 'utf8' })), 'Historical comparator logic remains byte-identical outside static layout classes');

// Execute complete, fingerprinted TSX bodies. Only React hooks, UI primitives and
// storage are controlled; comparison, prices and guidance use their real helpers.
/* eslint-disable @typescript-eslint/no-explicit-any -- Dynamic values cross this controlled TSX interpreter boundary; the assertions below validate complete trees and callbacks. */
type Element = { type: string | ((props: Record<string, unknown>) => unknown); props: Record<string, any> };
const elements = (value: any): Element[] => Array.isArray(value) ? value.flatMap(elements)
  : value && typeof value === 'object' && 'type' in value ? [value, ...elements(value.props.children)] : [];
const text = (value: any): string => Array.isArray(value) ? value.map(text).join('')
  : value && typeof value === 'object' ? text(value.props?.children)
    : value === false || value == null ? '' : String(value);
const jsx = (type: Element['type'], props: Element['props']) => typeof type === 'function' ? type(props) : { type, props };
const shape = (tree: any): any => {
  if (Array.isArray(tree)) return Array.from(tree, shape);
  if (tree && typeof tree === 'object') return Object.fromEntries(Object.entries(tree)
    .filter(([, value]) => value !== undefined).map(([key, value]) => {
      if (key !== 'children') return [key, shape(value)];
      // React renders adjacent primitive children as the same text. Preserve all
      // element boundaries, attributes and callbacks rather than flattening UI.
      const children: any[] = [];
      for (const child of [value].flat(Infinity)) {
        if (child == null || typeof child === 'boolean') continue;
        if (typeof child === 'string' || typeof child === 'number') {
          if (typeof children.at(-1) === 'string') children[children.length - 1] += String(child);
          else children.push(String(child));
        } else children.push(shape(child));
      }
      return [key, children];
    }));
  return typeof tree === 'function' ? '[callback]' : tree;
};
assert.deepEqual(shape(jsx('span', { children: [0, '%'] })), shape(jsx('span', { children: '0%' })));
assert.notDeepEqual(shape(jsx('span', { children: '0%' })), shape(jsx('span', { children: '0/100' })));
assert.notDeepEqual(shape(jsx('span', { children: [0, jsx('b', { children: '%' })] })), shape(jsx('span', { children: '0%' })));
assert.notDeepEqual(shape(jsx('span', { 'aria-label': '0 de 5', children: '0/5' })), shape(jsx('span', { children: '0/5' })));
const mount = (source: string, name: string, native: boolean, initialState: unknown[] = []) => {
  const state = [...initialState], refs: Array<{ current: unknown }> = [], effects: Array<() => void> = [];
  const decisions: comparison.WineComparisonContext[] = [];
  let stateIndex = 0, refIndex = 0, storageReads = 0;
  const storedProfile = { potente: 0, acidez: .4, dulce: 1.7, tanico: 0, afrutado: 5 };
  const hooks = {
    useId: () => 'controlled95-id', useMemo: (run: () => unknown) => run(),
    useEffect: (run: () => void) => effects.push(run),
    useRef: (value: unknown) => refs[refIndex++] ?? (refs[refIndex - 1] = { current: value }),
    useState: (value: unknown) => {
      const index = stateIndex++;
      if (!(index in state)) state[index] = typeof value === 'function' ? value() : value;
      return [state[index], (next: unknown) => { state[index] = typeof next === 'function' ? next(state[index]) : next; }];
    },
  };
  const ui = new Proxy({}, { get: (_target, key) => String(key) });
  const sandbox = { exports: {} as Record<string, (props: any) => unknown>, require: (id: string) => {
    if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
    if (id === 'react') return hooks;
    if (id === '@capacitor/core') return { Capacitor: { isNativePlatform: () => native } };
    if (id === '@/utils/scanMoney') return money;
    if (id === '@/utils/wineComparison') return { ...comparison,
      buildWineComparisonDecision: (wines: comparison.ComparableWine[], options: comparison.WineComparisonContext) => {
        decisions.push(options); return comparison.buildWineComparisonDecision(wines, options);
      } };
    if (id === '@/utils/aiRimContextGuide') return { buildAiRimContextGuidance };
    if (id === '@/utils/wineAffinityExplanation') return { readStoredMatchrimProfile: () => { storageReads++; return storedProfile; } };
    if (id === 'lucide-react' || id.startsWith('@/components/ui/')) return ui;
    throw new Error(`Unmocked offline TSX dependency: ${id}`);
  } };
  runInNewContext(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText, sandbox);
  return { state, decisions, get storageReads() { return storageReads; },
    render: (props: unknown) => { stateIndex = 0; refIndex = 0; effects.length = 0; return sandbox.exports[name](props); },
    flush: () => { for (const run of effects.splice(0)) run(); },
  };
};
/* eslint-enable @typescript-eslint/no-explicit-any */
const currentGuide = readFileSync(guidePath, 'utf8');
const oldGuide = execFileSync('git', ['show', `${pre95}:${guidePath}`], { encoding: 'utf8' });
const currentComparison = readFileSync(comparisonPath, 'utf8');
const oldComparison = execFileSync('git', ['show', `${pre95}:${comparisonPath}`], { encoding: 'utf8' });
let webParity95 = 0, nativeBehavior95 = 0;
for (const name of [null, 'Synthetic label']) for (const affinity of [null, 0, 82]) {
  for (const profile of [undefined, null, { potente: 0, acidez: .4, dulce: 1.7, tanico: 0, afrutado: 5 }]) {
    for (const mask of [0, 1, 2, 3]) for (const linked of [false, true]) {
      let primary = 0, secondary = 0;
      const props = { context: 'label', name, affinity, profile, identityConfidence: .9,
        catalogIdentityLinked: linked, attributes: { potencia: 0, acidez: .4, dulzura: 1.7, taninos: 0, afrutado: 5 },
        primaryAction: mask & 1 ? { label: 'Synthetic primary', onClick: () => primary++ } : null,
        secondaryAction: mask & 2 ? { label: 'Synthetic secondary', onClick: () => secondary++ } : null };
      const before = mount(oldGuide, 'AiRimContextGuide', false), after = mount(currentGuide, 'AiRimContextGuide', false);
      assert.deepEqual(shape(after.render(props)), shape(before.render(props)), 'Full web guide JSX parity, including actions');
      assert.equal(after.storageReads, profile === undefined ? 1 : 0); webParity95++;
      const native = mount(currentGuide, 'AiRimContextGuide', true), tree = native.render(props);
      if (!mask) assert.equal(tree, null, 'Native guide without actions is absent');
      else {
        const message = elements(tree).find(node => node.type === 'p')!;
        assert.equal(text(message), !name
          ? 'No he podido leer esta etiqueta con suficiente claridad. Prueba con una foto más cercana y sin reflejos.'
          : linked ? 'He encontrado la ficha de «Synthetic label». Confirma que es el vino que tienes delante.'
            : 'He leído «Synthetic label». Comprueba que el nombre y la añada coinciden con tu etiqueta.');
        const buttons = elements(tree).filter(node => node.type === 'Button');
        assert.equal(buttons.length, Number(Boolean(mask & 1)) + Number(Boolean(mask & 2)));
        buttons.forEach(button => button.props.onClick());
        assert.equal(primary, mask & 1 ? 1 : 0); assert.equal(secondary, mask & 2 ? 1 : 0);
      }
      nativeBehavior95++;
    }
  }
}
const wines: comparison.ComparableWine[] = Array.from({ length: 6 }, (_, index) => ({
  id: `synthetic-${index}`, name: `Synthetic wine ${index}`, producer: 'Synthetic producer',
  affinity: [0, 80, 100, null, 45, 12][index], confidence: .9, identityConfirmed: index !== 1,
  price: 20 + index, currency: 'EUR', prices: { glass: 5 + index, bottle: 20 + index }, service: 'both',
  attributes: { body: 0, acidity: .4, sweetness: 1.7, tannin: 5, fruit: -1, wood: 5.1, intensity: NaN },
}));
for (const count of [0, 1, 2, 6]) for (const mode of ['personal', 'service']) {
  for (const priority of ['affinity', 'certainty', 'value']) for (const budget of ['', '40']) {
    for (const service of ['any', 'glass', 'bottle']) for (const missing of [false, true]) {
      const input = wines.slice(0, count).map(wine => missing ? { ...wine, affinity: null, price: null, prices: null } : wine);
      const seed = [input.slice(0, 3).map(wine => wine.id), mode, priority, budget, service];
      const before = mount(oldComparison, 'WineComparisonWorkspace', false, seed);
      const after = mount(currentComparison, 'WineComparisonWorkspace', false, seed);
      assert.deepEqual(shape(after.render({ wines: input })), shape(before.render({ wines: input })), 'Full web comparator JSX parity');
      before.flush(); after.flush();
      assert.deepEqual(shape(after.state), shape(before.state), 'Web comparison effects retain selection/priority policy');
      webParity95++;
    }
  }
}
const nativeComparison = mount(currentComparison, 'WineComparisonWorkspace', true);
let nativeTree = nativeComparison.render({ wines });
const scalarLabels = elements(nativeTree).filter(node => node.type === 'span' && node.props['aria-label']?.endsWith(' de 5'));
for (const value of [0, .4, 1.7, 5]) {
  const matches = scalarLabels.filter(node => node.props['aria-label'] === `${value} de 5`);
  assert.equal(matches.length, 6, 'Three selected wines render exact scalar in both table and compact rail');
  matches.forEach(node => assert.equal(text(node), `${value}/5`)); nativeBehavior95++;
}
assert.ok(elements(nativeTree).some(node => node.type === 'span' && text(node) === '0/100'), 'Native zero affinity is visible, not omitted');
assert.ok(scalarLabels.every(node => ['0 de 5', '0.4 de 5', '1.7 de 5', '5 de 5'].includes(node.props['aria-label'])));
assert.equal(elements(nativeTree).filter(node => node.type === 'span' && text(node) === '-').length, 18,
  'Negative, over-five and nonfinite sensory values render pending in both layouts');
const checkboxes = () => elements(nativeTree).filter(node => node.type === 'Checkbox');
for (const index of [3, 4, 5]) {
  checkboxes()[index].props.onCheckedChange(); nativeTree = nativeComparison.render({ wines });
}
assert.deepEqual(shape(nativeComparison.state[0]), ['synthetic-0', 'synthetic-1', 'synthetic-2', 'synthetic-3', 'synthetic-4']);
assert.equal(checkboxes()[5].props.disabled, true, 'Sixth reference remains disabled at the five-reference cap');
checkboxes()[1].props.onCheckedChange(); nativeTree = nativeComparison.render({ wines });
assert.equal(checkboxes()[5].props.disabled, false);
checkboxes()[5].props.onCheckedChange(); nativeComparison.render({ wines: wines.slice(2) }); nativeComparison.flush();
assert.deepEqual(shape(nativeComparison.state[0]), ['synthetic-2', 'synthetic-3', 'synthetic-4', 'synthetic-5']);
nativeBehavior95++;
for (const native of [false, true]) {
  const instance = mount(currentComparison, 'WineComparisonWorkspace', native);
  const props = { wines: wines.slice(0, 2).map(wine => ({ ...wine, affinity: null })) };
  instance.render(props); instance.flush();
  const tree = instance.render(props);
  assert.equal(instance.state[2], 'certainty', 'Missing affinity selects certainty, not fabricated preference');
  const recommendation = elements(tree).filter(node => node.type === 'div' && /^mt-5 rounded-lg border-l-4/.test(node.props.className ?? ''));
  assert.equal(recommendation.length, native ? 0 : 1, 'Only native suppresses a no-affinity primary recommendation');
  nativeBehavior95++;
}
for (const native of [false, true]) {
  const instance = mount(currentComparison, 'WineComparisonWorkspace', native);
  let tree = instance.render({ wines });
  elements(tree).find(node => node.type === 'button' && text(node).trim() === 'Servicio')!.props.onClick();
  tree = instance.render({ wines });
  const selects = elements(tree).filter(node => node.type === 'Select');
  selects[0].props.onValueChange('value'); selects[1].props.onValueChange('glass');
  elements(tree).find(node => node.type === 'Input')!.props.onChange({ target: { value: '40' } });
  instance.render({ wines });
  assert.deepEqual(shape(instance.decisions.at(-1)), {
    mode: 'service', priority: 'value', budget: 40, budgetCurrency: 'EUR', serviceFormat: 'glass',
  }, 'Actual control callbacks retain decision inputs, prices and service units on both platforms');
  nativeBehavior95++;
}
const cases = [undefined, null, NaN, Infinity, -1, 101, 0, 1, 82, 100];
for (const value of cases) {
  const valid = typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
  assert.equal(manualWineIdentityNotice(value).includes('Afinidad pendiente'), !valid);
  assert.match(manualWineIdentityNotice(value), /Identidad revisada por ti/);
}
const payload = JSON.parse(readFileSync('docs/qa-evidence/matchrim-region-failure-2026-10-13/failure-before/scan-response-payloads.json', 'utf8'));
const candidate = normalizeWineCandidates(payload.analyze['region-2'], 'synthetic-contract')[0];
for (const affinity of [null, 0, 82]) {
  assert.equal(confirmWineCandidateIdentity({ ...candidate, affinity }).affinity, affinity);
  assert.equal(correctWineCandidateIdentity({ ...candidate, affinity }, { name: 'Synthetic correction' }).affinity, null);
}
for (const code of ['read', 'decode', 'prepare'] as const) {
  const error = new ImagePreparationError(code);
  assert.equal(error.code, code);
  assert.doesNotMatch(error.message, /backend|token|http|provider/i);
}
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
assert.equal(lock.packages['node_modules/@capacitor/keyboard'].version, '7.0.6');
const previousLock = JSON.parse(execFileSync('git', ['show', 'bda5241:package-lock.json'], { encoding: 'utf8' }));
const withoutKeyboard = structuredClone(lock);
delete withoutKeyboard.packages['node_modules/@capacitor/keyboard'];
delete withoutKeyboard.packages[''].dependencies['@capacitor/keyboard'];
assert.deepEqual(withoutKeyboard, previousLock, 'Only the official pinned keyboard plugin changes dependencies');
assert.equal(readFileSync('src/data/quizData.ts', 'utf8'), execFileSync('git', ['show', 'bda5241:src/data/quizData.ts'], { encoding: 'utf8' }), 'Quiz scoring and images unchanged from build 82');
assert.equal(lock.packages['node_modules/sonner'].version, '2.0.8');
assert.equal(lock.packages['node_modules/sonner'].integrity, 'sha512-UM/ByIoFra8yzV75n1o0Puu0bw5U/9UNnDacrJNspekBewIfsQ3D6ez1nvlWpt7aTsO6rujQtifBpycwIivqlg==');
assert.match(readFileSync('node_modules/sonner/dist/index.mjs', 'utf8'), /document\.removeEventListener\('visibilitychange', callback\)/);
console.log(JSON.stringify({ reviewed95SuiteResults, webParity95, nativeBehavior95,
  signoutFreeze: 'R5 owner freeze 2026-10-17 12:41 UTC; R10 prepared native cellar dialog amendment; exact sources plus actual receipts/web parity, native visual acceptance separate' }));
let immutableCount = 0;
for (const row of manifest.productSourceFingerprints as Array<{ path: string; sha256: string }>) {
  assert.equal(hash(execFileSync('git', ['show', `${snapshot}:${row.path}`])), row.sha256, `Snapshot hash: ${row.path}`);
  if (!allowedClientChanges.has(row.path) && !build83Changes.has(row.path) && !build84Changes.has(row.path)
    && !build85Changes.has(row.path) && !remediation88Changes.has(row.path) && !remediation89Changes.has(row.path) && !openAi92Changes.has(row.path) && !catalog93Changes.has(row.path)
    && row.path !== build85LearningPath && row.path !== qa90FoodDisclosure && row.path !== qa90NativeNavigation && row.path !== 'package.json') {
    const expected = reviewed95.get(row.path)?.current ?? (localPricePaths.has(row.path)
      ? hash(execFileSync('git', ['show', `${localRelease}:${row.path}`])) : row.sha256);
    const actual = row.path === 'src/components/ScanPrivacyGate.tsx'
      ? Buffer.from(restoreNativeScanPrivacy96(readFileSync(row.path, 'utf8'))) : row.path === 'src/components/wine-import/ScanHub.tsx'
      ? Buffer.from(restoreNativeHubSvg96(row.path, readFileSync(row.path, 'utf8'))) : row.path === 'src/pages/PrivacyPolicy.tsx'
      ? Buffer.from(restoreNativePolicy97(row.path, readFileSync(row.path, 'utf8'))) : row.path === 'src/pages/Auth.tsx'
      ? Buffer.from(restoreNativeAuth97(row.path, readFileSync(row.path, 'utf8'))) : readFileSync(row.path);
    assert.equal(hash(actual), expected, `Protected source: ${row.path}`);
    immutableCount += 1;
  }
}
console.log(JSON.stringify({ snapshot, localRelease, localPricePaths: [...localPricePaths], localOnlyPaths, build83Changes: [...build83Changes], remediation88Changes: [...remediation88Changes], remediation89Changes: [...remediation89Changes], productFingerprints: manifest.productSourceFingerprints.length, immutableCount, syntheticNumericCases: cases.length, reviewed95: Object.fromEntries(reviewed95), reviewed95SuiteResults, webParity95, nativeBehavior95, scope: 'Original cloud snapshot plus exact reviewed95 sources, actual native/web TSX behavior and unchanged quiz calibration; no measured vision accuracy, humans or hosted data' }));
