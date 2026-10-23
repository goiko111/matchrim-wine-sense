import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const file = 'src/components/wine-import/GlobalWineRecovery104.tsx';
const before = execFileSync('git', ['show', '99f956a:' + file], { encoding: 'utf8' });
const current = fs.readFileSync(file, 'utf8');
const from = 'h-24 w-14 shrink-0 object-contain', to = 'h-[96px] w-[56px] shrink-0 object-contain';
assert.equal(before.split(from).length, 2);
assert.equal(current, before.replace(from, to), 'Only native recovery thumbnail dimensions may change');
const scanner = fs.readFileSync('src/components/wine-import/MultiWineLabelScanner.tsx', 'utf8');
assert(scanner.includes('{isNative && selectedCandidate && <LabelAnalysisView'));
assert.equal(scanner.split('<GlobalWineRecovery104 ').length, 2);
assert.equal(execFileSync('git', ['show', '99f956a:src/components/wine-import/MultiWineLabelScanner.tsx'], { encoding: 'utf8' }), scanner);
console.log('PASS exact one-class product delta; native caller and all query/selection/scoring code unchanged');
