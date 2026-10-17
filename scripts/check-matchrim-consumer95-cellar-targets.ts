/* eslint-disable @typescript-eslint/no-explicit-any -- Controlled JSX fixture and browser boundary. */
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import vm from 'node:vm';
import ts from 'typescript';
import { buildSync } from 'esbuild';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';

const root = fileURLToPath(new URL('../', import.meta.url));
const { values } = parseArgs({ options: { ui: { type: 'boolean' }, output: { type: 'string' }, before: { type: 'string' } } });
const path = 'src/pages/MyWines.tsx';
const source = readFileSync(resolve(root, path), 'utf8');
const before = execFileSync('git', ['show', `c25b282:${path}`], { cwd: root, encoding: 'utf8' });
const extract = (text: string) => {
  const ast = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const rows: ts.JsxElement[] = [], buttons: ts.JsxElement[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isJsxElement(node)) {
      const name = node.openingElement.tagName.getText(ast), text = node.getText(ast);
      if (name === 'div' && text.includes('Entrena mi perfil') && text.includes('<Switch')) rows.push(node);
      if (name === 'Button' && text.includes("'He revisado el nombre'")) buttons.push(node);
    }
    ts.forEachChild(node, visit);
  }; visit(ast);
  assert.equal(buttons.length, 1);
  rows.sort((a, b) => a.getWidth(ast) - b.getWidth(ast)); assert.ok(rows[0]);
  return { row: rows[0].getText(ast), manual: buttons[0].getText(ast) };
};
const current = extract(source), historical = extract(before);
const jsx = (type: string, props: any) => ({ type, props });
const nodes = (value: any): any[] => Array.isArray(value) ? value.flatMap(nodes)
  : value && typeof value === 'object' && 'type' in value ? [value, ...nodes(value.props.children)] : [];
const shape = (value: any): any => Array.isArray(value) ? Array.from(value).filter(x => x != null && x !== false).map(shape)
  : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).filter(([, x]) => x !== undefined).map(([key, x]) => [key, shape(x)]))
    : typeof value === 'function' ? '[handler]' : value;
