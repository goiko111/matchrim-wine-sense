import assert from 'node:assert/strict';
import fs from 'node:fs';
import foodOverlapScope96 from './matchrim-food-overlap-context96-scope.cjs';
const { restoreFoodOverlapPackage96 } = foodOverlapScope96;
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Edit3,ArrowUp} from 'lucide-react';
const root=fileURLToPath(new URL('../',import.meta.url)),base='fb8ab8068e72f38bb7bcae5581f7190cdb593432',file='src/components/wine-import/WineMenuScanner.tsx';
const prior=name=>execFileSync('git',['show',base+':'+name],{cwd:root,encoding:'utf8'}),before=prior(file);
const once=(value,from,to)=>{assert.equal(value.split(from).length,2,'One exact header amendment');return value.replace(from,to);};
const pairs=[
 ['className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"',"className={isNative ? 'flex min-w-0 flex-col gap-2' : 'flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'}"],
 ['className="min-w-0">\n                            <p className="text-sm font-medium text-muted-foreground">',"className={isNative ? 'min-w-0 w-full' : 'min-w-0'}>\n                            <p className=\"text-sm font-medium text-muted-foreground\">"],
 ['className="h-auto min-h-11 max-w-full gap-2 self-start whitespace-normal [&_svg]:shrink-0"',"className={isNative ? 'h-auto min-h-[44px] w-full min-w-0 gap-[8px] whitespace-normal px-[12px] py-[8px] [&_svg]:shrink-0' : 'h-auto min-h-11 max-w-full gap-2 self-start whitespace-normal [&_svg]:shrink-0'}"],
 ['className="h-auto min-h-[44px] w-full min-w-0 gap-[8px] self-start whitespace-normal px-[12px] py-[8px] sm:w-auto"\n                          onClick={returnToComparison}', 'className="h-auto min-h-[44px] w-full min-w-0 gap-[8px] self-start whitespace-normal px-[12px] py-[8px]"\n                          onClick={returnToComparison}'],
];
export function restoreMenuHeaderStack96(source){if(source===before)return source;for(const [old,current]of pairs)source=once(source,current,old);assert.equal(source,before,'Whole fb8 WMS: only native classes; callbacks/data/web/copy/keyboard/scroll exact');return source;}
export const MENU_HEADER_STACK96_TAIL=' && node scripts/check-matchrim-menu-header-stack96.mjs';
export function restoreMenuHeaderStackPackage96(source){const old=prior('package.json');if(source===old)return source;source=restoreFoodOverlapPackage96(source);const command=JSON.parse(old).scripts['test:closure96'];source=once(source,command+MENU_HEADER_STACK96_TAIL,command);assert.equal(source,old);return source;}
function header(source){const tree=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),found=[];const visit=n=>{if(ts.isJsxElement(n)&&n.openingElement.tagName.getText(tree)==='div'&&n.getText(tree).includes('onClick={returnToComparison}')&&n.children.some(c=>ts.isJsxElement(c)&&c.openingElement.tagName.getText(tree)==='Button'))found.push(n);ts.forEachChild(n,visit);};visit(tree);assert.equal(found.length,1);return found[0].getText(tree);}
function render(source,isNative,isEditing){const context=vm.createContext({React,Edit3,ArrowUp,isNative,isEditing,index:0,wine:{region:'Champagne',pais:'Francia',anada:null},scannedWines:Array(8),setEditingWineIndex(){},returnToComparison(){},Button:({variant,size,...props})=>React.createElement('button',props)});vm.runInContext(ts.transpileModule('globalThis.output='+header(source),{compilerOptions:{jsx:ts.JsxEmit.React}}).outputText,context);return renderToStaticMarkup(context.output);}
export function runMenuHeaderStack96(){const source=fs.readFileSync(root+file,'utf8'),checks=[];const test=(name,fn)=>{fn();checks.push(name);};
 test('Whole fb8 inverse',()=>restoreMenuHeaderStack96(source));test('Explicit prior source',()=>assert.equal(createHash('sha256').update(before).digest('hex'),'f6d2afd2c3355540c08831a9e5cfa13057eacb63a02e61bb002dbd23cd5eaa72'));
 for(const editing of [false,true])test('Actual header web SSR exact editing='+editing,()=>assert.equal(render(source,false,editing),render(before,false,editing)));
 test('Native stack and both existing actions full-width with physical44',()=>{const html=render(source,true,false);assert(html.includes('flex min-w-0 flex-col gap-2'));assert.equal((html.match(/<button/g)||[]).length,2);assert.equal((html.match(/min-h-\[44px\]/g)||[]).length,2);assert(!html.includes('sm:w-auto'));assert(html.includes('Editar'));assert(html.includes('Ir al comparador'));});
 test('No font/lineheight/copy/callback/DOM edit beyond four classes',()=>{assert.equal(header(source).replace(/className=(?:"[^"]*"|\{isNative \? '[^']*' : '[^']*'\})/g,'className="projection"'),header(before).replace(/className=(?:"[^"]*"|\{isNative \? '[^']*' : '[^']*'\})/g,'className="projection"'));});
 test('Package prefix exact',()=>restoreMenuHeaderStackPackage96(fs.readFileSync(root+'package.json','utf8')));
 test('Whole prior editor guard inverse',()=>{let guard=fs.readFileSync(root+'scripts/check-matchrim-menu-editor-keyboard96.mjs','utf8');for(const [from,to]of [
  ["import { restoreMenuHeaderStack96, restoreMenuHeaderStackPackage96 } from './check-matchrim-menu-header-stack96.mjs';\n",''],
  ['  source = restoreMenuHeaderStack96(source);\n',''],['  source = restoreMenuHeaderStackPackage96(source);\n','']])guard=once(guard,from,to);assert.equal(guard,prior('scripts/check-matchrim-menu-editor-keyboard96.mjs'));});
 for(const [from,to]of [["isNative ? 'flex min-w-0 flex-col gap-2'","isNative ? 'flex min-w-0 sm:flex-row gap-2'"],['onClick={returnToComparison}','onClick={() => undefined}'],['setEditingWineIndex(isEditing ? null : index)','setEditingWineIndex(null)'],['min-h-[44px] w-full min-w-0 gap-[8px] whitespace-normal px-[12px]','min-h-[43px] w-full min-w-0 gap-[8px] whitespace-normal px-[12px]'],['Ir al comparador','Comparar ya']])test('Reject mutation '+from,()=>{assert(source.includes(from));assert.throws(()=>restoreMenuHeaderStack96(source.replace(from,to)));});
 return{passed:checks.length,failed:0,checks,wholeSourceInverse:true,webHeaderSSRExact:true,SDK:0,HTTP:0};}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(runMenuHeaderStack96()));
