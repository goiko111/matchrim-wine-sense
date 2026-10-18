/* eslint-disable @typescript-eslint/no-explicit-any -- Execute the actual effect and JSX in isolated fixtures. */
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import vm from 'node:vm';
import ts from 'typescript';
import { buildSync } from 'esbuild';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import tailwindConfig from '../tailwind.config';

const root = fileURLToPath(new URL('../', import.meta.url));
export const nativeLabelKeyboard96 = {
  revision: '3a215039b91a6d3d57b806e3874f336a3010bc0e',
  priorRevision: '05ca1e2da53d581424f873fe0a9c1c2cd9d82018',
  priorSourceHash: 'b48b9fb5ac81cfb3eeb329f3e99b9709d5a0c22851bdf049280031784efcd11a',
  currentSourceHash: '9d2123e37af1de7d69a55c3f9dd333b04ef7c5f6940ccc747bc27117737c860f',
  webAstScope: 'Complete legacy web AST after the declared native keyboard/count inverse; not the literal current module AST',
};
export const restoreNativeLabelKeyboard96 = (source: string) => {
  const tree = ts.createSourceFile('MultiWineLabelScanner.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const nodes: ts.Node[] = [];
  const visit = (node: ts.Node) => { nodes.push(node); ts.forEachChild(node, visit); }; visit(tree);
  const sha = (text: string) => createHash('sha256').update(text).digest('hex');
  const one = <T,>(values: T[]) => { assert.equal(values.length, 1, 'One exact declared keyboard amendment'); return values[0]; };
  const statement = (name: string) => one(nodes.filter((n): n is ts.VariableStatement => ts.isVariableStatement(n)
    && n.declarationList.declarations.some(d => d.name.getText(tree) === name)));
  const body = statement('regionEditorBody'), layout = statement('regionEditorLayout');
  assert.equal(body.getText(tree), 'const regionEditorBody = useRef<HTMLDivElement>(null);');
  assert.equal(layout.getText(tree), 'const regionEditorLayout = useRef<HTMLDivElement>(null);');
  const effect = one(nodes.filter((n): n is ts.ExpressionStatement => ts.isExpressionStatement(n)
    && ts.isCallExpression(n.expression) && n.expression.expression.getText(tree) === 'useEffect'
    && n.getText(tree).includes('const body = regionEditorBody.current')));
  assert.ok(ts.isCallExpression(effect.expression));
  const callback = effect.expression.arguments[0];
  assert.ok(ts.isArrowFunction(callback) && ts.isBlock(callback.body));
  assert.equal(callback.body.statements[0].getText(tree), 'if (!isNative || !selectedRegionId) return;', 'Native guard precedes every listener/RAF/observer');
  assert.equal(effect.expression.arguments[1].getText(tree), '[isNative, selectedRegionId]');
  assert.equal(sha(effect.getText(tree)), '76eb39e94ca807b9c6b19f238c2cd00eea7db26f0efc0f370aa27d77c9905c1f');
  const begin = source.lastIndexOf('\n', body.getStart(tree)) + 1, end = effect.end + 1;
  assert.ok(layout.getStart(tree) > begin && layout.end < effect.getStart(tree));
  assert.equal(source[effect.end], '\n');
  assert.equal(sha(source.slice(begin, end)), '86f8e31b0465cce95cd322b774a09ed9a89c945e85b14f63dad80fbd367d1c47');
  const replacements: Array<[number, number, string]> = [[begin, end, '']];
  const count = statement('nativeCloserPhotoCount');
  assert.equal(sha(count.getText(tree)), 'f04d05fe2d1d23bc86c9fcf62da0d2230f0333896e5d98c987532c89e977f2dc');
  replacements.push([source.lastIndexOf('\n', count.getStart(tree)) + 1, count.end + 1, '']);
  for (const name of ['regionEditorBody', 'regionEditorLayout']) {
    const attr = one(nodes.filter((n): n is ts.JsxAttribute => ts.isJsxAttribute(n) && n.name.getText(tree) === 'ref'
      && n.getText(tree).includes(name)));
    assert.equal(attr.getText(tree), `ref={isNative ? ${name} : undefined}`, 'Web refs must remain absent/undefined');
    assert.equal(source[attr.end], ' ');
    replacements.push([attr.getStart(tree), attr.end + 1, '']);
  }
  const copy = one(nodes.filter((n): n is ts.JsxElement => ts.isJsxElement(n) && n.openingElement.tagName.getText(tree) === 'p'
    && n.getText(tree).includes('nativeCloserPhotoCount')));
  assert.equal(sha(copy.getText(tree)), 'c6d247b1ab09c98945b1f66beec93b65eb97e6aa0680661221207673e5f0c830');
  replacements.push([copy.getStart(tree), copy.end,
    '<p className="text-sm text-stone-800">{continuationPlan.automatic.length + continuationPlan.deferred.length} regiones pendientes de lectura.</p>']);
  for (const [start, finish, value] of replacements.sort((a, b) => b[0] - a[0])) source = source.slice(0, start) + value + source.slice(finish);
  return source;
};

// Imported by the two source guards without executing a child, browser or test group.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
const { values } = parseArgs({ options: { ui: { type: 'boolean' }, output: { type: 'string' } } });
const file = 'src/components/wine-import/MultiWineLabelScanner.tsx';
const source = readFileSync(resolve(root, file), 'utf8');
const baseline = execFileSync('git', ['show', `05ca1e2:${file}`], { cwd: root, encoding: 'utf8' });
const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const nodes: ts.Node[] = [];
const visit = (node: ts.Node) => { nodes.push(node); ts.forEachChild(node, visit); }; visit(ast);
const effect = nodes.find(n => ts.isCallExpression(n) && n.expression.getText(ast) === 'useEffect'
  && n.arguments[0].getText(ast).includes('const body = regionEditorBody.current')) as ts.CallExpression;
assert.ok(effect); assert.equal(effect.arguments[1].getText(ast), '[isNative, selectedRegionId]');
const checks: string[] = [];
let rejectedKeyboardBridgeMutations = 0;
const check = (name: string, run: () => void) => { run(); checks.push(name); console.log('PASS', name); };
check('Whole source byte-inverse to05ca outside native-only effect, refs and copy; no CSS/shared/data/handler changes', () => {
  const inverse = restoreNativeLabelKeyboard96(source);
  assert.equal(inverse, baseline);
  assert.equal(createHash('sha256').update(inverse).digest('hex'), nativeLabelKeyboard96.priorSourceHash);
  assert.ok(effect.arguments[0].getText(ast).startsWith('() => {\n    if (!isNative || !selectedRegionId) return;'));
  const mutations = [
    ['removed native gate', 'if (!isNative || !selectedRegionId) return;', 'if (!selectedRegionId) return;'],
    ['removed early guard', '    if (!isNative || !selectedRegionId) return;\n', ''],
    ['inverted native gate', 'if (!isNative || !selectedRegionId)', 'if (isNative || !selectedRegionId)'],
    ['web body ref leak', 'ref={isNative ? regionEditorBody : undefined}', 'ref={isNative ? regionEditorBody : regionEditorBody}'],
    ['web layout ref leak', 'ref={isNative ? regionEditorLayout : undefined}', 'ref={regionEditorLayout}'],
    ['removed body ref', 'ref={isNative ? regionEditorBody : undefined} ', ''],
    ['web count leak', ".deferral?.code === 'resolution').length : 0", ".deferral?.code === 'resolution').length : regions.length"],
    ['copy native gate leak', '<p className="text-sm text-stone-800">{isNative ? <>', '<p className="text-sm text-stone-800">{true ? <>'],
    ['web copy changed', 'regiones pendientes de lectura.', 'regiones por leer.'],
    ['consumer count-copy changed', 'Puedes seguir leyendo', 'Ya has terminado'],
    ['resolution membership changed', "region.deferral?.code === 'resolution'", "region.deferral?.code === 'automatic_limit'"],
    ['focused-field input handler changed', 'editCandidate({ name: event.target.value })', 'editCandidate({ name: "changed" })'],
    ['old callback changed', 'onClick={() => setSelectedRegionId(regions.find', 'onClick={() => setSelectedRegionId(regions.filter'],
    ['crop changed', 'cropImageRegionWithQuality(', 'cropImageRegion('],
  ];
  for (const [name, from, to] of mutations) {
    assert.ok(source.includes(from), `Applicable keyboard negative: ${name}`);
    const changed = source.replace(from, to); assert.notEqual(changed, source);
    assert.throws(() => assert.equal(restoreNativeLabelKeyboard96(changed), baseline), undefined, name);
    rejectedKeyboardBridgeMutations++;
  }
  assert.equal(rejectedKeyboardBridgeMutations, 14);
});

function fixture(options: any = {}) {
  const listeners = new Map<string, () => void>(), viewportListeners = new Map<string, () => void>(), frames = new Map<number, () => void>();
  let id = 0, initialTop = options.fieldTop ?? 586;
  const body = { scrollTop: 0, children: [], contains: () => !options.foreign,
    getBoundingClientRect: () => ({ top: 160, bottom: 464 }) };
  const layout = { scrollTop: 0, getBoundingClientRect: () => ({ top: 100, bottom: 464 }) };
  class Input { getBoundingClientRect() { const top = initialTop - body.scrollTop - layout.scrollTop; return { top, bottom: top + (options.fieldHeight ?? 45), height: options.fieldHeight ?? 45 }; } }
  const input = new Input(), observers: any[] = [];
  class Observer {
    observed: unknown[] = []; disconnected = false;
    constructor(readonly callback: () => void) { observers.push(this); }
    observe(value: unknown) { this.observed.push(value); }
    disconnect() { this.disconnected = true; }
  }
  const target = (map: Map<string, () => void>) => ({
    addEventListener: (key: string, callback: () => void) => { assert.ok(!map.has(key)); map.set(key, callback); },
    removeEventListener: (key: string, callback: () => void) => { assert.equal(map.get(key), callback); map.delete(key); },
  });
  const viewport = { ...target(viewportListeners), offsetTop: options.offsetTop ?? 0, height: options.viewportHeight ?? 464 };
  const sandbox: any = { exports: {}, isNative: options.native !== false, selectedRegionId: options.closed ? null : 'recorded-region',
    regionEditorBody: { current: body }, regionEditorLayout: { current: layout }, HTMLInputElement: Input,
    document: { activeElement: input }, getComputedStyle: () => ({ overflowY: options.max ? 'visible' : 'auto' }),
    window: { ...target(listeners), innerHeight: 800, visualViewport: options.noViewport ? undefined : viewport }, ResizeObserver: Observer,
    requestAnimationFrame: (callback: () => void) => { frames.set(++id, callback); return id; },
    cancelAnimationFrame: (key: number) => { frames.delete(key); },
  };
  vm.runInNewContext(ts.transpileModule(`exports.cleanup=(${effect.arguments[0].getText(ast)})();`, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, sandbox);
  const settle = () => { let turns = 0; while (frames.size) { assert.ok(++turns < 8); const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn()); } };
  return { body, layout, input, listeners, viewportListeners, frames, observers, settle, cleanup: sandbox.exports.cleanup,
    reflow: (top: number) => { initialTop = top; } };
}
check('Recorded C10 proxy586..631 outside body160..464 fails old focus-only behavior; actual effect makes whole45pt field visible', () => {
  const f = fixture(); const before = f.input.getBoundingClientRect(); assert.ok(before.bottom > 464);
  f.settle(); const after = f.input.getBoundingClientRect(); assert.ok(after.top >= 160 && after.bottom <= 464);
  assert.equal(f.body.scrollTop, 175); assert.equal(f.layout.scrollTop, 0); f.cleanup();
});
check('MAX outer scrollhost, viewport clip, top clipping and tight-fit fields remain fully visible', () => {
  for (const options of [{ max: true }, { viewportHeight: 350 }, { fieldTop: 90 }, { fieldTop: 300, fieldHeight: 300 }]) {
    const f = fixture(options); f.settle(); const r = f.input.getBoundingClientRect();
    assert.ok(r.top >= (options.max ? 100 : 160) && r.bottom <= (options.viewportHeight ?? 464), JSON.stringify({ options, r }));
    if (options.max) { assert.equal(f.body.scrollTop, 0); assert.ok(f.layout.scrollTop > 0); }
    f.cleanup();
  }
});
check('Input reflow, viewport resize/scroll and ResizeObserver coalesce without moving unrelated fields', () => {
  const f = fixture({ fieldTop: 200 }); f.settle(); assert.equal(f.body.scrollTop, 0);
  f.reflow(650); f.listeners.get('input')!(); f.listeners.get('focusin')!(); f.viewportListeners.get('resize')!();
  f.viewportListeners.get('scroll')!(); f.observers[0].callback(); assert.equal(f.frames.size, 1);
  f.settle(); assert.ok(f.input.getBoundingClientRect().bottom <= 464);
  f.cleanup(); assert.equal(f.frames.size, 0); assert.equal(f.listeners.size, 0); assert.equal(f.viewportListeners.size, 0); assert.ok(f.observers[0].disconnected);
  const foreign = fixture({ foreign: true }); foreign.settle(); assert.equal(foreign.body.scrollTop, 0); foreign.cleanup();
  for (const options of [{ native: false }, { closed: true }]) { const f = fixture(options); assert.equal(f.cleanup, undefined); assert.equal(f.listeners.size, 0); assert.equal(f.frames.size, 0); }
  const early = fixture(); early.cleanup(); early.settle(); assert.equal(early.observers[0].observed.length, 0);
  const noViewport = fixture({ noViewport: true }); noViewport.settle(); noViewport.cleanup();
});
check('Photo-needed count is twelve resolution-deferred rows, not total-minus-banner; pending may raise23 to24', () => {
  const count = nodes.find(n => ts.isVariableDeclaration(n) && n.name.getText(ast) === 'nativeCloserPhotoCount') as ts.VariableDeclaration;
  const banner = nodes.find(n => ts.isJsxElement(n) && n.openingElement.tagName.getText(ast) === 'p'
    && n.getText(ast).includes('nativeCloserPhotoCount'))!;
  const jsx = (_type: unknown, props: any) => props.children;
  const sandbox: any = { exports: {}, require: () => ({ jsx, jsxs: jsx, Fragment: 'fragment' }) };
  vm.runInNewContext(ts.transpileModule(`exports.render=(isNative,nativeCloserPhotoCount,continuationPlan)=>(${banner.getText(ast)});`,
    { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, sandbox);
  const text = (value: any): string => Array.isArray(value) ? value.map(text).join('') : value == null || value === false ? '' : String(value);
  for (const pending of [0, 1]) {
    const regions = [...Array.from({ length: 23 }, () => ({ status: 'deferred', deferral: { code: 'automatic_limit' } })),
      ...Array.from({ length: 12 }, () => ({ status: 'deferred', deferral: { code: 'resolution' } })),
      ...Array.from({ length: pending }, () => ({ status: 'pending', deferral: { code: 'resolution' } }))];
    assert.equal(vm.runInNewContext(count.initializer!.getText(ast), { isNative: true, regions }), 12);
    assert.equal(23 + pending, pending ? 24 : 23);
    assert.equal(vm.runInNewContext(count.initializer!.getText(ast), { isNative: false, regions }), 0);
    const plan = { automatic: Array(12), deferred: Array(11 + pending) };
    const native = text(sandbox.exports.render(true, 12, plan));
    assert.ok(native.includes(`Puedes seguir leyendo ${23 + pending} zonas de esta foto.`));
    assert.ok(native.includes('Para otras 12, haz una foto más cercana.'));
    assert.equal(text(sandbox.exports.render(false, 0, plan)), `${23 + pending} regiones pendientes de lectura.`);
    assert.ok(!text(sandbox.exports.render(true, 0, plan)).includes('Para otras'));
  }
});

let ui: any = null;
if (values.ui) {
  const drawer = nodes.find(n => ts.isJsxElement(n) && n.openingElement.tagName.getText(ast) === 'Drawer')!;
  const declaration = (name: string) => (nodes.find(n => ts.isVariableDeclaration(n) && n.name.getText(ast) === name) as ts.VariableDeclaration).initializer!.getText(ast);
  const fixtureSource = `import React,{useState,useRef,useEffect}from'react';import{createRoot}from'react-dom/client';
import{Drawer,DrawerContent,DrawerHeader,DrawerTitle,DrawerDescription,DrawerFooter,DrawerClose}from'./src/components/ui/drawer';import{Button}from'./src/components/ui/button';import{Input}from'./src/components/ui/input';import{Pencil,Check,ChevronLeft,ChevronRight,RefreshCw,Trash2,CircleHelp}from'lucide-react';
const WinerimOriginalSheet=()=>null,WinerimSheetLookup=()=>null,WinerimCandidatePicker95=()=>null;
function Fixture(){const isNative=true;const[selectedRegionId,setSelectedRegionId]=useState('fixture');const[selectedCandidate,setCandidate]=useState({id:'candidate',name:'Synthetic label',producer:'Synthetic producer',vintage:2020,inferredFields:[],source:'label',originalSheet:{detailVerified:true}});
const selectedRegion=selectedRegionId?{id:'fixture',index:1,candidates:[selectedCandidate],error:null}:null,regions=selectedRegion?[selectedRegion]:[];
const regionEditorBody=useRef(null),regionEditorLayout=useRef(null);useEffect(${effect.arguments[0].getText(ast)},[isNative,selectedRegionId]);
const nativeConsumer=null,loading=false,regionActionsLocked=false,affinityExplanation=null,contextGuidance=<p>Confirma los datos visibles de esta referencia antes de continuar.</p>,candidateDiagnostics=null,identityEvidence=null;
const editCandidate=patch=>setCandidate(c=>({...c,...patch})),manualWineIdentityNotice=()=>'',identifySelectedManually=()=>{throw Error('No submit in geometry fixture')},moveSelection=()=>{},discardSelected=()=>{},reanalyzeSelected=()=>{},statusLabel=()=>'';
const referenceReview=${declaration('referenceReview')};
return ${drawer.getText(ast)}}createRoot(document.getElementById('root')).render(<Fixture/>);`;
  const bundle = buildSync({ stdin: { contents: fixtureSource, loader: 'tsx', resolveDir: root }, bundle: true, write: false,
    platform: 'browser', alias: { '@': resolve(root, 'src') } }).outputFiles[0].text;
  const rawCss = readFileSync(resolve(root, 'src/index.css'), 'utf8');
  const css = (await postcss([tailwindcss({ ...tailwindConfig, content: [{ raw: source + fixtureSource + ['drawer', 'button', 'input'].map(n => readFileSync(resolve(root, `src/components/ui/${n}.tsx`), 'utf8')).join('\n'), extension: 'tsx' }] })]).process(rawCss, { from: resolve(root, 'src/index.css') })).css;
  const python = String.raw`import json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
d=json.load(sys.stdin);cases=[]
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
 try:
  for width,height,size,keyboard in [(393,852,16,543),(852,393,16,280),(393,852,32,543),(956,440,32,260)]:
   c=b.new_context(viewport={'width':width,'height':height},service_workers='block');outbound=[];c.route('**/*',lambda r:(outbound.append(r.request.url),r.abort()));p=c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
   p.set_content('<style>'+d['css']+'</style><style>html{font-size:'+str(size)+'px;font-family:Arial}*{box-sizing:border-box}body{margin:0}button,input{font:inherit}html{--matchrim-safe-top:0px;--matchrim-safe-bottom:0px}</style><div id="root"></div>')
   p.evaluate('document.documentElement.classList.add("matchrim-native-platform")')
   if size>16:p.evaluate('document.documentElement.classList.add("matchrim-accessibility-text")')
   p.add_script_tag(content=d['bundle']);p.get_by_role('button',name='Corregir identificación').wait_for();p.wait_for_timeout(400)
   p.get_by_role('button',name='Corregir identificación').click();name=p.locator('#region-wine-name');p.wait_for_function('document.activeElement?.id==="region-wine-name"')
   original_font=name.evaluate('e=>getComputedStyle(e).fontSize')
   p.evaluate('document.documentElement.classList.add("matchrim-keyboard-visible")');p.set_viewport_size({'width':width,'height':keyboard});p.wait_for_timeout(150)
   def geometry(control):
    return control.evaluate('e=>{const b=e.closest(".matchrim-scan-region-body"),l=b.closest(".matchrim-scan-region-layout"),s=getComputedStyle(b).overflowY==="visible"?l:b,r=e.getBoundingClientRect(),q=s.getBoundingClientRect(),v=visualViewport;return {field:{top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height},clip:{top:Math.max(q.top,v.offsetTop),bottom:Math.min(q.bottom,v.offsetTop+v.height)},host:s.className,scrollTop:s.scrollTop,focused:e===document.activeElement}}')
   def check(control):
    p.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');g=geometry(control);g['actualViewport']=p.viewport_size;assert g['focused'] and g['field']['top']>=g['clip']['top']-.5 and g['field']['bottom']<=g['clip']['bottom']+.5,g;assert g['field']['left']>=-.5 and g['field']['right']<=p.viewport_size['width']+.5,g;return g
   first=check(name);name.fill('Synthetic label with a long name that changes the heading height while typing');changed=check(name);assert name.evaluate('e=>getComputedStyle(e).fontSize')==original_font
   producer=p.get_by_label('Bodega',exact=True);producer.focus();producer_result=check(producer)
   name.focus();p.set_viewport_size({'width':height,'height':keyboard});p.wait_for_timeout(150);rotated=check(name)
   p.set_viewport_size({'width':width,'height':keyboard});p.wait_for_timeout(150);check(name)
   if d['output']:
    Path(d['output']).mkdir(parents=True,exist_ok=True);p.screenshot(path=str(Path(d['output'])/('label-editor-'+str(width)+'x'+str(keyboard)+'-root'+str(size)+'.png')))
   assert not errors and not outbound,(errors,outbound)
   cases.append({'width':width,'height':height,'rootFont':size,'keyboardViewportHeight':keyboard,'focusedFieldAfterKeyboard':first,'afterInputHeadingReflow':changed,'producer':producer_result,'rotationWhileFocused':rotated,'fontUnchanged':original_font,'outboundCount':len(outbound)})
   c.close()
 finally:b.close()
print(json.dumps({'passed':True,'cases':cases,'scope':'Actual Drawer/referenceReview JSX and exact native effect with React/Vaul; expensive remote subcomponents suppressed. Chromium keyboard/viewport proxy only, not actual iOS acceptance.'}))`;
  const result = spawnSync('/Users/GOIKO/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3', ['-B', '-c', python], {
    input: JSON.stringify({ bundle, css, output: values.output ? resolve(values.output) : null }), encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', PYTHONPATH: '/private/tmp/matchrim91-python-deps' },
  });
  assert.equal(result.status, 0, result.stderr + result.stdout); ui = JSON.parse(result.stdout);
  console.log('PASS Four real React/Vaul editor layouts, keyboard shrink/input reflow/rotation, complete focused-field clipping checks');
}
const report = { passed: true, groups: checks.length, checks, ui, sourceSha256: createHash('sha256').update(source).digest('hex'),
  baseline: '05ca1e2', SDKOrNativeRuntimeUsed: false, appOrProviderCalls: 0,
  nativeKeyboardBridge: { ...nativeLabelKeyboard96, earlyNativeGuard: true, refsUndefinedOnWeb: true,
    whole05caSourceRestored: true, rejectedMutations: rejectedKeyboardBridgeMutations } };
if (values.output) { mkdirSync(resolve(values.output), { recursive: true }); writeFileSync(resolve(values.output, 'report.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); }
console.log(JSON.stringify(report));
}
