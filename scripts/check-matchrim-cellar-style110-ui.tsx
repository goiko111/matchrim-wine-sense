import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { CellarReferenceStyle110 } from '../src/components/CellarReferenceStyle110';
import type { CellarReferenceStyleView110 } from '../src/utils/cellarReferenceStyle110';
import type { ScanProfileSnapshot } from '../src/utils/scanProfile';

const view: CellarReferenceStyleView110 = { current: null, initial: null, delta: null,
  attributes: { scale: 'winerim-0-5', potencia: 4, acidez: 3, dulzura: 1, taninos: 4, afrutado: 3 } };
const snapshot = (status: ScanProfileSnapshot['status']): ScanProfileSnapshot => ({ profile: null, source: 'unavailable', samples: null, status, note: 'Synthetic' });
let retries = 0, groups = 0;
const retry = () => { retries++; };
const render = (state: ScanProfileSnapshot | null, active = view) => renderToStaticMarkup(
  <StaticRouter location="/my-wines"><CellarReferenceStyle110 view={active} snapshot={state} onRetryProfile={retry} /></StaticRouter>);
const walk = (node: React.ReactNode): React.ReactElement[] => Array.isArray(node) ? node.flatMap(walk)
  : React.isValidElement(node) ? [node, ...walk((node.props as { children?: React.ReactNode }).children)] : [];
const loading = render(null);
assert(loading.includes('Cargando tu perfil')); assert(!loading.includes('Completar mi test')); assert(!loading.includes('Reintentar perfil')); groups++;
for (const status of ['base-error', 'base-timeout'] as const) {
  const state = snapshot(status), markup = render(state);
  assert(markup.includes('No necesitas repetir el test')); assert(markup.includes('Reintentar perfil'));
  assert(!markup.includes('Completar mi test'));
  const tree = CellarReferenceStyle110({ view, snapshot: state, onRetryProfile: retry });
  const button = walk(tree).find(element => (element.props as { onClick?: unknown }).onClick === retry); assert(button);
  (button.props as { onClick: () => void }).onClick(); groups++;
}
assert.equal(retries, 2);
for (const status of ['missing', 'invalid'] as const) {
  const markup = render(snapshot(status)); assert(markup.includes('Completar mi test')); assert(markup.includes('href="/matchrim"'));
  assert(!markup.includes('Reintentar perfil')); groups++;
}
const ready = { profile: { potente: 4, acidez: 3, dulce: 1, tanico: 4, afrutado: 3 }, source: 'quiz' as const,
  samples: 0, status: 'ready' as const, note: 'Synthetic' };
const scored = render(ready, { ...view, current: 93 });
assert(scored.includes('93/100 para ti')); assert(!scored.includes('Completar mi test')); assert(!scored.includes('Reintentar perfil')); groups++;
console.log(JSON.stringify({ groups, realUsers: 0, networkCalls: 0, gui: false,
  scope: 'Actual React presentation rendered server-side with controlled snapshots; not UIKit accessibility or visual layout' }));
