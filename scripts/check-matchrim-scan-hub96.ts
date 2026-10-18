/* eslint-disable @typescript-eslint/no-explicit-any -- Browser receipts execute the real Scan/ScanHub with inert remote boundaries. */
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { build } from 'esbuild';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import tailwindConfig from '../tailwind.config';

const root = fileURLToPath(new URL('../', import.meta.url));
const revision = 'efc61c547fb04e1ac5adbe4974dbfe29aebd59fa';
export const scanHub96Marker = '/* Native accessibility scan hub keeps option controls within the viewport. */';
export const scanHub96End = '/* End native accessibility scan hub. */\n';
export function restoreNativeScanHub96(css: string) {
  const start = css.indexOf(scanHub96Marker), end = css.indexOf(scanHub96End, start);
  assert.ok(start >= 0 && end > start);
  assert.equal(css.split(scanHub96Marker).length, 2);
  const block = css.slice(start, end + scanHub96End.length);
  assert.equal(createHash('sha256').update(block).digest('hex'), '056d4d2f5b3907c4051637884114826a11f1321a8d944c22cff3a1355e5a2f02');
  return css.slice(0, start) + css.slice(end + scanHub96End.length);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({ options: { ui: { type: 'boolean' }, baseline: { type: 'boolean' }, preview: { type: 'boolean' }, output: { type: 'string' } } });
  const files = ['src/pages/Scan.tsx', 'src/components/wine-import/ScanHub.tsx', 'src/components/MobileBottomNav.tsx'];
  const source = Object.fromEntries(files.map(p => [p, readFileSync(resolve(root, p), 'utf8')]));
  const priorCss = execFileSync('git', ['show', `${revision}:src/index.css`], { cwd: root, encoding: 'utf8' });
  const css = readFileSync(resolve(root, 'src/index.css'), 'utf8');
  const checks: string[] = [];
  const check = (name: string, fn: () => void) => { fn(); checks.push(name); console.log('PASS', name); };
  check('Whole Scan/ScanHub/nav sources, options, callbacks, content, route parsing and all five mode paths stay byte exact', () => {
    for (const p of files) assert.equal(source[p], execFileSync('git', ['show', `${revision}:${p}`], { cwd: root, encoding: 'utf8' }));
  });
  if (!values.baseline) {
    check('One exact native-accessibility hub-only CSS block inverse restores the entire EFC stylesheet', () => {
      assert.equal(restoreNativeScanHub96(css), priorCss);
    });
    check('No font cap, scale shutdown, title truncation, changed text or non-hub/normal/web selector', () => {
      const block = css.slice(css.indexOf(scanHub96Marker), css.indexOf(scanHub96End));
      postcss.parse(block).walkRules(rule => {
        for (const selector of rule.selectors) {
          assert.ok(selector.startsWith('html.matchrim-native-platform.matchrim-accessibility-text '));
          assert.ok(selector.includes(':has(#more-scan-options-title)'));
        }
      });
      postcss.parse(block).walkDecls(d => assert.ok(!/^(font|line-height|zoom|-webkit-text-size-adjust|text-overflow|max-height)/.test(d.prop), d.prop));
      assert.ok(!block.includes('display: none') && !block.includes('visibility: hidden'));
    });
    check('Scope, title and scale negative controls are rejected without changing any old oracle', () => {
      for (const [from, to] of [['.matchrim-native-platform.matchrim-accessibility-text', '.matchrim-native-platform'],
        [':has(#more-scan-options-title)', ''], ['gap: 8px;', 'gap: 8px; font-size: 16px;'],
        ['grid-column: 1 / -1;', 'grid-column: 1 / -1; overflow: hidden;']]) {
        const start = css.indexOf(scanHub96Marker), block = css.slice(start);
        assert.ok(block.includes(from));
        assert.throws(() => restoreNativeScanHub96(css.slice(0, start) + block.replace(from, to)));
      }
    });
  }
  check('Actual native MAX is not assumed32: native UIFont ratio and C14 effective1rem49px inference are recorded separately', () => {
    const native = readFileSync(resolve(root, 'ios/App/App/AppDelegate.swift'), 'utf8');
    assert.ok(native.includes('let scale = max(preferredSize / standardSize, 0.94)'));
    assert.ok(native.includes("document.documentElement.style.fontSize = '100%'"));
    assert.ok(native.includes("document.documentElement.style.webkitTextSizeAdjust = '\\(percentage)%'"));
    // C14:440pt width minus342pt button width leaves49pt on each side; the hub main uses1rem padding.
    assert.equal((440 - 342) / 2, 49);
  });

  let ui: any = null;
  if (values.ui) {
    const entry = `import React,{useLayoutEffect,useState}from'react';import{createRoot}from'react-dom/client';
import{MemoryRouter,Routes,Route,useLocation}from'react-router-dom';import Scan from'./src/pages/Scan';
function Observe({epoch}){const path=useLocation().pathname;useLayoutEffect(()=>{window.__route=path;window.__committed={epoch,path}},[epoch,path]);return null}function Fixture(){const[k,setK]=useState(0),[initial,setInitial]=useState('/escanear');window.__reset=(path='/escanear')=>{setInitial(path);setK(v=>v+1);window.scrollTo(0,0);return k+1};return <MemoryRouter key={k} initialEntries={[initial]}><Observe epoch={k}/><Routes><Route path='/escanear' element={<Scan/>}/><Route path='/escanear/:mode' element={<Scan/>}/><Route path='/restaurante' element={<h1>Restaurant destination boundary</h1>}/></Routes></MemoryRouter>}createRoot(document.getElementById('root')).render(<Fixture/>);`;
    const bundle = (await build({ stdin: { contents: entry, loader: 'tsx', resolveDir: root }, bundle: true, write: false,
      platform: 'browser', jsx: 'automatic', alias: { '@': resolve(root, 'src') }, plugins: [{ name: 'inactive-remote-boundaries', setup(b) {
        b.onLoad({ filter: /(?:MultiWineLabelScanner|WineMenuScanner|FoodPairingScanner|WineShopLinkAdvisor|AppNav)\.tsx$/ }, () => ({ contents: 'export const MultiWineLabelScanner=()=>null;export default ()=>null;', loader: 'tsx' }));
        b.onLoad({ filter: /contexts\/AuthContext\.tsx$/ }, () => ({ contents: 'export const useAuth=()=>({user:null,loading:false});', loader: 'tsx' }));
        b.onLoad({ filter: /integrations\/supabase\/client\.ts$/ }, () => ({ contents: "export const supabase=new Proxy({}, {get(){throw Error('No backend in hub fixture')}});", loader: 'ts' }));
        b.onLoad({ filter: /lib\/analytics\.ts$/ }, () => ({ contents: 'export const trackAppEvent=(...args)=>{(window.__events??=[]).push(args)};', loader: 'ts' }));
        b.onLoad({ filter: /i18n\/index\.tsx?$/ }, () => ({ contents: "export const useI18n=()=>({t:k=>k==='nav.home'?'Inicio':k});", loader: 'ts' }));
        b.onLoad({ filter: /@capacitor\/core\/dist\/index\.js$/ }, () => ({ contents: "export const Capacitor={isNativePlatform:()=>window.__native,getPlatform:()=>window.__native?'ios':'web'};export const registerPlugin=()=>({});", loader: 'js' }));
      } }] })).outputFiles[0].text;
    const content = Object.values(source).join('\n') + entry;
    const compile = async (raw: string) => (await postcss([tailwindcss({ ...tailwindConfig, content: [{ raw: content, extension: 'tsx' }] })]).process(raw, { from: resolve(root, 'src/index.css') })).css;
    const python = String.raw`import json,re,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
d=json.load(sys.stdin);rows=[];failures=[];retained=[]
views=[(440,956),(956,440),(320,852),(852,320)]
states=[(True,16,False),(True,32,True),(True,49,True),(True,50,True),(True,32,False),(True,49,False),(True,50,False),(False,16,True),(False,32,True),(False,49,True),(False,50,True)]
if d['preview']:views=[(440,956),(956,440)];states=[(True,49,True)]
targets=[('Carta de vinos','/escanear/carta-vinos','Sube la carta y te digo qué pediría primero.'),('Etiqueta de vino','/escanear/etiqueta','Identifica una etiqueta o varias botellas sin mezclarlas.'),('Menú de comida','/escanear/menu-comida','Convierte platos del menú en ideas de vino.'),('Plato','/escanear/plato','Haz una foto y encuentra el vino que le va.'),('Encontrar vino','/escanear/encontrar-vino','Dime presupuesto, ocasión o tienda y te digo qué buscaría.')]
def settled(page,selector):
 page.evaluate('async()=>{await document.fonts.ready}')
 page.wait_for_function('''async selector=>{const read=()=>{const e=document.querySelector(selector);if(!e?.isConnected)return null;const r=e.getBoundingClientRect();if(r.width<=0||r.height<=0)return null;const s=getComputedStyle(e);return JSON.stringify([r.x,r.y,r.width,r.height,s.padding,s.fontSize,s.display])};const a=read();await new Promise(requestAnimationFrame);const b=read();await new Promise(requestAnimationFrame);return a!==null&&a===b&&b===read()}''',arg=selector)
def reset(page,path='/escanear'):
 epoch=page.evaluate('(p)=>window.__reset(p)',path)
 page.wait_for_function('([epoch,path])=>window.__committed?.epoch===epoch&&window.__committed?.path===path',arg=[epoch,path])
 settled(page,'.scan-page-main')
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
 try:
  for w,h in views:
   for native,size,ax in states:
    snapshots=[]
    for phase in (['before'] if d['baseline'] else ['after'] if d['preview'] else ['before','after']):
     context=browser.new_context(viewport={'width':w,'height':h},service_workers='block',reduced_motion='reduce');outbound=[]
     context.route('**/*',lambda r:(outbound.append(r.request.url),r.abort()));page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
     page.set_content('<style>'+d['styles'][phase]+'</style><style>html{font-size:'+str(size)+'px}body{margin:0}html{--matchrim-native-safe-top:0px;--matchrim-native-safe-bottom:0px;--matchrim-safe-left:0px;--matchrim-safe-right:0px}</style><div id="root"></div>')
     page.evaluate('([n,a])=>{window.__native=n;document.documentElement.classList.toggle("matchrim-native-platform",n);document.documentElement.classList.toggle("matchrim-accessibility-text",a)}',[native,ax]);page.add_script_tag(content=d['bundle'])
     try:page.locator('#more-scan-options-title').wait_for(timeout=10000)
     except Exception:
      print(json.dumps({'fixtureRenderFailure':True,'errors':errors,'body':page.locator('body').inner_text(),'outbound':outbound}));raise
     settled(page,'.scan-page-main')
     case={'view':[w,h],'native':native,'root':size,'accessibility':ax,'phase':phase,'modes':[]};snapshot=[]
     active_targets=targets+([('Comida y vinos del restaurante','/restaurante',None)] if native else [])
     selected=[]
     for title,dest,description in active_targets:
      control=page.get_by_role('button',name=re.compile('^'+re.escape(title))).first;control.wait_for()
      control.evaluate('e=>e.scrollIntoView({block:"center",inline:"nearest",behavior:"instant"})');settled(page,'.scan-page-main')
      g=control.evaluate('e=>{const r=e.getBoundingClientRect();if(!e.isConnected||r.width<=0||r.height<=0)throw Error("Detached control measurement");const n=document.querySelector("nav"),clip={left:0,top:0,right:innerWidth,bottom:n?Math.min(innerHeight,n.getBoundingClientRect().top):innerHeight};const spans=[...e.children].filter(c=>c.tagName==="SPAN"),text=spans.length===1?spans[0]:spans[1],title=text?.firstElementChild,desc=text?.lastElementChild;const words=[];for(const el of [title,desc])if(el&&getComputedStyle(el).clip==="auto"){for(const node of el.childNodes)if(node.nodeType===3){for(const m of node.textContent.matchAll(/[\\p{L}\\p{N}]+/gu)){const q=document.createRange();q.setStart(node,m.index);q.setEnd(node,m.index+m[0].length);const rs=[...q.getClientRects()].filter(v=>v.width>0&&v.height>0);if(rs.length>1)words.push({word:m[0],rects:rs.map(v=>({x:v.x,y:v.y,w:v.width,h:v.height}))});}}}const p=getComputedStyle(e);return {connected:e.isConnected,rect:{x:r.x,y:r.y,w:r.width,h:r.height},clip,whole:r.left>=-.5&&r.top>=-.5&&r.right<=clip.right+.5&&r.bottom<=clip.bottom+.5,target44:r.width>=44&&r.height>=44,wordFragments:words,titleFont:title?getComputedStyle(title).fontSize:null,description:desc?.textContent,descriptionClip:desc?getComputedStyle(desc).clip:null,iconRects:[...e.querySelectorAll("svg")].map(s=>({w:s.getBoundingClientRect().width,h:s.getBoundingClientRect().height})),styles:{display:p.display,padding:p.padding,gap:p.gap},html:e.outerHTML}}')
      g['measuredRootFont']=page.evaluate('getComputedStyle(document.documentElement).fontSize')
      g['borderRadius']=control.evaluate('e=>getComputedStyle(e).borderRadius')
      g['accessibleNameFull']=page.get_by_role('button',name=title+' '+description if description else title,exact=True).count()==1
      g['hittableCenter']=control.evaluate('e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return !!hit&&(e===hit||e.contains(hit))}')
      if title=='Etiqueta de vino' and d['output'] and native and ax:
       out=Path(d['output']);out.mkdir(parents=True,exist_ok=True);file=out/(phase+'-'+str(w)+'x'+str(h)+'-root'+str(size)+'.png');page.screenshot(path=str(file));g['screenshot']=str(file);file.with_suffix('.json').write_text(json.dumps(g,ensure_ascii=True,indent=2)+'\n')
      bad=[]
      if not g['whole']:bad.append('whole-control-clip')
      if not g['target44']:bad.append('target44')
      if g['wordFragments']:bad.append('word-fragmentation')
      if not g['accessibleNameFull']:bad.append('accessible-name')
      if g['whole'] and not g['hittableCenter']:bad.append('hittable-center')
      if phase=='after' and native and ax and g['borderRadius']!='8px':bad.append('physical-radius8')
      if phase=='after' and native and ax and any(i['w']>44.1 or i['h']>44.1 for i in g['iconRects']):bad.append('decorative-icon-size')
      g['layoutFailures']=bad;mode={'title':title,'expectedPath':dest,'geometry':g}
      snapshot.append(g)
      if not bad:
       control.click();page.wait_for_function('(p)=>window.__route===p',arg=dest)
       if description:page.get_by_role('heading',name=title,exact=True).wait_for()
       mode['ordinaryClickDestination']=page.evaluate('window.__route')
      else:mode['ordinaryClickDestination']=None
      case['modes'].append(mode)
      if (d['baseline'] or phase=='after') and bad:
       finding={'case':[w,h,native,size,ax,phase],'title':title,'failures':bad}
       if d['baseline'] or (native and ax):failures.append(finding)
       else:retained.append(finding)
      if description:
       reset(page,dest);page.get_by_role('heading',name=title,exact=True).wait_for();settled(page,'.scan-page-main h1')
       optout=page.locator('.scan-page-main').evaluate('e=>{const s=getComputedStyle(e),h=e.querySelector("h1"),r=h.getBoundingClientRect(),t=getComputedStyle(h);if(!e.isConnected||!h.isConnected||r.width<=0||r.height<=0||!s.display||!s.fontSize)throw Error("Detached active-mode measurement");return {connected:e.isConnected&&h.isConnected,hubMarkerAbsent:!document.querySelector("#more-scan-options-title"),newHubSelectorAbsent:!e.matches(":has(#more-scan-options-title)"),main:{padding:s.padding,display:s.display,width:s.width,font:s.fontSize},heading:{text:h.textContent,font:t.fontSize,line:t.lineHeight,x:r.x,y:r.y,w:r.width,h:r.height}}}')
       assert optout['hubMarkerAbsent'] and optout['newHubSelectorAbsent'],optout;selected.append({'mode':title,'path':dest,'snapshot':optout});mode['selectedOptOut']=optout
      reset(page);page.locator('#more-scan-options-title').wait_for()
     snapshots.append({'geometry':snapshot,'selected':selected});case['outbound']=outbound;case['errors']=errors;rows.append(case)
     if errors or outbound:failures.append({'case':[w,h,native,size,ax,phase],'errors':errors,'outbound':outbound})
     context.close()
    if not d['baseline'] and not d['preview'] and not(native and ax):
     if snapshots[0]['geometry']!=snapshots[1]['geometry']:failures.append({'case':[w,h,native,size,ax],'failure':'opt-out-web-normal-parity'})
    if not d['baseline'] and not d['preview'] and snapshots[0]['selected']!=snapshots[1]['selected']:failures.append({'case':[w,h,native,size,ax],'failure':'active-mode-opt-out-parity'})
 finally:browser.close()
result={'passed':not failures,'cases':rows,'caseCount':len(rows),'failures':failures,'unchangedOutOfScopeRawFindings':retained,'allContextsClaimedGreen':not failures and not retained,'denominatorContextsPerPhase':len(views)*len(states),'actionChecksPerPhase':sum(6 if n else 5 for n,_,_ in states)*len(views),'nativeActionButtonsPerContext':6,'selectedOptOutChecksPerPhase':len(views)*len(states)*5,'source':'Actual Scan, ScanHub, MobileBottomNav and router; inactive remote scanners/Auth/backend/i18n mocked; restaurant destination is an inert route boundary, not restaurant-function QA; no native execution','maxScale':'49px inferred from actual C14 1rem side49pt;50px rounding sensitivity; not native DOM font measurement','measurementBarrier':'Fresh React epoch/path commit, connected positive geometry and exact stability across two animation frames; no numeric tolerance change','gateScope':'All native accessibility contexts/six actions must pass unchanged44/whole-clip/word/ordinary-click destination checks. All other contexts must remain exactly equal before/after, including retained raw preexisting failures. Five active scan modes must preserve exact computed opt-out snapshots.'}
if d['output']:(Path(d['output'])/'browser-report.json').write_text(json.dumps(result,ensure_ascii=True,indent=2)+'\n')
print(json.dumps({'passed':result['passed'],'caseCount':len(rows),'failureCount':len(failures),'failures':failures[:12]}));sys.exit(0 if result['passed'] else 1)`;
    const output = values.output ? resolve(values.output) : null;
    if (output) mkdirSync(output, { recursive: true });
    const result = spawnSync('/Users/GOIKO/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3', ['-B', '-c', python], {
      input: JSON.stringify({ bundle, styles: { before: await compile(priorCss), after: await compile(css) }, baseline: !!values.baseline, preview: !!values.preview, output }),
      encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', PYTHONPATH: '/private/tmp/matchrim91-python-deps' },
    });
    ui = { status: result.status, stdout: result.stdout, stderr: result.stderr };
    if (values.output) writeFileSync(resolve(values.output, 'driver-report.json'), JSON.stringify(ui, null, 2) + '\n', { flag: 'wx' });
    if (!values.baseline) assert.equal(result.status, 0, result.stderr + result.stdout);
    console.log(values.baseline ? 'BASELINE_RETAINED' : 'PASS', result.stdout.trim());
  }
  console.log(JSON.stringify({ passed: !values.baseline, baseline: !!values.baseline, groups: checks.length, checks, ui,
    sourceRevision: revision, SDKOrNativeRuntimeUsed: false, sourceComponentUnchanged: true, webAndNormalNativeExactOptOut: true }));
}
