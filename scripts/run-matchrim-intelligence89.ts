import { readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import net from 'node:net';
import tls from 'node:tls';
import http from 'node:http';
import https from 'node:https';
import dgram from 'node:dgram';

const blocked = () => { throw new Error('intelligence89: NETWORK_FORBIDDEN'); };
globalThis.fetch = blocked;
net.Socket.prototype.connect = blocked;
tls.connect = blocked;
http.request = blocked;
http.get = blocked;
https.request = blocked;
https.get = blocked;
dgram.createSocket = blocked;

const evaluator = await import('./matchrim-intelligence89');
const [command, ...args] = process.argv.slice(2);
const read = (path: string) => JSON.parse(readFileSync(resolve(path), 'utf8'));
function write(path: string, value: unknown) {
  if (!basename(path).includes('intelligence89')) throw new Error('OUTPUT_NAME_MUST_INCLUDE_intelligence89');
  writeFileSync(resolve(path), JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
}
try {
  if (command === 'template' && args.length === 1) write(args[0], evaluator.planTemplate());
  else if (command === 'freeze' && args.length === 3) {
    const frozen = evaluator.freezePlan(read(args[0]));
    write(args[1], frozen);
    write(args[2], evaluator.blindTemplate(frozen));
    console.log(JSON.stringify({ freeze_sha256: frozen.sha256,
      owners: frozen.payload.owners.length, note: 'Private freeze contains predictions. Give raters only the ballot and coded samples.' }));
  } else if (command === 'evaluate' && args.length === 3) {
    const result = evaluator.evaluateFrozen(read(args[0]), read(args[1]));
    write(args[2], result);
    console.log(JSON.stringify({ status: result.status, eligible_owners: result.eligible_owners, macro: result.macro }));
  } else throw new Error('Usage: template PLAN | freeze PLAN FREEZE BALLOT | evaluate FREEZE BALLOT RESULT. All output filenames must contain intelligence89; files are never overwritten.');
} catch (error) {
  console.error(JSON.stringify({ status: 'INVALID_EVALUATION', error: error instanceof Error ? error.message : String(error) }));
  process.exitCode = 1;
}