const load = (fragment: typeof current) => {
  const sandbox: any = { exports: {}, Switch: 'Switch', Badge: 'Badge', Sparkles: 'Sparkles', Button: 'Button', CheckCircle: 'CheckCircle',
    require: (id: string) => { assert.equal(id, 'react/jsx-runtime'); return { jsx, jsxs: jsx, Fragment: 'Fragment' }; } };
  const body = `exports.render=({isNative,wine,savingWineActions,handleToggleProfileTraining,manualWineNameConfirmed,setManualWineNameConfirmed,setManualWineSelectedFromResults})=><>${fragment.row}${fragment.manual}</>;`;
  vm.runInNewContext(ts.transpileModule(body, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText, sandbox);
  return sandbox.exports.render as (props: any) => any;
};
const render = load(current), oldRender = load(historical);
const checks: string[] = [];
const check = (name: string, run: () => void) => { run(); checks.push(name); console.log('PASS', name); };
const props = (native = true, id = 'synthetic-cellar95-a', training = false, saving = false, attrs = true, confirmed = false) => ({
  isNative: native, wine: { id, name: 'Synthetic wine', rating: 'love', sensory_attributes: attrs ? {} : null, use_for_profile_training: training },
  savingWineActions: new Set(saving ? [id] : []), manualWineNameConfirmed: confirmed,
  handleToggleProfileTraining: () => {}, setManualWineNameConfirmed: () => {}, setManualWineSelectedFromResults: () => {},
});
if (values.before) check('Full pre-slice source is byte-identical outside the two reviewed native presentation edits', () => {
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits: Array<{ start: number; end: number; text: string }> = [];
  const visit = (node: ts.Node) => {
    if (ts.isConditionalExpression(node) && node.condition.getText(ast) === 'isNative') {
      if (ts.isJsxElement(node.whenTrue) && node.whenTrue.openingElement.tagName.getText(ast) === 'label'
        && node.whenTrue.getText(ast).includes('cellar-training-')) {
        edits.push({ start: node.getStart(ast), end: node.end, text: node.whenFalse.getText(ast) });
      }
      if (ts.isStringLiteral(node.whenTrue) && node.whenTrue.text === 'h-auto min-h-[44px] w-full min-w-0 max-w-full flex-col gap-[4px] whitespace-normal px-[12px] py-[10px] [overflow-wrap:normal]') {
        assert.equal(node.whenFalse.getText(ast), '"gap-2"');
        const attribute = node.parent.parent; assert.ok(ts.isJsxAttribute(attribute));
        edits.push({ start: attribute.getStart(ast), end: attribute.end, text: 'className="gap-2"' });
      }
    }
    ts.forEachChild(node, visit);
  }; visit(ast); assert.equal(edits.length, 2);
  let projected = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) projected = projected.slice(0, edit.start) + edit.text + projected.slice(edit.end);
  assert.equal(projected.trimEnd(), readFileSync(resolve(values.before!), 'utf8').trimEnd());
});
check('Actual complete web training/manual JSX equals historical source for all32 state combinations', () => {
  for (const training of [false, true]) for (const saving of [false, true]) for (const attrs of [false, true]) for (const confirmed of [false, true]) {
    for (const id of ['synthetic-cellar95-a', 'synthetic-cellar95-b']) {
      const input = props(false, id, training, saving, attrs, confirmed);
      assert.deepEqual(shape(render(input)), shape(oldRender(input)));
    }
  }
});
check('Native association is stable, distinct per row and has no manual click handler or nested button wrapper', () => {
  for (const id of ['synthetic-cellar95-a', 'synthetic-cellar95-b']) {
    const tree = nodes(render(props(true, id))), label = tree.find(node => node.type === 'label');
    assert.ok(label); assert.equal(label.props.htmlFor, `cellar-training-${id}`);
    assert.equal(label.props.onClick, undefined); assert.match(label.props.className, /min-h-\[44px\].*min-w-\[44px\]/);
    const control = nodes(label).find(node => node.type === 'Switch'); assert.ok(control);
    assert.equal(control.props.id, label.props.htmlFor);
    assert.equal(nodes(label).filter(node => node.type === 'button' || node.type === 'Button').length, 0);
  }
});
check('Every native Switch prop except its association id remains identical to web and historical Switch', () => {
  for (const training of [false, true]) for (const saving of [false, true]) {
    const native = nodes(render(props(true, undefined, training, saving))).find(node => node.type === 'Switch').props;
    const { id, ...same } = native; assert.ok(id);
    const web = nodes(oldRender(props(false, undefined, training, saving))).find(node => node.type === 'Switch').props;
    assert.deepEqual(shape(same), shape(web));
  }
});
check('Actual callback forwards only its own row and explicit Boolean, including opting back in from false', () => {
  const events: unknown[] = [];
  for (const id of ['synthetic-cellar95-a', 'synthetic-cellar95-b']) {
    const input = props(true, id); input.handleToggleProfileTraining = (...args: any[]) => { events.push(args); };
    const control = nodes(render(input)).find(node => node.type === 'Switch');
    control.props.onCheckedChange(true); control.props.onCheckedChange(false);
  }
  assert.deepEqual(events, [['synthetic-cellar95-a', true], ['synthetic-cellar95-a', false], ['synthetic-cellar95-b', true], ['synthetic-cellar95-b', false]]);
});
check('Missing sensory evidence has no Switch or associated target; existing badge stays unchanged', () => {
  const tree = nodes(render(props(true, undefined, false, false, false)));
  assert.equal(tree.filter(node => node.type === 'Switch' || node.type === 'label').length, 0);
  assert.equal(tree.filter(node => node.type === 'Badge').length, 1);
});
check('Manual identity handler is unchanged and native-only layout can wrap without widening the dialog', () => {
  const events: unknown[] = [], input = props();
  input.setManualWineNameConfirmed = value => { events.push(['confirmed', value]); };
  input.setManualWineSelectedFromResults = value => { events.push(['selected', value]); };
  const button = nodes(render(input)).find(node => node.type === 'Button'); button.props.onClick();
  assert.deepEqual(events, [['confirmed', true], ['selected', false]]);
  assert.match(button.props.className, /w-full.*min-w-0.*flex-col.*whitespace-normal/);
  assert.equal(nodes(render(props(false))).find(node => node.type === 'Button').props.className, 'gap-2');
});

