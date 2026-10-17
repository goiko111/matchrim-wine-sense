/* eslint-disable @typescript-eslint/no-explicit-any -- Actual JSX boundary and isolated browser fixture. */
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

const root = fileURLToPath(new URL('../', import.meta.url));
const { values } = parseArgs({ options: { ui: { type: 'boolean' }, output: { type: 'string' } } });
const path = 'src/pages/MyWines.tsx';
const source = readFileSync(resolve(root, path), 'utf8');
const historical = execFileSync('git', ['show', `c25b282:${path}`], { cwd: root, encoding: 'utf8' });
const extract = (text: string) => {
  const ast = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const matches: ts.JsxElement[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === 'Dialog'
      && node.openingElement.attributes.getText(ast).includes('showAddDialog')) matches.push(node);
    ts.forEachChild(node, visit);
  }; visit(ast); assert.equal(matches.length, 1);
  const dialog = matches[0], descendants: ts.JsxElement[] = [];
  const collect = (node: ts.Node) => { if (ts.isJsxElement(node)) descendants.push(node); ts.forEachChild(node, collect); };
  collect(dialog);
  const content = descendants.find(node => node.openingElement.tagName.getText(ast) === 'DialogContent')!;
  const header = descendants.find(node => node.openingElement.tagName.getText(ast) === 'DialogHeader')!;
  const body = content.children.find(node => ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === 'div') as ts.JsxElement;
  const pairs = descendants.filter(node => node.openingElement.attributes.getText(ast).includes('repeat(auto-fit,minmax(min(100%,12rem),1fr))'));
  return { ast, dialog, content, header, body, pairs };
};
const current = extract(source), old = extract(historical);
const webProjection = (part: ReturnType<typeof extract>) => {
  const result = ts.transform(part.dialog, [context => node => {
    const visit: ts.Visitor = node => {
      if (ts.isConditionalExpression(node) && node.condition.getText(part.ast) === 'isNative') return ts.visitNode(node.whenFalse, visit);
      if (ts.isJsxAttribute(node) && node.initializer && ts.isJsxExpression(node.initializer)) {
        let expression = node.initializer.expression;
        if (expression && ts.isConditionalExpression(expression) && expression.condition.getText(part.ast) === 'isNative') expression = expression.whenFalse;
        if (expression && ts.isIdentifier(expression) && expression.text === 'undefined') {
          assert.ok(['style', 'className', 'onOpenAutoFocus', 'ref'].includes(node.name.getText(part.ast)));
          return undefined;
        }
        if (expression && ts.isStringLiteral(expression)) return ts.factory.updateJsxAttribute(node, node.name, ts.factory.createStringLiteral(expression.text));
      }
      return ts.visitEachChild(node, visit, context);
    }; return ts.visitNode(node, visit) as ts.JsxElement;
  }]);
  const printed = ts.createPrinter({ removeComments: true }).printNode(ts.EmitHint.Unspecified, result.transformed[0], part.ast);
  result.dispose(); return printed;
};
const evaluateAttributes = (node: ts.JsxElement, native: boolean) => {
  const jsx = (_type: unknown, props: unknown) => props;
  const sandbox: any = { exports: {}, DialogContent: 'DialogContent', DialogHeader: 'DialogHeader', manualEditorBody: { current: null },
    require: (id: string) => { assert.equal(id, 'react/jsx-runtime'); return { jsx, jsxs: jsx }; } };
  const opening = node.openingElement.getText(current.ast).replace(/>$/, '/>');
  const body = `exports.props=(isNative)=>(${opening});`;
  vm.runInNewContext(ts.transpileModule(body, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText, sandbox);
  return sandbox.exports.props(native);
};
const checks: string[] = [];
const check = (name: string, run: () => void) => { run(); checks.push(name); console.log('PASS', name); };
const effects: string[] = [];
const findEffect = (node: ts.Node) => {
  if (ts.isCallExpression(node) && node.expression.getText(current.ast) === 'useEffect'
    && node.arguments[0]?.getText(current.ast).includes('const body = manualEditorBody.current')) {
    assert.equal(node.arguments[1].getText(current.ast), '[isNative, showAddDialog]'); effects.push(node.arguments[0].getText(current.ast));
  }
  ts.forEachChild(node, findEffect);
}; findEffect(current.ast); assert.equal(effects.length, 1);
const revealFixture = (options: { native?: boolean; open?: boolean; top?: number; bottom?: number; fieldTop?: number; fieldBottom?: number; inside?: boolean; body?: boolean; html?: boolean; viewport?: boolean } = {}) => {
  const windowEvents = new Map<string, () => void>(), viewportEvents = new Map<string, () => void>(), frames = new Map<number, () => void>();
  const events: string[] = []; let nextFrame = 0;
  const body = { scrollTop: 100, contains: () => options.inside !== false, getBoundingClientRect: () => ({ top: options.top ?? 40, bottom: options.bottom ?? 152, height: (options.bottom ?? 152) - (options.top ?? 40) }) };
  class Element { getBoundingClientRect() { const delta = body.scrollTop - 100; return { top: (options.fieldTop ?? 114) - delta, bottom: (options.fieldBottom ?? 140) - delta, height: (options.fieldBottom ?? 140) - (options.fieldTop ?? 114) }; } }
  const field = new Element();
  const target = (listeners: Map<string, () => void>, name: string) => ({
    addEventListener: (key: string, callback: () => void) => { assert.ok(['resize', 'focusin'].includes(key)); assert.ok(!listeners.has(key)); listeners.set(key, callback); events.push('add:' + name + ':' + key); },
    removeEventListener: (key: string, callback: () => void) => { assert.equal(listeners.get(key), callback); listeners.delete(key); events.push('remove:' + name); },
  });
  const observers: any[] = [];
  class Observer {
    disconnected = false; observed: unknown[] = [];
    constructor(readonly callback: () => void) { observers.push(this); }
    observe(value: unknown) { assert.equal(value, body); this.observed.push(value); }
    disconnect() { this.disconnected = true; }
  }
  const sandbox: any = { exports: {}, isNative: options.native !== false, showAddDialog: options.open !== false,
    manualEditorBody: { current: options.body === false ? null : body }, HTMLElement: Element, ResizeObserver: Observer,
    document: { activeElement: options.html === false ? {} : field },
    window: { ...target(windowEvents, 'window'), visualViewport: options.viewport === false ? undefined : target(viewportEvents, 'viewport') },
    requestAnimationFrame: (callback: () => void) => { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame: (id: number) => { frames.delete(id); },
  };
  vm.runInNewContext(ts.transpileModule(`exports.cleanup=(${effects[0]})();`, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, sandbox);
  const flush = () => { for (const id of [...frames.keys()]) { const callback = frames.get(id); frames.delete(id); callback?.(); } };
  const settle = () => { let turns = 0; while (frames.size) { assert.ok(++turns < 8); flush(); } };
  return { body, field, windowEvents, viewportEvents, frames, events, observers, flush, settle, cleanup: sandbox.exports.cleanup };
};
const indexCss = postcss.parse(readFileSync(resolve(root, 'src/index.css'), 'utf8'));
const cssRules: postcss.Rule[] = [];
indexCss.walkRules(rule => {
  if (rule.selectors.some(selector => selector.includes('.matchrim-native-cellar-'))
    || rule.selector === 'html.matchrim-native-platform.matchrim-accessibility-text *'
    || rule.selectors.includes('html.matchrim-native-platform textarea')) cssRules.push(rule);
});
check('Complete actual web dialog, all fields and every callback equal c25b282; only absent/undefined props and literal JSX syntax normalize', () => {
  assert.equal(webProjection(current), webProjection(old));
  assert.equal(evaluateAttributes(current.content, false).style, undefined);
  assert.equal(evaluateAttributes(current.content, false).onOpenAutoFocus, undefined);
  assert.equal(evaluateAttributes(current.header, false).className, undefined);
  const shared = 'src/components/ui/dialog.tsx';
  assert.equal(readFileSync(resolve(root, shared), 'utf8'), execFileSync('git', ['show', `c25b282:${shared}`], { cwd: root, encoding: 'utf8' }));
});
check('Actual native dialog disables transformed/animated fixed-close ancestor and uses physical close44/icon20/safe12/header56 with three adaptive field pairs', () => {
  const props = evaluateAttributes(current.content, true);
  assert.deepEqual(JSON.parse(JSON.stringify(props.style)), { transform: 'none', animation: 'none' });
  let prevented = 0; props.onOpenAutoFocus({ preventDefault: () => { prevented += 1; } }); assert.equal(prevented, 1);
  for (const token of ['left-0', 'top-0', 'flex', 'flex-col', 'h-[100dvh]', 'overflow-hidden', 'px-[16px]', 'gap-[16px]', '[&>button:last-child]:fixed',
    '[&>button:last-child]:right-[calc(12px+var(--matchrim-safe-right))]', '[&>button:last-child]:top-[calc(12px+var(--matchrim-safe-top))]',
    '[&>button:last-child]:h-[44px]', '[&>button:last-child]:w-[44px]', '[&>button:last-child_svg]:h-[20px]', '[&>button:last-child_svg]:w-[20px]']) {
    assert.ok(props.className.split(' ').includes(token), token);
  }
  assert.equal(evaluateAttributes(current.header, true).className, 'matchrim-native-cellar-editor-heading shrink-0 pr-[56px]');
  assert.equal(evaluateAttributes(current.body, true).className, 'matchrim-native-cellar-editor-body min-h-0 min-w-0 flex-1 space-y-[16px] overflow-y-auto overscroll-contain py-[8px]');
  assert.equal(evaluateAttributes(current.body, false).className, 'space-y-4 py-4');
  assert.equal(evaluateAttributes(current.body, false).ref, undefined);
  assert.ok(evaluateAttributes(current.body, true).ref);
  const styles = (selector: string, short = false) => {
    const matches = cssRules.filter(rule => rule.selectors.includes(selector) && (rule.parent?.type === 'atrule') === short);
    assert.equal(matches.length, 1);
    const rule = matches[0];
    if (short) { assert.equal((rule.parent as postcss.AtRule).name, 'media'); assert.equal((rule.parent as postcss.AtRule).params, '(max-height: 240px)'); }
    assert.ok(rule.selectors.every(value => value.startsWith('html.matchrim-native-platform')));
    return Object.fromEntries(rule.nodes.map(node => { assert.equal(node.type, 'decl'); const declaration = node as postcss.Declaration; return [declaration.prop, declaration.value]; }));
  };
  assert.deepEqual(styles('html.matchrim-native-platform .matchrim-native-cellar-dialog'), { 'padding-left': 'calc(16px + var(--matchrim-safe-left))', 'padding-right': 'calc(16px + var(--matchrim-safe-right))' });
  assert.deepEqual(styles('html.matchrim-native-platform.matchrim-keyboard-visible .matchrim-native-cellar-dialog', true), { 'padding-top': '0', 'padding-bottom': '0', 'padding-right': 'calc(72px + var(--matchrim-safe-right))' });
  assert.deepEqual(styles('html.matchrim-native-platform.matchrim-keyboard-visible .matchrim-native-cellar-editor-body', true), { 'padding-top': '0', 'padding-bottom': '0' });
  assert.deepEqual(styles('html.matchrim-native-platform.matchrim-keyboard-visible .matchrim-native-cellar-editor-body input', true), { 'padding-top': '2px', 'padding-bottom': '2px' });
  assert.deepEqual(styles('html.matchrim-native-platform.matchrim-keyboard-visible .matchrim-native-cellar-editor-heading'), { display: 'none' });
  assert.deepEqual(styles('html.matchrim-native-platform textarea'), { 'min-height': '44px', height: 'auto' });
  assert.equal(current.pairs.length, 3);
  for (const pair of current.pairs) {
    assert.equal(evaluateAttributes(pair, true).className, 'grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-4');
    assert.equal(evaluateAttributes(pair, false).className, 'grid grid-cols-2 gap-4');
  }
});
check('Actual native reveal effect scrolls clipped fields only, leaves visible/foreign/missing nodes alone, and is a complete web/closed no-op', () => {
  for (const [options, expected] of [
    [{ fieldTop: 114, fieldBottom: 180 }, 136], [{ fieldTop: 10, fieldBottom: 30 }, 62], [{ fieldTop: 60, fieldBottom: 100 }, 100],
    [{ inside: false }, 100], [{ body: false }, 100], [{ html: false }, 100],
  ] as const) {
    const fixture = revealFixture(options); fixture.windowEvents.get('resize')!(); fixture.settle(); assert.equal(fixture.body.scrollTop, expected); fixture.cleanup();
  }
  for (const options of [{ native: false }, { open: false }]) {
    const fixture = revealFixture(options); assert.equal(fixture.cleanup, undefined); assert.equal(fixture.events.length, 0); assert.equal(fixture.frames.size, 0);
  }
  const tight = revealFixture({ top: 36, bottom: 152, fieldTop: 114, fieldBottom: 227 });
  tight.windowEvents.get('resize')!(); tight.settle(); const field = tight.field.getBoundingClientRect();
  assert.ok(field.top >= 36 && field.bottom <= 152, `A113px field fits a116px body and must not be clipped by a fixed inset: ${JSON.stringify(field)}`);
  tight.cleanup();
});
check('Actual reveal effect coalesces resize/focus/observer signals and cleans both RAFs, all listeners and observer', () => {
  const fixture = revealFixture(); fixture.settle(); assert.deepEqual(fixture.events, ['add:window:resize', 'add:window:focusin', 'add:viewport:resize']);
  assert.equal(fixture.observers.length, 1); assert.deepEqual(fixture.observers[0].observed, [fixture.body]);
  fixture.windowEvents.get('resize')!(); fixture.viewportEvents.get('resize')!(); fixture.windowEvents.get('focusin')!(); fixture.observers[0].callback(); assert.equal(fixture.frames.size, 1);
  fixture.cleanup(); assert.equal(fixture.frames.size, 0); assert.equal(fixture.windowEvents.size, 0); assert.equal(fixture.viewportEvents.size, 0);
  fixture.settle(); assert.equal(fixture.body.scrollTop, 100); assert.equal(fixture.observers[0].disconnected, true);
  assert.deepEqual(fixture.events, ['add:window:resize', 'add:window:focusin', 'add:viewport:resize', 'remove:window', 'remove:window', 'remove:viewport']);
  const early = revealFixture(); early.cleanup(); early.settle(); assert.equal(early.observers[0].observed.length, 0); assert.equal(early.observers[0].disconnected, true); assert.equal(early.frames.size, 0);
  const noViewport = revealFixture({ viewport: false }); noViewport.cleanup(); assert.deepEqual(noViewport.events, ['add:window:resize', 'add:window:focusin', 'remove:window', 'remove:window']);
});

let ui: any = null;
if (values.ui) {
  const keyboardRules: string[] = [];
  indexCss.walkRules(rule => {
    if (rule.selectors.includes('html.matchrim-native-platform.matchrim-keyboard-visible .matchrim-native-cellar-editor-heading')) {
      assert.equal(rule.nodes.length, 1); assert.equal(rule.nodes[0].type, 'decl');
      const declaration = rule.nodes[0] as postcss.Declaration;
      assert.equal(declaration.prop, 'display'); assert.equal(declaration.value, 'none');
      keyboardRules.push(rule.toString());
    }
  }); assert.equal(keyboardRules.length, 1);
  const fixture = `import React,{useState,useRef,useEffect}from'react';import{createRoot}from'react-dom/client';
import{Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription}from'./src/components/ui/dialog';import{Input}from'./src/components/ui/input';import{Label}from'./src/components/ui/label';
import{Button}from'./src/components/ui/button';import{Textarea}from'./src/components/ui/textarea';import{Badge}from'./src/components/ui/badge';import{Loader2,CheckCircle,Search,AlertCircle}from'lucide-react';
function Fixture(){const[showAddDialog,setShowAddDialog]=useState(false);window.openDialog=()=>setShowAddDialog(true);const isNative=true,extractedData=null;
const manualEditorBody=useRef(null);useEffect(${effects[0]},[isNative,showAddDialog]);
const[formData,setFormData]=useState({name:'Synthetic absent QA',producer:'Synthetic producer',vintage:'2020',region:'Synthetic region',country:'Synthetic country',grape_varieties:'Synthetic grape',alcohol_content:'0',tasting_notes:'',personal_note:'',quantity:'0'});
const closeAddDialog=()=>{window.closeEvents.push(false);setShowAddDialog(false)};const updateManualWineName=name=>setFormData({...formData,name});
const manualWineName=formData.name,manualWineLookupStatus='done',manualWineSelectedFromResults=false,manualWineSuggestions=[],manualWineNameConfirmed=false,purchaseDialogMode='collection',saving=false,canContinueManualWine=false;
const handleManualSuggestionSelect=()=>{},setManualWineNameConfirmed=()=>{},setManualWineSelectedFromResults=()=>{},startManualWineSave=()=>{};
return ${current.dialog.getText(current.ast)}}
window.closeEvents=[];createRoot(document.getElementById('root')).render(<Fixture/>);`;
  const shared = readFileSync(resolve(root, 'src/components/ui/dialog.tsx'), 'utf8');
  const bundle = buildSync({ stdin: { contents: fixture, loader: 'tsx', resolveDir: root }, bundle: true, write: false, platform: 'browser', alias: { '@': resolve(root, 'src') } }).outputFiles[0].text;
  const controls = ['input', 'button', 'textarea', 'label', 'badge'].map(name => readFileSync(resolve(root, `src/components/ui/${name}.tsx`), 'utf8')).join('\n');
  const css = (await postcss([tailwindcss({ content: [{ raw: fixture + shared + controls, extension: 'tsx' }], corePlugins: { preflight: false } })]).process('@tailwind utilities;', { from: undefined })).css
    + cssRules.map(rule => rule.parent?.type === 'atrule' ? `@media ${(rule.parent as postcss.AtRule).params}{${rule.toString()}}` : rule.toString()).join('\n');
  const python = String.raw`import json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
d=json.load(sys.stdin);cases=[]
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
 try:
  for width,height,size,safe_top in [(393,543,16,0),(393,700,48,0),(852,393,32,0),(320,700,32,0),(393,543,48,62),(956,168,48,20)]:
   context=b.new_context(viewport={'width':width,'height':max(height,700)},service_workers='block');outbound=[]
   context.route('**/*',lambda r:(outbound.append(r.request.url),r.abort()))
   p=context.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
   p.set_content('<style>'+d['css']+'</style><style>:root{--matchrim-safe-top:'+str(safe_top)+'px;--matchrim-safe-left:0px;--matchrim-safe-right:0px;--matchrim-safe-bottom:0px}html{font-family:Arial;font-size:'+str(size)+'px}*{box-sizing:border-box}body{margin:0}button,input{font:inherit}</style><div id="root"></div>')
   p.evaluate('document.documentElement.classList.add("matchrim-native-platform")')
   if size>16:p.evaluate('document.documentElement.classList.add("matchrim-accessibility-text")')
   p.add_script_tag(content=d['bundle']);p.wait_for_function('typeof window.openDialog==="function"');assert p.get_by_role('dialog').count()==0
   p.evaluate('window.openDialog()');dialog=p.get_by_role('dialog');dialog.wait_for();close=p.get_by_role('button',name='Close',exact=True)
   assert dialog.evaluate('e=>getComputedStyle(e).transform')=='none';assert dialog.evaluate('e=>getComputedStyle(e).animationName')=='none'
   assert not p.evaluate('document.activeElement?.tagName==="INPUT"')
   name=p.locator('#name');name.focus();assert name.evaluate('e=>e===document.activeElement')
   font_before=name.evaluate('e=>getComputedStyle(e).fontSize')
   p.evaluate('document.documentElement.classList.add("matchrim-keyboard-visible")');p.set_viewport_size({'width':width,'height':min(height,543)})
   p.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
   name_rect=name.bounding_box();assert name_rect['y']>=0 and name_rect['y']+name_rect['height']<=min(height,543),(width,size,name_rect)
   assert name.evaluate('e=>getComputedStyle(e).fontSize')==font_before
   assert name.evaluate('e=>parseFloat(getComputedStyle(e).minHeight)')>=44
   assert p.locator('.matchrim-native-cellar-editor-heading').evaluate('e=>getComputedStyle(e).display')=='none'
   body=dialog.locator(':scope > div').nth(1);assert body.evaluate('e=>e.clientHeight>44&&e.scrollHeight>e.clientHeight')
   if d['output']:
    Path(d['output']).mkdir(parents=True,exist_ok=True);p.screenshot(path=str(Path(d['output'])/('keyboard-name-'+str(width)+'x'+str(min(height,543))+'-root'+str(size)+'-safe'+str(safe_top)+'.png')))
   focused_fields={}
   for field_id in (['name','producer','vintage','region','country','grapes','alcohol','notes','personal','quantity'] if height>=393 else ['name']):
    control=p.locator('#'+field_id);control.focus();p.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');r=control.bounding_box()
    assert control.evaluate('e=>e===document.activeElement') and r['y']>=-.5 and r['y']+r['height']<=min(height,543)+.5,(width,size,field_id,r)
    focused_fields[field_id]=r
   rectangles=[]
   for end in [False,True]:
    body.evaluate('(e,end)=>e.scrollTop=end?e.scrollHeight:0',end);r=close.bounding_box();icon=close.locator('svg').bounding_box();rectangles.append(r)
    assert abs(r['width']-44)<.5 and abs(r['height']-44)<.5 and abs(r['y']-(12+safe_top))<.5 and abs(r['x']-(width-56))<.5,(width,size,r)
    assert abs(icon['width']-20)<.5 and abs(icon['height']-20)<.5
   for field in ['producer','vintage','region','country','grapes','alcohol']:
    r=p.locator('#'+field).bounding_box();assert r['x']>=-.5 and r['x']+r['width']<=width+.5,(field,r)
   if d['output']:
    Path(d['output']).mkdir(parents=True,exist_ok=True);p.screenshot(path=str(Path(d['output'])/('dialog-'+str(width)+'x'+str(height)+'-root'+str(size)+'-safe'+str(safe_top)+'.png')))
   close.click();p.wait_for_function('document.querySelector("[role=dialog]")===null');assert p.evaluate('window.closeEvents')==[False]
   assert not errors and not outbound
   cases.append({'width':width,'height':min(height,543),'rootFont':size,'safeTop':safe_top,'focusedNameAfterKeyboardResize':name_rect,'focusedFieldsWithoutManualScroll':focused_fields,'closeAtTopAndBottom':rectangles,'closedAfterActualPointer':True,'outboundRequests':len(outbound)})
   context.close()
 finally:b.close()
print(json.dumps({'passed':True,'cases':cases,'scope':'Complete actual Add/Edit dialog JSX with real React/Radix controls and actual native heading CSS; keyboard class plus viewport-resize emulation, not iOS keyboard/dynamic-type acceptance'}))`;
  const result = spawnSync(process.env.MATCHRIM95_TEST_PYTHON ?? '/Users/GOIKO/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3', ['-c', python], {
    input: JSON.stringify({ bundle, css, output: values.output ? resolve(values.output) : null }), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', PYTHONPATH: process.env.PYTHONPATH ?? '/tmp/matchrim91-python-deps' },
  });
  assert.equal(result.status, 0, result.stderr + result.stdout); ui = JSON.parse(result.stdout);
  console.log('PASS Actual React/Radix close at scroll extremes, focused input/543px, landscape and root48; closed remains unmounted');
}
const report = { passed: true, unitGroups: checks.length, checks, ui, sourceHash: createHash('sha256').update(source).digest('hex'), cssHash: createHash('sha256').update(indexCss.toString()).digest('hex'), appWrites: 0 };
if (values.output) { mkdirSync(resolve(values.output), { recursive: true }); writeFileSync(resolve(values.output, 'report.json'), JSON.stringify(report, null, 2) + '\n'); }
console.log(JSON.stringify(report));
