import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { List } from 'lucide-react';
import { restoreMenuEditorKeyboard96, restoreMenuEditorKeyboardPackage96, restoreMenuEditorKeyboardGuard96 } from './check-matchrim-menu-editor-keyboard96.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const baseline = '02e89e8308507c2c3c9045da9cdef2b328f3d773';
const file = 'src/components/wine-import/WineMenuScanner.tsx';
const prior = name => execFileSync('git', ['show', `${baseline}:${name}`], { cwd: root, encoding: 'utf8' });
const before = prior(file);
const once = (source, from, to) => {
  assert.equal(source.split(from).length, 2, 'One exact list-jump fragment: ' + from);
  return source.replace(from, to);
};
const ref = '  const wineListHeadingRef = useRef<HTMLHeadingElement>(null);\n';
const handler = `  const goToWineList = () => {
    const heading = wineListHeadingRef.current;
    if (!isNative || !heading?.isConnected) return;
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({ behavior: 'instant', block: 'center' });
  };

`;
const action = `              {isNative && visibleScannedWines.length > 0 && <Button type="button" variant="outline" className="mt-[8px] min-h-[44px] min-w-0 gap-[8px] whitespace-normal px-[12px] py-[8px] text-left" onClick={goToWineList}>
                <List aria-hidden="true" className="shrink-0" style={{ width: 20, height: 20 }} />Ver vinos ({visibleScannedWines.length})
              </Button>}
`;
const headingProps = ' ref={isNative ? wineListHeadingRef : undefined} tabIndex={isNative ? -1 : undefined}';
export const MENU_LIST_JUMP96_TAIL = ' && node scripts/check-matchrim-menu-list-jump96.mjs';

