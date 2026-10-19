import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import { canLookupWinerimOriginal } from '../src/utils/winerimOriginalSheet';

const file = 'src/components/WinerimSheetLookup.tsx';
const before = execFileSync('git', ['show', `8af2104:${file}`], { encoding: 'utf8' });
const source = readFileSync(file, 'utf8');
const oldHost = readFileSync('scripts/check-matchrim-manual-label-affinity96.ts', 'utf8');
const ast = ts.createSourceFile('actual-test.ts', oldHost, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const hostNode = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'host')!;
assert.ok(hostNode);
const wine = { name: 'Synthetic Luna', producer: 'Synthetic Estate', vintage: null, inferredFields: [] };
const deferred = () => { let resolve: (value: unknown) => void = () => undefined; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const context = vm.createContext({ ts, vm, canLookupWinerimOriginal, lookupSource: source, wine, deferred, AbortController });
vm.runInContext(ts.transpileModule(hostNode.getText(ast) + '\nglobalThis.host = host;', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
const host = context.host;
const nodes = (v: any): any[] => Array.isArray(v) ? v.flatMap(nodes) : v && typeof v === 'object' && v.props ? [v, ...nodes(v.props.children)] : [];
const text = (v: any): string => Array.isArray(v) ? v.map(text).join('') : v && typeof v === 'object' && v.props ? text(v.props.children) : v == null || typeof v === 'boolean' ? '' : String(v);
const status = (h: any) => nodes(h.render()).filter(n => n.props.role === 'status').map(text).join('');
const groups: string[] = [];
const check = (name: string, run: () => void) => { run(); groups.push(name); console.log('PASS', name); };

export function restoreLookupReasons96(value: string) {
  const marker = '\nconst pendingIdentityMessage = ', start = value.indexOf(marker), end = value.indexOf('\nconst OriginalSheetLookup = ', start);
  assert.ok(start >= 0 && end > start);
  // Exact reviewed helper, not an arbitrary function-body deletion.
  assert.equal(createHash('sha256').update(value.slice(start, end)).digest('hex'), '1424cb7aec13ac80dd2f52ab33ebada33515f9da11f890c5468d5430ae060f7b');
  value = value.slice(0, start - 1) + value.slice(end);
  const from = "{status === 'identity-required' ? pendingIdentityMessage(identity, disabled) : lookupMessages[status]}";
  assert.equal(value.split(from).length, 2);
  value = value.replace(from, '{lookupMessages[status]}');
  assert.equal(value, before, 'Every ready/canonical/vintage/cancel/stale closure and native/web wrapper remains exact8af');
  return value;
}
check('Whole lookup source inverse restores every original guard and handler; no dispatch projection', () => { restoreLookupReasons96(source); });
check('Actual DEUTZ-present/empty-winery reports only the missing winery, not absent name or invalid year', () => {
  const h = host({ ...wine, name: 'DEUTZ', producer: '' });
  assert.equal(status(h), 'Ficha pendiente: añade la bodega.'); h.lookup(); assert.equal(h.calls, 0); h.unmount();
});
check('Each missing field and combined missing identity is named exactly', () => {
  for (const [patch, expected] of [[{ name: '' }, 'añade el nombre del vino'], [{ name: '', producer: null }, 'añade el nombre y la bodega'], [{ producer: '  ' }, 'añade la bodega']] as const) {
    const h = host({ ...wine, ...patch }); assert.equal(status(h), `Ficha pendiente: ${expected}.`); h.lookup(); assert.equal(h.calls, 0); h.unmount();
  }
});
check('Unknown/absent vintage remains eligible; malformed/out-of-range year stays blocked and specific', () => {
  for (const vintage of [null, undefined, '', '  ', '2021', 2021]) { const h = host({ ...wine, vintage }); assert.equal(status(h), ''); assert.equal(h.buttons()[0].props.disabled, false); h.unmount(); }
  for (const vintage of ['21', '1800', true, NaN, Infinity, {}]) { const h = host({ ...wine, vintage }); assert.equal(status(h), 'Ficha pendiente: revisa la añada.'); h.lookup(); assert.equal(h.calls, 0); h.unmount(); }
});
check('Inferred identity asks for confirmation, never authorizes or promotes OCR', () => {
  for (const [field, expected] of [['name', 'nombre del vino'], ['bodega', 'bodega'], ['añada', 'añada']]) {
    const h = host({ ...wine, inferredFields: [field] }); assert.equal(status(h), `Ficha pendiente: confirma ${expected === 'bodega' ? 'la' : expected === 'añada' ? 'la' : 'el'} ${expected}.`); h.lookup(); assert.equal(h.calls, 0); h.unmount();
  }
});
check('Disabled operation is not misrepresented as missing data; canonical/invalid metadata stays blocked', () => {
  const locked = host(wine, { disabled: true }); assert.match(status(locked), /operación en curso/); locked.lookup(); assert.equal(locked.calls, 0); locked.unmount();
  for (const patch of [{ name: 'A' }, { name: 'Bad\nName' }, { producer: 'Sicily', region: 'Sicily' }, { inferredFields: {} }, { inferredFields: [Symbol('invalid')] }]) {
    const h = host({ ...wine, ...patch }); assert.match(status(h), /revisa los datos/); h.lookup(); assert.equal(h.calls, 0); h.unmount();
  }
});
check('Actual web returns null; native ready/default name and visible caption remain unchanged', () => {
  const h = host(); assert.equal(status(h), ''); assert.equal(h.buttons()[0].props['aria-label'], 'Ficha original Winerim: Synthetic Luna');
  h.setNative(false); assert.equal(h.wrapper(), null); h.unmount();
});
check('Directed guard/default/canonical/hidden-control/copy mutations reject, not just changed bytes', () => {
  for (const [from, to] of [["reasons.push('añade la bodega')", "reasons.push('añade el nombre')"], ['!disabled && canLookupWinerimOriginal(identity)', 'true'], ['!abort.signal.aborted', 'true'], ['if (!Capacitor.isNativePlatform()) return null;', 'if (false) return null;'], ['<Button type="button" variant="outline"', '<Button aria-hidden="true" type="button" variant="outline"']]) {
    assert.ok(source.includes(from)); assert.throws(() => restoreLookupReasons96(source.replace(from, to)));
  }
});
console.log(JSON.stringify({ passed: groups.length, failed: 0, actualLookupClosures: true, webNull: true, noCanonicalGuardChanges: true, externalCalls: 0 }));