let ui: any = null;
if (values.ui) {
  const fixture = `import React,{useState} from 'react';import{createRoot}from'react-dom/client';
import{Switch}from'./src/components/ui/switch';import{Button}from'./src/components/ui/button';import{Badge}from'./src/components/ui/badge';import{Sparkles,CheckCircle}from'lucide-react';
function Fixture({disabled=false,checked=false}){const isNative=true;const[training,setTraining]=useState(checked);const[manualWineNameConfirmed,setConfirmed]=useState(false);
const wine={id:'synthetic-cellar95-a',name:'Synthetic wine',sensory_attributes:{},use_for_profile_training:training};const savingWineActions=new Set(disabled?[wine.id]:[]);
const handleToggleProfileTraining=(id,next)=>{window.events.push([id,next]);setTraining(next)};
const setManualWineNameConfirmed=value=>{window.manualEvents.push(['confirmed',value]);setConfirmed(value)};const setManualWineSelectedFromResults=value=>window.manualEvents.push(['selected',value]);
return <main>${current.row}${current.manual}</main>}
const root=createRoot(document.getElementById('root'));let key=0;window.mountCase=options=>{window.events=[];window.manualEvents=[];root.render(<Fixture key={++key} {...options}/>)};window.mountCase({});`;
  const bundle = buildSync({ stdin: { contents: fixture, loader: 'tsx', resolveDir: root }, bundle: true,
    write: false, platform: 'browser', alias: { '@': resolve(root, 'src') } }).outputFiles[0].text;
  const css = (await postcss([tailwindcss({ content: [{ raw: fixture + readFileSync(resolve(root, 'src/components/ui/switch.tsx'), 'utf8')
    + readFileSync(resolve(root, 'src/components/ui/button.tsx'), 'utf8'), extension: 'tsx' }], corePlugins: { preflight: false } })])
    .process('@tailwind utilities;', { from: undefined })).css;
  const python = String.raw`import json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
data=json.load(sys.stdin);results=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
 try:
  for width,root_size in [(393,16),(320,32)]:
   context=browser.new_context(viewport={'width':width,'height':700},service_workers='block');context.route('**/*',lambda route:route.abort())
   page=context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
   page.set_content('<style>'+data['css']+'</style><style>html{font-family:Arial;font-size:'+str(root_size)+'px}*{box-sizing:border-box}body{margin:0}main{width:calc(100vw - 96px);margin:24px auto}button{font-family:inherit}</style><div id="root"></div>')
   page.add_script_tag(content=data['bundle']);switch=page.get_by_role('switch');switch.wait_for();label=page.locator('label[for="cellar-training-synthetic-cellar95-a"]')
   target=label.bounding_box();control=switch.bounding_box();assert target['width']>=44 and target['height']>=44
   if root_size==16: assert abs(control['width']-44)<=1 and abs(control['height']-24)<=1
   point={'x':target['x']+target['width']/2,'y':target['y']+2} if target['height']>control['height']+4 else {'x':target['x']+target['width']/2,'y':target['y']+target['height']/2}
   page.mouse.click(**point);page.wait_for_function('window.events.length===1');assert page.evaluate('window.events')==[['synthetic-cellar95-a',True]];assert switch.get_attribute('aria-checked')=='true'
   page.mouse.click(**point);page.wait_for_function('window.events.length===2');assert page.evaluate('window.events')[-1]==['synthetic-cellar95-a',False]
   page.evaluate('window.mountCase({disabled:true})');page.wait_for_function('document.querySelector("button[role=switch]").disabled');target=label.bounding_box();page.mouse.click(target['x']+target['width']/2,target['y']+2);page.wait_for_timeout(100);assert page.evaluate('window.events')==[]
   manual=page.get_by_role('button',name='He revisado el nombre',exact=True);manual.scroll_into_view_if_needed();rect=manual.bounding_box();assert rect['x']>=0 and rect['x']+rect['width']<=width and rect['height']>=44
   words=manual.evaluate(r'''button=>{const words=[];const walker=document.createTreeWalker(button,NodeFilter.SHOW_TEXT);for(let n;n=walker.nextNode();)for(const m of n.textContent.matchAll(/\p{L}+/gu)){const r=document.createRange();r.setStart(n,m.index);r.setEnd(n,m.index+m[0].length);words.push({word:m[0],lines:new Set([...r.getClientRects()].filter(x=>x.width>0).map(x=>Math.round(x.top))).size})}return words}''');assert words and all(word['lines']==1 for word in words)
   if data['output']:
    Path(data['output']).mkdir(parents=True,exist_ok=True);page.screenshot(path=str(Path(data['output'])/('cellar-targets-'+str(width)+'-root'+str(root_size)+'.png')),full_page=True)
   manual.click();assert page.evaluate('window.manualEvents')==[['confirmed',True],['selected',False]];assert errors==[]
   results.append({'width':width,'rootFont':root_size,'label':target,'switch':control,'manualButton':rect,'words':words,'realLabelPointerActivations':2,'disabledActivations':0})
   context.close()
 finally:browser.close()
print(json.dumps({'passed':True,'cases':results,'networkCalls':0,'scope':'Actual extracted JSX, real React/Radix, controlled CSS and actual label-padding pointer activation; not a full built-page or device proof'}))`;
  const result = spawnSync(process.env.MATCHRIM95_TEST_PYTHON ?? '/Users/GOIKO/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3', ['-c', python], {
    input: JSON.stringify({ bundle, css, output: values.output ? resolve(values.output) : null }), encoding: 'utf8',
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', PYTHONPATH: process.env.PYTHONPATH ?? '/tmp/matchrim91-python-deps' }, maxBuffer: 32 * 1024 * 1024,
  });
  assert.equal(result.status, 0, result.stderr + result.stdout); ui = JSON.parse(result.stdout); console.log('PASS Actual React/Radix label-pointer activation and root32 manual reflow');
}
const report = { passed: true, unitGroups: checks.length, checks, ui, sourcePath: path, appNetworkCalls: 0, accountWrites: 0 };
if (values.output) { mkdirSync(resolve(values.output), { recursive: true }); writeFileSync(resolve(values.output, 'report.json'), JSON.stringify(report, null, 2) + '\n'); }
console.log(JSON.stringify(report));