export function restoreMenuListJump96(source) {
  if (source === before) return source;
  source = restoreMenuEditorKeyboard96(source);
  source = once(source, ', ArrowUp, List } from "lucide-react";', ', ArrowUp } from "lucide-react";');
  source = once(source, ref, '');
  source = once(source, handler, '');
  source = once(source, action, '');
  source = once(source, headingProps, '');
  assert.equal(source, before, 'Complete02e inverse: DOM order, web, filters, data, scores, callbacks and drawer unchanged');
  return source;
}
export function restoreMenuListJumpPackage96(source) {
  const old = prior('package.json');
  if (source === old) return source;
  source = restoreMenuEditorKeyboardPackage96(source);
  const command = JSON.parse(old).scripts['test:closure96'];
  source = once(source, command + MENU_LIST_JUMP96_TAIL, command);
  assert.equal(source, old, 'Only new public leaf appended; no dependencies or old command changed');
  return source;
}
const guardChanges = {
  'scripts/check-matchrim-menu-edit-shortcut96.mjs': [
    ["import { restoreMenuListJump96 } from './check-matchrim-menu-list-jump96.mjs';\n", ''],
    ["const source = restoreMenuListJump96(fs.readFileSync(path.join(root, file), 'utf8')), checks = [];", "const source = fs.readFileSync(path.join(root, file), 'utf8'), checks = [];"],
  ],
  'scripts/check-matchrim-menu-max-header96.mjs': [
    ["import { restoreMenuListJump96, restoreMenuListJumpPackage96, restoreMenuListJumpGuard96 } from './check-matchrim-menu-list-jump96.mjs';\n", ''],
    ['  source = restoreMenuListJump96(source);\n', ''],
    ['  source = restoreMenuListJumpPackage96(source);\n', ''],
    ["const source = restoreMenuListJump96(fs.readFileSync(path.join(root, file), 'utf8')), checks = [];", "const source = fs.readFileSync(path.join(root, file), 'utf8'), checks = [];"],
    ['    guard = restoreMenuListJumpGuard96(guardFile, guard);\n', ''],
  ],
};
export function restoreMenuListJumpGuard96(name, source) {
  assert(Object.hasOwn(guardChanges, name), 'No projection for unrelated guard paths');
  const old = prior(name);
  if (source === old) return source;
  if (name === 'scripts/check-matchrim-menu-edit-shortcut96.mjs') source = restoreMenuEditorKeyboardGuard96(name, source);
  for (const [from, to] of guardChanges[name]) source = once(source, from, to);
  assert.equal(source, old, 'Entire02e guard exact: no assertions/counts/mutations removed');
  return source;
}
function one(source, predicate) {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), found = [];
  const walk = node => { if (predicate(node, tree)) found.push(node); ts.forEachChild(node, walk); }; walk(tree);
  assert.equal(found.length, 1); return { tree, node: found[0] };
}
const transpile = source => ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 } }).outputText;
function runClosure(source, native, target) {
  const {tree,node} = one(source, n => ts.isVariableDeclaration(n) && n.name.getText() === 'goToWineList');
  const context = vm.createContext({ isNative: native, wineListHeadingRef: { current: target } });
  vm.runInContext(transpile('globalThis.run=' + node.initializer.getText(tree)), context); context.run();
}
function render(source, native, count, title = false) {
  const {tree,node} = one(source, (n,t) => title ? ts.isJsxElement(n) && n.openingElement.tagName.getText(t) === 'h3' && n.children.some(c=>ts.isJsxText(c)&&c.text==='Lista de la carta')
    : ts.isJsxExpression(n) && n.getText(t).startsWith('{isNative && visibleScannedWines.length > 0 && <Button'));
  const context = vm.createContext({React,List,isNative:native,visibleScannedWines:Array(count),wineListHeadingRef:{current:null},Button:props=>React.createElement('button',{...props,variant:undefined}),goToWineList(){}});
  vm.runInContext(transpile('globalThis.output=' + (title ? node.getText(tree) : node.expression.getText(tree))), context);
  return renderToStaticMarkup(context.output);
}
export function runMenuListJump96() {
  const source = restoreMenuEditorKeyboard96(fs.readFileSync(path.join(root,file),'utf8')),checks=[];
  const test=(name,run)=>{run();checks.push(name);};
  test('Explicit02e WMS source SHA',()=>assert.equal(createHash('sha256').update(before).digest('hex'),'e3df02cddfdf894cd467348e83d8cb9bcce9569a55c4cb7ee27736168857a974'));
  test('Full02e source inverse',()=>restoreMenuListJump96(source));
  test('Unmodified02e positive control',()=>assert.equal(restoreMenuListJump96(before),before));
  for(const count of [0,1,3,8])for(const native of [false,true])test('Actual CTA render native='+native+' visible='+count,()=>{
    const html=render(source,native,count);
    if(!native||count===0)assert.equal(html,'');
    else {assert(html.includes('Ver vinos ('+count+')'));assert.equal((html.match(/<button/g)||[]).length,1);assert(html.includes('min-h-[44px]'));assert(html.includes('aria-hidden="true"'));assert(!html.includes('aria-label='));}
  });
  test('Web heading render exact; native only adds programmatic focus',()=>{
    assert.equal(render(source,false,8,true),render(before,false,8,true));
    assert(render(source,true,8,true).includes('tabindex="-1"'));
  });
  test('Exact actual handler focuses then instant-centers without activation',()=>{
    const calls=[],target={isConnected:true,open:false,focus:o=>calls.push(['focus',JSON.parse(JSON.stringify(o))]),scrollIntoView:o=>calls.push(['scroll',JSON.parse(JSON.stringify(o))])};
    runClosure(source,true,target);assert.deepEqual(calls,[['focus',{preventScroll:true}],['scroll',{behavior:'instant',block:'center'}]]);assert.equal(target.open,false);
  });
  for(const [name,native,target]of [['web',false,{isConnected:true}],['cleared/reset ref',true,null],['detached/filter removal',true,{isConnected:false}]])test('Actual current native/ref guard: '+name,()=>runClosure(source,native,target));
  test('Only one existing heading; no opening, state mutation, observer/timer/controller',()=>{
    const {node,tree}=one(source,n=>ts.isVariableDeclaration(n)&&n.name.getText()==='goToWineList');
    assert(!/\.click\(|\.open\s*=|set[A-Z]|setTimeout|requestAnimationFrame|addEventListener|Observer|AbortController|await /.test(node.initializer.getText(tree)));
    assert.equal(source.split('>Lista de la carta</h3>').length,2);
  });
  test('Exact package tail and old dependencies/commands',()=>restoreMenuListJumpPackage96(fs.readFileSync(path.join(root,'package.json'),'utf8')));
  for(const name of Object.keys(guardChanges)){
    const guard=fs.readFileSync(path.join(root,name),'utf8');
    test('Full old guard inverse: '+name,()=>restoreMenuListJumpGuard96(name,guard));
    test('Reject undeclared old guard edit: '+name,()=>assert.throws(()=>restoreMenuListJumpGuard96(name,guard+'\n// unreviewed\n')));
  }
  test('Unrelated guard projection denied',()=>assert.throws(()=>restoreMenuListJumpGuard96('other.ts','')));
  const mutations=[['!isNative || !heading?.isConnected','!heading?.isConnected'],['heading.focus({ preventScroll: true });','heading.click();'],
    ["behavior: 'instant', block: 'center'","behavior: 'smooth', block: 'center'"],['Ver vinos (','Ver lista ('],
    ['visibleScannedWines.length > 0 && <Button','scannedWines.length > 0 && <Button'],['>Ver vinos ({visibleScannedWines.length})','>Ver vinos ({scannedWines.length})'],
    ['<List aria-hidden="true"','<List aria-hidden="false"'],['tabIndex={isNative ? -1 : undefined}','tabIndex={0}'],
    ['ref={isNative ? wineListHeadingRef : undefined}','ref={wineListHeadingRef}'],['onClick={goToWineList}','onClick={() => openWineDetail(0)}'],
    ['min-h-[44px] min-w-0 gap-[8px] whitespace-normal','min-h-[43px] min-w-0 gap-[8px] whitespace-normal'],
    ['const getWineDecision = (wine: ScannedWine) => {','const getWineDecision = (wine: ScannedWine) => { return {score:99};']];
  for(const [from,to]of mutations)test('Reject source mutation: '+from,()=>{assert(source.includes(from));assert.throws(()=>restoreMenuListJump96(source.replace(from,to)));});
  return {passed:checks.length,failed:0,checks,negativeControls:mutations.length,whole02eInverse:true,oldAssertionsRemoved:0,SDK:0,network:0,
    scope:'Actual source closures and SSR. Current web heading render exact, no native CTA on web/zero visible. Complete old web JSX/guard tests remain in historical chain; browser/UIKit separate.'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(runMenuListJump96()));
