const assert=require('node:assert/strict'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const repo=path.resolve(__dirname,'..'),file='src/utils/foodMenuScan89.ts',base='e9a215906be01fc14f18eed738dccac656d85f85',prior=p=>execFileSync('git',['show',base+':'+p],{cwd:repo,encoding:'utf8'}),before=prior(file),sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const once=(s,a,b)=>{assert.equal(s.split(a).length,2,'One exact reviewed Food amendment');return s.replace(a,b);};
function restoreR2(source){const start=source.indexOf('type NativeOriginalRows89 ='),end=source.indexOf('const mergeNativeClippedPrices89 =',start);assert(start>=0&&end>start);source=source.slice(0,start)+source.slice(end);
 for(const[a,b]of [
 ['sections: Set<string>, originals: NativeOriginalRows89): FoodMenuScanResult89','sections: Set<string>): FoodMenuScanResult89'],
 ['nativeClippedGroup89(originals.get(existing)!, originals.get(dish)!, tiles, sections)','nativeClippedPriceRow89(existing, dish, tiles, sections)'],
 ['    const members = [...originals.get(dishes[index])!, ...originals.get(dish)!];\n    dishes[index] = { ...preferred, source_tile_ids: members.flatMap(member => member.source_tile_ids) };\n    originals.set(dishes[index], members);','    dishes[index] = { ...preferred, source_tile_ids: [...dishes[index].source_tile_ids, ...dish.source_tile_ids] };'],
 ['  // Keep each original row: aggregate IDs and preferred region metadata need not share an order.\n  const originals: NativeOriginalRows89 = new Map();\n',''],
 ['      const duplicate = dishes.find((existing) => {\n        if (!nativeClippedPrices) return samePhysicalRow(existing, dish);\n        return originals.get(existing)!.every(member => nativeFullRowMatch89(member, dish, sections));\n      });','      const duplicate = dishes.find((existing) => {\n        if (!samePhysicalRow(existing, dish)) return false;\n        if (!nativeClippedPrices) return true;\n        if (!(nativeRowContext89(existing, dish) || nativeOverlapContext89(existing, dish, sections))) return false;\n        const firstPrice = existing.source_text ? terminalPrice89(existing.source_text) : null;\n        const secondPrice = dish.source_text ? terminalPrice89(dish.source_text) : null;\n        return !firstPrice || !secondPrice\n          || (firstPrice.amount === secondPrice.amount && firstPrice.currency === secondPrice.currency);\n      });'],
 ['        if (nativeClippedPrices) originals.set(duplicate, [...originals.get(duplicate)!, dish]);\n',''],
 ['      } else {\n        const aggregate = { ...dish, source_tile_ids: [...dish.source_tile_ids] };\n        dishes.push(aggregate);\n        if (nativeClippedPrices) originals.set(aggregate, [dish]);\n      }','      } else dishes.push({ ...dish, source_tile_ids: [...dish.source_tile_ids] });'],
 ['mergeNativeClippedPrices89(merged, outcomes, sections, originals)','mergeNativeClippedPrices89(merged, outcomes, sections)'],
 ])source=once(source,a,b);assert.equal(sha(source),'012dc28bbcd8fde49812ce6f9eeb378a188e9fab7ba6a59ff181e57b2f14d98e','Exact immutable R1 projection');return source;}
function restore(source){source=restoreR2(source);const start=source.indexOf('const nativeSectionPair89 ='),end=source.indexOf('// Only a missing terminal price',start);assert(start>=0&&end>start);source=source.slice(0,start)+source.slice(end);
 for(const[a,b]of [
 ['tiles: FoodMenuTile[], sections: Set<string>)','tiles: FoodMenuTile[])'],
 ['|| !(nativeRowContext89(a, b) || nativeOverlapContext89(a, b, sections))) return null;','|| !nativeRowContext89(a, b)) return null;'],
 ['outcomes: TileOutcome[], sections: Set<string>): FoodMenuScanResult89','outcomes: TileOutcome[]): FoodMenuScanResult89'],
 ['nativeClippedPriceRow89(existing, dish, tiles, sections)','nativeClippedPriceRow89(existing, dish, tiles)'],
 ['  const sections = nativeClippedPrices ? nativeOverlapSections89(reads) : new Set<string>();\n',''],
 ['if (!(nativeRowContext89(existing, dish) || nativeOverlapContext89(existing, dish, sections))) return false;','if (!nativeRowContext89(existing, dish)) return false;'],
 ['mergeNativeClippedPrices89(merged, outcomes, sections)','mergeNativeClippedPrices89(merged, outcomes)'],
 ])source=once(source,a,b);assert.equal(source,before,'Full e9a source inverse: parser/crops/requests/budgets/cancel/default branch unchanged');return source;}
function restoreFoodOverlapSource96(source){if(source===before)return source;assert.equal(sha(source),'6d4fd1ee001ac0462be4ed8bc3b13ff6a484fd5853407660bca8be75e424d6a0','Reviewed private R2 full source');return restore(source);}
const foodKeyboardPackageLines96=[
 '    "test:food-latency96": "node --import tsx scripts/check-matchrim-food-latency96.ts",\n',
 '    "test:keyboard-rotation96": "node scripts/check-matchrim-native-keyboard-rotation96.mjs",\n',
];
function restoreFoodOverlapPackage96(source){const old=prior('package.json');if(source===old)return source;
 for(const line of foodKeyboardPackageLines96)source=once(source,line,'');
 const command=JSON.parse(old).scripts['test:closure96'];source=once(source,command+" && node scripts/check-matchrim-food-overlap-context96.cjs",command);assert.equal(source,old,'Whole e9a package except one appended leaf and two exact Food/keyboard test registrations');return source;}
// Keep the whole-package oracle: missing/duplicate registrations and unrelated edits fail too.
const actualPackage96=require('node:fs').readFileSync(path.join(repo,'package.json'),'utf8');
assert.equal(restoreFoodOverlapPackage96(actualPackage96),prior('package.json'));
const packageMutations96=[
 ...foodKeyboardPackageLines96.map(line=>once(actualPackage96,line,line.replace('node ','node --unreviewed '))),
 ...foodKeyboardPackageLines96.map(line=>once(actualPackage96,line,'')),
 ...foodKeyboardPackageLines96.map(line=>once(actualPackage96,line,line+line)),
 once(actualPackage96,'"typecheck": "tsc -p tsconfig.app.json --noEmit"','"typecheck": "true"'),
 once(actualPackage96,' && node scripts/check-matchrim-food-overlap-context96.cjs',''),
 actualPackage96+'\n// unreviewed package bytes\n',
];
for(const changed of packageMutations96){assert.notEqual(changed,actualPackage96);assert.throws(()=>restoreFoodOverlapPackage96(changed));}
function projectGuard(source,file,edits){for(const[old,next]of edits)source=once(source,next,old);assert.equal(source,prior(file),'Whole prior QA source restored');return source;}
function restoreFoodOverlapGuard96(source){return projectGuard(source,'scripts/check-matchrim-food-overlap96.cjs',[["const fs = require('node:fs');\n","const fs = require('node:fs');\nconst { restoreFoodOverlapSource96 } = require('./matchrim-food-overlap-context96-scope.cjs');\n"],["const helperStart = after.indexOf('const literalRow89 =');","const guardSource = restoreFoodOverlapSource96(after);\nconst helperStart = guardSource.indexOf('const literalRow89 =');"],["const helperEnd = after.indexOf('export const mergeFoodMenuTiles89 =', helperStart);","const helperEnd = guardSource.indexOf('export const mergeFoodMenuTiles89 =', helperStart);"],["let inverse = after.slice(0, helperStart) + after.slice(helperEnd);","let inverse = guardSource.slice(0, helperStart) + guardSource.slice(helperEnd);"]]);}
function restoreFoodHeaderScope96(source){return projectGuard(source,'scripts/check-matchrim-menu-header-stack96.mjs',[["import fs from 'node:fs';\n","import fs from 'node:fs';\nimport foodOverlapScope96 from './matchrim-food-overlap-context96-scope.cjs';\nconst { restoreFoodOverlapPackage96 } = foodOverlapScope96;\n"],["if(source===old)return source;const command=JSON.parse(old).scripts['test:closure96'];","if(source===old)return source;source=restoreFoodOverlapPackage96(source);const command=JSON.parse(old).scripts['test:closure96'];"]]);}
module.exports={restoreFoodOverlapSource96,restoreFoodOverlapPackage96,restoreFoodOverlapGuard96,restoreFoodHeaderScope96};
module.exports.foodKeyboardPackageControls96={exactRegistrations:2,rejectedMutations:packageMutations96.length,wholeHistoricalPackageRestored:true};
